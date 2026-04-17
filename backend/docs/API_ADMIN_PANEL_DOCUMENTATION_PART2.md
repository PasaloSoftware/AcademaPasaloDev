# Documentación API — Panel Administrativo (Parte 2)

> Estado: Activa  
> Última actualización: 2026-04-17  
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
