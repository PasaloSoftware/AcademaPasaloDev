# ESPECIFICACIÓN TÉCNICA DE API: CONTENIDO, MATERIALES Y FEEDBACK
==================================================================

Esta API gestiona el núcleo de la experiencia académica: cursos, materiales educativos, testimonios y calendario de clases. Sigue el estándar de respuesta unificada del proyecto.

---

## Estándar de Comunicación
- **Base URL:** `/api/v1`
- **Auth:** Requiere `Authorization: Bearer <token>` (excepto en endpoints públicos).
- **Contexto de Rol Activo:** Todos los endpoints (ej. `/my-schedule`, `/my-courses`) responden basándose en el **perfil activo** seleccionado mediante `POST /auth/switch-profile`. Si un usuario tiene roles de `STUDENT` y `PROFESSOR`, debe cambiar de perfil explícitamente para ver el contenido correspondiente a cada rol.
- **Respuesta Exitosa:**
    ```json
    {
      "statusCode": number,
      "message": "Mensaje en español para UI",
      "data": object | array | null,
      "timestamp": "ISO-8601"
    }
    ```

### Convención de IDs en ejemplos
Los IDs mostrados en ejemplos (`"123"`, `"pc1-id"`, `"courseCycleId"`) son referenciales.
No son valores literales para copiar/pegar.

Flujo esperado para frontend:

1. Consultar primero recursos base para obtener IDs reales.
2. Reutilizar esos IDs en operaciones de escritura.
3. Validar que cada `...Id` pertenezca al contexto correcto (curso/ciclo/evaluación).

---

## ÉPICA: CALENDARIO Y CLASES EN VIVO (`/class-events`)

Gestión de sesiones sincrónicas vinculadas a evaluaciones. Incluye lógica de acceso dinámico diferenciando entre clase en vivo y grabaciones.

Notas operativas relevantes:

1. Cuando una sesion cambia de horario, el backend genera notificacion academica de cambio de horario.
2. Si solo cambian titulo, tema o link en vivo, la sesion se actualiza pero no se emite notificacion academica de horario.
3. Cuando una grabacion queda disponible, el backend genera una notificacion separada de tipo grabacion disponible.
4. Si una sesion se reprograma, el reminder previo se reemplaza automaticamente; no deben existir reminders duplicados para la misma clase.

### 1. Calendario Unificado (Mi Horario)
Obtiene todas las sesiones programadas para el usuario (alumno o profesor) dentro de un rango de fechas específico.
- **Endpoint:** `GET /class-events/my-schedule`
- **Query Params (Obligatorios):** `start` (ISO), `end` (ISO).
- **Roles:** `STUDENT`, `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- **Reglas de fecha/hora:**
  - El backend usa zona de negocio fija `America/Lima`.
  - Si `start` o `end` llegan como `YYYY-MM-DD`, se interpretan como rango diario en hora Lima.
  - `end` en formato solo fecha se trata como limite superior exclusivo del dia siguiente en hora Lima.
  - La respuesta siempre retorna instantes UTC en formato ISO-8601 (`...Z`).
- **Data (Response):** 
    ```json
    [
      {
        "id": string,
        "sessionNumber": number,
        "title": string,
        "topic": string,
        "startDatetime": "ISO-8601",
        "endDatetime": "ISO-8601",
        "liveMeetingUrl": string | null, // URL de Zoom/Meet (sin enmascarado en este DTO)
        "recordingUrl": string | null,   // URL de grabacion en formato preview/embed
        "recordingStatus": "NOT_AVAILABLE" | "PROCESSING" | "READY" | "FAILED",
        "isCancelled": boolean,
        "canJoinLive": boolean,
        "canWatchRecording": boolean, // true solo cuando recordingStatus = READY
        "canCopyLiveLink": boolean,
        "canCopyRecordingLink": boolean,
        "courseName": string,
        "courseCode": string,
        "evaluationName": string, // e.g. "PC1"
        "creator": { "id": string, "firstName": string, "lastName1": string, "profilePhotoUrl": string | null },
        "professors": [ { "id": string, "firstName": string, "lastName1": string, "profilePhotoUrl": string | null } ]
      }
    ]
    ```

### 2. Descubrimiento de Capas por Categoría (Panel Lateral)
Devuelve cursos "hermanos" para superposición visual de horarios.
- **Endpoint:** `GET /class-events/discovery/layers/:courseCycleId`
- **Roles:** `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- **Reglas:**
  - El `courseCycleId` debe existir.
  - Debe pertenecer al ciclo activo (`system_setting.ACTIVE_CYCLE_ID`).
  - Solo incluye cursos del mismo `course_type` y del mismo ciclo activo.
  - Excluye el `courseCycleId` origen.
- **Data (Response):**
    ```json
    [
      {
        "courseCycleId": "string",
        "courseId": "string",
        "courseCode": "MAT-101",
        "courseName": "Álgebra I",
        "primaryColor": "#1A73E8",
        "secondaryColor": "#D2E3FC",
        "courseTypeCode": "CIENCIAS"
      }
    ]
    ```

### 3. Sesiones Globales Multi-Curso (Render de Capas)
Obtiene sesiones agrupadas por curso-ciclo para pintar calendario comparativo.
- **Endpoint:** `GET /class-events/global/sessions`
- **Roles:** `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- **Query Params (Obligatorios):**
  - `courseCycleIds`: CSV de IDs (`id1,id2,id3`)
  - `startDate`: ISO-8601
  - `endDate`: ISO-8601
- **Reglas:**
  - Todos los `courseCycleIds` deben pertenecer al mismo `course_type` y `academic_cycle`.
  - Si mezcla categoría/ciclo, backend responde `400`.
  - No devuelve eventos cancelados.
  - `startDate` y `endDate` siguen la misma semantica horaria de `my-schedule`.
- **Data (Response):**
    ```json
    [
      {
        "courseCycleId": "string",
        "courseId": "string",
        "courseCode": "MAT-101",
        "courseName": "Álgebra I",
        "primaryColor": "#1A73E8",
        "secondaryColor": "#D2E3FC",
        "sessions": [
          {
            "eventId": "string",
            "evaluationId": "string",
            "sessionNumber": 1,
            "title": "Clase 1",
            "topic": "Introducción",
            "startDatetime": "2026-02-25T18:00:00.000Z",
            "endDatetime": "2026-02-25T20:00:00.000Z"
          }
        ]
      }
    ]
    ```


## ÉPICA: GESTIÓN ACADÉMICA CORE (`/cycles`, `/courses`)

### 1. Ciclos Académicos (`/cycles`)
- **GET /api/v1/cycles**: Listar todos los ciclos. (Roles: `ADMIN`, `SUPER_ADMIN`).
- **GET /api/v1/cycles/active**: Obtener el ciclo activo actual. (Roles: Público/Auth).
- **GET /api/v1/cycles/:id**: Detalle de un ciclo. (Roles: `ADMIN`).
- **Data (Response):**
    ```json
    {
      "id": "string",
      "code": "2026-1",
      "startDate": "2026-01-01T00:00:00Z",
      "endDate": "2026-06-30T23:59:59Z"
    }
    ```

### 2. Cursos y Materias (`/courses`)

#### Dashboard: Mis Cursos Matriculados
Obtiene el listado de cursos para el dashboard principal.
- **Endpoints:** `GET /enrollments/my-courses` y `GET /courses/my-courses`
- **Roles:** `STUDENT`, `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- **Caché:** 1 hora.
- **Data (Response):** ambos endpoints usan el mismo shape JSON.

Notas de dashboard:
- `GET /enrollments/my-courses` es el endpoint del dashboard para `STUDENT`.
- `GET /courses/my-courses` es el endpoint del dashboard para `PROFESSOR`.
- Ambos endpoints deben responder el mismo shape JSON del dashboard.
- Para `STUDENT`, la fuente de verdad es la matricula activa.
- Para `PROFESSOR`, la fuente de verdad es la asignacion activa a `course_cycle`.
- En la respuesta de profesor:
  - `id` corresponde a `courseCycle.id`.
  - `enrolledAt` corresponde a `assignedAt`.

Shape del dashboard:
```json
[
  {
    "id": "string",
    "enrolledAt": "ISO-8601",
    "courseCycle": {
      "id": "string",
      "course": {
        "id": "string",
        "code": "MAT-101",
        "name": "Algebra I",
        "courseType": {
          "code": "CIENCIAS",
          "name": "Ciencias"
        },
        "cycleLevel": {
          "name": "1 Ciclo"
        }
      },
      "academicCycle": {
        "id": "string",
        "code": "2026-1",
        "startDate": "ISO-8601",
        "endDate": "ISO-8601",
        "isCurrent": true
      },
      "professors": [
        {
          "id": "string",
          "firstName": "Ana",
          "lastName1": "Perez",
          "lastName2": "Lopez",
          "profilePhotoUrl": null
        }
      ]
    }
  }
]
```

#### Detalle de Curso para Alumno (2 tabs y bandera)
Flujo recomendado para frontend cuando el alumno abre un curso:

1. Llamar `GET /courses/cycle/:courseCycleId/current` (tab por defecto: Ciclo Vigente).
2. Leer `canViewPreviousCycles`.
3. Si `canViewPreviousCycles = true`, mostrar tab `Ciclos Anteriores` y luego cargar:
   - `GET /courses/cycle/:courseCycleId/previous-cycles`
   - `GET /courses/cycle/:courseCycleId/previous-cycles/:cycleCode/content` (al hacer click en `Ver ciclo`)

**Endpoint 1: Ciclo Vigente**
- **Endpoint:** `GET /courses/cycle/:courseCycleId/current`
- **Roles:** `STUDENT`
- **Data (Response):**
    ```json
    {
      "courseCycleId": "string",
      "cycleCode": "2026-1",
      "canViewPreviousCycles": true,
      "evaluations": [
        {
          "id": "string",
          "evaluationTypeCode": "PC | EX | ...",
          "shortName": "PC1",
          "fullName": "Práctica Calificada 1",
          "hasAccess": true,
          "label": "Completado | En curso | Próximamente | Bloqueado"
        }
      ]
    }
    ```

Reglas de `label` en ciclo vigente:
1. `Completado`: fecha actual > fin de evaluacion.
2. `En curso`: fecha actual entre inicio y fin.
3. `Proximamente`: fecha futura y con acceso activo.
4. `Bloqueado`: sin acceso activo a esa evaluacion.

Nota de negocio:
- `Completado`, `En curso` y `Proximamente` son etiquetas informativas de estado academico.
- La etiqueta no bloquea contenido por si sola; el bloqueo real depende de `hasActiveAccess`.
- Con la regla actual de matriculas, toda evaluacion concedida mantiene acceso hasta fin de ciclo.
**Endpoint 2: Lista de Ciclos Anteriores**
- **Endpoint:** `GET /courses/cycle/:courseCycleId/previous-cycles`
- **Roles:** `STUDENT`
- **Data (Response):**
    ```json
    {
      "cycles": [
        { "cycleCode": "2025-2" },
        { "cycleCode": "2025-1" }
      ]
    }
    ```

Regla de visibilidad del tab:
1. Visible si matrícula del curso es `FULL`.
2. Visible si matrícula es `PARTIAL` y existe acceso a alguna evaluación de ciclos anteriores.
3. Si no cumple, backend responde `403`.

Cuando el tab es visible, la lista devuelve todos los ciclos anteriores del curso (no filtra ciclo por ciclo).

**Endpoint 3: Contenido de un Ciclo Anterior**
- **Endpoint:** `GET /courses/cycle/:courseCycleId/previous-cycles/:cycleCode/content`
- **Roles:** `STUDENT`
- **Data (Response):**
    ```json
    {
      "cycleCode": "2025-2",
      "evaluations": [
        {
          "id": "string",
          "evaluationTypeCode": "PC | EX | ...",
          "shortName": "PC1",
          "fullName": "Práctica Calificada 1",
          "hasAccess": false,
          "label": "Archivado | Bloqueado"
        }
      ]
    }
    ```

Regla de `label` en ciclo anterior:
1. `Archivado`: el alumno tiene acceso a esa evaluación.
2. `Bloqueado`: no tiene acceso a esa evaluación.

**Nota de seguridad**
El endpoint legado GET /courses/cycle/:courseCycleId/content queda para roles de staff (PROFESSOR, ADMIN, SUPER_ADMIN), no para STUDENT.
- Si el courseCycleId no existe, responde 404.
- Si el curso/ciclo existe pero el PROFESSOR no está asignado, responde 403.
- `evaluations` usa el mismo shape visual de card que el flujo `current`:
  - `id`
  - `evaluationTypeCode`
  - `shortName`
  - `fullName`
  - `label`
- En staff no se retorna `hasAccess`; el acceso ya se resuelve a nivel de autorización del endpoint.


#### Operaciones Administrativas (Admin/SuperAdmin)

> Esta sección fue centralizada para evitar contratos duplicados o desactualizados.  
> Consultar siempre `backend/docs/API_ADMIN_PANEL_DOCUMENTATION.md` para endpoints admin de:
> - cursos y course-cycles
> - asignación de profesores
> - estructura y creación de evaluaciones
> - configuración administrativa asociada

---

## ÉPICA: EVALUACIONES ACADÉMICAS (`/evaluations`)

Gestión de los hitos evaluativos (PC, EX, etc.) a los que se vinculan las sesiones y materiales.

### 1. Crear Evaluación (Admin)
Se documenta exclusivamente en:
- `backend/docs/API_ADMIN_PANEL_DOCUMENTATION.md`

### 2. Listar Evaluaciones de un Curso
- **Endpoint:** `GET /evaluations/course-cycle/:courseCycleId`
- **Roles:** `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- **Data (Response):** Array de evaluaciones con su tipo y fechas.
- **Reglas de alcance:**
    * Si el `courseCycleId` no existe, responde `404`.
    * Si el curso/ciclo existe pero el `PROFESSOR` no está asignado, responde `403`.

---

## ÉPICA: REPOSITORIO DE MATERIALES (`/materials`)

### 1. Navegación de Carpetas (Explorador)
Permite navegar la jerarquia de una evaluacion. Requiere acceso a la evaluacion segun rol/matricula.
  - Excepcion Banco (`BANCO_ENUNCIADOS`): para alumno matriculado activo del course_cycle, sin restriccion FULL/PARTIAL.
- **Endpoints:**
    * `GET /materials/folders/evaluation/:evaluationId` (Carpetas raíz)
    * `GET /materials/folders/:folderId` (Contenido de una carpeta)
- **GET /materials/class-event/:classEventId**: Obtiene materiales vinculados a una sesión específica.
- **Roles:** `STUDENT`, `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- **Flujo frontend recomendado (tab Material adicional):
    * Paso 1: al abrir el tab, llamar GET /materials/folders/evaluation/:evaluationId.
    * Paso 2: tomar el id de la carpeta raiz Material adicional y llamar GET /materials/folders/:folderId.
    * Resultado esperado: cards Resumenes y Enunciados con su contador en subfolderMaterialCount.
    * Lazy loading: solo cuando el usuario haga click en una card, volver a llamar GET /materials/folders/:folderId de esa subcarpeta para listar archivos.
- **Data (Response de Contenido):**
    ```json
    {
      "folders": [ { "id": string, "name": string, "visibleFrom": string } ],
      "materials": [
        {
          "id": string,
          "displayName": string,
          "fileVersionId": string,
          "createdAt": string,
          "classEventId": string | null
        }
      ],
      "totalMaterials": number,
      "subfolderMaterialCount": {
        "subFolderId": number
      }
    }
    ```

### 2. Descarga y Link Autorizado de Archivos
- **Endpoint:** `GET /materials/:id/download`
- **Roles:** `STUDENT` (con acceso), `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- **Comportamiento:** retorna stream binario con headers `Content-Type` y `Content-Disposition`.
- **Notas de backend:**
    * Para recursos locales/proxy, este endpoint es la salida principal de descarga.
    * Para recursos Drive, el backend igual valida alcance por evaluacion antes de devolver datos.

- **Endpoint:** `GET /materials/:id/authorized-link?mode=view|download`
- **Roles:** `STUDENT` (con acceso), `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- **Query Params:**
    * `mode`: `view` | `download`
- **Response (`data`):**
    * `contentKind`: `DOCUMENT`
    * `accessMode`: `DIRECT_URL` | `BACKEND_PROXY`
    * `evaluationId`: string
    * `driveFileId`: string | null
    * `url`: string
    * `expiresAt`: string | null
    * `requestedMode`: `view` | `download`
    * `fileName`: string
    * `mimeType`: string
    * `storageProvider`: `LOCAL` | `GDRIVE` | `S3`
- **Validaciones criticas (si storage es GDRIVE):**
    * valida que el material pertenezca a la evaluacion autorizada para el usuario.
    * valida que el archivo este dentro de la subcarpeta de documentos del scope Drive de esa evaluacion.
    * si el archivo esta fuera del scope esperado, responde `403`.
### 3. Gestión Administrativa (Upload/Config)
- **POST /materials/folders:** Crear carpeta.
    * `body: { evaluationId: string, parentFolderId?: string, name: string, visibleFrom?: string, visibleUntil?: string }`
    * Regla: se permiten hasta 3 niveles maximos. Intentar crear un cuarto nivel responde `400`.
- **POST /materials/folders/template:** Crear estructura fija de 2 niveles en una sola petición.
    * `body: { evaluationId: string, rootName: string, subfolderNames: string[], visibleFrom?: string, visibleUntil?: string }`
    * Validación: `subfolderNames` (1..50), sin vacíos, sin duplicados case-insensitive.
- **POST /materials:** Subir archivo nuevo.
    * `Content-Type: multipart/form-data`
    * `body: { file: Buffer, materialFolderId: string, displayName: string, classEventId?: string }`
- **POST /materials/:id/versions:** Actualizar versión de archivo existente.
    * `body: { file: Buffer }`
- **PATCH /materials/:id/display-name:** Actualizar nombre visible del material (sin renombrar archivo fisico en Drive/S3/Local).
    * **Roles:** `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
    * **Path Params:**
      - `id`: string (materialId)
    * **Body:**
      - `displayName`: string (obligatorio, max 255)
    * **Validaciones:**
      - `displayName` vacio o solo espacios => `400`
      - si el material no existe => `404`
      - si el profesor no tiene permisos sobre la evaluacion del material => `403`
    * **Efecto:**
      - actualiza `material.display_name`
      - invalida cache de carpeta y cache de materiales por class-event (si aplica)
      - dispara notificacion de material actualizado si el material pertenece a un `class_event`
    * **Response (`data`):**
      - objeto `Material` actualizado (mismo contrato que endpoints de subida/versionado)
- **POST /materials/:id/restore-version/:versionId:** Restaurar una version previa creando una nueva version actual.
    * **Roles:** `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
    * **Path Params:**
      - `id`: string (materialId)
      - `versionId`: string (version historica a restaurar)
    * **Comportamiento:**
      - no sobreescribe el historial existente
      - crea una nueva version del material usando el `file_resource` de la version restaurada
      - actualiza la version actual del material al nuevo registro creado
    * **Notas:**
      - si restauras la version 2 y la actual es la 5, el resultado sera una nueva version 6
      - la respuesta mantiene el contrato actual del material
- **GET /materials/:id/versions-history:** Consultar historial de versiones del material.
    * **Roles:** `STUDENT`, `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
    * **Path Params:**
      - `id`: string (materialId)
    * **Response (`data`):**
      - `materialId`: string
      - `currentVersionId`: string | null
      - `currentVersionNumber`: number | null
      - `versions`: array
      - `versions[].versionId`: string
      - `versions[].versionNumber`: number
      - `versions[].isCurrent`: boolean
      - `versions[].createdAt`: string ISO-8601
      - `versions[].createdBy`: object | null
      - `versions[].createdBy.id`: string
      - `versions[].createdBy.email`: string | null
      - `versions[].createdBy.firstName`: string | null
      - `versions[].createdBy.lastName1`: string | null
      - `versions[].createdBy.lastName2`: string | null
      - `versions[].file`: object
      - `versions[].file.resourceId`: string
      - `versions[].file.originalName`: string
      - `versions[].file.mimeType`: string
      - `versions[].file.sizeBytes`: string
      - `versions[].file.storageProvider`: `LOCAL` | `GDRIVE` | `S3`
      - `versions[].file.driveFileId`: string | null
      - `versions[].file.storageUrl`: string | null
    * **Notas:**
      - El orden es descendente: versiÃ³n actual primero.
      - `driveFileId` solo viene cuando el storage provider es `GDRIVE`.
- **GET /materials/:id/last-modified:** Consultar fecha/hora de ultima modificacion de un material.
    * **Roles:** `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
    * **Path Params:**
      - `id`: string (materialId)
    * **Response (`data`):**
      - `materialId`: string
      - `lastModifiedAt`: string ISO-8601 (`updatedAt` del material; si es `null`, usa `createdAt`)
    * **Errores esperados:**
      - `403`: usuario sin permiso sobre la evaluacion/curso del material
      - `404`: material no existe o no tiene carpeta contenedora valida
    * **Notas de integracion frontend:**
      - Endpoint de solo lectura para mostrar "Ultima actualizacion" en cards, tablas o panel de detalle.
      - No requiere payload en body.
      - Recomendado llamar bajo demanda al abrir detalle de material, o en batch solo si UI realmente lo necesita.
- **POST /materials/request-deletion:** Flujo seguro de borrado.
    * `body: { entityType: 'material', entityId: string, reason: string }`

### 4. Gestion Administrativa Avanzada (Moderacion)
- **GET /admin/materials/requests/pending:** listar solicitudes pendientes de eliminacion con metadata del material para decision administrativa.
    * **Roles:** `ADMIN`, `SUPER_ADMIN`
    * **Response (`data`):** array con objetos:
      - `id`: string (requestId)
      - `entityType`: string
      - `entityId`: string
      - `reason`: string | null
      - `createdAt`: string ISO
      - `requestedBy`: object
      - `requestedBy.id`: string
      - `requestedBy.email`: string | null
      - `requestedBy.firstName`: string | null
      - `requestedBy.lastName1`: string | null
      - `requestedBy.lastName2`: string | null
      - `material`: object | null
      - `material.id`: string
      - `material.displayName`: string | null
      - `material.originalName`: string | null
      - `material.mimeType`: string | null
      - `material.storageProvider`: `LOCAL` | `GDRIVE` | `S3` | null
      - `material.previewUrl`: string | null (Drive `/preview` cuando aplica)
      - `material.viewUrl`: string | null (Drive `/view` cuando aplica)
      - `material.downloadUrl`: string | null (Drive directo o proxy `/materials/:id/download`)
      - `material.authorizedViewPath`: string | null (`/materials/:id/authorized-link?mode=view`)
    * **Notas de integracion frontend:**
      - usar `material.displayName` como etiqueta principal en tabla/listado.
      - usar `material.originalName` como apoyo tecnico para distinguir archivos similares.
      - en UI de revision, priorizar `authorizedViewPath` para abrir contenido validado por backend.
      - `previewUrl/viewUrl/downloadUrl` son utilidades para inspeccion/operacion administrativa.
- **POST /admin/materials/requests/:id/review:** Aprobar o rechazar solicitud.
    * **Roles:** `ADMIN`, `SUPER_ADMIN`
    * `body: { action: 'APPROVE' | 'REJECT', adminComment?: string }`
- **DELETE /admin/materials/:id/hard-delete:** Eliminacion fisica permanente (irreversible).
    * **Roles:** `SUPER_ADMIN`
---

## EPICA: FEEDBACK Y REPUTACION (`/feedback`)

### 1. Enviar Testimonio (Alumno)
- **Endpoint:** `POST /feedback`
- **Roles:** `STUDENT` (con matricula activa)
- **Content-Type:** `application/json`
- **Request Body:**
    * `courseCycleId`: string
    * `rating`: number (1-5)
    * `comment`: string (min 3, max 500)
- **Notas:**
    * Se permiten multiples opiniones del mismo alumno para el mismo curso/ciclo.
    * Todo testimonio nuevo se crea con `isActive = false` (no visible publicamente por defecto).

### 2. Listar Testimonios Publicos (Web)
- **Endpoint:** `GET /feedback/public`
- **Auth:** No requerida.
- **Cache:** 10 minutos.
- **Logica de seleccion:**
    * Solo devuelve testimonios con `isActive = true`.
    * Ordena por `createdAt DESC` (mas recientes primero).
    * Devuelve como maximo `N` registros, donde `N = FEEDBACK_MAX_PUBLIC_VISIBLE_TESTIMONIES` (default: `3`).
- **Data (Response):**
    ```json
    [
      {
        "id": "123",
        "rating": 5,
        "comment": "Excelente curso",
        "createdAt": "2026-03-29T20:15:22.000Z",
        "user": {
          "firstName": "Ana",
          "lastName1": "Perez",
          "profilePhotoUrl": null,
          "careerName": "Ingenieria de Sistemas"
        },
        "courseName": "Matematica I"
      }
    ]
    ```

### 3. Moderacion (Administrador)
- **GET /feedback/admin/course-cycle/:id:** listado completo para gestion del curso/ciclo (incluye activos e inactivos).
- **POST /feedback/admin/:testimonyId/feature:** activar/desactivar visibilidad de un testimonio.
    * `body: { isActive: boolean }`
    * Si `isActive = true` y ya existe el maximo permitido de activos, responde `400`.
    * **Efecto:** invalida automaticamente el cache publico.



---

## UPDATE FRONTEND CONTRACT - FASES 2, 3 Y 4 (2026-03-02)

Esta seccion resume los contratos actuales para frontend de forma estricta y sin ambiguedades.

### 1) Admin - Definir estructura por course_cycle

Se documenta exclusivamente en:
- `backend/docs/API_ADMIN_PANEL_DOCUMENTATION.md`

### 2) Alumno - Obtener estructura del tab Banco (cards + carpetas navegables)

- Endpoint: `GET /courses/cycle/:courseCycleId/bank-structure`
- Roles: `STUDENT`, `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- Reglas de acceso:
1. `STUDENT`: requiere matricula activa en ese `courseCycleId` (`403` si no cumple).
2. `PROFESSOR`: requiere estar asignado al `courseCycleId` (`403` si no cumple).
3. `ADMIN` y `SUPER_ADMIN`: acceso permitido por rol.
- Respuesta 200:
```json
{
  "courseCycleId": "4",
  "cycleCode": "2026-0",
  "bankEvaluationId": "88",
  "items": [
    {
      "evaluationTypeId": "2",
      "evaluationTypeCode": "EX",
      "evaluationTypeName": "Examen",
      "entries": [
        {
          "evaluationId": "190",
          "evaluationTypeCode": "EX",
          "evaluationTypeName": "Examen",
          "evaluationNumber": 1,
          "label": "EX1",
          "folderId": "702",
          "folderName": "EX1"
        }
      ]
    },
    {
      "evaluationTypeId": "1",
      "evaluationTypeCode": "PC",
      "evaluationTypeName": "Practica Calificada",
      "entries": [
        {
          "evaluationId": "120",
          "evaluationTypeCode": "PC",
          "evaluationTypeName": "Practica Calificada",
          "evaluationNumber": 1,
          "label": "PC1",
          "folderId": "703",
          "folderName": "PC1"
        },
        {
          "evaluationId": "121",
          "evaluationTypeCode": "PC",
          "evaluationTypeName": "Practica Calificada",
          "evaluationNumber": 2,
          "label": "PC2",
          "folderId": null,
          "folderName": null
        }
      ]
    }
  ]
}
```
- Nota frontend:
1. Mostrar cards segun `items`.
2. No hardcodear tipos.
3. El orden llega desde backend (por code).
4. Para navegar contenido de Banco, usar `entries[].folderId` y luego `GET /materials/folders/:folderId`.
5. Si `folderId` es `null`, la carpeta logica aun no fue creada (no intentar abrir `evaluation/:id` para Banco).
6. `evaluationId` puede venir en `null` para carpetas solo-banco sin evaluacion academica real.
7. Si se edita o elimina una carpeta del Banco desde admin/profesor, frontend debe usar los endpoints `PATCH /courses/cycle/:courseCycleId/bank-folders/:evaluationTypeCode` y `DELETE /courses/cycle/:courseCycleId/bank-folders/:evaluationTypeCode`.

### 3) Admin - Crear evaluacion con validacion estricta de estructura

Se documenta exclusivamente en:
- `backend/docs/API_ADMIN_PANEL_DOCUMENTATION.md`

### 4) Banco - Subir documento al banco del course_cycle

- Endpoint: `POST /courses/cycle/:courseCycleId/bank-documents`
- Roles: `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- Content-Type: `multipart/form-data`
- Body:
  - `evaluationTypeCode`: string. Ejemplos: `PC`, `EX`, `PD`, `LAB`.
  - `evaluationNumber`: string numerico. Ejemplos: `1`, `2`.
  - `displayName`: string visible en frontend.
  - `file`: binario del archivo.
- Reglas:
1. El archivo se guarda en la hoja correcta de Drive segun `course_cycle -> bank_documents -> tipo -> codigoNumero`.
2. En BD se persiste usando la evaluacion tecnica `BANCO_ENUNCIADOS` del `course_cycle`.
3. La carpeta logica en BD se crea o reutiliza con la estructura `<tipo plural> -> <codigoNumero>`.
4. Si ya existe un archivo identico en el banco de ese mismo curso, responde `409` y no guarda nada ni en BD ni en Drive.
5. La deteccion de duplicado se hace por `hash + size` dentro del banco del mismo `course_cycle`.
6. Tambien acepta carpetas solo-banco ya existentes (por ejemplo `PD1`) aunque no exista evaluacion academica real; en ese caso el response devuelve `evaluationId: null`.
- Respuesta 201:
```json
{
  "courseCycleId": "4",
  "bankEvaluationId": "88",
  "evaluationId": "120",
  "evaluationTypeId": "1",
  "evaluationTypeCode": "PC",
  "evaluationTypeName": "Practicas Calificadas",
  "evaluationNumber": 1,
  "folderId": "702",
  "folderName": "PC1",
  "materialId": "900",
  "fileResourceId": "901",
  "currentVersionId": "902",
  "displayName": "Banco PC1 resuelto",
  "originalName": "PC1-resuelto.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": "1741913",
  "storageProvider": "GDRIVE",
  "driveFileId": "1abcXYZ",
  "downloadPath": "/materials/900/download",
  "authorizedViewPath": "/materials/900/authorized-link?mode=view",
  "lastModifiedAt": "2026-03-16T05:10:00.000Z"
}
```
- Errores esperados:
1. `400` archivo faltante, mimetype invalido, PDF invalido, payload incompleto.
2. `403` usuario sin permiso sobre ese `course_cycle`.
3. `404` no existe la tarjeta objetivo (`evaluationTypeCode + evaluationNumber`) o falta la evaluacion tecnica del banco.
4. `409` archivo duplicado dentro del banco de ese curso.

### 5) Banco - Editar carpeta de un tipo en el banco del course_cycle

- Endpoint: `PATCH /courses/cycle/:courseCycleId/bank-folders/:evaluationTypeCode`
- Roles: `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- Body JSON:
  - `groupName`: string obligatorio
  - `items`: string[] opcional
- Reglas:
1. Si el tipo tiene evaluaciones academicas reales (`PC`, `EX`, etc. ya creadas), solo se permite renombrar el grupo; `items` no puede alterar la lista sincronizada.
2. Si el tipo es solo-banco, se puede renombrar el grupo y reemplazar la lista de subcarpetas.
3. Si se intenta remover una subcarpeta que ya tiene archivos, responde `409`.
- Respuesta 200:
```json
{
  "courseCycleId": "4",
  "bankEvaluationId": "88",
  "evaluationTypeId": "3",
  "evaluationTypeCode": "PD",
  "evaluationTypeName": "Practicas Dirigidas Actualizadas",
  "groupName": "Practicas Dirigidas Actualizadas",
  "items": ["PD2", "PD3"],
  "hasAcademicEvaluations": false
}
```

### 6) Banco - Eliminar carpeta solo-banco del course_cycle

- Endpoint: `DELETE /courses/cycle/:courseCycleId/bank-folders/:evaluationTypeCode`
- Roles: `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- Reglas:
1. Solo permite eliminar tipos solo-banco.
2. Si el tipo todavia esta sincronizado con evaluaciones academicas reales, responde `409`.
3. Si alguna subcarpeta del grupo ya tiene archivos, responde `409`.
- Respuesta: `204 No Content`

### 7) Impacto esperado en frontend

1. En admin, configurar estructura por ciclo antes de crear evaluaciones nuevas.
2. En alumno y profesor, usar `bank-structure` para render del tab Banco.
3. En Banco, no inferir ids ni usar `evaluationId` de evaluaciones academicas para leer carpetas.
4. En Banco, abrir contenido solo con `GET /materials/folders/:folderId` usando `entries[].folderId`.
5. Seguir usando `hasAccess` para habilitar o deshabilitar acciones por evaluacion academica (fuera de Banco).

### 8) Cache y consistencia

1. Cuando admin actualiza `evaluation-structure`, backend invalida:
   - cache de contenido por ciclo
   - cache de bank structure por ciclo
2. Cuando admin crea evaluacion (`POST /evaluations`), backend invalida cache de contenido por ciclo.
3. Con esto, frontend debe ver cambios sin esperar TTL largo.

### 9) SQL de desarrollo actualizado

Se actualizo `db/datos_prueba_cursos_y_matriculas.sql` para poblar `course_cycle_allowed_evaluation_type` en ciclos actual e historicos para los cursos de prueba.

Objetivo:
1. Permitir que `bank-structure` devuelva data real desde seed.
2. Permitir que `POST /evaluations` valide contra estructura activa desde seed.
3. Mantener entorno reproducible al recrear schema+data.

## UPDATE FRONTEND CONTRACT - INTRO VIDEO POR CURSO/CICLO (2026-03-06)

Se agrega soporte para video introductorio a nivel `course_cycle` (no por evaluacion).

### 1) Admin - Configurar video introductorio

Se documenta exclusivamente en:
- `backend/docs/API_ADMIN_PANEL_DOCUMENTATION.md`

### 2) Alumno/Profesor/Admin - Obtener link autorizado

- Endpoint: `GET /courses/cycle/:id/intro-video-link`
- Roles: `STUDENT`, `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`
- Control de acceso:
1. `STUDENT`: requiere matricula activa en ese `course_cycle`.
2. `PROFESSOR`: requiere estar asignado a ese `course_cycle`.
3. `ADMIN`/`SUPER_ADMIN`: acceso permitido.
- Comportamiento de enlace:
1. Siempre retorna URL de Drive en formato `preview` (embed).
2. No expone opcion `mode` para video.
- Response 200:
```json
{
  "contentKind": "VIDEO",
  "accessMode": "DIRECT_URL",
  "courseCycleId": "4",
  "driveFileId": "<FILE_ID>",
  "url": "https://drive.google.com/file/d/<FILE_ID>/preview",
  "expiresAt": null,
  "requestedMode": "embed",
  "fileName": null,
  "mimeType": null,
  "storageProvider": "GDRIVE"
}
```

## UPDATE FRONTEND CONTRACT - FECHAS Y HORAS DE CLASS EVENTS (2026-03-15)

### Regla general

1. La zona de negocio fija es `America/Lima`.
2. El backend persiste `class_event.start_datetime` y `class_event.end_datetime` en UTC.
3. Las respuestas del API retornan datetimes en UTC (`...Z`).
4. No se debe depender de la zona horaria del servidor, del EC2 ni de la configuracion regional de MySQL.

### Escritura de eventos

1. `POST /class-events` y `PATCH /class-events/:id` aceptan `startDatetime` y `endDatetime` en ISO-8601.
2. Si el frontend envia offset explicito o `Z`, backend respeta ese instante exacto.
3. Si el frontend envia un ISO sin zona horaria, backend lo interpreta como hora local de `America/Lima`.
4. Fecha-only (`YYYY-MM-DD`) no es valida para crear o actualizar sesiones porque falta la hora.

### Filtros de calendario

1. `GET /class-events/my-schedule` y `GET /class-events/global/sessions` aceptan `start/end` o `startDate/endDate` en ISO-8601.
2. Si el frontend envia solo fecha (`YYYY-MM-DD`), backend la interpreta como limite diario en `America/Lima`.
3. El limite final con fecha-only se trata como exclusivo del dia siguiente en `America/Lima`.
4. Con esto, pedir `start=2026-03-15&end=2026-03-21` significa todo el rango calendario de Lima desde el 15 hasta el cierre del 21.
