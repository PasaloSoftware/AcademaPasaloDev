-- Replica estructura academica del ciclo activo (2026-1 en este proyecto) hacia ciclos pasados
-- (solo BD: course_cycle, profesores, tipos permitidos, evaluaciones, sesiones y sus profesores)
-- No replica documentos/drive/materiales.

SET @source_cycle_id = (
  SELECT CAST(ss.setting_value AS UNSIGNED)
  FROM system_setting ss
  WHERE ss.setting_key = 'ACTIVE_CYCLE_ID'
  LIMIT 1
);

SET @rec_not_available_id = (
  SELECT cers.id
  FROM class_event_recording_status cers
  WHERE cers.code = 'NOT_AVAILABLE'
  LIMIT 1
);

DROP TEMPORARY TABLE IF EXISTS tmp_target_cycles;
CREATE TEMPORARY TABLE tmp_target_cycles AS
SELECT ac.id, ac.code, ac.start_date, ac.end_date
FROM academic_cycle ac
INNER JOIN academic_cycle src ON src.id = @source_cycle_id
WHERE ac.id <> src.id
  AND ac.end_date < src.start_date;

DROP TEMPORARY TABLE IF EXISTS tmp_source_course_cycles;
CREATE TEMPORARY TABLE tmp_source_course_cycles AS
SELECT cc.id AS source_course_cycle_id, cc.course_id
FROM course_cycle cc
WHERE cc.academic_cycle_id = @source_cycle_id;

-- 1) course_cycle
INSERT INTO course_cycle (course_id, academic_cycle_id, intro_video_url, intro_video_file_id)
SELECT
  scc.course_id,
  tc.id AS academic_cycle_id,
  NULL AS intro_video_url,
  NULL AS intro_video_file_id
FROM tmp_source_course_cycles scc
CROSS JOIN tmp_target_cycles tc
WHERE NOT EXISTS (
  SELECT 1
  FROM course_cycle cc
  WHERE cc.course_id = scc.course_id
    AND cc.academic_cycle_id = tc.id
);

DROP TEMPORARY TABLE IF EXISTS tmp_cc_map;
CREATE TEMPORARY TABLE tmp_cc_map AS
SELECT
  scc.source_course_cycle_id,
  cc_t.id AS target_course_cycle_id,
  cc_t.academic_cycle_id AS target_academic_cycle_id
FROM tmp_source_course_cycles scc
INNER JOIN course_cycle cc_s
  ON cc_s.id = scc.source_course_cycle_id
INNER JOIN course_cycle cc_t
  ON cc_t.course_id = cc_s.course_id
INNER JOIN tmp_target_cycles tc
  ON tc.id = cc_t.academic_cycle_id;

-- 2) course_cycle_professor
INSERT INTO course_cycle_professor (course_cycle_id, professor_user_id, assigned_at, revoked_at)
SELECT
  m.target_course_cycle_id,
  ccp.professor_user_id,
  NOW(),
  ccp.revoked_at
FROM course_cycle_professor ccp
INNER JOIN tmp_cc_map m
  ON m.source_course_cycle_id = ccp.course_cycle_id
WHERE NOT EXISTS (
  SELECT 1
  FROM course_cycle_professor x
  WHERE x.course_cycle_id = m.target_course_cycle_id
    AND x.professor_user_id = ccp.professor_user_id
);

-- 3) course_cycle_allowed_evaluation_type
INSERT INTO course_cycle_allowed_evaluation_type (
  course_cycle_id,
  evaluation_type_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  m.target_course_cycle_id,
  ccaet.evaluation_type_id,
  ccaet.is_active,
  NOW(),
  NULL
FROM course_cycle_allowed_evaluation_type ccaet
INNER JOIN tmp_cc_map m
  ON m.source_course_cycle_id = ccaet.course_cycle_id
WHERE NOT EXISTS (
  SELECT 1
  FROM course_cycle_allowed_evaluation_type x
  WHERE x.course_cycle_id = m.target_course_cycle_id
    AND x.evaluation_type_id = ccaet.evaluation_type_id
);

DROP TEMPORARY TABLE IF EXISTS tmp_eval_source;
CREATE TEMPORARY TABLE tmp_eval_source AS
SELECT
  e.id AS source_evaluation_id,
  e.course_cycle_id AS source_course_cycle_id,
  e.evaluation_type_id,
  e.number,
  TIMESTAMPDIFF(SECOND, acs.start_date, e.start_date) AS start_offset_sec,
  TIMESTAMPDIFF(SECOND, acs.start_date, e.end_date) AS end_offset_sec
FROM evaluation e
INNER JOIN course_cycle ccs
  ON ccs.id = e.course_cycle_id
INNER JOIN academic_cycle acs
  ON acs.id = ccs.academic_cycle_id
WHERE ccs.academic_cycle_id = @source_cycle_id;

-- 4) evaluation
INSERT INTO evaluation (course_cycle_id, evaluation_type_id, number, start_date, end_date)
SELECT
  m.target_course_cycle_id,
  es.evaluation_type_id,
  es.number,
  DATE_ADD(act.start_date, INTERVAL es.start_offset_sec SECOND) AS start_date,
  DATE_ADD(act.start_date, INTERVAL es.end_offset_sec SECOND) AS end_date
FROM tmp_eval_source es
INNER JOIN tmp_cc_map m
  ON m.source_course_cycle_id = es.source_course_cycle_id
INNER JOIN academic_cycle act
  ON act.id = m.target_academic_cycle_id
WHERE NOT EXISTS (
  SELECT 1
  FROM evaluation x
  WHERE x.course_cycle_id = m.target_course_cycle_id
    AND x.evaluation_type_id = es.evaluation_type_id
    AND x.number = es.number
);

DROP TEMPORARY TABLE IF EXISTS tmp_eval_map;
CREATE TEMPORARY TABLE tmp_eval_map AS
SELECT
  es.source_evaluation_id,
  et.id AS target_evaluation_id,
  m.target_academic_cycle_id
FROM tmp_eval_source es
INNER JOIN tmp_cc_map m
  ON m.source_course_cycle_id = es.source_course_cycle_id
INNER JOIN evaluation et
  ON et.course_cycle_id = m.target_course_cycle_id
 AND et.evaluation_type_id = es.evaluation_type_id
 AND et.number = es.number;

DROP TEMPORARY TABLE IF EXISTS tmp_ce_source;
CREATE TEMPORARY TABLE tmp_ce_source AS
SELECT
  ce.id AS source_class_event_id,
  ce.evaluation_id AS source_evaluation_id,
  ce.session_number,
  ce.title,
  ce.topic,
  ce.live_meeting_url,
  ce.is_cancelled,
  ce.created_by,
  TIMESTAMPDIFF(SECOND, acs.start_date, ce.start_datetime) AS start_offset_sec,
  TIMESTAMPDIFF(SECOND, acs.start_date, ce.end_datetime) AS end_offset_sec
FROM class_event ce
INNER JOIN evaluation e
  ON e.id = ce.evaluation_id
INNER JOIN course_cycle ccs
  ON ccs.id = e.course_cycle_id
INNER JOIN academic_cycle acs
  ON acs.id = ccs.academic_cycle_id
WHERE ccs.academic_cycle_id = @source_cycle_id;

-- 5) class_event
INSERT INTO class_event (
  evaluation_id,
  session_number,
  title,
  topic,
  start_datetime,
  end_datetime,
  live_meeting_url,
  recording_url,
  recording_file_id,
  recording_status_id,
  is_cancelled,
  created_by,
  created_at,
  updated_at
)
SELECT
  em.target_evaluation_id,
  ces.session_number,
  ces.title,
  ces.topic,
  DATE_ADD(act.start_date, INTERVAL ces.start_offset_sec SECOND) AS start_datetime,
  DATE_ADD(act.start_date, INTERVAL ces.end_offset_sec SECOND) AS end_datetime,
  ces.live_meeting_url,
  NULL AS recording_url,
  NULL AS recording_file_id,
  @rec_not_available_id AS recording_status_id,
  ces.is_cancelled,
  ces.created_by,
  NOW(),
  NULL
FROM tmp_ce_source ces
INNER JOIN tmp_eval_map em
  ON em.source_evaluation_id = ces.source_evaluation_id
INNER JOIN academic_cycle act
  ON act.id = em.target_academic_cycle_id
WHERE @rec_not_available_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM class_event x
    WHERE x.evaluation_id = em.target_evaluation_id
      AND x.session_number = ces.session_number
  );

DROP TEMPORARY TABLE IF EXISTS tmp_ce_map;
CREATE TEMPORARY TABLE tmp_ce_map AS
SELECT
  ces.source_class_event_id,
  cet.id AS target_class_event_id
FROM tmp_ce_source ces
INNER JOIN tmp_eval_map em
  ON em.source_evaluation_id = ces.source_evaluation_id
INNER JOIN class_event cet
  ON cet.evaluation_id = em.target_evaluation_id
 AND cet.session_number = ces.session_number;

-- 6) class_event_professor
INSERT INTO class_event_professor (class_event_id, professor_user_id, assigned_at, revoked_at)
SELECT
  cm.target_class_event_id,
  cep.professor_user_id,
  NOW(),
  cep.revoked_at
FROM class_event_professor cep
INNER JOIN tmp_ce_map cm
  ON cm.source_class_event_id = cep.class_event_id
WHERE NOT EXISTS (
  SELECT 1
  FROM class_event_professor x
  WHERE x.class_event_id = cm.target_class_event_id
    AND x.professor_user_id = cep.professor_user_id
);

-- 7) Matriculas FULL historicas para alumno de prueba
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

DROP TEMPORARY TABLE IF EXISTS tmp_source_full_courses;
CREATE TEMPORARY TABLE tmp_source_full_courses AS
SELECT DISTINCT cc.course_id
FROM enrollment e
INNER JOIN enrollment_type et
  ON et.id = e.enrollment_type_id
INNER JOIN course_cycle cc
  ON cc.id = e.course_cycle_id
WHERE e.user_id = @target_student_id
  AND e.cancelled_at IS NULL
  AND et.code = 'FULL'
  AND cc.academic_cycle_id = @source_cycle_id;

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
  cc_t.id AS course_cycle_id,
  @enrollment_status_active_id,
  @enrollment_type_full_id,
  NOW(),
  NULL
FROM tmp_source_full_courses sfc
INNER JOIN course_cycle cc_t
  ON cc_t.course_id = sfc.course_id
INNER JOIN tmp_target_cycles tc
  ON tc.id = cc_t.academic_cycle_id
WHERE @target_student_id IS NOT NULL
  AND @enrollment_status_active_id IS NOT NULL
  AND @enrollment_type_full_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment e
    WHERE e.user_id = @target_student_id
      AND e.course_cycle_id = cc_t.id
      AND e.cancelled_at IS NULL
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
  e.id AS enrollment_id,
  ev.id AS evaluation_id,
  ev.start_date AS access_start_date,
  ev.end_date AS access_end_date,
  TRUE,
  NULL,
  NULL
FROM enrollment e
INNER JOIN course_cycle cc
  ON cc.id = e.course_cycle_id
INNER JOIN tmp_target_cycles tc
  ON tc.id = cc.academic_cycle_id
INNER JOIN tmp_source_full_courses sfc
  ON sfc.course_id = cc.course_id
INNER JOIN evaluation ev
  ON ev.course_cycle_id = cc.id
WHERE e.user_id = @target_student_id
  AND e.cancelled_at IS NULL
  AND e.enrollment_type_id = @enrollment_type_full_id
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment_evaluation ee
    WHERE ee.enrollment_id = e.id
      AND ee.evaluation_id = ev.id
  );

-- Verificacion
SELECT COUNT(*) AS total_target_cycles
FROM tmp_target_cycles;

SELECT COUNT(*) AS total_course_cycles_replicados
FROM course_cycle cc
INNER JOIN tmp_target_cycles tc ON tc.id = cc.academic_cycle_id
INNER JOIN tmp_source_course_cycles scc ON scc.course_id = cc.course_id;

SELECT COUNT(*) AS total_enrollments_full_historicos_alumno_prueba
FROM enrollment e
INNER JOIN course_cycle cc ON cc.id = e.course_cycle_id
INNER JOIN tmp_target_cycles tc ON tc.id = cc.academic_cycle_id
INNER JOIN tmp_source_full_courses sfc ON sfc.course_id = cc.course_id
WHERE e.user_id = @target_student_id
  AND e.cancelled_at IS NULL
  AND e.enrollment_type_id = @enrollment_type_full_id;
