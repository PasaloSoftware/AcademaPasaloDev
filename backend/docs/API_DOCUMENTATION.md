# DOCUMENTACIÓN DE API - ACADEMIA PASALO (CORE & AUTH)

Esta documentación cubre los módulos de **Autenticación, Seguridad, Gestión de Usuarios, Matrículas, Sistema, Auditoría y Notificaciones**.
Para la documentación de Cursos, Materiales, Feedback y Calendario, consultar: [API_CONTENT_AND_FEEDBACK.md](./API_CONTENT_AND_FEEDBACK.md)

---

## Formato de Respuesta Estándar

Todas las respuestas exitosas (200, 201) tienen esta estructura:

```json
{
  "statusCode": 200,
  "message": "Operación exitosa",
  "data": { ... },
  "timestamp": "2026-01-24T20:00:00.000Z"
}
```

Los errores (400, 401, 403, 404, 409, 500) tienen esta estructura:

```json
{
  "statusCode": 400,
  "message": "Descripción amigable del error",
  "error": "Bad Request",
  "timestamp": "2026-01-24T20:00:00.000Z",
  "path": "/api/v1/..."
}
```

### Convención de IDs en ejemplos

Los valores de ejemplo como `"123"`, `"course-cycle-id"` o `"pc1-id"` son placeholders de documentación.
No deben enviarse de forma literal.

Regla para frontend:

1. Primero obtener IDs reales desde endpoints de consulta del modulo correspondiente (`/auth`, `/users`, `/enrollments`).
2. Luego enviar esos IDs reales en endpoints de escritura (`POST`, `PATCH`, `DELETE`).
3. Todo campo `...Id` en request body o params espera un ID existente en BD.

---

## ÉPICA 1: Autenticación y Seguridad (Auth)

Base URL: `/api/v1/auth`

### 1. Login con Google

`POST /google`

**Request Body:**

```json
{
  "code": "string (Código de autorización devuelto por el hook useGoogleLogin)",
  "deviceId": "string (Identificador único del navegador/dispositivo)"
}
```

**Escenario A: Login Exitoso (Directo)**
`data`:

```json
{
  "accessToken": "JWT",
  "refreshToken": "JWT",
  "expiresIn": 10800,
  "sessionStatus": "ACTIVE",
  "concurrentSessionId": null,
  "user": {
    "id": "1",
    "email": "alumno@academia.com",
    "roles": [ { "code": "STUDENT", "name": "Alumno" } ],
    "lastActiveRoleId": "2",
    "firstName": "Luis",
    ...
  }
}
```

_Nota: `expiresIn` se calcula dinámicamente desde la tabla `system_setting`._

**Escenario B: Sesión Concurrente Detectada**
`data`:

```json
{
  "accessToken": "JWT",
  "refreshToken": "JWT",
  "expiresIn": 10800,
  "sessionStatus": "PENDING_CONCURRENT_RESOLUTION",
  "concurrentSessionId": "55",
  "user": { ... }
}
```

_Acción Front: Mostrar popup de decisión. Los tokens entregados NO permiten navegación hasta resolver._

**Escenario C: Anomalía de Geolocalización Detectada**
`data`:

```json
{
  "accessToken": "JWT",
  "refreshToken": "JWT",
  "expiresIn": 10800,
  "sessionStatus": "BLOCKED_PENDING_REAUTH",
  "concurrentSessionId": null,
  "user": { ... }
}
```

> [!WARNING]
> **Modo de Auditoría Pasiva (Fase Actual)**
> Aunque el estado `BLOCKED_PENDING_REAUTH` y el endpoint de re-autenticación están implementados y operativos, la lógica de inicio de sesión actual **opera en modo pasivo**.
> Esto significa que las anomalías (viajes imposibles, etc.) se registran en el historial de seguridad pero **no bloquean la sesión del usuario** (la sesión se crea como `ACTIVE`).
> El flujo de re-autenticación debe considerarse como una capacidad latente para activarse en futuras fases de endurecimiento de seguridad.

---

### 2. Cambiar Perfil Activo (Switch Profile)

`POST /switch-profile`
_Requiere Authorization: Bearer <accessToken>_

**Purpose:** Permite al usuario cambiar su contexto de operación a otro rol que posea (ej. de Estudiante a Profesor). Esta acción invalida los tokens anteriores y emite nuevos.

**Request Body:**

```json
{
  "roleId": "string (ID del rol al que se desea cambiar)",
  "deviceId": "string"
}
```

**Response:**
`data`:

```json
{
  "accessToken": "JWT (Nuevo token con el rol activo actualizado)",
  "refreshToken": "JWT (Nuevo refresh token)",
  "expiresIn": 10800
}
```

_Nota: El frontend debe reemplazar inmediatamente los tokens almacenados y actualizar la UI._

---

### 3. Resolver Sesión Concurrente

`POST /sessions/resolve-concurrent`

**Purpose:** Decide qué sesión mantener tras una detección concurrente.

**Request Body:**

```json
{
  "refreshToken": "string",
  "deviceId": "string",
  "decision": "KEEP_NEW | KEEP_EXISTING"
}
```

---

### 4. Re-autenticar Sesión Anómala

`POST /sessions/reauth-anomalous`

**Purpose:** Desbloquear una sesión bloqueada por geolocalización.

**Request Body:**

```json
{
  "code": "string (Nuevo Auth Code obtenido de Google)",
  "refreshToken": "string (Token de la sesión bloqueada)",
  "deviceId": "string"
}
```

**Response:**
`data`: (Mismo objeto que Escenario A de Login)

```json
{
  "accessToken": "JWT",
  "refreshToken": "JWT",
  "expiresIn": 10800,
  "user": null
}
```

---

### 5. Renovar Token (Refresh)

`POST /refresh`

**Request Body:**

```json
{
  "refreshToken": "string",
  "deviceId": "string"
}
```

---

### 6. Cerrar Sesión (Logout)

`POST /logout`
_Requiere Authorization: Bearer <accessToken>_

---

## ÉPICA 2: Módulo de Usuarios (Users)

Base URL: `/api/v1/users`
_Todos los endpoints requieren JWT y una sesión activa en BD._

**Nota sobre "Mi Perfil":** Para obtener los datos del usuario actual, el frontend debe usar el endpoint `GET /:id` utilizando el `id` retornado en la respuesta del Login.

### 1. Crear Usuario (Manual)

- **Endpoint:** `POST /`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Request Body:**
  ```json
  {
    "email": "string (email válido, max 255)",
    "firstName": "string (min 2, max 50, solo letras)",
    "lastName1": "string (opcional, max 50)",
    "lastName2": "string (opcional, max 50)",
    "phone": "string (opcional, max 20)",
    "career": "string (opcional, max 100)",
    "profilePhotoUrl": "string (opcional, url)",
    "photoSource": "google | uploaded | none"
  }
  ```

#### Endpoints nuevos recomendados para creacion por rol

Estos endpoints existen para que frontend no tenga que crear un usuario base y luego hacer una segunda llamada de asignacion de rol para los flujos mas comunes.

##### A. Crear Alumno

- **Endpoint:** `POST /students`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Objetivo:** Crear un usuario nuevo con rol inicial `STUDENT`.
- **Request Body:**
  ```json
  {
    "email": "string (email valido, max 255, obligatorio)",
    "firstName": "string (min 2, max 50, obligatorio, solo letras)",
    "lastName1": "string (opcional, max 50, solo letras)",
    "lastName2": "string (opcional, max 50, solo letras)",
    "phone": "string (opcional, max 20, numeros y caracteres validos)",
    "career": "string (opcional, max 100)",
    "profilePhotoUrl": "string (opcional, max 500)",
    "photoSource": "google | uploaded | none (opcional)"
  }
  ```
- **Campos obligatorios minimos para crear desde frontend:**
  - `email`
  - `firstName`
- **Response (`data`):** `UserResponseDto` con rol `STUDENT` ya asignado.
- **Ejemplo de response exitosa:**
  ```json
  {
    "statusCode": 201,
    "message": "Alumno creado exitosamente",
    "data": {
      "id": "145",
      "email": "alumno1@academiapasalo.com",
      "firstName": "Carlos",
      "lastName1": "Soto",
      "lastName2": "Perez",
      "phone": "999888777",
      "career": "Ingenieria",
      "profilePhotoUrl": null,
      "photoSource": "none",
      "isActive": true,
      "roles": [
        {
          "code": "STUDENT",
          "name": "Alumno"
        }
      ]
    },
    "timestamp": "2026-03-10T12:00:00.000Z"
  }
  ```
- **Comportamiento detallado:**
  - crea el usuario en una sola transaccion
  - asigna el rol `STUDENT` desde el inicio
  - deja `lastActiveRoleId` alineado al rol creado
  - no realiza matricula automaticamente
- **Secuencia recomendada de frontend:**
  1. llamar `POST /users/students`
  2. guardar `data.id`
  3. si el flujo requiere inscripcion inmediata, llamar `POST /enrollments` con ese `userId`
- **Errores esperados:**
  - `403` si el actor no es `ADMIN` ni `SUPER_ADMIN`
  - `409` si el correo ya existe

##### B. Crear Profesor

- **Endpoint:** `POST /professors`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Objetivo:** Crear un usuario nuevo con rol inicial `PROFESSOR`.
- **Request Body:**
  ```json
  {
    "email": "string (email valido, max 255, obligatorio)",
    "firstName": "string (min 2, max 50, obligatorio, solo letras)",
    "lastName1": "string (opcional, max 50, solo letras)",
    "lastName2": "string (opcional, max 50, solo letras)",
    "phone": "string (opcional, max 20, numeros y caracteres validos)",
    "career": "string (opcional, max 100)",
    "profilePhotoUrl": "string (opcional, max 500)",
    "photoSource": "google | uploaded | none (opcional)"
  }
  ```
- **Campos obligatorios minimos para crear desde frontend:**
  - `email`
  - `firstName`
- **Response (`data`):** `UserResponseDto` con rol `PROFESSOR` ya asignado.
- **Ejemplo de response exitosa:**
  ```json
  {
    "statusCode": 201,
    "message": "Profesor creado exitosamente",
    "data": {
      "id": "201",
      "email": "profesor1@academiapasalo.com",
      "firstName": "Luis",
      "lastName1": "Ramos",
      "lastName2": "Quispe",
      "phone": null,
      "career": null,
      "profilePhotoUrl": null,
      "photoSource": "none",
      "isActive": true,
      "roles": [
        {
          "code": "PROFESSOR",
          "name": "Profesor"
        }
      ]
    },
    "timestamp": "2026-03-10T12:00:00.000Z"
  }
  ```
- **Comportamiento detallado:**
  - crea el usuario en una sola transaccion
  - asigna el rol `PROFESSOR` desde el inicio
  - no asigna al profesor a ningun curso o ciclo
- **Secuencia recomendada de frontend:**
  1. llamar `POST /users/professors`
  2. guardar `data.id`
  3. si corresponde, llamar `POST /courses/cycle/:courseCycleId/professors` usando `professorUserId = data.id`
- **Errores esperados:**
  - `403` si el actor no es `ADMIN` ni `SUPER_ADMIN`
  - `409` si el correo ya existe

##### C. Crear Administrador

- **Endpoint:** `POST /admins`
- **Roles:** `SUPER_ADMIN`
- **Objetivo:** Crear un usuario nuevo con rol inicial `ADMIN`.
- **Request Body:**
  ```json
  {
    "email": "string (email valido, max 255, obligatorio)",
    "firstName": "string (min 2, max 50, obligatorio, solo letras)",
    "lastName1": "string (opcional, max 50, solo letras)",
    "lastName2": "string (opcional, max 50, solo letras)",
    "phone": "string (opcional, max 20, numeros y caracteres validos)",
    "career": "string (opcional, max 100)",
    "profilePhotoUrl": "string (opcional, max 500)",
    "photoSource": "google | uploaded | none (opcional)"
  }
  ```
- **Campos obligatorios minimos para crear desde frontend:**
  - `email`
  - `firstName`
- **Response (`data`):** `UserResponseDto` con rol `ADMIN` ya asignado.
- **Ejemplo de response exitosa:**
  ```json
  {
    "statusCode": 201,
    "message": "Administrador creado exitosamente",
    "data": {
      "id": "310",
      "email": "admin2@academiapasalo.com",
      "firstName": "Marina",
      "lastName1": "Lopez",
      "lastName2": null,
      "phone": null,
      "career": null,
      "profilePhotoUrl": null,
      "photoSource": "none",
      "isActive": true,
      "roles": [
        {
          "code": "ADMIN",
          "name": "Administrador"
        }
      ]
    },
    "timestamp": "2026-03-10T12:00:00.000Z"
  }
  ```
- **Comportamiento detallado:**
  - solo `SUPER_ADMIN` puede ejecutar esta accion
  - crea el usuario en una sola transaccion
  - asigna el rol `ADMIN` desde el inicio
  - encola la reconciliacion de staff viewers porque el usuario entra al conjunto administrativo
- **Regla importante de UX:**
  - si el perfil activo es `ADMIN`, frontend debe ocultar o deshabilitar esta accion
- **Errores esperados:**
  - `403` si el actor no es `SUPER_ADMIN`
  - `409` si el correo ya existe

#### Nota de integracion para frontend

- `POST /users` sigue existiendo y crea un usuario base.
- Para flujos reales de negocio, frontend debe preferir:
  - `POST /users/students`
  - `POST /users/professors`
  - `POST /users/admins`
- Esto evita llamadas extra de asignacion de rol y deja el usuario listo para los siguientes pasos operativos.
- En los tres endpoints nuevos el formato del payload es exactamente el mismo:
  - `email: string`
  - `firstName: string`
  - `lastName1?: string`
  - `lastName2?: string`
  - `phone?: string`
  - `career?: string`
  - `profilePhotoUrl?: string`
  - `photoSource?: "google" | "uploaded" | "none"`
- El frontend no debe enviar `roles`, `lastActiveRoleId`, `isActive`, `createdAt` ni `updatedAt` en estos endpoints.

### 2. Listar Usuarios

- **Endpoint:** `GET /`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Response:** Array de objetos User.

### 3. Obtener Usuario por ID

- **Endpoint:** `GET /:id`
- **Roles:** `ADMIN`, `SUPER_ADMIN` o el **Propietario** de la cuenta.
- **Response:** Objeto User.

### 4. Actualizar Usuario

- **Endpoint:** `PATCH /:id`
- **Roles:** `ADMIN`, `SUPER_ADMIN` o el **Propietario** de la cuenta.
- **Request Body:** Similar a `POST /` (todos los campos son opcionales).
- **Campo adicional de seguridad:** `isActive?: boolean`
  - `false` = cuenta inactiva (baneada)
  - `true` = cuenta activa

### 5. Banear Usuario (Admin Action)

- **Endpoint:** `PATCH /:id/ban`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Request Body:** No requiere body.
- **Purpose:** Desactivar una cuenta de usuario de forma inmediata por razones operativas o de seguridad.
- **Reglas de negocio:**
  - El administrador **no puede banearse a sí mismo** (`403`).
  - El baneo marca `user.isActive = false`.
  - Se invalidan identidades en caché y se revocan sesiones activas del usuario.
  - El usuario baneado queda bloqueado en `login`, `refresh` y validación de sesión con respuesta `403`.
- **Response (`data`):** Objeto `User` actualizado.
- **Errores esperados:**
  - `403` si intenta auto-banearse.
  - `404` si el usuario no existe.

#### Ejemplo de Response

```json
{
  "statusCode": 200,
  "message": "Usuario baneado exitosamente",
  "data": {
    "id": "25",
    "email": "estudiante@academia.com",
    "isActive": false,
    "roles": [{ "code": "STUDENT", "name": "Alumno" }]
  },
  "timestamp": "2026-02-12T23:50:00.000Z"
}
```

### 6. Eliminar Usuario

- **Endpoint:** `DELETE /:id`
- **Roles:** `ADMIN`, `SUPER_ADMIN`

### 7. Gestion de Roles

- **Asignar:** `POST /:id/roles/:roleCode`
  - **Roles:** `SUPER_ADMIN`
- **Remover:** `DELETE /:id/roles/:roleCode`
  - **Roles:** `SUPER_ADMIN`
- **Comportamiento adicional de seguridad/media access (nuevo):**
  - Cuando el `roleCode` es `ADMIN` o `SUPER_ADMIN`, el backend encola reconciliacion inmediata de acceso media para grupo global staff viewers.
  - Esto reduce ventana de acceso residual cuando se revoca rol administrativo.
  - Se mantiene reconciliacion periodica como fallback para drift operativo.
  - Nota: la propagacion final de permisos en Google puede tardar unos segundos/minutos (dependencia externa).
---

## EPICA 5: Matriculas (Enrollments)

Base URL: `/api/v1/enrollments`

### 1. Matricular Alumno

- **Endpoint:** `POST /`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Request Body:**
  ```json
  {
    "userId": "string",
    "courseCycleId": "string",
    "enrollmentTypeCode": "FULL | PARTIAL",
    "evaluationIds": ["string"],
    "historicalCourseCycleIds": ["string"]
  }
  ```

#### Regla nueva obligatoria sobre `userId`

El `userId` enviado debe pertenecer a un usuario activo con rol `STUDENT`.

Esto implica lo siguiente para frontend:

1. No usar este endpoint sobre usuarios creados con `POST /users` si aun no tienen rol.
2. No usar este endpoint sobre usuarios con rol `PROFESSOR`, `ADMIN` o `SUPER_ADMIN`.
3. El flujo recomendado para alta rapida de alumno es:
   1. `POST /users/students`
   2. `POST /enrollments`
4. Si el backend responde `400` con un mensaje equivalente a `El usuario debe ser un alumno activo para matricularse.`, debe tratarse como error funcional del flujo, no como error tecnico.

#### Ejemplo de secuencia recomendada para frontend

**Paso 1: crear alumno**

```http
POST /api/v1/users/students
```

**Paso 2: matricular alumno**

```http
POST /api/v1/enrollments
```

```json
{
  "userId": "id retornado por /users/students",
  "courseCycleId": "string",
  "enrollmentTypeCode": "FULL"
}
```

#### Modelo de dominio (clave para Frontend)

La matricula siempre se registra sobre un `courseCycleId` (un curso especifico dentro de un ciclo academico).
La jerarquia correcta es:

1. `academicCycle` (ej. 2026-1)
2. `courseCycle` (ej. Algebra en 2026-1)
3. `evaluation` (PC1, PC2, Final) perteneciente a ese `courseCycle`

No existe matricula directa a todo el ciclo academico sin curso. Siempre hay un curso base (`courseCycleId`).

#### Tipos de Matricula

| Tipo        | `evaluationIds` | `historicalCourseCycleIds` | Comportamiento |
| ----------- | --------------- | -------------------------- | -------------- |
| **FULL**    | Ignorado        | Opcional                   | Acceso a todas las evaluaciones del `courseCycleId` base + acceso historico de los `courseCycleId` enviados |
| **PARTIAL** | **Requerido**   | Opcional                   | Acceso solo a las evaluaciones listadas en `evaluationIds` (del curso base o cursos historicos permitidos) |

Reglas de validacion recomendadas para Frontend:

1. `FULL`: no enviar `evaluationIds`.
2. `PARTIAL`: enviar al menos 1 `evaluationId`.
3. Cada `evaluationId` debe pertenecer al `courseCycleId` base o a uno de `historicalCourseCycleIds`.
4. `historicalCourseCycleIds` no crea matricula independiente; solo amplia alcance para evaluaciones historicas.

> [!IMPORTANT]
> **Regla de Vigencia Unica**
> Toda evaluacion concedida por la matricula (actual o historica, FULL o PARTIAL) usa la misma ventana de acceso del ciclo base.
> `accessStartDate`: inicio del ciclo academico del `courseCycleId` base.
> `accessEndDate`: fin del ciclo academico del `courseCycleId` base.
> No existe clamping por evaluacion mas lejana ni fallback por simil para definir la fecha fin.

#### Ejemplos de Uso

**1. FULL con acceso historico:**

```json
{
  "userId": "123",
  "courseCycleId": "algebra-2026-1",
  "enrollmentTypeCode": "FULL",
  "historicalCourseCycleIds": ["algebra-2025-2", "algebra-2025-1"]
}
```

_Resultado: acceso a todas las evaluaciones de Algebra 2026-1 + todos los examenes de Algebra en 2025-2 y 2025-1._

**2. PARTIAL solo ciclo actual:**

```json
{
  "userId": "456",
  "courseCycleId": "algebra-2026-1",
  "enrollmentTypeCode": "PARTIAL",
  "evaluationIds": ["pc1-id", "pc2-id"]
}
```

_Resultado: acceso solo a PC1 y PC2 de Algebra 2026-1._

**3. PARTIAL con evaluacion de ciclo historico:**

```json
{
  "userId": "789",
  "courseCycleId": "algebra-2026-1",
  "enrollmentTypeCode": "PARTIAL",
  "evaluationIds": ["algebra-final-2025-2"],
  "historicalCourseCycleIds": ["algebra-2025-2"]
}
```

_Resultado: acceso solo al examen final de Algebra 2025-2 para practica._

### 2. Cancelar Matricula

- **Endpoint:** `DELETE /:id`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Efecto:** revoca accesos inmediatamente.

---

## ÉPICA 6: Sistema (System)

Base URL: `/api/v1`

### 1. Health Check

`GET /health`

- **Roles:** Público.
- **Descripción:** Verifica el estado de la API, conexión a BD y Redis.
- **Response:** `{ "status": "ok", "info": { ... } }`

---

## ÉPICA 7: Auditoría y Trazabilidad (Audit)

Base URL: `/api/v1/audit`
_Requiere Authorization: Bearer <accessToken>._

### 1. Obtener Historial Unificado

`GET /history`

**Purpose:** Obtiene una vista cronológica consolidada de eventos de seguridad (logins, anomalías) y acciones de negocio (subida de archivos, gestión de usuarios).

**Query Parameters:**

- `startDate` (ISO Date, opcional): Filtrar desde esta fecha.
- `endDate` (ISO Date, opcional): Filtrar hasta esta fecha.
- `userId` (string, opcional): Filtrar acciones de un usuario específico.
- `limit` (number, opcional): Máximo de registros (Default: 50, Max Backend: 100).

**Response:**
`data` (Array de objetos):

```json
[
  {
    "id": "aud-123 | sec-456",
    "datetime": "2026-02-07T15:00:00.000Z",
    "userId": "10",
    "userName": "Academia Pasalo",
    "actionCode": "MATERIAL_UPLOAD | LOGIN_SUCCESS",
    "actionName": "Subida de Archivo | Inicio de Sesión",
    "source": "AUDIT | SECURITY",
    "entityType": "material (solo en AUDIT)",
    "entityId": "50 (solo en AUDIT)",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0... (solo en SECURITY)",
    "metadata": { ... }
  }
]
```

---

### 2. Exportar Historial a Excel

`GET /export`

**Purpose:** Descarga un reporte profesional en formato `.xlsx` con el historial filtrado. Soporta hasta 1000 registros por descarga.

**Query Parameters:**

- `startDate`, `endDate`, `userId` (Mismos filtros que el historial).

**Response:**

- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename=reporte-auditoria-YYYY-MM-DD.xlsx`
- **Body:** Stream binario del archivo Excel.

---

## EPICA 8: Notificaciones (Notifications)

Base URL: `/api/v1/notifications`
_Requiere Authorization: Bearer \<accessToken\>._
_Accesible para todos los roles: `STUDENT`, `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`._

### Comportamiento general

Las notificaciones se despachan de forma asincrona a traves de una cola de trabajos (BullMQ). Esto significa que no son sincronas con la accion que las genera; puede existir un delay de milisegundos a pocos segundos entre, por ejemplo, que un profesor suba un material y que la notificacion aparezca en el listado del alumno. El frontend no debe asumir que la notificacion ya existe inmediatamente despues de ejecutar una accion.

### Tipos de notificacion

| Codigo | `entityType` | `entityId` esperado |
| --- | --- | --- |
| `NEW_MATERIAL` | `"material"` | `materialId` |
| `MATERIAL_UPDATED` | `"material"` | `materialId` |
| `CLASS_SCHEDULED` | `"class_event"` | `classEventId` |
| `CLASS_UPDATED` | `"class_event"` | `classEventId` |
| `CLASS_CANCELLED` | `"class_event"` | `classEventId` |
| `CLASS_REMINDER` | `"class_event"` | `classEventId` |
| `CLASS_RECORDING_AVAILABLE` | `"class_event"` | `classEventId` |
| `DELETION_REQUEST_APPROVED` | `"deletion_request"` | `requestId` |
| `DELETION_REQUEST_REJECTED` | `"deletion_request"` | `requestId` |

`entityType` y `entityId` representan la referencia persistida de la notificacion. Para navegacion en frontend, se debe priorizar `target` cuando exista.

Reglas funcionales relevantes para frontend:

1. `CLASS_UPDATED` se genera solo cuando cambia el horario de la sesion (`startDatetime` y/o `endDatetime`).
2. Cambios de titulo, tema o link en vivo no generan por si solos una notificacion `CLASS_UPDATED`.
3. `CLASS_RECORDING_AVAILABLE` es independiente y se genera cuando la grabacion queda disponible.
4. Si cambia la hora de inicio de una clase, el backend reemplaza automaticamente el reminder anterior para evitar duplicados.
5. Si el nuevo horario ya no permite reminder, el backend elimina el reminder previo pendiente.

### Estrategia de actualizacion en cliente (pull puro)

El sistema no expone WebSocket ni Server-Sent Events. La actualizacion del estado de notificaciones debe implementarse en el cliente con las siguientes reglas:

1. **Polling del badge**: llamar a `GET /notifications/unread-count` cada 60 segundos unicamente cuando la pestana esta activa (`document.visibilityState === 'visible'`).
2. **Pausa con Visibility API**: detener el intervalo de polling cuando la pestana queda oculta y reanudarlo al recuperar el foco.
3. **Carga del listado bajo demanda**: llamar a `GET /notifications` unicamente cuando el usuario abre el panel de notificaciones.
4. **Invalidacion por accion**: tras marcar una notificacion como leida (`PATCH /:id/read` o `PATCH /read-all`), refrescar el contador del badge de forma inmediata.

### Regla de navegacion

El frontend debe usar:

1. `type` para decidir la UI.
2. `target` para navegar cuando exista.
3. `entityType` + `entityId` como referencia persistida.

---

### 1. Listar Notificaciones

`GET /notifications`

**Purpose:** Obtiene la lista paginada de notificaciones del usuario autenticado, con soporte para filtrar solo las no leidas.

**Query Parameters:**

- `onlyUnread` (boolean, opcional): si es `"true"`, devuelve unicamente las notificaciones no leidas.
- `limit` (integer, opcional): numero maximo de notificaciones por pagina. Min: 1, Max: 100. Default: 20.
- `offset` (integer, opcional): numero de notificaciones a omitir. Min: 0. Default: 0.

**Response:**
`data` (Array de objetos):

```json
[
  {
    "notificationId": "notif-abc-123",
    "type": "MATERIAL_UPDATED",
    "typeName": "Material Actualizado",
    "title": "Material actualizado",
    "message": "Se actualizo 'Guia de integrales' de la clase 3 de la PC2 del curso Calculo.",
    "entityType": "material",
    "entityId": "mat-900",
    "target": {
      "materialId": "mat-900",
      "classEventId": "evt-300",
      "evaluationId": "eval-22",
      "courseCycleId": "cycle-8",
      "folderId": "folder-41"
    },
    "isRead": false,
    "readAt": null,
    "createdAt": "2026-03-11T03:20:00.000Z"
  },
  {
    "notificationId": "notif-def-456",
    "type": "CLASS_RECORDING_AVAILABLE",
    "typeName": "Grabacion Disponible",
    "title": "Grabacion disponible",
    "message": "La grabacion de la clase 5 de la PC1 del curso Fisica ya esta disponible.",
    "entityType": "class_event",
    "entityId": "evt-501",
    "target": {
      "materialId": null,
      "classEventId": "evt-501",
      "evaluationId": "eval-31",
      "courseCycleId": "cycle-11",
      "folderId": null
    },
    "isRead": false,
    "readAt": null,
    "createdAt": "2026-03-11T03:25:00.000Z"
  }
]
```

**Significado de `target`:**

- `target.materialId`: material puntual a enfocar
- `target.classEventId`: sesion puntual a abrir
- `target.evaluationId`: evaluacion de la sesion
- `target.courseCycleId`: opcional para rutas del frontend que agrupen por ciclo
- `target.folderId`: carpeta relacionada si la UI la necesita

**Reglas de uso en frontend:**

- Si `type` es `CLASS_RECORDING_AVAILABLE`, navegar a la vista de sesiones usando `target.classEventId`.
- Si `type` es `CLASS_UPDATED`, refrescar detalle/calendario de la sesion usando `target.classEventId`.
- Si `type` es `NEW_MATERIAL` o `MATERIAL_UPDATED`, navegar a la vista de sesiones usando `target.classEventId` y enfocar el material con `target.materialId`.
- `message` ya llega enriquecido con clase, evaluacion y curso cuando aplica.
- `target` puede ser `null` en tipos sin destino navegable.

**Errores:** No lanza errores de negocio. Devuelve un array vacio si el usuario no tiene notificaciones.

---

### 2. Obtener Conteo de No Leidas

`GET /notifications/unread-count`

**Purpose:** Devuelve el numero total de notificaciones no leidas del usuario autenticado. Disenado para actualizar el badge del icono de notificaciones con el minimo costo posible.

**Response:**
`data`:

```json
{
  "count": 5
}
```

**Errores:** No lanza errores de negocio.

---

### 3. Marcar Todas como Leidas

`PATCH /notifications/read-all`

**Purpose:** Marca todas las notificaciones no leidas del usuario autenticado como leidas en una sola operacion. Es idempotente: si no hay notificaciones no leidas, la operacion se completa sin error.

**Request Body:** No requerido.

**Response:** `204 No Content` (sin body).

**Errores:** No lanza errores de negocio.

---

### 4. Marcar una Notificacion como Leida

`PATCH /notifications/:id/read`

**Purpose:** Marca una notificacion especifica como leida.

**Path Parameters:**

- `id` (string): ID de la notificacion (`notificationId`).

**Request Body:** No requerido.

**Response:** `204 No Content` (sin body).

**Errores:**
| Codigo | Causa |
|---|---|
| `404 Not Found` | La notificacion no existe o no pertenece al usuario autenticado. |
