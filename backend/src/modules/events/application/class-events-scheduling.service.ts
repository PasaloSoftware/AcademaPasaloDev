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

  async releaseCalendarLock(
    manager: EntityManager,
    lockKey: string,
  ): Promise<void> {
    await manager.query('SELECT RELEASE_LOCK(?) AS released', [lockKey]);
  }

  async findOverlap(
    courseCycleId: string,
    start: Date,
    end: Date,
    excludeEventId?: string,
    manager?: EntityManager,
  ): Promise<ClassEvent | null> {
    return await this.classEventRepository.findOverlap(
      courseCycleId,
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
  ): void {
    const startTime = getEpoch(startDatetime);
    const endTime = getEpoch(endDatetime);
    const evalStartTime = getEpoch(evaluationStart);
    const evalEndTime = getEpoch(evaluationEnd);

    if (endTime <= startTime) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    if (startTime < evalStartTime || startTime > evalEndTime) {
      throw new BadRequestException(
        'La fecha de inicio debe estar dentro del rango de la evaluación',
      );
    }

    if (endTime < evalStartTime || endTime > evalEndTime) {
      throw new BadRequestException(
        'La fecha de fin debe estar dentro del rango de la evaluación',
      );
    }
  }
}
