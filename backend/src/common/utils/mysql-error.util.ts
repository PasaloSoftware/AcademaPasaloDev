import {
  DatabaseError,
  MySqlErrorCode,
} from '@common/interfaces/database-error.interface';

export function isMySqlErrorCode(v: unknown): v is MySqlErrorCode {
  return (
    typeof v === 'number' &&
    Object.values(MySqlErrorCode).includes(v as MySqlErrorCode)
  );
}

export function getErrnoFromDbError(
  dbError: unknown,
): MySqlErrorCode | undefined {
  if (!dbError || typeof dbError !== 'object') return undefined;
  const maybeErrno =
    (dbError as DatabaseError).errno ??
    (dbError as DatabaseError).driverError?.errno;
  return isMySqlErrorCode(maybeErrno) ? maybeErrno : undefined;
}

export function getMessageFromDbError(dbError: unknown): string {
  if (typeof dbError === 'string') {
    return dbError;
  }

  if (dbError instanceof Error) {
    return dbError.message;
  }

  if (!dbError || typeof dbError !== 'object') {
    return '';
  }

  const directMessage = (dbError as { message?: unknown }).message;
  if (typeof directMessage === 'string') {
    return directMessage;
  }

  const driverMessage = (dbError as { driverError?: { message?: unknown } })
    .driverError?.message;
  if (typeof driverMessage === 'string') {
    return driverMessage;
  }

  return '';
}
