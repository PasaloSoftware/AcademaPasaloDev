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
(7, 'SÃ©ptimo Ciclo'),
(8, 'Octavo Ciclo'),
(9, 'Noveno Ciclo'),
(10, 'DÃ©cimo Ciclo');
(10, 'DÃ©cimo Ciclo');

INSERT INTO enrollment_status (code, name) VALUES
('ACTIVE', 'MatrÃ­cula Activa'),
('CANCELLED', 'MatrÃ­cula Cancelada'),
('SUSPENDED', 'MatrÃ­cula Suspendida');

INSERT INTO evaluation_type (code, name) VALUES
('PC', 'PrÃ¡ctica Calificada'),
('EX', 'Examen'),
('LAB', 'Laboratorio'),
('TUTORING', 'TutorÃ­a Especializada'),
('BANCO_ENUNCIADOS', 'Banco de Enunciados');

INSERT INTO academic_cycle (code, start_date, end_date, created_at) VALUES
('2024-1', '2024-01-08', '2024-03-31', NOW()),
('2024-2', '2024-04-01', '2024-06-30', NOW()),
('2025-1', '2025-01-06', '2025-03-31', NOW()),
('2025-2', '2025-04-01', '2025-06-30', NOW()),
('2026-0', '2026-01-09', '2026-03-31', NOW());

INSERT INTO system_setting (setting_key, setting_value, description, created_at)
VALUES (
  'ACTIVE_CYCLE_ID',
  (SELECT id FROM academic_cycle WHERE code = '2026-0' LIMIT 1),
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
('PENDING', 'Pendiente de RevisiÃ³n'),
('APPROVED', 'Aprobada'),
('REJECTED', 'Rechazada');

INSERT INTO audit_action (code, name) VALUES
('LOGIN', 'Inicio de sesiÃ³n'),
('LOGOUT', 'Cierre de sesiÃ³n'),
('LOGIN_ANOMALY', 'Inicio de sesiÃ³n anÃ³malo'),
('FILE_UPLOAD', 'Subida de archivo'),
('FILE_EDIT', 'EdiciÃ³n de archivo'),
('FILE_DELETE_REQUEST', 'Solicitud de eliminaciÃ³n de archivo'),
('FILE_ARCHIVE', 'Archivado de archivo o carpeta'),
('CONTENT_DISABLE', 'DesactivaciÃ³n  contenido');
('CONTENT_DISABLE', 'DesactivaciÃ³n de contenido');

INSERT INTO audit_action (code, name) VALUES
('FILE_DELETE', 'EliminaciÃ³n permanente de archivo o recurso');

INSERT INTO system_setting (setting_key, setting_value, description, created_at)
VALUES (
  'AUDIT_CLEANUP_RETENTION_DAYS',
  '30',
  'DÃ­as de retenciÃ³n de logs de auditorÃ­a y eventos de seguridad antes de la depuraciÃ³n automÃ¡tica.',
  NOW()
);

-- TambiÃ©n necesitamos el cÃ³digo de acciÃ³n para el log de auto-limpieza
INSERT INTO audit_action (code, name)
VALUES ('AUDIT_CLEANUP_EXECUTED', 'EjecuciÃ³n de limpieza automÃ¡tica de logs');

INSERT INTO security_event_type (code, name) VALUES
('CONCURRENT_SESSION_DETECTED', 'DetecciÃ³n de sesiÃ³n concurrente'),
('CONCURRENT_SESSION_RESOLVED', 'ResoluciÃ³n de sesiÃ³n concurrente'),
('ANOMALOUS_LOGIN_DETECTED', 'Inicio de sesiÃ³n potencialmente anÃ³malo detectado'),
('ANOMALOUS_LOGIN_REAUTH_SUCCESS', 'ReautenticaciÃ³n exitosa tras login anÃ³malo'),
('ANOMALOUS_LOGIN_REAUTH_FAILED', 'ReautenticaciÃ³n fallida tras login anÃ³malo'),
('LOGIN_SUCCESS', 'Inicio de sesiÃ³n de manera exitosa'),
('LOGOUT_SUCCESS', 'Cierre de sesiÃ³n exitoso');

INSERT INTO security_event_type (code, name) VALUES
('NEW_DEVICE_DETECTED', 'Acceso detectado desde un dispositivo nuevo'),
('LOGIN_FAILED', 'Intento de inicio de sesiÃ³n fallido'),
('ACCESS_DENIED', 'Acceso denegado a recurso protegido'),
('PROFILE_SWITCH', 'Cambio de perfil de usuario');

INSERT INTO enrollment_type (code, name) VALUES
('FULL', 'Curso Completo'),
('PARTIAL', 'Por EvaluaciÃ³n');


INSERT INTO system_setting (setting_key, setting_value, description, created_at) VALUES
-- Umbrales por IP (detecciÃ³n gruesa, no distrital)
('GEO_IP_ANOMALY_TIME_WINDOW_MINUTES', '60', 'Ventana de tiempo (min) para evaluar anomalÃ­as de ubicaciÃ³n basadas en IP.', NOW()),
('GEO_IP_ANOMALY_DISTANCE_KM', '300', 'Distancia (km) para considerar anÃ³mala la ubicaciÃ³n basada en IP.', NOW()),

-- Umbrales por geolocalizaciÃ³n real (GPS / navegador)
('GEO_GPS_ANOMALY_TIME_WINDOW_MINUTES', '30', 'Ventana de tiempo (min) para evaluar anomalÃ­as usando geolocalizaciÃ³n real.', NOW()),
('GEO_GPS_ANOMALY_DISTANCE_KM', '10', 'Distancia (km) para detectar cambios anÃ³malos a nivel urbano/distrital.', NOW());
     
INSERT INTO session_status (code, name) VALUES
('ACTIVE', 'SesiÃ³n Activa'),
('PENDING_CONCURRENT_RESOLUTION', 'ResoluciÃ³n de SesiÃ³n Concurrente Pendiente'),
('BLOCKED_PENDING_REAUTH', 'Bloqueado por AnomalÃ­a (Requiere Re-autenticaciÃ³n)'),
('REVOKED', 'SesiÃ³n Revocada / Cerrada');

INSERT INTO class_event_recording_status (code, name) VALUES
('NOT_AVAILABLE', 'GrabaciÃ³n no disponible'),
('PROCESSING', 'GrabaciÃ³n en procesamiento'),
('READY', 'GrabaciÃ³n disponible'),
('FAILED', 'GrabaciÃ³n con error de procesamiento');

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
('CLASS_SCHEDULED', 'Nueva Clase Programada'),
('CLASS_UPDATED', 'Clase Actualizada'),
('CLASS_CANCELLED', 'Clase Cancelada'),
('CLASS_REMINDER', 'Recordatorio de Clase'),
('DELETION_REQUEST_APPROVED', 'Solicitud de EliminaciÃ³n Aprobada'),
('DELETION_REQUEST_REJECTED', 'Solicitud de EliminaciÃ³n Rechazada');

INSERT INTO system_setting (setting_key, setting_value, description, created_at) VALUES
('NOTIFICATION_CLEANUP_RETENTION_DAYS', '180', 'DÃ­as de retenciÃ³n de notificaciones antes de la depuraciÃ³n automÃ¡tica mensual.', NOW()),
('NOTIFICATION_REMINDER_MINUTES',       '1440', 'Minutos de antelaciÃ³n con los que se envÃ­a el recordatorio de clase (default: 24h).', NOW());

