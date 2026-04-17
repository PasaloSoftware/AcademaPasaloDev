INSERT INTO role (code, name) VALUES
('SUPER_ADMIN', 'Super Administrador'),
('ADMIN', 'Administrador'),
('PROFESSOR', 'Profesor'),
('STUDENT', 'Alumno');

INSERT INTO course_type (code, name) VALUES
('CIENCIAS', 'Ciencias'),
('LETRAS', 'Letras'),
('FACULTAD', 'Facultad');

INSERT INTO cycle_level (level_number, name) VALUES
(1, 'Primer Ciclo'),
(2, 'Segundo Ciclo'),
(3, 'Tercer Ciclo'),
(4, 'Cuarto Ciclo'),
(5, 'Quinto Ciclo'),
(6, 'Sexto Ciclo'),
(7, 'Septimo Ciclo'),
(8, 'Octavo Ciclo'),
(9, 'Noveno Ciclo'),
(10, 'Décimo Ciclo');

INSERT INTO enrollment_status (code, name) VALUES
('ACTIVE', 'Matricula Activa'),
('CANCELLED', 'Matricula Cancelada'),
('SUSPENDED', 'Matricula Suspendida');

INSERT INTO evaluation_type (code, name) VALUES
('PC', 'Practica Calificada'),
('PD', 'Practica Dirigida'),
('EX', 'Examen'),
('LAB', 'Laboratorio'),
('TUTORING', 'Tutoria Especializada'),
('BANCO_ENUNCIADOS', 'Banco de Enunciados'),
('TALLER_LIBRE', 'Talleres Libres');

INSERT INTO academic_cycle (code, start_date, end_date, created_at) VALUES
('2024-1', '2024-01-08', '2024-03-31', NOW()),
('2024-2', '2024-04-01', '2024-06-30', NOW()),
('2025-1', '2025-03-20', '2025-07-15', NOW()),
('2025-2', '2025-08-15', '2025-12-20', NOW()),
('2026-0', '2026-01-03', '2026-03-15', NOW()),
('2026-1', '2026-04-01', '2026-07-15', NOW());

INSERT INTO system_setting (setting_key, setting_value, description, created_at)
VALUES (
  'ACTIVE_CYCLE_ID',
  (SELECT id FROM academic_cycle WHERE code = '2026-1' LIMIT 1),
  'ID del ciclo academico actual y activo en el sistema',
  NOW()
);

INSERT INTO folder_status (code, name) VALUES
('ACTIVE', 'Activa'),
('HIDDEN', 'Oculta'),
('ARCHIVED', 'Archivada');

INSERT INTO material_status (code, name) VALUES
('ACTIVE', 'Activo'),
('HIDDEN', 'Oculto'),
('ARCHIVED', 'Archivado');

INSERT INTO deletion_request_status (code, name) VALUES
('PENDING', 'Pendiente de Revision'),
('APPROVED', 'Aprobada'),
('REJECTED', 'Rechazada');

INSERT INTO audit_action (code, name) VALUES
('LOGIN', 'Inicio de sesion'),
('LOGOUT', 'Cierre de sesion'),
('LOGIN_ANOMALY', 'Inicio de sesion anomalo'),
('FILE_UPLOAD', 'Subida de archivo'),
('CLASS_RECORDING_PUBLISHED', 'Publicacion de grabacion de clase'),
('FILE_EDIT', 'Edicion de archivo'),
('FILE_DELETE_REQUEST', 'Solicitud de eliminacion de archivo'),
('FILE_ARCHIVE', 'Archivado de archivo o carpeta'),
('CONTENT_DISABLE', 'Desactivacion de contenido');

INSERT INTO audit_action (code, name) VALUES
('FILE_DELETE', 'Eliminacion permanente de archivo o recurso');

INSERT INTO audit_action (code, name) VALUES
('USER_ADMIN_EDIT', 'Edicion administrativa integral de usuario');

INSERT INTO system_setting (setting_key, setting_value, description, created_at)
VALUES (
  'AUDIT_CLEANUP_RETENTION_DAYS',
  '30',
  'Dias de retencion de logs de auditoria y eventos de seguridad antes de la depuracion automatica.',
  NOW()
);

-- Tambien necesitamos el codigo de accion para el log de auto-limpieza
INSERT INTO audit_action (code, name)
VALUES ('AUDIT_CLEANUP_EXECUTED', 'Ejecucion de limpieza automatica de logs');

INSERT INTO security_event_type (code, name) VALUES
('CONCURRENT_SESSION_DETECTED', 'Deteccion de sesion concurrente'),
('CONCURRENT_SESSION_RESOLVED', 'Resolucion de sesion concurrente'),
('ANOMALOUS_LOGIN_DETECTED', 'Inicio de sesion potencialmente anomalo detectado'),
('ANOMALOUS_LOGIN_REAUTH_SUCCESS', 'Reautenticacion exitosa tras login anomalo'),
('ANOMALOUS_LOGIN_REAUTH_FAILED', 'Reautenticacion fallida tras login anomalo'),
('LOGIN_SUCCESS', 'Inicio de sesion de manera exitosa'),
('LOGOUT_SUCCESS', 'Cierre de sesion exitoso');

INSERT INTO security_event_type (code, name) VALUES
('NEW_DEVICE_DETECTED', 'Acceso detectado desde un dispositivo nuevo'),
('LOGIN_FAILED', 'Intento de inicio de sesion fallido'),
('ACCESS_DENIED', 'Acceso denegado a recurso protegido'),
('PROFILE_SWITCH', 'Cambio de perfil de usuario');

INSERT INTO enrollment_type (code, name) VALUES
('FULL', 'Curso Completo'),
('PARTIAL', 'Por Evaluacion');

INSERT INTO careers (name) VALUES
('Contabilidad'),
('Física'),
('Ingeniería Civil'),
('Matemáticas'),
('Química'),
('Ingeniería Ambiental y Sostenible'),
('Ingeniería de las Telecomunicaciones'),
('Ingeniería de Minas'),
('Ingeniería Electrónica'),
('Ingeniería Geológica'),
('Ingeniería Industrial'),
('Ingeniería Informática'),
('Ingeniería Mecánica'),
('Ingeniería Mecatrónica'),
('Ingeniería Química'),
('Comunicación Audiovisual'),
('Comunicación para el Desarrollo'),
('Periodismo'),
('Publicidad'),
('Antropología'),
('Ciencia Política y Gobierno'),
('Economía'),
('Finanzas'),
('Relaciones Internacionales'),
('Sociología'),
('Derecho'),
('Educación Inicial'),
('Educación Primaria'),
('Educación Secundaria'),
('Gestión'),
('Gastronomía'),
('Hotelería'),
('Turismo'),
('Arqueología'),
('Filosofía'),
('Geografía y Medio Ambiente'),
('Historia'),
('Humanidades'),
('Lingüística y Literatura'),
('Psicología');


INSERT INTO notification_type (code, name) VALUES
('AUDIT_EXPORT_READY', 'Reporte de Auditoria Listo');

INSERT INTO system_setting (setting_key, setting_value, description, created_at) VALUES
-- Umbrales por IP (deteccion gruesa, no distrital)
('GEO_IP_ANOMALY_TIME_WINDOW_MINUTES', '60', 'Ventana de tiempo (min) para evaluar anomalias de ubicacion basadas en IP.', NOW()),
('GEO_IP_ANOMALY_DISTANCE_KM', '300', 'Distancia (km) para considerar anomala la ubicacion basada en IP.', NOW()),

-- Umbrales por geolocalizacion real (GPS / navegador)
('GEO_GPS_ANOMALY_TIME_WINDOW_MINUTES', '30', 'Ventana de tiempo (min) para evaluar anomalias usando geolocalizacion real.', NOW()),
('GEO_GPS_ANOMALY_DISTANCE_KM', '10', 'Distancia (km) para detectar cambios anomalos a nivel urbano/distrital.', NOW());
     
INSERT INTO session_status (code, name) VALUES
('ACTIVE', 'Sesion Activa'),
('PENDING_CONCURRENT_RESOLUTION', 'Resolucion de Sesion Concurrente Pendiente'),
('BLOCKED_PENDING_REAUTH', 'Bloqueado por Anomalia (Requiere Re-autenticacion)'),
('REVOKED', 'Sesion Revocada / Cerrada');

INSERT INTO class_event_recording_status (code, name) VALUES
('NOT_AVAILABLE', 'Grabacion no disponible'),
('PROCESSING', 'Grabacion en procesamiento'),
('READY', 'Grabacion disponible'),
('FAILED', 'Grabacion con error de procesamiento');

-- MI USUARIO DE PRUEBA
INSERT INTO user (email, first_name, last_name_1, last_name_2, profile_photo_url, photo_source, created_at) 
VALUES 
('alumnopasalo@gmail.com', 'Alumno', 'Pasalo', NULL, NULL, 'google', NOW());

INSERT INTO user_role (user_id, role_id) 
VALUES 
(LAST_INSERT_ID(), 4);

INSERT INTO user (email, first_name, last_name_1, last_name_2, profile_photo_url, photo_source, created_at) 
VALUES 
('docentepasalo@gmail.com', 'Docente', 'Pasalo', NULL, NULL, 'google', NOW());

INSERT INTO user_role (user_id, role_id) 
VALUES 
(LAST_INSERT_ID(), 3);

INSERT INTO user_role (user_id, role_id) 
VALUES 
(2, 1);

INSERT INTO notification_type (code, name) VALUES
('NEW_MATERIAL', 'Nuevo Material Disponible'),
('MATERIAL_UPDATED', 'Material Actualizado'),
('CLASS_SCHEDULED', 'Nueva Clase Programada'),
('CLASS_UPDATED', 'Clase Actualizada'),
('CLASS_CANCELLED', 'Clase Cancelada'),
('CLASS_REMINDER', 'Recordatorio de Clase'),
('CLASS_RECORDING_AVAILABLE', 'Grabacion Disponible'),
('DELETION_REQUEST_APPROVED', 'Solicitud de Eliminacion Aprobada'),
('DELETION_REQUEST_REJECTED', 'Solicitud de Eliminacion Rechazada');

INSERT INTO system_setting (setting_key, setting_value, description, created_at) VALUES
('NOTIFICATION_CLEANUP_RETENTION_DAYS', '180', 'Dias de retencion de notificaciones antes de la depuracion automatica mensual.', NOW()),
('NOTIFICATION_REMINDER_MINUTES',       '1440', 'Minutos de antelacion con los que se envia el recordatorio de clase (default: 24h).', NOW());

-- Superadmin y admins productivos
SET @role_super_admin_id = (SELECT r.id FROM role r WHERE r.code = 'SUPER_ADMIN' LIMIT 1);
SET @role_admin_id = (SELECT r.id FROM role r WHERE r.code = 'ADMIN' LIMIT 1);

INSERT INTO user (email, first_name, last_name_1, last_name_2, profile_photo_url, photo_source, created_at)
SELECT
  src.email,
  src.first_name,
  src.last_name_1,
  NULL AS last_name_2,
  NULL AS profile_photo_url,
  'none' AS photo_source,
  NOW() AS created_at
FROM (
  SELECT 'admin@academiapasalo.com' AS email, 'Academia' AS first_name, 'Pasalo' AS last_name_1
  UNION ALL SELECT 'levano.kevin@pucp.edu.pe' AS email, 'Kevin' AS first_name, 'Levano' AS last_name_1
  UNION ALL SELECT 'm.sulcal@pucp.edu.pe' AS email, 'Matias' AS first_name, 'Sulca' AS last_name_1
  UNION ALL SELECT 'dcastilla@pucp.edu.pe' AS email, 'Diego' AS first_name, 'Castilla' AS last_name_1
  UNION ALL SELECT 'BlockAnd2003@gmail.com' AS email, 'Block' AS first_name, 'Block' AS last_name_1
) src
WHERE NOT EXISTS (
  SELECT 1
  FROM user u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(src.email))
);

INSERT INTO user_role (user_id, role_id)
SELECT
  u.id,
  @role_super_admin_id
FROM user u
WHERE LOWER(TRIM(u.email)) = 'admin@academiapasalo.com'
  AND @role_super_admin_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM user_role ur
    WHERE ur.user_id = u.id
      AND ur.role_id = @role_super_admin_id
  );

INSERT INTO user_role (user_id, role_id)
SELECT
  u.id,
  @role_admin_id
FROM user u
WHERE LOWER(TRIM(u.email)) IN (
  'blockand2003@gmail.com',
  'levano.kevin@pucp.edu.pe',
  'm.sulcal@pucp.edu.pe',
  'dcastilla@pucp.edu.pe'
)
  AND @role_admin_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM user_role ur
    WHERE ur.user_id = u.id
      AND ur.role_id = @role_admin_id
  );
