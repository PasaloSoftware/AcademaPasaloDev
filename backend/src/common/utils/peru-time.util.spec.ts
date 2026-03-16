import { BadRequestException } from '@nestjs/common';
import {
  assertValidDateRange,
  parseBusinessDatetimeToUtc,
  parseBusinessWindowEndToUtc,
  parseBusinessWindowStartToUtc,
  parseVisibilityRangeToUtc,
  parseScheduleRangeEndExclusiveToUtc,
  parseScheduleRangeStartToUtc,
  toBusinessDayEndUtc,
  toBusinessDayStartUtc,
} from './peru-time.util';

describe('peru-time.util', () => {
  describe('parseBusinessDatetimeToUtc', () => {
    it('interpreta ISO sin zona como hora America/Lima', () => {
      expect(
        parseBusinessDatetimeToUtc(
          '2026-03-15T09:00:00',
          'startDatetime',
        ).toISOString(),
      ).toBe('2026-03-15T14:00:00.000Z');
    });

    it('respeta ISO con offset explicito', () => {
      expect(
        parseBusinessDatetimeToUtc(
          '2026-03-15T09:00:00-05:00',
          'startDatetime',
        ).toISOString(),
      ).toBe('2026-03-15T14:00:00.000Z');
    });

    it('rechaza fecha sin hora para escritura', () => {
      expect(() =>
        parseBusinessDatetimeToUtc('2026-03-15', 'startDatetime'),
      ).toThrow(BadRequestException);
    });
  });

  describe('parseScheduleRangeStartToUtc', () => {
    it('convierte fecha-only al inicio del dia Lima en UTC', () => {
      expect(
        parseScheduleRangeStartToUtc('2026-03-15', 'start').toISOString(),
      ).toBe('2026-03-15T05:00:00.000Z');
    });

    it('rechaza fechas calendario invalidas', () => {
      expect(() => parseScheduleRangeStartToUtc('2026-02-31', 'start')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('parseScheduleRangeEndExclusiveToUtc', () => {
    it('convierte fecha-only al limite exclusivo del dia siguiente en UTC', () => {
      expect(
        parseScheduleRangeEndExclusiveToUtc('2026-03-21', 'end').toISOString(),
      ).toBe('2026-03-22T05:00:00.000Z');
    });
  });

  describe('assertValidDateRange', () => {
    it('rechaza rangos vacios o invertidos', () => {
      expect(() =>
        assertValidDateRange(
          new Date('2026-03-15T05:00:00.000Z'),
          new Date('2026-03-15T05:00:00.000Z'),
          'start',
          'end',
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('business day boundaries', () => {
    it('convierte DATE almacenada a inicio de dia Lima en UTC', () => {
      expect(
        toBusinessDayStartUtc(
          new Date('2026-03-15T00:00:00.000Z'),
        ).toISOString(),
      ).toBe('2026-03-15T05:00:00.000Z');
    });

    it('convierte DATE almacenada a fin de dia Lima en UTC', () => {
      expect(
        toBusinessDayEndUtc(new Date('2026-03-15T00:00:00.000Z')).toISOString(),
      ).toBe('2026-03-16T04:59:59.999Z');
    });
  });

  describe('parseBusinessWindow boundaries', () => {
    it('usa inicio de dia cuando el input es date-only', () => {
      expect(
        parseBusinessWindowStartToUtc('2026-03-15', 'startDate').toISOString(),
      ).toBe('2026-03-15T05:00:00.000Z');
    });

    it('usa fin inclusivo de dia cuando el input es date-only', () => {
      expect(
        parseBusinessWindowEndToUtc('2026-03-15', 'endDate').toISOString(),
      ).toBe('2026-03-16T04:59:59.999Z');
    });
  });

  describe('parseVisibilityRangeToUtc', () => {
    it('convierte rango date-only a boundaries de Peru', () => {
      expect(parseVisibilityRangeToUtc('2026-03-15', '2026-03-15')).toEqual({
        visibleFrom: new Date('2026-03-15T05:00:00.000Z'),
        visibleUntil: new Date('2026-03-16T04:59:59.999Z'),
      });
    });
  });
});
