# API Audit Export Documentation

Documentacion especifica del flujo de exportacion de auditoria.

- Modulo: `Audit`
- Base URL: `/api/v1/audit`
- Auth requerida: `Authorization: Bearer <accessToken>`
- Roles autorizados: `ADMIN`, `SUPER_ADMIN`

Este documento complementa `docs/API_DOCUMENTATION.md` y define el contrato exacto que frontend debe integrar para exportacion de auditoria.

## Objetivo funcional

El flujo de exportacion de auditoria permite descargar el historial unificado de:

- eventos de seguridad (`SECURITY`)
- logs de auditoria de negocio (`AUDIT`)

El backend decide automaticamente si la exportacion se resuelve:

- en modo `sync`, devolviendo un `.xlsx` directo
- en modo `async`, devolviendo `202 Accepted` y generando un `.zip` temporal en background

## Reglas funcionales clave

- El endpoint de entrada es siempre `GET /api/v1/audit/export`.
- El backend decide `sync` vs `async` segun el total de filas.
- Umbral actual:
  - `< 100000` filas: `sync`
  - `>= 100000` filas: `async`
- En async, cada archivo contiene maximo `100000` filas en una sola hoja.
- El resultado async se entrega en un unico `.zip`.
- Solo puede existir una exportacion de auditoria global activa a la vez.
- Si ya existe otra exportacion activa o en cola, el backend responde `409 Conflict`.
- El artefacto async expira por TTL de `1 hora` o despues de descarga completa.
- Solo el admin que creo el job puede consultar su estado y descargarlo.
- La data se persiste internamente en UTC, pero la fecha visible del Excel se presenta en horario Peru (`America/Lima`).

## Filtros soportados

Todos son opcionales.

| Query param | Tipo | Descripcion |
| --- | --- | --- |
| `startDate` | `string (ISO-8601)` | Fecha/hora inicial inclusive |
| `endDate` | `string (ISO-8601)` | Fecha/hora final inclusive |
| `userId` | `string` | Filtra eventos de un usuario especifico |
| `source` | `'AUDIT' \| 'SECURITY'` | Limita a una fuente |
| `actionCode` | `string` | Filtra por codigo de accion |

## Endpoint 1. Entrada unica de exportacion

`GET /export`

### Roles

- `ADMIN`
- `SUPER_ADMIN`

### Request

- Body: no aplica
- Query: filtros opcionales

### Comportamiento

Este endpoint siempre es el punto de entrada del boton de descarga en frontend.

Puede responder de 3 formas relevantes:

1. `200 OK` con `.xlsx` si el export es `sync`
2. `202 Accepted` con `jobId` si el export es `async`
3. `409 Conflict` si ya existe otra exportacion de auditoria en curso

### Response 200 OK - modo sync

Headers:

- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="reporte-auditoria_YYYY-MM-DD_HH-mm-ss.xlsx"`

Body:

- stream binario del archivo Excel

Notas:

- No devuelve JSON.
- Frontend debe tratar esta respuesta como descarga directa.

### Response 202 Accepted - modo async

```json
{
  "statusCode": 202,
  "message": "Exportacion masiva de auditoria encolada exitosamente",
  "data": {
    "jobId": "2d8f0d1e-3dc6-4b90-ae88-2a3a6d7b6a14",
    "status": "queued",
    "mode": "async",
    "totalRows": 235421,
    "thresholdRows": 100000,
    "rowsPerFile": 100000,
    "estimatedFileCount": 3,
    "artifactTtlSeconds": 3600
  },
  "timestamp": "2026-03-14T23:10:05.000Z"
}
```

### Response 409 Conflict

```json
{
  "statusCode": 409,
  "message": "Ya existe una exportacion de auditoria en proceso. Intenta nuevamente en unos minutos.",
  "error": "Conflict"
}
```

### Response 400 Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "source debe ser uno de: SECURITY, AUDIT"
  ],
  "error": "Bad Request"
}
```

## Endpoint 2. Consultar estado del job async

`GET /export-jobs/:id`

### Roles

- `ADMIN`
- `SUPER_ADMIN`

### Response 200 OK

```json
{
  "statusCode": 200,
  "message": "Estado del job de exportacion recuperado exitosamente",
  "data": {
    "jobId": "2d8f0d1e-3dc6-4b90-ae88-2a3a6d7b6a14",
    "status": "processing",
    "progress": 47,
    "totalRows": 235421,
    "estimatedFileCount": 3,
    "readyForDownload": false,
    "artifactName": null,
    "artifactExpiresAt": null,
    "errorMessage": null
  }
}
```

Tipos:

- `status`: `'queued' | 'processing' | 'ready' | 'failed' | 'expired'`
- `readyForDownload`: `boolean`

### Response 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "No tienes permisos para consultar este reporte de auditoria",
  "error": "Forbidden"
}
```

### Response 404 Not Found

```json
{
  "statusCode": 404,
  "message": "El job de exportacion no existe",
  "error": "Not Found"
}
```

## Endpoint 3. Descargar artefacto async

`GET /export-jobs/:id/download`

### Roles

- `ADMIN`
- `SUPER_ADMIN`

### Response 200 OK

Headers:

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="reporte-auditoria-masivo_YYYY-MM-DD_HH-mm-ss.zip"`

Body:

- stream binario del archivo `.zip`

### Response 409 Conflict

```json
{
  "statusCode": 409,
  "message": "El reporte de auditoria todavia no esta listo para descarga",
  "error": "Conflict"
}
```

### Response 410 Gone

```json
{
  "statusCode": 410,
  "message": "El reporte de auditoria ya expiro y debe generarse nuevamente",
  "error": "Gone"
}
```

### Response 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "No tienes permisos para consultar este reporte de auditoria",
  "error": "Forbidden"
}
```

### Response 404 Not Found

```json
{
  "statusCode": 404,
  "message": "El job de exportacion no existe",
  "error": "Not Found"
}
```

## Flujo principal de frontend

### Caso A. Exportacion sync

1. Frontend llama `GET /api/v1/audit/export`.
2. Si recibe `200`, descarga el `.xlsx`.

### Caso B. Exportacion async

1. Frontend llama `GET /api/v1/audit/export`.
2. Si recibe `202`, puede conservar `data.jobId` solo para feedback local opcional dentro de la misma vista.
3. Frontend muestra un mensaje indicando que el reporte se esta generando y que se avisara cuando este listo.
4. Backend procesa el job en background.
5. Cuando el job queda `ready`, backend crea una notificacion persistida `AUDIT_EXPORT_READY`.
6. El usuario entra por la notificacion.
7. Frontend toma `target.auditExportJobId`.
8. Frontend llama `GET /api/v1/audit/export-jobs/:id/download`.
9. Si recibe `200`, descarga el `.zip`.
10. Si recibe `410`, informa expiracion y solicita una nueva generacion.

## Notificacion persistida esperada

Cuando el job async pasa a `ready`, el backend crea una notificacion en el modulo `Notifications`.

Frontend debe esperar un registro con este shape funcional:

```json
{
  "type": "AUDIT_EXPORT_READY",
  "entityType": "audit_export",
  "entityId": "2d8f0d1e-3dc6-4b90-ae88-2a3a6d7b6a14",
  "target": {
    "materialId": null,
    "classEventId": null,
    "evaluationId": null,
    "courseCycleId": null,
    "folderId": null,
    "auditExportJobId": "2d8f0d1e-3dc6-4b90-ae88-2a3a6d7b6a14"
  }
}
```

Reglas:

- usar `target.auditExportJobId` como identificador principal para abrir la descarga
- no depender solo de `entityId`, aunque en este caso coincidan
- la notificacion no transporta el archivo binario

## Polling opcional

El polling no es el flujo principal del modo async.

Solo puede usarse como complemento local si frontend quiere mostrar progreso en la misma vista donde se solicito el reporte.

Si frontend decide usarlo:

- debe limitarlo a la vista actual
- no debe considerarlo el mecanismo principal de recuperacion
- no debe auto-descargar el `.zip` cuando vea `ready`
- debe seguir privilegiando la notificacion persistida para la accion final de descarga

## Politica de expiracion del artefacto async

- TTL de disponibilidad: `1 hora`
- si el usuario descarga correctamente el `.zip`, el artefacto se invalida y elimina
- si el usuario nunca lo descarga, el artefacto se elimina automaticamente al vencer el TTL
- si el usuario intenta descargarlo despues del TTL, backend responde `410 Gone`

## Recomendacion de comportamiento frontend

- El boton de descarga puede seguir usando una sola accion inicial: `GET /audit/export`.
- El frontend debe distinguir por status code:
  - `200`: descargar `.xlsx`
  - `202`: mostrar mensaje de procesamiento y esperar notificacion
  - `409`: mostrar mensaje de que ya existe otra exportacion en proceso
- El `jobId` retornado en `202` no es el mecanismo principal de recuperacion del reporte; la recuperacion principal ocurre desde la notificacion `AUDIT_EXPORT_READY`.
- Al recibir una notificacion `AUDIT_EXPORT_READY`, debe abrir el flujo de descarga usando `target.auditExportJobId`.
- Si usa polling opcional:
  - si `status = failed`, informar error y permitir reintento
  - si `status = expired`, informar expiracion y permitir nueva generacion
  - si `status = ready`, actualizar la UI local, pero no auto-descargar el archivo

## Compatibilidad con frontend actual

Para el caso simple `sync`, la URL de entrada se mantiene:

- `GET /api/v1/audit/export`

Lo nuevo para el caso masivo es:

- `202 Accepted`
- notificacion `AUDIT_EXPORT_READY`
- descarga posterior desde `GET /export-jobs/:id/download`
- polling opcional solo si frontend quiere mostrar progreso local

## Resumen ejecutivo

- El endpoint de entrada sigue siendo el mismo.
- `sync` devuelve `.xlsx`.
- `async` devuelve `202`, luego backend notifica cuando el reporte esta listo.
- En async, el flujo principal de frontend se apoya en la notificacion persistida `AUDIT_EXPORT_READY`.
- El polling queda solo como complemento opcional de feedback local.
- Solo `ADMIN` y `SUPER_ADMIN`.
- Solo un export de auditoria global a la vez.
- El `.zip` temporal vive maximo `1 hora` si no se descarga.
