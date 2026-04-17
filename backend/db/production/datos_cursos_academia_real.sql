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
INSERT INTO user (email, first_name, last_name_1, phone, profile_photo_url, photo_source, created_at)
SELECT
  src.email,
  src.first_name,
  src.last_name_1,
  src.phone,
  NULL AS profile_photo_url,
  'none' AS photo_source,
  NOW() AS created_at
FROM (
  SELECT 'scuro@pucp.edu.pe' AS email, 'SELENE' AS first_name, 'CURO' AS last_name_1, '947162609' AS phone
  UNION ALL SELECT 'salexrenato@gmail.com' AS email, 'RENATO' AS first_name, 'SÁNCHEZ' AS last_name_1, '934573504' AS phone
  UNION ALL SELECT 'sebastiangallegosmostajo@gmail.com' AS email, 'TADEO' AS first_name, 'GALLEGOS' AS last_name_1, '982372126' AS phone
  UNION ALL SELECT 'a20222027@pucp.edu.pe' AS email, 'ISAAC' AS first_name, 'CAROL' AS last_name_1, '951927950' AS phone
  UNION ALL SELECT 'ctuppia@pucp.edu.pe' AS email, 'CARLOS' AS first_name, 'TUPPIA' AS last_name_1, '949107779' AS phone
  UNION ALL SELECT 'rosasrodriguezjean@gmail.com' AS email, 'JEAN' AS first_name, 'ROSAS' AS last_name_1, '906223000' AS phone
  UNION ALL SELECT 'lmpacherresv@unac.edu.pe' AS email, 'LUIS' AS first_name, 'PACHERRES' AS last_name_1, '923786254' AS phone
  UNION ALL SELECT 'delgado.cg@pucp.edu.pe' AS email, 'CESAR' AS first_name, 'DELGADO' AS last_name_1, '963340587' AS phone
  UNION ALL SELECT 'alexf.lamas@pucp.pe' AS email, 'ALEX' AS first_name, 'LAMAS' AS last_name_1, '995559376' AS phone
  UNION ALL SELECT 'magno.puma@pucp.edu.pe' AS email, 'MAGNO' AS first_name, 'PUMA' AS last_name_1, '954774941' AS phone
  UNION ALL SELECT 'jesus.galvez@redastrum.org' AS email, 'JESÚS' AS first_name, 'GÁLVEZ' AS last_name_1, '986823268' AS phone
  UNION ALL SELECT 'jassercarranza@gmail.com' AS email, 'JASSER' AS first_name, 'CARRANZA' AS last_name_1, '940610851' AS phone
  UNION ALL SELECT 'alvaronm125.125@gmail.com' AS email, 'ALVARO' AS first_name, 'NAVARRO' AS last_name_1, '920147777' AS phone
  UNION ALL SELECT 'yatacoantonio0312@gmail.com' AS email, 'LUIS' AS first_name, 'YATACO' AS last_name_1, '994564399' AS phone
  UNION ALL SELECT 'arianabr.abr@gmail.com' AS email, 'ARIANA' AS first_name, 'BURGA' AS last_name_1, '953862411' AS phone
  UNION ALL SELECT 'rsimonlozano@gmail.com' AS email, 'RICHARD' AS first_name, 'SIMON' AS last_name_1, '933322696' AS phone
  UNION ALL SELECT 'misari.r@pucp.edu.pe' AS email, 'ROLANDO' AS first_name, 'MISARI' AS last_name_1, '986850021' AS phone
  UNION ALL SELECT 'a20192368@pucp.edu.pe' AS email, 'LUIS' AS first_name, 'ANTONIO' AS last_name_1, '989603543' AS phone
  UNION ALL SELECT 'a20210494@pucp.edu.pe' AS email, 'ETNY' AS first_name, 'BECERRA' AS last_name_1, '927723693' AS phone
  UNION ALL SELECT 'juan.gonzalesc@pucp.edu.pe' AS email, 'JUAN' AS first_name, 'GONZALES' AS last_name_1, '982093607' AS phone
  UNION ALL SELECT 'a20203698@pucp.edu.pe' AS email, 'DENNYS' AS first_name, 'ANAYHUCHACA' AS last_name_1, '956441048' AS phone
  UNION ALL SELECT 'carlos.borja@pucp.edu.pe' AS email, 'CARLOS' AS first_name, 'BORJA' AS last_name_1, '975999330' AS phone
  UNION ALL SELECT 'a20172572@pucp.edu.pe' AS email, 'DIEGO' AS first_name, 'ARRIETA' AS last_name_1, '905467748' AS phone
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
  'scuro@pucp.edu.pe',
  'salexrenato@gmail.com',
  'sebastiangallegosmostajo@gmail.com',
  'a20222027@pucp.edu.pe',
  'ctuppia@pucp.edu.pe',
  'rosasrodriguezjean@gmail.com',
  'lmpacherresv@unac.edu.pe',
  'delgado.cg@pucp.edu.pe',
  'alexf.lamas@pucp.pe',
  'magno.puma@pucp.edu.pe',
  'jesus.galvez@redastrum.org',
  'jassercarranza@gmail.com',
  'alvaronm125.125@gmail.com',
  'yatacoantonio0312@gmail.com',
  'arianabr.abr@gmail.com',
  'rsimonlozano@gmail.com',
  'misari.r@pucp.edu.pe',
  'a20192368@pucp.edu.pe',
  'a20210494@pucp.edu.pe',
  'juan.gonzalesc@pucp.edu.pe',
  'a20203698@pucp.edu.pe',
  'carlos.borja@pucp.edu.pe',
  'a20172572@pucp.edu.pe'
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
  SELECT '1INF33' AS course_code, 'scuro@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1INF25' AS course_code, 'salexrenato@gmail.com' AS professor_email
  UNION ALL SELECT '1INF27' AS course_code, 'sebastiangallegosmostajo@gmail.com' AS professor_email
  UNION ALL SELECT '1IND51' AS course_code, 'a20222027@pucp.edu.pe' AS professor_email
  UNION ALL SELECT 'IND231' AS course_code, 'a20222027@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1MAT08' AS course_code, 'ctuppia@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1MAT09' AS course_code, 'rosasrodriguezjean@gmail.com' AS professor_email
  UNION ALL SELECT '1MAT07' AS course_code, 'lmpacherresv@unac.edu.pe' AS professor_email
  UNION ALL SELECT '1MAT05' AS course_code, 'delgado.cg@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1MAT06' AS course_code, 'alexf.lamas@pucp.pe' AS professor_email
  UNION ALL SELECT '1MAT04' AS course_code, 'magno.puma@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1FIS01' AS course_code, 'jesus.galvez@redastrum.org' AS professor_email
  UNION ALL SELECT '1FIS02' AS course_code, 'delgado.cg@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1FIS04' AS course_code, 'jassercarranza@gmail.com' AS professor_email
  UNION ALL SELECT '1FIS06' AS course_code, 'alvaronm125.125@gmail.com' AS professor_email
  UNION ALL SELECT '1INF01' AS course_code, 'yatacoantonio0312@gmail.com' AS professor_email
  UNION ALL SELECT 'INF134' AS course_code, 'arianabr.abr@gmail.com' AS professor_email
  UNION ALL SELECT '1QUI01' AS course_code, 'rsimonlozano@gmail.com' AS professor_email
  UNION ALL SELECT '1ING02' AS course_code, 'misari.r@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1CIV42' AS course_code, 'a20192368@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1MAT25' AS course_code, 'a20210494@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1MAT26' AS course_code, 'juan.gonzalesc@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1MAT27' AS course_code, 'a20203698@pucp.edu.pe' AS professor_email
  UNION ALL SELECT 'MAT155' AS course_code, 'carlos.borja@pucp.edu.pe' AS professor_email
  UNION ALL SELECT 'LIN126' AS course_code, 'a20172572@pucp.edu.pe' AS professor_email
  UNION ALL SELECT 'HUM121' AS course_code, 'a20172572@pucp.edu.pe' AS professor_email
  UNION ALL SELECT 'INT130' AS course_code, 'a20172572@pucp.edu.pe' AS professor_email
  UNION ALL SELECT '1EST10' AS course_code, 'carlos.borja@pucp.edu.pe' AS professor_email
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
  'scuro@pucp.edu.pe',
  'salexrenato@gmail.com',
  'sebastiangallegosmostajo@gmail.com',
  'a20222027@pucp.edu.pe',
  'ctuppia@pucp.edu.pe',
  'rosasrodriguezjean@gmail.com',
  'lmpacherresv@unac.edu.pe',
  'delgado.cg@pucp.edu.pe',
  'alexf.lamas@pucp.pe',
  'magno.puma@pucp.edu.pe',
  'jesus.galvez@redastrum.org',
  'jassercarranza@gmail.com',
  'alvaronm125.125@gmail.com',
  'yatacoantonio0312@gmail.com',
  'arianabr.abr@gmail.com',
  'rsimonlozano@gmail.com',
  'misari.r@pucp.edu.pe',
  'a20192368@pucp.edu.pe',
  'a20210494@pucp.edu.pe',
  'juan.gonzalesc@pucp.edu.pe',
  'a20203698@pucp.edu.pe',
  'carlos.borja@pucp.edu.pe',
  'a20172572@pucp.edu.pe'
);

SELECT COUNT(*) AS total_professor_assignments_for_active_cycle
FROM course_cycle_professor ccp
INNER JOIN course_cycle cc ON cc.id = ccp.course_cycle_id
WHERE cc.academic_cycle_id = @active_cycle_id;
