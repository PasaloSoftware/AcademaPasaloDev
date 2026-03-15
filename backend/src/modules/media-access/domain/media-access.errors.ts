export class MediaAccessReconciliationSafetyStopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaAccessReconciliationSafetyStopError';
  }
}
