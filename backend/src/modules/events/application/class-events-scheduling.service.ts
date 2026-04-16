import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ClassEventRepository } from '@modules/events/infrastructure/class-event.repository';
import { ClassEvent } from '@modules/events/domain/class-event.entity';
import { technicalSettings } from '@config/technical-settings';
import { getEpoch } from '@common/utils/date.util';

@Injectable()
export class ClassEventsSchedulingService {
  private readonly CALENDAR_LOCK_TIMEOUT_SECONDS =
    technicalSettings.cache.events.calendarLockTimeoutSeconds;

  constructor(private readonly classEventRepository: ClassEventRepository) {}

  private getCalendarLockKey(
    courseTypeId: string,
    academicCycleId: string,
  ): string {
    return `calendar-lock:ct:${courseTypeId}:ac:${academicCycleId}`;
  }

  private getProfessorLockKey(professorUserId: string): string {
    return `calendar-lock:prof:${professorUserId}`;
  }

  async acquireCalendarLock(
    manager: EntityManager,
    courseTypeId: string,
    academicCycleId: string,
  ): Promise<string> {
    const lockKey = this.getCalendarLockKey(courseTypeId, academicCycleId);
    const rawRows: unknown = await manager.query(
      'SELECT GET_LOCK(?, ?) AS acquired',
      [lockKey, this.CALENDAR_LOCK_TIMEOUT_SECONDS],
    );
    const rows = Array.isArray(rawRows)
      ? (rawRows as Array<{ acquired?: number | string | null }>)
      : [];
    const acquiredRaw = rows?.[0]?.acquired;
    const acquired = acquiredRaw === 1 || acquiredRaw === '1';
    if (!acquired) {
      throw new ConflictException(
        'Otro proceso está planificando horarios en este grupo académico. Inténtalo nuevamente.',
      );
    }
    return lockKey;
  }

  async acquireProfessorScheduleLock(
    manager: EntityManager,
    professorUserId: string,
  ): Promise<string> {
    const lockKey = this.getProfessorLockKey(professorUserId);
    const rawRows: unknown = await manager.query(
      'SELECT GET_LOCK(?, ?) AS acquired',
      [lockKey, this.CALENDAR_LOCK_TIMEOUT_SECONDS],
    );
    const rows = Array.isArray(rawRows)
      ? (rawRows as Array<{ acquired?: number | string | null }>)
      : [];
    const acquiredRaw = rows?.[0]?.acquired;
    const acquired = acquiredRaw === 1 || acquiredRaw === '1';
    if (!acquired) {
      throw new ConflictException(
        'Otro proceso está planificando horarios para este profesor. Inténtalo nuevamente.',
      );
    }
    return lockKey;
  }

  async releaseCalendarLock(
    manager: EntityManager,
    lockKey: string,
  ): Promise<void> {
    await manager.query('SELECT RELEASE_LOCK(?) AS released', [lockKey]);
  }

  async findOverlap(
    evaluationId: string,
    start: Date,
    end: Date,
    excludeEventId?: string,
    manager?: EntityManager,
  ): Promise<ClassEvent | null> {
    return await this.classEventRepository.findOverlap(
      evaluationId,
      start,
      end,
      excludeEventId,
      manager,
    );
  }

  async findProfessorOverlap(
    professorUserId: string,
    start: Date,
    end: Date,
    excludeEventId?: string,
    manager?: EntityManager,
  ): Promise<ClassEvent | null> {
    return await this.classEventRepository.findProfessorOverlap(
      professorUserId,
      start,
      end,
      excludeEventId,
      manager,
    );
  }

  validateEventDates(
    startDatetime: Date,
    endDatetime: Date,
    evaluationStart: Date,
    evaluationEnd: Date,
    cycleStart?: Date,
    cycleEnd?: Date,
  ): void {
    const startTime = getEpoch(startDatetime);
    const endTime = getEpoch(endDatetime);
    const evalStartTime = getEpoch(evaluationStart);
    const evalEndTime = getEpoch(evaluationEnd);
    const cycleStartTime =
      cycleStart instanceof Date ? getEpoch(cycleStart) : null;
    const cycleEndTime = cycleEnd instanceof Date ? getEpoch(cycleEnd) : null;

    const rangeStartTime =
      cycleStartTime !== null ? cycleStartTime : evalStartTime;
    const rangeEndTime = cycleEndTime !== null ? cycleEndTime : evalEndTime;
    const rangeLabel =
      cycleStartTime !== null && cycleEndTime !== null
        ? 'ciclo academico'
        : 'evaluacion';

    if (endTime <= startTime) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    if (startTime < rangeStartTime || startTime > rangeEndTime) {
      throw new BadRequestException(
        `La fecha de inicio debe estar dentro del rango del ${rangeLabel}`,
      );
    }

    if (endTime < rangeStartTime || endTime > rangeEndTime) {
      throw new BadRequestException(
        `La fecha de fin debe estar dentro del rango del ${rangeLabel}`,
      );
    }
  }
}
