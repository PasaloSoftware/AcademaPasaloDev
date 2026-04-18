import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineExistingProductionSchema20260418000000 implements MigrationInterface {
  public async up(_: QueryRunner): Promise<void> {
    // Baseline migration:
    // - Does not alter schema/data.
    // - Marks the current production schema state as migration starting point.
  }

  public async down(_: QueryRunner): Promise<void> {
    // No-op by design for baseline.
  }
}
