import { Expose, Type } from 'class-transformer';
import type { StudentEvaluationLabel } from '@modules/courses/domain/student-course.constants';

export class StudentEvaluationCardDto {
  @Expose()
  id: string;

  @Expose()
  evaluationTypeCode: string;

  @Expose()
  shortName: string;

  @Expose()
  fullName: string;

  @Expose()
  hasAccess: boolean;

  @Expose()
  label: StudentEvaluationLabel;
}

export class StudentCurrentCycleContentResponseDto {
  @Expose()
  courseCycleId: string;

  @Expose()
  cycleCode: string;

  @Expose()
  canViewPreviousCycles: boolean;

  @Expose()
  @Type(() => StudentEvaluationCardDto)
  evaluations: StudentEvaluationCardDto[];
}

export class StudentPreviousCycleItemDto {
  @Expose()
  cycleCode: string;
}

export class StudentPreviousCycleListResponseDto {
  @Expose()
  @Type(() => StudentPreviousCycleItemDto)
  cycles: StudentPreviousCycleItemDto[];
}

export class StudentPreviousCycleContentResponseDto {
  @Expose()
  cycleCode: string;

  @Expose()
  @Type(() => StudentEvaluationCardDto)
  evaluations: StudentEvaluationCardDto[];
}

export class StudentBankStructureItemDto {
  @Expose()
  evaluationTypeId: string;

  @Expose()
  evaluationTypeCode: string;

  @Expose()
  evaluationTypeName: string;

  @Expose()
  @Type(() => StudentBankStructureEntryDto)
  entries: StudentBankStructureEntryDto[];
}

export class StudentBankStructureEntryDto {
  @Expose()
  evaluationId: string | null;

  @Expose()
  evaluationTypeCode: string;

  @Expose()
  evaluationTypeName: string;

  @Expose()
  evaluationNumber: number;

  @Expose()
  label: string;

  @Expose()
  folderId: string | null;

  @Expose()
  folderName: string | null;
}

export class StudentBankStructureResponseDto {
  @Expose()
  courseCycleId: string;

  @Expose()
  cycleCode: string;

  @Expose()
  bankEvaluationId: string;

  @Expose()
  @Type(() => StudentBankStructureItemDto)
  items: StudentBankStructureItemDto[];
}
