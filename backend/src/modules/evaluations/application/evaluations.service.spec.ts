import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EvaluationsService } from '@modules/evaluations/application/evaluations.service';
import { EvaluationDeletionService } from '@modules/evaluations/application/evaluation-deletion.service';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { CourseCycleProfessorRepository } from '@modules/courses/infrastructure/course-cycle-professor.repository';
import { CourseCycleAllowedEvaluationTypeRepository } from '@modules/courses/infrastructure/course-cycle-allowed-evaluation-type.repository';
import { AcademicCycleRepository } from '@modules/cycles/infrastructure/academic-cycle.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { DataSource } from 'typeorm';
import { EVALUATION_TYPE_CODES } from '@modules/evaluations/domain/evaluation.constants';
import { ROLE_CODES } from '@common/constants/role-codes.constants';

describe('EvaluationsService create', () => {
  let service: EvaluationsService;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;
  let courseCycleRepository: jest.Mocked<CourseCycleRepository>;
  let courseCycleProfessorRepository: jest.Mocked<CourseCycleProfessorRepository>;
  let courseCycleAllowedEvaluationTypeRepository: jest.Mocked<CourseCycleAllowedEvaluationTypeRepository>;
  let academicCycleRepository: jest.Mocked<AcademicCycleRepository>;
  let dataSource: jest.Mocked<DataSource>;
  let cacheService: jest.Mocked<RedisCacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        {
          provide: EvaluationDeletionService,
          useValue: {
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: EvaluationRepository,
          useValue: {
            create: jest.fn(),
            findByCourseCycle: jest.fn(),
            findAcademicTypes: jest.fn(),
            findMaxDisplayOrderByCourseCycle: jest.fn(),
            updateDisplayOrder: jest.fn(),
            hasDisplayOrderColumn: jest.fn(),
            findByIdWithTypeAndCycle: jest.fn(),
            updateDates: jest.fn(),
          },
        },
        {
          provide: CourseCycleRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: CourseCycleProfessorRepository,
          useValue: {
            isProfessorAssigned: jest.fn(),
            canProfessorReadCourseCycle: jest.fn(),
          },
        },
        {
          provide: CourseCycleAllowedEvaluationTypeRepository,
          useValue: {
            findActiveByCourseCycleId: jest.fn(),
          },
        },
        {
          provide: AcademicCycleRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            invalidateIndex: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EvaluationsService);
    evaluationRepository = module.get(EvaluationRepository);
    courseCycleRepository = module.get(CourseCycleRepository);
    courseCycleProfessorRepository = module.get(CourseCycleProfessorRepository);
    dataSource = module.get(DataSource);
    courseCycleAllowedEvaluationTypeRepository = module.get(
      CourseCycleAllowedEvaluationTypeRepository,
    );
    academicCycleRepository = module.get(AcademicCycleRepository);
    cacheService = module.get(RedisCacheService);
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb) => await cb({}),
    );
    (evaluationRepository.hasDisplayOrderColumn as jest.Mock).mockResolvedValue(
      true,
    );
  });

  it('should create evaluation when type is allowed in structure', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '10',
      academicCycleId: '20',
    });
    (academicCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '20',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-07-30T23:59:59.000Z'),
    });
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveByCourseCycleId as jest.Mock
    ).mockResolvedValue([{ evaluationTypeId: '2' }]);
    (evaluationRepository.create as jest.Mock).mockResolvedValue({
      id: '200',
      courseCycleId: '10',
      evaluationTypeId: '2',
      number: 1,
    });
    (
      evaluationRepository.findMaxDisplayOrderByCourseCycle as jest.Mock
    ).mockResolvedValue(3);

    const result = await service.create({
      courseCycleId: '10',
      evaluationTypeId: '2',
      number: 1,
      startDate: '2026-02-01T05:00:00.000Z',
      endDate: '2026-02-01T23:59:59.000Z',
    });

    expect(result.id).toBe('200');
    expect(evaluationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        courseCycleId: '10',
        evaluationTypeId: '2',
        displayOrder: 4,
      }),
      expect.anything(),
    );
    expect(cacheService.invalidateIndex).toHaveBeenCalled();
  });

  it('should reject create when structure is empty for course-cycle', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '10',
      academicCycleId: '20',
    });
    (academicCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '20',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-07-30T23:59:59.000Z'),
    });
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveByCourseCycleId as jest.Mock
    ).mockResolvedValue([]);

    await expect(
      service.create({
        courseCycleId: '10',
        evaluationTypeId: '2',
        number: 1,
        startDate: '2026-02-01T05:00:00.000Z',
        endDate: '2026-02-01T23:59:59.000Z',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(evaluationRepository.create).not.toHaveBeenCalled();
  });

  it('should reject create when type is not allowed in structure', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '10',
      academicCycleId: '20',
    });
    (academicCycleRepository.findById as jest.Mock).mockResolvedValue({
      id: '20',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-07-30T23:59:59.000Z'),
    });
    (
      courseCycleAllowedEvaluationTypeRepository.findActiveByCourseCycleId as jest.Mock
    ).mockResolvedValue([{ evaluationTypeId: '3' }]);

    await expect(
      service.create({
        courseCycleId: '10',
        evaluationTypeId: '2',
        number: 1,
        startDate: '2026-02-01T05:00:00.000Z',
        endDate: '2026-02-01T23:59:59.000Z',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(evaluationRepository.create).not.toHaveBeenCalled();
  });

  it('should reject blank evaluationTypeId', async () => {
    await expect(
      service.create({
        courseCycleId: '10',
        evaluationTypeId: '   ',
        number: 1,
        startDate: '2026-02-01T05:00:00.000Z',
        endDate: '2026-02-01T23:59:59.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject create when course-cycle does not exist', async () => {
    (courseCycleRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      service.create({
        courseCycleId: 'missing',
        evaluationTypeId: '2',
        number: 1,
        startDate: '2026-02-01T05:00:00.000Z',
        endDate: '2026-02-01T23:59:59.000Z',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should hide BANCO_ENUNCIADOS in visible course-cycle evaluations list', async () => {
    (cacheService.get as jest.Mock).mockResolvedValue(true);
    (
      courseCycleProfessorRepository.canProfessorReadCourseCycle as jest.Mock
    ).mockResolvedValue(true);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      {
        id: '1',
        evaluationType: { code: 'PC' },
      },
      {
        id: '2',
        evaluationType: { code: EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS },
      },
      {
        id: '3',
        evaluationType: { code: 'EX' },
      },
    ]);

    const result = await service.findByCourseCycle(
      '10',
      'prof-1',
      ROLE_CODES.PROFESSOR,
    );

    expect(result.map((item) => item.id)).toEqual(['1', '3']);
  });

  it('should reorder visible evaluations of a course-cycle', async () => {
    (cacheService.get as jest.Mock).mockResolvedValue(true);
    (evaluationRepository.findByCourseCycle as jest.Mock)
      .mockResolvedValueOnce([
        { id: '10', evaluationType: { code: 'PC' } },
        { id: '11', evaluationType: { code: 'EX' } },
      ])
      .mockResolvedValueOnce([
        { id: '11', evaluationType: { code: 'EX' } },
        { id: '10', evaluationType: { code: 'PC' } },
      ]);

    const result = await service.reorderByCourseCycle('55', {
      evaluationIds: ['11', '10'],
    });

    expect(evaluationRepository.updateDisplayOrder).toHaveBeenNthCalledWith(
      1,
      '11',
      1,
      expect.anything(),
    );
    expect(evaluationRepository.updateDisplayOrder).toHaveBeenNthCalledWith(
      2,
      '10',
      2,
      expect.anything(),
    );
    expect(cacheService.invalidateIndex).toHaveBeenCalled();
    expect(result.map((item) => item.id)).toEqual(['11', '10']);
  });

  it('should list academic evaluation types excluding technical bank type', async () => {
    (evaluationRepository.findAcademicTypes as jest.Mock).mockResolvedValue([
      { id: '1', code: 'PC', name: 'Practica Calificada' },
      { id: '2', code: 'EX', name: 'Examen' },
    ]);

    const result = await service.findAllTypes();

    expect(evaluationRepository.findAcademicTypes).toHaveBeenCalled();
    expect(result).toEqual([
      { id: '1', code: 'PC', name: 'Practica Calificada' },
      { id: '2', code: 'EX', name: 'Examen' },
    ]);
  });

  it('should reject reorder when payload does not contain the full visible set', async () => {
    (cacheService.get as jest.Mock).mockResolvedValue(true);
    (evaluationRepository.findByCourseCycle as jest.Mock).mockResolvedValue([
      { id: '10', evaluationType: { code: 'PC' } },
      { id: '11', evaluationType: { code: 'EX' } },
    ]);

    await expect(
      service.reorderByCourseCycle('55', {
        evaluationIds: ['11'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('update', () => {
    const EVALUATION_WITH_CYCLE = {
      id: '42',
      courseCycleId: '10',
      evaluationTypeId: '5',
      evaluationType: { code: 'PC' },
      courseCycle: {
        academicCycle: {
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: new Date('2026-07-30T23:59:59.000Z'),
        },
      },
      startDate: new Date('2026-02-01T05:00:00.000Z'),
      endDate: new Date('2026-02-01T23:59:59.000Z'),
    };

    it('should update dates when within cycle range', async () => {
      (evaluationRepository.findByIdWithTypeAndCycle as jest.Mock).mockResolvedValue(
        EVALUATION_WITH_CYCLE,
      );
      (evaluationRepository.updateDates as jest.Mock).mockResolvedValue(undefined);

      const result = await service.update('42', {
        startDate: '2026-03-01T05:00:00.000Z',
        endDate: '2026-03-01T23:59:59.000Z',
      });

      expect(evaluationRepository.updateDates).toHaveBeenCalledWith(
        '42',
        expect.any(Date),
        expect.any(Date),
      );
      expect(cacheService.invalidateIndex).toHaveBeenCalled();
      expect(result.id).toBe('42');
    });

    it('should reject blank id', async () => {
      await expect(
        service.update('   ', { startDate: '2026-03-01T05:00:00.000Z', endDate: '2026-03-01T23:59:59.000Z' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when evaluation does not exist', async () => {
      (evaluationRepository.findByIdWithTypeAndCycle as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('999', { startDate: '2026-03-01T05:00:00.000Z', endDate: '2026-03-01T23:59:59.000Z' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject update for BANCO_ENUNCIADOS type', async () => {
      (evaluationRepository.findByIdWithTypeAndCycle as jest.Mock).mockResolvedValue({
        ...EVALUATION_WITH_CYCLE,
        evaluationType: { code: EVALUATION_TYPE_CODES.BANCO_ENUNCIADOS },
      });

      await expect(
        service.update('42', { startDate: '2026-03-01T05:00:00.000Z', endDate: '2026-03-01T23:59:59.000Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(evaluationRepository.updateDates).not.toHaveBeenCalled();
    });

    it('should reject dates outside cycle range', async () => {
      (evaluationRepository.findByIdWithTypeAndCycle as jest.Mock).mockResolvedValue(
        EVALUATION_WITH_CYCLE,
      );

      await expect(
        service.update('42', {
          startDate: '2025-12-01T05:00:00.000Z',
          endDate: '2025-12-01T23:59:59.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(evaluationRepository.updateDates).not.toHaveBeenCalled();
    });

    it('should reject when startDate is after endDate', async () => {
      (evaluationRepository.findByIdWithTypeAndCycle as jest.Mock).mockResolvedValue(
        EVALUATION_WITH_CYCLE,
      );

      await expect(
        service.update('42', {
          startDate: '2026-03-10T23:59:59.000Z',
          endDate: '2026-03-01T05:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(evaluationRepository.updateDates).not.toHaveBeenCalled();
    });

    it('should normalize whitespace in id before querying', async () => {
      (evaluationRepository.findByIdWithTypeAndCycle as jest.Mock).mockResolvedValue(
        EVALUATION_WITH_CYCLE,
      );
      (evaluationRepository.updateDates as jest.Mock).mockResolvedValue(undefined);

      await service.update('  42  ', {
        startDate: '2026-03-01T05:00:00.000Z',
        endDate: '2026-03-01T23:59:59.000Z',
      });

      expect(evaluationRepository.findByIdWithTypeAndCycle).toHaveBeenCalledWith('42');
      expect(evaluationRepository.updateDates).toHaveBeenCalledWith('42', expect.any(Date), expect.any(Date));
    });
  });
});
