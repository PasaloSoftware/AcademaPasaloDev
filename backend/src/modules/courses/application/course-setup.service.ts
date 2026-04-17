import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CoursesService } from '@modules/courses/application/courses.service';
import { EvaluationsService } from '@modules/evaluations/application/evaluations.service';
import { CreateCourseSetupDto } from '@modules/courses/dto/create-course-setup.dto';
import { UserWithSession } from '@modules/auth/strategies/jwt.strategy';
import { EvaluationDriveAccessProvisioningService } from '@modules/media-access/application/evaluation-drive-access-provisioning.service';
import { CourseCycleDriveProvisioningService } from '@modules/media-access/application/course-cycle-drive-provisioning.service';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import { technicalSettings } from '@config/technical-settings';

type EvaluationTypeRow = {
  id: string;
  code: string;
  name?: string;
};

type CourseCycleMetaRow = {
  courseCode: string;
  cycleCode: string;
};

type BankEvaluationRow = {
  id: string;
  number: number;
};

type FolderIdRow = {
  id: string;
};

type BankFolderDefinition = {
  evaluationTypeId: string;
  evaluationTypeCode: string;
  groupName: string;
  items: string[];
};

@Injectable()
export class CourseSetupService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly coursesService: CoursesService,
    private readonly evaluationsService: EvaluationsService,
    private readonly evaluationDriveAccessProvisioningService: EvaluationDriveAccessProvisioningService,
    private readonly courseCycleDriveProvisioningService: CourseCycleDriveProvisioningService,
  ) {}

  async createFullCourseSetup(
    user: UserWithSession,
    dto: CreateCourseSetupDto,
  ): Promise<Record<string, unknown>> {
    const allowedTypeIds = this.normalizeIds(
      dto.allowedEvaluationTypeIds || [],
    );
    const professorUserIds = this.normalizeIds(dto.professorUserIds || []);
    const bankFoldersToCreate = dto.bankFoldersToCreate || [];
    this.validateBankFoldersPayload(bankFoldersToCreate);
    const newEvaluationsToCreate = dto.newEvaluationsToCreate || [];
    const newBankEvaluationTypeNames = bankFoldersToCreate
      .map((item) => String(item.newEvaluationTypeName || '').trim())
      .filter(Boolean);
    const resolvedNewEvaluationTypes = await this.resolveNewEvaluationTypes([
      ...newEvaluationsToCreate.map((item) => ({ name: item.name })),
      ...newBankEvaluationTypeNames.map((name) => ({ name })),
    ]);
    const explicitBankEvaluationTypeIds = this.normalizeIds(
      bankFoldersToCreate
        .map((item) => String(item.evaluationTypeId || '').trim())
        .filter(Boolean),
    );
    const allAllowedTypeIds = this.normalizeIds([
      ...allowedTypeIds,
      ...explicitBankEvaluationTypeIds,
      ...resolvedNewEvaluationTypes.map((item) => item.id),
    ]);
    const evaluationsToCreate = [
      ...(dto.evaluationsToCreate || []),
      ...newEvaluationsToCreate.map((item) => ({
        evaluationTypeId: this.resolveNewEvaluationTypeIdByName(
          resolvedNewEvaluationTypes,
          item.name,
        ),
        number: item.number,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
    ];
    if (evaluationsToCreate.length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos una evaluacion a crear',
      );
    }

    this.ensureUniqueEvaluationKeys(evaluationsToCreate);

    const createdCourse = await this.coursesService.create(dto.course);
    const createdCourseCycle = await this.coursesService.assignToCycle({
      courseId: createdCourse.id,
      academicCycleId: String(dto.academicCycleId || '').trim(),
    });

    for (const professorUserId of professorUserIds) {
      await this.coursesService.assignProfessorToCourseCycle(
        createdCourseCycle.id,
        professorUserId,
      );
    }

    await this.coursesService.updateCourseCycleEvaluationStructure(
      createdCourseCycle.id,
      allAllowedTypeIds,
    );

    const evaluationTypeRows =
      await this.listEvaluationTypesByIds(allAllowedTypeIds);
    if (evaluationTypeRows.length !== allAllowedTypeIds.length) {
      throw new BadRequestException(
        'Uno o mas evaluationTypeIds no existen en catalogo',
      );
    }
    if (
      evaluationTypeRows.some(
        (row) =>
          String(row.code || '')
            .trim()
            .toUpperCase() === EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
      )
    ) {
      throw new BadRequestException(
        'BANCO_ENUNCIADOS es tecnico y no debe enviarse en el setup',
      );
    }
    const evaluationTypeCodeById = new Map(
      evaluationTypeRows.map((row) => [
        String(row.id),
        String(row.code || '')
          .trim()
          .toUpperCase(),
      ]),
    );
    const evaluationTypeNameById = new Map(
      evaluationTypeRows.map((row) => [
        String(row.id),
        String(row.name || '').trim(),
      ]),
    );

    const createdEvaluations: Array<{
      id: string;
      evaluationTypeId: string;
      evaluationTypeCode: string;
      number: number;
    }> = [];

    for (const evaluationInput of evaluationsToCreate) {
      const evaluationTypeId = String(
        evaluationInput.evaluationTypeId || '',
      ).trim();
      if (!evaluationTypeCodeById.has(evaluationTypeId)) {
        throw new BadRequestException(
          `El tipo ${evaluationTypeId} no esta en allowedEvaluationTypeIds`,
        );
      }
      const createdEvaluation = await this.evaluationsService.create({
        courseCycleId: createdCourseCycle.id,
        evaluationTypeId,
        number: Number(evaluationInput.number),
        startDate: evaluationInput.startDate,
        endDate: evaluationInput.endDate,
      });
      createdEvaluations.push({
        id: createdEvaluation.id,
        evaluationTypeId,
        evaluationTypeCode: evaluationTypeCodeById.get(evaluationTypeId) || '',
        number: Number(createdEvaluation.number),
      });
    }

    const bankEvaluation = await this.findBankEvaluationForCourseCycleOrFail(
      createdCourseCycle.id,
    );
    const bankFolderDefinitions = this.buildBankFolderDefinitions({
      bankFoldersToCreate,
      resolvedNewEvaluationTypes,
      evaluationTypeCodeById,
      evaluationTypeNameById,
      createdEvaluations,
    });

    const shouldApplyMaterialsTemplate =
      dto.materialsTemplate.applyToEachEvaluation !== false;
    const folderStatusId = await this.getActiveFolderStatusId();
    const templateCreatedForEvaluations: string[] = [];
    if (shouldApplyMaterialsTemplate) {
      for (const createdEvaluation of createdEvaluations) {
        if (
          createdEvaluation.evaluationTypeCode ===
          EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS
        ) {
          continue;
        }
        await this.ensureMaterialTemplateForEvaluation(
          createdEvaluation.id,
          user.id,
          folderStatusId,
          dto.materialsTemplate.roots || [],
        );
        templateCreatedForEvaluations.push(createdEvaluation.id);
      }
    }

    const bankFoldersCreated = await this.ensureBankFoldersForEvaluation(
      bankEvaluation.id,
      user.id,
      folderStatusId,
      bankFolderDefinitions,
    );

    const provisionedEvaluationScopes: string[] = [];
    for (const createdEvaluation of createdEvaluations) {
      if (
        createdEvaluation.evaluationTypeCode ===
        EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS
      ) {
        continue;
      }
      await this.evaluationDriveAccessProvisioningService.provisionByEvaluationId(
        createdEvaluation.id,
      );
      provisionedEvaluationScopes.push(createdEvaluation.id);
    }

    const courseCycleMeta = await this.getCourseCycleMeta(
      createdCourseCycle.id,
    );
    const bankCards = createdEvaluations
      .filter(
        (evaluation) =>
          evaluation.evaluationTypeCode !==
          EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS,
      )
      .map((evaluation) => ({
        evaluationTypeCode: evaluation.evaluationTypeCode,
        number: evaluation.number,
      }));

    const courseCycleDrive =
      await this.courseCycleDriveProvisioningService.provision({
        courseCycleId: createdCourseCycle.id,
        courseCode: courseCycleMeta.courseCode,
        cycleCode: courseCycleMeta.cycleCode,
        bankCards,
        bankFolders: bankFolderDefinitions.map((item) => ({
          groupName: item.groupName,
          items: item.items,
        })),
      });

    return {
      course: {
        id: createdCourse.id,
        code: createdCourse.code,
        name: createdCourse.name,
      },
      courseCycle: {
        id: createdCourseCycle.id,
        courseId: createdCourseCycle.courseId,
        academicCycleId: createdCourseCycle.academicCycleId,
      },
      professorsAssigned: professorUserIds,
      allowedEvaluationTypeIds: allAllowedTypeIds,
      newEvaluationTypesCreated: resolvedNewEvaluationTypes,
      evaluationsCreated: createdEvaluations,
      bankEvaluationCreated: bankEvaluation,
      bankFoldersConfigured: bankFolderDefinitions,
      bankFoldersCreated,
      materialsTemplateApplied: {
        enabled: shouldApplyMaterialsTemplate,
        roots: dto.materialsTemplate.roots || [],
        evaluations: templateCreatedForEvaluations,
      },
      driveProvisioning: {
        evaluationScopesProvisioned: provisionedEvaluationScopes,
        courseCycleScope: courseCycleDrive,
      },
    };
  }

  private normalizeIds(values: string[]): string[] {
    const normalized = values
      .map((value) => String(value || '').trim())
      .filter((value) => value.length > 0);
    return Array.from(new Set(normalized));
  }

  private normalizeEvaluationTypeName(name: string): string {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private resolveNewEvaluationTypeIdByName(
    rows: EvaluationTypeRow[],
    name: string,
  ): string {
    const normalizedName = this.normalizeEvaluationTypeName(name);
    const row = rows.find(
      (item) =>
        this.normalizeEvaluationTypeName(String(item.name || '')) ===
        normalizedName,
    );
    if (!row?.id) {
      throw new InternalServerErrorException(
        `No se pudo resolver el tipo de evaluacion nuevo "${name}"`,
      );
    }
    return row.id;
  }

  private async resolveNewEvaluationTypes(
    newEvaluationsToCreate: Array<{ name: string }>,
  ): Promise<EvaluationTypeRow[]> {
    const uniqueNames = Array.from(
      new Map(
        newEvaluationsToCreate
          .map((item) => String(item.name || '').trim())
          .filter(Boolean)
          .map((name) => [this.normalizeEvaluationTypeName(name), name]),
      ).values(),
    );
    if (uniqueNames.length === 0) {
      return [];
    }

    return await this.dataSource.transaction(async (manager) => {
      const resolved: EvaluationTypeRow[] = [];
      for (const rawName of uniqueNames) {
        const existing = await this.findEvaluationTypeByName(rawName, manager);
        if (existing) {
          if (
            String(existing.code || '')
              .trim()
              .toUpperCase() === EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS
          ) {
            throw new BadRequestException(
              'BANCO_ENUNCIADOS es tecnico y no puede registrarse como evaluacion academica',
            );
          }
          resolved.push(existing);
          continue;
        }

        const generatedCode = await this.generateUniqueEvaluationTypeCode(
          rawName,
          manager,
        );
        await manager.query(
          `
            INSERT INTO evaluation_type (code, name)
            VALUES (?, ?)
          `,
          [generatedCode, rawName.trim()],
        );

        const created = await this.findEvaluationTypeByCode(
          generatedCode,
          manager,
        );
        if (!created) {
          throw new InternalServerErrorException(
            `No se pudo persistir el tipo de evaluacion "${rawName}"`,
          );
        }
        resolved.push(created);
      }
      return resolved;
    });
  }

  private ensureUniqueEvaluationKeys(
    evaluationsToCreate: Array<{ evaluationTypeId: string; number: number }>,
  ): void {
    const keySet = new Set<string>();
    for (const evaluation of evaluationsToCreate) {
      const evaluationTypeId = String(evaluation.evaluationTypeId || '').trim();
      const number = Number(evaluation.number);
      if (!evaluationTypeId) {
        throw new BadRequestException('evaluationTypeId es obligatorio');
      }
      if (!Number.isInteger(number) || number <= 0) {
        throw new BadRequestException(
          'number debe ser entero positivo para evaluaciones academicas',
        );
      }
      const key = `${evaluationTypeId}:${number}`;
      if (keySet.has(key)) {
        throw new BadRequestException(
          `Evaluacion duplicada en payload: ${key}`,
        );
      }
      keySet.add(key);
    }
  }

  private validateBankFoldersPayload(
    bankFoldersToCreate: NonNullable<
      CreateCourseSetupDto['bankFoldersToCreate']
    >,
  ): void {
    const normalizedGroupNames = new Set<string>();
    for (const [index, bankFolder] of bankFoldersToCreate.entries()) {
      const explicitId = String(bankFolder.evaluationTypeId || '').trim();
      const newName = String(bankFolder.newEvaluationTypeName || '').trim();
      if (explicitId && newName) {
        throw new BadRequestException(
          `bankFoldersToCreate[${index}] no debe enviar evaluationTypeId y newEvaluationTypeName al mismo tiempo`,
        );
      }
      if (!explicitId && !newName) {
        throw new BadRequestException(
          `bankFoldersToCreate[${index}] debe enviar evaluationTypeId o newEvaluationTypeName`,
        );
      }

      const groupName = String(bankFolder.groupName || '').trim();
      const normalizedGroupName = this.normalizeFolderToken(groupName);
      if (!normalizedGroupName) {
        throw new BadRequestException(
          `bankFoldersToCreate[${index}] debe tener groupName valido`,
        );
      }
      if (normalizedGroupNames.has(normalizedGroupName)) {
        throw new BadRequestException(
          `groupName duplicado en bankFoldersToCreate: "${groupName}"`,
        );
      }
      normalizedGroupNames.add(normalizedGroupName);

      const itemTokens = new Set<string>();
      for (const itemName of bankFolder.items || []) {
        const normalizedItem = this.normalizeFolderToken(itemName);
        if (!normalizedItem) {
          throw new BadRequestException(
            `bankFoldersToCreate[${index}] contiene item invalido`,
          );
        }
        if (itemTokens.has(normalizedItem)) {
          throw new BadRequestException(
            `items duplicados en bankFoldersToCreate para groupName "${groupName}"`,
          );
        }
        itemTokens.add(normalizedItem);
      }
    }
  }

  private buildBankFolderDefinitions(input: {
    bankFoldersToCreate: CreateCourseSetupDto['bankFoldersToCreate'];
    resolvedNewEvaluationTypes: EvaluationTypeRow[];
    evaluationTypeCodeById: Map<string, string>;
    evaluationTypeNameById: Map<string, string>;
    createdEvaluations: Array<{
      id: string;
      evaluationTypeId: string;
      evaluationTypeCode: string;
      number: number;
    }>;
  }): BankFolderDefinition[] {
    const {
      bankFoldersToCreate,
      resolvedNewEvaluationTypes,
      evaluationTypeCodeById,
      evaluationTypeNameById,
      createdEvaluations,
    } = input;
    const definitionsByTypeId = new Map<string, BankFolderDefinition>();

    for (const evaluation of createdEvaluations) {
      const key = String(evaluation.evaluationTypeId || '').trim();
      if (!key || definitionsByTypeId.has(key)) {
        continue;
      }
      definitionsByTypeId.set(key, {
        evaluationTypeId: key,
        evaluationTypeCode: String(evaluation.evaluationTypeCode || '')
          .trim()
          .toUpperCase(),
        groupName: this.getDefaultBankGroupName(
          String(evaluation.evaluationTypeCode || '')
            .trim()
            .toUpperCase(),
          evaluationTypeNameById.get(key) || '',
        ),
        items: createdEvaluations
          .filter((item) => String(item.evaluationTypeId || '').trim() === key)
          .sort((left, right) => left.number - right.number)
          .map(
            (item) =>
              `${String(item.evaluationTypeCode || '')
                .trim()
                .toUpperCase()}${item.number}`,
          ),
      });
    }

    for (const bankFolder of bankFoldersToCreate || []) {
      const evaluationTypeId = this.resolveBankFolderEvaluationTypeId(
        bankFolder,
        resolvedNewEvaluationTypes,
      );
      if (!evaluationTypeId) {
        throw new BadRequestException(
          'Cada item de bankFoldersToCreate debe enviar evaluationTypeId o newEvaluationTypeName',
        );
      }
      const evaluationTypeCode = evaluationTypeCodeById.get(evaluationTypeId);
      if (!evaluationTypeCode) {
        throw new BadRequestException(
          `El tipo ${evaluationTypeId} usado en bankFoldersToCreate no existe o no esta habilitado`,
        );
      }
      const groupName = String(bankFolder.groupName || '').trim();
      const items = Array.from(
        new Set(
          (bankFolder.items || [])
            .map((item) => String(item || '').trim())
            .filter(Boolean),
        ),
      );
      if (!groupName || items.length === 0) {
        throw new BadRequestException(
          'Cada item de bankFoldersToCreate debe tener groupName e items validos',
        );
      }
      definitionsByTypeId.set(evaluationTypeId, {
        evaluationTypeId,
        evaluationTypeCode,
        groupName,
        items,
      });
    }

    return Array.from(definitionsByTypeId.values()).sort((left, right) =>
      left.groupName.localeCompare(right.groupName, 'es'),
    );
  }

  private resolveBankFolderEvaluationTypeId(
    bankFolder: NonNullable<
      CreateCourseSetupDto['bankFoldersToCreate']
    >[number],
    resolvedNewEvaluationTypes: EvaluationTypeRow[],
  ): string {
    const explicitId = String(bankFolder.evaluationTypeId || '').trim();
    if (explicitId) {
      return explicitId;
    }
    const newName = String(bankFolder.newEvaluationTypeName || '').trim();
    if (!newName) {
      return '';
    }
    return this.resolveNewEvaluationTypeIdByName(
      resolvedNewEvaluationTypes,
      newName,
    );
  }

  private normalizeFolderToken(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private async listEvaluationTypesByIds(
    evaluationTypeIds: string[],
  ): Promise<EvaluationTypeRow[]> {
    if (!evaluationTypeIds.length) {
      return [];
    }
    const placeholders = evaluationTypeIds.map(() => '?').join(', ');
    return await this.dataSource.query(
      `
        SELECT id, code, name
        FROM evaluation_type
        WHERE id IN (${placeholders})
      `,
      evaluationTypeIds,
    );
  }

  private async findEvaluationTypeByName(
    name: string,
    manager?: EntityManager,
  ): Promise<EvaluationTypeRow | null> {
    const rows = await (manager ?? this.dataSource).query<EvaluationTypeRow[]>(
      `
        SELECT id, code, name
        FROM evaluation_type
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `,
      [name],
    );
    return rows[0] || null;
  }

  private async findEvaluationTypeByCode(
    code: string,
    manager?: EntityManager,
  ): Promise<EvaluationTypeRow | null> {
    const rows = await (manager ?? this.dataSource).query<EvaluationTypeRow[]>(
      `
        SELECT id, code, name
        FROM evaluation_type
        WHERE code = ?
        LIMIT 1
      `,
      [code],
    );
    return rows[0] || null;
  }

  private async generateUniqueEvaluationTypeCode(
    name: string,
    manager?: EntityManager,
  ): Promise<string> {
    const baseToken = this.toEvaluationTypeCodeToken(name);
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const suffix = attempt === 0 ? '' : `_${attempt + 1}`;
      const maxBaseLength = 50 - suffix.length;
      const candidate = `${baseToken.slice(0, maxBaseLength)}${suffix}`;
      if (!candidate) {
        break;
      }
      const existing = await this.findEvaluationTypeByCode(candidate, manager);
      if (!existing) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      `No se pudo generar un code unico para el tipo de evaluacion "${name}"`,
    );
  }

  private toEvaluationTypeCodeToken(name: string): string {
    const normalized = String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const base = normalized || 'CUSTOM';
    return `CUSTOM_${base}`.slice(0, 50);
  }

  private async findBankEvaluationForCourseCycle(
    courseCycleId: string,
  ): Promise<{ id: string; number: number } | null> {
    const rows = await this.dataSource.query<BankEvaluationRow[]>(
      `
        SELECT e.id, e.number
        FROM evaluation e
        INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
        WHERE e.course_cycle_id = ?
          AND et.code = ?
          AND e.number = 0
        LIMIT 1
      `,
      [courseCycleId, EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS],
    );
    return rows[0] || null;
  }

  private async findBankEvaluationForCourseCycleOrFail(
    courseCycleId: string,
  ): Promise<{ id: string; number: number }> {
    const row = await this.findBankEvaluationForCourseCycle(courseCycleId);
    if (!row?.id) {
      throw new InternalServerErrorException(
        'No se encontro la evaluacion tecnica BANCO_ENUNCIADOS para el course_cycle creado',
      );
    }
    return row;
  }

  private async getCourseCycleMeta(
    courseCycleId: string,
  ): Promise<CourseCycleMetaRow> {
    const rows = await this.dataSource.query<CourseCycleMetaRow[]>(
      `
        SELECT
          c.code AS courseCode,
          ac.code AS cycleCode
        FROM course_cycle cc
        INNER JOIN course c ON c.id = cc.course_id
        INNER JOIN academic_cycle ac ON ac.id = cc.academic_cycle_id
        WHERE cc.id = ?
        LIMIT 1
      `,
      [courseCycleId],
    );
    if (!rows[0]) {
      throw new InternalServerErrorException(
        'No se encontro metadata de course_cycle para provision Drive',
      );
    }
    return rows[0];
  }

  private async ensureBankFoldersForEvaluation(
    bankEvaluationId: string,
    actorUserId: string,
    folderStatusId: string,
    definitions: BankFolderDefinition[],
  ): Promise<Array<{ groupName: string; items: string[] }>> {
    if (!bankEvaluationId || definitions.length === 0) {
      return [];
    }

    const created: Array<{ groupName: string; items: string[] }> = [];
    for (const definition of definitions) {
      const groupFolderId = await this.findOrCreateFolder({
        evaluationId: bankEvaluationId,
        parentFolderId: null,
        folderStatusId,
        name: definition.groupName,
        actorUserId,
      });
      const itemNames: string[] = [];
      for (const itemName of definition.items) {
        await this.findOrCreateFolder({
          evaluationId: bankEvaluationId,
          parentFolderId: groupFolderId,
          folderStatusId,
          name: itemName,
          actorUserId,
        });
        itemNames.push(itemName);
      }
      created.push({
        groupName: definition.groupName,
        items: itemNames,
      });
    }
    return created;
  }

  private async ensureMaterialTemplateForEvaluation(
    evaluationId: string,
    actorUserId: string,
    folderStatusId: string,
    roots: Array<{ name: string; subfolderNames?: string[] }>,
  ): Promise<void> {
    const maxDepth = Number(technicalSettings.materials.maxFolderDepth || 3);
    if (maxDepth < 2) {
      throw new InternalServerErrorException(
        'materials.maxFolderDepth debe ser >= 2 para templates',
      );
    }

    for (const root of roots) {
      const rootName = String(root.name || '').trim();
      if (!rootName) {
        throw new BadRequestException('Nombre de carpeta raiz invalido');
      }
      const rootFolderId = await this.findOrCreateFolder({
        evaluationId,
        parentFolderId: null,
        folderStatusId,
        name: rootName,
        actorUserId,
      });

      const children = Array.from(
        new Set(
          (root.subfolderNames || [])
            .map((item) => String(item || '').trim())
            .filter(Boolean),
        ),
      );
      if (children.length === 0) {
        continue;
      }
      if (maxDepth < 2) {
        throw new BadRequestException(
          'La configuracion actual no permite subcarpetas',
        );
      }
      for (const childName of children) {
        await this.findOrCreateFolder({
          evaluationId,
          parentFolderId: rootFolderId,
          folderStatusId,
          name: childName,
          actorUserId,
        });
      }
    }
  }

  private getDefaultBankGroupName(
    evaluationTypeCode: string,
    evaluationTypeName: string,
  ): string {
    switch (
      String(evaluationTypeCode || '')
        .trim()
        .toUpperCase()
    ) {
      case 'PC':
        return 'Practicas Calificadas';
      case 'EX':
        return 'Examenes';
      case 'PD':
        return 'Practicas Dirigidas';
      case 'LAB':
        return 'Laboratorios';
      case 'TUTORING':
        return 'Tutorias Especializadas';
      default: {
        const normalizedName = String(evaluationTypeName || '').trim();
        if (!normalizedName) {
          return normalizedName;
        }
        if (/[sS]$/.test(normalizedName)) {
          return normalizedName;
        }
        return `${normalizedName}s`;
      }
    }
  }

  private async getActiveFolderStatusId(): Promise<string> {
    const folderStatusRows = await this.dataSource.query<FolderIdRow[]>(
      `SELECT id FROM folder_status WHERE code = 'ACTIVE' LIMIT 1`,
    );
    if (!folderStatusRows[0]?.id) {
      throw new InternalServerErrorException('No existe folder_status ACTIVE');
    }
    return folderStatusRows[0].id;
  }

  private async findOrCreateFolder(input: {
    evaluationId: string;
    parentFolderId: string | null;
    folderStatusId: string;
    name: string;
    actorUserId: string;
  }): Promise<string> {
    const { evaluationId, parentFolderId, folderStatusId, name, actorUserId } =
      input;
    const rows = await this.dataSource.query<FolderIdRow[]>(
      `
        SELECT id
        FROM material_folder
        WHERE evaluation_id = ?
          AND name = ?
          AND (
            (? IS NULL AND parent_folder_id IS NULL)
            OR parent_folder_id = ?
          )
        LIMIT 1
      `,
      [evaluationId, name, parentFolderId, parentFolderId],
    );
    if (rows[0]?.id) {
      return rows[0].id;
    }

    await this.dataSource.query(
      `
        INSERT INTO material_folder
          (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
        VALUES
          (?, ?, ?, ?, NULL, NULL, ?, NOW(), NOW())
      `,
      [evaluationId, parentFolderId, folderStatusId, name, actorUserId],
    );

    const createdRows = await this.dataSource.query<FolderIdRow[]>(
      `
        SELECT id
        FROM material_folder
        WHERE evaluation_id = ?
          AND name = ?
          AND (
            (? IS NULL AND parent_folder_id IS NULL)
            OR parent_folder_id = ?
          )
        ORDER BY id DESC
        LIMIT 1
      `,
      [evaluationId, name, parentFolderId, parentFolderId],
    );

    if (!createdRows[0]?.id) {
      throw new InternalServerErrorException(
        'No se pudo persistir carpeta de material',
      );
    }
    return createdRows[0].id;
  }
}
