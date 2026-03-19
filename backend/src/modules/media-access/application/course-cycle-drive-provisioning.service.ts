import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WorkspaceGroupsService } from '@modules/media-access/application/workspace-groups.service';
import { DriveScopeProvisioningService } from '@modules/media-access/application/drive-scope-provisioning.service';
import {
  MEDIA_ACCESS_DRIVE_FOLDERS,
  MEDIA_ACCESS_STAFF_GROUP_METADATA,
} from '@modules/media-access/domain/media-access.constants';
import { technicalSettings } from '@config/technical-settings';

type EmailRow = {
  email: string | null;
};

type CourseCycleDriveProvisionInput = {
  courseCycleId: string;
  cycleCode: string;
  courseCode: string;
  bankCards: Array<{ evaluationTypeCode: string; number: number }>;
};

type CourseCycleDriveProvisionResult = {
  scopeFolderId: string;
  introFolderId: string;
  bankFolderId: string;
  viewerGroupEmail: string;
  bankLeafFoldersCreated: number;
};

type BankLeafFolderResolutionInput = CourseCycleDriveProvisionInput & {
  evaluationTypeCode: string;
  evaluationNumber: number;
};

const BANK_TYPE_FOLDER_LABELS: Record<string, string> = {
  PC: 'Prácticas Calificadas',
  PD: 'Prácticas Dirigidas',
  EX: 'Exámenes',
  LAB: 'Laboratorios',
  TUTORING: 'Tutorías Especializadas',
};

const BANK_DOCUMENTS_FOLDER_NAME = 'bank_documents';

@Injectable()
export class CourseCycleDriveProvisioningService {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly workspaceGroupsService: WorkspaceGroupsService,
    private readonly driveScopeProvisioningService: DriveScopeProvisioningService,
  ) {}

  async provision(
    input: CourseCycleDriveProvisionInput,
  ): Promise<CourseCycleDriveProvisionResult> {
    const workspaceDomain = this.getWorkspaceGroupDomain();
    const courseCycleId = this.normalizeNumericId(
      input.courseCycleId,
      'courseCycleId',
    );
    const cycleCode = this.normalizeToken(input.cycleCode, 'cycleCode');
    const courseCode = this.normalizeToken(input.courseCode, 'courseCode');
    const viewerGroupEmail = `cc-${courseCycleId}-viewers@${workspaceDomain}`;

    await this.driveScopeProvisioningService.validateRootFolder();
    const rootFolderId = this.driveScopeProvisioningService.getRootFolderId();

    const courseCyclesParent =
      await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        rootFolderId,
        MEDIA_ACCESS_DRIVE_FOLDERS.COURSE_CYCLES_PARENT,
      );
    const cycleFolderId =
      await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        courseCyclesParent,
        cycleCode,
      );
    const scopeFolderId =
      await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        cycleFolderId,
        `cc_${courseCycleId}_${courseCode}`,
      );
    const introFolderId =
      await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        scopeFolderId,
        MEDIA_ACCESS_DRIVE_FOLDERS.COURSE_CYCLE_INTRO_VIDEO,
      );
    const bankFolderId =
      await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        scopeFolderId,
        BANK_DOCUMENTS_FOLDER_NAME,
      );

    const group = await this.workspaceGroupsService.findOrCreateGroup({
      email: viewerGroupEmail,
      name: `CC ${courseCycleId} Viewers`,
      description: `Acceso viewer para contenido de course_cycle ${courseCycleId}`,
    });

    await this.driveScopeProvisioningService.ensureGroupReaderPermission(
      scopeFolderId,
      group.email,
    );

    const staffGroupEmail =
      technicalSettings.mediaAccess.staffViewersGroupEmail;
    if (staffGroupEmail) {
      const staffGroup = await this.workspaceGroupsService.findOrCreateGroup({
        email: staffGroupEmail,
        name: MEDIA_ACCESS_STAFF_GROUP_METADATA.NAME,
        description: MEDIA_ACCESS_STAFF_GROUP_METADATA.DESCRIPTION,
      });
      await this.driveScopeProvisioningService.ensureGroupReaderPermission(
        scopeFolderId,
        staffGroup.email,
      );
    }

    let bankLeafFoldersCreated = 0;
    const grouped = this.groupBankCardsByType(input.bankCards);
    for (const [evaluationTypeCode, numbers] of grouped.entries()) {
      const typeFolderLabel =
        BANK_TYPE_FOLDER_LABELS[evaluationTypeCode] || evaluationTypeCode;
      const typeFolderId =
        await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
          bankFolderId,
          typeFolderLabel,
        );

      for (const number of numbers) {
        await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
          typeFolderId,
          `${evaluationTypeCode}${number}`,
        );
        bankLeafFoldersCreated += 1;
      }
    }

    await this.syncCurrentEligibleMembers(group.email, courseCycleId);

    return {
      scopeFolderId,
      introFolderId,
      bankFolderId,
      viewerGroupEmail: group.email,
      bankLeafFoldersCreated,
    };
  }

  async ensureBankLeafFolder(input: BankLeafFolderResolutionInput): Promise<{
    scopeFolderId: string;
    bankFolderId: string;
    typeFolderId: string;
    leafFolderId: string;
  }> {
    const provisioned = await this.provision(input);
    const normalizedTypeCode = this.normalizeToken(
      input.evaluationTypeCode,
      'evaluationTypeCode',
    ).toUpperCase();
    const normalizedNumber = this.normalizePositiveInt(
      input.evaluationNumber,
      'evaluationNumber',
    );
    const typeFolderLabel =
      BANK_TYPE_FOLDER_LABELS[normalizedTypeCode] || normalizedTypeCode;
    const typeFolderId =
      await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        provisioned.bankFolderId,
        typeFolderLabel,
      );
    const leafFolderId =
      await this.driveScopeProvisioningService.findOrCreateDriveFolderUnderParent(
        typeFolderId,
        `${normalizedTypeCode}${normalizedNumber}`,
      );

    return {
      scopeFolderId: provisioned.scopeFolderId,
      bankFolderId: provisioned.bankFolderId,
      typeFolderId,
      leafFolderId,
    };
  }

  private async syncCurrentEligibleMembers(
    groupEmail: string,
    courseCycleId: string,
  ): Promise<void> {
    const rows = await this.dataSource.query<EmailRow[]>(
      `
        SELECT DISTINCT LOWER(TRIM(source.email)) AS email
        FROM (
          SELECT u.email
          FROM enrollment e
          INNER JOIN user u ON u.id = e.user_id
          WHERE e.course_cycle_id = ?
            AND e.cancelled_at IS NULL
            AND u.is_active = 1

        ) source
        WHERE source.email IS NOT NULL
          AND TRIM(source.email) <> ''
      `,
      [courseCycleId],
    );

    for (const row of rows) {
      const email = String(row.email || '')
        .trim()
        .toLowerCase();
      if (!email) {
        continue;
      }
      await this.workspaceGroupsService.ensureMemberInGroup({
        groupEmail,
        memberEmail: email,
      });
    }
  }

  private groupBankCardsByType(
    cards: Array<{ evaluationTypeCode: string; number: number }>,
  ): Map<string, number[]> {
    const grouped = new Map<string, Set<number>>();
    for (const card of cards) {
      const code = this.normalizeToken(
        String(card.evaluationTypeCode || '').toUpperCase(),
        'evaluationTypeCode',
      );
      const number = this.normalizePositiveInt(card.number, 'number');
      const set = grouped.get(code) || new Set<number>();
      set.add(number);
      grouped.set(code, set);
    }

    const normalized = new Map<string, number[]>();
    for (const [code, numbers] of grouped.entries()) {
      normalized.set(
        code,
        Array.from(numbers.values()).sort((a, b) => a - b),
      );
    }
    return normalized;
  }

  private normalizeToken(raw: string, fieldName: string): string {
    const normalized = String(raw || '').trim();
    if (!normalized) {
      throw new InternalServerErrorException(`${fieldName} vacio`);
    }
    return normalized.replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-');
  }

  private normalizeNumericId(raw: string, fieldName: string): string {
    const normalized = String(raw || '').trim();
    if (!/^\d+$/.test(normalized)) {
      throw new InternalServerErrorException(`${fieldName} invalido`);
    }
    return normalized;
  }

  private normalizePositiveInt(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new InternalServerErrorException(`${fieldName} invalido`);
    }
    return value;
  }

  private getWorkspaceGroupDomain(): string {
    const domain = String(
      this.configService.get<string>('GOOGLE_WORKSPACE_GROUP_DOMAIN', '') || '',
    )
      .trim()
      .toLowerCase();
    if (!domain) {
      throw new InternalServerErrorException(
        'Falta GOOGLE_WORKSPACE_GROUP_DOMAIN en configuracion',
      );
    }
    return domain;
  }
}
