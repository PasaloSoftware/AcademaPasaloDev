import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTypeDeletionRequestCreated20260418055116 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO notification_type (code, name)
      SELECT 'DELETION_REQUEST_CREATED', 'Nueva Solicitud de Eliminacion'
      WHERE NOT EXISTS (
        SELECT 1
        FROM notification_type
        WHERE code = 'DELETION_REQUEST_CREATED'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM notification_type
      WHERE code = 'DELETION_REQUEST_CREATED'
    `);
  }
}
