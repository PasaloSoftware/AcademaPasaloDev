# Documentación API — Panel Administrativo

> Estado: Activa  
> Última actualización: 2026-04-07  
> Base URL global: `/api/v1`

---

## 1) Propósito

Documento exclusivo para endpoints del panel admin/backoffice, con contratos explícitos para frontend.

---

## 2) Convenciones

- Requiere `Authorization: Bearer <accessToken>`.
- Respuesta estándar:

```json
{
  "statusCode": 200,
  "message": "Mensaje de operación",
  "data": {},
  "timestamp": "2026-04-07T18:00:00.000Z"
}
```

## 3) Endpoints base de usuarios (tabla admin)

### 3.1 `GET /users` (ADMIN, SUPER_ADMIN)

- Objetivo: tabla de usuarios para panel admin.
- Orden: `created_at DESC, id DESC`.

#### Query params

- `page` (number, opcional, default `1`, min `1`)
- `search` (string, opcional) -> busca por nombre completo/email
- `roles` (string CSV, opcional) -> valores: `STUDENT,PROFESSOR,ADMIN,SUPER_ADMIN`
- `careerIds` (string CSV, opcional) -> IDs de carrera
- `status` (string, opcional) -> `ACTIVE` | `INACTIVE`

#### Response `data`

```json
{
  "items": [
    {
      "id": "1205",
      "fullName": "Ana Perez Lopez",
      "email": "ana.perez@correo.com",
      "roles": ["Alumno", "Asesor"],
      "careerId": 40,
      "careerName": "Psicología",
      "isActive": true
    }
  ],
  "currentPage": 1,
  "pageSize": 10,
  "totalItems": 125,
  "totalPages": 13
}
```

### 3.2 `GET /users/catalog/careers` (ADMIN, SUPER_ADMIN)

- Objetivo: poblar selector de carrera.

#### Query params

- Sin query params.

#### Response `data`

```json
[
  { "id": 1, "name": "Contabilidad" },
  { "id": 40, "name": "Psicología" }
]
```

### 3.3 `GET /users/catalog/courses` (ADMIN, SUPER_ADMIN)

- Objetivo: poblar buscador de cursos (catálogo maestro).

#### Query params

- Sin query params.

#### Response `data`

```json
[
  {
    "courseId": "11",
    "courseCode": "MAT101",
    "courseName": "Matemática Básica"
  }
]
```

### 3.4 `GET /users/filters/roles` (ADMIN, SUPER_ADMIN)

- Objetivo: opciones de filtro por roles en tabla admin.

#### Query params

- Sin query params.

#### Response `data`

```json
[
  { "code": "STUDENT", "label": "Alumno" },
  { "code": "PROFESSOR", "label": "Asesor" },
  { "code": "ADMIN", "label": "Administrador" },
  { "code": "SUPER_ADMIN", "label": "Superadministrador" }
]
```

### 3.5 `GET /users/filters/statuses` (ADMIN, SUPER_ADMIN)

- Objetivo: opciones de filtro por estado en tabla admin.

#### Query params

- Sin query params.

#### Response `data`

```json
[
  { "code": "ACTIVE", "label": "Activo" },
  { "code": "INACTIVE", "label": "Inactivo" }
]
```

### 3.6 `GET /users/:id/admin-detail` (ADMIN, SUPER_ADMIN)

- Objetivo: ficha de "Ver usuario" para panel admin.

#### Path params

- `id` (string) -> `user.id`

#### Response `data`

```json
{
  "personalInfo": {
    "id": "1205",
    "firstName": "Ana",
    "lastName1": "Perez",
    "lastName2": "Lopez",
    "email": "ana.perez@correo.com",
    "phone": "+51999111222",
    "careerId": 40,
    "careerName": "Psicología",
    "roles": ["Alumno", "Asesor"],
    "isActive": true,
    "profilePhotoUrl": "https://..."
  },
  "enrolledCourses": [
    {
      "relationId": "4501",
      "courseId": "11",
      "courseCycleId": "101",
      "courseCode": "MAT101",
      "courseName": "Matemática Básica",
      "academicCycleCode": "2026-1",
      "enrollmentTypeCode": "PARTIAL",
      "evaluationIds": ["7001", "7002"],
      "historicalCourseCycleIds": ["95", "88"]
    }
  ],
  "teachingCourses": [
    {
      "relationId": "9901",
      "courseId": "11",
      "courseCycleId": "101",
      "courseCode": "MAT101",
      "courseName": "Matemática Básica",
      "academicCycleCode": "2026-1"
    }
  ]
}
```

### 3.7 `PATCH /users/:id/status` (ADMIN, SUPER_ADMIN)

- Objetivo: activar/desactivar usuario sin tocar otros campos.

#### Path params

- `id` (string) -> `user.id`

#### Request body

```json
{
  "isActive": false
}
```

#### Reglas

- Solo permite cambiar el estado (`isActive`).
- No permite autodesactivación (un admin no puede desactivar su propia cuenta).
- Invalida cache de tabla admin y ejecuta invalidación de identidad/sesiones según política del servicio.

#### Response `data`

Mismo contrato de `UserResponseDto` (usuario actualizado).

### 3.8 `PATCH /users/:id/admin-edit` (ADMIN, SUPER_ADMIN)

- Objetivo: edici?n integral de roles + datos personales + altas/actualizaciones incrementales de matr?culas y cursos a cargo.

#### Path params

- `id` (string) -> `user.id`

#### Request body (resumen)

```json
{
  "personalInfo": {
    "firstName": "Ana",
    "lastName1": "Perez",
    "lastName2": "Lopez",
    "email": "ana.perez@correo.com",
    "phone": "+51999111222",
    "careerId": 40
  },
  "roleCodesFinal": ["STUDENT", "PROFESSOR"],
  "studentStateFinal": {
    "enrollments": [
      {
        "courseCycleId": "101",
        "enrollmentTypeCode": "PARTIAL",
        "evaluationIds": ["7001", "7002"],
        "historicalCourseCycleIds": ["95", "88"]
      }
    ]
  },
  "professorStateFinal": {
    "courseCycleIds": ["101"]
  }
}
```

#### Reglas

- `roleCodesFinal` define el estado final de roles.
- Si `STUDENT` no est? en `roleCodesFinal`, `studentStateFinal.enrollments` debe ser vac?o.
- Si `PROFESSOR` no est? en `roleCodesFinal`, `professorStateFinal.courseCycleIds` debe ser vac?o.
- Se eval?a la edici?n en una sola transacci?n.
- Matr?culas (modo incremental):
  - conserva cursos existentes si no cambian;
  - actualiza en sitio si cambia tipo/evaluaciones/hist?ricos;
  - crea matr?cula si llega un curso nuevo;
  - no cancela matr?culas solo por ausencia en payload mientras `STUDENT` siga presente.
- Profesor (modo incremental para altas):
  - agrega cursos nuevos de `professorStateFinal.courseCycleIds`;
  - no revoca cursos por ausencia en payload mientras `PROFESSOR` siga presente;
  - si se quita rol `PROFESSOR`, revoca asignaciones activas.
- Sincroniza `class_event_professor` cuando se agregan/quitan cursos a cargo (seg?n operaciones efectivas).
- Sincroniza accesos Drive en background (colas) para grants/revokes de evaluaciones y course-cycles.
- Si cambia email de un `ADMIN`/`SUPER_ADMIN`, encola sincronizaci?n del staff viewers group en background.
- Registra auditor?a de la operaci?n con acci?n `USER_ADMIN_EDIT` (una fila por edici?n exitosa).

#### Response `data`

```json
{
  "userId": "1205",
  "rolesFinal": ["STUDENT"],
  "enrollmentsChanged": {
    "cancelledEnrollmentIds": ["4501"],
    "createdEnrollmentIds": ["4600"],
    "baseCourseCycleIdsFinal": ["101"]
  },
  "professorCourseCyclesChanged": {
    "added": [],
    "removed": ["101"]
  },
  "eventProfessorAssignmentsChanged": {
    "assignedCount": 0,
    "revokedCount": 3
  }
}
```

### 3.9 Flujo recomendado de edici?n administrativa (orden)

1. `GET /users/:id/admin-detail` para hidratar estado actual.
2. (Opcional, si se agregar?n nuevas relaciones) usar cat?logos/opciones:
   - `GET /users/catalog/careers`
   - `GET /users/catalog/courses`
   - `GET /enrollments/options/course/:courseId/cycles`
   - `GET /enrollments/options/course-cycle/:courseCycleId` (si PARTIAL)
3. `PATCH /users/:id/admin-edit` para datos personales/roles y altas o actualizaciones incrementales.
4. Bajas expl?citas:
   - Alumno: `PATCH /enrollments/:id/cancel` (cancelar una matr?cula puntual).
   - Profesor: `DELETE /courses/cycle/:id/professors/:professorUserId` (remover curso a cargo puntual).
5. Front actualiza UI con el resumen `...Changed` de la respuesta.

---

## 4) Flujo oficial recomendado (orden de llamados) para registro admin

> Este orden es obligatorio para evitar inconsistencias de IDs y reglas.

### Paso 1 — Catálogos de formulario

1. `GET /users/catalog/careers`
2. `GET /users/filters/roles`
3. `GET /users/catalog/courses`

### Paso 2 — Al seleccionar curso en matrícula

4. `GET /enrollments/options/course/:courseId/cycles`
   - Devuelve ciclo actual del curso (con `courseCycleId`) y solo históricos de ese curso.

### Paso 3 — Si matrícula será PARTIAL

5. `GET /enrollments/options/course-cycle/:courseCycleId`
   - Devuelve evaluaciones seleccionables del ciclo base (ej. `PC1`, `EX1`) + `id` técnico.

### Paso 4 — Guardado final (orquestado)

6. `POST /users/admin-onboarding`
   - Persiste usuario + roles + matrícula + cursos a cargo en una sola operación.

---

## 5) Registro administrativo integral

### 5.1 `POST /users/admin-onboarding` (ADMIN, SUPER_ADMIN)

#### Request ejemplo

```json
{
  "email": "nuevo.usuario@academiapasalo.com",
  "firstName": "Juan",
  "lastName1": "Perez",
  "lastName2": "Lopez",
  "phone": "999888777",
  "careerId": 12,
  "roleCodes": ["STUDENT", "PROFESSOR"],
  "studentEnrollment": {
    "courseCycleId": "100",
    "enrollmentTypeCode": "PARTIAL",
    "evaluationIds": ["200", "201"],
    "historicalCourseCycleIds": ["90", "80"]
  },
  "professorAssignments": {
    "courseCycleIds": ["100", "101"]
  }
}
```

#### Reglas

- `roleCodes` obligatorio y multiselección.
- `studentEnrollment` requiere rol `STUDENT`.
- `professorAssignments` requiere rol `PROFESSOR`.
- `FULL`: otorga todas las evaluaciones del ciclo base + históricos válidos.
- `PARTIAL`: exige `evaluationIds` válidos.
- Se sincroniza acceso Drive por evaluación y por course-cycle (incluye históricos).

#### Response ejemplo

```json
{
  "userId": "501",
  "enrollmentId": "9001",
  "assignedRoleCodes": ["STUDENT", "PROFESSOR"],
  "professorCourseCycleIds": ["100", "101"]
}
```

---

## 6) Endpoints de opciones para matrícula (UI)

### 6.1 `GET /enrollments/options/course/:courseId/cycles` (ADMIN, SUPER_ADMIN)

#### Response ejemplo

```json
{
  "courseId": "10",
  "courseCode": "MAT101",
  "courseName": "Matemática Básica",
  "currentCycle": {
    "courseCycleId": "100",
    "academicCycleCode": "2026-1"
  },
  "historicalCycles": [
    {
      "courseCycleId": "90",
      "academicCycleCode": "2025-2"
    },
    {
      "courseCycleId": "80",
      "academicCycleCode": "2025-1"
    }
  ]
}
```

### 6.2 `GET /enrollments/options/course-cycle/:courseCycleId` (ADMIN, SUPER_ADMIN)

#### Response ejemplo

```json
{
  "baseCourseCycleId": "100",
  "courseId": "10",
  "courseCode": "MAT101",
  "courseName": "Matemática Básica",
  "academicCycleCode": "2026-1",
  "evaluations": [
    {
      "id": "200",
      "evaluationTypeCode": "PC",
      "shortName": "PC1",
      "fullName": "Practica Calificada 1"
    }
  ],
  "historicalCycles": [
    {
      "courseCycleId": "90",
      "academicCycleCode": "2025-2"
    }
  ]
}
```

Regla frontend: mostrar etiquetas (`shortName`) pero guardar siempre IDs (`evaluationIds`, `courseCycleId`, `historicalCourseCycleIds`).

### 6.3 `GET /enrollments/course-cycle/:courseCycleId/students` (ADMIN, SUPER_ADMIN)

- Objetivo: listar alumnos matriculados activos de un `course_cycle` para la vista administrativa del detalle de curso.
- No retorna matrículas canceladas (`cancelled_at IS NULL`).
- Permite búsqueda por nombre completo o correo.

#### Query params

- `page` (number, opcional, default `1`, min `1`)
- `pageSize` (number, opcional, default `10`, min `1`)
- `search` (string, opcional, max `255`)

#### Response ejemplo

```json
{
  "items": [
    {
      "enrollmentId": "9001",
      "userId": "1205",
      "fullName": "Maria Fernanda Ramos Paredes",
      "email": "mframos@pucp.edu.pe"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 24,
  "totalPages": 3
}
```

#### Uso frontend

- Alimenta la tabla `Alumnos Matriculados` dentro de `Gestión de Alumnos` en el detalle administrativo del curso.
- La acción `Retirar alumno` debe usar el endpoint existente `DELETE /enrollments/:id`.

---

## 7) Gestion academica admin (cursos, ciclo, evaluaciones)

> Fuente oficial para frontend admin sobre cursos/evaluaciones.
> Los endpoints administrativos ya no deben consultarse en `API_CONTENT_AND_FEEDBACK.md`.

### 7.1 Creacion integral de curso (flujo unico)

#### `POST /courses/setup` (ADMIN, SUPER_ADMIN)

- Objetivo: alta integral en una sola operacion:
  - crear curso base
  - crear `course_cycle`
  - asignar profesores iniciales (opcional)
  - definir estructura de evaluacion
  - crear evaluaciones academicas
  - provisionar Drive de curso/evaluaciones

Notas criticas:

- `BANCO_ENUNCIADOS` es global del `course_cycle` y **no** se provisiona como scope individual de evaluacion Drive.
- `professorUserIds` puede venir vacio.
- `materialsTemplate.roots` se replica en cada evaluacion creada; frontend no necesita enviar `applyToEachEvaluation`.
- `bankFoldersToCreate` permite crear estructura explicita del Banco de Enunciados usando nombres finales enviados por frontend.
- En `bankFoldersToCreate`, cada item debe enviar **exactamente uno** de:
  - `evaluationTypeId`, o
  - `newEvaluationTypeName`
- `groupName` no puede repetirse dentro del mismo payload.

Payload ejemplo resumido:

```json
{
  "course": {
    "code": "QUI101",
    "name": "Quimica",
    "courseTypeId": "1",
    "cycleLevelId": "2"
  },
  "academicCycleId": "10",
  "allowedEvaluationTypeIds": ["1", "2"],
  "evaluationsToCreate": [
    {
      "evaluationTypeId": "1",
      "number": 1,
      "startDate": "2026-05-01T05:00:00.000Z",
      "endDate": "2026-05-01T23:59:59.000Z"
    }
  ],
  "newEvaluationsToCreate": [
    {
      "name": "Evaluacion Continua",
      "number": 1,
      "startDate": "2026-05-10T05:00:00.000Z",
      "endDate": "2026-05-10T23:59:59.000Z"
    }
  ],
  "bankFoldersToCreate": [
    {
      "evaluationTypeId": "1",
      "groupName": "Practicas Calificadas",
      "items": ["PC1"]
    },
    {
      "newEvaluationTypeName": "Practica Dirigida",
      "groupName": "Practicas Dirigidas",
      "items": ["PD1", "PD2"]
    }
  ],
  "materialsTemplate": {
    "roots": [
      { "name": "Enunciados" },
      { "name": "Resumenes" }
    ]
  }
}
```

### 7.2 Endpoints administrativos vigentes de cursos

- `PATCH /courses/:id` (ADMIN, SUPER_ADMIN) - actualizar materia.
- `PATCH /courses/:id/status` (ADMIN, SUPER_ADMIN) - activar/inactivar materia.
- `DELETE /courses/:id` (ADMIN, SUPER_ADMIN) - eliminar materia.
- `GET /courses` (ADMIN, SUPER_ADMIN) - listar materias.
- `GET /courses/:id` (ADMIN, SUPER_ADMIN) - detalle de materia.
- `GET /courses/types` (ADMIN, SUPER_ADMIN) - catalogo de tipos.
- `GET /courses/levels` (ADMIN, SUPER_ADMIN) - catalogo de niveles.
- `GET /courses/course-cycles` (ADMIN, SUPER_ADMIN) - listado paginado de curso-ciclos para panel admin.

#### `PATCH /courses/:id/status`

Body:

```json
{
  "isActive": false
}
```

Notas:

- El estado administrativo vive en `course.is_active`.
- El detalle y la lista admin deben mostrar este valor, no si el ciclo academico actual esta vigente.

#### `DELETE /courses/:id`

Notas:

- Si la materia tiene `course_cycle` u otras dependencias, el backend responde `409 Conflict`.
- Solo se elimina fisicamente cuando no existen referencias relacionadas.

Nota de despliegue:

- Antes de usar `PATCH /courses/:id/status` en ambientes existentes, ejecutar `backend/db/2026-04-15_add_course_is_active.sql`.

### 7.3 Endpoints administrativos vigentes por course_cycle

- `PUT /courses/cycle/:id/evaluation-structure` (ADMIN, SUPER_ADMIN) - definir tipos permitidos.
- `PATCH /courses/cycle/:id/intro-video` (ADMIN, SUPER_ADMIN) - configurar/limpiar video introductorio.
- `POST /courses/cycle/:id/professors` (ADMIN, SUPER_ADMIN) - asignar profesor al curso-ciclo.
- `DELETE /courses/cycle/:id/professors/:professorUserId` (ADMIN, SUPER_ADMIN) - remover profesor del curso-ciclo.

### 7.4 Endpoints administrativos vigentes de evaluaciones

- `POST /evaluations` (ADMIN, SUPER_ADMIN) - crear evaluacion academica.
- `GET /evaluations/course-cycle/:id` (PROFESSOR, ADMIN, SUPER_ADMIN) - listar evaluaciones del curso-ciclo.
- `PUT /evaluations/course-cycle/:id/reorder` (ADMIN, SUPER_ADMIN) - persistir el orden visual de evaluaciones academicas del curso-ciclo.

#### `PUT /evaluations/course-cycle/:id/reorder`

- Objetivo: guardar el orden manual del drag-and-drop de evaluaciones en el panel admin.
- Regla: el body debe enviar exactamente todas las evaluaciones academicas visibles del `course_cycle`.
- Regla: `BANCO_ENUNCIADOS` no se incluye en el payload y mantiene `display_order = 0`.

Body:

```json
{
  "evaluationIds": ["45", "41", "43", "44", "46", "47"]
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Evaluaciones reordenadas exitosamente",
  "data": [
    {
      "id": "45",
      "courseCycleId": "12",
      "evaluationTypeId": "2",
      "number": 1,
      "displayOrder": 1,
      "startDate": "2026-04-01T05:00:00.000Z",
      "endDate": "2026-04-01T23:59:59.000Z"
    }
  ]
}
```

Errores semanticos:

- `400 Bad Request` si falta alguna evaluacion visible o si se envian ids ajenos al curso-ciclo.
- `404 Not Found` si el `course_cycle` no existe.

Nota de despliegue:

- Antes de usar este endpoint en un ambiente existente, ejecutar `backend/db/2026-04-15_add_evaluation_display_order.sql`.

### 7.5 Endpoints de soporte usados por pantallas admin (mixtos)

- `GET /courses/cycle/:id/bank-structure` (STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN) - estructura del Banco por course-cycle.
- `POST /courses/cycle/:id/bank-documents` (PROFESSOR, ADMIN, SUPER_ADMIN) - carga de documento al Banco (usa `BANCO_ENUNCIADOS` tecnico, no crea evaluacion academica nueva).
- `GET /courses/cycle/:id/intro-video-link` (STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN) - enlace autorizado para video introductorio.

Notas del Banco:

- `bank-structure` puede devolver entradas provenientes de:
  - evaluaciones academicas reales, o
  - carpetas solo-banco existentes bajo `BANCO_ENUNCIADOS`
- Cuando una entry del banco no tiene evaluacion academica real, `evaluationId` puede venir en `null`.
- `bank-documents` acepta uploads tanto para entries con evaluacion real como para carpetas solo-banco ya existentes en el banco del `course_cycle`.
- A la fecha, el backend expone listado y carga para Banco de Enunciados, pero **no** expone endpoints dedicados para renombrar o eliminar carpetas del banco.

### 7.6 Endpoints retirados (no usar en frontend)

Los siguientes endpoints de creacion separada fueron retirados del backend y no deben existir en flujos nuevos:

- `POST /courses`
- `POST /courses/assign-cycle`

Frontend admin debe usar exclusivamente `POST /courses/setup` para creacion.
