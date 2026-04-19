import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCoursePrimaryColorsFromProductionSeed20260419013000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE course c
      INNER JOIN (
        SELECT '1INF33' AS code, '#1E40A3' AS primary_color
        UNION ALL SELECT '1INF25', '#F2F4FA'
        UNION ALL SELECT '1INF27', '#F13072'
        UNION ALL SELECT '1IND51', '#FEF3F7'
        UNION ALL SELECT 'IND231', '#10B981'
        UNION ALL SELECT '1MAT08', '#F1FBF8'
        UNION ALL SELECT '1MAT09', '#3B82F6'
        UNION ALL SELECT '1MAT07', '#F3F8FF'
        UNION ALL SELECT '1MAT05', '#BE185D'
        UNION ALL SELECT '1MAT06', '#FDF6F9'
        UNION ALL SELECT '1MAT04', '#16E361'
        UNION ALL SELECT '1FIS01', '#F2FCF6'
        UNION ALL SELECT '1FIS02', '#60A5FA'
        UNION ALL SELECT '1FIS04', '#F3F8FF'
        UNION ALL SELECT '1FIS06', '#E692FF'
        UNION ALL SELECT '1INF01', '#FDF7FF'
        UNION ALL SELECT 'INF134', '#9333EA'
        UNION ALL SELECT '1QUI01', '#F9F3FE'
        UNION ALL SELECT '1ING02', '#D97706'
        UNION ALL SELECT '1CIV42', '#FDF7F0'
        UNION ALL SELECT '1MAT25', '#EC92C1'
        UNION ALL SELECT '1MAT26', '#FEF5F9'
        UNION ALL SELECT '1MAT27', '#4F46E5'
        UNION ALL SELECT 'MAT155', '#F5F4FE'
        UNION ALL SELECT 'LIN126', '#FBBF24'
        UNION ALL SELECT 'HUM121', '#FFFAEE'
        UNION ALL SELECT 'INT130', '#D32F2F'
        UNION ALL SELECT '1EST10', '#FDF3F3'
      ) seed
        ON seed.code = c.code
      SET c.primary_color = seed.primary_color
      WHERE c.primary_color IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE course c
      INNER JOIN (
        SELECT '1INF33' AS code, '#1E40A3' AS primary_color
        UNION ALL SELECT '1INF25', '#F2F4FA'
        UNION ALL SELECT '1INF27', '#F13072'
        UNION ALL SELECT '1IND51', '#FEF3F7'
        UNION ALL SELECT 'IND231', '#10B981'
        UNION ALL SELECT '1MAT08', '#F1FBF8'
        UNION ALL SELECT '1MAT09', '#3B82F6'
        UNION ALL SELECT '1MAT07', '#F3F8FF'
        UNION ALL SELECT '1MAT05', '#BE185D'
        UNION ALL SELECT '1MAT06', '#FDF6F9'
        UNION ALL SELECT '1MAT04', '#16E361'
        UNION ALL SELECT '1FIS01', '#F2FCF6'
        UNION ALL SELECT '1FIS02', '#60A5FA'
        UNION ALL SELECT '1FIS04', '#F3F8FF'
        UNION ALL SELECT '1FIS06', '#E692FF'
        UNION ALL SELECT '1INF01', '#FDF7FF'
        UNION ALL SELECT 'INF134', '#9333EA'
        UNION ALL SELECT '1QUI01', '#F9F3FE'
        UNION ALL SELECT '1ING02', '#D97706'
        UNION ALL SELECT '1CIV42', '#FDF7F0'
        UNION ALL SELECT '1MAT25', '#EC92C1'
        UNION ALL SELECT '1MAT26', '#FEF5F9'
        UNION ALL SELECT '1MAT27', '#4F46E5'
        UNION ALL SELECT 'MAT155', '#F5F4FE'
        UNION ALL SELECT 'LIN126', '#FBBF24'
        UNION ALL SELECT 'HUM121', '#FFFAEE'
        UNION ALL SELECT 'INT130', '#D32F2F'
        UNION ALL SELECT '1EST10', '#FDF3F3'
      ) seed
        ON seed.code = c.code
      SET c.primary_color = NULL
      WHERE c.primary_color = seed.primary_color
    `);
  }
}
