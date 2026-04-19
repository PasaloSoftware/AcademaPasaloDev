import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { AcademicCycleRepository } from '@modules/cycles/infrastructure/academic-cycle.repository';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { RedisCacheService } from '@infrastructure/cache/redis-cache.service';
import { ENROLLMENT_CACHE_KEYS } from '@modules/enrollments/domain/enrollment.constants';
import { AcademicCycle } from '@modules/cycles/domain/academic-cycle.entity';
import { CycleFormDto } from '@modules/cycles/dto/cycle-form.dto';

const CYCLE_ACTIVE_CACHE_GROUP = 'cache:cycle-active:*';

const mockCycleRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findHistoryPaginated: jest.fn(),
  findByCode: jest.fn(),
  findOverlapping: jest.fn(),
  createCycle: jest.fn(),
  saveCycle: jest.fn(),
};

const mockAuthSettingsService = {
  getActiveCycleId: jest.fn(),
  clearActiveCycleId: jest.fn(),
};

const mockCacheService = {
  invalidateGroup: jest.fn(),
};

const makeCycle = (
  id: string,
  code = 'CYCLE_A',
  endDate = new Date('2099-12-31'),
): AcademicCycle =>
  ({
    id,
    code,
    startDate: new Date('2024-01-01'),
    endDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as AcademicCycle;

const makeFormDto = (overrides: Partial<CycleFormDto> = {}): CycleFormDto => ({
  code: '2025-1',
  startDate: '2025-01-06',
  endDate: '2025-06-30',
  ...overrides,
});

describe('CyclesService', () => {
  let service: CyclesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CyclesService,
        { provide: AcademicCycleRepository, useValue: mockCycleRepo },
        { provide: AuthSettingsService, useValue: mockAuthSettingsService },
        { provide: RedisCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<CyclesService>(CyclesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('devuelve todos los ciclos del repositorio', async () => {
      const cycles = [makeCycle('1'), makeCycle('2')];
      mockCycleRepo.findAll.mockResolvedValue(cycles);

      const result = await service.findAll();

      expect(result).toEqual(cycles);
      expect(mockCycleRepo.findAll).toHaveBeenCalledTimes(1);
    });

    it('devuelve array vacío si no hay ciclos', async () => {
      mockCycleRepo.findAll.mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('devuelve el ciclo cuando existe', async () => {
      const cycle = makeCycle('5');
      mockCycleRepo.findById.mockResolvedValue(cycle);

      const result = await service.findOne('5');

      expect(result).toEqual(cycle);
      expect(mockCycleRepo.findById).toHaveBeenCalledWith('5');
    });

    it('lanza NotFoundException cuando el ciclo no existe', async () => {
      mockCycleRepo.findById.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('el mensaje de NotFoundException está en español', async () => {
      mockCycleRepo.findById.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(
        'El ciclo académico solicitado no existe.',
      );
    });
  });

  // ─────────────────────────────────────────────
  // getActiveCycle
  // ─────────────────────────────────────────────
  describe('getActiveCycle', () => {
    it('devuelve el ciclo vigente cuando ACTIVE_CYCLE_ID y el ciclo existen', async () => {
      const cycle = makeCycle('10');
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findById.mockResolvedValue(cycle);

      const result = await service.getActiveCycle();

      expect(result).toEqual(cycle);
      expect(mockAuthSettingsService.getActiveCycleId).toHaveBeenCalledTimes(1);
      expect(mockCycleRepo.findById).toHaveBeenCalledWith('10');
    });

    it('lanza NotFoundException si ACTIVE_CYCLE_ID no está configurado', async () => {
      mockAuthSettingsService.getActiveCycleId.mockRejectedValue(
        new Error('Not found'),
      );
      await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el ciclo referenciado no existe en BD', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('999');
      mockCycleRepo.findById.mockResolvedValue(null);
      await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);
    });

    it('no llama a clearActiveCycleId si el ciclo está vigente', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findById.mockResolvedValue(makeCycle('10'));

      await service.getActiveCycle();

      expect(mockAuthSettingsService.clearActiveCycleId).not.toHaveBeenCalled();
    });

    // ── Transición lazy al expirar ─────────────
    describe('transición lazy al expirar', () => {
      const EXPIRED_ID = '10';
      // endDate = 2024-01-15 → expira a partir del 2024-01-16T00:00:00Z
      const expiredCycle = makeCycle(EXPIRED_ID, 'CYCLE_A', new Date('2024-01-15'));

      beforeEach(() => {
        mockAuthSettingsService.getActiveCycleId.mockResolvedValue(EXPIRED_ID);
        mockCycleRepo.findById.mockResolvedValue(expiredCycle);
        mockAuthSettingsService.clearActiveCycleId.mockResolvedValue(undefined);
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-16T10:00:00.000Z'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('lanza NotFoundException si el endDate ya pasó', async () => {
        await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);
      });

      it('el mensaje indica que el ciclo ha concluido', async () => {
        await expect(service.getActiveCycle()).rejects.toThrow(
          'El ciclo académico vigente ha concluido.',
        );
      });

      it('llama a clearActiveCycleId para liberar el ciclo expirado', async () => {
        await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);

        expect(mockAuthSettingsService.clearActiveCycleId).toHaveBeenCalledTimes(1);
      });

      it('sigue lanzando NotFoundException aunque clearActiveCycleId falle', async () => {
        mockAuthSettingsService.clearActiveCycleId.mockRejectedValue(
          new Error('DB error'),
        );

        await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);
      });

      it('emite logger.warn al detectar expiración', async () => {
        const warnSpy = jest
          .spyOn(
            (service as unknown as { logger: { warn: jest.Mock } }).logger,
            'warn',
          )
          .mockImplementation(() => undefined);

        await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const logArg = warnSpy.mock.calls[0][0] as Record<string, unknown>;
        expect(logArg).toHaveProperty('message', 'Ciclo vigente expirado — transición lazy a histórico');
        expect(logArg).toHaveProperty('cycleId', EXPIRED_ID);
      });

      it('emite logger.error si clearActiveCycleId falla', async () => {
        mockAuthSettingsService.clearActiveCycleId.mockRejectedValue(
          new Error('DB timeout'),
        );
        const errorSpy = jest
          .spyOn(
            (service as unknown as { logger: { error: jest.Mock } }).logger,
            'error',
          )
          .mockImplementation(() => undefined);

        await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const logArg = errorSpy.mock.calls[0][0] as Record<string, unknown>;
        expect(logArg).toHaveProperty('message', 'No se pudo limpiar ACTIVE_CYCLE_ID tras detectar expiración');
        expect(logArg).toHaveProperty('error', 'DB timeout');
      });

      it('ciclo cuyo endDate es hoy no expira antes de la medianoche UTC', async () => {
        // Mismo endDate (2024-01-15) pero todavía es 23:00 de ese día
        jest.setSystemTime(new Date('2024-01-15T23:00:00.000Z'));

        await expect(service.getActiveCycle()).resolves.toEqual(expiredCycle);
        expect(mockAuthSettingsService.clearActiveCycleId).not.toHaveBeenCalled();
      });

      it('ciclo expira exactamente al pasar 23:59:59.999 UTC del endDate', async () => {
        jest.setSystemTime(new Date('2024-01-16T00:00:00.000Z'));

        await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);
        expect(mockAuthSettingsService.clearActiveCycleId).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ─────────────────────────────────────────────
  // getHistory
  // ─────────────────────────────────────────────
  describe('getHistory', () => {
    it('excluye el ciclo vigente y pasa los args correctos al repo', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 0]);

      await service.getHistory(1);

      expect(mockCycleRepo.findHistoryPaginated).toHaveBeenCalledWith('10', 1, 4);
    });

    it('devuelve paginación correcta con items', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      const cycles = [makeCycle('1', '2023-2'), makeCycle('2', '2023-1')];
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([cycles, 2]);

      const result = await service.getHistory(1);

      expect(result.items).toHaveLength(2);
      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBe(4);
      expect(result.totalItems).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('devuelve totalPages 0 cuando totalItems es 0', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 0]);

      expect((await service.getHistory(1)).totalPages).toBe(0);
    });

    it('calcula totalPages con ceil para múltiples páginas', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 9]);

      expect((await service.getHistory(1)).totalPages).toBe(3);
    });

    it('currentPage refleja la página solicitada', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 20]);

      expect((await service.getHistory(5)).currentPage).toBe(5);
    });

    it('pasa excludeId null si ACTIVE_CYCLE_ID no está configurado', async () => {
      mockAuthSettingsService.getActiveCycleId.mockRejectedValue(
        new Error('Sin ciclo'),
      );
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 0]);

      await service.getHistory(1);

      expect(mockCycleRepo.findHistoryPaginated).toHaveBeenCalledWith(null, 1, 4);
    });

    it('items contienen id, code, startDate, endDate', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([
        [makeCycle('1', '2023-2')],
        1,
      ]);

      const item = (await service.getHistory(1)).items[0];

      expect(item).toHaveProperty('id', '1');
      expect(item).toHaveProperty('code', '2023-2');
      expect(item).toHaveProperty('startDate');
      expect(item).toHaveProperty('endDate');
    });

    it('items NO incluyen createdAt ni updatedAt', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[makeCycle('1')], 1]);

      const item = (await service.getHistory(1)).items[0] as Record<
        string,
        unknown
      >;

      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('updatedAt');
    });
  });

  // ─────────────────────────────────────────────
  // updateActiveCycle
  // ─────────────────────────────────────────────
  describe('updateActiveCycle', () => {
    const ACTIVE_ID = '10';

    beforeEach(() => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue(ACTIVE_ID);
      mockCycleRepo.findById.mockResolvedValue(makeCycle(ACTIVE_ID, '2025-1'));
      mockCycleRepo.findByCode.mockResolvedValue(null);
      mockCycleRepo.findOverlapping.mockResolvedValue(null);
      mockCycleRepo.saveCycle.mockImplementation((c: AcademicCycle) =>
        Promise.resolve(c),
      );
      mockCacheService.invalidateGroup.mockResolvedValue(undefined);
    });

    it('actualiza y retorna el ciclo vigente con los nuevos valores', async () => {
      const dto = makeFormDto({ code: '2025-1-fix', startDate: '2025-01-07', endDate: '2025-07-01' });

      const result = await service.updateActiveCycle(dto);

      expect(result.code).toBe('2025-1-fix');
      expect(result.startDate).toEqual(new Date('2025-01-07'));
      expect(result.endDate).toEqual(new Date('2025-07-01'));
    });

    it('llama a saveCycle con la entidad mutada', async () => {
      const dto = makeFormDto({ code: '2025-1-edit' });

      await service.updateActiveCycle(dto);

      expect(mockCycleRepo.saveCycle).toHaveBeenCalledTimes(1);
      const savedArg: AcademicCycle = mockCycleRepo.saveCycle.mock.calls[0][0];
      expect(savedArg.code).toBe('2025-1-edit');
      expect(savedArg.startDate).toEqual(new Date(dto.startDate));
      expect(savedArg.endDate).toEqual(new Date(dto.endDate));
    });

    it('lanza NotFoundException si no hay ciclo vigente configurado', async () => {
      mockAuthSettingsService.getActiveCycleId.mockRejectedValue(
        new Error('Not found'),
      );

      await expect(service.updateActiveCycle(makeFormDto())).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCycleRepo.saveCycle).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el ciclo vigente no existe en BD', async () => {
      mockCycleRepo.findById.mockResolvedValue(null);

      await expect(service.updateActiveCycle(makeFormDto())).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCycleRepo.saveCycle).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si startDate === endDate', async () => {
      const dto = makeFormDto({ startDate: '2025-03-01', endDate: '2025-03-01' });

      await expect(service.updateActiveCycle(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCycleRepo.saveCycle).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si startDate > endDate', async () => {
      const dto = makeFormDto({ startDate: '2025-08-01', endDate: '2025-01-01' });

      await expect(service.updateActiveCycle(dto)).rejects.toThrow(
        'La fecha de inicio debe ser anterior a la fecha de fin.',
      );
      expect(mockCycleRepo.saveCycle).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si el código ya lo usa otro ciclo', async () => {
      mockCycleRepo.findByCode.mockResolvedValue(makeCycle('99', '2025-1'));

      await expect(
        service.updateActiveCycle(makeFormDto({ code: '2025-1' })),
      ).rejects.toThrow('Ya existe un ciclo con ese código.');
      expect(mockCycleRepo.saveCycle).not.toHaveBeenCalled();
    });

    it('lanza ConflictException con el código del ciclo solapado', async () => {
      mockCycleRepo.findOverlapping.mockResolvedValue(makeCycle('8', '2024-2'));

      await expect(service.updateActiveCycle(makeFormDto())).rejects.toThrow(
        'Las fechas se solapan con el ciclo "2024-2".',
      );
      expect(mockCycleRepo.saveCycle).not.toHaveBeenCalled();
    });

    it('pasa el id del ciclo vigente como excludeId a findByCode y findOverlapping', async () => {
      const dto = makeFormDto();

      await service.updateActiveCycle(dto);

      expect(mockCycleRepo.findByCode).toHaveBeenCalledWith(dto.code, ACTIVE_ID);
      expect(mockCycleRepo.findOverlapping).toHaveBeenCalledWith(
        dto.startDate,
        dto.endDate,
        ACTIVE_ID,
      );
    });

    it('no lanza ConflictException de código si el ciclo mantiene su propio código', async () => {
      mockCycleRepo.findByCode.mockResolvedValue(null);

      await expect(
        service.updateActiveCycle(makeFormDto({ code: '2025-1' })),
      ).resolves.not.toThrow();
    });

    it('no lanza ConflictException de solapamiento con sus propias fechas actuales', async () => {
      mockCycleRepo.findOverlapping.mockResolvedValue(null);

      await expect(service.updateActiveCycle(makeFormDto())).resolves.not.toThrow();
    });

    it('invalida el caché de dashboard de todos los alumnos tras guardar', async () => {
      await service.updateActiveCycle(makeFormDto());

      expect(mockCacheService.invalidateGroup).toHaveBeenCalledWith(
        ENROLLMENT_CACHE_KEYS.GLOBAL_DASHBOARD_GROUP,
      );
    });

    it('invalida el caché de cycle-active de todos los eventos tras guardar', async () => {
      await service.updateActiveCycle(makeFormDto());

      expect(mockCacheService.invalidateGroup).toHaveBeenCalledWith(
        CYCLE_ACTIVE_CACHE_GROUP,
      );
    });

    it('invalida ambos cachés exactamente una vez en paralelo', async () => {
      await service.updateActiveCycle(makeFormDto());

      expect(mockCacheService.invalidateGroup).toHaveBeenCalledTimes(2);
    });

    it('NO invalida cachés si falla antes de guardar', async () => {
      mockCycleRepo.findByCode.mockResolvedValue(makeCycle('99', '2025-1'));

      await expect(
        service.updateActiveCycle(makeFormDto()),
      ).rejects.toThrow(ConflictException);

      expect(mockCacheService.invalidateGroup).not.toHaveBeenCalled();
    });

    it('NO invalida cachés si no hay ciclo vigente configurado', async () => {
      mockAuthSettingsService.getActiveCycleId.mockRejectedValue(
        new Error('Not found'),
      );

      await expect(
        service.updateActiveCycle(makeFormDto()),
      ).rejects.toThrow(NotFoundException);

      expect(mockCacheService.invalidateGroup).not.toHaveBeenCalled();
    });

    it('emite logger.warn antes de persistir el cambio', async () => {
      const warnSpy = jest
        .spyOn((service as unknown as { logger: { warn: jest.Mock } }).logger, 'warn')
        .mockImplementation(() => undefined);

      await service.updateActiveCycle(makeFormDto());

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const logArg = warnSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(logArg).toHaveProperty('message');
      expect(logArg).toHaveProperty('cycleId', ACTIVE_ID);
      expect(logArg).toHaveProperty('before');
      expect(logArg).toHaveProperty('after');
    });
  });

  // ─────────────────────────────────────────────
  // createHistoricalCycle
  // ─────────────────────────────────────────────
  describe('createHistoricalCycle', () => {
    it('crea el ciclo y retorna el objeto guardado', async () => {
      const dto = makeFormDto();
      const created = makeCycle('20', dto.code);
      mockCycleRepo.findByCode.mockResolvedValue(null);
      mockCycleRepo.findOverlapping.mockResolvedValue(null);
      mockCycleRepo.createCycle.mockResolvedValue(created);

      const result = await service.createHistoricalCycle(dto);

      expect(result).toEqual(created);
      expect(mockCycleRepo.createCycle).toHaveBeenCalledWith({
        code: dto.code,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      });
    });

    it('lanza BadRequestException si startDate === endDate', async () => {
      const dto = makeFormDto({ startDate: '2025-03-01', endDate: '2025-03-01' });
      await expect(service.createHistoricalCycle(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si startDate > endDate', async () => {
      const dto = makeFormDto({ startDate: '2025-07-01', endDate: '2025-01-01' });
      await expect(service.createHistoricalCycle(dto)).rejects.toThrow(
        'La fecha de inicio debe ser anterior a la fecha de fin.',
      );
    });

    it('lanza ConflictException si el código ya existe', async () => {
      const dto = makeFormDto();
      mockCycleRepo.findByCode.mockResolvedValue(makeCycle('5', dto.code));

      await expect(service.createHistoricalCycle(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockCycleRepo.findByCode).toHaveBeenCalledWith(dto.code);
    });

    it('lanza ConflictException con el código del ciclo solapado', async () => {
      const dto = makeFormDto();
      mockCycleRepo.findByCode.mockResolvedValue(null);
      mockCycleRepo.findOverlapping.mockResolvedValue(makeCycle('3', '2024-2'));

      await expect(service.createHistoricalCycle(dto)).rejects.toThrow(
        'Las fechas se solapan con el ciclo "2024-2".',
      );
    });

    it('llama a findOverlapping sin excludeId', async () => {
      const dto = makeFormDto();
      mockCycleRepo.findByCode.mockResolvedValue(null);
      mockCycleRepo.findOverlapping.mockResolvedValue(null);
      mockCycleRepo.createCycle.mockResolvedValue(makeCycle('20'));

      await service.createHistoricalCycle(dto);

      expect(mockCycleRepo.findOverlapping).toHaveBeenCalledWith(
        dto.startDate,
        dto.endDate,
      );
    });
  });

  // ─────────────────────────────────────────────
  // updateHistoricalCycle
  // ─────────────────────────────────────────────
  describe('updateHistoricalCycle', () => {
    it('actualiza y retorna el ciclo modificado', async () => {
      const dto = makeFormDto({ code: '2024-1-edit' });
      const existing = makeCycle('7', '2024-1');
      const saved = { ...existing, code: dto.code };
      mockCycleRepo.findById.mockResolvedValue(existing);
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('99');
      mockCycleRepo.findByCode.mockResolvedValue(null);
      mockCycleRepo.findOverlapping.mockResolvedValue(null);
      mockCycleRepo.saveCycle.mockResolvedValue(saved);

      const result = await service.updateHistoricalCycle('7', dto);

      expect(result).toEqual(saved);
      expect(mockCycleRepo.saveCycle).toHaveBeenCalled();
    });

    it('lanza NotFoundException si el ciclo no existe', async () => {
      mockCycleRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateHistoricalCycle('999', makeFormDto()),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el ciclo es el vigente', async () => {
      mockCycleRepo.findById.mockResolvedValue(makeCycle('10'));
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');

      await expect(
        service.updateHistoricalCycle('10', makeFormDto()),
      ).rejects.toThrow('No se puede editar el ciclo activo desde esta sección.');
    });

    it('lanza BadRequestException si startDate >= endDate', async () => {
      mockCycleRepo.findById.mockResolvedValue(makeCycle('7'));
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('99');

      await expect(
        service.updateHistoricalCycle(
          '7',
          makeFormDto({ startDate: '2025-06-30', endDate: '2025-01-01' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza ConflictException si el código ya lo usa otro ciclo', async () => {
      mockCycleRepo.findById.mockResolvedValue(makeCycle('7', '2024-1'));
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('99');
      mockCycleRepo.findByCode.mockResolvedValue(makeCycle('8', '2025-1'));

      await expect(
        service.updateHistoricalCycle('7', makeFormDto({ code: '2025-1' })),
      ).rejects.toThrow('Ya existe un ciclo con ese código.');
    });

    it('lanza ConflictException con el código del ciclo solapado', async () => {
      mockCycleRepo.findById.mockResolvedValue(makeCycle('7', '2024-1'));
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('99');
      mockCycleRepo.findByCode.mockResolvedValue(null);
      mockCycleRepo.findOverlapping.mockResolvedValue(makeCycle('3', '2024-2'));

      await expect(
        service.updateHistoricalCycle('7', makeFormDto()),
      ).rejects.toThrow('Las fechas se solapan con el ciclo "2024-2".');
    });

    it('pasa el id como excludeId a findByCode y findOverlapping', async () => {
      const dto = makeFormDto();
      mockCycleRepo.findById.mockResolvedValue(makeCycle('7'));
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('99');
      mockCycleRepo.findByCode.mockResolvedValue(null);
      mockCycleRepo.findOverlapping.mockResolvedValue(null);
      mockCycleRepo.saveCycle.mockResolvedValue(makeCycle('7'));

      await service.updateHistoricalCycle('7', dto);

      expect(mockCycleRepo.findByCode).toHaveBeenCalledWith(dto.code, '7');
      expect(mockCycleRepo.findOverlapping).toHaveBeenCalledWith(
        dto.startDate,
        dto.endDate,
        '7',
      );
    });

    it('permite editar si no hay ciclo vigente configurado', async () => {
      const dto = makeFormDto();
      mockCycleRepo.findById.mockResolvedValue(makeCycle('7'));
      mockAuthSettingsService.getActiveCycleId.mockRejectedValue(
        new Error('Sin ciclo'),
      );
      mockCycleRepo.findByCode.mockResolvedValue(null);
      mockCycleRepo.findOverlapping.mockResolvedValue(null);
      mockCycleRepo.saveCycle.mockResolvedValue(makeCycle('7'));

      await expect(
        service.updateHistoricalCycle('7', dto),
      ).resolves.not.toThrow();
    });
  });
});
