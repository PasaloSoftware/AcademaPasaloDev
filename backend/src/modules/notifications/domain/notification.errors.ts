export class NotificationTargetNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = NotificationTargetNotFoundError.name;
  }
}

export class NotificationIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = NotificationIntegrityError.name;
  }
}
