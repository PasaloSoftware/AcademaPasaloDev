-- Evaluaciones para migracion real (academy-real)
-- Fuente base: backend/cursos.txt + backend/cursos_evaluaciones.txt
-- Regla: se respetan rangos existentes; faltantes estimados dentro del ciclo activo (2026-1).

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET collation_connection = 'utf8mb4_unicode_ci';

SET @active_cycle_id = (
  SELECT CAST(ss.setting_value AS UNSIGNED)
  FROM system_setting ss
  WHERE ss.setting_key = 'ACTIVE_CYCLE_ID'
  LIMIT 1
);

-- Tipos de evaluacion habilitados por curso-ciclo
INSERT INTO course_cycle_allowed_evaluation_type (
  course_cycle_id,
  evaluation_type_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  cc.id,
  et.id,
  TRUE,
  NOW(),
  NULL
FROM (
  SELECT '1INF33' AS course_code, 'LAB' AS evaluation_type_code
  UNION ALL SELECT '1INF33' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code
  UNION ALL SELECT '1INF25' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1INF27' AS course_code, 'LAB' AS evaluation_type_code
  UNION ALL SELECT '1INF27' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code
  UNION ALL SELECT '1IND51' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT 'IND231' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT 'IND231' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT08' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT08' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT09' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT09' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT07' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT07' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT05' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT05' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT06' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT06' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT04' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT04' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1FIS01' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1FIS01' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1FIS02' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1FIS02' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1FIS04' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1FIS04' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1FIS06' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1FIS06' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code
  UNION ALL SELECT '1INF01' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT 'INF134' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT 'INF134' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1QUI01' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1QUI01' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1ING02' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1ING02' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1CIV42' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT25' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT25' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT26' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT26' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1MAT27' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1MAT27' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT 'MAT155' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT 'MAT155' AS course_code, 'EX' AS evaluation_type_code
  UNION ALL SELECT '1EST10' AS course_code, 'PC' AS evaluation_type_code
  UNION ALL SELECT '1EST10' AS course_code, 'EX' AS evaluation_type_code
) map
INNER JOIN course c ON c.code = (map.course_code COLLATE utf8mb4_unicode_ci)
INNER JOIN course_cycle cc ON cc.course_id = c.id AND cc.academic_cycle_id = @active_cycle_id
INNER JOIN evaluation_type et ON et.code = (map.evaluation_type_code COLLATE utf8mb4_unicode_ci)
WHERE @active_cycle_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM course_cycle_allowed_evaluation_type ccaet
    WHERE ccaet.course_cycle_id = cc.id
      AND ccaet.evaluation_type_id = et.id
  );

-- Insercion de evaluaciones
INSERT INTO evaluation (course_cycle_id, evaluation_type_id, number, start_date, end_date)
SELECT
  cc.id,
  et.id,
  map.eval_number,
  CASE
    WHEN map.eval_number = 1 AND UPPER(TRIM(map.evaluation_type_code)) <> 'EX'
      THEN '2026-04-01 00:00:00'
    ELSE map.start_date
  END,
  map.end_date
FROM (
  SELECT '1CIV42' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1CIV42' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1EST10' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 19:00:00' AS start_date, '2026-04-13 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1EST10' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-23 19:00:00' AS start_date, '2026-04-27 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1EST10' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-07 19:00:00' AS start_date, '2026-05-11 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1EST10' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-21 19:00:00' AS start_date, '2026-05-25 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1EST10' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1EST10' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS01' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-01 19:00:00' AS start_date, '2026-04-05 14:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1FIS01' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-15 19:00:00' AS start_date, '2026-05-30 17:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1FIS01' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-30 17:00:01' AS start_date, '2026-06-03 12:00:01' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1FIS01' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-06-03 12:00:02' AS start_date, '2026-06-07 07:00:02' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1FIS01' AS course_code, 'PC' AS evaluation_type_code, 5 AS eval_number, '2026-06-10 19:00:00' AS start_date, '2026-06-14 14:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1FIS01' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-13 19:00:00' AS start_date, '2026-05-18 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1FIS01' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-05-18 21:00:01' AS start_date, '2026-07-09 03:00:01' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1FIS02' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 19:00:00' AS start_date, '2026-04-13 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS02' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-23 19:00:00' AS start_date, '2026-04-27 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS02' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-07 19:00:00' AS start_date, '2026-05-11 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS02' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-21 19:00:00' AS start_date, '2026-05-25 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS02' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS02' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS04' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 19:00:00' AS start_date, '2026-04-13 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS04' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-23 19:00:00' AS start_date, '2026-04-27 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS04' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-07 19:00:00' AS start_date, '2026-05-11 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS04' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-21 19:00:00' AS start_date, '2026-05-25 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS04' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS04' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS06' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 19:00:00' AS start_date, '2026-04-13 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS06' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-23 19:00:00' AS start_date, '2026-04-27 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS06' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-07 19:00:00' AS start_date, '2026-05-11 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS06' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-21 19:00:00' AS start_date, '2026-05-25 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS06' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1FIS06' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 1 AS eval_number, '2026-04-01 00:00:00' AS start_date, '2026-04-02 14:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 2 AS eval_number, '2026-04-02 14:00:01' AS start_date, '2026-04-04 04:00:01' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 3 AS eval_number, '2026-04-05 10:00:00' AS start_date, '2026-04-07 00:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 4 AS eval_number, '2026-04-12 10:00:00' AS start_date, '2026-04-14 00:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 5 AS eval_number, '2026-04-19 10:00:00' AS start_date, '2026-04-21 00:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 6 AS eval_number, '2026-04-26 10:00:00' AS start_date, '2026-04-28 00:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 7 AS eval_number, '2026-05-03 10:00:00' AS start_date, '2026-05-05 00:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 8 AS eval_number, '2026-05-10 10:00:00' AS start_date, '2026-05-12 00:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 9 AS eval_number, '2026-05-17 10:00:00' AS start_date, '2026-05-19 00:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 10 AS eval_number, '2026-05-24 10:00:00' AS start_date, '2026-05-26 00:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 11 AS eval_number, '2026-05-31 10:00:00' AS start_date, '2026-06-02 00:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 12 AS eval_number, '2026-06-07 10:00:00' AS start_date, '2026-06-09 00:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 13 AS eval_number, '2026-06-14 10:00:00' AS start_date, '2026-06-16 00:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'LAB' AS evaluation_type_code, 14 AS eval_number, '2026-06-21 10:00:00' AS start_date, '2026-06-23 00:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1IND51' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 1 AS eval_number, '2026-04-05 13:00:00' AS start_date, '2026-04-06 22:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 2 AS eval_number, '2026-04-12 13:00:00' AS start_date, '2026-04-13 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 3 AS eval_number, '2026-04-19 13:00:00' AS start_date, '2026-04-20 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 4 AS eval_number, '2026-04-26 13:00:00' AS start_date, '2026-04-27 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 5 AS eval_number, '2026-05-03 13:00:00' AS start_date, '2026-05-04 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 6 AS eval_number, '2026-05-24 13:00:00' AS start_date, '2026-05-25 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 7 AS eval_number, '2026-05-31 13:00:00' AS start_date, '2026-06-01 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 8 AS eval_number, '2026-06-07 13:00:00' AS start_date, '2026-06-08 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 9 AS eval_number, '2026-06-14 13:00:00' AS start_date, '2026-06-15 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'LAB' AS evaluation_type_code, 10 AS eval_number, '2026-06-21 13:00:00' AS start_date, '2026-06-22 22:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-11 20:00:00' AS start_date, '2026-05-15 20:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF01' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-29 20:00:00' AS start_date, '2026-07-03 20:30:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 1 AS eval_number, '2026-04-08 17:00:00' AS start_date, '2026-04-10 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 2 AS eval_number, '2026-04-15 17:00:00' AS start_date, '2026-04-17 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 3 AS eval_number, '2026-04-22 17:00:00' AS start_date, '2026-04-24 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 4 AS eval_number, '2026-04-29 17:00:00' AS start_date, '2026-05-01 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 5 AS eval_number, '2026-05-06 17:00:00' AS start_date, '2026-05-08 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 6 AS eval_number, '2026-05-13 17:00:00' AS start_date, '2026-05-15 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 7 AS eval_number, '2026-05-20 17:00:00' AS start_date, '2026-05-22 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 8 AS eval_number, '2026-05-27 17:00:00' AS start_date, '2026-05-29 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 9 AS eval_number, '2026-06-03 17:00:00' AS start_date, '2026-06-05 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'LAB' AS evaluation_type_code, 10 AS eval_number, '2026-06-10 17:00:00' AS start_date, '2026-06-12 07:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF25' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF27' AS course_code, 'LAB' AS evaluation_type_code, 1 AS eval_number, '2026-04-07 20:00:00' AS start_date, '2026-04-17 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF27' AS course_code, 'LAB' AS evaluation_type_code, 2 AS eval_number, '2026-04-21 20:00:00' AS start_date, '2026-04-30 22:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF27' AS course_code, 'LAB' AS evaluation_type_code, 3 AS eval_number, '2026-05-05 20:00:00' AS start_date, '2026-05-15 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF27' AS course_code, 'LAB' AS evaluation_type_code, 4 AS eval_number, '2026-05-19 20:00:00' AS start_date, '2026-05-29 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF27' AS course_code, 'LAB' AS evaluation_type_code, 5 AS eval_number, '2026-06-02 20:00:00' AS start_date, '2026-06-12 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF27' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-17 16:00:00' AS start_date, '2026-05-22 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF27' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-07-05 16:00:00' AS start_date, '2026-07-10 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF33' AS course_code, 'LAB' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 14:00:00' AS start_date, '2026-04-12 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1INF33' AS course_code, 'LAB' AS evaluation_type_code, 2 AS eval_number, '2026-04-16 14:00:00' AS start_date, '2026-04-19 12:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF33' AS course_code, 'LAB' AS evaluation_type_code, 3 AS eval_number, '2026-04-23 14:00:00' AS start_date, '2026-04-26 12:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF33' AS course_code, 'LAB' AS evaluation_type_code, 4 AS eval_number, '2026-04-30 14:00:00' AS start_date, '2026-05-03 12:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF33' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1INF33' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1ING02' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 19:00:00' AS start_date, '2026-04-13 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1ING02' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-23 19:00:00' AS start_date, '2026-04-27 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1ING02' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-07 19:00:00' AS start_date, '2026-05-11 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1ING02' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-21 19:00:00' AS start_date, '2026-05-25 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1ING02' AS course_code, 'PC' AS evaluation_type_code, 5 AS eval_number, '2026-06-04 19:00:00' AS start_date, '2026-06-08 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1ING02' AS course_code, 'PC' AS evaluation_type_code, 6 AS eval_number, '2026-06-18 19:00:00' AS start_date, '2026-06-22 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1ING02' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1ING02' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT04' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-05 10:00:00' AS start_date, '2026-04-12 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT04' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-13 19:00:00' AS start_date, '2026-04-26 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT04' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-31 10:00:00' AS start_date, '2026-06-07 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT04' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-06-14 10:00:00' AS start_date, '2026-06-21 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT04' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-10 10:00:00' AS start_date, '2026-05-17 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT04' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-28 10:00:00' AS start_date, '2026-07-05 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT05' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-20 18:00:00' AS start_date, '2026-04-22 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT05' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-05-04 18:00:00' AS start_date, '2026-05-06 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT05' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-06-01 18:00:00' AS start_date, '2026-06-03 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT05' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-06-15 18:00:00' AS start_date, '2026-06-17 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT05' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-15 18:00:00' AS start_date, '2026-05-20 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT05' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-07-03 18:00:00' AS start_date, '2026-07-08 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT06' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-06 20:00:00' AS start_date, '2026-04-13 22:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT06' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-20 20:00:00' AS start_date, '2026-04-27 22:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT06' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-04 20:00:00' AS start_date, '2026-05-11 22:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT06' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-18 20:00:00' AS start_date, '2026-05-25 22:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT06' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT06' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT07' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-05 16:00:00' AS start_date, '2026-04-12 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT07' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-21 17:00:00' AS start_date, '2026-04-21 19:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT07' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-07 18:00:00' AS start_date, '2026-05-11 09:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT07' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-23 19:00:00' AS start_date, '2026-05-27 10:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT07' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 20:00:00' AS start_date, '2026-05-17 19:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT07' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 20:00:00' AS start_date, '2026-07-05 19:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT08' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-15 18:00:00' AS start_date, '2026-04-17 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT08' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-29 18:00:00' AS start_date, '2026-05-01 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT08' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-06-10 18:00:00' AS start_date, '2026-06-12 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT08' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-06-24 18:00:00' AS start_date, '2026-06-26 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT08' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-17 17:00:00' AS start_date, '2026-05-20 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT08' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-07-05 17:00:00' AS start_date, '2026-07-08 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT09' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-12 16:00:00' AS start_date, '2026-04-17 23:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT09' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-25 19:00:00' AS start_date, '2026-04-29 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT09' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-06-06 19:00:00' AS start_date, '2026-06-12 23:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT09' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-06-20 19:00:00' AS start_date, '2026-06-26 23:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT09' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-11 20:00:00' AS start_date, '2026-05-20 22:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT09' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-29 19:00:00' AS start_date, '2026-07-12 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT25' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-18 20:00:00' AS start_date, '2026-04-22 14:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT25' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-26 18:00:00' AS start_date, '2026-05-03 20:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT25' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-04 16:00:00' AS start_date, '2026-05-10 02:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT25' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-12 14:00:00' AS start_date, '2026-05-18 00:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT25' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT25' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT26' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 19:00:00' AS start_date, '2026-04-16 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT26' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-30 19:00:00' AS start_date, '2026-05-07 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT26' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-21 19:00:00' AS start_date, '2026-05-28 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT26' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-06-11 19:00:00' AS start_date, '2026-06-18 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT26' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:00:00' AS start_date, '2026-05-22 16:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT26' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:00:00' AS start_date, '2026-07-10 16:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT27' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-14 19:00:00' AS start_date, '2026-04-16 21:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT '1MAT27' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-28 19:00:00' AS start_date, '2026-04-30 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT27' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-12 19:00:00' AS start_date, '2026-05-14 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT27' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-26 19:00:00' AS start_date, '2026-05-28 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT27' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1MAT27' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1QUI01' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 19:00:00' AS start_date, '2026-04-13 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1QUI01' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-23 19:00:00' AS start_date, '2026-04-27 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1QUI01' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-07 19:00:00' AS start_date, '2026-05-11 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1QUI01' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-21 19:00:00' AS start_date, '2026-05-25 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1QUI01' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT '1QUI01' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'IND231' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-05 13:00:00' AS start_date, '2026-04-09 23:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT 'IND231' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-19 13:00:00' AS start_date, '2026-04-23 23:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'IND231' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-03 13:00:00' AS start_date, '2026-05-07 23:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'IND231' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-17 13:00:00' AS start_date, '2026-05-21 23:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'IND231' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'IND231' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'INF134' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-01 00:00:00' AS start_date, '2026-04-05 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT 'INF134' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-16 20:00:00' AS start_date, '2026-04-19 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT 'INF134' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-02 16:00:00' AS start_date, '2026-05-06 06:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'INF134' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-18 12:00:00' AS start_date, '2026-05-22 02:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'INF134' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:00:00' AS start_date, '2026-05-17 12:00:00' AS end_date, 0 AS is_estimated
  UNION ALL SELECT 'INF134' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:00:00' AS start_date, '2026-07-05 12:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'MAT155' AS course_code, 'PC' AS evaluation_type_code, 1 AS eval_number, '2026-04-09 19:00:00' AS start_date, '2026-04-13 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'MAT155' AS course_code, 'PC' AS evaluation_type_code, 2 AS eval_number, '2026-04-23 19:00:00' AS start_date, '2026-04-27 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'MAT155' AS course_code, 'PC' AS evaluation_type_code, 3 AS eval_number, '2026-05-07 19:00:00' AS start_date, '2026-05-11 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'MAT155' AS course_code, 'PC' AS evaluation_type_code, 4 AS eval_number, '2026-05-21 19:00:00' AS start_date, '2026-05-25 21:00:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'MAT155' AS course_code, 'EX' AS evaluation_type_code, 1 AS eval_number, '2026-05-12 19:30:00' AS start_date, '2026-05-17 21:30:00' AS end_date, 1 AS is_estimated
  UNION ALL SELECT 'MAT155' AS course_code, 'EX' AS evaluation_type_code, 2 AS eval_number, '2026-06-30 19:30:00' AS start_date, '2026-07-05 21:30:00' AS end_date, 1 AS is_estimated
) map
INNER JOIN course c ON c.code = (map.course_code COLLATE utf8mb4_unicode_ci)
INNER JOIN course_cycle cc ON cc.course_id = c.id AND cc.academic_cycle_id = @active_cycle_id
INNER JOIN evaluation_type et ON et.code = (map.evaluation_type_code COLLATE utf8mb4_unicode_ci)
WHERE @active_cycle_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM evaluation e
    WHERE e.course_cycle_id = cc.id
      AND e.evaluation_type_id = et.id
      AND e.number = map.eval_number
  );

-- Sesiones de clase por evaluacion (PC/LAB=3, EX=4)
-- Regla de horario: inicio entre 08:00 y 22:00 (hora Peru), duracion fija de 2 horas.
SET @rec_not_available = (
  SELECT id
  FROM class_event_recording_status
  WHERE code = 'NOT_AVAILABLE'
  LIMIT 1
);

INSERT INTO class_event (
  evaluation_id,
  session_number,
  title,
  topic,
  start_datetime,
  end_datetime,
  live_meeting_url,
  recording_status_id,
  created_by,
  created_at
)
SELECT
  ss.evaluation_id,
  ss.session_number,
  ss.title,
  ss.topic,
  DATE_ADD(
    DATE_ADD(
      DATE_ADD(
        DATE(ac.start_date),
        INTERVAL FLOOR(ss.slot_index / 7) DAY
      ),
      INTERVAL (8 + (MOD(ss.slot_index, 7) * 2) + 5) HOUR
    ),
    INTERVAL 0 MINUTE
  ) AS start_datetime,
  DATE_ADD(
    DATE_ADD(
      DATE_ADD(
        DATE(ac.start_date),
        INTERVAL FLOOR(ss.slot_index / 7) DAY
      ),
      INTERVAL (10 + (MOD(ss.slot_index, 7) * 2) + 5) HOUR
    ),
    INTERVAL 0 MINUTE
  ) AS end_datetime,
  'https://meet.google.com/academy-real' AS live_meeting_url,
  @rec_not_available AS recording_status_id,
  ss.created_by,
  NOW() AS created_at
FROM (
  SELECT
    src.*,
    (@slot_index := @slot_index + 1) AS slot_index
  FROM (
    SELECT
      ev.id AS evaluation_id,
      ev.course_cycle_id AS course_cycle_id,
      c.code AS course_code,
      s.session_number,
      CONCAT('Clase ', s.session_number, ' - ', et.code, ev.number) AS title,
      CASE s.session_number
        WHEN 1 THEN 'Introduccion'
        WHEN 2 THEN 'Ejercicios'
        WHEN 3 THEN 'Resolucion guiada'
        ELSE 'Repaso final'
      END AS topic,
      ccp.professor_user_id AS created_by,
      CASE
        WHEN et.code = 'EX' AND ev.number = 1 THEN FLOOR(GREATEST(DATEDIFF(DATE(ac.end_date), DATE(ac.start_date)), 0) / 2)
        WHEN et.code = 'EX' AND ev.number >= 2 THEN GREATEST(DATEDIFF(DATE(ac.end_date), DATE(ac.start_date)), 0)
        ELSE LEAST(
          GREATEST(DATEDIFF(DATE(ev.start_date), DATE(ac.start_date)), 0),
          GREATEST(DATEDIFF(DATE(ac.end_date), DATE(ac.start_date)), 0)
        )
      END AS order_target_day,
      CASE
        WHEN et.code = 'LAB' THEN (1000 + (ev.number * 10) + s.session_number)
        WHEN et.code = 'PC' THEN (2000 + (ev.number * 10) + s.session_number)
        WHEN et.code = 'EX' AND ev.number = 1 THEN (5000 + s.session_number)
        WHEN et.code = 'EX' AND ev.number = 2 THEN (9000 + s.session_number)
        WHEN et.code = 'EX' THEN (9500 + (ev.number * 10) + s.session_number)
        ELSE (9900 + (ev.number * 10) + s.session_number)
      END AS order_eval_session,
      CASE
        WHEN c.code = '1INF01' AND et.code IN ('PC', 'LAB') AND ev.number = 1 AND s.session_number = 1 THEN 0
        WHEN c.code = '1MAT06' AND et.code IN ('PC', 'LAB') AND ev.number = 1 AND s.session_number = 1 THEN 1
        ELSE 2
      END AS order_special_priority
    FROM evaluation ev
    INNER JOIN course_cycle cc
      ON cc.id = ev.course_cycle_id
    INNER JOIN course c
      ON c.id = cc.course_id
    INNER JOIN academic_cycle ac
      ON ac.id = cc.academic_cycle_id
    INNER JOIN evaluation_type et
      ON et.id = ev.evaluation_type_id
    INNER JOIN (
      SELECT 1 AS session_number
      UNION ALL SELECT 2
      UNION ALL SELECT 3
      UNION ALL SELECT 4
    ) s
      ON s.session_number <= CASE
        WHEN et.code = 'EX' THEN 4
        WHEN et.code IN ('PC', 'LAB') THEN 3
        ELSE 0
      END
    INNER JOIN (
      SELECT
        course_cycle_id,
        MIN(professor_user_id) AS professor_user_id
      FROM course_cycle_professor
      WHERE revoked_at IS NULL
      GROUP BY course_cycle_id
    ) ccp
      ON ccp.course_cycle_id = ev.course_cycle_id
    WHERE cc.academic_cycle_id = @active_cycle_id
      AND @active_cycle_id IS NOT NULL
      AND @rec_not_available IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM class_event ce
        WHERE ce.evaluation_id = ev.id
          AND ce.session_number = s.session_number
      )
    ORDER BY
      order_special_priority ASC,
      order_target_day ASC,
      cc.id ASC,
      order_eval_session ASC,
      ev.id ASC
  ) src
  CROSS JOIN (SELECT @slot_index := -1) vars
) ss
INNER JOIN academic_cycle ac
  ON ac.id = @active_cycle_id;

INSERT INTO class_event_professor (
  class_event_id,
  professor_user_id,
  assigned_at,
  revoked_at
)
SELECT
  ce.id,
  ccp.professor_user_id,
  NOW(),
  NULL
FROM class_event ce
INNER JOIN evaluation ev
  ON ev.id = ce.evaluation_id
INNER JOIN (
  SELECT
    course_cycle_id,
    MIN(professor_user_id) AS professor_user_id
  FROM course_cycle_professor
  WHERE revoked_at IS NULL
  GROUP BY course_cycle_id
) ccp
  ON ccp.course_cycle_id = ev.course_cycle_id
WHERE NOT EXISTS (
  SELECT 1
  FROM class_event_professor cep
  WHERE cep.class_event_id = ce.id
    AND cep.professor_user_id = ccp.professor_user_id
);

-- Verificacion rapida
SELECT COUNT(*) AS total_allowed_types_for_active_cycle
FROM course_cycle_allowed_evaluation_type ccaet
INNER JOIN course_cycle cc ON cc.id = ccaet.course_cycle_id
WHERE cc.academic_cycle_id = @active_cycle_id;

SELECT COUNT(*) AS total_evaluations_for_active_cycle
FROM evaluation e
INNER JOIN course_cycle cc ON cc.id = e.course_cycle_id
WHERE cc.academic_cycle_id = @active_cycle_id;

SELECT COUNT(*) AS total_class_events_for_active_cycle
FROM class_event ce
INNER JOIN evaluation e ON e.id = ce.evaluation_id
INNER JOIN course_cycle cc ON cc.id = e.course_cycle_id
WHERE cc.academic_cycle_id = @active_cycle_id;

SELECT COUNT(*) AS total_class_event_professors_for_active_cycle
FROM class_event_professor cep
INNER JOIN class_event ce ON ce.id = cep.class_event_id
INNER JOIN evaluation e ON e.id = ce.evaluation_id
INNER JOIN course_cycle cc ON cc.id = e.course_cycle_id
WHERE cc.academic_cycle_id = @active_cycle_id;

-- Resumen de generacion (referencial)
-- Evaluaciones con rango observado: 69
-- Evaluaciones con rango estimado: 103

-- ============================================================================
-- Matriculas de prueba (alumno gmail) sobre cursos CIENCIAS
-- 2 FULL + 2 PARTIAL (PARTIAL: primera PC/LAB + primer EX)
-- ============================================================================
SET @active_cycle_id = (
  SELECT CAST(ss.setting_value AS UNSIGNED)
  FROM system_setting ss
  WHERE ss.setting_key = 'ACTIVE_CYCLE_ID'
  LIMIT 1
);

SET @target_student_id = (
  SELECT u.id
  FROM user u
  WHERE LOWER(TRIM(u.email)) = 'alumnopasalo@gmail.com'
  LIMIT 1
);

SET @enrollment_status_active_id = (
  SELECT es.id
  FROM enrollment_status es
  WHERE es.code = 'ACTIVE'
  LIMIT 1
);

SET @enrollment_type_full_id = (
  SELECT et.id
  FROM enrollment_type et
  WHERE et.code = 'FULL'
  LIMIT 1
);

SET @enrollment_type_partial_id = (
  SELECT et.id
  FROM enrollment_type et
  WHERE et.code = 'PARTIAL'
  LIMIT 1
);

-- Cursos CIENCIAS elegidos
SET @cc_full_1 = (
  SELECT cc.id
  FROM course_cycle cc
  INNER JOIN course c ON c.id = cc.course_id
  WHERE cc.academic_cycle_id = @active_cycle_id
    AND c.code = '1MAT05'
  LIMIT 1
);

SET @cc_full_2 = (
  SELECT cc.id
  FROM course_cycle cc
  INNER JOIN course c ON c.id = cc.course_id
  WHERE cc.academic_cycle_id = @active_cycle_id
    AND c.code = '1FIS01'
  LIMIT 1
);

SET @cc_partial_1 = (
  SELECT cc.id
  FROM course_cycle cc
  INNER JOIN course c ON c.id = cc.course_id
  WHERE cc.academic_cycle_id = @active_cycle_id
    AND c.code = '1INF01'
  LIMIT 1
);

SET @cc_partial_2 = (
  SELECT cc.id
  FROM course_cycle cc
  INNER JOIN course c ON c.id = cc.course_id
  WHERE cc.academic_cycle_id = @active_cycle_id
    AND c.code = '1MAT06'
  LIMIT 1
);

-- FULL 1
INSERT INTO enrollment (
  user_id,
  course_cycle_id,
  enrollment_status_id,
  enrollment_type_id,
  enrolled_at,
  cancelled_at
)
SELECT
  @target_student_id,
  @cc_full_1,
  @enrollment_status_active_id,
  @enrollment_type_full_id,
  NOW(),
  NULL
WHERE @target_student_id IS NOT NULL
  AND @cc_full_1 IS NOT NULL
  AND @enrollment_status_active_id IS NOT NULL
  AND @enrollment_type_full_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment e
    WHERE e.user_id = @target_student_id
      AND e.course_cycle_id = @cc_full_1
      AND e.cancelled_at IS NULL
  );

-- FULL 2
INSERT INTO enrollment (
  user_id,
  course_cycle_id,
  enrollment_status_id,
  enrollment_type_id,
  enrolled_at,
  cancelled_at
)
SELECT
  @target_student_id,
  @cc_full_2,
  @enrollment_status_active_id,
  @enrollment_type_full_id,
  NOW(),
  NULL
WHERE @target_student_id IS NOT NULL
  AND @cc_full_2 IS NOT NULL
  AND @enrollment_status_active_id IS NOT NULL
  AND @enrollment_type_full_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment e
    WHERE e.user_id = @target_student_id
      AND e.course_cycle_id = @cc_full_2
      AND e.cancelled_at IS NULL
  );

-- PARTIAL 1
INSERT INTO enrollment (
  user_id,
  course_cycle_id,
  enrollment_status_id,
  enrollment_type_id,
  enrolled_at,
  cancelled_at
)
SELECT
  @target_student_id,
  @cc_partial_1,
  @enrollment_status_active_id,
  @enrollment_type_partial_id,
  NOW(),
  NULL
WHERE @target_student_id IS NOT NULL
  AND @cc_partial_1 IS NOT NULL
  AND @enrollment_status_active_id IS NOT NULL
  AND @enrollment_type_partial_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment e
    WHERE e.user_id = @target_student_id
      AND e.course_cycle_id = @cc_partial_1
      AND e.cancelled_at IS NULL
  );

-- PARTIAL 2
INSERT INTO enrollment (
  user_id,
  course_cycle_id,
  enrollment_status_id,
  enrollment_type_id,
  enrolled_at,
  cancelled_at
)
SELECT
  @target_student_id,
  @cc_partial_2,
  @enrollment_status_active_id,
  @enrollment_type_partial_id,
  NOW(),
  NULL
WHERE @target_student_id IS NOT NULL
  AND @cc_partial_2 IS NOT NULL
  AND @enrollment_status_active_id IS NOT NULL
  AND @enrollment_type_partial_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment e
    WHERE e.user_id = @target_student_id
      AND e.course_cycle_id = @cc_partial_2
      AND e.cancelled_at IS NULL
  );

SET @enr_full_1 = (
  SELECT e.id FROM enrollment e
  WHERE e.user_id = @target_student_id
    AND e.course_cycle_id = @cc_full_1
    AND e.cancelled_at IS NULL
  LIMIT 1
);

SET @enr_full_2 = (
  SELECT e.id FROM enrollment e
  WHERE e.user_id = @target_student_id
    AND e.course_cycle_id = @cc_full_2
    AND e.cancelled_at IS NULL
  LIMIT 1
);

SET @enr_partial_1 = (
  SELECT e.id FROM enrollment e
  WHERE e.user_id = @target_student_id
    AND e.course_cycle_id = @cc_partial_1
    AND e.cancelled_at IS NULL
  LIMIT 1
);

SET @enr_partial_2 = (
  SELECT e.id FROM enrollment e
  WHERE e.user_id = @target_student_id
    AND e.course_cycle_id = @cc_partial_2
    AND e.cancelled_at IS NULL
  LIMIT 1
);

-- FULL: acceso a todas las evaluaciones del curso-ciclo
INSERT INTO enrollment_evaluation (
  enrollment_id,
  evaluation_id,
  access_start_date,
  access_end_date,
  is_active,
  revoked_at,
  revoked_by
)
SELECT
  @enr_full_1,
  ev.id,
  ev.start_date,
  ev.end_date,
  TRUE,
  NULL,
  NULL
FROM evaluation ev
WHERE ev.course_cycle_id = @cc_full_1
  AND @enr_full_1 IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment_evaluation ee
    WHERE ee.enrollment_id = @enr_full_1
      AND ee.evaluation_id = ev.id
  );

INSERT INTO enrollment_evaluation (
  enrollment_id,
  evaluation_id,
  access_start_date,
  access_end_date,
  is_active,
  revoked_at,
  revoked_by
)
SELECT
  @enr_full_2,
  ev.id,
  ev.start_date,
  ev.end_date,
  TRUE,
  NULL,
  NULL
FROM evaluation ev
WHERE ev.course_cycle_id = @cc_full_2
  AND @enr_full_2 IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment_evaluation ee
    WHERE ee.enrollment_id = @enr_full_2
      AND ee.evaluation_id = ev.id
  );

-- PARTIAL: primeras 2 PC/LAB + primer EX del mismo curso-ciclo
INSERT INTO enrollment_evaluation (
  enrollment_id,
  evaluation_id,
  access_start_date,
  access_end_date,
  is_active,
  revoked_at,
  revoked_by
)
SELECT
  @enr_partial_1,
  ev.id,
  ev.start_date,
  ev.end_date,
  TRUE,
  NULL,
  NULL
FROM evaluation ev
INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
WHERE ev.course_cycle_id = @cc_partial_1
  AND @enr_partial_1 IS NOT NULL
  AND (
    (et.code IN ('PC', 'LAB') AND ev.number IN (1, 2))
    OR (et.code = 'EX' AND ev.number = 1)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment_evaluation ee
    WHERE ee.enrollment_id = @enr_partial_1
      AND ee.evaluation_id = ev.id
  );

INSERT INTO enrollment_evaluation (
  enrollment_id,
  evaluation_id,
  access_start_date,
  access_end_date,
  is_active,
  revoked_at,
  revoked_by
)
SELECT
  @enr_partial_2,
  ev.id,
  ev.start_date,
  ev.end_date,
  TRUE,
  NULL,
  NULL
FROM evaluation ev
INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
WHERE ev.course_cycle_id = @cc_partial_2
  AND @enr_partial_2 IS NOT NULL
  AND (
    (et.code IN ('PC', 'LAB') AND ev.number IN (1, 2))
    OR (et.code = 'EX' AND ev.number = 1)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment_evaluation ee
    WHERE ee.enrollment_id = @enr_partial_2
      AND ee.evaluation_id = ev.id
  );

SELECT COUNT(*) AS total_enrollments_target_student_active
FROM enrollment e
WHERE e.user_id = @target_student_id
  AND e.cancelled_at IS NULL
  AND e.course_cycle_id IN (@cc_full_1, @cc_full_2, @cc_partial_1, @cc_partial_2);

-- Ajuste solicitado: mover la primera clase (session_number = 1) de los 2 cursos
-- asignados a docentepasalo@gmail.com al dia 1 del ciclo, sin cruces globales.
SET @prof_real_email = 'docentepasalo@gmail.com';
SET @cc_prof_inf01 = (
  SELECT cc.id
  FROM course_cycle cc
  INNER JOIN course c ON c.id = cc.course_id
  WHERE cc.academic_cycle_id = @active_cycle_id
    AND c.code = '1INF01'
  LIMIT 1
);
SET @cc_prof_mat06 = (
  SELECT cc.id
  FROM course_cycle cc
  INNER JOIN course c ON c.id = cc.course_id
  WHERE cc.academic_cycle_id = @active_cycle_id
    AND c.code = '1MAT06'
  LIMIT 1
);

SET @first_event_inf01 = (
  SELECT ce.id
  FROM class_event ce
  INNER JOIN evaluation ev ON ev.id = ce.evaluation_id
  INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
  INNER JOIN course_cycle cc ON cc.id = ev.course_cycle_id
  INNER JOIN course_cycle_professor ccp ON ccp.course_cycle_id = cc.id AND ccp.revoked_at IS NULL
  INNER JOIN user u ON u.id = ccp.professor_user_id
  WHERE cc.id = @cc_prof_inf01
    AND LOWER(TRIM(u.email)) = @prof_real_email
    AND ev.number = 1
    AND et.code IN ('PC', 'LAB')
    AND ce.session_number = 1
    AND ce.is_cancelled = 0
  ORDER BY ce.start_datetime ASC, ce.id ASC
  LIMIT 1
);

SET @first_event_mat06 = (
  SELECT ce.id
  FROM class_event ce
  INNER JOIN evaluation ev ON ev.id = ce.evaluation_id
  INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
  INNER JOIN course_cycle cc ON cc.id = ev.course_cycle_id
  INNER JOIN course_cycle_professor ccp ON ccp.course_cycle_id = cc.id AND ccp.revoked_at IS NULL
  INNER JOIN user u ON u.id = ccp.professor_user_id
  WHERE cc.id = @cc_prof_mat06
    AND LOWER(TRIM(u.email)) = @prof_real_email
    AND ev.number = 1
    AND et.code IN ('PC', 'LAB')
    AND ce.session_number = 1
    AND ce.is_cancelled = 0
  ORDER BY ce.start_datetime ASC, ce.id ASC
  LIMIT 1
);

-- Slot 1 (sin conflicto global): se busca primer slot libre en dia 1 o dia 2
SET @new_start_inf01 = (
  SELECT c.slot_start
  FROM (
    SELECT TIMESTAMP('2026-04-01 13:00:00') AS slot_start
    UNION ALL SELECT TIMESTAMP('2026-04-01 15:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-01 17:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-01 19:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-01 21:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 13:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 15:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 17:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 19:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 21:00:00')
  ) c
  WHERE NOT EXISTS (
    SELECT 1
    FROM class_event ce2
    WHERE ce2.id <> @first_event_inf01
      AND ce2.is_cancelled = 0
      AND c.slot_start < ce2.end_datetime
      AND DATE_ADD(c.slot_start, INTERVAL 2 HOUR) > ce2.start_datetime
  )
  ORDER BY c.slot_start
  LIMIT 1
);

UPDATE class_event ce
SET ce.start_datetime = @new_start_inf01,
    ce.end_datetime = DATE_ADD(@new_start_inf01, INTERVAL 2 HOUR)
WHERE ce.id = @first_event_inf01
  AND @new_start_inf01 IS NOT NULL;

-- Slot 2 (sin conflicto global): se busca primer slot libre en dia 1 o dia 2
SET @new_start_mat06 = (
  SELECT c.slot_start
  FROM (
    SELECT TIMESTAMP('2026-04-01 13:00:00') AS slot_start
    UNION ALL SELECT TIMESTAMP('2026-04-01 15:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-01 17:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-01 19:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-01 21:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 13:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 15:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 17:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 19:00:00')
    UNION ALL SELECT TIMESTAMP('2026-04-02 21:00:00')
  ) c
  WHERE NOT EXISTS (
    SELECT 1
    FROM class_event ce2
    WHERE ce2.id <> @first_event_mat06
      AND ce2.is_cancelled = 0
      AND c.slot_start < ce2.end_datetime
      AND DATE_ADD(c.slot_start, INTERVAL 2 HOUR) > ce2.start_datetime
  )
  ORDER BY c.slot_start
  LIMIT 1
);

UPDATE class_event ce
SET ce.start_datetime = @new_start_mat06,
    ce.end_datetime = DATE_ADD(@new_start_mat06, INTERVAL 2 HOUR)
WHERE ce.id = @first_event_mat06
  AND @new_start_mat06 IS NOT NULL;

SELECT @first_event_inf01 AS first_event_inf01_id, @new_start_inf01 AS new_start_inf01;
SELECT @first_event_mat06 AS first_event_mat06_id, @new_start_mat06 AS new_start_mat06;
