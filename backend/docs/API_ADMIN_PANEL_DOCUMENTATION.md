# Documentación API — Panel Administrativo

> Estado: Activa  
> Última actualización: 2026-03-28  
> Base URL global: `/api/v1`

---

## 1) Propósito de este documento

Este documento concentra **exclusivamente** endpoints orientados al **panel administrativo** (backoffice), para evitar sobrecargar la documentación general.

Aquí se documentarán todos los endpoints nuevos del panel con nivel de detalle suficiente para que frontend integre sin asumir comportamientos implícitos.

---

## 2) Convenciones transversales del panel

### 2.1 Autenticación y autorización

- Todos los endpoints de este documento requieren:
  - `Authorization: Bearer <accessToken>`
  - Sesión activa y válida en backend.
- Cada endpoint define explícitamente sus roles permitidos.

### 2.2 Formato de respuesta estándar

El backend responde bajo el interceptor global:

```json
{
  "statusCode": 200,
  "message": "Mensaje de operación",
  "data": {},
  "timestamp": "2026-03-28T18:00:00.000Z"
}
```

### 2.3 Errores frecuentes en panel admin

- `401`: token ausente/inválido.
- `403`: usuario autenticado sin permisos para ese endpoint.
- `404`: recurso no encontrado.
- `409`: conflicto de negocio (ej. correo duplicado).

---

## 3) Endpoints de Usuarios para tabla administrativa

Base del módulo: `/users`

### 3.1 Listado paginado para tabla de usuarios

- **Endpoint:** `GET /users`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Query Params:**
  - `page` (opcional, entero >= 1, default `1`)
- **Filtros opcionales y acumulativos:**
  - `search` (string): busca por nombre completo y/o correo (recomendado con debounce 400-500ms)
  - `roles` (CSV): ejemplo `roles=STUDENT,ADMIN`
  - `careerIds` (CSV): ejemplo `careerIds=1,4,9`
  - `status`: `ACTIVE` | `INACTIVE`
- **Paginación fija backend:** `10` filas por página.
- **Orden del listado:** `created_at DESC, id DESC` (más recientes primero).
- **Cache selectivo (backend):**
  - Se cachean variantes base sin filtros por página (`page=N`, sin `roles`, `careerIds`, `status`).
  - TTL del cache base por página: `60` segundos.
  - Cualquier mutación de usuarios (crear, editar, ban/unban, eliminar, asignar/remover roles) invalida esta key base.
  - Si se consulta con filtros, siempre se consulta BD (sin cache de respuesta).

#### Semántica de filtros

- Entre tipos de filtro se aplica **AND**.
- Dentro de `roles` y `careerIds` (multiselección) se aplica **OR**.
- `search` se combina con los demás filtros vía **AND**.
- Ejemplo:
  - `GET /users?page=1&roles=STUDENT,PROFESSOR&careerIds=2,7&status=ACTIVE`
  - Resultado: usuarios activos, con al menos uno de esos roles y con al menos una de esas carreras.

#### Respuesta (`data`)

```json
{
  "items": [
    {
      "id": "145",
      "fullName": "Carlos Soto Perez",
      "email": "carlos@academiapasalo.com",
      "roles": ["Alumno", "Asesor"],
      "careerId": 12,
      "careerName": "Ingeniería Informática",
      "isActive": true
    }
  ],
  "currentPage": 1,
  "pageSize": 10,
  "totalItems": 57,
  "totalPages": 6
}
```

#### Contrato funcional para frontend

- `id` se usa para acciones de fila (ver detalle, editar, etc.).
- `fullName` ya viene compuesto por backend usando:
  - `firstName + lastName1 + lastName2` (omitiendo vacíos).
- `roles` ya viene traducido y ordenado para UI.
- `careerId` se incluye para trazabilidad y acciones del frontend que requieran identificador.
- `careerName` puede ser `null`.
- `isActive` representa estado operativo de la cuenta.

#### Mapeo de roles aplicado por backend

- `STUDENT` -> `Alumno`
- `PROFESSOR` -> `Asesor`
- `ADMIN` -> `Administrador`
- `SUPER_ADMIN` -> `Superadministrador`

Si un usuario tiene múltiples roles, el orden de salida es fijo:

1. Alumno
2. Asesor
3. Administrador
4. Superadministrador

---

### 3.2 Catálogo de carreras para formularios admin

- **Endpoint:** `GET /users/catalog/careers`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Uso:** poblar select/autocomplete de carrera en formularios administrativos.

#### Respuesta (`data`)

```json
[
  { "id": 21, "name": "Ciencia Política y Gobierno" },
  { "id": 1, "name": "Contabilidad" },
  { "id": 26, "name": "Derecho" }
]
```

#### Reglas de integración frontend

- No hardcodear IDs de carrera.
- Usar siempre este endpoint para poblar opciones.
- Tratar `name` como etiqueta visible y `id` como identificador persistible en flujos futuros.

---

### 3.3 Opciones de filtro de roles

- **Endpoint:** `GET /users/filters/roles`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Response (`data`):**

```json
[
  { "code": "STUDENT", "label": "Alumno" },
  { "code": "PROFESSOR", "label": "Asesor" },
  { "code": "ADMIN", "label": "Administrador" },
  { "code": "SUPER_ADMIN", "label": "Superadministrador" }
]
```

### 3.4 Opciones de filtro de estado

- **Endpoint:** `GET /users/filters/statuses`
- **Roles:** `ADMIN`, `SUPER_ADMIN`
- **Response (`data`):**

```json
[
  { "code": "ACTIVE", "label": "Activo" },
  { "code": "INACTIVE", "label": "Inactivo" }
]
```

---

## 4) Notas de evolución del documento

- Cada endpoint nuevo del panel debe agregarse aquí con:
  1. Roles permitidos
  2. Request completo
  3. Response completa
  4. Reglas de negocio relevantes
  5. Errores esperados y manejo sugerido en frontend
