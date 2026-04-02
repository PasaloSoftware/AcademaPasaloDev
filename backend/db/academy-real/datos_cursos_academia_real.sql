-- Cursos base para migracion real (academy-real)
-- Fuente: backend/cursos.txt
-- Nota: en esta etapa solo se inserta tabla course (sin profesores, PCs ni EX).

INSERT INTO course (course_type_id, cycle_level_id, code, name, created_at)
SELECT
  ct.id AS course_type_id,
  cl.id AS cycle_level_id,
  src.course_code AS code,
  src.course_name AS name,
  NOW() AS created_at
FROM (
  SELECT 'BASE DE DATOS' AS course_name, '1INF33' AS course_code, 'FACULTAD' AS course_type_code, 5 AS cycle_level
  UNION ALL SELECT 'PROGRAMACIÓN 2' AS course_name, '1INF25' AS course_code, 'FACULTAD' AS course_type_code, 5 AS cycle_level
  UNION ALL SELECT 'ALGORITMIA Y ESTRUCTURA DE DATOS' AS course_name, '1INF27' AS course_code, 'FACULTAD' AS course_type_code, 5 AS cycle_level
  UNION ALL SELECT 'ANALYTICS2' AS course_name, '1IND51' AS course_code, 'FACULTAD' AS course_type_code, 7 AS cycle_level
  UNION ALL SELECT 'INGENIERÍA ECONÓMICA' AS course_name, 'IND231' AS course_code, 'FACULTAD' AS course_type_code, 7 AS cycle_level
  UNION ALL SELECT 'CÁLCULO EN VARIAS VARIABLES' AS course_name, '1MAT08' AS course_code, 'CIENCIAS' AS course_type_code, 3 AS cycle_level
  UNION ALL SELECT 'CÁLCULO APLICADO' AS course_name, '1MAT09' AS course_code, 'CIENCIAS' AS course_type_code, 4 AS cycle_level
  UNION ALL SELECT 'CÁLCULO INTEGRAL' AS course_name, '1MAT07' AS course_code, 'CIENCIAS' AS course_type_code, 3 AS cycle_level
  UNION ALL SELECT 'FUNDAMENTOS DE CÁLCULO' AS course_name, '1MAT05' AS course_code, 'CIENCIAS' AS course_type_code, 1 AS cycle_level
  UNION ALL SELECT 'CÁLCULO DIFERENCIAL' AS course_name, '1MAT06' AS course_code, 'CIENCIAS' AS course_type_code, 2 AS cycle_level
  UNION ALL SELECT 'ÁLGEBRA MATRICIAL Y GEOMETRÍA ANALÍTICA' AS course_name, '1MAT04' AS course_code, 'CIENCIAS' AS course_type_code, 1 AS cycle_level
  UNION ALL SELECT 'FUNDAMENTOS DE FÍSICA' AS course_name, '1FIS01' AS course_code, 'CIENCIAS' AS course_type_code, 1 AS cycle_level
  UNION ALL SELECT 'FÍSICA 1' AS course_name, '1FIS02' AS course_code, 'CIENCIAS' AS course_type_code, 2 AS cycle_level
  UNION ALL SELECT 'FÍSICA 2' AS course_name, '1FIS04' AS course_code, 'CIENCIAS' AS course_type_code, 3 AS cycle_level
  UNION ALL SELECT 'FÍSICA 3' AS course_name, '1FIS06' AS course_code, 'CIENCIAS' AS course_type_code, 4 AS cycle_level
  UNION ALL SELECT 'FUNDAMENTOS DE PROGRAMACIÓN' AS course_name, '1INF01' AS course_code, 'CIENCIAS' AS course_type_code, 3 AS cycle_level
  UNION ALL SELECT 'ESTRUCTURAS DISCRETAS' AS course_name, 'INF134' AS course_code, 'CIENCIAS' AS course_type_code, 3 AS cycle_level
  UNION ALL SELECT 'QUÍMICA 1' AS course_name, '1QUI01' AS course_code, 'CIENCIAS' AS course_type_code, 1 AS cycle_level
  UNION ALL SELECT 'DIBUJO EN INGENIERÍA' AS course_name, '1ING02' AS course_code, 'CIENCIAS' AS course_type_code, 2 AS cycle_level
  UNION ALL SELECT 'TOPOGRAFÍA' AS course_name, '1CIV42' AS course_code, 'CIENCIAS' AS course_type_code, 4 AS cycle_level
  UNION ALL SELECT 'MATEMÁTICA PARA ECONOMÍA Y FINANZAS 1' AS course_name, '1MAT25' AS course_code, 'LETRAS' AS course_type_code, 1 AS cycle_level
  UNION ALL SELECT 'MATEMÁTICA PARA ECONOMÍA Y FINANZAS 2' AS course_name, '1MAT26' AS course_code, 'LETRAS' AS course_type_code, 2 AS cycle_level
  UNION ALL SELECT 'MATEMÁTICA PARA ECONOMÍA Y FINANZAS 3' AS course_name, '1MAT27' AS course_code, 'LETRAS' AS course_type_code, 3 AS cycle_level
  UNION ALL SELECT 'MATEMÁTICA BÁSICA' AS course_name, 'MAT155' AS course_code, 'LETRAS' AS course_type_code, 1 AS cycle_level
  UNION ALL SELECT 'TALLER DE ESCRITURA E INTERPRETACIÓN DE TEXTOS' AS course_name, 'LIN126' AS course_code, 'LETRAS' AS course_type_code, 1 AS cycle_level
  UNION ALL SELECT 'ARGUMENTACIÓN' AS course_name, 'HUM121' AS course_code, 'LETRAS' AS course_type_code, 2 AS cycle_level
  UNION ALL SELECT 'INVESTIGACIÓN ACADÉMICA' AS course_name, 'INT130' AS course_code, 'LETRAS' AS course_type_code, 3 AS cycle_level
  UNION ALL SELECT 'INTRODUCCIÓN A LA ESTADÍSTICA Y PROBABILIDAD' AS course_name, '1EST10' AS course_code, 'LETRAS' AS course_type_code, 2 AS cycle_level
) src
INNER JOIN course_type ct
  ON ct.code = src.course_type_code
INNER JOIN cycle_level cl
  ON cl.level_number = src.cycle_level
WHERE NOT EXISTS (
  SELECT 1
  FROM course c
  WHERE c.code = src.course_code
);

-- Crear curso-ciclo para el ciclo activo (2026-1 via ACTIVE_CYCLE_ID)
SET @active_cycle_id = (
  SELECT CAST(ss.setting_value AS UNSIGNED)
  FROM system_setting ss
  WHERE ss.setting_key = 'ACTIVE_CYCLE_ID'
  LIMIT 1
);

INSERT INTO course_cycle (course_id, academic_cycle_id)
SELECT
  c.id AS course_id,
  @active_cycle_id AS academic_cycle_id
FROM course c
WHERE c.code IN (
  '1INF33',
  '1INF25',
  '1INF27',
  '1IND51',
  'IND231',
  '1MAT08',
  '1MAT09',
  '1MAT07',
  '1MAT05',
  '1MAT06',
  '1MAT04',
  '1FIS01',
  '1FIS02',
  '1FIS04',
  '1FIS06',
  '1INF01',
  'INF134',
  '1QUI01',
  '1ING02',
  '1CIV42',
  '1MAT25',
  '1MAT26',
  '1MAT27',
  'MAT155',
  'LIN126',
  'HUM121',
  'INT130',
  '1EST10'
)
AND @active_cycle_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1
  FROM course_cycle cc
  WHERE cc.course_id = c.id
    AND cc.academic_cycle_id = @active_cycle_id
);

-- Profesores base (emails temporales para migracion real)
INSERT INTO user (email, first_name, last_name_1, profile_photo_url, photo_source, created_at)
SELECT
  src.email,
  src.first_name,
  src.last_name_1,
  NULL AS profile_photo_url,
  'none' AS photo_source,
  NOW() AS created_at
FROM (
  SELECT 'selene.curo@academiapasalo.com' AS email, 'SELENE' AS first_name, 'CURO' AS last_name_1
  UNION ALL SELECT 'renato.sanchez@academiapasalo.com' AS email, 'RENATO' AS first_name, 'SÁNCHEZ' AS last_name_1
  UNION ALL SELECT 'tadeo.gallegos@academiapasalo.com' AS email, 'TADEO' AS first_name, 'GALLEGOS' AS last_name_1
  UNION ALL SELECT 'isaac.carol@academiapasalo.com' AS email, 'ISAAC' AS first_name, 'CAROL' AS last_name_1
  UNION ALL SELECT 'carlos.tuppia@academiapasalo.com' AS email, 'CARLOS' AS first_name, 'TUPPIA' AS last_name_1
  UNION ALL SELECT 'jean.rosas@academiapasalo.com' AS email, 'JEAN' AS first_name, 'ROSAS' AS last_name_1
  UNION ALL SELECT 'luis.pacherres@academiapasalo.com' AS email, 'LUIS' AS first_name, 'PACHERRES' AS last_name_1
  UNION ALL SELECT 'cesar.delgado@academiapasalo.com' AS email, 'CESAR' AS first_name, 'DELGADO' AS last_name_1
  UNION ALL SELECT 'alex.lamas@academiapasalo.com' AS email, 'ALEX' AS first_name, 'LAMAS' AS last_name_1
  UNION ALL SELECT 'magno.puma@academiapasalo.com' AS email, 'MAGNO' AS first_name, 'PUMA' AS last_name_1
  UNION ALL SELECT 'jesus.galvez@academiapasalo.com' AS email, 'JESÚS' AS first_name, 'GÁLVEZ' AS last_name_1
  UNION ALL SELECT 'jasser.carranza@academiapasalo.com' AS email, 'JASSER' AS first_name, 'CARRANZA' AS last_name_1
  UNION ALL SELECT 'alvaro.navarro@academiapasalo.com' AS email, 'ALVARO' AS first_name, 'NAVARRO' AS last_name_1
  UNION ALL SELECT 'luis.yataco@academiapasalo.com' AS email, 'LUIS' AS first_name, 'YATACO' AS last_name_1
  UNION ALL SELECT 'ariana.burga@academiapasalo.com' AS email, 'ARIANA' AS first_name, 'BURGA' AS last_name_1
  UNION ALL SELECT 'richard.simon@academiapasalo.com' AS email, 'RICHARD' AS first_name, 'SIMON' AS last_name_1
  UNION ALL SELECT 'rolando.misari@academiapasalo.com' AS email, 'ROLANDO' AS first_name, 'MISARI' AS last_name_1
  UNION ALL SELECT 'luis.antonio@academiapasalo.com' AS email, 'LUIS' AS first_name, 'ANTONIO' AS last_name_1
  UNION ALL SELECT 'etny.becerra@academiapasalo.com' AS email, 'ETNY' AS first_name, 'BECERRA' AS last_name_1
  UNION ALL SELECT 'juan.gonzales@academiapasalo.com' AS email, 'JUAN' AS first_name, 'GONZALES' AS last_name_1
  UNION ALL SELECT 'dennys.anayhuchaca@academiapasalo.com' AS email, 'DENNYS' AS first_name, 'ANAYHUCHACA' AS last_name_1
  UNION ALL SELECT 'carlos.borja@academiapasalo.com' AS email, 'CARLOS' AS first_name, 'BORJA' AS last_name_1
  UNION ALL SELECT 'diego.arrieta@academiapasalo.com' AS email, 'DIEGO' AS first_name, 'ARRIETA' AS last_name_1
) src
WHERE NOT EXISTS (
  SELECT 1
  FROM user u
  WHERE u.email = src.email
);

SET @role_professor_id = (SELECT id FROM role WHERE code = 'PROFESSOR' LIMIT 1);

INSERT INTO user_role (user_id, role_id)
SELECT
  u.id AS user_id,
  @role_professor_id AS role_id
FROM user u
WHERE u.email IN (
  'selene.curo@academiapasalo.com',
  'renato.sanchez@academiapasalo.com',
  'tadeo.gallegos@academiapasalo.com',
  'isaac.carol@academiapasalo.com',
  'carlos.tuppia@academiapasalo.com',
  'jean.rosas@academiapasalo.com',
  'luis.pacherres@academiapasalo.com',
  'cesar.delgado@academiapasalo.com',
  'alex.lamas@academiapasalo.com',
  'magno.puma@academiapasalo.com',
  'jesus.galvez@academiapasalo.com',
  'jasser.carranza@academiapasalo.com',
  'alvaro.navarro@academiapasalo.com',
  'luis.yataco@academiapasalo.com',
  'ariana.burga@academiapasalo.com',
  'richard.simon@academiapasalo.com',
  'rolando.misari@academiapasalo.com',
  'luis.antonio@academiapasalo.com',
  'etny.becerra@academiapasalo.com',
  'juan.gonzales@academiapasalo.com',
  'dennys.anayhuchaca@academiapasalo.com',
  'carlos.borja@academiapasalo.com',
  'diego.arrieta@academiapasalo.com'
)
AND @role_professor_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1
  FROM user_role ur
  WHERE ur.user_id = u.id
    AND ur.role_id = @role_professor_id
);

INSERT INTO course_cycle_professor (course_cycle_id, professor_user_id, assigned_at, revoked_at)
SELECT
  cc.id AS course_cycle_id,
  u.id AS professor_user_id,
  NOW() AS assigned_at,
  NULL AS revoked_at
FROM (
  SELECT '1INF33' AS course_code, 'selene.curo@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1INF25' AS course_code, 'renato.sanchez@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1INF27' AS course_code, 'tadeo.gallegos@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1IND51' AS course_code, 'isaac.carol@academiapasalo.com' AS professor_email
  UNION ALL SELECT 'IND231' AS course_code, 'isaac.carol@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT08' AS course_code, 'carlos.tuppia@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT09' AS course_code, 'jean.rosas@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT07' AS course_code, 'luis.pacherres@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT05' AS course_code, 'cesar.delgado@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT06' AS course_code, 'alex.lamas@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT04' AS course_code, 'magno.puma@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1FIS01' AS course_code, 'jesus.galvez@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1FIS02' AS course_code, 'cesar.delgado@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1FIS04' AS course_code, 'jasser.carranza@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1FIS06' AS course_code, 'alvaro.navarro@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1INF01' AS course_code, 'luis.yataco@academiapasalo.com' AS professor_email
  UNION ALL SELECT 'INF134' AS course_code, 'ariana.burga@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1QUI01' AS course_code, 'richard.simon@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1ING02' AS course_code, 'rolando.misari@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1CIV42' AS course_code, 'luis.antonio@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT25' AS course_code, 'etny.becerra@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT26' AS course_code, 'juan.gonzales@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1MAT27' AS course_code, 'dennys.anayhuchaca@academiapasalo.com' AS professor_email
  UNION ALL SELECT 'MAT155' AS course_code, 'carlos.borja@academiapasalo.com' AS professor_email
  UNION ALL SELECT 'LIN126' AS course_code, 'diego.arrieta@academiapasalo.com' AS professor_email
  UNION ALL SELECT 'HUM121' AS course_code, 'diego.arrieta@academiapasalo.com' AS professor_email
  UNION ALL SELECT 'INT130' AS course_code, 'diego.arrieta@academiapasalo.com' AS professor_email
  UNION ALL SELECT '1EST10' AS course_code, 'carlos.borja@academiapasalo.com' AS professor_email
) map
INNER JOIN course c
  ON c.code = map.course_code
INNER JOIN course_cycle cc
  ON cc.course_id = c.id
 AND cc.academic_cycle_id = @active_cycle_id
INNER JOIN user u
  ON u.email = map.professor_email
WHERE NOT EXISTS (
  SELECT 1
  FROM course_cycle_professor ccp
  WHERE ccp.course_cycle_id = cc.id
    AND ccp.professor_user_id = u.id
);

-- Asignacion adicional para docentepasalo@gmail.com (2 cursos CIENCIAS)
INSERT INTO course_cycle_professor (course_cycle_id, professor_user_id, assigned_at, revoked_at)
SELECT
  cc.id AS course_cycle_id,
  u.id AS professor_user_id,
  NOW() AS assigned_at,
  NULL AS revoked_at
FROM (
  SELECT '1INF01' AS course_code
  UNION ALL SELECT '1MAT06' AS course_code
) map
INNER JOIN course c
  ON c.code = map.course_code
INNER JOIN course_cycle cc
  ON cc.course_id = c.id
 AND cc.academic_cycle_id = @active_cycle_id
INNER JOIN user u
  ON LOWER(TRIM(u.email)) = 'docentepasalo@gmail.com'
WHERE NOT EXISTS (
  SELECT 1
  FROM course_cycle_professor ccp
  WHERE ccp.course_cycle_id = cc.id
    AND ccp.professor_user_id = u.id
);

-- Verificacion rapida
SELECT COUNT(*) AS total_courses_loaded
FROM course
WHERE code IN (
  '1INF33',
  '1INF25',
  '1INF27',
  '1IND51',
  'IND231',
  '1MAT08',
  '1MAT09',
  '1MAT07',
  '1MAT05',
  '1MAT06',
  '1MAT04',
  '1FIS01',
  '1FIS02',
  '1FIS04',
  '1FIS06',
  '1INF01',
  'INF134',
  '1QUI01',
  '1ING02',
  '1CIV42',
  '1MAT25',
  '1MAT26',
  '1MAT27',
  'MAT155',
  'LIN126',
  'HUM121',
  'INT130',
  '1EST10'
);

SELECT COUNT(*) AS total_course_cycles_loaded_for_active_cycle
FROM course_cycle cc
INNER JOIN course c ON c.id = cc.course_id
WHERE cc.academic_cycle_id = @active_cycle_id
  AND c.code IN (
    '1INF33',
    '1INF25',
    '1INF27',
    '1IND51',
    'IND231',
    '1MAT08',
    '1MAT09',
    '1MAT07',
    '1MAT05',
    '1MAT06',
    '1MAT04',
    '1FIS01',
    '1FIS02',
    '1FIS04',
    '1FIS06',
    '1INF01',
    'INF134',
    '1QUI01',
    '1ING02',
    '1CIV42',
    '1MAT25',
    '1MAT26',
    '1MAT27',
    'MAT155',
    'LIN126',
    'HUM121',
    'INT130',
    '1EST10'
  );

SELECT COUNT(*) AS total_professors_loaded
FROM user
WHERE email IN (
  'selene.curo@academiapasalo.com',
  'renato.sanchez@academiapasalo.com',
  'tadeo.gallegos@academiapasalo.com',
  'isaac.carol@academiapasalo.com',
  'carlos.tuppia@academiapasalo.com',
  'jean.rosas@academiapasalo.com',
  'luis.pacherres@academiapasalo.com',
  'cesar.delgado@academiapasalo.com',
  'alex.lamas@academiapasalo.com',
  'magno.puma@academiapasalo.com',
  'jesus.galvez@academiapasalo.com',
  'jasser.carranza@academiapasalo.com',
  'alvaro.navarro@academiapasalo.com',
  'luis.yataco@academiapasalo.com',
  'ariana.burga@academiapasalo.com',
  'richard.simon@academiapasalo.com',
  'rolando.misari@academiapasalo.com',
  'luis.antonio@academiapasalo.com',
  'etny.becerra@academiapasalo.com',
  'juan.gonzales@academiapasalo.com',
  'dennys.anayhuchaca@academiapasalo.com',
  'carlos.borja@academiapasalo.com',
  'diego.arrieta@academiapasalo.com'
);

SELECT COUNT(*) AS total_professor_assignments_for_active_cycle
FROM course_cycle_professor ccp
INNER JOIN course_cycle cc ON cc.id = ccp.course_cycle_id
WHERE cc.academic_cycle_id = @active_cycle_id;
