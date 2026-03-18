# Implementacion por Fases: Carga de Grabaciones de `class_event` a Google Drive

## 1. Objetivo

Definir un plan de implementacion por fases para construir el flujo de carga de grabaciones de clases hacia Google Drive, con criterios estrictos de:

1. calidad de codigo
2. integridad de datos
3. escalabilidad
4. observabilidad
5. seguridad
6. testeo obligatorio
7. validacion continua por parte del desarrollador responsable

Este documento no reemplaza la estrategia. Se apoya en:

1. [`ESTRATEGIA_CARGA_GRABACIONES_CLASS_EVENT_A_DRIVE.md`](D:/trabajos_profesionales/academia_pasalo/repositorio-desarrollo/AcademaPasaloDev/backend/ESTRATEGIA_CARGA_GRABACIONES_CLASS_EVENT_A_DRIVE.md)

## 1.1 Estado de avance real (2026-03-17)

Estado validado en codigo y pruebas:

1. Fase 0 completada.
2. Fase 1 completada.
3. Fase 2 completada parcialmente.
4. Fase 3 completada.
5. Fase 4 completada.
6. Fase 5 completada.
7. Fase 6 completada.
8. Fase 7 completada en pruebas backend/e2e del flujo actual.

Bloqueo tecnico detectado:

1. El mecanismo de Fase 2 donde backend crea resumable session (service account) y frontend hace `PUT` directo a esa URL fallo por CORS en navegador.
2. Por tanto, Fase 2 queda funcional en backend pero no valida como arquitectura final browser-direct.
3. Se requiere fase de refactor de inicio de upload para cerrar la implementacion final.

## 2. Principios de Implementacion

## 2.1 Reglas obligatorias

1. No asumir comportamiento no confirmado por el codigo actual o por documentacion oficial del proveedor.
2. Si surge una duda de negocio o de infraestructura, se debe preguntar antes de implementar.
3. Cada fase debe cerrar con revision tecnica, pruebas y breve informe de resultados.
4. Ninguna fase debe dejar el sistema en estado parcialmente roto o inconsistente.
5. La integridad entre Drive y BD tiene prioridad sobre la velocidad de entrega.
6. Ningun cambio debe degradar el control de acceso existente para grabaciones.
7. Todo endpoint, servicio o helper nuevo debe mantener sintaxis profesional, nombres claros y cohesivos con el repo.
8. Todo desarrollo debe orientarse a minimizar deuda tecnica desde el inicio.

## 2.2 Regla de coherencia critica

La base de datos solo se actualiza como grabacion publicada cuando:

1. el archivo existe realmente en Drive
2. el archivo esta en la carpeta `drive_videos_folder_id` correcta
3. el `class_event` fue validado
4. la transicion final a `READY` es consistente

## 2.3 Regla de concurrencia

Solo puede existir una carga activa por `class_event`.

El bloqueo concurrente real se define asi:

1. por intento activo en Redis asociado al `classEventId`
2. `PROCESSING` solo bloquea directamente cuando aun no existe una grabacion publicada
3. durante reemplazo desde una grabacion ya publicada, el estado publicado puede seguir en `READY` y el bloqueo sigue estando en Redis

## 2.4 Regla de calidad

Este flujo se considera modulo critico. Por tanto:

1. no se aceptan atajos que degraden trazabilidad
2. no se aceptan integraciones "temporales" sin control de errores
3. no se acepta mezclar logica de negocio, acceso a Drive y estado transitorio en un solo bloque monolitico
4. no se acepta introducir complejidad innecesaria sin justificacion real

## 3. Alcance de Implementacion

El desarrollo debe cubrir:

1. inicio de upload para un `class_event`
2. creacion de sesion resumable de Drive
3. persistencia temporal de sesion y lock en Redis
4. control de concurrencia por evento
5. posibilidad de reanudacion si la sesion sigue vigente
6. finalizacion consistente con verificacion real en Drive
7. actualizacion final de `class_event`
8. notificacion `CLASS_RECORDING_AVAILABLE`
9. logs operativos suficientes
10. pruebas unitarias y e2e razonables del flujo

No debe cubrir:

1. migrar videos historicos ya cargados por otros medios
2. rediseñar el modelo general de eventos de clase
3. crear una nueva tabla de uploads sin justificacion posterior aprobada
4. agregar polling a Drive para detectar disponibilidad de reproduccion del video, porque esa decision fue descartada por diseno
5. mantener `PATCH recordingUrl` como camino funcional principal equivalente al upload directo

Nota de estado:

1. El backend actual ya cubre la mayor parte del flujo critico.
2. El trabajo pendiente principal no es rehacer dominio ni finalize.
3. El pendiente principal es corregir la estrategia tecnica de inicio/subida browser-direct para evitar el bloqueo CORS observado.

## 4. Diseño Tecnico Base

## 4.1 Estado de negocio

Se trabajara con:

1. `NOT_AVAILABLE`
2. `PROCESSING`
3. `READY`

Politica:

1. al iniciar upload inicial sin grabacion publicada: `PROCESSING`
2. si la publicacion finaliza bien: `READY`
3. si el intento inicial no culmina correctamente: `NOT_AVAILABLE`

Regla adicional:

1. cuando existe una grabacion ya publicada y se realiza un reemplazo, el estado publicado puede permanecer en `READY`
2. el estado transitorio del reemplazo activo vive en Redis
3. si el reemplazo falla, el estado publicado se mantiene en `READY` con la grabacion anterior

## 4.2 Estado temporal

El estado temporal del upload no se guarda en una tabla nueva.

Se manejará en Redis con TTL.

Redis guardara, como minimo:

1. `classEventId`
2. `evaluationId`
3. `userId`
4. `driveVideosFolderId`
5. `resumableSessionUrl`
6. `fileName`
7. `mimeType`
8. `sizeBytes` si se decide validarlo
9. `startedAt`
10. `expiresAt` o TTL operativo
11. `uploadToken` o `lockToken`

## 4.3 Separacion de responsabilidades

El diseño debe quedar dividido asi:

1. controlador de `class_event` o controlador dedicado de uploads
2. servicio de orquestacion de upload de grabaciones
3. helper/servicio para integracion resumable con Drive
4. componente para lock temporal en Redis
5. servicio de finalizacion/publicacion
6. reutilizacion del servicio actual de notificaciones

No se debe mezclar toda la implementacion en `ClassEventsService` si eso lo vuelve desproporcionadamente grande o acoplado.

## 5. Fase 0: Preparacion y Confirmacion

## 5.1 Objetivo

Confirmar por codigo y por configuracion real que el desarrollo puede apoyarse de forma segura en:

1. `drive_videos_folder_id`
2. Redis disponible para control temporal
3. cliente Google Drive ya integrado en backend
4. flujo actual de `class_event` y `recording_status`

## 5.2 Tareas

1. verificar contratos actuales de `class_event`
2. verificar donde conviene ubicar los endpoints nuevos
3. verificar acceso a Redis y convenciones de cache/TTL existentes
4. verificar que el backend ya puede emitir requests autenticadas a Drive para crear sesion resumable
5. verificar limites y metadata requeridas por negocio para archivo de video
6. verificar exactamente que regla de autorizacion actual mezcla profesor asignado y ownership del creador, para no heredarla por accidente en el flujo nuevo

## 5.3 Salida esperada

1. checklist tecnico validado
2. dudas abiertas documentadas
3. ninguna implementacion aun si quedan dudas relevantes sin responder

## 5.4 Regla de bloqueo

Si hay una duda no resuelta sobre:

1. permisos
2. folder destino
3. TTL
4. reemplazo de grabacion existente
5. contrato frontend-backend
6. criterio exacto de autorizacion entre profesor habilitado y ownership del creador

se debe detener la implementacion y preguntar.

## 6. Fase 1: Contrato API y Transiciones de Estado

## 6.1 Objetivo

Definir e implementar el contrato minimo del backend para iniciar y cerrar el flujo de upload sin tocar aun frontend real.

## 6.2 Componentes esperados

Como minimo se necesitan endpoints equivalentes a:

1. iniciar upload
2. consultar estado de upload actual del evento
3. finalizar/publicar upload
4. cancelar o liberar intento abandonado solo si la politica final lo requiere

Los nombres exactos deben decidirse con criterio de consistencia REST del proyecto.

## 6.3 Reglas de la fase

1. iniciar upload debe validar permisos del usuario sobre el `class_event`
2. esa validacion debe basarse en el permiso funcional del profesor habilitado sobre el curso/ciclo asociado al evento, no en ownership implicito del creador heredado del `PATCH` legacy
3. iniciar upload debe validar existencia del `drive_videos_folder_id`
4. iniciar upload debe rechazar si ya existe un intento activo en Redis para ese `classEventId`
5. iniciar upload debe permitir reemplazo si el evento esta en `READY` sin necesidad de degradar el estado publicado a `PROCESSING`
6. el cambio de estado o lock inicial debe ser atomico

## 6.4 Validaciones obligatorias

1. `classEventId` valido
2. `class_event` existente
3. usuario autorizado como profesor habilitado del curso/ciclo asociado al evento
4. evaluacion existente y vinculada
5. carpeta de videos existente en scope
6. tipo MIME permitido
7. limite maximo de 10 GB por archivo

## 6.5 Pruebas minimas de fase

1. rechaza evento inexistente
2. rechaza usuario sin permiso
3. rechaza inicio sin `drive_videos_folder_id`
4. rechaza segundo inicio concurrente con intento activo en Redis
5. permite iniciar reemplazo cuando el evento estaba en `READY`
6. marca `PROCESSING` correctamente solo para upload inicial
7. mantiene `READY` publicado cuando inicia reemplazo
8. permite upload a profesor habilitado aunque no sea creador del `class_event`, si esa es la regla funcional aprobada

## 6.6 Cierre de fase

Entregar breve informe al desarrollador validador con:

1. endpoints definidos
2. validaciones aplicadas
3. transiciones confirmadas
4. resultado de pruebas
5. dudas remanentes si existieran

## 7. Fase 2: Integracion con Sesion Resumable de Google Drive

## 7.1 Objetivo

Crear la capacidad del backend para abrir una sesion resumable de Drive dirigida exactamente al folder `/videos` de la evaluacion.

## 7.2 Reglas de la fase

1. el backend resuelve el folder destino; nunca el frontend
2. la sesion debe apuntar al folder `drive_videos_folder_id`
3. el backend debe devolver al frontend solo lo necesario para subir
4. no se debe publicar aun la grabacion en BD en esta fase

## 7.3 Requisitos tecnicos

1. helper o servicio encapsulado para crear sesion resumable
2. manejo robusto de errores HTTP de Drive
3. logs estructurados al iniciar sesion
4. compatibilidad con archivos de gran tamano

## 7.4 Pruebas minimas

1. crea sesion resumable con metadata correcta
2. apunta a la carpeta correcta
3. maneja error de credenciales
4. maneja error de folder invalido
5. registra logs utiles

## 7.5 Cierre de fase

Informar:

1. formato exacto del payload de inicio
2. respuesta exacta devuelta al frontend
3. errores controlados
4. resultados de pruebas

Estado real de esta fase:

1. implementada y probada del lado backend.
2. no valida como solucion final para browser-direct con el mecanismo actual de sesion generada por service account y consumida por navegador.
3. se mantiene util como base tecnica, pero requiere refactor en fase nueva de cierre arquitectonico.

## 8. Fase 3: Redis, Lock Temporal y Recuperacion

## 8.1 Objetivo

Agregar control temporal del upload activo sin introducir persistencia innecesaria en BD.

## 8.2 Reglas de la fase

1. Redis es la fuente temporal del intento vivo
2. `PROCESSING` en BD sin lock temporal vigente no debe bloquear indefinidamente
3. el TTL debe quedar documentado y centralizado
4. el sistema debe poder distinguir entre intento activo y lock expirado
5. durante reemplazo, Redis es la unica verdad del upload activo mientras la grabacion publicada previa sigue visible

## 8.3 Decisiones tecnicas de la fase

1. definir estructura de clave Redis
2. definir TTL inicial
3. definir politica de refresh de TTL
4. definir como se consulta estado temporal desde backend
5. exigir que el `heartbeat` valide `uploadToken` o `lockToken` del intento activo antes de refrescar TTL

## 8.4 Casos a cubrir

1. usuario inicia y sube normalmente
2. usuario inicia y abandona
3. usuario vuelve con sesion aun utilizable
4. usuario vuelve con sesion ya expirada
5. intento concurrente mientras hay lock vivo

## 8.5 Pruebas minimas

1. crea lock temporal al iniciar
2. expira lock tras TTL
3. no permite doble lock activo
4. permite recuperacion cuando lock ya no existe
5. no deja bloqueado el `class_event` indefinidamente
6. rechaza heartbeat con token distinto al del intento activo

## 8.6 Cierre de fase

Informar:

1. estrategia final de TTL
2. forma de recuperacion
3. limites conocidos
4. resultados de pruebas

## 9. Fase 4: Finalizacion y Publicacion Consistente

## 9.1 Objetivo

Construir el cierre seguro del flujo: validar archivo en Drive, persistir BD, notificar y limpiar estado temporal.

## 9.2 Regla principal

No actualizar `recording_file_id`, `recording_url` ni `READY` antes de verificar Drive.

## 9.3 Validaciones obligatorias de finalizacion

1. el `class_event` sigue siendo valido
2. existe lock temporal o contexto valido del intento
3. el archivo existe en Drive
4. el archivo esta en `drive_videos_folder_id`
5. el `fileId` final es consistente con el intento activo

## 9.4 Orden obligatorio de operaciones

1. verificar archivo en Drive
2. construir datos finales de grabacion
3. actualizar `class_event`
4. cambiar a `READY`
5. limpiar lock/sesion temporal en Redis
6. auditar exito
7. disparar notificacion

`finalize` debe asociarse al intento activo correcto.

Se recomienda exigir:

1. `uploadToken` o `lockToken` del intento activo
2. validacion de actor/propietario del intento
3. rechazo de finalizaciones tardias o de intentos viejos

## 9.5 Manejo de error

Si la validacion final falla:

1. no se debe dejar `READY`
2. no se debe dejar `recording_file_id` o `recording_url` inconsistentes
3. si no existia grabacion publicada previa, el evento debe volver a `NOT_AVAILABLE`
4. si existia grabacion publicada previa, el evento debe permanecer en `READY` con la grabacion anterior
5. si el archivo nuevo ya existia en Drive, se debe intentar borrado automatico
6. si el borrado automatico falla, debe quedar log detallado para limpieza posterior

## 9.6 Pruebas minimas

1. publica correctamente un archivo valido
2. rechaza archivo fuera de carpeta
3. rechaza archivo inexistente
4. no deja BD inconsistente si falla Drive
5. limpia Redis despues de finalizar
6. dispara notificacion solo al finalizar bien
7. intenta borrar archivo huérfano si la publicacion final falla

## 9.7 Cierre de fase

Informar:

1. secuencia final aplicada
2. transaccion o garantias de consistencia usadas
3. logs generados
4. pruebas ejecutadas y resultado

## 10. Fase 5: Reemplazo de Grabacion Existente

## 10.1 Objetivo

Permitir actualizar una grabacion ya publicada sin romper consistencia ni dejar multiples cargas simultaneas.

## 10.2 Reglas

1. `READY` permite iniciar un nuevo upload de reemplazo
2. al iniciar reemplazo, el estado publicado puede permanecer en `READY`
3. la grabacion antigua debe seguir considerandose publicada mientras la nueva no se publique correctamente
4. si el reemplazo falla, se conserva `READY` con la grabacion anterior

## 10.3 Punto que no debe asumirse

Politica ya definida:

1. la grabacion anterior se conserva visible y vigente mientras la nueva no haya llegado correctamente a la fase final
2. la BD no se actualiza durante el reemplazo parcial
3. solo cuando la nueva grabacion queda validada correctamente en Drive se reemplaza la referencia final en BD
4. el intento activo de reemplazo se controla de forma transitoria en Redis

## 10.4 Pruebas minimas

1. inicia reemplazo desde `READY`
2. no permite concurrencia durante reemplazo
3. mantiene visible la grabacion anterior durante el reemplazo
4. conserva `READY` si el reemplazo falla
5. mantiene consistencia final del evento

## 10.5 Cierre de fase

Informar la politica validada y el comportamiento final.

## 11. Fase 6: Observabilidad, Logs y Auditoria

## 11.1 Objetivo

Cerrar el flujo con visibilidad operativa suficiente y auditoria funcional solo para exito.

## 11.2 Logs minimos obligatorios

1. inicio de upload
2. paso a `PROCESSING` solo en upload inicial
3. sesion resumable creada
4. folder destino resuelto
5. bloqueo concurrente rechazado
6. expiracion o abandono detectado
7. intento de finalizacion
8. verificacion exitosa en Drive
9. error de validacion
10. intento de borrado automatico del archivo huérfano
11. cambio final a `READY`
12. dispatch de notificacion

## 11.3 Auditoria funcional

Solo cuando la grabacion quede correctamente publicada:

1. actor
2. `classEventId`
3. `evaluationId`
4. `recording_file_id`
5. timestamp

## 11.4 Pruebas minimas

1. logs presentes en cada fase critica
2. auditoria emitida solo en exito
3. no se auditan intentos fallidos

## 11.5 Cierre de fase

Informar:

1. estructura de logs
2. campos auditados
3. evidencia de pruebas

## 12. Fase 7: Pruebas Integrales y Endurecimiento

## 12.1 Objetivo

Ejecutar validacion integral del modulo como flujo critico.

## 12.2 Tipos de prueba obligatorios

1. unitarias
2. integracion de servicios
3. e2e del backend
4. si es viable, prueba controlada con Drive real en entorno adecuado

## 12.3 Casos minimos integrales

1. inicio correcto de upload
2. rechazo por permisos
3. rechazo por concurrencia
4. expiracion de lock
5. finalizacion correcta
6. finalizacion con archivo fuera de carpeta
7. reintento tras abandono
8. reemplazo desde `READY`
9. notificacion emitida solo en exito
10. `getAuthorizedRecordingLink` sigue funcionando correctamente
11. el endpoint de estado del upload refleja estado publicado y estado transitorio de forma consistente

## 12.4 Verificaciones de no regresion

1. lectura de eventos por evaluacion
2. detalle de `class_event`
3. acceso autorizado de grabacion
4. notificaciones de clase
5. comportamiento de `recordingStatus` en responses

## 12.5 Cierre de fase

Entregar informe final al desarrollador validador con:

1. resumen de fases ejecutadas
2. lista de endpoints nuevos
3. cambios de servicios/modulos
4. resultados de pruebas
5. riesgos remanentes
6. decisiones pendientes si aun existieran

Estado real de esta fase:

1. pruebas unitarias/e2e backend del flujo actual fueron ejecutadas y cerradas.
2. la validacion real con frontend descubrio bloqueo CORS en el tramo browser -> resumableSessionUrl creada por backend.
3. esa observacion abre una fase adicional de refactor obligatoria.

## 12.1 Fase 8: Refactor de Upload Browser-Direct Final

Objetivo:

1. cerrar el upload directo a Drive sin pasar binario por backend y sin bloqueo CORS.

Alcance tecnico:

1. mantener lo ya estable de permisos funcionales, lock Redis, heartbeat, finalize, auditoria y notificaciones.
2. refactorizar `start` y contrato frontend-backend para que el navegador inicie/resuma upload con autorizacion compatible de usuario.
3. eliminar del camino principal cualquier dependencia de `resumableSessionUrl` creada por backend con service account para consumo directo de browser.

Permisos Drive obligatorios para esta fase:

1. alumnos: solo visibilidad.
2. profesores habilitados del course_cycle: permiso de escritura en destino de videos para subir/reemplazar.
3. admins/superadmins: permiso segun politica operativa acordada.

Tareas minimas:

1. definir y documentar contrato final `start/status/heartbeat/finalize` ajustado al nuevo esquema de upload browser-direct.
2. ajustar provisionamiento/sincronizacion de grupos Drive para soportar profesor-editor en carpeta de videos.
3. actualizar frontend para flujo final sin hack temporal.
4. agregar pruebas unitarias/e2e del nuevo inicio de upload.
5. validar con prueba real de archivo corto y prueba de archivo largo (simulada/controlada).

Criterio de salida:

1. upload directo desde frontend a Drive funcionando sin CORS.
2. sin doble transferencia de binario por backend.
3. finalize consistente y seguro.
4. reemplazo desde `READY` operativo.
5. locks Redis sin bloqueos huerfanos.

## 13. Preguntas que deben detener la implementacion si no estan resueltas

Estas dudas no se deben asumir nunca:

1. decisiones nuevas de producto o infraestructura que contradigan la estrategia aprobada
2. cualquier comportamiento no documentado que altere integridad, concurrencia o seguridad del flujo

Si cualquiera de estas sigue abierta en la fase correspondiente:

1. se documenta
2. se consulta
3. no se asume

Decisiones ya cerradas para no reabrir innecesariamente:

1. reemplazo permitido desde `READY`, manteniendo visible la grabacion anterior hasta exito final
2. MIME inicial permitido: `video/mp4` y `video/x-matroska`
3. TTL inicial del lock/contexto temporal en Redis: 4 horas, con refresh por actividad
4. si la sesion resumable sigue viva, el sistema intentara reanudar
5. si la sesion resumable ya no sigue viva, el intento debe reiniciarse
6. la SPA debe poder permitir navegacion interna sin perder la carga si el uploader vive globalmente
7. tamano maximo inicial por archivo: 10 GB
8. no se implementara polling a Drive para detectar disponibilidad de reproduccion del video, porque no aporta una señal suficientemente confiable para justificar esa complejidad

9. debe mostrarse al usuario un mensaje explicito indicando que Google Drive puede tardar unos minutos adicionales en dejar listo el video para reproduccion
10. el bloqueo concurrente real se controla por intento activo en Redis por `classEventId`
11. durante reemplazo, el estado publicado puede seguir en `READY`
12. `PATCH recordingUrl` queda como flujo administrativo o legacy excepcional, fuera del flujo principal garantizado
13. `heartbeat` y `finalize` deben validar `uploadToken` o `lockToken` del intento activo
14. si la publicacion final falla despues de que el archivo nuevo ya exista en Drive, se intenta borrado automatico; si falla, se registra para limpieza posterior
15. la autorizacion del upload debe validarse por permiso funcional del profesor habilitado sobre el curso/ciclo del `class_event`, evitando heredar por accidente una restriccion de ownership "solo creador" del flujo legacy

## 14. Checklist Global de Calidad

1. Sin tabla nueva de uploads.
2. Sin doble transferencia del binario por backend.
3. Sin publicacion en BD antes de validar Drive.
4. Sin concurrencia simultanea por `class_event`.
5. Sin estados de negocio agregados sin justificacion aprobada.
6. Con logs operativos suficientes.
7. Con auditoria solo en exito.
8. Con pruebas por fase y reporte por fase.
9. Con codigo cohesivo, testeable y mantenible.
10. Con consultas y aclaraciones obligatorias ante cualquier ambiguedad.
11. Sin decisiones apuradas ni soluciones provisionales que comprometan la calidad final del modulo.
12. Upload browser-direct validado en entorno real del navegador sin CORS blocker.
13. Permisos Drive de profesor-editor confirmados para carpeta destino de videos.

## 15. Entregable Esperado por Fase

Cada fase debe cerrar con este formato minimo de reporte al desarrollador validador:

1. objetivo de la fase
2. archivos tocados
3. reglas implementadas
4. pruebas ejecutadas
5. resultado
6. riesgos encontrados
7. dudas abiertas
8. decision de continuar o bloquear siguiente fase
