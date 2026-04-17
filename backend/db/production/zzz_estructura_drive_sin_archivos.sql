-- ============================================================================
-- ESTRUCTURA DRIVE (SIN ARCHIVOS)
-- - Crea estructura lógica necesaria para producción sin cargar file_resource/material/material_version
-- - Incluye ciclos históricos ya presentes en BD
-- - Crea evaluación técnica BANCO_ENUNCIADOS (number=0) requerida por endpoint bank-structure
--   sin cargar archivos ni tratarla como evaluación de contenido de alumnos
-- ============================================================================

SET @workspace_domain = 'academiapasalo.com';

SET @folder_status_active_id = (
  SELECT fs.id
  FROM folder_status fs
  WHERE fs.code = 'ACTIVE'
  LIMIT 1
);

SET @evaluation_type_banco_id = (
  SELECT et.id
  FROM evaluation_type et
  WHERE et.code = 'BANCO_ENUNCIADOS'
  LIMIT 1
);

SET @actor_user_id = COALESCE(
  (
    SELECT u.id
    FROM user u
    WHERE LOWER(TRIM(u.email)) = 'admin@academiapasalo.com'
    LIMIT 1
  ),
  (
    SELECT u.id
    FROM user u
    INNER JOIN user_role ur ON ur.user_id = u.id
    INNER JOIN role r ON r.id = ur.role_id
    WHERE r.code = 'SUPER_ADMIN'
    ORDER BY u.id ASC
    LIMIT 1
  ),
  (
    SELECT u.id
    FROM user u
    ORDER BY u.id ASC
    LIMIT 1
  )
);

-- 0) Evaluación técnica de BANCO_ENUNCIADOS por curso-ciclo (requerida por endpoint bank-structure)
INSERT INTO evaluation (course_cycle_id, evaluation_type_id, number, start_date, end_date)
SELECT
  cc.id,
  @evaluation_type_banco_id,
  0,
  ac.start_date,
  ac.end_date
FROM course_cycle cc
INNER JOIN academic_cycle ac
  ON ac.id = cc.academic_cycle_id
WHERE @evaluation_type_banco_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM evaluation e
    WHERE e.course_cycle_id = cc.id
      AND e.evaluation_type_id = @evaluation_type_banco_id
      AND e.number = 0
  );

-- 0.1) Raíces de banco por tipo de evaluación (EX, PC, LAB, etc.)
INSERT INTO material_folder (
  evaluation_id,
  parent_folder_id,
  folder_status_id,
  name,
  visible_from,
  visible_until,
  created_by,
  created_at,
  updated_at
)
SELECT
  t.bank_evaluation_id AS evaluation_id,
  NULL AS parent_folder_id,
  @folder_status_active_id,
  t.group_folder_name AS name,
  NULL,
  NULL,
  @actor_user_id,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT
    bank.id AS bank_evaluation_id,
    CASE UPPER(TRIM(et.code))
      WHEN 'EX' THEN 'Examenes'
      WHEN 'PC' THEN 'Practicas Calificadas'
      WHEN 'LAB' THEN 'Laboratorios'
      WHEN 'PD' THEN 'Practicas Dirigidas'
      WHEN 'TUTORING' THEN 'Tutorias Especializadas'
      ELSE TRIM(et.name)
    END AS group_folder_name
  FROM evaluation bank
  INNER JOIN evaluation_type et_bank
    ON et_bank.id = bank.evaluation_type_id
   AND et_bank.code = 'BANCO_ENUNCIADOS'
  INNER JOIN evaluation ev
    ON ev.course_cycle_id = bank.course_cycle_id
  INNER JOIN evaluation_type et
    ON et.id = ev.evaluation_type_id
  WHERE UPPER(TRIM(et.code)) <> 'BANCO_ENUNCIADOS'
) t
WHERE @folder_status_active_id IS NOT NULL
  AND @actor_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM material_folder mf
    WHERE mf.evaluation_id = t.bank_evaluation_id
      AND mf.parent_folder_id IS NULL
      AND mf.name = t.group_folder_name
  );

-- 0.2) Hojas de banco por evaluación (EX1, EX2, PC1, LAB1, etc.)
INSERT INTO material_folder (
  evaluation_id,
  parent_folder_id,
  folder_status_id,
  name,
  visible_from,
  visible_until,
  created_by,
  created_at,
  updated_at
)
SELECT
  bank.id AS evaluation_id,
  root.id AS parent_folder_id,
  @folder_status_active_id,
  CONCAT(UPPER(TRIM(et.code)), ev.number) AS name,
  NULL,
  NULL,
  @actor_user_id,
  NOW(),
  NOW()
FROM evaluation bank
INNER JOIN evaluation_type et_bank
  ON et_bank.id = bank.evaluation_type_id
 AND et_bank.code = 'BANCO_ENUNCIADOS'
INNER JOIN evaluation ev
  ON ev.course_cycle_id = bank.course_cycle_id
INNER JOIN evaluation_type et
  ON et.id = ev.evaluation_type_id
INNER JOIN material_folder root
  ON root.evaluation_id = bank.id
 AND root.parent_folder_id IS NULL
 AND root.name = CASE UPPER(TRIM(et.code))
   WHEN 'EX' THEN 'Examenes'
   WHEN 'PC' THEN 'Practicas Calificadas'
   WHEN 'LAB' THEN 'Laboratorios'
   WHEN 'PD' THEN 'Practicas Dirigidas'
   WHEN 'TUTORING' THEN 'Tutorias Especializadas'
   ELSE TRIM(et.name)
 END
WHERE UPPER(TRIM(et.code)) <> 'BANCO_ENUNCIADOS'
  AND ev.number IS NOT NULL
  AND ev.number > 0
  AND @folder_status_active_id IS NOT NULL
  AND @actor_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM material_folder mf
    WHERE mf.parent_folder_id = root.id
      AND mf.name = CONCAT(UPPER(TRIM(et.code)), ev.number)
  );

-- 1) Estructura de acceso Drive por evaluación (EXCLUYE BANCO_ENUNCIADOS)
--    Sin IDs reales de carpetas ni grupos (solo estructura en BD, pendiente de provisionamiento real)
INSERT INTO evaluation_drive_access (
  evaluation_id,
  scope_key,
  drive_scope_folder_id,
  drive_videos_folder_id,
  drive_documents_folder_id,
  drive_archived_folder_id,
  viewer_group_email,
  viewer_group_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  ev.id AS evaluation_id,
  CONCAT('ev_', ev.id) AS scope_key,
  NULL AS drive_scope_folder_id,
  NULL AS drive_videos_folder_id,
  NULL AS drive_documents_folder_id,
  NULL AS drive_archived_folder_id,
  CONCAT('ev-', ev.id, '-viewers@', @workspace_domain) AS viewer_group_email,
  NULL AS viewer_group_id,
  FALSE AS is_active,
  NOW() AS created_at,
  NULL AS updated_at
FROM evaluation ev
INNER JOIN evaluation_type et
  ON et.id = ev.evaluation_type_id
WHERE et.code <> 'BANCO_ENUNCIADOS'
  AND NOT EXISTS (
    SELECT 1
    FROM evaluation_drive_access eda
    WHERE eda.evaluation_id = ev.id
  );

-- 2) Estructura de carpetas para material adicional (sin archivos)
INSERT INTO material_folder (
  evaluation_id,
  parent_folder_id,
  folder_status_id,
  name,
  visible_from,
  visible_until,
  created_by,
  created_at,
  updated_at
)
SELECT
  ev.id,
  NULL,
  @folder_status_active_id,
  'Material adicional',
  NULL,
  NULL,
  @actor_user_id,
  NOW(),
  NOW()
FROM evaluation ev
INNER JOIN evaluation_type et
  ON et.id = ev.evaluation_type_id
WHERE et.code <> 'BANCO_ENUNCIADOS'
  AND @folder_status_active_id IS NOT NULL
  AND @actor_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM material_folder mf
    WHERE mf.evaluation_id = ev.id
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Material adicional'
  );

-- 2.1) Subcarpeta "Resumenes" dentro de "Material adicional"
INSERT INTO material_folder (
  evaluation_id,
  parent_folder_id,
  folder_status_id,
  name,
  visible_from,
  visible_until,
  created_by,
  created_at,
  updated_at
)
SELECT
  root.evaluation_id,
  root.id AS parent_folder_id,
  @folder_status_active_id,
  'Resumenes',
  NULL,
  NULL,
  @actor_user_id,
  NOW(),
  NOW()
FROM material_folder root
INNER JOIN evaluation ev
  ON ev.id = root.evaluation_id
INNER JOIN evaluation_type et
  ON et.id = ev.evaluation_type_id
WHERE et.code <> 'BANCO_ENUNCIADOS'
  AND root.parent_folder_id IS NULL
  AND root.name = 'Material adicional'
  AND @folder_status_active_id IS NOT NULL
  AND @actor_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM material_folder mf
    WHERE mf.parent_folder_id = root.id
      AND mf.name = 'Resumenes'
  );

-- 2.2) Subcarpeta "Enunciados" dentro de "Material adicional"
INSERT INTO material_folder (
  evaluation_id,
  parent_folder_id,
  folder_status_id,
  name,
  visible_from,
  visible_until,
  created_by,
  created_at,
  updated_at
)
SELECT
  root.evaluation_id,
  root.id AS parent_folder_id,
  @folder_status_active_id,
  'Enunciados',
  NULL,
  NULL,
  @actor_user_id,
  NOW(),
  NOW()
FROM material_folder root
INNER JOIN evaluation ev
  ON ev.id = root.evaluation_id
INNER JOIN evaluation_type et
  ON et.id = ev.evaluation_type_id
WHERE et.code <> 'BANCO_ENUNCIADOS'
  AND root.parent_folder_id IS NULL
  AND root.name = 'Material adicional'
  AND @folder_status_active_id IS NOT NULL
  AND @actor_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM material_folder mf
    WHERE mf.parent_folder_id = root.id
      AND mf.name = 'Enunciados'
  );

-- Verificaciones rápidas
SELECT COUNT(*) AS total_evaluation_drive_access_no_banco
FROM evaluation_drive_access eda
INNER JOIN evaluation ev ON ev.id = eda.evaluation_id
INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
WHERE et.code <> 'BANCO_ENUNCIADOS';

SELECT COUNT(*) AS total_material_adicional_root_folders
FROM material_folder mf
INNER JOIN evaluation ev ON ev.id = mf.evaluation_id
INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
WHERE et.code <> 'BANCO_ENUNCIADOS'
  AND mf.parent_folder_id IS NULL
  AND mf.name = 'Material adicional';

SELECT COUNT(*) AS total_banco_tecnico_evaluations
FROM evaluation ev
INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
WHERE et.code = 'BANCO_ENUNCIADOS'
  AND ev.number = 0;

SELECT COUNT(*) AS total_banco_root_folders
FROM material_folder mf
INNER JOIN evaluation ev ON ev.id = mf.evaluation_id
INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
WHERE et.code = 'BANCO_ENUNCIADOS'
  AND mf.parent_folder_id IS NULL;

SELECT COUNT(*) AS total_banco_leaf_folders
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN evaluation ev ON ev.id = root.evaluation_id
INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
WHERE et.code = 'BANCO_ENUNCIADOS';

SELECT COUNT(*) AS total_material_adicional_subfolders
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN evaluation ev ON ev.id = root.evaluation_id
INNER JOIN evaluation_type et ON et.id = ev.evaluation_type_id
WHERE et.code <> 'BANCO_ENUNCIADOS'
  AND root.name = 'Material adicional'
  AND mf.name IN ('Resumenes', 'Enunciados');
