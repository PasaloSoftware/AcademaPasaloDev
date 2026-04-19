import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepointCopiedDriveAssetsForClassEvent15Material120260419072000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE class_event
      SET
        recording_file_id = '1op4wr3TsnLeYSasJRnQrRRWxSC6eoG5u',
        recording_url = 'https://drive.google.com/file/d/1op4wr3TsnLeYSasJRnQrRRWxSC6eoG5u/preview',
        updated_at = NOW()
      WHERE id = '15'
    `);

    await queryRunner.query(`
      UPDATE file_resource
      SET
        storage_key = '1qB48MWeubFPvM207fWaLfpuCu0WlFPb1',
        storage_url = 'https://drive.google.com/uc?id=1qB48MWeubFPvM207fWaLfpuCu0WlFPb1&export=download',
        updated_at = NOW()
      WHERE id = '1'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE class_event
      SET
        recording_file_id = '17836owmev1JgZOkgriUeFyuknTtLk9bm',
        recording_url = 'https://drive.google.com/file/d/17836owmev1JgZOkgriUeFyuknTtLk9bm/preview',
        updated_at = NOW()
      WHERE id = '15'
    `);

    await queryRunner.query(`
      UPDATE file_resource
      SET
        storage_key = '1x3kGQfqEHKmJrYg0daXLXDwPEYs-6e-p',
        storage_url = 'https://drive.google.com/uc?id=1x3kGQfqEHKmJrYg0daXLXDwPEYs-6e-p&export=download',
        updated_at = NOW()
      WHERE id = '1'
    `);
  }
}

