# Documentación API — Panel Administrativo

> Estado: Activa  
> Última actualización: 2026-03-28  
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
  "timestamp": "2026-03-28T18:00:00.000Z"
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

---

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
