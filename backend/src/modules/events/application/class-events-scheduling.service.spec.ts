import { BadRequestException } from '@nestjs/common';
import { ClassEventsSchedulingService } from '@modules/events/application/class-events-scheduling.service';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';

describe('ClassEventsSchedulingService', () => {
  let service: ClassEventsSchedulingService;

  beforeEach(() => {
    service = new ClassEventsSchedulingService({
      findOverlap: jest.fn(),
    } as unknown as ClassEventRepository);
  });

  it('rechaza cuando endDatetime no es posterior a startDatetime', () => {
    const start = new Date('2026-04-10T15:00:00.000Z');
    const end = new Date('2026-04-10T15:00:00.000Z');

    expect(() =>
      service.validateEventDates(
        start,
        end,
        new Date('2026-04-01T00:00:00.000Z'),
        new Date('2026-04-30T23:59:59.000Z'),
        new Date('2026-04-01T00:00:00.000Z'),
        new Date('2026-04-30T23:59:59.000Z'),
      ),
    ).toThrow(BadRequestException);
  });

  it('valida contra ciclo cuando se proveen limites de ciclo', () => {
    expect(() =>
      service.validateEventDates(
        new Date('2026-05-01T12:00:00.000Z'),
        new Date('2026-05-01T13:00:00.000Z'),
        new Date('2026-05-01T00:00:00.000Z'),
        new Date('2026-05-31T23:59:59.000Z'),
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-30T23:59:59.000Z'),
      ),
    ).toThrow('ciclo academico');
  });

  it('usa limites de evaluacion como fallback si no hay limites de ciclo', () => {
    expect(() =>
      service.validateEventDates(
        new Date('2026-06-10T12:00:00.000Z'),
        new Date('2026-06-10T13:00:00.000Z'),
        new Date('2026-05-01T00:00:00.000Z'),
        new Date('2026-05-31T23:59:59.000Z'),
      ),
    ).toThrow('evaluacion');
  });

  it('permite fechas pasadas si estan dentro del ciclo', () => {
    const nowMinusFiveMinutes = new Date(Date.now() - 5 * 60 * 1000);
    const nowMinusTwoMinutes = new Date(Date.now() - 2 * 60 * 1000);
    const rangeStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rangeEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);

    expect(() =>
      service.validateEventDates(
        nowMinusFiveMinutes,
        nowMinusTwoMinutes,
        rangeStart,
        rangeEnd,
        rangeStart,
        rangeEnd,
      ),
    ).not.toThrow();
  });
});

