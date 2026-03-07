-- Seed SQL: banco de enunciados con archivos de Google Drive
-- Generado automaticamente desde estado actual de Drive + BD
SET NAMES utf8mb4;
SET @actor_user_id = 1;
SET @folder_status_active = (SELECT id FROM folder_status WHERE code = 'ACTIVE' LIMIT 1);
SET @material_status_active = (SELECT id FROM material_status WHERE code = 'ACTIVE' LIMIT 1);
SET @evaluation_type_banco = (SELECT id FROM evaluation_type WHERE code = 'BANCO_ENUNCIADOS' LIMIT 1);

-- course_cycle 17 (QUI101 - 2026-0)
INSERT INTO evaluation (course_cycle_id, evaluation_type_id, number, start_date, end_date)
SELECT
  17,
  @evaluation_type_banco,
  0,
  (SELECT ac.start_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = 17 LIMIT 1),
  (SELECT ac.end_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = 17 LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM evaluation e
  WHERE e.course_cycle_id = 17 AND e.evaluation_type_id = @evaluation_type_banco AND e.number = 0
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Practicas Calificadas',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Practicas Calificadas'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Practicas Dirigidas',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Practicas Dirigidas'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Examenes',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Examenes'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1mkaEqyfKkkuE1j5pHfTTCnl3a9qZPF3S',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1mkaEqyfKkkuE1j5pHfTTCnl3a9qZPF3S',
  'https://docs.google.com/document/d/1mkaEqyfKkkuE1j5pHfTTCnl3a9qZPF3S/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1mkaEqyfKkkuE1j5pHfTTCnl3a9qZPF3S'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1mkaEqyfKkkuE1j5pHfTTCnl3a9qZPF3S/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1mkaEqyfKkkuE1j5pHfTTCnl3a9qZPF3S'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1mkaEqyfKkkuE1j5pHfTTCnl3a9qZPF3S'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1YNpVd_xa9ARBrhy0s71yiy6Hl2Q4dX9d',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1YNpVd_xa9ARBrhy0s71yiy6Hl2Q4dX9d',
  'https://drive.google.com/file/d/1YNpVd_xa9ARBrhy0s71yiy6Hl2Q4dX9d/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1YNpVd_xa9ARBrhy0s71yiy6Hl2Q4dX9d'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1YNpVd_xa9ARBrhy0s71yiy6Hl2Q4dX9d/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1YNpVd_xa9ARBrhy0s71yiy6Hl2Q4dX9d'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1YNpVd_xa9ARBrhy0s71yiy6Hl2Q4dX9d'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1H_wPh90jpmYKo4VHaG6otIdRQ4NoiYYg',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1H_wPh90jpmYKo4VHaG6otIdRQ4NoiYYg',
  'https://drive.google.com/file/d/1H_wPh90jpmYKo4VHaG6otIdRQ4NoiYYg/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1H_wPh90jpmYKo4VHaG6otIdRQ4NoiYYg'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1H_wPh90jpmYKo4VHaG6otIdRQ4NoiYYg/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1H_wPh90jpmYKo4VHaG6otIdRQ4NoiYYg'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1H_wPh90jpmYKo4VHaG6otIdRQ4NoiYYg'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1EaoWiE_J4REM_wlBdD1-HL3O6D30Ef4-',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1EaoWiE_J4REM_wlBdD1-HL3O6D30Ef4-',
  'https://docs.google.com/document/d/1EaoWiE_J4REM_wlBdD1-HL3O6D30Ef4-/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EaoWiE_J4REM_wlBdD1-HL3O6D30Ef4-'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1EaoWiE_J4REM_wlBdD1-HL3O6D30Ef4-/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EaoWiE_J4REM_wlBdD1-HL3O6D30Ef4-'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EaoWiE_J4REM_wlBdD1-HL3O6D30Ef4-'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1DiRXCmxcHXCo_8M2VAhDPbmodqGLTRT-',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1DiRXCmxcHXCo_8M2VAhDPbmodqGLTRT-',
  'https://drive.google.com/file/d/1DiRXCmxcHXCo_8M2VAhDPbmodqGLTRT-/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DiRXCmxcHXCo_8M2VAhDPbmodqGLTRT-'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1DiRXCmxcHXCo_8M2VAhDPbmodqGLTRT-/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DiRXCmxcHXCo_8M2VAhDPbmodqGLTRT-'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DiRXCmxcHXCo_8M2VAhDPbmodqGLTRT-'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-138t-ItuJeCmWQHTXK3BEfon06yljv1cT',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '138t-ItuJeCmWQHTXK3BEfon06yljv1cT',
  'https://drive.google.com/file/d/138t-ItuJeCmWQHTXK3BEfon06yljv1cT/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '138t-ItuJeCmWQHTXK3BEfon06yljv1cT'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/138t-ItuJeCmWQHTXK3BEfon06yljv1cT/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '138t-ItuJeCmWQHTXK3BEfon06yljv1cT'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '138t-ItuJeCmWQHTXK3BEfon06yljv1cT'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-16klM1hlZprtY92e5AEvH70yyLUlI6gUK',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '16klM1hlZprtY92e5AEvH70yyLUlI6gUK',
  'https://docs.google.com/document/d/16klM1hlZprtY92e5AEvH70yyLUlI6gUK/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16klM1hlZprtY92e5AEvH70yyLUlI6gUK'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/16klM1hlZprtY92e5AEvH70yyLUlI6gUK/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16klM1hlZprtY92e5AEvH70yyLUlI6gUK'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16klM1hlZprtY92e5AEvH70yyLUlI6gUK'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1JYg2271h1t2VboHC3cUv20Pz11f9aqKc',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1JYg2271h1t2VboHC3cUv20Pz11f9aqKc',
  'https://drive.google.com/file/d/1JYg2271h1t2VboHC3cUv20Pz11f9aqKc/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JYg2271h1t2VboHC3cUv20Pz11f9aqKc'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1JYg2271h1t2VboHC3cUv20Pz11f9aqKc/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JYg2271h1t2VboHC3cUv20Pz11f9aqKc'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JYg2271h1t2VboHC3cUv20Pz11f9aqKc'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-14teUePIHue2vB5xx4RbL-1m6q8iT_gUg',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '14teUePIHue2vB5xx4RbL-1m6q8iT_gUg',
  'https://drive.google.com/file/d/14teUePIHue2vB5xx4RbL-1m6q8iT_gUg/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '14teUePIHue2vB5xx4RbL-1m6q8iT_gUg'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/14teUePIHue2vB5xx4RbL-1m6q8iT_gUg/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '14teUePIHue2vB5xx4RbL-1m6q8iT_gUg'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '14teUePIHue2vB5xx4RbL-1m6q8iT_gUg'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1Mv4oRH02eNLafY0GevKlydbvwDNx3zJh',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1Mv4oRH02eNLafY0GevKlydbvwDNx3zJh',
  'https://docs.google.com/document/d/1Mv4oRH02eNLafY0GevKlydbvwDNx3zJh/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Mv4oRH02eNLafY0GevKlydbvwDNx3zJh'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1Mv4oRH02eNLafY0GevKlydbvwDNx3zJh/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Mv4oRH02eNLafY0GevKlydbvwDNx3zJh'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Mv4oRH02eNLafY0GevKlydbvwDNx3zJh'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1ZawJfMPICmeVBkwRA5prlPCTI_-1A5zv',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1ZawJfMPICmeVBkwRA5prlPCTI_-1A5zv',
  'https://drive.google.com/file/d/1ZawJfMPICmeVBkwRA5prlPCTI_-1A5zv/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZawJfMPICmeVBkwRA5prlPCTI_-1A5zv'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1ZawJfMPICmeVBkwRA5prlPCTI_-1A5zv/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZawJfMPICmeVBkwRA5prlPCTI_-1A5zv'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZawJfMPICmeVBkwRA5prlPCTI_-1A5zv'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-14NU8ttBHYVIKKIDcRnONFNpRYJdVyhhs',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '14NU8ttBHYVIKKIDcRnONFNpRYJdVyhhs',
  'https://drive.google.com/file/d/14NU8ttBHYVIKKIDcRnONFNpRYJdVyhhs/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '14NU8ttBHYVIKKIDcRnONFNpRYJdVyhhs'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/14NU8ttBHYVIKKIDcRnONFNpRYJdVyhhs/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '14NU8ttBHYVIKKIDcRnONFNpRYJdVyhhs'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '14NU8ttBHYVIKKIDcRnONFNpRYJdVyhhs'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1ebxUH2suOajwgxe9DrhUO-p2S97bkUuh',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1ebxUH2suOajwgxe9DrhUO-p2S97bkUuh',
  'https://docs.google.com/document/d/1ebxUH2suOajwgxe9DrhUO-p2S97bkUuh/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ebxUH2suOajwgxe9DrhUO-p2S97bkUuh'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1ebxUH2suOajwgxe9DrhUO-p2S97bkUuh/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ebxUH2suOajwgxe9DrhUO-p2S97bkUuh'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ebxUH2suOajwgxe9DrhUO-p2S97bkUuh'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1X2RuobWvYFMBd189HVHjT4QmHrXahGGJ',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1X2RuobWvYFMBd189HVHjT4QmHrXahGGJ',
  'https://drive.google.com/file/d/1X2RuobWvYFMBd189HVHjT4QmHrXahGGJ/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1X2RuobWvYFMBd189HVHjT4QmHrXahGGJ'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1X2RuobWvYFMBd189HVHjT4QmHrXahGGJ/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1X2RuobWvYFMBd189HVHjT4QmHrXahGGJ'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1X2RuobWvYFMBd189HVHjT4QmHrXahGGJ'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-18MIV9jL-7ONrMQb9YYDsNJnH8Nu5Wpgo',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '18MIV9jL-7ONrMQb9YYDsNJnH8Nu5Wpgo',
  'https://drive.google.com/file/d/18MIV9jL-7ONrMQb9YYDsNJnH8Nu5Wpgo/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '18MIV9jL-7ONrMQb9YYDsNJnH8Nu5Wpgo'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/18MIV9jL-7ONrMQb9YYDsNJnH8Nu5Wpgo/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '18MIV9jL-7ONrMQb9YYDsNJnH8Nu5Wpgo'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '18MIV9jL-7ONrMQb9YYDsNJnH8Nu5Wpgo'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1hNc-Se7cTBRw58WKqOwmlH__3pzgEhER',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1hNc-Se7cTBRw58WKqOwmlH__3pzgEhER',
  'https://docs.google.com/document/d/1hNc-Se7cTBRw58WKqOwmlH__3pzgEhER/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hNc-Se7cTBRw58WKqOwmlH__3pzgEhER'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1hNc-Se7cTBRw58WKqOwmlH__3pzgEhER/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hNc-Se7cTBRw58WKqOwmlH__3pzgEhER'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hNc-Se7cTBRw58WKqOwmlH__3pzgEhER'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1CzBasBxxrgV2sFIftdWoVFymE7Yq_Upi',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1CzBasBxxrgV2sFIftdWoVFymE7Yq_Upi',
  'https://drive.google.com/file/d/1CzBasBxxrgV2sFIftdWoVFymE7Yq_Upi/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CzBasBxxrgV2sFIftdWoVFymE7Yq_Upi'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1CzBasBxxrgV2sFIftdWoVFymE7Yq_Upi/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CzBasBxxrgV2sFIftdWoVFymE7Yq_Upi'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CzBasBxxrgV2sFIftdWoVFymE7Yq_Upi'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1m_SeDqgUAqoIVRAcevnyQhws9cEMigJk',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1m_SeDqgUAqoIVRAcevnyQhws9cEMigJk',
  'https://drive.google.com/file/d/1m_SeDqgUAqoIVRAcevnyQhws9cEMigJk/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m_SeDqgUAqoIVRAcevnyQhws9cEMigJk'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1m_SeDqgUAqoIVRAcevnyQhws9cEMigJk/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m_SeDqgUAqoIVRAcevnyQhws9cEMigJk'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m_SeDqgUAqoIVRAcevnyQhws9cEMigJk'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC4',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC4'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1mNts2JpQeEtT1w1qesoxzvSopVwGn8dV',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1mNts2JpQeEtT1w1qesoxzvSopVwGn8dV',
  'https://docs.google.com/document/d/1mNts2JpQeEtT1w1qesoxzvSopVwGn8dV/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1mNts2JpQeEtT1w1qesoxzvSopVwGn8dV'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1mNts2JpQeEtT1w1qesoxzvSopVwGn8dV/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1mNts2JpQeEtT1w1qesoxzvSopVwGn8dV'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1mNts2JpQeEtT1w1qesoxzvSopVwGn8dV'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1JlT_hNXPZGVrkP-ejnFlrmfQP2O1dnFj',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1JlT_hNXPZGVrkP-ejnFlrmfQP2O1dnFj',
  'https://drive.google.com/file/d/1JlT_hNXPZGVrkP-ejnFlrmfQP2O1dnFj/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JlT_hNXPZGVrkP-ejnFlrmfQP2O1dnFj'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1JlT_hNXPZGVrkP-ejnFlrmfQP2O1dnFj/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JlT_hNXPZGVrkP-ejnFlrmfQP2O1dnFj'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JlT_hNXPZGVrkP-ejnFlrmfQP2O1dnFj'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1txQOfVgoRUdcgAHiDYD288ZAZ82fBU71',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1txQOfVgoRUdcgAHiDYD288ZAZ82fBU71',
  'https://drive.google.com/file/d/1txQOfVgoRUdcgAHiDYD288ZAZ82fBU71/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1txQOfVgoRUdcgAHiDYD288ZAZ82fBU71'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1txQOfVgoRUdcgAHiDYD288ZAZ82fBU71/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1txQOfVgoRUdcgAHiDYD288ZAZ82fBU71'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1txQOfVgoRUdcgAHiDYD288ZAZ82fBU71'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-19P-xetkTpPQ5I2PZBGOhaQE1RBBHBeD4',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '19P-xetkTpPQ5I2PZBGOhaQE1RBBHBeD4',
  'https://docs.google.com/document/d/19P-xetkTpPQ5I2PZBGOhaQE1RBBHBeD4/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '19P-xetkTpPQ5I2PZBGOhaQE1RBBHBeD4'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/19P-xetkTpPQ5I2PZBGOhaQE1RBBHBeD4/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '19P-xetkTpPQ5I2PZBGOhaQE1RBBHBeD4'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '19P-xetkTpPQ5I2PZBGOhaQE1RBBHBeD4'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1BWWr4D6_AXXSbVrjVkgDxyohi2e1c6d_',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1BWWr4D6_AXXSbVrjVkgDxyohi2e1c6d_',
  'https://drive.google.com/file/d/1BWWr4D6_AXXSbVrjVkgDxyohi2e1c6d_/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1BWWr4D6_AXXSbVrjVkgDxyohi2e1c6d_'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1BWWr4D6_AXXSbVrjVkgDxyohi2e1c6d_/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1BWWr4D6_AXXSbVrjVkgDxyohi2e1c6d_'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1BWWr4D6_AXXSbVrjVkgDxyohi2e1c6d_'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1jK9i94B_966CWlQu4o8K9EXx9cSddCOT',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1jK9i94B_966CWlQu4o8K9EXx9cSddCOT',
  'https://drive.google.com/file/d/1jK9i94B_966CWlQu4o8K9EXx9cSddCOT/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jK9i94B_966CWlQu4o8K9EXx9cSddCOT'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1jK9i94B_966CWlQu4o8K9EXx9cSddCOT/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jK9i94B_966CWlQu4o8K9EXx9cSddCOT'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jK9i94B_966CWlQu4o8K9EXx9cSddCOT'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1M13R_VangQyBprULzn64Mr3oLhBqYGxN',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1M13R_VangQyBprULzn64Mr3oLhBqYGxN',
  'https://docs.google.com/document/d/1M13R_VangQyBprULzn64Mr3oLhBqYGxN/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1M13R_VangQyBprULzn64Mr3oLhBqYGxN'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1M13R_VangQyBprULzn64Mr3oLhBqYGxN/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1M13R_VangQyBprULzn64Mr3oLhBqYGxN'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1M13R_VangQyBprULzn64Mr3oLhBqYGxN'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1CPqaaZkvq1WOaSGcBfCCj_irqzUl1RJ2',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1CPqaaZkvq1WOaSGcBfCCj_irqzUl1RJ2',
  'https://drive.google.com/file/d/1CPqaaZkvq1WOaSGcBfCCj_irqzUl1RJ2/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CPqaaZkvq1WOaSGcBfCCj_irqzUl1RJ2'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1CPqaaZkvq1WOaSGcBfCCj_irqzUl1RJ2/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CPqaaZkvq1WOaSGcBfCCj_irqzUl1RJ2'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CPqaaZkvq1WOaSGcBfCCj_irqzUl1RJ2'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1y3Uzh_BAxr1QKEzyJP15ACt37vGnB3ME',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1y3Uzh_BAxr1QKEzyJP15ACt37vGnB3ME',
  'https://drive.google.com/file/d/1y3Uzh_BAxr1QKEzyJP15ACt37vGnB3ME/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1y3Uzh_BAxr1QKEzyJP15ACt37vGnB3ME'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1y3Uzh_BAxr1QKEzyJP15ACt37vGnB3ME/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1y3Uzh_BAxr1QKEzyJP15ACt37vGnB3ME'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1y3Uzh_BAxr1QKEzyJP15ACt37vGnB3ME'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1wF356xf_bgkkAGPZ0mjZJ2lliVcVZI3n',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1wF356xf_bgkkAGPZ0mjZJ2lliVcVZI3n',
  'https://docs.google.com/document/d/1wF356xf_bgkkAGPZ0mjZJ2lliVcVZI3n/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1wF356xf_bgkkAGPZ0mjZJ2lliVcVZI3n'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1wF356xf_bgkkAGPZ0mjZJ2lliVcVZI3n/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1wF356xf_bgkkAGPZ0mjZJ2lliVcVZI3n'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1wF356xf_bgkkAGPZ0mjZJ2lliVcVZI3n'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1aRW9gU_sxN8HGGPQ_c2IxhkMcpDCvBmf',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1aRW9gU_sxN8HGGPQ_c2IxhkMcpDCvBmf',
  'https://drive.google.com/file/d/1aRW9gU_sxN8HGGPQ_c2IxhkMcpDCvBmf/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1aRW9gU_sxN8HGGPQ_c2IxhkMcpDCvBmf'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1aRW9gU_sxN8HGGPQ_c2IxhkMcpDCvBmf/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1aRW9gU_sxN8HGGPQ_c2IxhkMcpDCvBmf'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1aRW9gU_sxN8HGGPQ_c2IxhkMcpDCvBmf'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1Vy3pJYUhrrcR0lJcnmFn-FjIDaXeLHQT',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1Vy3pJYUhrrcR0lJcnmFn-FjIDaXeLHQT',
  'https://drive.google.com/file/d/1Vy3pJYUhrrcR0lJcnmFn-FjIDaXeLHQT/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Vy3pJYUhrrcR0lJcnmFn-FjIDaXeLHQT'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1Vy3pJYUhrrcR0lJcnmFn-FjIDaXeLHQT/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Vy3pJYUhrrcR0lJcnmFn-FjIDaXeLHQT'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Vy3pJYUhrrcR0lJcnmFn-FjIDaXeLHQT'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD4',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD4'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1NDFYi1_eSyBRQO8PDCI-gHVYsZraNPd2',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1NDFYi1_eSyBRQO8PDCI-gHVYsZraNPd2',
  'https://docs.google.com/document/d/1NDFYi1_eSyBRQO8PDCI-gHVYsZraNPd2/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1NDFYi1_eSyBRQO8PDCI-gHVYsZraNPd2'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1NDFYi1_eSyBRQO8PDCI-gHVYsZraNPd2/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1NDFYi1_eSyBRQO8PDCI-gHVYsZraNPd2'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1NDFYi1_eSyBRQO8PDCI-gHVYsZraNPd2'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-19NL4oRwNhkdXWjxF3CW1Lls4UZyrq3sD',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '19NL4oRwNhkdXWjxF3CW1Lls4UZyrq3sD',
  'https://drive.google.com/file/d/19NL4oRwNhkdXWjxF3CW1Lls4UZyrq3sD/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '19NL4oRwNhkdXWjxF3CW1Lls4UZyrq3sD'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/19NL4oRwNhkdXWjxF3CW1Lls4UZyrq3sD/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '19NL4oRwNhkdXWjxF3CW1Lls4UZyrq3sD'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '19NL4oRwNhkdXWjxF3CW1Lls4UZyrq3sD'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1AgAMzXONp1BfU8EXvQoU69DHaB5BGvEY',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1AgAMzXONp1BfU8EXvQoU69DHaB5BGvEY',
  'https://drive.google.com/file/d/1AgAMzXONp1BfU8EXvQoU69DHaB5BGvEY/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1AgAMzXONp1BfU8EXvQoU69DHaB5BGvEY'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1AgAMzXONp1BfU8EXvQoU69DHaB5BGvEY/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1AgAMzXONp1BfU8EXvQoU69DHaB5BGvEY'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1AgAMzXONp1BfU8EXvQoU69DHaB5BGvEY'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 17
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );


-- course_cycle 18 (FIS101 - 2026-0)
INSERT INTO evaluation (course_cycle_id, evaluation_type_id, number, start_date, end_date)
SELECT
  18,
  @evaluation_type_banco,
  0,
  (SELECT ac.start_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = 18 LIMIT 1),
  (SELECT ac.end_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = 18 LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM evaluation e
  WHERE e.course_cycle_id = 18 AND e.evaluation_type_id = @evaluation_type_banco AND e.number = 0
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Practicas Calificadas',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Practicas Calificadas'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Practicas Dirigidas',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Practicas Dirigidas'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Examenes',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Examenes'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1MEApKj0oMLM0PVrcqlwKDKvIm7guUpVH',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1MEApKj0oMLM0PVrcqlwKDKvIm7guUpVH',
  'https://docs.google.com/document/d/1MEApKj0oMLM0PVrcqlwKDKvIm7guUpVH/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MEApKj0oMLM0PVrcqlwKDKvIm7guUpVH'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1MEApKj0oMLM0PVrcqlwKDKvIm7guUpVH/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MEApKj0oMLM0PVrcqlwKDKvIm7guUpVH'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MEApKj0oMLM0PVrcqlwKDKvIm7guUpVH'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1ncv3rG_cgY3lVOvVwTyGnhjgnG3CUiXo',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1ncv3rG_cgY3lVOvVwTyGnhjgnG3CUiXo',
  'https://drive.google.com/file/d/1ncv3rG_cgY3lVOvVwTyGnhjgnG3CUiXo/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ncv3rG_cgY3lVOvVwTyGnhjgnG3CUiXo'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1ncv3rG_cgY3lVOvVwTyGnhjgnG3CUiXo/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ncv3rG_cgY3lVOvVwTyGnhjgnG3CUiXo'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ncv3rG_cgY3lVOvVwTyGnhjgnG3CUiXo'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1zEJXNiW1qA8A91eOvGRE0Bwd75RubO2F',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1zEJXNiW1qA8A91eOvGRE0Bwd75RubO2F',
  'https://drive.google.com/file/d/1zEJXNiW1qA8A91eOvGRE0Bwd75RubO2F/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1zEJXNiW1qA8A91eOvGRE0Bwd75RubO2F'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1zEJXNiW1qA8A91eOvGRE0Bwd75RubO2F/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1zEJXNiW1qA8A91eOvGRE0Bwd75RubO2F'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1zEJXNiW1qA8A91eOvGRE0Bwd75RubO2F'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1f7Lqjt22tIRIgbmi-g6IRzp0lLrr5QtE',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1f7Lqjt22tIRIgbmi-g6IRzp0lLrr5QtE',
  'https://docs.google.com/document/d/1f7Lqjt22tIRIgbmi-g6IRzp0lLrr5QtE/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1f7Lqjt22tIRIgbmi-g6IRzp0lLrr5QtE'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1f7Lqjt22tIRIgbmi-g6IRzp0lLrr5QtE/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1f7Lqjt22tIRIgbmi-g6IRzp0lLrr5QtE'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1f7Lqjt22tIRIgbmi-g6IRzp0lLrr5QtE'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1EfSmm8A_89kMs1OzHaIapZwRRHGpXl-b',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1EfSmm8A_89kMs1OzHaIapZwRRHGpXl-b',
  'https://drive.google.com/file/d/1EfSmm8A_89kMs1OzHaIapZwRRHGpXl-b/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EfSmm8A_89kMs1OzHaIapZwRRHGpXl-b'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1EfSmm8A_89kMs1OzHaIapZwRRHGpXl-b/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EfSmm8A_89kMs1OzHaIapZwRRHGpXl-b'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EfSmm8A_89kMs1OzHaIapZwRRHGpXl-b'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1m5p70o_X6D7JGSYUQ_Euw46GiCBbZs-s',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1m5p70o_X6D7JGSYUQ_Euw46GiCBbZs-s',
  'https://drive.google.com/file/d/1m5p70o_X6D7JGSYUQ_Euw46GiCBbZs-s/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m5p70o_X6D7JGSYUQ_Euw46GiCBbZs-s'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1m5p70o_X6D7JGSYUQ_Euw46GiCBbZs-s/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m5p70o_X6D7JGSYUQ_Euw46GiCBbZs-s'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m5p70o_X6D7JGSYUQ_Euw46GiCBbZs-s'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-12GqKa7QWv3k9ntXjzdpWijAFijBHcThn',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '12GqKa7QWv3k9ntXjzdpWijAFijBHcThn',
  'https://docs.google.com/document/d/12GqKa7QWv3k9ntXjzdpWijAFijBHcThn/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '12GqKa7QWv3k9ntXjzdpWijAFijBHcThn'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/12GqKa7QWv3k9ntXjzdpWijAFijBHcThn/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '12GqKa7QWv3k9ntXjzdpWijAFijBHcThn'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '12GqKa7QWv3k9ntXjzdpWijAFijBHcThn'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-17pup6AoHXzinvW22nRfuXDLqpoB6QJ72',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '17pup6AoHXzinvW22nRfuXDLqpoB6QJ72',
  'https://drive.google.com/file/d/17pup6AoHXzinvW22nRfuXDLqpoB6QJ72/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17pup6AoHXzinvW22nRfuXDLqpoB6QJ72'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/17pup6AoHXzinvW22nRfuXDLqpoB6QJ72/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17pup6AoHXzinvW22nRfuXDLqpoB6QJ72'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17pup6AoHXzinvW22nRfuXDLqpoB6QJ72'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1Os6OlYFyqxEUiTD9T0VlWY5tPTvICuVg',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1Os6OlYFyqxEUiTD9T0VlWY5tPTvICuVg',
  'https://drive.google.com/file/d/1Os6OlYFyqxEUiTD9T0VlWY5tPTvICuVg/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Os6OlYFyqxEUiTD9T0VlWY5tPTvICuVg'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1Os6OlYFyqxEUiTD9T0VlWY5tPTvICuVg/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Os6OlYFyqxEUiTD9T0VlWY5tPTvICuVg'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Os6OlYFyqxEUiTD9T0VlWY5tPTvICuVg'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1ZMRfunk9BgIX4gco0EofaiXe4HG230ad',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1ZMRfunk9BgIX4gco0EofaiXe4HG230ad',
  'https://docs.google.com/document/d/1ZMRfunk9BgIX4gco0EofaiXe4HG230ad/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZMRfunk9BgIX4gco0EofaiXe4HG230ad'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1ZMRfunk9BgIX4gco0EofaiXe4HG230ad/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZMRfunk9BgIX4gco0EofaiXe4HG230ad'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZMRfunk9BgIX4gco0EofaiXe4HG230ad'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1KK48ma0kEM-QkjspfjX4P37lAMYTYIvb',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1KK48ma0kEM-QkjspfjX4P37lAMYTYIvb',
  'https://drive.google.com/file/d/1KK48ma0kEM-QkjspfjX4P37lAMYTYIvb/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1KK48ma0kEM-QkjspfjX4P37lAMYTYIvb'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1KK48ma0kEM-QkjspfjX4P37lAMYTYIvb/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1KK48ma0kEM-QkjspfjX4P37lAMYTYIvb'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1KK48ma0kEM-QkjspfjX4P37lAMYTYIvb'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1Pqo-eVaRmw99AH11Vx3or6xHlqW3cQbW',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1Pqo-eVaRmw99AH11Vx3or6xHlqW3cQbW',
  'https://drive.google.com/file/d/1Pqo-eVaRmw99AH11Vx3or6xHlqW3cQbW/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Pqo-eVaRmw99AH11Vx3or6xHlqW3cQbW'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1Pqo-eVaRmw99AH11Vx3or6xHlqW3cQbW/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Pqo-eVaRmw99AH11Vx3or6xHlqW3cQbW'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Pqo-eVaRmw99AH11Vx3or6xHlqW3cQbW'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1rdfEzAvWwU9JlK9xrgMBiDjRzS3befZv',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1rdfEzAvWwU9JlK9xrgMBiDjRzS3befZv',
  'https://docs.google.com/document/d/1rdfEzAvWwU9JlK9xrgMBiDjRzS3befZv/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rdfEzAvWwU9JlK9xrgMBiDjRzS3befZv'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1rdfEzAvWwU9JlK9xrgMBiDjRzS3befZv/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rdfEzAvWwU9JlK9xrgMBiDjRzS3befZv'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rdfEzAvWwU9JlK9xrgMBiDjRzS3befZv'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-17JbRtbI9XYoO-wYhFi6tR2hSwvHix9cl',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '17JbRtbI9XYoO-wYhFi6tR2hSwvHix9cl',
  'https://drive.google.com/file/d/17JbRtbI9XYoO-wYhFi6tR2hSwvHix9cl/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17JbRtbI9XYoO-wYhFi6tR2hSwvHix9cl'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/17JbRtbI9XYoO-wYhFi6tR2hSwvHix9cl/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17JbRtbI9XYoO-wYhFi6tR2hSwvHix9cl'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17JbRtbI9XYoO-wYhFi6tR2hSwvHix9cl'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1nwVIGWyVfCk0FBWLIIr2qPT6wdnC2sWF',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1nwVIGWyVfCk0FBWLIIr2qPT6wdnC2sWF',
  'https://drive.google.com/file/d/1nwVIGWyVfCk0FBWLIIr2qPT6wdnC2sWF/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nwVIGWyVfCk0FBWLIIr2qPT6wdnC2sWF'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1nwVIGWyVfCk0FBWLIIr2qPT6wdnC2sWF/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nwVIGWyVfCk0FBWLIIr2qPT6wdnC2sWF'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nwVIGWyVfCk0FBWLIIr2qPT6wdnC2sWF'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1UX-_XfYg8MXiCBRSDQW_mHSp_oCujSK7',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1UX-_XfYg8MXiCBRSDQW_mHSp_oCujSK7',
  'https://docs.google.com/document/d/1UX-_XfYg8MXiCBRSDQW_mHSp_oCujSK7/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1UX-_XfYg8MXiCBRSDQW_mHSp_oCujSK7'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1UX-_XfYg8MXiCBRSDQW_mHSp_oCujSK7/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1UX-_XfYg8MXiCBRSDQW_mHSp_oCujSK7'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1UX-_XfYg8MXiCBRSDQW_mHSp_oCujSK7'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1fkKrebukuGZd2n4wYYOSAkLFZMK1nTbG',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1fkKrebukuGZd2n4wYYOSAkLFZMK1nTbG',
  'https://drive.google.com/file/d/1fkKrebukuGZd2n4wYYOSAkLFZMK1nTbG/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fkKrebukuGZd2n4wYYOSAkLFZMK1nTbG'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1fkKrebukuGZd2n4wYYOSAkLFZMK1nTbG/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fkKrebukuGZd2n4wYYOSAkLFZMK1nTbG'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fkKrebukuGZd2n4wYYOSAkLFZMK1nTbG'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1GWLUpi0qyLeKawbqofKfYH2_crKvZRXa',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1GWLUpi0qyLeKawbqofKfYH2_crKvZRXa',
  'https://drive.google.com/file/d/1GWLUpi0qyLeKawbqofKfYH2_crKvZRXa/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1GWLUpi0qyLeKawbqofKfYH2_crKvZRXa'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1GWLUpi0qyLeKawbqofKfYH2_crKvZRXa/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1GWLUpi0qyLeKawbqofKfYH2_crKvZRXa'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1GWLUpi0qyLeKawbqofKfYH2_crKvZRXa'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC4',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC4'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-15yFQvBrSUyZ9_nEJ6NFrZvUoJ9b6Txs0',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '15yFQvBrSUyZ9_nEJ6NFrZvUoJ9b6Txs0',
  'https://docs.google.com/document/d/15yFQvBrSUyZ9_nEJ6NFrZvUoJ9b6Txs0/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15yFQvBrSUyZ9_nEJ6NFrZvUoJ9b6Txs0'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/15yFQvBrSUyZ9_nEJ6NFrZvUoJ9b6Txs0/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15yFQvBrSUyZ9_nEJ6NFrZvUoJ9b6Txs0'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15yFQvBrSUyZ9_nEJ6NFrZvUoJ9b6Txs0'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1c1B6swzZgub-F8M5wyWOnAKnkv_tGVfr',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1c1B6swzZgub-F8M5wyWOnAKnkv_tGVfr',
  'https://drive.google.com/file/d/1c1B6swzZgub-F8M5wyWOnAKnkv_tGVfr/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1c1B6swzZgub-F8M5wyWOnAKnkv_tGVfr'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1c1B6swzZgub-F8M5wyWOnAKnkv_tGVfr/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1c1B6swzZgub-F8M5wyWOnAKnkv_tGVfr'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1c1B6swzZgub-F8M5wyWOnAKnkv_tGVfr'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1xdfmTMwBrjTKwPv9mg3srBOrHF6HjU9_',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1xdfmTMwBrjTKwPv9mg3srBOrHF6HjU9_',
  'https://drive.google.com/file/d/1xdfmTMwBrjTKwPv9mg3srBOrHF6HjU9_/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1xdfmTMwBrjTKwPv9mg3srBOrHF6HjU9_'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1xdfmTMwBrjTKwPv9mg3srBOrHF6HjU9_/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1xdfmTMwBrjTKwPv9mg3srBOrHF6HjU9_'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1xdfmTMwBrjTKwPv9mg3srBOrHF6HjU9_'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1L1AY6St-NV8KnMYAgfQ_dBsUwV7fQDFZ',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1L1AY6St-NV8KnMYAgfQ_dBsUwV7fQDFZ',
  'https://docs.google.com/document/d/1L1AY6St-NV8KnMYAgfQ_dBsUwV7fQDFZ/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1L1AY6St-NV8KnMYAgfQ_dBsUwV7fQDFZ'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1L1AY6St-NV8KnMYAgfQ_dBsUwV7fQDFZ/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1L1AY6St-NV8KnMYAgfQ_dBsUwV7fQDFZ'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1L1AY6St-NV8KnMYAgfQ_dBsUwV7fQDFZ'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-13kkw3gqk7qFaGYPnuc0-aB6hrgYccP3q',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '13kkw3gqk7qFaGYPnuc0-aB6hrgYccP3q',
  'https://drive.google.com/file/d/13kkw3gqk7qFaGYPnuc0-aB6hrgYccP3q/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '13kkw3gqk7qFaGYPnuc0-aB6hrgYccP3q'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/13kkw3gqk7qFaGYPnuc0-aB6hrgYccP3q/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '13kkw3gqk7qFaGYPnuc0-aB6hrgYccP3q'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '13kkw3gqk7qFaGYPnuc0-aB6hrgYccP3q'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1m95um7AohcjDFLFog06JiLCByca3t9r9',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1m95um7AohcjDFLFog06JiLCByca3t9r9',
  'https://drive.google.com/file/d/1m95um7AohcjDFLFog06JiLCByca3t9r9/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m95um7AohcjDFLFog06JiLCByca3t9r9'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1m95um7AohcjDFLFog06JiLCByca3t9r9/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m95um7AohcjDFLFog06JiLCByca3t9r9'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1m95um7AohcjDFLFog06JiLCByca3t9r9'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1fGEgRk2MdELWbhtI9s7ISpvwG2P6RGB0',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1fGEgRk2MdELWbhtI9s7ISpvwG2P6RGB0',
  'https://docs.google.com/document/d/1fGEgRk2MdELWbhtI9s7ISpvwG2P6RGB0/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fGEgRk2MdELWbhtI9s7ISpvwG2P6RGB0'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1fGEgRk2MdELWbhtI9s7ISpvwG2P6RGB0/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fGEgRk2MdELWbhtI9s7ISpvwG2P6RGB0'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fGEgRk2MdELWbhtI9s7ISpvwG2P6RGB0'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1o0Y3tMEsmaTOq9a6cLc1BJoWmyyAnNrz',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1o0Y3tMEsmaTOq9a6cLc1BJoWmyyAnNrz',
  'https://drive.google.com/file/d/1o0Y3tMEsmaTOq9a6cLc1BJoWmyyAnNrz/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1o0Y3tMEsmaTOq9a6cLc1BJoWmyyAnNrz'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1o0Y3tMEsmaTOq9a6cLc1BJoWmyyAnNrz/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1o0Y3tMEsmaTOq9a6cLc1BJoWmyyAnNrz'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1o0Y3tMEsmaTOq9a6cLc1BJoWmyyAnNrz'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1QI0vZmPRZoz1WxBypy1aBbX9aZv9Qsru',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1QI0vZmPRZoz1WxBypy1aBbX9aZv9Qsru',
  'https://drive.google.com/file/d/1QI0vZmPRZoz1WxBypy1aBbX9aZv9Qsru/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1QI0vZmPRZoz1WxBypy1aBbX9aZv9Qsru'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1QI0vZmPRZoz1WxBypy1aBbX9aZv9Qsru/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1QI0vZmPRZoz1WxBypy1aBbX9aZv9Qsru'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1QI0vZmPRZoz1WxBypy1aBbX9aZv9Qsru'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1QuHN4gv6W8US2EOeV_YLdYDd8P0wgaAi',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1QuHN4gv6W8US2EOeV_YLdYDd8P0wgaAi',
  'https://docs.google.com/document/d/1QuHN4gv6W8US2EOeV_YLdYDd8P0wgaAi/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1QuHN4gv6W8US2EOeV_YLdYDd8P0wgaAi'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1QuHN4gv6W8US2EOeV_YLdYDd8P0wgaAi/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1QuHN4gv6W8US2EOeV_YLdYDd8P0wgaAi'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1QuHN4gv6W8US2EOeV_YLdYDd8P0wgaAi'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1rORWK-emlOU1tSL2oU7CZ4W8cvTFrGOQ',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1rORWK-emlOU1tSL2oU7CZ4W8cvTFrGOQ',
  'https://drive.google.com/file/d/1rORWK-emlOU1tSL2oU7CZ4W8cvTFrGOQ/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rORWK-emlOU1tSL2oU7CZ4W8cvTFrGOQ'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1rORWK-emlOU1tSL2oU7CZ4W8cvTFrGOQ/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rORWK-emlOU1tSL2oU7CZ4W8cvTFrGOQ'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rORWK-emlOU1tSL2oU7CZ4W8cvTFrGOQ'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1btFhCE_M19lsJ8MKAB9YnWUSz94ExIId',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1btFhCE_M19lsJ8MKAB9YnWUSz94ExIId',
  'https://drive.google.com/file/d/1btFhCE_M19lsJ8MKAB9YnWUSz94ExIId/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1btFhCE_M19lsJ8MKAB9YnWUSz94ExIId'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1btFhCE_M19lsJ8MKAB9YnWUSz94ExIId/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1btFhCE_M19lsJ8MKAB9YnWUSz94ExIId'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1btFhCE_M19lsJ8MKAB9YnWUSz94ExIId'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD4',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD4'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1tqA_mEeo7yGJewcotEznEn5LKB393HeH',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1tqA_mEeo7yGJewcotEznEn5LKB393HeH',
  'https://docs.google.com/document/d/1tqA_mEeo7yGJewcotEznEn5LKB393HeH/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1tqA_mEeo7yGJewcotEznEn5LKB393HeH'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1tqA_mEeo7yGJewcotEznEn5LKB393HeH/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1tqA_mEeo7yGJewcotEznEn5LKB393HeH'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1tqA_mEeo7yGJewcotEznEn5LKB393HeH'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1L1Auleua9IpfKUlJIGdkMCtjqcuXAoWJ',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1L1Auleua9IpfKUlJIGdkMCtjqcuXAoWJ',
  'https://drive.google.com/file/d/1L1Auleua9IpfKUlJIGdkMCtjqcuXAoWJ/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1L1Auleua9IpfKUlJIGdkMCtjqcuXAoWJ'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1L1Auleua9IpfKUlJIGdkMCtjqcuXAoWJ/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1L1Auleua9IpfKUlJIGdkMCtjqcuXAoWJ'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1L1Auleua9IpfKUlJIGdkMCtjqcuXAoWJ'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1z0fgnVMKDkq04C_dE6bkAoZKzVJET-Xr',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1z0fgnVMKDkq04C_dE6bkAoZKzVJET-Xr',
  'https://drive.google.com/file/d/1z0fgnVMKDkq04C_dE6bkAoZKzVJET-Xr/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1z0fgnVMKDkq04C_dE6bkAoZKzVJET-Xr'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1z0fgnVMKDkq04C_dE6bkAoZKzVJET-Xr/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1z0fgnVMKDkq04C_dE6bkAoZKzVJET-Xr'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1z0fgnVMKDkq04C_dE6bkAoZKzVJET-Xr'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 18
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );


-- course_cycle 19 (MATE102 - 2026-0)
INSERT INTO evaluation (course_cycle_id, evaluation_type_id, number, start_date, end_date)
SELECT
  19,
  @evaluation_type_banco,
  0,
  (SELECT ac.start_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = 19 LIMIT 1),
  (SELECT ac.end_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = 19 LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM evaluation e
  WHERE e.course_cycle_id = 19 AND e.evaluation_type_id = @evaluation_type_banco AND e.number = 0
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Practicas Calificadas',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Practicas Calificadas'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Practicas Dirigidas',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Practicas Dirigidas'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Examenes',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Examenes'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1Gpf5jCjdNStSbZVcQT9ruVoSYKvHfrKW',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1Gpf5jCjdNStSbZVcQT9ruVoSYKvHfrKW',
  'https://docs.google.com/document/d/1Gpf5jCjdNStSbZVcQT9ruVoSYKvHfrKW/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Gpf5jCjdNStSbZVcQT9ruVoSYKvHfrKW'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1Gpf5jCjdNStSbZVcQT9ruVoSYKvHfrKW/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Gpf5jCjdNStSbZVcQT9ruVoSYKvHfrKW'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Gpf5jCjdNStSbZVcQT9ruVoSYKvHfrKW'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1DXMbArSAxnDdAOv7P70Dc9GgD-BgI1Uz',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1DXMbArSAxnDdAOv7P70Dc9GgD-BgI1Uz',
  'https://drive.google.com/file/d/1DXMbArSAxnDdAOv7P70Dc9GgD-BgI1Uz/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DXMbArSAxnDdAOv7P70Dc9GgD-BgI1Uz'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1DXMbArSAxnDdAOv7P70Dc9GgD-BgI1Uz/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DXMbArSAxnDdAOv7P70Dc9GgD-BgI1Uz'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DXMbArSAxnDdAOv7P70Dc9GgD-BgI1Uz'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1MQKdbfXH5TUlDHTM1R0fzTPeLEOY7jht',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1MQKdbfXH5TUlDHTM1R0fzTPeLEOY7jht',
  'https://drive.google.com/file/d/1MQKdbfXH5TUlDHTM1R0fzTPeLEOY7jht/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MQKdbfXH5TUlDHTM1R0fzTPeLEOY7jht'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1MQKdbfXH5TUlDHTM1R0fzTPeLEOY7jht/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MQKdbfXH5TUlDHTM1R0fzTPeLEOY7jht'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MQKdbfXH5TUlDHTM1R0fzTPeLEOY7jht'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1qvaAebLP0W59rhE0LRXvUsD1HGWeaoCp',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1qvaAebLP0W59rhE0LRXvUsD1HGWeaoCp',
  'https://docs.google.com/document/d/1qvaAebLP0W59rhE0LRXvUsD1HGWeaoCp/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1qvaAebLP0W59rhE0LRXvUsD1HGWeaoCp'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1qvaAebLP0W59rhE0LRXvUsD1HGWeaoCp/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1qvaAebLP0W59rhE0LRXvUsD1HGWeaoCp'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1qvaAebLP0W59rhE0LRXvUsD1HGWeaoCp'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1hnOW2d2N6TSRRpPlVfhnDPCoYmr_pbQF',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1hnOW2d2N6TSRRpPlVfhnDPCoYmr_pbQF',
  'https://drive.google.com/file/d/1hnOW2d2N6TSRRpPlVfhnDPCoYmr_pbQF/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hnOW2d2N6TSRRpPlVfhnDPCoYmr_pbQF'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1hnOW2d2N6TSRRpPlVfhnDPCoYmr_pbQF/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hnOW2d2N6TSRRpPlVfhnDPCoYmr_pbQF'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hnOW2d2N6TSRRpPlVfhnDPCoYmr_pbQF'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1duzcNYAOWjCAysWAt94c6a_RYf7vE6s2',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1duzcNYAOWjCAysWAt94c6a_RYf7vE6s2',
  'https://drive.google.com/file/d/1duzcNYAOWjCAysWAt94c6a_RYf7vE6s2/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1duzcNYAOWjCAysWAt94c6a_RYf7vE6s2'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1duzcNYAOWjCAysWAt94c6a_RYf7vE6s2/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1duzcNYAOWjCAysWAt94c6a_RYf7vE6s2'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1duzcNYAOWjCAysWAt94c6a_RYf7vE6s2'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-16Ue0MFG71wKqwLsYNZHfH-f_3d4F5VhP',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '16Ue0MFG71wKqwLsYNZHfH-f_3d4F5VhP',
  'https://docs.google.com/document/d/16Ue0MFG71wKqwLsYNZHfH-f_3d4F5VhP/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16Ue0MFG71wKqwLsYNZHfH-f_3d4F5VhP'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/16Ue0MFG71wKqwLsYNZHfH-f_3d4F5VhP/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16Ue0MFG71wKqwLsYNZHfH-f_3d4F5VhP'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16Ue0MFG71wKqwLsYNZHfH-f_3d4F5VhP'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-17et97AtRNnCCqxhNUGhC-c8rQ5MToIYJ',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '17et97AtRNnCCqxhNUGhC-c8rQ5MToIYJ',
  'https://drive.google.com/file/d/17et97AtRNnCCqxhNUGhC-c8rQ5MToIYJ/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17et97AtRNnCCqxhNUGhC-c8rQ5MToIYJ'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/17et97AtRNnCCqxhNUGhC-c8rQ5MToIYJ/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17et97AtRNnCCqxhNUGhC-c8rQ5MToIYJ'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17et97AtRNnCCqxhNUGhC-c8rQ5MToIYJ'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1iWHWOEC60AqnpaqXQ_IT41vPGa35Q9eu',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1iWHWOEC60AqnpaqXQ_IT41vPGa35Q9eu',
  'https://drive.google.com/file/d/1iWHWOEC60AqnpaqXQ_IT41vPGa35Q9eu/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1iWHWOEC60AqnpaqXQ_IT41vPGa35Q9eu'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1iWHWOEC60AqnpaqXQ_IT41vPGa35Q9eu/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1iWHWOEC60AqnpaqXQ_IT41vPGa35Q9eu'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1iWHWOEC60AqnpaqXQ_IT41vPGa35Q9eu'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1F1yZ-HjDZlal-O_Bd4_m6SxinV3DJkRT',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1F1yZ-HjDZlal-O_Bd4_m6SxinV3DJkRT',
  'https://docs.google.com/document/d/1F1yZ-HjDZlal-O_Bd4_m6SxinV3DJkRT/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1F1yZ-HjDZlal-O_Bd4_m6SxinV3DJkRT'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1F1yZ-HjDZlal-O_Bd4_m6SxinV3DJkRT/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1F1yZ-HjDZlal-O_Bd4_m6SxinV3DJkRT'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1F1yZ-HjDZlal-O_Bd4_m6SxinV3DJkRT'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1ULa3Ki1r3gSEVfsViFDEq2IPPI2f--mG',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1ULa3Ki1r3gSEVfsViFDEq2IPPI2f--mG',
  'https://drive.google.com/file/d/1ULa3Ki1r3gSEVfsViFDEq2IPPI2f--mG/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ULa3Ki1r3gSEVfsViFDEq2IPPI2f--mG'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1ULa3Ki1r3gSEVfsViFDEq2IPPI2f--mG/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ULa3Ki1r3gSEVfsViFDEq2IPPI2f--mG'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ULa3Ki1r3gSEVfsViFDEq2IPPI2f--mG'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1x0PoJE1Hb7EGaZlBTnXIO3wFaAAbeoy6',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1x0PoJE1Hb7EGaZlBTnXIO3wFaAAbeoy6',
  'https://drive.google.com/file/d/1x0PoJE1Hb7EGaZlBTnXIO3wFaAAbeoy6/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1x0PoJE1Hb7EGaZlBTnXIO3wFaAAbeoy6'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1x0PoJE1Hb7EGaZlBTnXIO3wFaAAbeoy6/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1x0PoJE1Hb7EGaZlBTnXIO3wFaAAbeoy6'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1x0PoJE1Hb7EGaZlBTnXIO3wFaAAbeoy6'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1ZRTKu9xhC2ogILdk4qlBCKjmj61NHRvE',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1ZRTKu9xhC2ogILdk4qlBCKjmj61NHRvE',
  'https://docs.google.com/document/d/1ZRTKu9xhC2ogILdk4qlBCKjmj61NHRvE/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZRTKu9xhC2ogILdk4qlBCKjmj61NHRvE'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1ZRTKu9xhC2ogILdk4qlBCKjmj61NHRvE/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZRTKu9xhC2ogILdk4qlBCKjmj61NHRvE'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZRTKu9xhC2ogILdk4qlBCKjmj61NHRvE'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1j18akWgim6sCPjJE4k_bSRE7qBZdu97K',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1j18akWgim6sCPjJE4k_bSRE7qBZdu97K',
  'https://drive.google.com/file/d/1j18akWgim6sCPjJE4k_bSRE7qBZdu97K/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1j18akWgim6sCPjJE4k_bSRE7qBZdu97K'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1j18akWgim6sCPjJE4k_bSRE7qBZdu97K/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1j18akWgim6sCPjJE4k_bSRE7qBZdu97K'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1j18akWgim6sCPjJE4k_bSRE7qBZdu97K'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1VlKDRZnDblvxLp2ui4F6H5eaGL9vUCsm',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1VlKDRZnDblvxLp2ui4F6H5eaGL9vUCsm',
  'https://drive.google.com/file/d/1VlKDRZnDblvxLp2ui4F6H5eaGL9vUCsm/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1VlKDRZnDblvxLp2ui4F6H5eaGL9vUCsm'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1VlKDRZnDblvxLp2ui4F6H5eaGL9vUCsm/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1VlKDRZnDblvxLp2ui4F6H5eaGL9vUCsm'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1VlKDRZnDblvxLp2ui4F6H5eaGL9vUCsm'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1XpxBWvu8h4OAoHPvBwHRBNSiY-9klyWR',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1XpxBWvu8h4OAoHPvBwHRBNSiY-9klyWR',
  'https://docs.google.com/document/d/1XpxBWvu8h4OAoHPvBwHRBNSiY-9klyWR/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1XpxBWvu8h4OAoHPvBwHRBNSiY-9klyWR'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1XpxBWvu8h4OAoHPvBwHRBNSiY-9klyWR/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1XpxBWvu8h4OAoHPvBwHRBNSiY-9klyWR'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1XpxBWvu8h4OAoHPvBwHRBNSiY-9klyWR'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1DcwFFwDZ-4p6EAG8jLOpxULNogYtlcgC',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1DcwFFwDZ-4p6EAG8jLOpxULNogYtlcgC',
  'https://drive.google.com/file/d/1DcwFFwDZ-4p6EAG8jLOpxULNogYtlcgC/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DcwFFwDZ-4p6EAG8jLOpxULNogYtlcgC'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1DcwFFwDZ-4p6EAG8jLOpxULNogYtlcgC/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DcwFFwDZ-4p6EAG8jLOpxULNogYtlcgC'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DcwFFwDZ-4p6EAG8jLOpxULNogYtlcgC'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1oFzeXheXEoMaMXBlXamPZtgrXab1q1ix',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1oFzeXheXEoMaMXBlXamPZtgrXab1q1ix',
  'https://drive.google.com/file/d/1oFzeXheXEoMaMXBlXamPZtgrXab1q1ix/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1oFzeXheXEoMaMXBlXamPZtgrXab1q1ix'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1oFzeXheXEoMaMXBlXamPZtgrXab1q1ix/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1oFzeXheXEoMaMXBlXamPZtgrXab1q1ix'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1oFzeXheXEoMaMXBlXamPZtgrXab1q1ix'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC4',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC4'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1DGsk3ApXuBttTgOJIzC3rc1EIPAyZHel',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1DGsk3ApXuBttTgOJIzC3rc1EIPAyZHel',
  'https://docs.google.com/document/d/1DGsk3ApXuBttTgOJIzC3rc1EIPAyZHel/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DGsk3ApXuBttTgOJIzC3rc1EIPAyZHel'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1DGsk3ApXuBttTgOJIzC3rc1EIPAyZHel/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DGsk3ApXuBttTgOJIzC3rc1EIPAyZHel'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1DGsk3ApXuBttTgOJIzC3rc1EIPAyZHel'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-10kPHyUwrEa2sImpNVIOZ0ArWK7aCqrwX',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '10kPHyUwrEa2sImpNVIOZ0ArWK7aCqrwX',
  'https://drive.google.com/file/d/10kPHyUwrEa2sImpNVIOZ0ArWK7aCqrwX/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10kPHyUwrEa2sImpNVIOZ0ArWK7aCqrwX'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/10kPHyUwrEa2sImpNVIOZ0ArWK7aCqrwX/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10kPHyUwrEa2sImpNVIOZ0ArWK7aCqrwX'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10kPHyUwrEa2sImpNVIOZ0ArWK7aCqrwX'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1i42MlplNrpnmyuAuNLTU_nRQkhiAcxTB',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1i42MlplNrpnmyuAuNLTU_nRQkhiAcxTB',
  'https://drive.google.com/file/d/1i42MlplNrpnmyuAuNLTU_nRQkhiAcxTB/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1i42MlplNrpnmyuAuNLTU_nRQkhiAcxTB'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1i42MlplNrpnmyuAuNLTU_nRQkhiAcxTB/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1i42MlplNrpnmyuAuNLTU_nRQkhiAcxTB'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1i42MlplNrpnmyuAuNLTU_nRQkhiAcxTB'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1uWjemyHRF2F_fNV0Uc4wwt_U7iq5-A6H',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1uWjemyHRF2F_fNV0Uc4wwt_U7iq5-A6H',
  'https://docs.google.com/document/d/1uWjemyHRF2F_fNV0Uc4wwt_U7iq5-A6H/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1uWjemyHRF2F_fNV0Uc4wwt_U7iq5-A6H'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1uWjemyHRF2F_fNV0Uc4wwt_U7iq5-A6H/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1uWjemyHRF2F_fNV0Uc4wwt_U7iq5-A6H'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1uWjemyHRF2F_fNV0Uc4wwt_U7iq5-A6H'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1bM1vs1exBbiiRYPN2BSTnz2bXFDPfjCS',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1bM1vs1exBbiiRYPN2BSTnz2bXFDPfjCS',
  'https://drive.google.com/file/d/1bM1vs1exBbiiRYPN2BSTnz2bXFDPfjCS/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1bM1vs1exBbiiRYPN2BSTnz2bXFDPfjCS'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1bM1vs1exBbiiRYPN2BSTnz2bXFDPfjCS/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1bM1vs1exBbiiRYPN2BSTnz2bXFDPfjCS'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1bM1vs1exBbiiRYPN2BSTnz2bXFDPfjCS'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-17U1KBT0MfqVwgyJ7k0UywAdc878cE3JJ',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '17U1KBT0MfqVwgyJ7k0UywAdc878cE3JJ',
  'https://drive.google.com/file/d/17U1KBT0MfqVwgyJ7k0UywAdc878cE3JJ/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17U1KBT0MfqVwgyJ7k0UywAdc878cE3JJ'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/17U1KBT0MfqVwgyJ7k0UywAdc878cE3JJ/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17U1KBT0MfqVwgyJ7k0UywAdc878cE3JJ'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17U1KBT0MfqVwgyJ7k0UywAdc878cE3JJ'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1xq7tYWBrC8bkV8TzAjtpeESCf_GNNOHV',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1xq7tYWBrC8bkV8TzAjtpeESCf_GNNOHV',
  'https://docs.google.com/document/d/1xq7tYWBrC8bkV8TzAjtpeESCf_GNNOHV/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1xq7tYWBrC8bkV8TzAjtpeESCf_GNNOHV'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1xq7tYWBrC8bkV8TzAjtpeESCf_GNNOHV/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1xq7tYWBrC8bkV8TzAjtpeESCf_GNNOHV'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1xq7tYWBrC8bkV8TzAjtpeESCf_GNNOHV'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1nk3hZ1XMlTjD-3K6PEAKQL3nNRn0hRJa',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1nk3hZ1XMlTjD-3K6PEAKQL3nNRn0hRJa',
  'https://drive.google.com/file/d/1nk3hZ1XMlTjD-3K6PEAKQL3nNRn0hRJa/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nk3hZ1XMlTjD-3K6PEAKQL3nNRn0hRJa'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1nk3hZ1XMlTjD-3K6PEAKQL3nNRn0hRJa/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nk3hZ1XMlTjD-3K6PEAKQL3nNRn0hRJa'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nk3hZ1XMlTjD-3K6PEAKQL3nNRn0hRJa'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1jytkLPJnA41v5dUltqxZr8FPPF4ixxeS',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1jytkLPJnA41v5dUltqxZr8FPPF4ixxeS',
  'https://drive.google.com/file/d/1jytkLPJnA41v5dUltqxZr8FPPF4ixxeS/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jytkLPJnA41v5dUltqxZr8FPPF4ixxeS'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1jytkLPJnA41v5dUltqxZr8FPPF4ixxeS/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jytkLPJnA41v5dUltqxZr8FPPF4ixxeS'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jytkLPJnA41v5dUltqxZr8FPPF4ixxeS'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1yAIT3UqXCtrJK1YyP825TGyHjSD0dEDh',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1yAIT3UqXCtrJK1YyP825TGyHjSD0dEDh',
  'https://docs.google.com/document/d/1yAIT3UqXCtrJK1YyP825TGyHjSD0dEDh/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1yAIT3UqXCtrJK1YyP825TGyHjSD0dEDh'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1yAIT3UqXCtrJK1YyP825TGyHjSD0dEDh/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1yAIT3UqXCtrJK1YyP825TGyHjSD0dEDh'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1yAIT3UqXCtrJK1YyP825TGyHjSD0dEDh'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1F57Z8SZbuzEMNXK4FzhNf31MFXbAkH0y',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1F57Z8SZbuzEMNXK4FzhNf31MFXbAkH0y',
  'https://drive.google.com/file/d/1F57Z8SZbuzEMNXK4FzhNf31MFXbAkH0y/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1F57Z8SZbuzEMNXK4FzhNf31MFXbAkH0y'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1F57Z8SZbuzEMNXK4FzhNf31MFXbAkH0y/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1F57Z8SZbuzEMNXK4FzhNf31MFXbAkH0y'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1F57Z8SZbuzEMNXK4FzhNf31MFXbAkH0y'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1kfaZP-ZgVQSJ9gVCxlUe0W1iO1dFxVw2',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1kfaZP-ZgVQSJ9gVCxlUe0W1iO1dFxVw2',
  'https://drive.google.com/file/d/1kfaZP-ZgVQSJ9gVCxlUe0W1iO1dFxVw2/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1kfaZP-ZgVQSJ9gVCxlUe0W1iO1dFxVw2'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1kfaZP-ZgVQSJ9gVCxlUe0W1iO1dFxVw2/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1kfaZP-ZgVQSJ9gVCxlUe0W1iO1dFxVw2'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1kfaZP-ZgVQSJ9gVCxlUe0W1iO1dFxVw2'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD4',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD4'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1JqiPfAC7OL7DnrHXWTnPs4T15pHjKpGW',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1JqiPfAC7OL7DnrHXWTnPs4T15pHjKpGW',
  'https://docs.google.com/document/d/1JqiPfAC7OL7DnrHXWTnPs4T15pHjKpGW/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JqiPfAC7OL7DnrHXWTnPs4T15pHjKpGW'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1JqiPfAC7OL7DnrHXWTnPs4T15pHjKpGW/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JqiPfAC7OL7DnrHXWTnPs4T15pHjKpGW'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JqiPfAC7OL7DnrHXWTnPs4T15pHjKpGW'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1iDAby8aIchRIojH34sXB6XTq-Wrxz68H',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1iDAby8aIchRIojH34sXB6XTq-Wrxz68H',
  'https://drive.google.com/file/d/1iDAby8aIchRIojH34sXB6XTq-Wrxz68H/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1iDAby8aIchRIojH34sXB6XTq-Wrxz68H'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1iDAby8aIchRIojH34sXB6XTq-Wrxz68H/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1iDAby8aIchRIojH34sXB6XTq-Wrxz68H'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1iDAby8aIchRIojH34sXB6XTq-Wrxz68H'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1PMK0I2muGybQRfBY6ylPKgk5DXcDAoXf',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1PMK0I2muGybQRfBY6ylPKgk5DXcDAoXf',
  'https://drive.google.com/file/d/1PMK0I2muGybQRfBY6ylPKgk5DXcDAoXf/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1PMK0I2muGybQRfBY6ylPKgk5DXcDAoXf'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1PMK0I2muGybQRfBY6ylPKgk5DXcDAoXf/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1PMK0I2muGybQRfBY6ylPKgk5DXcDAoXf'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1PMK0I2muGybQRfBY6ylPKgk5DXcDAoXf'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 19
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );


-- course_cycle 20 (MATE101 - 2026-0)
INSERT INTO evaluation (course_cycle_id, evaluation_type_id, number, start_date, end_date)
SELECT
  20,
  @evaluation_type_banco,
  0,
  (SELECT ac.start_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = 20 LIMIT 1),
  (SELECT ac.end_date FROM academic_cycle ac INNER JOIN course_cycle cc ON cc.academic_cycle_id = ac.id WHERE cc.id = 20 LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM evaluation e
  WHERE e.course_cycle_id = 20 AND e.evaluation_type_id = @evaluation_type_banco AND e.number = 0
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Practicas Calificadas',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Practicas Calificadas'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Practicas Dirigidas',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Practicas Dirigidas'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  NULL,
  @folder_status_active,
  'Examenes',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id IS NULL
    AND mf.name = 'Examenes'
);

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1bjpZTi1AxICsmJJtRzF4OoF2v4CnS5FM',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1bjpZTi1AxICsmJJtRzF4OoF2v4CnS5FM',
  'https://docs.google.com/document/d/1bjpZTi1AxICsmJJtRzF4OoF2v4CnS5FM/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1bjpZTi1AxICsmJJtRzF4OoF2v4CnS5FM'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1bjpZTi1AxICsmJJtRzF4OoF2v4CnS5FM/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1bjpZTi1AxICsmJJtRzF4OoF2v4CnS5FM'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1bjpZTi1AxICsmJJtRzF4OoF2v4CnS5FM'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1cZ97lWKt11WjCUMFpsB_ECfTVHA4mlPO',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1cZ97lWKt11WjCUMFpsB_ECfTVHA4mlPO',
  'https://drive.google.com/file/d/1cZ97lWKt11WjCUMFpsB_ECfTVHA4mlPO/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1cZ97lWKt11WjCUMFpsB_ECfTVHA4mlPO'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1cZ97lWKt11WjCUMFpsB_ECfTVHA4mlPO/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1cZ97lWKt11WjCUMFpsB_ECfTVHA4mlPO'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1cZ97lWKt11WjCUMFpsB_ECfTVHA4mlPO'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1VpQZO54xUSU3gtYZXgWuN0cwljCiuEjR',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1VpQZO54xUSU3gtYZXgWuN0cwljCiuEjR',
  'https://drive.google.com/file/d/1VpQZO54xUSU3gtYZXgWuN0cwljCiuEjR/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1VpQZO54xUSU3gtYZXgWuN0cwljCiuEjR'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1VpQZO54xUSU3gtYZXgWuN0cwljCiuEjR/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1VpQZO54xUSU3gtYZXgWuN0cwljCiuEjR'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1VpQZO54xUSU3gtYZXgWuN0cwljCiuEjR'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1y-D3t2Dm2MF1sdk_qad4vApMTfrXf8KT',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1y-D3t2Dm2MF1sdk_qad4vApMTfrXf8KT',
  'https://docs.google.com/document/d/1y-D3t2Dm2MF1sdk_qad4vApMTfrXf8KT/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1y-D3t2Dm2MF1sdk_qad4vApMTfrXf8KT'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1y-D3t2Dm2MF1sdk_qad4vApMTfrXf8KT/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1y-D3t2Dm2MF1sdk_qad4vApMTfrXf8KT'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1y-D3t2Dm2MF1sdk_qad4vApMTfrXf8KT'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-16Q6K6RlcsFuSdcUIJFwz2-NchINHDqCx',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '16Q6K6RlcsFuSdcUIJFwz2-NchINHDqCx',
  'https://drive.google.com/file/d/16Q6K6RlcsFuSdcUIJFwz2-NchINHDqCx/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16Q6K6RlcsFuSdcUIJFwz2-NchINHDqCx'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/16Q6K6RlcsFuSdcUIJFwz2-NchINHDqCx/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16Q6K6RlcsFuSdcUIJFwz2-NchINHDqCx'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16Q6K6RlcsFuSdcUIJFwz2-NchINHDqCx'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1nklLZVfYcbhnrwx8HPgagPB1bNIzhRgb',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1nklLZVfYcbhnrwx8HPgagPB1bNIzhRgb',
  'https://drive.google.com/file/d/1nklLZVfYcbhnrwx8HPgagPB1bNIzhRgb/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nklLZVfYcbhnrwx8HPgagPB1bNIzhRgb'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1nklLZVfYcbhnrwx8HPgagPB1bNIzhRgb/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nklLZVfYcbhnrwx8HPgagPB1bNIzhRgb'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1nklLZVfYcbhnrwx8HPgagPB1bNIzhRgb'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'EX3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'EX3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1t8MpPlJXn3hqJzjLyncCkpBV2CPKqkgB',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1t8MpPlJXn3hqJzjLyncCkpBV2CPKqkgB',
  'https://docs.google.com/document/d/1t8MpPlJXn3hqJzjLyncCkpBV2CPKqkgB/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1t8MpPlJXn3hqJzjLyncCkpBV2CPKqkgB'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1t8MpPlJXn3hqJzjLyncCkpBV2CPKqkgB/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1t8MpPlJXn3hqJzjLyncCkpBV2CPKqkgB'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1t8MpPlJXn3hqJzjLyncCkpBV2CPKqkgB'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-15L8b_7w1xSVt-wwSaocAvkRAuX1aZgg0',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '15L8b_7w1xSVt-wwSaocAvkRAuX1aZgg0',
  'https://drive.google.com/file/d/15L8b_7w1xSVt-wwSaocAvkRAuX1aZgg0/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15L8b_7w1xSVt-wwSaocAvkRAuX1aZgg0'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/15L8b_7w1xSVt-wwSaocAvkRAuX1aZgg0/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15L8b_7w1xSVt-wwSaocAvkRAuX1aZgg0'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15L8b_7w1xSVt-wwSaocAvkRAuX1aZgg0'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1fvEvcH8JOZZvtzGgSwtdzyDwGN9n6YG-',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1fvEvcH8JOZZvtzGgSwtdzyDwGN9n6YG-',
  'https://drive.google.com/file/d/1fvEvcH8JOZZvtzGgSwtdzyDwGN9n6YG-/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fvEvcH8JOZZvtzGgSwtdzyDwGN9n6YG-'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1fvEvcH8JOZZvtzGgSwtdzyDwGN9n6YG-/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fvEvcH8JOZZvtzGgSwtdzyDwGN9n6YG-'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fvEvcH8JOZZvtzGgSwtdzyDwGN9n6YG-'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Examenes'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'EX3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-179gWuY6hwg94JITQtcCzNkEzqBw2sgcd',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '179gWuY6hwg94JITQtcCzNkEzqBw2sgcd',
  'https://docs.google.com/document/d/179gWuY6hwg94JITQtcCzNkEzqBw2sgcd/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '179gWuY6hwg94JITQtcCzNkEzqBw2sgcd'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/179gWuY6hwg94JITQtcCzNkEzqBw2sgcd/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '179gWuY6hwg94JITQtcCzNkEzqBw2sgcd'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '179gWuY6hwg94JITQtcCzNkEzqBw2sgcd'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1HoM7RYrVQfIoltDV2jotHIwlzHTvaGHE',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1HoM7RYrVQfIoltDV2jotHIwlzHTvaGHE',
  'https://drive.google.com/file/d/1HoM7RYrVQfIoltDV2jotHIwlzHTvaGHE/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1HoM7RYrVQfIoltDV2jotHIwlzHTvaGHE'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1HoM7RYrVQfIoltDV2jotHIwlzHTvaGHE/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1HoM7RYrVQfIoltDV2jotHIwlzHTvaGHE'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1HoM7RYrVQfIoltDV2jotHIwlzHTvaGHE'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1HZ45wveZypLVm-xnuGVSJ0sfHYWwnhws',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1HZ45wveZypLVm-xnuGVSJ0sfHYWwnhws',
  'https://drive.google.com/file/d/1HZ45wveZypLVm-xnuGVSJ0sfHYWwnhws/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1HZ45wveZypLVm-xnuGVSJ0sfHYWwnhws'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1HZ45wveZypLVm-xnuGVSJ0sfHYWwnhws/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1HZ45wveZypLVm-xnuGVSJ0sfHYWwnhws'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1HZ45wveZypLVm-xnuGVSJ0sfHYWwnhws'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1aShoqPIyH_G3f76hyh-K8cQ-d684qYLf',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1aShoqPIyH_G3f76hyh-K8cQ-d684qYLf',
  'https://docs.google.com/document/d/1aShoqPIyH_G3f76hyh-K8cQ-d684qYLf/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1aShoqPIyH_G3f76hyh-K8cQ-d684qYLf'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1aShoqPIyH_G3f76hyh-K8cQ-d684qYLf/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1aShoqPIyH_G3f76hyh-K8cQ-d684qYLf'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1aShoqPIyH_G3f76hyh-K8cQ-d684qYLf'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-11SRd8w0q0XoeG412lqk0nXfmBEwF0RRK',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '11SRd8w0q0XoeG412lqk0nXfmBEwF0RRK',
  'https://drive.google.com/file/d/11SRd8w0q0XoeG412lqk0nXfmBEwF0RRK/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '11SRd8w0q0XoeG412lqk0nXfmBEwF0RRK'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/11SRd8w0q0XoeG412lqk0nXfmBEwF0RRK/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '11SRd8w0q0XoeG412lqk0nXfmBEwF0RRK'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '11SRd8w0q0XoeG412lqk0nXfmBEwF0RRK'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-10_yzueeLlJ0mSYzsdPP8SkAj7vH04ZcH',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '10_yzueeLlJ0mSYzsdPP8SkAj7vH04ZcH',
  'https://drive.google.com/file/d/10_yzueeLlJ0mSYzsdPP8SkAj7vH04ZcH/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10_yzueeLlJ0mSYzsdPP8SkAj7vH04ZcH'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/10_yzueeLlJ0mSYzsdPP8SkAj7vH04ZcH/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10_yzueeLlJ0mSYzsdPP8SkAj7vH04ZcH'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10_yzueeLlJ0mSYzsdPP8SkAj7vH04ZcH'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-13CVGov8QYUOGwS2hrahJlQLwX6R5TbiD',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '13CVGov8QYUOGwS2hrahJlQLwX6R5TbiD',
  'https://docs.google.com/document/d/13CVGov8QYUOGwS2hrahJlQLwX6R5TbiD/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '13CVGov8QYUOGwS2hrahJlQLwX6R5TbiD'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/13CVGov8QYUOGwS2hrahJlQLwX6R5TbiD/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '13CVGov8QYUOGwS2hrahJlQLwX6R5TbiD'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '13CVGov8QYUOGwS2hrahJlQLwX6R5TbiD'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1FRKpLGqle19m1BpHuokEfgjTGnAkDjFO',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1FRKpLGqle19m1BpHuokEfgjTGnAkDjFO',
  'https://drive.google.com/file/d/1FRKpLGqle19m1BpHuokEfgjTGnAkDjFO/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1FRKpLGqle19m1BpHuokEfgjTGnAkDjFO'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1FRKpLGqle19m1BpHuokEfgjTGnAkDjFO/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1FRKpLGqle19m1BpHuokEfgjTGnAkDjFO'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1FRKpLGqle19m1BpHuokEfgjTGnAkDjFO'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1CKJ5Go3gzIaT_7E901zjY8G1-m45i63p',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1CKJ5Go3gzIaT_7E901zjY8G1-m45i63p',
  'https://drive.google.com/file/d/1CKJ5Go3gzIaT_7E901zjY8G1-m45i63p/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CKJ5Go3gzIaT_7E901zjY8G1-m45i63p'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1CKJ5Go3gzIaT_7E901zjY8G1-m45i63p/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CKJ5Go3gzIaT_7E901zjY8G1-m45i63p'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1CKJ5Go3gzIaT_7E901zjY8G1-m45i63p'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PC4',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PC4'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-16WX6Qxm4Ay0FIWkwYFRHCPCBYpojsTZg',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '16WX6Qxm4Ay0FIWkwYFRHCPCBYpojsTZg',
  'https://docs.google.com/document/d/16WX6Qxm4Ay0FIWkwYFRHCPCBYpojsTZg/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16WX6Qxm4Ay0FIWkwYFRHCPCBYpojsTZg'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/16WX6Qxm4Ay0FIWkwYFRHCPCBYpojsTZg/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16WX6Qxm4Ay0FIWkwYFRHCPCBYpojsTZg'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16WX6Qxm4Ay0FIWkwYFRHCPCBYpojsTZg'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-15Geh75gGYpcjcO5fKh0ndprfAMaRfxq4',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '15Geh75gGYpcjcO5fKh0ndprfAMaRfxq4',
  'https://drive.google.com/file/d/15Geh75gGYpcjcO5fKh0ndprfAMaRfxq4/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15Geh75gGYpcjcO5fKh0ndprfAMaRfxq4'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/15Geh75gGYpcjcO5fKh0ndprfAMaRfxq4/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15Geh75gGYpcjcO5fKh0ndprfAMaRfxq4'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15Geh75gGYpcjcO5fKh0ndprfAMaRfxq4'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1Wgv2ZHvlBIeyG34lfSj2xsWv9ojsATyL',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1Wgv2ZHvlBIeyG34lfSj2xsWv9ojsATyL',
  'https://drive.google.com/file/d/1Wgv2ZHvlBIeyG34lfSj2xsWv9ojsATyL/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Wgv2ZHvlBIeyG34lfSj2xsWv9ojsATyL'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1Wgv2ZHvlBIeyG34lfSj2xsWv9ojsATyL/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Wgv2ZHvlBIeyG34lfSj2xsWv9ojsATyL'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Wgv2ZHvlBIeyG34lfSj2xsWv9ojsATyL'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Calificadas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PC4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD1',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD1'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1gHRRql04fVufY5xwhz_tqJEINlxdufBb',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1gHRRql04fVufY5xwhz_tqJEINlxdufBb',
  'https://docs.google.com/document/d/1gHRRql04fVufY5xwhz_tqJEINlxdufBb/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1gHRRql04fVufY5xwhz_tqJEINlxdufBb'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1gHRRql04fVufY5xwhz_tqJEINlxdufBb/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1gHRRql04fVufY5xwhz_tqJEINlxdufBb'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1gHRRql04fVufY5xwhz_tqJEINlxdufBb'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1u5HKdrEV19oJVMFgZo-1BbmqUpo-T3C_',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1u5HKdrEV19oJVMFgZo-1BbmqUpo-T3C_',
  'https://drive.google.com/file/d/1u5HKdrEV19oJVMFgZo-1BbmqUpo-T3C_/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1u5HKdrEV19oJVMFgZo-1BbmqUpo-T3C_'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1u5HKdrEV19oJVMFgZo-1BbmqUpo-T3C_/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1u5HKdrEV19oJVMFgZo-1BbmqUpo-T3C_'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1u5HKdrEV19oJVMFgZo-1BbmqUpo-T3C_'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1C1Kp-NED5MMmsk5G5hzk1lavJjsvh-Yw',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1C1Kp-NED5MMmsk5G5hzk1lavJjsvh-Yw',
  'https://drive.google.com/file/d/1C1Kp-NED5MMmsk5G5hzk1lavJjsvh-Yw/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1C1Kp-NED5MMmsk5G5hzk1lavJjsvh-Yw'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1C1Kp-NED5MMmsk5G5hzk1lavJjsvh-Yw/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1C1Kp-NED5MMmsk5G5hzk1lavJjsvh-Yw'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1C1Kp-NED5MMmsk5G5hzk1lavJjsvh-Yw'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD1'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD2',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD2'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-10t_gaFSOZhgsgEoa3r_dWUHu5AZritSd',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '10t_gaFSOZhgsgEoa3r_dWUHu5AZritSd',
  'https://docs.google.com/document/d/10t_gaFSOZhgsgEoa3r_dWUHu5AZritSd/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10t_gaFSOZhgsgEoa3r_dWUHu5AZritSd'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/10t_gaFSOZhgsgEoa3r_dWUHu5AZritSd/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10t_gaFSOZhgsgEoa3r_dWUHu5AZritSd'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10t_gaFSOZhgsgEoa3r_dWUHu5AZritSd'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1WoJIUpojbHkhWodJ75kLAvhUf9RKV2ct',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1WoJIUpojbHkhWodJ75kLAvhUf9RKV2ct',
  'https://drive.google.com/file/d/1WoJIUpojbHkhWodJ75kLAvhUf9RKV2ct/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1WoJIUpojbHkhWodJ75kLAvhUf9RKV2ct'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1WoJIUpojbHkhWodJ75kLAvhUf9RKV2ct/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1WoJIUpojbHkhWodJ75kLAvhUf9RKV2ct'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1WoJIUpojbHkhWodJ75kLAvhUf9RKV2ct'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1jtncX29WCdzPHulEsLWsC-lRNTSzDatK',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1jtncX29WCdzPHulEsLWsC-lRNTSzDatK',
  'https://drive.google.com/file/d/1jtncX29WCdzPHulEsLWsC-lRNTSzDatK/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jtncX29WCdzPHulEsLWsC-lRNTSzDatK'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1jtncX29WCdzPHulEsLWsC-lRNTSzDatK/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jtncX29WCdzPHulEsLWsC-lRNTSzDatK'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1jtncX29WCdzPHulEsLWsC-lRNTSzDatK'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD2'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD3',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD3'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1XuUr8ltulz51QR4QuSvIHMrK1tIPSjg1',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1XuUr8ltulz51QR4QuSvIHMrK1tIPSjg1',
  'https://docs.google.com/document/d/1XuUr8ltulz51QR4QuSvIHMrK1tIPSjg1/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1XuUr8ltulz51QR4QuSvIHMrK1tIPSjg1'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1XuUr8ltulz51QR4QuSvIHMrK1tIPSjg1/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1XuUr8ltulz51QR4QuSvIHMrK1tIPSjg1'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1XuUr8ltulz51QR4QuSvIHMrK1tIPSjg1'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1II_7CE021BG5zuF70A1Boz4jRoJB-BQG',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1II_7CE021BG5zuF70A1Boz4jRoJB-BQG',
  'https://drive.google.com/file/d/1II_7CE021BG5zuF70A1Boz4jRoJB-BQG/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1II_7CE021BG5zuF70A1Boz4jRoJB-BQG'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1II_7CE021BG5zuF70A1Boz4jRoJB-BQG/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1II_7CE021BG5zuF70A1Boz4jRoJB-BQG'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1II_7CE021BG5zuF70A1Boz4jRoJB-BQG'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1BnYVzKoiEJ7XRDf-8UwLEvKsW9ZvzgG4',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '1BnYVzKoiEJ7XRDf-8UwLEvKsW9ZvzgG4',
  'https://drive.google.com/file/d/1BnYVzKoiEJ7XRDf-8UwLEvKsW9ZvzgG4/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1BnYVzKoiEJ7XRDf-8UwLEvKsW9ZvzgG4'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1BnYVzKoiEJ7XRDf-8UwLEvKsW9ZvzgG4/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1BnYVzKoiEJ7XRDf-8UwLEvKsW9ZvzgG4'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1BnYVzKoiEJ7XRDf-8UwLEvKsW9ZvzgG4'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD3'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  ),
  (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  ),
  @folder_status_active,
  'PD4',
  NULL, NULL, @actor_user_id, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM material_folder mf
  WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
    AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
    AND mf.name = 'PD4'
);

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1MOEfLVZ20_BP-dPA0EKirt2ev52JlqkI',
  '1INF26-Plantilla_E2.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  253021,
  'GDRIVE',
  '1MOEfLVZ20_BP-dPA0EKirt2ev52JlqkI',
  'https://docs.google.com/document/d/1MOEfLVZ20_BP-dPA0EKirt2ev52JlqkI/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MOEfLVZ20_BP-dPA0EKirt2ev52JlqkI'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://docs.google.com/document/d/1MOEfLVZ20_BP-dPA0EKirt2ev52JlqkI/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MOEfLVZ20_BP-dPA0EKirt2ev52JlqkI'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF26-Plantilla_E2.docx',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MOEfLVZ20_BP-dPA0EKirt2ev52JlqkI'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-1f4-KiB_zVt8BLsG5MO93PUMGNnaC1vXJ',
  '1INF61-2026-1-SILABO.PDF',
  'application/pdf',
  27856,
  'GDRIVE',
  '1f4-KiB_zVt8BLsG5MO93PUMGNnaC1vXJ',
  'https://drive.google.com/file/d/1f4-KiB_zVt8BLsG5MO93PUMGNnaC1vXJ/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1f4-KiB_zVt8BLsG5MO93PUMGNnaC1vXJ'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/1f4-KiB_zVt8BLsG5MO93PUMGNnaC1vXJ/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1f4-KiB_zVt8BLsG5MO93PUMGNnaC1vXJ'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  '1INF61-2026-1-SILABO.PDF',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1f4-KiB_zVt8BLsG5MO93PUMGNnaC1vXJ'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );

INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT
  'gdrive-seed-17e3acpR05foAftN8BxPbs2VLJuj6P-AE',
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  'application/pdf',
  95413,
  'GDRIVE',
  '17e3acpR05foAftN8BxPbs2VLJuj6P-AE',
  'https://drive.google.com/file/d/17e3acpR05foAftN8BxPbs2VLJuj6P-AE/view?usp=drivesdk',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM file_resource fr
  WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17e3acpR05foAftN8BxPbs2VLJuj6P-AE'
);

INSERT INTO file_version (file_resource_id, version_number, storage_url, created_at, created_by)
SELECT
  fr.id,
  1,
  'https://drive.google.com/file/d/17e3acpR05foAftN8BxPbs2VLJuj6P-AE/view?usp=drivesdk',
  NOW(),
  @actor_user_id
FROM file_resource fr
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17e3acpR05foAftN8BxPbs2VLJuj6P-AE'
  AND NOT EXISTS (
    SELECT 1 FROM file_version fv
    WHERE fv.file_resource_id = fr.id AND fv.version_number = 1
  );

INSERT INTO material (material_folder_id, class_event_id, file_resource_id, file_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        ),
  NULL,
  fr.id,
  fv.id,
  @material_status_active,
  'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf',
  NULL, NULL, @actor_user_id, NOW(), NOW()
FROM file_resource fr
INNER JOIN file_version fv ON fv.file_resource_id = fr.id AND fv.version_number = 1
WHERE fr.storage_provider = 'GDRIVE' AND fr.storage_key = '17e3acpR05foAftN8BxPbs2VLJuj6P-AE'
  AND NOT EXISTS (
    SELECT 1 FROM material m
    WHERE m.material_folder_id = (
          SELECT mf.id
          FROM material_folder mf
          WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
            AND mf.parent_folder_id = (
    SELECT mf.id
    FROM material_folder mf
    WHERE mf.evaluation_id = (
    SELECT e.id
    FROM evaluation e
    INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
    WHERE e.course_cycle_id = 20
      AND et.code = 'BANCO_ENUNCIADOS'
      AND e.number = 0
    ORDER BY e.id ASC
    LIMIT 1
  )
      AND mf.parent_folder_id IS NULL
      AND mf.name = 'Practicas Dirigidas'
    ORDER BY mf.id ASC
    LIMIT 1
  )
            AND mf.name = 'PD4'
          ORDER BY mf.id ASC
          LIMIT 1
        )
      AND m.file_resource_id = fr.id
  );


-- Summary: leafFolders=44, files=132
