# Notificaciones — Diseño y Arquitectura

Este documento cubre el contexto, las decisiones de diseño, el modelo de datos y las reglas de integración del módulo de notificaciones. Es la referencia estable que no cambia entre fases.

Para el estado de implementación y el detalle de cada fase, ver **`NOTIFICACIONES_FASES.md`**.

---

## 1. Contexto del Proyecto

### Stack técnico

- **Framework**: NestJS con TypeScript estricto.
- **Base de datos**: MySQL con TypeORM. Todos los `id` son `BIGINT AUTO_INCREMENT` mapeados como `string` en TypeScript via `{ type: 'bigint' }`.
- **Cache**: Redis via `RedisCacheService` (`@infrastructure/cache/redis-cache.service`).
- **Cola de trabajos**: BullMQ via `@nestjs/bullmq`. El `QueueModule` es `@Global()` y ya está registrado en `AppModule`.
- **Autenticación**: JWT con `JwtAuthGuard` + `RolesGuard`. El usuario autenticado se extrae con el decorador `@CurrentUser()`.

### Convenciones arquitectónicas obligatorias

Todos los módulos siguen estrictamente esta estructura de carpetas (referencia: módulo `audit`):

```
src/modules/<nombre>/
  domain/           ← Entidades TypeORM + interfaces + constantes del dominio
  application/      ← Servicios de negocio
  infrastructure/   ← Repositorios + Processors de BullMQ
  presentation/     ← Controladores HTTP
  dto/              ← Clases DTO de entrada y salida
  <nombre>.module.ts
```

**Reglas de codificación que no se pueden violar:**

- Las constantes del dominio (códigos, cache keys, job names) van en `domain/<entity>.constants.ts`, no en los servicios.
- Los valores configurables con comentario de ubicación van en `src/config/technical-settings.ts`.
- Los processors BullMQ extienden `WorkerHost` y usan `@Processor(QUEUE_NAME)`.
- Los repositorios son clases `@Injectable()` con `@InjectRepository(Entity)`, no extienden nada.
- Los controladores usan `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase cuando todos sus endpoints requieren autenticación.
- Las respuestas exitosas usan el decorador `@ResponseMessage('...')` (excepto endpoints de stream/binary).
- Los logs estructurados usan `this.logger = new Logger(NombreClase.name)` con objetos JSON, nunca strings interpolados.
- Nunca se hardcodean strings mágicos en servicios ni controladores; siempre se usan constantes.

### Estado actual del módulo de notificaciones

El directorio `src/modules/notifications/` existe pero está **completamente vacío**. La constante `QUEUES.NOTIFICATIONS = 'notifications-queue'` ya existe en `src/infrastructure/queue/queue.constants.ts` — fue pre-planificada y no requiere modificación.

---

## 2. Qué son las Notificaciones en este Sistema

### Clasificación única: un solo sistema con tipos

Los requisitos mencionan "notificaciones académicas" y "notificaciones operativas". La distinción es únicamente conceptual por origen del evento, no por estructura ni tecnología. Ambas comparten el mismo modelo de datos, la misma lógica de lectura/no-lectura y el mismo conteo de no leídas. Se implementa un único sistema con un campo `notification_type` (tabla catálogo) que agrupa ambos conceptos. No tiene justificación técnica construir dos módulos separados.

### Tipos de notificaciones definidos

| Código            | Categoría conceptual  | Disparado por                                    | Destinatario                                      |
| :---------------- | :-------------------- | :----------------------------------------------- | :------------------------------------------------ |
| `NEW_MATERIAL`    | Académica             | Profesor sube material aprobado                  | Alumnos activos del ciclo del curso               |
| `CLASS_SCHEDULED` | Académica             | Profesor crea una clase nueva                    | Alumnos activos + Profesor(es) asignados al ciclo |
| `CLASS_UPDATED`   | Académica / Operativa | Profesor modifica fecha/hora/título de una clase | Alumnos activos + Profesor(es) asignados al ciclo |
| `CLASS_CANCELLED` | Académica / Operativa | Profesor cancela una clase                       | Alumnos activos + Profesor(es) asignados al ciclo |
| `CLASS_REMINDER`  | Académica / Operativa | Job BullMQ delayed, N minutos antes de la clase  | Alumnos activos + Profesor(es) asignados al ciclo |

### Decisiones de diseño tomadas

- **No se usan WebSockets.** Las notificaciones académicas no requieren tiempo real estricto. El front hace polling ligero (al cargar la app y cada 60 segundos) al endpoint de conteo. La simplicidad operacional supera el beneficio marginal de WebSockets para este caso de uso.
- **BullMQ para todo el procesamiento.** Justificación: (1) desacopla el request HTTP del proceso de insertar N filas para N destinatarios; (2) los recordatorios son inherentemente asíncronos y BullMQ tiene delayed jobs nativos; (3) la infraestructura ya existe y el patrón está establecido en el módulo `audit`.
- **Bulk insert para `user_notification`.** Una notificación genera 1 fila en `notification` y N filas en `user_notification`. Las N filas se insertan con un único `INSERT ... VALUES (...), (...), (...)` — nunca con un loop de `.save()` individual. Esto aplica desde el primer día sin excepción.
- **Lista de destinatarios se resuelve en el worker, no en el caller.** Cuando se encola el job, el payload solo contiene identificadores (`classEventId`, `courseCycleId`, `materialId`, etc.). El worker es quien consulta en el momento de ejecución qué usuarios están activamente matriculados. Esto garantiza que si entre la creación del evento y la ejecución del job cambian las matrículas, los datos son correctos.

---

## 3. Modelo de Datos

### Tablas existentes (demasiado básicas, se deben extender)

```sql
-- Actuales (insuficientes):
notification (id, message, created_at)
user_notification (user_id, notification_id, is_read)
```

### Tablas requeridas (modelo final)

#### `notification_type` (nueva tabla catálogo)

Igual al patrón de `audit_action`, `enrollment_status`, etc.

```sql
CREATE TABLE notification_type (
  id    BIGINT PRIMARY KEY AUTO_INCREMENT,
  code  VARCHAR(50)  NOT NULL UNIQUE,
  name  VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### `notification` (extensión de la tabla existente)

```sql
-- Reemplaza la tabla actual con esta definición extendida:
CREATE TABLE notification (
  id                   BIGINT PRIMARY KEY AUTO_INCREMENT,
  notification_type_id BIGINT       NOT NULL,
  title                VARCHAR(255) NOT NULL,
  message              VARCHAR(500) NOT NULL,
  entity_type          VARCHAR(50)  NULL,   -- 'material', 'class_event', 'enrollment'
  entity_id            BIGINT       NULL,   -- ID del recurso relacionado (deep-link)
  created_at           DATETIME     NOT NULL,
  CONSTRAINT fk_notification_type
    FOREIGN KEY (notification_type_id) REFERENCES notification_type(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_notification_created_at ON notification(created_at);
```

#### `user_notification` (extensión de la tabla existente)

```sql
-- Reemplaza la tabla actual con esta definición extendida:
CREATE TABLE user_notification (
  user_id         BIGINT   NOT NULL,
  notification_id BIGINT   NOT NULL,
  is_read         BOOLEAN  NOT NULL DEFAULT FALSE,
  read_at         DATETIME NULL,             -- timestamp de lectura (NULL = no leída)
  PRIMARY KEY (user_id, notification_id),
  CONSTRAINT fk_un_user
    FOREIGN KEY (user_id) REFERENCES user(id),
  CONSTRAINT fk_un_notification
    FOREIGN KEY (notification_id) REFERENCES notification(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_notification_unread ON user_notification(user_id, is_read);
CREATE INDEX idx_user_notification_date   ON user_notification(user_id, notification_id DESC);
```

> **Nota sobre `read_at`**: Se mantiene `is_read` (boolean) por eficiencia en el índice para conteo de no leídas. `read_at` complementa con el timestamp de cuándo fue leída. Al marcar como leída se actualizan ambos campos atómicamente.

> **Nota sobre `ON DELETE CASCADE`**: Si una notificación se elimina (por el job de limpieza), sus registros en `user_notification` se eliminan automáticamente. Evita huérfanos.

### Datos iniciales requeridos en `notification_type`

```sql
INSERT INTO notification_type (code, name) VALUES
  ('NEW_MATERIAL',    'Nuevo Material Disponible'),
  ('CLASS_SCHEDULED', 'Nueva Clase Programada'),
  ('CLASS_UPDATED',   'Clase Actualizada'),
  ('CLASS_CANCELLED', 'Clase Cancelada'),
  ('CLASS_REMINDER',  'Recordatorio de Clase');
```

---

## 4. Recordatorios de Clase — Diseño Detallado

Es el caso más complejo por su naturaleza asíncrona diferida.

### Mecanismo

Al crear o modificar una `class_event`, se evalúa si procede encolar un **delayed job** de recordatorio en BullMQ. El delay se calcula como:

```
delay (ms) = startDatetime.getTime() - Date.now() - (reminderMinutes * 60 * 1000)
```

### Reglas de encolado del recordatorio

**Caso 1 — Ventana ya pasada (delay negativo o ≤ 2 minutos):**
La clase fue creada/modificada tan tarde que la ventana de recordatorio ya expiró o está demasiado cerca para ser útil. El recordatorio **no se encola**. Se registra un `warn` en el logger. La notificación de `CLASS_SCHEDULED` o `CLASS_UPDATED` **sí se envía igual** — son eventos independientes.

> Ejemplo: recordatorio configurado a 1,440 min (24h), clase creada 10 minutos antes de su inicio. Delay = –1,430 min → no se encola el recordatorio.

**Caso 2 — Ventana reducida pero positiva (delay entre 2 minutos y el tiempo configurado):**
La clase fue creada tarde y la ventana de recordatorio se acortó, pero aún hay tiempo suficiente para que el recordatorio sea útil. El recordatorio **sí se encola** con el delay real disponible. El alumno lo recibirá con menos tiempo del configurado, pero es mejor que no recibirlo.

> Ejemplo: recordatorio configurado a 30 min, clase creada 45 minutos antes. Delay real = 15 min → se encola, el alumno recibe el recordatorio 15 minutos antes de la clase.

**Caso 3 — Ventana completa disponible (delay ≥ tiempo configurado):**
Caso normal. El recordatorio se encola con el delay exacto configurado.

> Ejemplo: recordatorio configurado a 24h, clase creada 3 días antes. Delay = 24h exactas → se encola normalmente.

**Resumen de la lógica en `scheduleClassReminder()`:**

```
delay = startDatetime - now - reminderMinutes
si delay <= 2 minutos → no encolar, logger.warn con motivo
si delay > 2 minutos  → encolar con ese delay (sea el completo o el reducido)
```

La constante de 2 minutos se define en `NOTIFICATION_CONSTRAINTS.REMINDER_MIN_ENQUEUE_MS = 120000` y en `technicalSettings.notifications`.

### Separación de responsabilidades (importante)

La notificación informativa (`CLASS_SCHEDULED`, `CLASS_UPDATED`) y el recordatorio (`CLASS_REMINDER`) son **siempre independientes**:

- La notificación informativa **siempre se envía** cuando ocurre el evento, sin importar el tiempo restante.
- El recordatorio **solo se encola si hay suficiente delay** según las reglas anteriores.

No existe ningún escenario donde no se envíe la notificación informativa por razones de tiempo.

### jobId determinista (crítico)

El `jobId` del delayed job **debe ser predecible** para poder eliminarlo o reemplazarlo si la clase se modifica o cancela:

```
jobId: `class-reminder-{classEventId}`
```

BullMQ garantiza que si se encola un job con un `jobId` ya existente, lanza un error. Por esto, antes de encolar se debe intentar eliminar el job previo si existe — la operación de remove es segura aunque el job no exista:

```typescript
await this.notificationsQueue.remove(`class-reminder-${classEventId}`);
// luego encolar el nuevo con el mismo jobId
```

### Gestión del ciclo de vida del delayed job

| Evento en `class_event`                         | Acción sobre el delayed job                                                                                    |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| Clase creada, delay > 2 min                     | Encolar delayed job con `jobId` determinista                                                                   |
| Clase creada, delay ≤ 2 min                     | No encolar, `logger.warn`. Notificación `CLASS_SCHEDULED` se envía igual                                       |
| Clase modificada, nueva fecha con delay > 2 min | Eliminar job previo (si existe) + encolar nuevo con delay recalculado                                          |
| Clase modificada, nueva fecha con delay ≤ 2 min | Eliminar job previo (si existe) + no encolar nuevo, `logger.warn`. Notificación `CLASS_UPDATED` se envía igual |
| Clase cancelada                                 | Eliminar job previo (si existe). Notificación `CLASS_CANCELLED` se envía igual                                 |

### Resolución de destinatarios en el worker (no en el caller)

El payload del job solo contiene:

```typescript
{
  classEventId: string;
}
```

El worker consulta en tiempo de ejecución:

1. Los profesores asignados a la `class_event` (tabla `class_event_professor`).
2. Los alumnos con matrícula activa en el `course_cycle` al que pertenece la evaluación de la clase.

### Dos umbrales distintos — no confundir

Existen dos constantes relacionadas con tiempo que operan en momentos y sobre conceptos completamente distintos:

**`REMINDER_MIN_MINUTES = 30` — validación de configuración (admin)**
Controla qué valor puede guardar el admin en `system_setting`. Si el admin intenta configurar un recordatorio de menos de 30 minutos, el sistema rechaza el valor y el job de cleanup/validación queda en `failed`. Es una regla de negocio sobre la configuración del sistema.

**`REMINDER_MIN_ENQUEUE_MS = 120000` — umbral operacional de encolado (runtime)**
Controla si tiene sentido encolar el delayed job en el momento en que ocurre el evento. Si el delay calculado ya es ≤ 2 minutos, no hay utilidad práctica en ejecutar el job. Es una salvaguarda operacional independiente del valor configurado.

Estos dos valores no son redundantes ni se reemplazan mutuamente. Un admin puede configurar 30 minutos (valor permitido) y el sistema puede igualmente decidir no encolar el recordatorio si la clase fue creada con 29 minutos de anticipación (el delay calculado sería negativo o cercano a cero).

### Configuración del tiempo de recordatorio

| Parámetro                              | Valor                                                                           |
| :------------------------------------- | :------------------------------------------------------------------------------ |
| Clave en `system_setting`              | `NOTIFICATION_REMINDER_MINUTES`                                                 |
| Unidad almacenada                      | Minutos (INTEGER)                                                               |
| Default en `technicalSettings`         | `1440` (24 horas)                                                               |
| Mínimo permitido (configuración)       | `30` minutos — validado al leer el setting en el processor                      |
| Máximo permitido (configuración)       | `10080` minutos (7 días) — validado al leer el setting en el processor          |
| Comportamiento si valor inválido en BD | Caer al default, registrar `warn`                                               |
| Comportamiento si valor < mínimo       | Lanzar excepción, job queda en `failed` para inspección                         |
| Comportamiento si valor > máximo       | Lanzar excepción, job queda en `failed` para inspección                         |
| Umbral mínimo de encolado (runtime)    | `120000` ms (2 minutos) — si el delay calculado es ≤ a este valor, no se encola |
| Representación en respuesta HTTP       | `{ reminderMinutes: 1440, reminderLabel: "24 horas antes" }`                    |

### `lockDuration` del worker

El worker de notificaciones procesa jobs que pueden involucrar consultas a BD + bulk inserts para muchos destinatarios. Se configura `lockDuration: 120000` (2 minutos) en el decorator `@Processor` para evitar que BullMQ marque el job como stalled durante procesamiento legítimo.

> **Nota**: `lockDuration` y `REMINDER_MIN_ENQUEUE_MS` comparten el mismo valor numérico (120,000 ms) por coincidencia de criterio, pero representan conceptos totalmente diferentes — uno es configuración del worker de BullMQ, el otro es lógica de negocio de encolado.

---

## 5. Limpieza Periódica de Notificaciones

Sigue exactamente el mismo patrón que la limpieza de `audit_log`.

| Parámetro                      | Valor                                                                                                                                                                                                                                         |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clave en `system_setting`      | `NOTIFICATION_CLEANUP_RETENTION_DAYS`                                                                                                                                                                                                         |
| Default en `technicalSettings` | `180` días (6 meses)                                                                                                                                                                                                                          |
| Mínimo permitido               | `30` días                                                                                                                                                                                                                                     |
| Cron pattern                   | `'0 0 2 1 * *'` (día 1 de cada mes, 02:00 AM — 1 hora antes del cleanup de auditoría)                                                                                                                                                         |
| Job name                       | `cleanup-old-notifications`                                                                                                                                                                                                                   |
| Estrategia de borrado          | Batch DELETE de 5,000 filas, circuit breaker de 100 iteraciones (máx 500k filas/ejecución)                                                                                                                                                    |
| Orden de borrado               | Primero `user_notification` (FK child), luego `notification` (FK parent). La cláusula `ON DELETE CASCADE` en `user_notification.notification_id` hace innecesario borrar `user_notification` explícitamente si se borra desde `notification`. |

> El job de limpieza se registra como repeatable en `onApplicationBootstrap` del servicio principal de notificaciones, siguiendo el patrón idempotente del `AuditService`.

---

## 6. Puntos de Integración (Dónde se Disparan Notificaciones)

Los módulos existentes **no inyectarán** directamente el `NotificationsService`. En su lugar se exportará un `NotificationsDispatchService` liviano que los módulos externos usarán para encolar jobs. Esto mantiene el acoplamiento mínimo y evita dependencias circulares.

| Módulo caller                                | Evento             | Tipo de notificación                          |
| :------------------------------------------- | :----------------- | :-------------------------------------------- |
| `ClassEventsSchedulingService.createEvent()` | Clase creada       | `CLASS_SCHEDULED` + delayed `CLASS_REMINDER`  |
| `ClassEventsSchedulingService.updateEvent()` | Clase modificada   | `CLASS_UPDATED` + reencolar `CLASS_REMINDER`  |
| `ClassEventsSchedulingService.cancelEvent()` | Clase cancelada    | `CLASS_CANCELLED` + eliminar `CLASS_REMINDER` |
| `MaterialsService.uploadMaterial()`          | Material publicado | `NEW_MATERIAL`                                |

---

## 7. Estructura de Archivos del Módulo

```
src/modules/notifications/
  domain/
    notification.entity.ts
    notification-type.entity.ts
    user-notification.entity.ts
    notification.constants.ts         ← NOTIFICATION_TYPE_CODES, JOB_NAMES, CACHE_KEYS, SETTING_KEYS, SYSTEM_SETTING_KEYS
  application/
    notifications.service.ts          ← CRUD: listar, marcar leída, marcar todas leídas, conteo, setup repeatable jobs
    notifications-dispatch.service.ts ← encolar jobs de dispatch y recordatorios (inyectado por módulos externos)
  infrastructure/
    notification.repository.ts
    notification-type.repository.ts
    user-notification.repository.ts
    processors/
      notification-dispatch.processor.ts  ← @Processor(QUEUES.NOTIFICATIONS), procesa todos los job names
  presentation/
    notifications.controller.ts       ← GET /notifications/my, GET /notifications/count, PATCH /:id/read, PATCH /read-all
  dto/
    notification-response.dto.ts
    notification-count.dto.ts
  notifications.module.ts
```

---

## 8. Endpoints HTTP del Módulo

| Método  | Ruta                      | Roles                                  | Descripción                                                                                                                                                       |
| :------ | :------------------------ | :------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/notifications/my`       | STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN | Lista las notificaciones del usuario autenticado. Soporta `?onlyUnread=true` y paginación con `?limit=20&offset=0`. Ordenadas por `notification.created_at DESC`. |
| `GET`   | `/notifications/count`    | STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN | Retorna el conteo de notificaciones no leídas. Usado por el front para el badge.                                                                                  |
| `PATCH` | `/notifications/:id/read` | STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN | Marca una notificación específica como leída. Valida que la notificación pertenezca al usuario autenticado.                                                       |
| `PATCH` | `/notifications/read-all` | STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN | Marca todas las notificaciones no leídas del usuario autenticado como leídas.                                                                                     |

---

## 9. Notas para el Agente Implementador

1. **Antes de crear cualquier archivo**, leer los archivos de referencia: `src/modules/audit/audit.module.ts`, `src/modules/audit/infrastructure/processors/audit-cleanup.processor.ts`, y `src/modules/audit/application/audit.service.ts`. Son el patrón exacto a seguir.

2. **El orden de implementación es estrictamente el de las fases**. No implementar la Fase 3 sin tener las entidades y repositorios de las Fases 1 y 2 compilando correctamente.

3. **Al terminar cada fase**, reportar al usuario qué archivos fueron creados/modificados, qué cambios se hicieron en cada uno, y si hay algo que requiera decisión del usuario antes de continuar.

4. **Los mensajes de notificación** (títulos y textos) son los definidos en el apartado de Fase 3 de `NOTIFICACIONES_FASES.md`. Si en algún tipo falta información en el payload del job para construir el mensaje, el processor debe consultar la BD para obtenerla — el payload puede ser mínimo, el worker tiene acceso a todos los repositorios.

5. **El `NotificationsDispatchService` nunca debe bloquear al caller**. Cualquier fallo en el encolado de un job de notificación es un problema del sistema de notificaciones, no del sistema de materiales, matrículas o eventos. El `try/catch` en cada método es obligatorio.

6. **Nunca usar `@nestjs/event-emitter`** para este caso. BullMQ es suficiente y consistente con lo que ya existe.
