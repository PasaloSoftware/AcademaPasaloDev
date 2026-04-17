import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { AcademicCycleRepository } from '@modules/cycles/infrastructure/academic-cycle.repository';
import { AuthSettingsService } from '@modules/auth/application/auth-settings.service';
import { AcademicCycle } from '@modules/cycles/domain/academic-cycle.entity';

const mockCycleRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findHistoryPaginated: jest.fn(),
};

const mockAuthSettingsService = {
  getActiveCycleId: jest.fn(),
};

const makeCycle = (id: string, code = 'CYCLE_A'): AcademicCycle =>
  ({
    id,
    code,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as AcademicCycle;

describe('CyclesService', () => {
  let service: CyclesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CyclesService,
        { provide: AcademicCycleRepository, useValue: mockCycleRepo },
        { provide: AuthSettingsService, useValue: mockAuthSettingsService },
      ],
    }).compile();

    service = module.get<CyclesService>(CyclesService);
  });

  afterEach(() => jest.clearAllMocks());

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

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

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
      mockAuthSettingsService.getActiveCycleId.mockRejectedValue(new Error('Not found'));

      await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el ciclo referenciado por ACTIVE_CYCLE_ID no existe', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('999');
      mockCycleRepo.findById.mockResolvedValue(null);

      await expect(service.getActiveCycle()).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHistory', () => {
    it('excluye el ciclo vigente y pasa los args correctos al repo', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 0]);

      await service.getHistory(1);

      expect(mockCycleRepo.findHistoryPaginated).toHaveBeenCalledWith('10', 1, 4);
    });

    it('devuelve paginación correcta con items', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      const cycles = [makeCycle('1', 'CYCLE_2023_2'), makeCycle('2', 'CYCLE_2023_1')];
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

      const result = await service.getHistory(1);

      expect(result.totalPages).toBe(0);
    });

    it('calcula totalPages correctamente (ceil) para múltiples páginas', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 9]);

      const result = await service.getHistory(1);

      expect(result.totalPages).toBe(3); // ceil(9/4)
    });

    it('currentPage refleja la página solicitada', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 20]);

      const result = await service.getHistory(5);

      expect(result.currentPage).toBe(5);
    });

    it('pasa excludeId null si ACTIVE_CYCLE_ID no está configurado', async () => {
      mockAuthSettingsService.getActiveCycleId.mockRejectedValue(new Error('Sin ciclo'));
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[], 0]);

      await service.getHistory(1);

      expect(mockCycleRepo.findHistoryPaginated).toHaveBeenCalledWith(null, 1, 4);
    });

    it('items contienen los campos @Expose (id, code, startDate, endDate)', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      const cycle = makeCycle('1', 'CYCLE_2023_2');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[cycle], 1]);

      const result = await service.getHistory(1);

      const item = result.items[0];
      expect(item).toHaveProperty('id', '1');
      expect(item).toHaveProperty('code', 'CYCLE_2023_2');
      expect(item).toHaveProperty('startDate');
      expect(item).toHaveProperty('endDate');
    });

    it('items NO incluyen createdAt ni updatedAt (excluidos por @Expose)', async () => {
      mockAuthSettingsService.getActiveCycleId.mockResolvedValue('10');
      const cycle = makeCycle('1');
      mockCycleRepo.findHistoryPaginated.mockResolvedValue([[cycle], 1]);

      const result = await service.getHistory(1);

      const item = result.items[0] as Record<string, unknown>;
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('updatedAt');
    });
  });
});
