# Documentación API — Panel Administrativo (Parte 2)

> Estado: Activa  
> Última actualización: 2026-04-17 (sección 12 agregada: calendario de sesiones — panel admin)  
> Base URL global: `/api/v1`  
> Continuación de `API_ADMIN_PANEL_DOCUMENTATION.md`

---

## 1) Propósito

Documento de continuación para endpoints del panel admin/backoffice. Cubre módulos incorporados a partir de abril 2026. El contrato de endpoints anteriores (usuarios, cursos, evaluaciones, matrículas) está en la Parte 1.

---

## 2) Convenciones (heredadas de Parte 1)

- Requiere `Authorization: Bearer <accessToken>` en todos los endpoints marcados con roles.
- Respuesta estándar exitosa:

```json
{
  "statusCode": 200,
  "message": "Mensaje de operación",
  "data": {},
  "timestamp": "2026-04-17T18:00:00.000Z"
}
```

- Respuesta estándar de error:

```json
{
  "statusCode": 400,
  "message": "Descripción del error en español",
  "error": "Bad Request",
  "timestamp": "2026-04-17T18:00:00.000Z",
  "path": "/api/v1/..."
}
```

- IDs numéricos de BD viajan como `string` en todos los campos (ej. `"1205"`, `"10"`).
- `careerId` es excepción: viaja como `number` (tipo `int`).

---

## 8) Módulo de Valoraciones (Feedback) — Panel Admin

> Base path: `/api/v1/feedback`

### 8.1 `GET /feedback/admin` (ADMIN, SUPER_ADMIN)

- Objetivo: tabla paginada de todas las valoraciones recibidas en la plataforma, con filtros, buscador y métricas estadísticas. Sirve de vista central del módulo de feedback para el administrador.
- Orden: `created_at DESC`.
- Tamaño de página: **fijo en 6**. El cliente no puede modificarlo.
- Las métricas (`stats`) se recalculan respetando los filtros activos, excepto la paginación. Si filtras por carrera, el promedio y la distribución son solo de ese subconjunto.

#### Query params

- `page` (number, opcional, default `1`, min `1`, max `100000`) -> número de página solicitada.
- `courseCycleId` (string numérica, opcional) -> filtra por `course_testimony.course_cycle_id` exacto.
- `courseId` (string numérica, opcional) -> filtra por curso base (`course_cycle.course_id`); incluye todos los ciclos de ese curso.
- `careerId` (number entero, opcional, min `1`) -> filtra por carrera del alumno (`user.career_id`).
- `rating` (number entero, opcional, min `1`, max `5`) -> filtra por puntuación exacta (1 a 5 estrellas).
- `isActive` (boolean, opcional) -> `true` = solo destacadas/públicas · `false` = solo no visibles · omitir = todas.
- `search` (string, opcional, max `200`) -> búsqueda LIKE sobre nombre + apellidos del alumno **y** sobre el texto del comentario. No distingue mayúsculas.

#### Response `data`

```json
{
  "items": [
    {
      "id": "301",
      "rating": 5,
      "comment": "Excelente metodología y materiales muy completos.",
      "isActive": true,
      "createdAt": "2026-03-15T14:22:00.000Z",
      "courseCycleId": "101",
      "courseId": "11",
      "courseName": "Matemática Básica",
      "user": {
        "id": "1205",
        "firstName": "Ana",
        "lastName1": "Perez",
        "lastName2": "Lopez",
        "profilePhotoUrl": "https://lh3.googleusercontent.com/...",
        "careerName": "Psicología"
      }
    }
  ],
  "currentPage": 1,
  "pageSize": 6,
  "totalItems": 48,
  "totalPages": 8,
  "stats": {
    "total": 48,
    "average": 4.35,
    "distribution": {
      "1": 2.08,
      "2": 4.17,
      "3": 10.42,
      "4": 31.25,
      "5": 52.08
    }
  }
}
```

#### Tipos de cada campo

**Raíz:**

| Campo | Tipo | Descripción |
|---|---|---|
| `currentPage` | number | Página devuelta |
| `pageSize` | number | Siempre `6` |
| `totalItems` | number | Total de valoraciones que cumplen los filtros |
| `totalPages` | number | `Math.ceil(totalItems / 6)` — puede ser `0` si no hay resultados |

**Cada item:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del testimonio |
| `rating` | number (1–5) | Puntuación en estrellas |
| `comment` | string | Texto de la valoración |
| `isActive` | boolean | `true` = visible en la sección pública de la plataforma |
| `createdAt` | string ISO 8601 | Fecha y hora de creación (UTC) |
| `courseCycleId` | string | ID del course-cycle asociado → acceso directo a ese ciclo |
| `courseId` | string | ID del curso base → acceso directo al perfil de la materia |
| `courseName` | string | Nombre del curso (no del ciclo) |
| `user.id` | string | ID del alumno → acceso directo a su perfil admin |
| `user.firstName` | string | Nombre del alumno |
| `user.lastName1` | string \| null | Primer apellido |
| `user.lastName2` | string \| null | Segundo apellido |
| `user.profilePhotoUrl` | string \| null | URL de foto de perfil (Google o subida); puede ser `null` |
| `user.careerName` | string \| null | Carrera del alumno; puede ser `null` si no tiene asignada |

**`stats`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `total` | number | Total de valoraciones en el subconjunto filtrado |
| `average` | number | Promedio de puntuación, redondeado a 2 decimales. `0` si no hay valoraciones |
| `distribution` | object | Porcentaje de cada puntuación sobre el total. Claves `"1"` a `"5"` (strings en JSON), valores number redondeados a 2 decimales. Si `total = 0`, todos los valores son `0` |

#### Navegación directa desde la tabla

Los IDs devueltos permiten al frontend construir links de acceso directo sin llamadas adicionales:

| Destino | Endpoint a usar | ID a usar |
|---|---|---|
| Perfil del alumno en panel admin | `GET /users/:id/admin-detail` | `user.id` |
| Perfil del curso en panel admin | `GET /courses/:id` | `courseId` |
| Contenido del ciclo en panel admin | `GET /courses/cycle/:id/content` | `courseCycleId` |

#### Observaciones

- Si `page` supera el número real de páginas, `items` devuelve array vacío y `currentPage` refleja la página solicitada.
- La búsqueda con `search` cubre: `firstName`, `lastName1`, `lastName2` del alumno y el campo `comment` del testimonio. **No** incluye email.
- Los valores de `distribution` son porcentajes (0–100), no conteos.
- Si se filtra por `rating=5` (solo 5 estrellas), la distribución mostrará `"5": 100` y el resto `0`.

---

### 8.2 `POST /feedback/admin/:id/feature` (ADMIN, SUPER_ADMIN)

- Objetivo: destacar o quitar de lo público una valoración puntual. Controla qué testimonios aparecen en la sección pública de la plataforma.
- Al activar (`isActive: true`), el backend valida que no se supere el límite máximo de testimonios públicos simultáneos (configurado en backend; valor por defecto: `3`). Si se supera, responde `400 Bad Request`.
- Al desactivar (`isActive: false`), no aplica ningún límite.
- Invalida el caché público de testimonios automáticamente tras cualquier cambio.

#### Path params

- `id` (string) -> `testimony.id` — ID de la valoración a modificar.

#### Request body

```json
{
  "isActive": true
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `isActive` | boolean | Sí | `true` = marcar como visible en sección pública · `false` = quitar de la sección pública |

#### Response `data`

Devuelve el testimonio actualizado completo:

```json
{
  "id": "301",
  "rating": 5,
  "comment": "Excelente metodología y materiales muy completos.",
  "photoUrl": null,
  "photoSource": "NONE",
  "isActive": true,
  "createdAt": "2026-03-15T14:22:00.000Z",
  "user": {
    "id": "1205",
    "firstName": "Ana",
    "lastName1": "Perez",
    "lastName2": "Lopez",
    "profilePhotoUrl": "https://lh3.googleusercontent.com/..."
  }
}
```

#### Errores específicos

| Código | Cuándo ocurre |
|---|---|
| `400 Bad Request` | Se intenta activar (`isActive: true`) pero ya hay `3` testimonios públicos activos (límite máximo configurado). El mensaje incluye el límite exacto. |
| `404 Not Found` | El `id` del path no corresponde a ningún testimonio existente. |

#### Observaciones

- Para marcar un testimonio como público, primero verificar si el límite de testimonios activos ya fue alcanzado consultando la tabla de 8.1 con `isActive=true` y revisando `stats.total`. Si `stats.total >= 3`, la acción fallará con `400`.
- El flujo habitual en UI es: si se quiere activar uno nuevo y ya hay `3`, primero desactivar otro con `isActive: false`, luego activar el deseado.

---

## 9) Módulo de Configuración del Sistema — Panel Admin

> Base path: `/api/v1/settings`

### 9.1 `GET /settings/admin` (ADMIN, SUPER_ADMIN)

- Objetivo: obtener el bundle de configuración operativa del sistema en una sola llamada. Incluye el ciclo académico vigente (con progreso), los umbrales GPS de anomalía de sesión y la retención de logs de auditoría.
- Esta llamada no requiere ningún parámetro.

#### Response `data`

```json
{
  "currentCycle": {
    "id": "10",
    "code": "CYCLE_2024_1",
    "startDate": "2024-01-15",
    "endDate": "2024-06-30",
    "progressPercent": 45.32
  },
  "geoGpsThresholds": {
    "timeWindowMinutes": 30,
    "distanceKm": 10
  },
  "logRetention": {
    "days": 30
  }
}
```

#### Tipos de cada campo

**`currentCycle`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `currentCycle` | object \| null | `null` si el sistema no tiene un ciclo vigente configurado |
| `currentCycle.id` | string | ID del ciclo académico vigente |
| `currentCycle.code` | string | Código del ciclo (ej. `CYCLE_2024_1`) |
| `currentCycle.startDate` | string (date) | Fecha de inicio del ciclo (`YYYY-MM-DD`) |
| `currentCycle.endDate` | string (date) | Fecha de fin del ciclo (`YYYY-MM-DD`) |
| `currentCycle.progressPercent` | number | Porcentaje de avance del ciclo según la fecha actual. `0` si aún no ha iniciado. `100` si ya terminó. Rango `[0, 100]`, redondeado a 2 decimales. |

**`geoGpsThresholds`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `timeWindowMinutes` | number | Ventana de tiempo en minutos para detectar anomalías de ubicación GPS en sesiones de login. Rango editable: `1..1440`. |
| `distanceKm` | number | Distancia en kilómetros para considerar un login como sospechoso por ubicación GPS. Rango editable: `1..1000`. |

**`logRetention`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `days` | number | Días que se conservan los logs de auditoría y eventos de seguridad antes de ser borrados. Rango editable: `7..730`. |

#### Observaciones

- `progressPercent` se calcula en el servidor usando la hora UTC actual, por lo que puede diferir levemente de la hora local Lima (UTC−5) en los bordes del día; es aceptable para una barra de progreso visual.
- Si `currentCycle` es `null`, el panel debe indicar al admin que configure `ACTIVE_CYCLE_ID` en los ajustes internos del sistema.
- Los umbrales GPS son de seguridad de sesión (anomalía de login), no de check-in de asistencia.

---

### 9.2 `PUT /settings/admin` (ADMIN, SUPER_ADMIN)

- Objetivo: actualizar uno o más valores de configuración operativa. Solo se modifican los campos enviados en el body (actualización parcial). Devuelve el bundle completo actualizado (mismo shape que `GET /settings/admin`).
- Tras actualizar, el cambio es efectivo inmediatamente: el caché en memoria y Redis se invalida para las claves modificadas.

#### Request body

Todos los campos son opcionales. Si el body está vacío `{}`, no se modifica nada y se devuelve el estado actual.

```json
{
  "geoGpsThresholds": {
    "timeWindowMinutes": 20,
    "distanceKm": 15
  },
  "logRetention": {
    "days": 60
  }
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `geoGpsThresholds` | object | No | Bloque de umbrales GPS. Si se envía vacío `{}` no se modifica ningún umbral. |
| `geoGpsThresholds.timeWindowMinutes` | number (int) | No | Ventana de tiempo en minutos. Rango `1..1440`. |
| `geoGpsThresholds.distanceKm` | number (int) | No | Distancia en km. Rango `1..1000`. |
| `logRetention` | object | No | Bloque de retención de logs. |
| `logRetention.days` | number (int) | No | Días de retención. Rango `7..730`. El mínimo seguro es 7; valores menores son rechazados con `400`. |

#### Response `data`

Mismo shape que `GET /settings/admin` con los nuevos valores reflejados.

#### Errores específicos

| Código | Cuándo ocurre |
|---|---|
| `400 Bad Request` | Algún campo falla la validación: `timeWindowMinutes < 1`, `distanceKm > 1000`, `days < 7`, etc. |

#### Observaciones

- El cron de limpieza de logs corre el día 1 de cada mes a las 3am. El nuevo valor de `logRetention.days` aplicará en la próxima ejecución del cron sin necesidad de reiniciar la app.
- Actualizar los umbrales GPS no interrumpe sesiones activas; aplica solo a los próximos logins evaluados por el detector de anomalías.

---

## 10) Módulo de Ciclos Académicos — Historial Admin

> Base path: `/api/v1/cycles`

### 10.1 `GET /cycles/history` (ADMIN, SUPER_ADMIN)

- Objetivo: listado paginado del historial de ciclos académicos excluyendo el ciclo vigente actual. Sirve para la tabla histórica del panel de configuración del sistema.
- Orden: `start_date DESC` (ciclos más recientes primero).
- Tamaño de página: **fijo en 4**. El cliente no puede modificarlo.

#### Query params

- `page` (number, opcional, default `1`, min `1`, max `100000`) → número de página solicitada.

#### Response `data`

```json
{
  "items": [
    {
      "id": "9",
      "code": "CYCLE_2023_2",
      "startDate": "2023-07-10",
      "endDate": "2023-12-15"
    },
    {
      "id": "8",
      "code": "CYCLE_2023_1",
      "startDate": "2023-01-09",
      "endDate": "2023-06-30"
    }
  ],
  "currentPage": 1,
  "pageSize": 4,
  "totalItems": 9,
  "totalPages": 3
}
```

#### Tipos de cada campo

**Raíz:**

| Campo | Tipo | Descripción |
|---|---|---|
| `currentPage` | number | Página devuelta |
| `pageSize` | number | Siempre `4` |
| `totalItems` | number | Total de ciclos en el historial (excluye el vigente) |
| `totalPages` | number | `Math.ceil(totalItems / 4)` — `0` si no hay ciclos históricos |

**Cada item:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del ciclo |
| `code` | string | Código del ciclo (ej. `CYCLE_2023_2`) |
| `startDate` | string (date) | Fecha de inicio (`YYYY-MM-DD`) |
| `endDate` | string (date) | Fecha de fin (`YYYY-MM-DD`) |

#### Observaciones

- Si `page` supera el número real de páginas, `items` es array vacío y `currentPage` refleja la página solicitada.
- Si el sistema no tiene configurado `ACTIVE_CYCLE_ID`, el historial devuelve **todos** los ciclos sin exclusión.
- El ciclo vigente se identifica vía `system_setting.ACTIVE_CYCLE_ID`; es el mismo que aparece en `GET /settings/admin → currentCycle.id`.

---

### 10.2 `POST /cycles/history` (ADMIN, SUPER_ADMIN)

- Objetivo: registrar un ciclo histórico nuevo en el sistema. El ciclo creado **no se convierte en ciclo vigente** — para eso existe la configuración de `ACTIVE_CYCLE_ID` en settings.

#### Request body

```json
{
  "code": "2024-2",
  "startDate": "2024-07-08",
  "endDate": "2024-12-15"
}
```

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `code` | string | Sí | Máx. 50 caracteres. Debe ser único en el sistema |
| `startDate` | string (date) | Sí | Formato `YYYY-MM-DD`. Debe ser anterior a `endDate` |
| `endDate` | string (date) | Sí | Formato `YYYY-MM-DD`. Debe ser posterior a `startDate` |

#### Response `data`

```json
{
  "id": "12",
  "code": "2024-2",
  "startDate": "2024-07-08",
  "endDate": "2024-12-15",
  "createdAt": "2026-04-18T14:00:00.000Z"
}
```

#### Validaciones de negocio

| Condición | Error |
|---|---|
| `startDate >= endDate` | `400 Bad Request` — "La fecha de inicio debe ser anterior a la fecha de fin." |
| `code` ya existe en otro ciclo | `409 Conflict` — "Ya existe un ciclo con ese código." |
| Las fechas se solapan con otro ciclo | `409 Conflict` — "Las fechas se solapan con el ciclo \"{code del conflicto}\"." |

#### Observaciones

- El solapamiento de fechas se detecta con la regla clásica: `startDate <= otroEndDate AND endDate >= otroStartDate`. Aplica contra **todos** los ciclos existentes incluyendo el vigente.
- Crear un ciclo histórico no afecta el ciclo activo ni invalida cachés.

---

### 10.3 `PUT /cycles/history/:id` (ADMIN, SUPER_ADMIN)

- Objetivo: editar los datos de un ciclo **histórico** (no vigente). Permite corregir el código identificador, la fecha de inicio y la fecha de fin.

#### Path params

- `id` (string numérica) → ID del ciclo a editar.

#### Request body

Mismos campos y restricciones que `POST /cycles/history`:

```json
{
  "code": "2024-1",
  "startDate": "2024-01-08",
  "endDate": "2024-06-30"
}
```

#### Response `data`

Igual que el POST: objeto `AcademicCycleResponseDto` con los datos actualizados.

#### Validaciones de negocio

| Condición | Error |
|---|---|
| El `id` no corresponde a ningún ciclo | `404 Not Found` — "El ciclo académico solicitado no existe." |
| El ciclo es el **vigente** (`ACTIVE_CYCLE_ID`) | `400 Bad Request` — "No se puede editar el ciclo activo desde esta sección." |
| `startDate >= endDate` | `400 Bad Request` — "La fecha de inicio debe ser anterior a la fecha de fin." |
| `code` ya existe en **otro** ciclo | `409 Conflict` — "Ya existe un ciclo con ese código." |
| Las fechas se solapan con **otro** ciclo | `409 Conflict` — "Las fechas se solapan con el ciclo \"{code del conflicto}\"." |

#### Observaciones

- La validación de código único y solapamiento excluye el propio ciclo editado (self-exclusion).
- Editar fechas de un ciclo histórico **no afecta cachés de runtime** (los cachés de dashboard y eventos solo dependen del ciclo vigente).
- La única consecuencia funcional de cambiar `startDate` de un histórico es el orden y visibilidad en `GET /courses/cycle/:id/previous-cycles`, que filtra por `startDate < activeCycleStartDate`. Por eso el solapamiento con el ciclo activo está bloqueado por la validación de fechas.

---

### 10.4 `PUT /cycles/active` (ADMIN, SUPER_ADMIN)

- Objetivo: editar los datos del ciclo académico **vigente** actualmente configurado en el sistema. Permite corregir el código identificador, la fecha de inicio y la fecha de fin.

> **Operación de alto impacto.** Cambiar las fechas del ciclo vigente afecta la validación de nuevas evaluaciones, el cálculo de progreso del ciclo en el bundle de settings y la visibilidad de ciclos anteriores para alumnos. Estas consecuencias son inmediatas. Los cachés de dashboard de alumnos y de estado de eventos de clase quedan desactualizados hasta que expire su TTL.

#### Request body

```json
{
  "code": "2025-1",
  "startDate": "2025-01-06",
  "endDate": "2025-07-15"
}
```

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `code` | string | Sí | Máx. 50 caracteres. Debe ser único en el sistema |
| `startDate` | string (date) | Sí | Formato `YYYY-MM-DD`. Debe ser anterior a `endDate` |
| `endDate` | string (date) | Sí | Formato `YYYY-MM-DD`. Debe ser posterior a `startDate` |

#### Response `data`

```json
{
  "id": "12",
  "code": "2025-1",
  "startDate": "2025-01-06",
  "endDate": "2025-07-15",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### Validaciones de negocio

| Condición | Error |
|---|---|
| No hay ciclo vigente configurado (`ACTIVE_CYCLE_ID` no apunta a ningún ciclo) | `404 Not Found` — "No se ha podido identificar el ciclo activo del sistema." |
| `startDate >= endDate` | `400 Bad Request` — "La fecha de inicio debe ser anterior a la fecha de fin." |
| `code` ya existe en **otro** ciclo | `409 Conflict` — "Ya existe un ciclo con ese código." |
| Las fechas se solapan con **otro** ciclo | `409 Conflict` — "Las fechas se solapan con el ciclo \"{code del conflicto}\"." |

#### Observaciones

- La validación de código único y solapamiento excluye el propio ciclo vigente (self-exclusion). El ciclo puede mantener su propio código o sus propias fechas sin conflicto.
- El sistema registra un `WARN` en logs con los valores anteriores y nuevos (`before`/`after`) antes de persistir el cambio — trazabilidad de auditoría.
- **Cachés invalidadas automáticamente:** al guardar exitosamente, el sistema invalida en paralelo `cache:enrollment:user:*:dashboard` (dashboard de todos los alumnos) y `cache:cycle-active:*` (estado de ciclo activo por evaluación). Los próximos accesos recalculan con los datos nuevos.
- **Evaluaciones existentes:** las evaluaciones ya creadas no se invalidan retroactivamente. Solo la ventana de creación de nuevas evaluaciones cambia según las nuevas fechas del ciclo.

---

## 11) Módulo de Auditoría — Panel Admin

> Base path: `/api/v1/audit`

Este módulo cubre la tabla del panel de auditoría, el detalle de cada registro y los exportadores Excel. Existen **dos tipos de registro** con contratos de respuesta distintos:

| Tipo | Prefijo del `id` | Fuente | Descripción |
|---|---|---|---|
| **AUDITORÍA** | `aud-{n}` | `source = "AUDIT"` | Log de acción de negocio (subida de archivo, edición, etc.) |
| **SEGURIDAD** | `sec-{n}` | `source = "SECURITY"` | Evento de sesión/autenticación (login, logout, anomalía, etc.) |

> **Regla crítica para frontend**: el prefijo del campo `id` determina el tipo de detalle que retorna `GET /audit/panel/:id`. Los registros `aud-*` y `sec-*` tienen shapes de respuesta distintos en el endpoint de detalle. Leer la sección 11.2 antes de implementar el drawer/modal de detalle.

---

### 11.1 `GET /audit/panel` (ADMIN, SUPER_ADMIN)

- Objetivo: tabla paginada del historial unificado de auditoría y eventos de seguridad.
- Orden: `datetime DESC` (los más recientes primero).
- Tamaño de página: **fijo en 10**. El cliente no puede modificarlo.
- Cada página mezcla registros de ambos tipos (`AUDIT` y `SECURITY`) ordenados cronológicamente.

#### Query params

| Parámetro | Tipo | Descripción |
|---|---|---|
| `page` | number, opcional, default `1`, min `1` | Número de página solicitada |
| `source` | `'AUDIT' \| 'SECURITY'`, opcional | Filtra solo por ese tipo de evento |
| `roleCode` | `'STUDENT' \| 'PROFESSOR' \| 'ADMIN' \| 'SUPER_ADMIN'`, opcional | Filtra por el rol del usuario en el momento del evento |
| `startDate` | string ISO-8601, opcional | Fecha/hora inicial inclusive (ej. `2026-03-01`) |
| `endDate` | string ISO-8601, opcional | Fecha/hora final inclusive (ej. `2026-03-31`) |
| `userSearch` | string, opcional | Búsqueda FULLTEXT por nombre y apellido del usuario (acepta múltiples palabras, prefijo automático) |

#### Response `data`

```json
{
  "items": [
    {
      "id": "sec-42",
      "datetime": "2026-03-14T15:00:00.000Z",
      "userName": "Ana Torres",
      "userRole": "Estudiante",
      "actionName": "Inicio de sesion exitoso",
      "source": "SECURITY",
      "sourceLabel": "SEGURIDAD"
    },
    {
      "id": "aud-7",
      "datetime": "2026-03-14T14:55:00.000Z",
      "userName": "Carlos Ruiz",
      "userRole": "Asesor",
      "actionName": "Subida de archivo",
      "source": "AUDIT",
      "sourceLabel": "AUDITORIA"
    }
  ],
  "totalItems": 48,
  "totalPages": 5,
  "currentPage": 1
}
```

#### Tipos de cada campo

**Raíz:**

| Campo | Tipo | Descripción |
|---|---|---|
| `totalItems` | number | Total de registros que cumplen los filtros |
| `totalPages` | number | `Math.ceil(totalItems / 10)` — mínimo `1` aunque no haya resultados |
| `currentPage` | number | Página devuelta (siempre ≥ 1) |

**Cada item:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID compuesto: `"aud-{n}"` para auditoría, `"sec-{n}"` para seguridad. Usar como parámetro en `GET /audit/panel/:id` |
| `datetime` | string ISO 8601 | Fecha y hora del evento en UTC |
| `userName` | string | Nombre y primer apellido del usuario. Fallback: `"Usuario Desconocido"` si el usuario fue eliminado |
| `userRole` | string | Nombre del rol activo del usuario. Fallback: `"Sin Rol"` |
| `actionName` | string | Nombre legible de la acción. Fallback: `"Accion no definida"` |
| `source` | `"AUDIT" \| "SECURITY"` | Tipo técnico del evento |
| `sourceLabel` | `"AUDITORIA" \| "SEGURIDAD"` | Etiqueta en español para mostrar en UI |

#### Observaciones

- Si `totalItems = 0`, `totalPages` es `1` (nunca `0`).
- Si `page` supera `totalPages`, `items` devuelve array vacío.
- El filtro `userSearch` usa índice FULLTEXT sobre nombre completo. Búsquedas de múltiples palabras (ej. `"ana torres"`) aplican prefijo automático a cada palabra (`ana* torres*`).
- Las fechas se almacenan en UTC internamente. Aplicar conversión a hora Perú (`America/Lima`, UTC−5) en frontend para mostrarlas al usuario.

---

### 11.2 `GET /audit/panel/:id` (ADMIN, SUPER_ADMIN)

- Objetivo: detalle completo de un registro de auditoría o evento de seguridad.
- El tipo de respuesta depende del prefijo del `id`:
  - `aud-{n}` → registros de **AUDITORÍA** (sin IP, sin metadata)
  - `sec-{n}` → registros de **SEGURIDAD** (incluye IP, userAgent y metadata de sesión)

> **Importante**: el frontend DEBE leer el prefijo del `id` antes de renderizar el detalle, porque el shape de respuesta es diferente. No asumir que todos los registros tendrán `ipAddress` o `metadata`.

#### Path params

- `id` (string) → ID compuesto del registro, obtenido del campo `id` de `GET /audit/panel`.

---

#### Response `data` — registros AUDITORÍA (`aud-{n}`)

```json
{
  "id": "aud-7",
  "datetime": "2026-03-14T14:55:00.000Z",
  "userId": "1205",
  "userName": "Carlos Ruiz",
  "userEmail": "carlos.ruiz@academiapasalo.com",
  "userRole": "Asesor",
  "actionCode": "FILE_UPLOAD",
  "actionName": "Subida de archivo",
  "source": "AUDIT"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID compuesto (`aud-{n}`) |
| `datetime` | string ISO 8601 | Fecha y hora del evento en UTC |
| `userId` | string | ID numérico del usuario como string |
| `userName` | string | Nombre y primer apellido |
| `userEmail` | string | Correo electrónico |
| `userRole` | string | Nombre del rol activo |
| `actionCode` | string | Código técnico de la acción (ej. `FILE_UPLOAD`) |
| `actionName` | string | Nombre legible de la acción |
| `source` | `"AUDIT"` | Siempre `"AUDIT"` para registros `aud-*` |

> Los registros de AUDITORÍA **no incluyen** `ipAddress`, `userAgent` ni `metadata`.

---

#### Response `data` — registros SEGURIDAD (`sec-{n}`)

```json
{
  "id": "sec-42",
  "datetime": "2026-03-14T15:00:00.000Z",
  "userId": "1205",
  "userName": "Ana Torres",
  "userEmail": "ana.torres@academiapasalo.com",
  "userRole": "Estudiante",
  "actionCode": "LOGIN_SUCCESS",
  "actionName": "Inicio de sesion exitoso",
  "source": "SECURITY",
  "ipAddress": "190.232.15.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "metadata": {
    "deviceId": "d3b4c2e1-...",
    "locationSource": "geoip",
    "city": "Lima",
    "country": "PE",
    "activeRoleCode": "STUDENT",
    "sessionStatus": "new",
    "newSessionId": "sess-abc123"
  }
}
```

**Campos comunes con AUDITORÍA:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID compuesto (`sec-{n}`) |
| `datetime` | string ISO 8601 | Fecha y hora del evento en UTC |
| `userId` | string | ID numérico del usuario como string |
| `userName` | string | Nombre y primer apellido |
| `userEmail` | string | Correo electrónico |
| `userRole` | string | Nombre del rol activo |
| `actionCode` | string | Código técnico del evento (ej. `LOGIN_SUCCESS`) |
| `actionName` | string | Nombre legible del evento |
| `source` | `"SECURITY"` | Siempre `"SECURITY"` para registros `sec-*` |

**Campos exclusivos de SEGURIDAD:**

| Campo | Tipo | Descripción |
|---|---|---|
| `ipAddress` | string \| undefined | Dirección IP del cliente. Ausente si no fue registrada |
| `userAgent` | string \| undefined | User-Agent del navegador/SO/dispositivo. Ausente si no fue registrado |
| `metadata` | object \| undefined | Payload de contexto de sesión. Ausente si el evento no generó metadata |

**Campos del objeto `metadata` (todos opcionales):**

| Campo | Tipo | Descripción |
|---|---|---|
| `deviceId` | string \| undefined | Identificador del dispositivo |
| `locationSource` | string \| undefined | Origen de la geolocalización (ej. `"geoip"`) |
| `city` | string \| undefined | Ciudad detectada por geolocalización |
| `country` | string \| undefined | Código de país (ej. `"PE"`) |
| `activeRoleCode` | string \| undefined | Código del rol que el usuario tenía activo al momento del evento |
| `sessionStatus` | string \| undefined | Estado de la sesión resultante (ej. `"new"`, `"ACTIVE"`, `"REVOKED"`) |
| `newSessionId` | string \| undefined | ID de la nueva sesión creada (presente en logins y concurrencias) |
| `existingSessionId` | string \| undefined | ID de la sesión preexistente (presente en eventos de sesión concurrente) |
| `existingDeviceId` | string \| undefined | ID del dispositivo de la sesión preexistente (presente en eventos de sesión concurrente) |

#### Errores específicos

| Código | Cuándo ocurre |
|---|---|
| `404 Not Found` | El `id` no corresponde a ningún registro existente, el prefijo es inválido, o el número es cero/negativo |

#### Observaciones

- Un campo `metadata` con valor `undefined` (ausente en JSON) significa que ese evento no generó contexto adicional, no que sea un error.
- Los campos de `metadata` con valor `null` en BD se omiten del objeto (vienen como `undefined` en JSON). El frontend debe manejar `undefined` para todos los campos del objeto `metadata`.
- El campo `activeRoleCode` en metadata refleja el rol que el usuario tenía activo **en el momento del evento**, lo cual puede diferir del rol actual del usuario.
- Los `actionCode` posibles para eventos de seguridad están documentados en `API_DOCUMENTATION.md` (sección ÉPICA 7).

---

### 11.3 `GET /audit/panel-export` (ADMIN, SUPER_ADMIN)

- Objetivo: exportar el historial de auditoría y seguridad unificado en formato Excel. Mismo universo de datos que el panel (11.1), sin paginación.
- El backend decide automáticamente entre modo **sync** (`.xlsx` directo) y **async** (`.zip` en background) según el volumen de datos.
- Umbral actual: `< 100 000` filas = sync, `≥ 100 000` filas = async.
- Las columnas del Excel incluyen `userId` pero **no** el `id` compuesto (`aud-*` / `sec-*`), ya que no aporta valor en una hoja de cálculo.
- El Excel **no incluye** columnas de IP, userAgent ni metadata (usar `GET /audit/security-export` para esos campos).

#### Columnas del Excel (en orden)

| Columna | Campo fuente | Descripción |
|---|---|---|
| `FECHA Y HORA` | `datetime` | Fecha y hora en horario Perú (`America/Lima`) |
| `ID USUARIO` | `userId` | ID numérico del usuario |
| `USUARIO` | `userName` | Nombre y primer apellido |
| `CORREO` | `userEmail` | Correo electrónico |
| `ROL` | `userRole` | Nombre del rol |
| `CODIGO` | `actionCode` | Código técnico de la acción/evento |
| `ACCION` | `actionName` | Nombre legible |
| `FUENTE` | `source` | `"AUDITORIA"` o `"SEGURIDAD"` (español) |

#### Query params

| Parámetro | Tipo | Descripción |
|---|---|---|
| `source` | `'AUDIT' \| 'SECURITY'`, opcional | Filtra solo por ese tipo |
| `roleCode` | `'STUDENT' \| 'PROFESSOR' \| 'ADMIN' \| 'SUPER_ADMIN'`, opcional | Filtra por rol del usuario |
| `startDate` | string ISO-8601, opcional | Fecha/hora inicial inclusive |
| `endDate` | string ISO-8601, opcional | Fecha/hora final inclusive |
| `userSearch` | string, opcional | Búsqueda FULLTEXT por nombre del usuario |

#### Comportamiento y respuestas

El flujo sync/async, los headers de respuesta, los códigos de error (`409 Conflict`, `403 Forbidden`, `404 Not Found`, `410 Gone`) y el mecanismo de notificaciones son idénticos al endpoint `GET /audit/export`. Ver `API_AUDIT_EXPORT_DOCUMENTATION.md` para el contrato completo del flujo async.

---

### 11.4 `GET /audit/security-export` (ADMIN, SUPER_ADMIN)

- Objetivo: exportar **exclusivamente eventos de seguridad** con todos sus campos, incluyendo IP, userAgent y los campos de metadata de sesión. Diseñado para análisis de seguridad y sesiones.
- La fuente se fija en `SECURITY` por el backend; el cliente **no puede** sobrescribir el filtro de fuente.
- El Excel **no incluye** el `id` compuesto (`sec-*`), pero sí incluye `userId` y todos los campos de metadata.
- El backend decide automáticamente entre modo sync y async con los mismos umbrales que el resto de exportaciones.

#### Columnas del Excel (en orden)

| Columna | Campo fuente | Descripción |
|---|---|---|
| `FECHA Y HORA` | `datetime` | Fecha y hora en horario Perú (`America/Lima`) |
| `ID USUARIO` | `userId` | ID numérico del usuario |
| `USUARIO` | `userName` | Nombre y primer apellido |
| `CORREO` | `userEmail` | Correo electrónico |
| `ROL` | `userRole` | Nombre del rol |
| `CODIGO` | `actionCode` | Código técnico del evento de seguridad |
| `ACCION` | `actionName` | Nombre legible del evento |
| `FUENTE` | — | Siempre `"SEGURIDAD"` (fijo) |
| `IP` | `ipAddress` | Dirección IP. Celda vacía si no fue registrada |
| `NAVEGADOR` | `userAgent` | User-Agent del cliente. Celda vacía si no fue registrado |
| `ID DISPOSITIVO` | `metadata.deviceId` | Identificador del dispositivo. Vacío si ausente |
| `FUENTE UBICACION` | `metadata.locationSource` | Origen de geolocalización. Vacío si ausente |
| `CIUDAD` | `metadata.city` | Ciudad detectada. Vacío si ausente |
| `PAIS` | `metadata.country` | Código de país. Vacío si ausente |
| `ROL AL MOMENTO` | `metadata.activeRoleCode` | Código del rol activo en el momento del evento. Vacío si ausente |
| `ESTADO SESION` | `metadata.sessionStatus` | Estado resultante de la sesión. Vacío si ausente |
| `ID NUEVA SESION` | `metadata.newSessionId` | ID de la nueva sesión. Vacío si ausente |
| `ID SESION EXISTENTE` | `metadata.existingSessionId` | ID de sesión preexistente (en concurrencias). Vacío si ausente |
| `ID DISPOSITIVO EXISTENTE` | `metadata.existingDeviceId` | Dispositivo de sesión preexistente (en concurrencias). Vacío si ausente |

#### Query params

| Parámetro | Tipo | Descripción |
|---|---|---|
| `roleCode` | `'STUDENT' \| 'PROFESSOR' \| 'ADMIN' \| 'SUPER_ADMIN'`, opcional | Filtra por rol del usuario |
| `startDate` | string ISO-8601, opcional | Fecha/hora inicial inclusive |
| `endDate` | string ISO-8601, opcional | Fecha/hora final inclusive |
| `userSearch` | string, opcional | Búsqueda FULLTEXT por nombre del usuario |

> Este endpoint exporta **solo eventos de seguridad**. No enviar `source` — el backend lo fija internamente en `SECURITY`.

#### Comportamiento y respuestas

Idéntico al flujo de `GET /audit/panel-export`. Ver `API_AUDIT_EXPORT_DOCUMENTATION.md` para el contrato completo del flujo async (headers, códigos de error, notificaciones).

#### Observaciones

- Las celdas de `metadata.*` y de `ipAddress`/`userAgent` llegan vacías (cadena vacía `""`) cuando el evento no registró ese campo. El Excel nunca contiene valores `null` ni `undefined` visibles.
- El campo `ROL AL MOMENTO` (`metadata.activeRoleCode`) contiene el **código** del rol (ej. `STUDENT`, `ADMIN`), no el nombre legible. Esto es intencional para facilitar filtrado en hojas de cálculo.
- Usar este exportador cuando se necesite análisis de:
  - patrones de login/logout por dispositivo o IP
  - eventos de sesión concurrente
  - anomalías de autenticación por ubicación geográfica

---

## 12) Módulo de Calendario de Sesiones — Panel Admin

> Base path: `/api/v1`

Permite al administrador y superadministrador visualizar el calendario de sesiones programadas de todos los cursos de la plataforma. El frontend controla la vista semanal o mensual enviando el rango de fechas correspondiente. El panel incluye filtros por **unidad** (CIENCIAS, LETRAS, FACULTAD) y por **ciclo académico**.

**Flujo de carga del panel:**

1. Llamar a `GET /cycles` (12.1) para poblar el selector de ciclo.
2. Llamar a `GET /courses/types` (12.2) para poblar el selector de unidad.
3. Llamar a `GET /class-events/global/sessions` (12.3) con el ciclo y unidad seleccionados.

---

### 12.1 `GET /courses/levels` (ADMIN, SUPER_ADMIN)

- Objetivo: lista completa de ciclos de curso (1° al 10°) para poblar el selector de ciclo en el panel de calendario.
- Devuelve todos los niveles de ciclo registrados. No tiene paginación.

#### Response `data`

Array de objetos:

```json
[
  {
    "id": "1",
    "levelNumber": 1,
    "name": "Primer Ciclo"
  },
  {
    "id": "2",
    "levelNumber": 2,
    "name": "Segundo Ciclo"
  },
  {
    "id": "10",
    "levelNumber": 10,
    "name": "Décimo Ciclo"
  }
]
```

#### Tipos de cada campo

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del ciclo → usar como `cycleLevelId` en el filtro del calendario (12.3) |
| `levelNumber` | number | Número de ciclo (1 al 10) → usar para mostrar `"1° Ciclo"`, `"2° Ciclo"`, etc. en el selector |
| `name` | string | Nombre completo (ej. `"Primer Ciclo"`, `"Segundo Ciclo"`) → alternativa de display |

#### Observaciones

- El campo `id` es el que se envía como `cycleLevelId` al endpoint de calendario.
- Para mostrar `"1° Ciclo"`, `"2° Ciclo"`, etc. el frontend puede concatenar `levelNumber` + `"° Ciclo"`.
- Los 10 ciclos siempre están disponibles (son datos semilla del sistema).

---

### 12.2 `GET /courses/types` (ADMIN, SUPER_ADMIN)

- Objetivo: lista de tipos de unidad disponibles para poblar el selector de unidad en el panel de calendario.
- Devuelve todos los tipos registrados (CIENCIAS, LETRAS, FACULTAD y cualquier otro que se cree en el futuro).

#### Response `data`

Array de objetos:

```json
[
  {
    "id": "1",
    "code": "CIENCIAS",
    "name": "Ciencias"
  },
  {
    "id": "2",
    "code": "LETRAS",
    "name": "Letras"
  },
  {
    "id": "3",
    "code": "FACULTAD",
    "name": "Facultad"
  }
]
```

#### Tipos de cada campo

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | ID del tipo de unidad (no se usa como filtro en el calendario) |
| `code` | string | Código técnico (`CIENCIAS`, `LETRAS`, `FACULTAD`) → usar como `courseTypeCode` en el filtro del calendario (12.3) |
| `name` | string | Nombre legible → mostrar al usuario en el selector |

#### Observaciones

- El campo a mostrar en el dropdown es `name`. El campo a enviar como filtro al calendario es `code`.
- El `id` de esta respuesta **no** se usa en el endpoint de calendario; el filtro usa `code` directamente.

---

### 12.3 `GET /class-events/global/sessions` (ADMIN, SUPER_ADMIN)

- Objetivo: obtener todas las sesiones de clase programadas dentro de un rango de fechas, agrupadas por `courseCycleId`. Es el endpoint principal del calendario del panel administrativo.
- El frontend determina la vista semanal o mensual enviando el rango `[startDate, endDate)` correspondiente.
- Las sesiones canceladas (`is_cancelled = true`) **no** se incluyen en la respuesta.
- La respuesta está cacheada en Redis. El caché se invalida automáticamente cuando cambian sesiones del mismo ciclo y tipo de unidad.

#### Modos de filtrado

El endpoint soporta dos modos de consulta mutuamente excluyentes. Si se envían `courseCycleIds` junto con `courseTypeCode`/`academicCycleId`, el modo A tiene prioridad.

**Modo A — por IDs de course-cycle explícitos** (uso avanzado / selector de cursos individuales):
- Enviar `courseCycleIds` con uno o más IDs.
- Todos los IDs deben pertenecer al mismo tipo de unidad y al mismo ciclo académico.

**Modo B — por tipo de unidad + ciclo académico** (uso habitual del panel de calendario):
- Enviar `courseTypeCode` + `academicCycleId`.
- El backend resuelve internamente todos los cursos activos de esa combinación.
- Si no existe ningún curso para ese tipo y ciclo, la respuesta es un array vacío (no es error).

#### Query params

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `startDate` | string ISO-8601 | **Sí** | Inicio del rango (inclusive). Ej: `"2026-04-14"` |
| `endDate` | string ISO-8601 | **Sí** | Fin del rango (exclusivo). Ej: `"2026-04-21"` para vista semanal |
| `courseCycleIds` | string (CSV o array), opcional | No | IDs de course-cycle. Puede enviarse como `courseCycleIds=1,2,3` o `courseCycleIds[]=1&courseCycleIds[]=2`. Máximo 100. (Modo A) |
| `courseTypeCode` | `'CIENCIAS' \| 'LETRAS' \| 'FACULTAD'` | No | Código del tipo de unidad. Obtenido de `code` en 12.2. (Modo B) |
| `cycleLevelId` | string numérica (1–10) | No | ID del ciclo de curso (1° al 10°). Obtenido de `id` en 12.1. (Modo B) |

> Al menos una de las dos combinaciones debe estar presente: `courseCycleIds` o (`courseTypeCode` + `cycleLevelId`). Si no se envía ninguna, el backend responde `400 Bad Request`.

#### Response `data`

Array de grupos, uno por `courseCycleId` con sesiones en el rango:

```json
[
  {
    "courseCycleId": "101",
    "courseId": "11",
    "courseCode": "MAT101",
    "courseName": "Matemática Básica",
    "primaryColor": "#3B82F6",
    "secondaryColor": "#BFDBFE",
    "sessions": [
      {
        "eventId": "501",
        "evaluationId": "201",
        "sessionNumber": 5,
        "title": "Sesión 5",
        "topic": "Derivadas e integrales",
        "startDatetime": "2026-04-14T13:00:00.000Z",
        "endDatetime": "2026-04-14T15:00:00.000Z"
      },
      {
        "eventId": "502",
        "evaluationId": "201",
        "sessionNumber": 6,
        "title": "Sesión 6",
        "topic": "Aplicaciones de derivadas",
        "startDatetime": "2026-04-17T13:00:00.000Z",
        "endDatetime": "2026-04-17T15:00:00.000Z"
      }
    ]
  }
]
```

Si no hay sesiones en el rango para los filtros aplicados, la respuesta es `data: []`.

#### Tipos de cada campo

**Cada grupo (por curso):**

| Campo | Tipo | Descripción |
|---|---|---|
| `courseCycleId` | string | ID del course-cycle |
| `courseId` | string | ID del curso base |
| `courseCode` | string | Código del curso (ej. `"MAT101"`) |
| `courseName` | string | Nombre del curso |
| `primaryColor` | string \| null | Color primario del curso en formato hex (ej. `"#3B82F6"`). `null` si no está configurado |
| `secondaryColor` | string \| null | Color secundario del curso en formato hex. `null` si no está configurado |
| `sessions` | array | Sesiones del curso dentro del rango solicitado, ordenadas por `startDatetime ASC` |

**Cada sesión (`sessions[n]`):**

| Campo | Tipo | Descripción |
|---|---|---|
| `eventId` | string | ID del evento de clase |
| `evaluationId` | string | ID de la evaluación a la que pertenece la sesión |
| `sessionNumber` | number | Número de sesión dentro de la evaluación |
| `title` | string | Título de la sesión (ej. `"Sesión 5"`) |
| `topic` | string | Tema de la sesión |
| `startDatetime` | string ISO 8601 | Fecha y hora de inicio en UTC |
| `endDatetime` | string ISO 8601 | Fecha y hora de fin en UTC |

#### Errores específicos

| Código | Cuándo ocurre |
|---|---|
| `400 Bad Request` | No se envió ninguna combinación válida de filtros (`courseCycleIds` ni `courseTypeCode+cycleLevelId`) |
| `400 Bad Request` | Los `courseCycleIds` enviados pertenecen a distintas unidades o ciclos académicos (solo Modo A) |
| `400 Bad Request` | `courseTypeCode` tiene un valor distinto a `CIENCIAS`, `LETRAS` o `FACULTAD` |
| `400 Bad Request` | `cycleLevelId` no es una cadena numérica |
| `404 Not Found` | Uno o más `courseCycleIds` no existen en la base de datos (solo Modo A) |

#### Ejemplo de uso — vista semanal: CIENCIAS, 3° Ciclo

```
GET /api/v1/class-events/global/sessions
  ?courseTypeCode=CIENCIAS
  &cycleLevelId=3
  &startDate=2026-04-14
  &endDate=2026-04-21
```

#### Ejemplo de uso — vista mensual: LETRAS, 5° Ciclo

```
GET /api/v1/class-events/global/sessions
  ?courseTypeCode=LETRAS
  &cycleLevelId=5
  &startDate=2026-04-01
  &endDate=2026-05-01
```

#### Observaciones

- Las fechas `startDatetime` / `endDatetime` vienen en UTC. Aplicar conversión a hora Perú (`America/Lima`, UTC−5) en el frontend para mostrarlas al usuario.
- Los colores `primaryColor` / `secondaryColor` son opcionales por curso. El frontend debe tener un color de fallback para los cursos sin color configurado.
- Los grupos cuyo `sessions` esté vacío **no aparecen** en la respuesta (el endpoint solo retorna grupos con al menos una sesión en el rango).
- El orden de los grupos en la respuesta no está garantizado. Ordenar en frontend si se requiere presentación específica (ej. por `courseCode` o `courseName`).
- Para la vista mensual, usar `startDate=YYYY-MM-01` y `endDate=YYYY-MM-01` del mes siguiente (rango exclusivo en el extremo derecho).
