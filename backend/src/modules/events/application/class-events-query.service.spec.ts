import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClassEventsQueryService } from '@modules/events/application/class-events-query.service';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { EvaluationRepository } from '@modules/evaluations/infrastructure/evaluation.repository';
import { CourseCycleRepository } from '@modules/courses/infrastructure/course-cycle.repository';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { CourseCycle } from '@modules/courses/domain/course-cycle.entity';
import { Evaluation } from '@modules/evaluations/domain/evaluation.entity';
import { CLASS_EVENT_STATUS } from '@modules/events/domain/class-event.constants';

describe('ClassEventsQueryService', () => {
  let service: ClassEventsQueryService;
  let classEventRepository: jest.Mocked<ClassEventRepository>;
  let evaluationRepository: jest.Mocked<EvaluationRepository>;
  let courseCycleRepository: jest.Mocked<CourseCycleRepository>;
  let authSettingsService: jest.Mocked<AuthSettingsService>;
  let cacheService: jest.Mocked<RedisCacheService>;

  const mockEvent = {
    id: 'event-1',
    evaluationId: 'eval-1',
    startDatetime: new Date('2026-02-01T08:00:00Z'),
    endDatetime: new Date('2026-02-01T10:00:00Z'),
  } as ClassEvent;

  const mockGlobalRow = {
    eventId: 'event-1',
    evaluationId: 'eval-1',
    sessionNumber: 1,
    title: 'Sesión 1',
    topic: 'Intro',
    startDatetime: new Date('2026-02-01T08:00:00Z'),
    endDatetime: new Date('2026-02-01T10:00:00Z'),
    courseCycleId: 'cc-1',
    courseId: 'course-1',
    courseCode: 'MAT101',
    courseName: 'Matemáticas',
    primaryColor: '#FF0000',
    secondaryColor: '#000000',
  };

  const startDate = new Date('2026-02-01T00:00:00Z');
  const endDate = new Date('2026-02-08T00:00:00Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassEventsQueryService,
        {
          provide: ClassEventRepository,
          useValue: {
            findByUserAndRange: jest.fn(),
            findMyDayWidgetScheduleByUserAndRange: jest.fn(),
            findGlobalSessionsByCourseCyclesAndRange: jest.fn(),
            findAdminDayWidgetScheduleByRange: jest.fn(),
          },
        },
        {
          provide: EvaluationRepository,
          useValue: {
            findByIdWithCycle: jest.fn(),
          },
        },
        {
          provide: CourseCycleRepository,
          useValue: {
            findFullById: jest.fn(),
            findSiblingLayersByCategoryAndCycle: jest.fn(),
            findCategoryMetadataByIds: jest.fn(),
            findIdsByCourseTypeCodeAndCycleLevelId: jest.fn(),
          },
        },
        {
          provide: AuthSettingsService,
          useValue: {
            getActiveCycleId: jest.fn(),
          },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            addToIndex: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ClassEventsQueryService>(ClassEventsQueryService);
    classEventRepository = module.get(ClassEventRepository);
    evaluationRepository = module.get(EvaluationRepository);
    courseCycleRepository = module.get(CourseCycleRepository);
    authSettingsService = module.get(AuthSettingsService);
    cacheService = module.get(RedisCacheService);
  });

  describe('getMySchedule', () => {
    it('debe retornar eventos del repositorio', async () => {
      const start = new Date('2026-02-01');
      const end = new Date('2026-02-07');
      classEventRepository.findByUserAndRange.mockResolvedValue([mockEvent]);

      const result = await service.getMySchedule('user-1', start, end);

      expect(result).toEqual([mockEvent]);
      expect(classEventRepository.findByUserAndRange).toHaveBeenCalled();
    });
  });

  describe('getMyDayWidgetSchedule', () => {
    it('debe retornar agenda resumida personal', async () => {
      classEventRepository.findMyDayWidgetScheduleByUserAndRange.mockResolvedValue([
        {
          id: 'evt-u-1',
          sessionNumber: 1,
          title: 'Clase personal',
          startDatetime: new Date('2026-04-18T15:00:00.000Z'),
          endDatetime: new Date('2026-04-18T17:00:00.000Z'),
          liveMeetingUrl: null,
          isCancelled: false,
          courseName: 'Fundamentos',
          courseCode: 'INF101',
        },
      ]);

      const result = await service.getMyDayWidgetSchedule(
        'user-1',
        startDate,
        endDate,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'evt-u-1',
        sessionNumber: 1,
        title: 'Clase personal',
        courseName: 'Fundamentos',
        courseCode: 'INF101',
      });
      expect(
        classEventRepository.findMyDayWidgetScheduleByUserAndRange,
      ).toHaveBeenCalledWith('user-1', startDate, endDate);
      expect(cacheService.set).toHaveBeenCalled();
      expect(cacheService.addToIndex).toHaveBeenCalled();
    });

    it('debe servir desde cache si ya existe', async () => {
      const cached = [
        {
          id: 'evt-u-cache',
          sessionNumber: 2,
          title: 'Clase cache',
          startDatetime: new Date('2026-04-18T10:00:00.000Z'),
          endDatetime: new Date('2026-04-18T12:00:00.000Z'),
          liveMeetingUrl: null,
          isCancelled: false,
          sessionStatus: CLASS_EVENT_STATUS.PROGRAMADA,
          courseName: 'Cálculo',
          courseCode: 'MAT101',
        },
      ];
      cacheService.get.mockResolvedValueOnce(cached as never);

      const result = await service.getMyDayWidgetSchedule(
        'user-1',
        startDate,
        endDate,
      );

      expect(result).toBe(cached);
      expect(
        classEventRepository.findMyDayWidgetScheduleByUserAndRange,
      ).not.toHaveBeenCalled();
    });

    it('debe calcular estado CANCELADA cuando el evento esta cancelado', async () => {
      classEventRepository.findMyDayWidgetScheduleByUserAndRange.mockResolvedValue([
        {
          id: 'evt-u-cancelled',
          sessionNumber: 4,
          title: 'Clase cancelada',
          startDatetime: new Date('2026-04-18T15:00:00.000Z'),
          endDatetime: new Date('2026-04-18T17:00:00.000Z'),
          liveMeetingUrl: null,
          isCancelled: true,
          courseName: 'Fundamentos',
          courseCode: 'INF101',
        },
      ]);

      const result = await service.getMyDayWidgetSchedule(
        'user-1',
        startDate,
        endDate,
      );

      expect(result[0].sessionStatus).toBe(CLASS_EVENT_STATUS.CANCELADA);
    });
  });

  describe('getAdminDayWidgetSchedule', () => {
    it('debe retornar agenda resumida para admin', async () => {
      classEventRepository.findAdminDayWidgetScheduleByRange.mockResolvedValue([
        {
          id: 'evt-1',
          sessionNumber: 1,
          title: 'Clase 1',
          startDatetime: new Date('2026-04-18T15:00:00.000Z'),
          endDatetime: new Date('2026-04-18T17:00:00.000Z'),
          liveMeetingUrl: 'https://meet.google.com/abc',
          isCancelled: false,
          courseName: 'Fundamentos',
          courseCode: 'INF101',
        },
      ]);

      const result = await service.getAdminDayWidgetSchedule(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'evt-1',
        sessionNumber: 1,
        title: 'Clase 1',
        courseName: 'Fundamentos',
        courseCode: 'INF101',
        liveMeetingUrl: 'https://meet.google.com/abc',
        isCancelled: false,
      });
      expect(
        [
          CLASS_EVENT_STATUS.PROGRAMADA,
          CLASS_EVENT_STATUS.EN_CURSO,
          CLASS_EVENT_STATUS.FINALIZADA,
        ].includes(result[0].sessionStatus),
      ).toBe(true);
      expect(
        classEventRepository.findAdminDayWidgetScheduleByRange,
      ).toHaveBeenCalledWith(startDate, endDate);
      expect(cacheService.set).toHaveBeenCalled();
      expect(cacheService.addToIndex).toHaveBeenCalled();
    });

    it('debe servir desde cache si ya existe', async () => {
      const cached = [
        {
          id: 'evt-cache',
          sessionNumber: 2,
          title: 'Clase cache',
          startDatetime: new Date('2026-04-18T10:00:00.000Z'),
          endDatetime: new Date('2026-04-18T12:00:00.000Z'),
          liveMeetingUrl: null,
          isCancelled: false,
          sessionStatus: CLASS_EVENT_STATUS.PROGRAMADA,
          courseName: 'Cálculo',
          courseCode: 'MAT101',
        },
      ];
      cacheService.get.mockResolvedValueOnce(cached as never);

      const result = await service.getAdminDayWidgetSchedule(startDate, endDate);

      expect(result).toBe(cached);
      expect(
        classEventRepository.findAdminDayWidgetScheduleByRange,
      ).not.toHaveBeenCalled();
    });

    it('debe calcular estado EN_CURSO cuando now esta dentro del rango', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-18T16:00:00.000Z'));
      classEventRepository.findAdminDayWidgetScheduleByRange.mockResolvedValue([
        {
          id: 'evt-admin-live',
          sessionNumber: 5,
          title: 'Clase en curso',
          startDatetime: new Date('2026-04-18T15:00:00.000Z'),
          endDatetime: new Date('2026-04-18T17:00:00.000Z'),
          liveMeetingUrl: 'https://meet.google.com/live',
          isCancelled: false,
          courseName: 'Fundamentos',
          courseCode: 'INF101',
        },
      ]);

      const result = await service.getAdminDayWidgetSchedule(startDate, endDate);
      expect(result[0].sessionStatus).toBe(CLASS_EVENT_STATUS.EN_CURSO);
      jest.useRealTimers();
    });
  });

  describe('getDiscoveryLayers', () => {
    it('debe fallar si el curso no pertenece al ciclo activo', async () => {
      courseCycleRepository.findFullById.mockResolvedValue({
        id: 'cc-1',
        cycleLevelId: '3',
        course: { courseTypeId: 'ct-1' },
      } as unknown as CourseCycle);
      authSettingsService.getActiveCycleId.mockResolvedValue('ac-2');

      await expect(service.getDiscoveryLayers('cc-1')).rejects.toThrow(
        'ciclo actual',
      );
    });
  });

  describe('isCycleActive', () => {
    it('debe retornar true si el ciclo está en el rango actual', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      evaluationRepository.findByIdWithCycle.mockResolvedValue({
        courseCycle: {
          academicCycle: { startDate: start, endDate: end },
        },
      } as unknown as Evaluation);

      const result = await service.isCycleActive('eval-1');
      expect(result).toBe(true);
    });
  });

  describe('getGlobalSessions', () => {
    describe('Path A — via courseCycleIds explícitos', () => {
      it('debe agrupar sesiones por courseCycleId', async () => {
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
        ]);
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange.mockResolvedValue([
          mockGlobalRow,
        ]);

        const result = await service.getGlobalSessions(
          { courseCycleIds: ['cc-1'] },
          startDate,
          endDate,
        );

        expect(result).toHaveLength(1);
        expect(result[0].courseCycleId).toBe('cc-1');
        expect(result[0].sessions).toHaveLength(1);
        expect(result[0].sessions[0].eventId).toBe('event-1');
      });

      it('debe deduplicar courseCycleIds repetidos', async () => {
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
        ]);
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange.mockResolvedValue([]);

        await service.getGlobalSessions(
          { courseCycleIds: ['cc-1', 'cc-1', 'cc-1'] },
          startDate,
          endDate,
        );

        expect(courseCycleRepository.findCategoryMetadataByIds).toHaveBeenCalledWith(['cc-1']);
      });

      it('debe agrupar múltiples sesiones del mismo courseCycleId', async () => {
        const row2 = { ...mockGlobalRow, eventId: 'event-2', sessionNumber: 2 };
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
        ]);
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange.mockResolvedValue([
          mockGlobalRow,
          row2,
        ]);

        const result = await service.getGlobalSessions(
          { courseCycleIds: ['cc-1'] },
          startDate,
          endDate,
        );

        expect(result[0].sessions).toHaveLength(2);
      });

      it('debe retornar [] si no hay eventos en el rango', async () => {
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
        ]);
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange.mockResolvedValue([]);

        const result = await service.getGlobalSessions(
          { courseCycleIds: ['cc-1'] },
          startDate,
          endDate,
        );

        expect(result).toEqual([]);
      });

      it('debe lanzar NotFoundException si algún courseCycleId no existe', async () => {
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
        ]);

        await expect(
          service.getGlobalSessions(
            { courseCycleIds: ['cc-1', 'cc-999'] },
            startDate,
            endDate,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('debe lanzar BadRequestException si los IDs pertenecen a distintos courseType', async () => {
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
          { courseCycleId: 'cc-2', courseTypeId: 'ct-2', cycleLevelId: '3' },
        ]);

        await expect(
          service.getGlobalSessions(
            { courseCycleIds: ['cc-1', 'cc-2'] },
            startDate,
            endDate,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('debe lanzar BadRequestException si los IDs pertenecen a distintos academicCycle', async () => {
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
          { courseCycleId: 'cc-2', courseTypeId: 'ct-1', academicCycleId: 'ac-2' },
        ]);

        await expect(
          service.getGlobalSessions(
            { courseCycleIds: ['cc-1', 'cc-2'] },
            startDate,
            endDate,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('debe servir desde caché si ya existe', async () => {
        const cached = [{ courseCycleId: 'cc-1', sessions: [] }];
        cacheService.get.mockResolvedValue(cached as never);
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
        ]);

        const result = await service.getGlobalSessions(
          { courseCycleIds: ['cc-1'] },
          startDate,
          endDate,
        );

        expect(result).toBe(cached);
        expect(classEventRepository.findGlobalSessionsByCourseCyclesAndRange).not.toHaveBeenCalled();
      });
    });

    describe('Path B — via courseTypeCode + cycleLevelId', () => {
      it('debe resolver IDs y retornar sesiones agrupadas', async () => {
        courseCycleRepository.findIdsByCourseTypeCodeAndCycleLevelId.mockResolvedValue({
          courseCycleIds: ['cc-1'],
          courseTypeId: 'ct-1',
        });
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange.mockResolvedValue([
          mockGlobalRow,
        ]);

        const result = await service.getGlobalSessions(
          { courseTypeCode: 'CIENCIAS', cycleLevelId: '3' },
          startDate,
          endDate,
        );

        expect(result).toHaveLength(1);
        expect(result[0].courseCycleId).toBe('cc-1');
        expect(courseCycleRepository.findIdsByCourseTypeCodeAndCycleLevelId).toHaveBeenCalledWith(
          'CIENCIAS',
          '3',
        );
      });

      it('debe retornar [] si no hay courseCycles para ese tipo y ciclo', async () => {
        courseCycleRepository.findIdsByCourseTypeCodeAndCycleLevelId.mockResolvedValue({
          courseCycleIds: [],
          courseTypeId: null,
        });

        const result = await service.getGlobalSessions(
          { courseTypeCode: 'LETRAS', cycleLevelId: '99' },
          startDate,
          endDate,
        );

        expect(result).toEqual([]);
        expect(classEventRepository.findGlobalSessionsByCourseCyclesAndRange).not.toHaveBeenCalled();
      });

      it('debe servir desde caché en Path B', async () => {
        const cached = [{ courseCycleId: 'cc-1', sessions: [] }];
        courseCycleRepository.findIdsByCourseTypeCodeAndCycleLevelId.mockResolvedValue({
          courseCycleIds: ['cc-1'],
          courseTypeId: 'ct-1',
        });
        cacheService.get.mockResolvedValue(cached as never);

        const result = await service.getGlobalSessions(
          { courseTypeCode: 'CIENCIAS', cycleLevelId: '3' },
          startDate,
          endDate,
        );

        expect(result).toBe(cached);
        expect(classEventRepository.findGlobalSessionsByCourseCyclesAndRange).not.toHaveBeenCalled();
      });

      it('no debe llamar a findCategoryMetadataByIds en Path B', async () => {
        courseCycleRepository.findIdsByCourseTypeCodeAndCycleLevelId.mockResolvedValue({
          courseCycleIds: ['cc-1'],
          courseTypeId: 'ct-1',
        });
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange.mockResolvedValue([]);

        await service.getGlobalSessions(
          { courseTypeCode: 'FACULTAD', cycleLevelId: '3' },
          startDate,
          endDate,
        );

        expect(courseCycleRepository.findCategoryMetadataByIds).not.toHaveBeenCalled();
      });
    });

    describe('Combinaciones inválidas de parámetros', () => {
      it('debe lanzar BadRequestException si no se envía ningún filtro', async () => {
        await expect(
          service.getGlobalSessions({}, startDate, endDate),
        ).rejects.toThrow(BadRequestException);
      });

      it('debe lanzar BadRequestException si solo se envía courseTypeCode sin cycleLevelId', async () => {
        await expect(
          service.getGlobalSessions(
            { courseTypeCode: 'CIENCIAS' },
            startDate,
            endDate,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('debe lanzar BadRequestException si solo se envía cycleLevelId sin courseTypeCode', async () => {
        await expect(
          service.getGlobalSessions(
            { cycleLevelId: '3' },
            startDate,
            endDate,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('debe priorizar Path A si se envían ambas formas simultáneamente', async () => {
        courseCycleRepository.findCategoryMetadataByIds.mockResolvedValue([
          { courseCycleId: 'cc-1', courseTypeId: 'ct-1', cycleLevelId: '3' },
        ]);
        classEventRepository.findGlobalSessionsByCourseCyclesAndRange.mockResolvedValue([]);

        await service.getGlobalSessions(
          {
            courseCycleIds: ['cc-1'],
            courseTypeCode: 'CIENCIAS',
            cycleLevelId: '3',
          },
          startDate,
          endDate,
        );

        expect(courseCycleRepository.findCategoryMetadataByIds).toHaveBeenCalledWith(['cc-1']);
        expect(courseCycleRepository.findIdsByCourseTypeCodeAndCycleLevelId).not.toHaveBeenCalled();
      });
    });
  });
});
