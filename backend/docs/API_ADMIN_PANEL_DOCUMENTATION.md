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
      "academicCycleCode": "2026-1"
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
- Objetivo: edición integral (estado final) de roles + matrículas + cursos a cargo.

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
- Si `STUDENT` no está en `roleCodesFinal`, `studentStateFinal.enrollments` debe ser vacío.
- Si `PROFESSOR` no está en `roleCodesFinal`, `professorStateFinal.courseCycleIds` debe ser vacío.
- Se eval?a estado final en una sola transacci?n.
- La reconciliaci?n de matr?culas es por delta (no cancela/recrea todo si no hay cambios reales).
- Sincroniza `class_event_professor` cuando se agregan/quitan cursos a cargo.
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
3. `PATCH /users/:id/admin-edit` enviando el estado final completo.
4. Front actualiza UI con el resumen `...Changed` de la respuesta.

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

### 7.2 Endpoints administrativos vigentes de cursos

- `PATCH /courses/:id` (ADMIN, SUPER_ADMIN) - actualizar materia.
- `GET /courses` (ADMIN, SUPER_ADMIN) - listar materias.
- `GET /courses/:id` (ADMIN, SUPER_ADMIN) - detalle de materia.
- `GET /courses/types` (ADMIN, SUPER_ADMIN) - catalogo de tipos.
- `GET /courses/levels` (ADMIN, SUPER_ADMIN) - catalogo de niveles.
- `GET /courses/course-cycles` (ADMIN, SUPER_ADMIN) - listado paginado de curso-ciclos para panel admin.

### 7.3 Endpoints administrativos vigentes por course_cycle

- `PUT /courses/cycle/:id/evaluation-structure` (ADMIN, SUPER_ADMIN) - definir tipos permitidos.
- `PATCH /courses/cycle/:id/intro-video` (ADMIN, SUPER_ADMIN) - configurar/limpiar video introductorio.
- `POST /courses/cycle/:id/professors` (ADMIN, SUPER_ADMIN) - asignar profesor al curso-ciclo.
- `DELETE /courses/cycle/:id/professors/:professorUserId` (ADMIN, SUPER_ADMIN) - remover profesor del curso-ciclo.

### 7.4 Endpoints administrativos vigentes de evaluaciones

- `POST /evaluations` (ADMIN, SUPER_ADMIN) - crear evaluacion academica.
- `GET /evaluations/course-cycle/:id` (PROFESSOR, ADMIN, SUPER_ADMIN) - listar evaluaciones del curso-ciclo.

### 7.5 Endpoints de soporte usados por pantallas admin (mixtos)

- `GET /courses/cycle/:id/bank-structure` (STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN) - estructura del Banco por course-cycle.
- `POST /courses/cycle/:id/bank-documents` (PROFESSOR, ADMIN, SUPER_ADMIN) - carga de documento al Banco (usa `BANCO_ENUNCIADOS` tecnico, no crea evaluacion academica nueva).
- `GET /courses/cycle/:id/intro-video-link` (STUDENT, PROFESSOR, ADMIN, SUPER_ADMIN) - enlace autorizado para video introductorio.

### 7.6 Endpoints retirados (no usar en frontend)

Los siguientes endpoints de creacion separada fueron retirados del backend y no deben existir en flujos nuevos:

- `POST /courses`
- `POST /courses/assign-cycle`

Frontend admin debe usar exclusivamente `POST /courses/setup` para creacion.

