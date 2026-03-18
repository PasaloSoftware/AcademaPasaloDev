# Estrategia de Carga de Grabaciones de `class_event` a Google Drive

## 1. Objetivo

Definir una estrategia profesional, consistente con la arquitectura actual del backend, para permitir la carga de grabaciones pesadas de clases hacia Google Drive, manteniendo:

1. Integridad entre Google Drive y base de datos.
2. Control de acceso por evaluacion ya provisionada.
3. Evitar concurrencia innecesaria sobre la misma grabacion.
4. Buena experiencia de usuario para cargas largas.
5. Trazabilidad operativa mediante logs.
6. Reutilizacion de los flujos existentes de notificacion y acceso autorizado.

Este documento define la estrategia funcional y tecnica. No es aun el documento de implementacion.

## 1.1 Estado real validado (2026-03-17)

Se valida y deja explicito el estado real despues de las pruebas end-to-end:

1. El backend ya implementa control de concurrencia, estado transitorio en Redis, heartbeat, finalize, auditoria y notificacion.
2. El flujo probado de `start -> resumableSessionUrl -> PUT desde navegador` usando sesion creada por service account fallo por CORS en browser.
3. Con ese mecanismo exacto, el upload directo desde frontend no cierra en produccion.
4. El objetivo arquitectonico se mantiene: no pasar binario por backend como camino final.
5. El ajuste necesario es de arquitectura de inicio de upload, no de dominio completo.

Decision explicita:

1. No se descarta Google Drive como storage final.
2. Si se descarta la variante actual de sesion resumable creada por backend y consumida directamente por navegador.
3. El refactor debe habilitar browser-direct upload con credenciales de usuario y permisos de escritura en carpeta destino.

## 2. Contexto Actual del Backend

Actualmente el backend ya tiene las piezas base necesarias:

1. `class_event` persiste:
   - `recording_url`
   - `recording_file_id`
   - `recording_status_id`
2. Existe catalogo de estados de grabacion:
   - `NOT_AVAILABLE`
   - `PROCESSING`
   - `READY`
   - `FAILED`
3. Existe resolucion de scope Drive por evaluacion, incluyendo `drive_videos_folder_id`.
4. Existe validacion de que la grabacion perteneciente a un evento este realmente dentro de la carpeta de videos autorizada de su evaluacion.
5. Existe notificacion `CLASS_RECORDING_AVAILABLE`.
6. Actualmente la grabacion se registra por URL, no por upload binario desde API.

Conclusiones sobre el contexto:

1. El dominio ya esta preparado para asociar una grabacion a un `class_event`.
2. El acceso autorizado ya esta alineado con Drive y con la carpeta `/videos` de la evaluacion.
3. El cambio necesario no es rehacer el dominio, sino reemplazar el flujo de "setear URL" por un flujo profesional de carga directa a Drive.

## 3. Decision Arquitectonica

La arquitectura definida para este caso es:

1. El frontend sube el archivo directamente a Google Drive.
2. El backend no transporta el binario completo del video.
3. El backend inicia, autoriza, controla y finaliza el flujo.
4. El archivo debe quedar en la carpeta `drive_videos_folder_id` de la evaluacion del `class_event`.
5. Solo despues de validar la existencia y ubicacion real del archivo en Drive se actualiza la base de datos.

## 3.2 Ajuste obligatorio tras validacion real de CORS

La decision anterior se mantiene, pero con una condicion tecnica obligatoria:

1. El navegador no debe consumir directamente una resumable session creada por backend con service account.
2. El upload browser-direct debe iniciarse con autorizacion compatible con navegador (token OAuth de usuario) y permisos correctos en Drive.
3. El backend sigue orquestando permisos funcionales, lock Redis, finalize, auditoria y notificacion.

Flujo objetivo corregido:

1. `frontend` inicia intento con backend (`start`) y recibe metadata de control.
2. `frontend` crea y usa upload resumable contra Drive con token de usuario (no con URL de sesion de service account entregada por backend).
3. `frontend` envia `fileId` a `finalize`.
4. backend valida carpeta/archivo y publica en BD.

Se descarta como flujo principal:

1. `Frontend -> Backend -> Drive`

Justificacion:

1. Los videos son pesados y de larga duracion.
2. Pasar el archivo por el backend duplica trafico:
   - navegador a backend
   - backend a Drive
3. Aumenta riesgo de timeout, consumo de memoria, uso de disco temporal y costo operativo.
4. El backend actual ya esta mejor alineado a una estrategia donde Drive es el storage final y autorizado.

## 3.1 Ruta real de almacenamiento en Drive

Es importante dejar esto explicitamente claro para evitar una interpretacion incorrecta.

La grabacion no se guardara en una carpeta generica llamada simplemente `videos` colgando de cualquier padre arbitrario.

Se guardara en la carpeta de videos que ya pertenece al scope Drive de la evaluacion del `class_event`.

La referencia tecnica final ya existe en backend como:

1. `evaluation_drive_access.drive_videos_folder_id`

Eso representa la ultima subcarpeta del scope de la evaluacion, no un folder global suelto.

Ejemplo conceptual de ruta:

1. `evaluations/<ciclo>/<scope_de_evaluacion>/videos/<archivo>`

Ejemplo mas cercano al modelo actual:

1. carpeta raiz de scopes de evaluaciones
2. carpeta del ciclo o agrupacion correspondiente
3. carpeta propia del scope de la evaluacion
4. subcarpeta final `videos`
5. archivo de grabacion

Ejemplo ilustrativo:

1. `evaluations/2026-1/ev_345_PC1/videos/clase-1-grabacion.mp4`

Lo importante no es el texto exacto del path humano, sino esta regla:

1. la ultima carpeta destino es la carpeta `videos` propia de la evaluacion
2. esa carpeta se resuelve desde `drive_videos_folder_id`
3. nunca se debe asumir una carpeta `videos` global o compartida entre evaluaciones

## 4. Flujo de Alto Nivel

### 4.1 Inicio de carga

1. El usuario inicia la carga de una grabacion para un `class_event`.
2. El frontend llama a un endpoint del backend para iniciar el upload.
3. El backend valida:
   - que el `class_event` existe
   - que el usuario tiene permiso funcional para modificarlo como profesor autorizado del curso/ciclo asociado al evento
   - que esa validacion no hereda accidentalmente una restriccion de ownership "solo creador" del flujo legacy de `PATCH`
   - que la evaluacion asociada tiene `drive_videos_folder_id`
   - que no exista otra carga activa para la misma grabacion
4. Si no existe una grabacion publicada, el backend marca el evento como `PROCESSING`.
5. Si ya existe una grabacion publicada en `READY`, el backend mantiene ese estado publicado y crea solo el intento transitorio en Redis.
6. El backend crea una sesion resumable de Google Drive apuntando a la carpeta `/videos` correcta.
7. El backend devuelve al frontend la informacion necesaria para subir directamente el archivo a Drive.

### 4.2 Subida del binario

1. El frontend usa la sesion resumable para cargar el video directamente a Drive.
2. Esta fase puede tardar bastante tiempo y depende del ancho de banda del usuario.
3. Durante esta fase no se debe persistir aun `recording_url` ni `recording_file_id` en la BD final.

### 4.3 Finalizacion

1. Cuando Drive confirma que el archivo termino de subirse, el backend debe verificar el resultado.
2. El backend valida:
   - que el archivo existe en Drive
   - que pertenece a la carpeta `drive_videos_folder_id` correcta
   - que corresponde al `class_event` en proceso
3. Recién despues de esa validacion:
   - se guarda `recording_file_id`
   - se guarda `recording_url`
   - se cambia `recording_status_id` a `READY`
   - se audita el resultado exitoso
   - se emite `CLASS_RECORDING_AVAILABLE`

### 4.4 Falla o abandono

1. Si la carga falla o queda abandonada, no se publica la grabacion.
2. El backend debe dejar el evento en un estado que permita reintento sin incoherencia.
3. Si no existia una grabacion publicada previa, el estado publicado vuelve a `NOT_AVAILABLE`.
4. Si existia una grabacion publicada previa en `READY`, esa grabacion se conserva y el estado publicado permanece en `READY`.

## 5. Estados de Grabacion

## 5.1 Estados elegidos para este flujo

Para esta estrategia no es necesario agregar mas estados de negocio. Se trabajara con:

1. `NOT_AVAILABLE`
2. `PROCESSING`
3. `READY`

No se obliga a usar `FAILED` como estado final del dominio para este flujo. El error operativo se registra en logs y el estado publicado solo vuelve a `NOT_AVAILABLE` cuando no existia una grabacion previa publicada.

## 5.2 Significado exacto de cada estado

### `NOT_AVAILABLE`

Significa:

1. No hay grabacion publicada y disponible.
2. No hay una carga activa valida.
3. Se permite iniciar un nuevo intento de carga.

### `PROCESSING`

Significa:

1. Existe un intento activo de cargar/publicar la grabacion.
2. No se permite iniciar otro upload concurrente para el mismo `class_event`.
3. Todavia no existe grabacion publicada como verdad final del dominio.

Importante:

1. `PROCESSING` no significa solo "backend procesando".
2. En esta estrategia tambien representa el bloqueo funcional de concurrencia.
3. Este estado aplica naturalmente cuando aun no existe una grabacion publicada.
4. Si ya existe una grabacion publicada y se esta realizando un reemplazo, el estado publicado puede permanecer en `READY` y el estado transitorio del upload vive en Redis.

### `READY`

Significa:

1. Ya existe un archivo valido en Drive.
2. Ya fue verificado por backend.
3. Ya se persistio correctamente en BD.
4. Ya puede ser mostrado al usuario autorizado.

Importante:

1. `READY` no bloquea para siempre futuras actualizaciones.
2. Si mas adelante se reemplaza una grabacion ya publicada, el estado publicado puede permanecer en `READY` mientras el intento transitorio activo vive en Redis.

## 6. Reglas de Transicion

### Flujo normal

1. `NOT_AVAILABLE -> PROCESSING`
2. `PROCESSING -> READY`

### Falla o abandono

1. `PROCESSING -> NOT_AVAILABLE`

### Reemplazo de una grabacion ya existente

1. el estado publicado puede permanecer en `READY`
2. el intento de reemplazo activo vive de forma transitoria en Redis
3. cuando la nueva grabacion queda validada correctamente, el estado publicado sigue en `READY` pero con nueva referencia de archivo
4. si el reemplazo falla o se abandona, el estado publicado se mantiene en `READY` con la grabacion anterior

## 7. Concurrencia

## 7.1 Regla funcional

Solo puede existir una carga activa por `class_event`.

No se permitira:

1. dos uploads simultaneos para la misma grabacion
2. dos sesiones resumables activas controladas por el sistema para el mismo evento

## 7.2 Que estado bloquea nuevos intentos

El bloqueo concurrente real no debe definirse solo por `recording_status_id`.

Regla correcta:

1. si no existe grabacion publicada, `PROCESSING` bloquea nuevos intentos
2. si existe grabacion publicada y hay un reemplazo activo, el bloqueo real lo determina el intento transitorio activo en Redis por `classEventId`

No se debe usar `READY` como bloqueo absoluto porque una grabacion ya publicada puede reemplazarse en el futuro.

## 7.3 Como se logra sin crear tabla nueva

La decision de esta estrategia es no introducir una tabla adicional para uploads.

En su lugar:

1. `class_event.recording_status_id` expresa el estado publicado de negocio.
2. Un lock temporal y datos de sesion resumable se almacenan en Redis con TTL.
3. Redis expresa el estado transitorio del upload activo por `classEventId`.

Esto permite:

1. bloquear concurrencia sin persistencia innecesaria
2. soportar abandono y expiracion
3. no contaminar el modelo de negocio con datos temporales
4. mantener una grabacion publicada en `READY` mientras se realiza un reemplazo sin perder el bloqueo concurrente

## 8. Sesion Resumable

## 8.1 Que es

Una sesion resumable de Drive es una URL temporal de upload que permite:

1. subir archivos grandes por partes
2. continuar una carga interrumpida
3. consultar cuanto ya fue recibido por Drive

## 8.2 Por que es obligatoria aqui

Para videos pesados, el upload resumable no es un lujo, es una necesidad operativa.

Sin upload resumable:

1. una interrupcion obliga a reiniciar desde cero
2. la experiencia para archivos de 2+ horas es demasiado fragil
3. aumentan los reintentos fallidos y el costo operativo

## 8.3 Que pasa si se cierra la pestaña o se cae internet

Casos reales de abandono/interrupcion:

1. cierre de pestaña
2. cierre del navegador
3. recarga de la pagina
4. perdida de conexion
5. cambio de red
6. suspension del equipo
7. crash del navegador

En esos casos:

1. la transferencia activa se interrumpe
2. el backend no recibe una señal fiable e inmediata de "abandono"
3. la sesion resumable puede seguir existiendo en Drive por un tiempo

## 8.4 Puede reanudarse o empieza de cero

Puede reanudarse si se cumplen ambas condiciones:

1. la sesion resumable de Drive sigue vigente
2. el sistema conserva la referencia temporal a esa sesion

Si no se cumple alguna de las dos:

1. se reinicia la carga desde cero

## 8.5 Donde se conserva esa sesion

La sesion resumable no se guardara en una tabla.

Se guardara en Redis, con TTL, porque:

1. es dato temporal
2. no es dato final de negocio
3. necesita caducar solo
4. debe sobrevivir a una recarga o retorno del usuario dentro de una ventana razonable

## 9. Redis como control temporal del upload

## 9.1 Que se guardaria temporalmente

Por cada `class_event` con upload activo, Redis guardaria temporalmente algo como:

1. `classEventId`
2. `evaluationId`
3. `userId`
4. `driveVideosFolderId`
5. `resumableSessionUrl`
6. `fileName`
7. `mimeType`
8. `sizeBytes` si aplica
9. timestamp de inicio
10. TTL operativo
11. `uploadToken` o `lockToken`

## 9.2 Para que sirve

1. Detectar si hay una carga activa real.
2. Rechazar concurrencia.
3. Permitir reanudacion si el usuario vuelve.
4. Liberar automaticamente procesos abandonados.
5. sostener el estado transitorio del upload incluso cuando el estado publicado del evento permanece en `READY`

## 9.3 Por que no basta con la BD sola

Porque si el usuario cierra la pestaña:

1. `class_event` podria quedar en `PROCESSING`
2. el backend no sabria de inmediato si la carga sigue viva o murio
3. sin TTL temporal el evento podria quedar bloqueado indefinidamente

Redis resuelve eso sin crear persistencia innecesaria.

## 10. Manejo de Abandono y Recuperacion

## 10.1 Regla general

`PROCESSING` no puede quedar colgado para siempre.

## 10.2 Politica recomendada

1. Mientras la carga siga viva, el frontend o el flujo tecnico refresca el TTL temporal.
2. Si deja de refrescarse, el intento se considera abandonado.
3. Cuando el sistema detecta que el lock temporal ya expiro:
   - el intento ya no se considera activo
   - se puede permitir reintento
4. En ese momento, si no existia una grabacion publicada, el evento debe poder volver a `NOT_AVAILABLE`.
5. En reemplazo desde `READY`, la grabacion publicada anterior sigue vigente y solo expira el intento transitorio.

Decision cerrada de TTL operativo:

1. el TTL inicial recomendado para el lock/contexto temporal en Redis sera de 4 horas
2. el TTL debe refrescarse mientras exista actividad real del upload
3. si no hay actividad y el TTL expira, el intento deja de bloquear nuevas cargas

## 10.3 Al volver el usuario mas tarde

Si el usuario vuelve:

1. si la sesion resumable aun existe y se conserva el contexto temporal, el upload debe intentar reanudarse
2. si la sesion ya no esta disponible, se inicia una nueva

En ambos casos:

1. no se debe publicar nada hasta validar Drive

## 10.4 Regla especial para reemplazo

Cuando ya existe una grabacion publicada y el sistema esta reemplazandola:

1. la grabacion visible/publicada actual se mantiene
2. el upload activo se representa solo en Redis
3. no se debe degradar el estado publicado a `PROCESSING`
4. si el reemplazo falla, la grabacion publicada anterior sigue vigente

## 11. Integridad entre Drive y Base de Datos

## 11.1 Regla principal

Drive confirma primero. La base de datos se actualiza despues.

No se debe hacer:

1. persistir `recording_url`
2. persistir `recording_file_id`
3. marcar `READY`

antes de verificar el archivo real en Drive.

## 11.2 Orden correcto

1. iniciar upload
2. crear lock/intento transitorio en Redis
3. si no existe grabacion publicada, marcar `PROCESSING`
4. subir a Drive
5. verificar archivo en Drive y su ubicacion
6. actualizar `class_event`
7. marcar `READY` o mantener `READY` segun corresponda
8. auditar exito
9. notificar

## 11.3 Beneficio

Este orden evita incoherencias del tipo:

1. la BD dice que existe grabacion, pero Drive no la tiene
2. la BD apunta a un archivo invalido o fuera del folder autorizado
3. el frontend intenta mostrar una grabacion no utilizable

## 12. Seguridad

## 12.1 Principios de seguridad

La seguridad del flujo depende de que el frontend no decida nada critico por su cuenta.

El backend debe controlar:

1. que usuario puede iniciar carga
2. para que `class_event`
3. para que evaluacion
4. en que carpeta de Drive
5. cuando se considera realmente publicada la grabacion

Regla explicita de permisos para este flujo:

1. el upload debe autorizarse por permiso funcional del profesor habilitado sobre el `class_event` y su curso/ciclo asociado
2. no debe heredarse automaticamente la restriccion de ownership del creador si el `PATCH` legacy actual la usa
3. este flujo no debe endurecer accidentalmente la operacion a "solo el creador del evento puede subir o reemplazar la grabacion"

Regla explicita de permisos Drive para upload browser-direct:

1. alumnos: solo visibilidad/lectura.
2. profesores habilitados del course_cycle: permiso de escritura para subir/reemplazar grabaciones.
3. admins/superadmins: acceso operativo definido por politica (viewer global o writer segun necesidad operativa).
4. el backend debe validar permiso funcional del actor aunque Drive tambien valide permisos tecnicos.

Estado actual detectado:

1. hoy la provision de scope de evaluacion aplica grupos viewer (reader) en carpeta scope.
2. no existe aun en este flujo un grupo profesor-editor para `drive_videos_folder_id`.
3. ese gap debe cerrarse en el refactor para que el upload browser-direct sea viable.

## 12.2 Restricciones obligatorias

1. El folder destino no debe venir confiado desde frontend.
2. El backend debe resolver `drive_videos_folder_id` desde la evaluacion.
3. El backend debe crear la sesion apuntando a esa carpeta.
4. El backend debe verificar al final que el archivo quedo en la carpeta esperada.
5. El backend no debe marcar `READY` solo porque el cliente "dice" que termino.

## 12.3 Validaciones adicionales recomendadas

1. tipo MIME esperado (`video/mp4` y `video/x-matroska`)
2. tamano maximo permitido
3. nombre normalizado del archivo
4. rechazo de nuevo inicio si ya existe un intento activo en Redis para ese `classEventId`
5. `heartbeat` debe validar `uploadToken` o `lockToken` del intento activo
6. `finalize` debe validar `uploadToken` o `lockToken` del intento activo

Decision cerrada de formato inicial:

1. se aceptaran `video/mp4`
2. se aceptaran `video/x-matroska`
3. no se abriran mas formatos sin una justificacion adicional

Decision cerrada de tamano maximo inicial:

1. el tamano maximo permitido por archivo sera de 10 GB
2. cualquier archivo que supere ese limite debe rechazarse antes de iniciar la sesion resumable

## 13. Auditoria

La auditoria funcional solo se registrara cuando el proceso finaliza correctamente.

Se audita:

1. usuario que publico la grabacion
2. `classEventId`
3. `evaluationId`
4. `recording_file_id`
5. URL final o referencia final
6. fecha/hora

No se persisten intentos fallidos como entidad de negocio de auditoria en esta estrategia.

## 14. Logging Operativo

Aunque no se persistan intentos fallidos en auditoria, si se requiere visibilidad operativa por logs.

Se recomienda loggear:

1. inicio de sesion resumable
2. `classEventId`
3. `evaluationId`
4. `driveVideosFolderId`
5. usuario que inicia
6. nombre y MIME del archivo
7. tamano estimado
8. expiracion o abandono detectado
9. verificacion exitosa en Drive
10. error de Drive
11. error de validacion final
12. intento de borrado automatico del archivo huérfano si la publicacion final falla
13. resultado del borrado automatico o necesidad de limpieza posterior
14. actualizacion final en BD
15. dispatch de notificacion

Objetivo:

1. diagnosticar errores
2. entender en que fase fallo
3. operar sin necesidad de una tabla extra de tracking

## 15. UX Esperada

## 15.1 Que ve el usuario

1. selecciona su archivo de video
2. inicia la carga
3. ve progreso durante la transferencia del archivo
4. al completar la transferencia, el sistema realiza la validacion/publicacion final
5. cuando quede disponible, la plataforma podra reflejarla y disparar la notificacion correspondiente

## 15.2 Aclaracion importante

El usuario no obtiene respuesta "instantanea" durante la transferencia fisica del archivo.

La razon:

1. aunque el backend no cargue el binario, el navegador igual necesita subirlo a Drive
2. para videos pesados, esa fase puede tardar bastante

Lo que si se evita con esta estrategia es:

1. que el backend sea cuello de botella
2. que el archivo viaje dos veces por red a traves del servidor

## 15.3 Navegacion del usuario durante la carga

Esto tambien debe quedar claro desde estrategia porque impacta directamente en UX y en expectativas del producto.

Durante la transferencia fisica del archivo:

1. el usuario no necesita quedarse inmovil obligatoriamente mirando la misma pantalla
2. pero la aplicacion cliente que controla la subida debe seguir viva

En terminos practicos para este diseno:

1. si el usuario cambia a otras secciones de la plataforma dentro de la misma SPA y el uploader sigue vivo en un nivel global de la aplicacion, la carga puede continuar
2. si la navegacion destruye el flujo cliente que mantiene la subida, la transferencia se interrumpe
3. si cierra la pestaña o el navegador, la transferencia activa se pausa/interrumpe

Por eso, el comportamiento esperado debe definirse asi:

1. no debe exigirse que el usuario permanezca viendo exactamente la misma pantalla todo el tiempo
2. pero si debe mantenerse viva la sesion de frontend que esta ejecutando el upload
3. cerrar pestaña, recargar bruscamente o cerrar navegador puede cortar la transferencia en curso

Decision de UX derivada:

1. la SPA debe diseñarse para que el uploader viva fuera de una sola pantalla puntual
2. esto permite que el usuario siga navegando por otras vistas de la plataforma sin perder la carga
3. la advertencia explicita al usuario debe ser no cerrar la pestaña ni recargar la aplicacion mientras la transferencia siga en progreso
4. si la SPA esta bien diseñada, navegar internamente por la plataforma no debe cortar la carga

## 15.4 Diferencia entre "subir" y "procesar"

Para UX conviene separar mentalmente dos momentos:

1. `Subiendo archivo`
   - el navegador esta transfiriendo bytes a Drive
   - esta fase depende del internet del usuario
   - aqui el proceso todavia necesita que el cliente siga vivo

2. `Publicando grabacion`
   - el archivo ya termino de llegar a Drive
   - el backend valida carpeta, archivo y consistencia
   - luego actualiza BD y notifica
   - esta fase ya es mucho mas corta y no depende del usuario mirando la misma pantalla

## 15.5 Aclaracion sobre el procesamiento interno de Google Drive

Debe quedar documentado para evitar una expectativa incorrecta de disponibilidad inmediata de la reproduccion del video.

Cuando un video termina de subirse a Google Drive:

1. la transferencia del archivo puede haber finalizado correctamente
2. el archivo puede existir ya en la carpeta correcta
3. pero Google Drive aun puede seguir procesandolo internamente para habilitar la reproduccion embebida del video

Esto significa que en negocio debemos separar dos conceptos:

1. `Grabacion publicada en el sistema`
2. `Video ya disponible para reproduccion inmediata en Drive`

En esta estrategia:

1. `READY` significara que la grabacion ya fue validada, asociada correctamente al `class_event` y publicada en el sistema
2. `READY` no garantiza que la reproduccion del video en Drive este instantaneamente lista en el mismo segundo

## 15.6 Lo que si podemos saber y lo que no

### Lo que si podemos saber con seguridad razonable

1. que el archivo ya existe en Drive
2. que esta en la carpeta `/videos` correcta de la evaluacion
3. que el `fileId` es valido
4. que el backend ya puede asociarlo de forma consistente al `class_event`

### Lo que no debemos prometer con certeza absoluta

1. que la reproduccion embebida del video en Drive este completamente lista de inmediato
2. que el video sea reproducible exactamente en el instante en que termina la subida

## 15.7 Implicancia para producto y mensajes UX

El sistema debe comunicar algo como:

1. `La grabacion se cargo correctamente. Google Drive puede tardar unos minutos adicionales en dejar listo el video para reproduccion.`

Esto evita una falsa promesa de inmediatez y sigue siendo consistente con la realidad tecnica del proveedor de almacenamiento.

## 15.8 Estado que el backend probablemente deba exponer al frontend

Para una UX consistente, el backend debera exponer estado publicado y estado transitorio de forma separada.

Como minimo, el endpoint de estado del upload deberia poder informar algo equivalente a:

1. `recordingStatus`
2. `hasActiveRecordingUpload`
3. `activeUploadMode: initial | replacement | null`

No necesariamente todo esto debe ir en el detalle general del `class_event`, pero si debe existir al menos en el endpoint dedicado al estado del upload.

## 16. Decisiones Cerradas en esta Estrategia

1. La carga sera `frontend -> Google Drive directo`.
2. El backend controlara el flujo y la publicacion.
3. El archivo se almacenara en la carpeta `/videos` ya provisionada de la evaluacion.
4. No se creara una tabla nueva para uploads.
5. El bloqueo concurrente real del upload activo se controlara en Redis por `classEventId`.
6. `READY` no bloquea futuras actualizaciones; la grabacion puede reemplazarse.
7. La sesion resumable y lock temporal se manejaran en Redis con TTL.
8. El TTL operativo inicial en Redis sera de 4 horas, con refresh por actividad.
9. Si la sesion resumable sigue viva, el sistema intentara reanudar la carga; si no, reiniciara el intento.
10. La SPA debe permitir navegar internamente sin perder la carga, siempre que el uploader siga vivo a nivel global.
11. Los MIME aceptados inicialmente seran `video/mp4` y `video/x-matroska`.
12. El tamano maximo inicial por archivo sera de 10 GB.
13. No se implementara polling a Drive para detectar cuando la reproduccion del video ya quedo disponible, porque no aporta una señal suficientemente confiable para justificar esa complejidad.
14. La BD solo se actualizara despues de verificar exitosamente el archivo en Drive.
15. Los intentos fallidos o abandonados volveran a `NOT_AVAILABLE` solo si no existia grabacion publicada previa.
16. La auditoria se registrara solo cuando la grabacion quede correctamente publicada.
17. Los errores intermedios y recuperaciones se observaran por logs operativos.
18. `heartbeat` y `finalize` validaran el `uploadToken` o `lockToken` del intento activo.
19. Si el archivo nuevo ya existe en Drive pero la publicacion final falla, se intentara borrado automatico; si falla, quedara logueado para limpieza posterior.
20. La autorizacion del upload se evaluara por permiso funcional del profesor del curso/ciclo asociado al `class_event`, sin heredar por defecto una restriccion de "solo creador" del flujo legacy.
21. El mecanismo `backend crea resumable session con service account y browser hace PUT a esa URL` queda descartado como implementacion final por incompatibilidad CORS observada en pruebas reales.
22. Se refactorizara la fase de inicio de upload para browser-direct con autorizacion de usuario compatible con navegador.
23. Para habilitar upload browser-direct, el esquema de grupos/permisos Drive debe incluir capacidad de escritura para profesores habilitados en el destino de videos.

Decision cerrada de reemplazo:

1. si existe una grabacion `READY`, seguira visible y vigente mientras la nueva carga no llegue correctamente a la fase final
2. el reemplazo solo impacta la BD y la grabacion publicada cuando la nueva version ya fue validada correctamente en Drive
3. si el reemplazo falla o se abandona, la grabacion publicada anterior se mantiene en `READY`

Decision cerrada de concurrencia refinada:

1. el bloqueo concurrente real del upload activo se controla en Redis por `classEventId`
2. `PROCESSING` no debe seguir interpretandose como unico bloqueo universal en todos los casos
3. durante reemplazo, el estado publicado puede seguir en `READY` y el bloqueo transitorio sigue existiendo en Redis

Decision cerrada sobre flujo legacy:

1. `PATCH recordingUrl` queda fuera del flujo principal garantizado
2. se considera flujo administrativo o legacy excepcional
3. no debe competir con el flujo formal de upload directo a Drive

## 17. Riesgos y Limites

1. Si la sesion resumable expira, el upload debe reiniciarse.
2. Si el usuario cierra la pestaña, la transferencia activa se interrumpe.
3. La reanudacion depende de conservar la sesion y de que siga vigente.
4. Google Drive no es una plataforma de video streaming especializada; se usa como almacenamiento y acceso controlado.
5. Sin una politica correcta de TTL y recuperacion, un intento activo podria seguir bloqueando reintentos mas tiempo del debido.

## 18. Checklist de Aceptacion de la Estrategia

1. El upload binario no pasa por el backend.
2. La carpeta destino siempre es `drive_videos_folder_id` de la evaluacion del `class_event`.
3. No se permite mas de una carga activa por evento.
4. El bloqueo concurrente real del upload activo se controla en Redis por `classEventId`.
5. `READY` representa grabacion ya validada y publicada.
6. Se permite reemplazar una grabacion existente.
7. La sesion resumable se guarda temporalmente en Redis con TTL.
8. La BD se actualiza solo despues de confirmar Drive.
9. Se reutiliza la notificacion `CLASS_RECORDING_AVAILABLE`.
10. La auditoria se registra solo al finalizar exitosamente.
11. `heartbeat` y `finalize` validan el `uploadToken` o `lockToken` del intento activo.
12. si la publicacion final falla despues de que el archivo nuevo ya exista en Drive, se intenta borrado automatico y, si falla, se deja log para limpieza posterior.
13. la autorizacion del upload se valida por permiso funcional del profesor habilitado sobre el `class_event`, no por ownership implicito de creador heredado del flujo legacy.
