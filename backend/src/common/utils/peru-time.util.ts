import { BadRequestException } from '@nestjs/common';
import { technicalSettings } from '@config/technical-settings';
import { ensureDate } from './date.util';

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_WITHOUT_TIMEZONE_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.(\d{1,3}))?)?$/;
const EXPLICIT_TIMEZONE_REGEX = /(Z|[+-]\d{2}:\d{2})$/i;

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const BUSINESS_UTC_OFFSET_MS =
  technicalSettings.datetime.businessUtcOffsetMinutes * 60 * 1000;

const invalidIsoMessage = (fieldName: string): string =>
  `El campo ${fieldName} debe ser una fecha ISO-8601 valida`;

const invalidDateTimeMessage = (fieldName: string): string =>
  `El campo ${fieldName} debe incluir fecha y hora en formato ISO-8601`;

const assertNormalizedParts = (
  date: Date,
  parts: LocalDateTimeParts,
  fieldName: string,
): void => {
  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day ||
    date.getUTCHours() !== parts.hour ||
    date.getUTCMinutes() !== parts.minute ||
    date.getUTCSeconds() !== parts.second ||
    date.getUTCMilliseconds() !== parts.millisecond
  ) {
    throw new BadRequestException(invalidIsoMessage(fieldName));
  }
};

const assertNormalizedDateOnlyParts = (
  year: number,
  month: number,
  day: number,
  fieldName: string,
): void => {
  const probe = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  assertNormalizedParts(
    probe,
    {
      year,
      month,
      day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    fieldName,
  );
};

const parseUtcInstant = (input: string, fieldName: string): Date => {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(invalidIsoMessage(fieldName));
  }
  return parsed;
};

const parseMilliseconds = (value?: string): number => {
  if (!value) {
    return 0;
  }

  return Number(value.padEnd(3, '0').slice(0, 3));
};

const parsePeruLocalDatetime = (
  input: string,
  fieldName: string,
): LocalDateTimeParts => {
  const match = DATETIME_WITHOUT_TIMEZONE_REGEX.exec(input);
  if (!match) {
    throw new BadRequestException(invalidDateTimeMessage(fieldName));
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? '0'),
    millisecond: parseMilliseconds(match[8]),
  };
};

const buildUtcDateFromPeruLocal = (
  { year, month, day, hour, minute, second, millisecond }: LocalDateTimeParts,
  fieldName: string,
): Date => {
  const probe = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
  );
  assertNormalizedParts(
    probe,
    {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
    },
    fieldName,
  );

  return new Date(probe.getTime() - BUSINESS_UTC_OFFSET_MS);
};

const parsePeruLocalDate = (
  input: string,
  fieldName: string,
): { year: number; month: number; day: number } => {
  const match = DATE_ONLY_REGEX.exec(input);
  if (!match) {
    throw new BadRequestException(invalidIsoMessage(fieldName));
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const parseDateOnlyBoundaryToUtc = (
  input: string,
  fieldName: string,
  extraDays: number,
): Date => {
  const { year, month, day } = parsePeruLocalDate(input, fieldName);
  assertNormalizedDateOnlyParts(year, month, day, fieldName);

  return new Date(
    Date.UTC(year, month - 1, day + extraDays, 0, 0, 0, 0) -
      BUSINESS_UTC_OFFSET_MS,
  );
};

export const parseBusinessDatetimeToUtc = (
  input: string,
  fieldName: string,
): Date => {
  if (!input || typeof input !== 'string') {
    throw new BadRequestException(invalidDateTimeMessage(fieldName));
  }

  if (DATE_ONLY_REGEX.test(input)) {
    throw new BadRequestException(invalidDateTimeMessage(fieldName));
  }

  if (EXPLICIT_TIMEZONE_REGEX.test(input)) {
    return parseUtcInstant(input, fieldName);
  }

  return buildUtcDateFromPeruLocal(
    parsePeruLocalDatetime(input, fieldName),
    fieldName,
  );
};

export const parseScheduleRangeStartToUtc = (
  input: string,
  fieldName: string,
): Date => {
  if (!input || typeof input !== 'string') {
    throw new BadRequestException(invalidIsoMessage(fieldName));
  }

  if (DATE_ONLY_REGEX.test(input)) {
    return parseDateOnlyBoundaryToUtc(input, fieldName, 0);
  }

  return parseBusinessDatetimeToUtc(input, fieldName);
};

export const parseScheduleRangeEndExclusiveToUtc = (
  input: string,
  fieldName: string,
): Date => {
  if (!input || typeof input !== 'string') {
    throw new BadRequestException(invalidIsoMessage(fieldName));
  }

  if (DATE_ONLY_REGEX.test(input)) {
    return parseDateOnlyBoundaryToUtc(input, fieldName, 1);
  }

  return parseBusinessDatetimeToUtc(input, fieldName);
};

export const assertValidDateRange = (
  start: Date,
  end: Date,
  startFieldName: string,
  endFieldName: string,
): void => {
  if (end.getTime() <= start.getTime()) {
    throw new BadRequestException(
      `El campo ${endFieldName} debe ser mayor que ${startFieldName}`,
    );
  }
};

export const toBusinessDayStartUtc = (date: Date | string | number): Date => {
  const parsed = ensureDate(date);
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
      0,
      0,
      0,
      0,
    ) - BUSINESS_UTC_OFFSET_MS,
  );
};

export const toBusinessDayEndUtc = (date: Date | string | number): Date => {
  const parsed = ensureDate(date);
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ) -
      BUSINESS_UTC_OFFSET_MS -
      1,
  );
};

export const parseBusinessWindowStartToUtc = (
  input: string,
  fieldName: string,
): Date => {
  if (DATE_ONLY_REGEX.test(input)) {
    return parseDateOnlyBoundaryToUtc(input, fieldName, 0);
  }

  return parseBusinessDatetimeToUtc(input, fieldName);
};

export const parseBusinessWindowEndToUtc = (
  input: string,
  fieldName: string,
): Date => {
  if (DATE_ONLY_REGEX.test(input)) {
    return new Date(
      parseDateOnlyBoundaryToUtc(input, fieldName, 1).getTime() - 1,
    );
  }

  return parseBusinessDatetimeToUtc(input, fieldName);
};

export const parseVisibilityRangeToUtc = (
  visibleFrom?: string,
  visibleUntil?: string,
): { visibleFrom: Date | null; visibleUntil: Date | null } => {
  const startDate = visibleFrom
    ? parseBusinessWindowStartToUtc(visibleFrom, 'visibleFrom')
    : null;
  const endDate = visibleUntil
    ? parseBusinessWindowEndToUtc(visibleUntil, 'visibleUntil')
    : null;

  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    throw new BadRequestException(
      'Rango de visibilidad invalido: visibleFrom no puede ser mayor que visibleUntil',
    );
  }

  return {
    visibleFrom: startDate,
    visibleUntil: endDate,
  };
};
