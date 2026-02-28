# Notificaciones — Fases de Implementación

Este documento contiene el detalle de cada fase de implementación, su estado actual y el checklist de verificación final.

Para el diseño, el modelo de datos y las decisiones de arquitectura, ver **`NOTIFICACIONES_DISENO.md`**.

---

## Estado de las Fases

| Fase | Descripción                          | Estado     |
| :--- | :----------------------------------- | :--------- |
| 0    | Fix validación fecha pasada (prereq) | COMPLETADO |
| 1    | Base de Datos y Entidades            | COMPLETADO |
| 2    | Repositorios                         | COMPLETADO |
| 3    | Servicios y Processor BullMQ         | PENDIENTE  |
| 4    | Módulo, Controlador e Integración    | PENDIENTE  |
| 5    | Verificación Final                   | PENDIENTE  |

---

## FASE 0 — Prerequisito: Validación de Fecha Pasada

**Archivo**: `src/modules/events/application/class-events-scheduling.service.ts`

Agregar al inicio del método `validateEventDates()`, antes de cualquier otra validación:

```typescript
if (startTime <= Date.now()) {
  throw new BadRequestException(
    'La fecha de inicio de la clase debe ser una fecha futura',
  );
}
```

Esta validación debe ejecutarse incluso antes que el check `endTime <= startTime`, ya que si la fecha de inicio es pasada el resto de las validaciones no tiene sentido.

---

## FASE 1 — Base de Datos y Entidades

**Objetivo**: Definir el esquema SQL correcto, crear las entidades TypeORM y las constantes del dominio. Nada de lógica de negocio aún.

**Archivos a modificar/crear:**

### `db/creacion_tablas_academia_pasalo_v1.sql`

- Reemplazar las definiciones de `notification` y `user_notification` con las versiones extendidas del apartado 3 de `NOTIFICACIONES_DISENO.md`.
- Agregar la nueva tabla `notification_type` antes de `notification` (dependencia FK).
- Actualizar el índice de `user_notification` con los dos índices definidos en el apartado 3.

### `db/datos_iniciales_academa_pasalo_v1.sql`

- Agregar los 7 `INSERT INTO notification_type` definidos en el apartado 3 de `NOTIFICACIONES_DISENO.md`.
- Agregar `INSERT INTO system_setting` para `NOTIFICATION_CLEANUP_RETENTION_DAYS` (valor `'180'`) y `NOTIFICATION_REMINDER_MINUTES` (valor `'1440'`), siguiendo el mismo formato de los settings existentes.

### `db/eliminar_tablas_academia_pasalo_v1.sql`

- Agregar `DROP TABLE IF EXISTS user_notification;`, `DROP TABLE IF EXISTS notification;` y `DROP TABLE IF EXISTS notification_type;` en el orden correcto (respetar dependencias FK: primero `user_notification`, luego `notification`, luego `notification_type`).

### `src/modules/notifications/domain/notification-type.entity.ts` (nuevo)

```typescript
// Entidad que mapea la tabla notification_type
// Campos: id (bigint/string), code (varchar unique), name (varchar)
// Sin relaciones inversas requeridas en esta entidad
```

### `src/modules/notifications/domain/notification.entity.ts` (nuevo)

```typescript
// Entidad que mapea la tabla notification extendida
// Campos: id, notificationTypeId (FK), notificationType (ManyToOne), title, message,
//         entityType (nullable), entityId (nullable bigint), createdAt
```

### `src/modules/notifications/domain/user-notification.entity.ts` (nuevo)

```typescript
// Entidad con PK compuesta (userId + notificationId)
// @PrimaryColumn para ambos campos
// Campos: userId, notificationId, isRead (boolean), readAt (datetime nullable)
// ManyToOne a User y ManyToOne a Notification
```

### `src/modules/notifications/domain/notification.constants.ts` (nuevo)

Debe incluir:

- `NOTIFICATION_TYPE_CODES` — objeto con los 7 códigos definidos en el apartado 3 de `NOTIFICACIONES_DISENO.md`.
- `NOTIFICATION_JOB_NAMES` — `{ DISPATCH: 'dispatch-notification', CLEANUP: 'cleanup-old-notifications', CLASS_REMINDER: 'class-reminder' }`.
- `NOTIFICATION_CACHE_KEYS` — `{ UNREAD_COUNT: (userId: string) => \`cache:notifications:unread-count:${userId}\`` }`.
- `NOTIFICATION_SYSTEM_SETTING_KEYS` — `{ CLEANUP_RETENTION_DAYS: 'NOTIFICATION_CLEANUP_RETENTION_DAYS', REMINDER_MINUTES: 'NOTIFICATION_REMINDER_MINUTES' }`.
- `NOTIFICATION_CONSTRAINTS` — `{ REMINDER_MIN_MINUTES: 30, REMINDER_MAX_MINUTES: 10080, RETENTION_MIN_DAYS: 30, REMINDER_MIN_ENQUEUE_MS: 120000 }`. El valor `REMINDER_MIN_ENQUEUE_MS` (2 minutos en ms) es el umbral mínimo de delay por debajo del cual no se encola el recordatorio aunque el delay sea técnicamente positivo.
- `NOTIFICATION_ENTITY_TYPES` — `{ MATERIAL: 'material', CLASS_EVENT: 'class_event', ENROLLMENT: 'enrollment' }`.

### `src/config/technical-settings.ts`

Agregar sección `notifications`:

```typescript
notifications: {
  // src/modules/notifications/application/notifications.service.ts
  cleanupCronPattern: '0 0 2 1 * *',
  // src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts
  retentionDefaultDays: 180,
  // src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts
  retentionMinSafeDays: 30,
  // src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts
  cleanupBatchSize: 5000,
  // src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts
  maxCleanupBatchesPerRun: 100,
  // src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts
  reminderDefaultMinutes: 1440,
  // src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts
  reminderMinMinutes: 30,
  // src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts
  reminderMaxMinutes: 10080,
  // src/modules/notifications/application/notifications-dispatch.service.ts
  reminderMinEnqueueMs: 120000,   // 2 minutos — delay mínimo para encolar recordatorio
  // src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts
  workerLockDurationMs: 120000,   // 2 minutos — lockDuration del worker BullMQ
  // src/modules/notifications/infrastructure/notification.repository.ts
  defaultPageLimit: 20,
  // src/modules/notifications/infrastructure/user-notification.repository.ts
  unreadCountCacheTtlSeconds: 60,
},
```

**Verificación al finalizar**: Las entidades compilan sin errores TypeScript. Los 3 archivos SQL son coherentes entre sí (lo que se crea en `creacion` se elimina en `eliminar`, y los datos de `datos_iniciales` referencian tablas/PKs existentes).

---

## FASE 2 — Repositorios

**Objetivo**: Implementar las 3 clases de repositorio con todos los métodos necesarios para la fase 3 (servicios).

**Archivos a crear:**

### `src/modules/notifications/infrastructure/notification-type.repository.ts`

Métodos:

- `findByCode(code: string): Promise<NotificationType | null>` — con cache en Redis (TTL 6 horas, igual que los catálogos de audit). Cache key: `cache:notifications:type:${code}`.

### `src/modules/notifications/infrastructure/notification.repository.ts`

Métodos:

- `create(data: Partial<Notification>): Promise<Notification>` — inserta una notificación.
- `findByUserPaginated(userId: string, onlyUnread: boolean, limit: number, offset: number): Promise<Notification[]>` — JOIN con `user_notification` filtrado por `userId`, opcionalmente solo `is_read = false`, ordenado por `notification.created_at DESC`, con paginación.
- `deleteOlderThan(date: Date, batchSize: number): Promise<number>` — batch DELETE igual al patrón de `AuditLogRepository.deleteOlderThan`. Borra de `notification` (el CASCADE elimina `user_notification` automáticamente).

### `src/modules/notifications/infrastructure/user-notification.repository.ts`

Métodos:

- `bulkCreate(rows: Array<{ userId: string; notificationId: string }>): Promise<void>` — un único `INSERT INTO user_notification (user_id, notification_id, is_read) VALUES (...), (...), (...)` usando `repository.insert([...])` de TypeORM. **Nunca un loop de `.save()`**.
- `countUnread(userId: string): Promise<number>` — `SELECT COUNT(*) WHERE user_id = ? AND is_read = false`. Resultado cacheado en Redis con TTL de 60 segundos.
- `markAsRead(userId: string, notificationId: string): Promise<void>` — UPDATE `is_read = true, read_at = NOW()` donde `user_id = ? AND notification_id = ?`. Invalida cache de conteo.
- `markAllAsRead(userId: string): Promise<void>` — UPDATE masivo `is_read = true, read_at = NOW()` donde `user_id = ? AND is_read = false`. Invalida cache de conteo.

**Verificación al finalizar**: Compilación sin errores. Revisar que `bulkCreate` genera un único query de INSERT, no N queries.

---

## FASE 3 — Servicios y Processor BullMQ

**Objetivo**: Implementar toda la lógica de negocio: dispatch de notificaciones, procesamiento de jobs, CRUD para el usuario, limpieza periódica y recordatorios.

**Archivos a crear:**

### `src/modules/notifications/application/notifications.service.ts`

Implementa `OnApplicationBootstrap`.

Responsabilidades:

- `onApplicationBootstrap()`: Registrar el job repetible de limpieza de forma idempotente (mismo patrón que `AuditService.setupRepeatableJobs()`). Job name: `NOTIFICATION_JOB_NAMES.CLEANUP`. Cron: `technicalSettings.notifications.cleanupCronPattern`.
- `getMyNotifications(userId, onlyUnread, limit, offset)`: Delega a `UserNotificationRepository.findByUserPaginated` (que devuelve `UserNotification[]` con la notificación cargada). No usa cache propio.
- `getUnreadCount(userId)`: Delega a `UserNotificationRepository.countUnread` (que ya tiene su propio cache de 60 segundos).
- `markAsRead(userId, notificationId)`: Valida que la notificación exista y pertenezca al usuario, luego delega a `UserNotificationRepository.markAsRead`.
- `markAllAsRead(userId)`: Delega a `UserNotificationRepository.markAllAsRead`.

### `src/modules/notifications/application/notifications-dispatch.service.ts`

Es el servicio que los módulos externos inyectan para disparar notificaciones. Solo encola jobs en BullMQ — no hace nada más.

Métodos públicos (cada uno encola un job con el payload mínimo necesario):

- `dispatchNewMaterial(materialId: string, folderId: string): Promise<void>`
- `dispatchClassScheduled(classEventId: string): Promise<void>`
- `dispatchClassUpdated(classEventId: string): Promise<void>`
- `dispatchClassCancelled(classEventId: string): Promise<void>`
- `scheduleClassReminder(classEventId: string, startDatetime: Date): Promise<void>` — calcula el delay, verifica que sea > `REMINDER_MIN_ENQUEUE_MS`, elimina job previo con mismo `jobId` si existe, encola el delayed job.
- `cancelClassReminder(classEventId: string): Promise<void>` — elimina el delayed job del recordatorio si existe.

Todos los métodos usan `try/catch` y loggean `warn` en caso de fallo — **nunca deben propagar errores al caller**.

### `src/modules/notifications/infrastructure/processors/notification-dispatch.processor.ts`

`@Processor(QUEUES.NOTIFICATIONS, { lockDuration: technicalSettings.notifications.workerLockDurationMs })`

Maneja todos los job names del queue. En el método `process(job: Job)` hace dispatch por `job.name`:

**Para `dispatch-notification` (NEW_MATERIAL, CLASS_SCHEDULED, CLASS_UPDATED, CLASS_CANCELLED)**:

1. Leer payload del job (`{ type, ...contextIds }`).
2. Resolver destinatarios según el tipo (consulta a BD con los repositorios necesarios inyectados).
3. Construir el mensaje/título de la notificación según el tipo (usando constantes, nunca strings hardcodeados).
4. Insertar 1 fila en `notification`.
5. Bulk insert de N filas en `user_notification`.

**Para `class-reminder`**:

1. Leer payload `{ classEventId }`.
2. Leer `NOTIFICATION_REMINDER_MINUTES` de `SettingsService` con fallback a `technicalSettings.notifications.reminderDefaultMinutes`.
3. Validar que el valor esté dentro de `[reminderMinMinutes, reminderMaxMinutes]`. Si no, lanzar excepción (job queda `failed`).
4. Resolver destinatarios: profesores de la clase + alumnos activos del ciclo.
5. Insertar notificación + bulk insert de `user_notification`.

**Para `cleanup-old-notifications`**:

1. Leer `NOTIFICATION_CLEANUP_RETENTION_DAYS` de `SettingsService` con fallback a `technicalSettings.notifications.retentionDefaultDays`.
2. Validar `>= retentionMinSafeDays`. Si no, lanzar excepción.
3. Calcular `cutOffDate = now - retentionDays`.
4. Llamar a `NotificationRepository.deleteOlderThan(cutOffDate, batchSize)`.
5. Registrar resultado en logger estructurado.

**Resolución de destinatarios por tipo de notificación:**

Para tipos de clase (`CLASS_SCHEDULED`, `CLASS_UPDATED`, `CLASS_CANCELLED`, `CLASS_REMINDER`):

- Alumnos: `enrollment` WHERE `course_cycle_id = ? AND enrollment_status_id = <ACTIVE_ID>` (course_cycle obtenido via `class_event → evaluation → course_cycle_id`).
- Profesores: `class_event_professor` WHERE `class_event_id = ? AND revoked_at IS NULL`.

Para `NEW_MATERIAL`:

- Alumnos: `enrollment` WHERE `course_cycle_id = ? AND enrollment_status_id = <ACTIVE_ID>` (course_cycle obtenido via `material → material_folder → evaluation → course_cycle_id`).
- Profesores: `course_cycle_professor` WHERE `course_cycle_id = ? AND revoked_at IS NULL`.

**Construcción de mensajes por tipo** (usar constantes en `notification.constants.ts`, no strings hardcodeados en el processor):

- `NEW_MATERIAL`: Título: "Nuevo material disponible". Mensaje: "Se publicó '{displayName}' en el curso {courseName}."
- `CLASS_SCHEDULED`: Título: "Nueva clase programada". Mensaje: "La clase '{title}' ha sido programada para el {fecha}."
- `CLASS_UPDATED`: Título: "Clase actualizada". Mensaje: "La clase '{title}' ha sido reprogramada al {nuevaFecha}."
- `CLASS_CANCELLED`: Título: "Clase cancelada". Mensaje: "La clase '{title}' programada para el {fecha} ha sido cancelada."
- `CLASS_REMINDER`: Título: "Recordatorio de clase". Mensaje: "Tienes una clase '{title}' en {minutosRestantes} minutos."

**Campos `entity_type` / `entity_id` por tipo:**

- Tipos de clase (`CLASS_SCHEDULED`, `CLASS_UPDATED`, `CLASS_CANCELLED`, `CLASS_REMINDER`): `entity_type = 'class_event'`, `entity_id = classEventId`.
- `NEW_MATERIAL`: `entity_type = 'material_folder'`, `entity_id = folderId` (la carpeta donde se publicó el material). El frontend navega a `GET /materials/folders/:folderId` y el usuario ve el material nuevo junto al resto del contenido de esa carpeta.

**Tests en esta fase:**

Crear `src/modules/notifications/application/notifications.service.spec.ts`:

- Test: `getUnreadCount` retorna el valor del repositorio.
- Test: `markAsRead` lanza `NotFoundException` si la `user_notification` no existe para ese usuario.
- Test: `markAllAsRead` llama al repositorio con el `userId` correcto.
- Test: `onApplicationBootstrap` registra el job repetible de limpieza si no existe.
- Test: `onApplicationBootstrap` no duplica el scheduler si ya existe con el mismo patrón.

---

## FASE 4 — Módulo, Controlador e Integración

**Objetivo**: Ensamblar el módulo completo, crear el controlador HTTP e integrar los puntos de dispatch en los módulos existentes.

**Archivos a crear/modificar:**

### `src/modules/notifications/dto/notification-response.dto.ts` (nuevo)

```typescript
// Campos: id, type (código del tipo), title, message, entityType?, entityId?,
//         createdAt, isRead, readAt?
// Todos los tipos correctos, sin campos innecesarios
```

### `src/modules/notifications/dto/notification-count.dto.ts` (nuevo)

```typescript
// { unreadCount: number }
```

### `src/modules/notifications/presentation/notifications.controller.ts` (nuevo)

- `@Controller('notifications')`
- `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase.
- `@Roles(ROLE_CODES.STUDENT, ROLE_CODES.PROFESSOR, ROLE_CODES.ADMIN, ROLE_CODES.SUPER_ADMIN)` en todos los endpoints.
- Los 4 endpoints definidos en el apartado 8 de `NOTIFICACIONES_DISENO.md`.
- `@CurrentUser()` para extraer el `userId` del JWT.
- `@ResponseMessage('...')` en todos los endpoints GET.

### `src/modules/notifications/notifications.module.ts` (nuevo)

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationType,
      UserNotification,
    ]),
    BullModule.registerQueue({ name: QUEUES.NOTIFICATIONS }),
    SettingsModule,
    forwardRef(() => ClassEventsModule),
    forwardRef(() => MaterialsModule),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationRepository,
    NotificationTypeRepository,
    UserNotificationRepository,
    NotificationsService,
    NotificationsDispatchService,
    NotificationDispatchProcessor,
  ],
  exports: [NotificationsDispatchService],
})
export class NotificationsModule {}
```

> **Nota sobre `forwardRef`**: Si hay dependencias circulares, usar `forwardRef()` en ambos lados. Este patrón ya existe en el proyecto (`AuditModule ↔ AuthModule`).

### `src/app.module.ts`

Agregar `NotificationsModule` al array de `imports`, después de `ClassEventsModule`.

### `src/modules/events/class-events.module.ts`

- Agregar `forwardRef(() => NotificationsModule)` a `imports`.

### `src/modules/events/application/class-events-scheduling.service.ts`

- Inyectar `NotificationsDispatchService`.
- En `createEvent()`: llamar `dispatchClassScheduled` y `scheduleClassReminder` después de guardar exitosamente. Envuelto en `try/catch`.
- En `updateEvent()`: llamar `dispatchClassUpdated` y (si la fecha cambió) `cancelClassReminder` + `scheduleClassReminder`. Mismo manejo de errores.
- En `cancelEvent()`: llamar `dispatchClassCancelled` y `cancelClassReminder`. Mismo manejo de errores.

### `src/modules/materials/materials.module.ts`

- Agregar `forwardRef(() => NotificationsModule)` a `imports`.

### `src/modules/materials/application/materials.service.ts`

- Inyectar `NotificationsDispatchService`.
- En `uploadMaterial()` (o el método equivalente donde el material queda en estado PUBLISHED/ACTIVE): llamar `dispatchNewMaterial(materialId, folderId)`. Envuelto en `try/catch`.

**Tests en esta fase:**

Crear `test/notifications.e2e-spec.ts`:

- Test: `GET /notifications/my` retorna 401 sin token.
- Test: `GET /notifications/my` retorna lista vacía para usuario sin notificaciones.
- Test: `GET /notifications/count` retorna `{ unreadCount: 0 }` para usuario sin notificaciones.
- Test: `PATCH /notifications/:id/read` retorna 404 si la notificación no pertenece al usuario.
- Test: flujo completo — insertar manualmente una `notification` y un `user_notification`, llamar `GET /notifications/my`, verificar que aparece, llamar `PATCH /:id/read`, verificar que `isRead` es `true` y `readAt` no es null, llamar `GET /notifications/count`, verificar que el conteo es 0.

---

## FASE 5 — Verificación Final

**Objetivo**: Validar que todo el sistema es coherente, correcto y no tiene regresiones.

**Checklist de verificación:**

- [ ] `npm run build` sin errores TypeScript.
- [ ] `npm run lint` sin warnings.
- [ ] Los 3 archivos SQL son coherentes entre sí.
- [ ] Los datos iniciales en `datos_iniciales` referencian PKs válidas.
- [ ] El processor `NotificationDispatchProcessor` compila y el método `process()` cubre todos los `NOTIFICATION_JOB_NAMES`.
- [ ] `NotificationsDispatchService` envuelve todos sus métodos en `try/catch` — verificar que ningún error se propaga al caller.
- [ ] El `jobId` determinista para `class-reminder` usa exactamente el formato `class-reminder-{classEventId}`.
- [ ] El bulk insert en `UserNotificationRepository.bulkCreate` genera **un único** query SQL.
- [ ] `NotificationsModule` está registrado en `AppModule`.
- [ ] Todos los módulos modificados (`ClassEventsModule`, `MaterialsModule`) compilan sin errores de dependencias circulares.
- [ ] Los tests unitarios de `notifications.service.spec.ts` pasan.
- [ ] Los tests e2e de `notifications.e2e-spec.ts` pasan.
- [ ] El job de limpieza se registra correctamente al iniciar la app.
- [ ] **Verificar antes de integrar con `ClassEventsModule`**: `createEvent()` y `updateEvent()` en `ClassEventsSchedulingService` rechazan con `BadRequestException` cualquier `startDatetime` en el pasado (Fase 0).
