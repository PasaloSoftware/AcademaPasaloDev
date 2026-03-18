# API Class Event Recording Upload (Drive Browser-Direct)

Documentacion funcional y tecnica del flujo de carga de grabaciones de clase a Google Drive.

- Modulo: `Events / Recording Upload`
- Base URL: `/api/v1/class-events`
- Auth requerida: `Authorization: Bearer <accessToken>`
- Storage final: `Google Drive`
- Flujo objetivo: `frontend -> Google Drive (binario)`, `frontend -> backend (control y publicacion)`

Este documento define el contrato para frontend y operaciones.

## 1. Objetivo

Permitir que profesores carguen grabaciones pesadas (incluyendo videos largos) sin pasar el binario por backend, manteniendo:

1. Control de permisos.
2. Concurrencia por evento (`classEventId`).
3. Integridad Drive/BD.
4. Publicacion consistente (`READY`) solo tras validacion final.

## 2. Roles y autorizacion

Roles autorizados en endpoints de upload:

1. `PROFESSOR`
2. `ADMIN`
3. `SUPER_ADMIN`

Reglas:

1. El backend valida permiso funcional sobre la evaluacion del `class_event`.
2. En `heartbeat` y `finalize`, para usuarios no admin, solo puede operar el actor que inicio el intento (`uploadToken` + `userId` del contexto).
3. `ADMIN`/`SUPER_ADMIN` pueden operar de forma administrativa.

## 3. Estados y concurrencia

Estados de negocio:

1. `NOT_AVAILABLE`
2. `PROCESSING`
3. `READY`

Concurrencia:

1. Solo un intento activo por `classEventId`.
2. El bloqueo real vive en Redis (lock + contexto temporal).
3. Reemplazo desde `READY`:
   - el estado publicado puede permanecer en `READY`
   - la grabacion anterior sigue visible hasta `finalize` exitoso.

TTL operativo actual:

1. `uploadContextTtlSeconds = 14400` (4 horas).
2. Este TTL aplica a lock/contexto en Redis.

## 4. Endpoints

## 4.1 Iniciar intento de upload

- Endpoint: `POST /class-events/:id/recording-upload/start`
- Roles: `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`

Request:

```json
{
  "fileName": "clase-01.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 3251768
}
```

Validaciones principales:

1. Evento existe y no esta cancelado.
2. Usuario autorizado funcionalmente.
3. Scope Drive provisionado con `driveVideosFolderId`.
4. MIME permitido (`video/mp4`, `video/x-matroska`).
5. Tamaño maximo 10 GB.
6. No existe lock activo concurrente para ese `classEventId`.

Respuesta (payload `data`):

```json
{
  "classEventId": "13",
  "recordingStatus": "READY",
  "hasActiveRecordingUpload": true,
  "activeUploadMode": "replacement",
  "uploadExpiresAt": "2026-03-18T01:20:00.000Z",
  "resumableSessionUrl": null,
  "uploadToken": "f86f66c0-04e1-4a1e-8c4e-515f8f0f6a5a",
  "fileName": "clase-01.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 3251768,
  "driveVideosFolderId": "1PaXal7cqPd5Bxw-cCVcskpXM1olxtZWB"
}
```

Notas:

1. `driveVideosFolderId` se usa en frontend para crear la sesion resumable en Drive con token OAuth de usuario.
2. `resumableSessionUrl` puede venir `null` en flujo browser-direct actual.

Errores esperados:

1. `400` payload invalido / MIME no permitido / tamano excedido.
2. `403` sin permiso funcional o sin scope usable.
3. `404` `class_event` o evaluacion inexistente.
4. `409` ya existe upload activo para ese evento.

## 4.2 Consultar estado del intento

- Endpoint: `GET /class-events/:id/recording-upload/status`
- Roles: `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`

Respuesta activa (`data`):

```json
{
  "classEventId": "13",
  "recordingStatus": "PROCESSING",
  "hasActiveRecordingUpload": true,
  "activeUploadMode": "initial",
  "uploadExpiresAt": "2026-03-18T01:20:00.000Z",
  "resumableSessionUrl": null
}
```

Respuesta idle (`data`):

```json
{
  "classEventId": "13",
  "recordingStatus": "READY",
  "hasActiveRecordingUpload": false,
  "activeUploadMode": null,
  "uploadExpiresAt": null,
  "resumableSessionUrl": null
}
```

## 4.3 Refrescar TTL (heartbeat)

- Endpoint: `POST /class-events/:id/recording-upload/heartbeat`
- Roles: `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`

Request:

```json
{
  "uploadToken": "f86f66c0-04e1-4a1e-8c4e-515f8f0f6a5a"
}
```

Respuesta: mismo shape de estado activo (`hasActiveRecordingUpload = true`).

Reglas:

1. Debe coincidir con el intento activo.
2. Si el token no coincide: `409`.
3. Si lock/contexto ya expiro: `409`.

Para que sirve realmente:

1. Evitar que un upload largo pierda lock por expiracion.
2. Extender la ventana viva del intento activo mientras el browser sigue subiendo.
3. Reducir falsos abandonos en videos grandes.

## 4.4 Finalizar y publicar

- Endpoint: `POST /class-events/:id/recording-upload/finalize`
- Roles: `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`

Request:

```json
{
  "uploadToken": "f86f66c0-04e1-4a1e-8c4e-515f8f0f6a5a",
  "fileId": "1Wzq8WTrQx2TB2gEumgcjvLsn4uaupJfQ"
}
```

Validaciones finales:

1. Token corresponde al intento activo.
2. Lock Redis vigente.
3. Archivo existe en Drive.
4. Archivo pertenece a `driveVideosFolderId` esperado.
5. Nombre/MIME/tamano consistentes con inicio.

Si todo es correcto:

1. Actualiza `recordingFileId`, `recordingUrl`.
2. Publica `recordingStatus = READY`.
3. Limpia lock/contexto en Redis.
4. Registra auditoria (`CLASS_RECORDING_PUBLISHED`).
5. Encola notificacion `CLASS_RECORDING_AVAILABLE`.

Respuesta (`data`):

```json
{
  "classEventId": "13",
  "recordingStatus": "READY",
  "hasActiveRecordingUpload": false,
  "activeUploadMode": null,
  "uploadExpiresAt": null,
  "resumableSessionUrl": null
}
```

Errores esperados:

1. `400` evento cancelado o payload invalido.
2. `403` actor no autorizado / archivo fuera de carpeta autorizada.
3. `404` evento/evaluacion/archivo no encontrado.
4. `409` token incorrecto, lock vencido, inconsistencia de intento.

## 4.5 Cancelar intento activo

- Endpoint: `POST /class-events/:id/recording-upload/cancel`
- Roles: `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`

Comportamiento:

1. Si no hay intento activo, responde estado `idle` (idempotente).
2. Si hay intento activo:
   - limpia contexto y lock de Redis
   - en `initial` con estado publicado `PROCESSING`, revierte a `NOT_AVAILABLE`
   - en `replacement`, conserva estado publicado (tipicamente `READY`)
3. Para usuario no admin, solo puede cancelar el actor que inicio el intento.

Respuesta (`data`):

```json
{
  "classEventId": "13",
  "recordingStatus": "NOT_AVAILABLE",
  "hasActiveRecordingUpload": false,
  "activeUploadMode": null,
  "uploadExpiresAt": null,
  "resumableSessionUrl": null
}
```

## 5. Flujo frontend recomendado (produccion)

Secuencia:

1. Usuario elige archivo.
2. Front llama `start`.
3. Front obtiene token OAuth de Google del usuario (`drive.file`).
4. Front crea sesion resumable en Drive apuntando a `driveVideosFolderId`.
5. Front sube bytes directo a Drive (`PUT` resumable).
6. Front manda `heartbeat` periodico (ej: cada 20-30s) mientras sube.
7. Front obtiene `fileId` final de Drive.
8. Front llama `finalize`.
9. Front refresca detalle del evento y muestra estado final.

## 6. UX y comportamiento esperado

Mensajes recomendados:

1. `Subiendo archivo a Drive...`
2. `Publicando grabacion...`
3. `Grabacion publicada. Drive puede tardar unos minutos en habilitar reproduccion.`

Importante:

1. `READY` significa grabacion publicada en sistema.
2. `READY` no garantiza reproduccion instantanea en Drive.
3. Videos largos pueden quedar en procesamiento de Drive varios minutos (o mas) tras upload.

## 7. Navegacion durante carga

Regla tecnica real:

1. El upload continua si el uploader vive en un estado global de la SPA (fuera de una sola pagina).
2. Si el uploader vive solo en un modal/pagina local y el componente se desmonta al navegar, la carga se interrumpe.
3. Cerrar pestaña o recargar corta la transferencia activa del browser.

Estado actual del frontend (implementacion rapida de prueba):

1. El upload vive en el modal de la pagina de video.
2. Se recomienda no cerrar modal, no recargar y no cerrar pestaña durante la carga.
3. Si se navega y el componente se destruye, puede cortarse el flujo.
4. Esta implementacion no garantiza continuidad al navegar entre vistas si el uploader local se desmonta.

Implementacion recomendada para produccion:

1. Crear `UploadManager` global (context/store) persistente en layout autenticado.
2. Mantener job de upload vivo al navegar internamente.
3. Mostrar barra global de progreso y estado.
4. Reanudar heartbeat mientras exista intento activo.

## 8. Tiempos y expectativas para videos largos

Para videos de 2 horas:

1. El tiempo de subida depende del ancho de banda del profesor.
2. Luego Drive puede tardar adicionalmente en procesar preview/stream.
3. Ese procesamiento de Drive no implica fallo del backend si `finalize` ya fue exitoso.

## 9. Abandono, refresh/cierre de pestaña y reintento

Caso: usuario inicia upload y refresca/cierra pestaña segundos despues.

1. El upload del browser se interrumpe.
2. El lock/contexto de intento activo puede quedar vivo en Redis.
3. Mientras ese lock siga vivo, un nuevo `start` responde `409` (concurrencia activa).

Tiempo de espera si no se cancela:

1. Hasta que expire TTL (maximo 4 horas desde el ultimo heartbeat/refresh de TTL).

Como destrabar antes:

1. Llamar `POST /class-events/:id/recording-upload/cancel`.
2. Como fallback operativo, limpieza manual de keys Redis solo en soporte.

Nota:

1. Si el usuario abandona, frontend debe consultar `status` y ofrecer `cancel` antes de un nuevo `start`.

## 10. Checklist de integracion frontend

1. Consumir `start/status/heartbeat/finalize`.
2. Crear sesion resumable en browser con token OAuth usuario.
3. Subir directo a Drive (sin proxy binario por backend).
4. Hacer heartbeat periodico con `uploadToken`.
5. Llamar `finalize` con `fileId`.
6. Manejar `409` de concurrencia/token expirado con mensaje y opcion de reintento.
7. Informar claramente que no debe cerrar pestaña durante carga activa (si uploader no es global).
8. Informar que Drive puede demorar en habilitar reproduccion tras publicar.
9. Implementar accion explicita de `Cancelar carga` usando `POST /class-events/:id/recording-upload/cancel`.
