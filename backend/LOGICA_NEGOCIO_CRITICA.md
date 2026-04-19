# Logica de Negocio Critica y Seguridad - Documentacion Tecnica

Este documento detalla la implementacion tecnica de los flujos mas complejos del sistema, explicando como se orquestan los archivos, que tablas se afectan y como se garantiza la integridad de los datos.

## 1. Sistema de Matriculas Dinamicas y Reactivas

### Problema
En sistemas tradicionales, la matricula es una foto estatica. Si un profesor agregaba un examen nuevo despues de que el alumno pago el Curso Completo, el alumno no tenia acceso.

### Solucion Tecnica
Implementamos un sistema hibrido que combina una transaccion inicial con un patron Observador (Subscriber) para garantizar consistencia eventual inmediata.

#### A. Flujo de Matricula (EnrollmentsService)
**Archivos:** `src/modules/enrollments/application/enrollments.service.ts`

1. **Intencion de Compra:** Se recibe `enrollmentTypeCode` ('FULL' o 'PARTIAL').
2. **Transaccion ACID:** Todo ocurre dentro de `dataSource.transaction`.
3. **Logica de Seleccion:**
   - Si es **FULL**: Se buscan todas las evaluaciones del ciclo actual y ciclos historicos especificados.
   - Si es **PARTIAL**: Se validan los IDs de evaluaciones enviados, que pueden pertenecer al ciclo actual o a ciclos historicos especificados en `historicalCourseCycleIds`.
4. **Vigencia Unificada:**
   - Toda evaluacion concedida (FULL o PARTIAL) persiste una ventana unica de acceso en `enrollment_evaluation`.
   - `access_start_date` = inicio del ciclo academico del `courseCycle` base de la matricula.
   - `access_end_date` = fin del ciclo academico del `courseCycle` base de la matricula.
   - Ya no existe clamping por evaluacion mas lejana ni fallback por simil historico para calcular la fecha fin.
5. **Persistencia:** Se inserta en `enrollment` y masivamente en `enrollment_evaluation`.

**Tablas Afectadas:**
- `enrollment` (Cabecera)
- `enrollment_evaluation` (Detalle - unica fuente de verdad de acceso)

#### B. Reactividad Automatica (EvaluationSubscriber)
**Archivos:** `src/modules/evaluations/infrastructure/evaluation.subscriber.ts`

1. **Trigger:** Se dispara `afterInsert` cada vez que se crea una `Evaluation`.
2. **Deteccion por tipo de evaluacion:**
   - Si la nueva evaluacion es `BANCO_ENUNCIADOS`, se otorga acceso automatico a toda matricula activa del curso/ciclo.
   - Si no es banco, se otorga acceso automatico solo a matriculas activas de tipo `FULL`.
3. **Inyeccion de Permisos:**
   - Itera sobre los alumnos encontrados.
   - Crea automaticamente el registro en `enrollment_evaluation` para la nueva evaluacion.
4. **Resultado:** El alumno ve el nuevo examen en tiempo real sin que el administrador toque nada.

---

## 2. Acceso Historico (Valor Agregado)

### Logica
Permitir que un alumno matriculado acceda a evaluaciones de ciclos anteriores (ej. 2025-2) para practicar.

**Archivos:** `src/modules/enrollments/application/enrollments.service.ts`

1. **Aplicacion:** Funciona tanto para matriculas **FULL** como **PARTIAL** mediante el campo `historicalCourseCycleIds`.
2. **Busqueda de Ciclos:** El servicio busca en `course_cycle` los ciclos especificados que compartan el mismo `course_id` y cuya `start_date` sea menor a la actual.
3. **Diferencia por Tipo:**
   - **FULL**: Accede a todas las evaluaciones de los ciclos historicos.
   - **PARTIAL**: Accede solo a las evaluaciones especificas indicadas en `evaluationIds` (pueden ser de ciclos pasados).
4. **Vigencia en historico:**
   - Aunque la evaluacion historica tenga `end_date` antigua, la vigencia de acceso se guarda hasta el fin del ciclo academico actual del curso base matriculado.
5. **Resultado:** El alumno ve material antiguo habilitado hasta que termine su ciclo actual.

---

## 3. Seguridad: Detección de Anomalías y Cuentas Compartidas

Aquí abordamos cómo distinguimos el uso legítimo del compartido, incluso en distancias cortas.

### A. Sesiones Concurrentes (Anti-Préstamo Simultáneo)
Evita que dos personas usen la cuenta al mismo tiempo, sin importar dónde estén.

**Archivos:** `src/modules/auth/application/auth.service.ts`

1. **Detección:** Antes de crear una sesión, consultamos:
   ```sql
   SELECT * FROM user_session 
   WHERE user_id = ? AND is_active = true
   ```
2. **Resolución:** Si existe resultado, el login se detiene. El sistema responde `PENDING_CONCURRENT_RESOLUTION`.
3. **Decisión del Usuario:** El usuario debe elegir:
   - "Desconectar al otro" (Revoca el token anterior).
   - "Cancelar" (No entra).
4. **Efectividad:** Es el método más eficaz para evitar préstamos de cuentas activos.

### B. Viaje Imposible (Impossible Travel) - Distancias Largas
Detecta si alguien se loguea en Madrid y 5 minutos después en Tokio.

**Archivos:** `src/modules/auth/application/security-event.service.ts`

1. **Cálculo:**
   - Se obtiene la última ubicación conocida (`lat`, `long`) y su `timestamp`.
   - Se compara con la ubicación del intento actual.
   - Fórmula: `Velocidad = Distancia (Haversine) / Tiempo Transcurrido`.
2. **Umbral:** Si la velocidad > 800 km/h (velocidad promedio de avión comercial), se marca como anómalo.

### C. Detección en Distancias Cortas (El caso "Amigo a 20 min")
El uso de IP (GeoIP) tiene un margen de error de ciudad (10-40km). No sirve para detectar si le presté la cuenta a mi vecino. Para esto, el backend está preparado para usar **Geolocalización GPS Precisa**.

**Estrategia Implementada:**

1. **Device Fingerprinting (`device_id`):**
   - Aunque estén en la misma casa, si usan dispositivos diferentes (móvil vs laptop), el `device_id` cambia.
   - El sistema fuerza una re-autenticación si el `refresh_token` no coincide con el dispositivo original.

2. **GPS vs IP:**
   - La tabla `user_session` tiene columnas `latitude` y `longitude` (DECIMAL 10,7).
   - Si el Frontend solicita permiso de ubicación al navegador y envía las coordenadas exactas:
     - El backend calcula la distancia exacta.
     - Si la distancia es > 1km en < 1 minuto, salta la alarma.
   - **Nota:** Si solo confiamos en la IP, este caso es indetectable. Por eso el backend prioriza el `device_id` y las sesiones concurrentes para controlar el préstamo local.

**Tablas Afectadas:**
- `user_session`: Almacena coordenadas, IP, device_id y estado.
- `security_event`: Registra el historial de intentos y motivos de bloqueo.

### D. Refresh Token Rotation con `jti` (Fortalecimiento de Identidad)

Para evitar ambiguedades en renovacion de sesion y mejorar trazabilidad, el backend ahora usa `jti` (JWT ID) en refresh tokens.

**Archivos:** `src/modules/auth/application/token.service.ts`, `src/modules/auth/application/auth.service.ts`, `src/modules/auth/application/session.service.ts`, `src/modules/auth/infrastructure/user-session.repository.ts`

1. **Emision de refresh token:**
   - Se genera `jti` unico por token de refresh.
   - Ese `jti` viaja dentro del JWT (claim `jti`).
2. **Persistencia de sesion:**
   - La tabla `user_session` guarda `refresh_token_jti`.
   - El lookup de sesion para refresh y reauth usa `refresh_token_jti` con lock pesimista.
3. **Rotacion segura:**
   - En cada refresh se emite nuevo token con nuevo `jti`.
   - Se actualiza la sesion en transaccion.
   - Se invalida cache de sesion y se blacklistea hash del refresh anterior.
4. **Contrato API:**
   - No cambia el contrato con frontend.
   - El frontend sigue enviando/recibiendo `refreshToken` como antes.
   - `jti` es control interno del backend.

### E. IP Confiable (Pendiente de Cierre con DevOps)

La deteccion de anomalias basada en IP depende de una cadena de proxies confiable.

Estado actual:
- Pendiente de coordinacion con DevOps para cerrar configuracion final de IP confiable.
- Objetivo tecnico: usar IP resuelta por la plataforma (`request.ip`) con `trust proxy` correctamente definido segun topologia real de despliegue.
- Riesgo si no se cierra: posibilidad de contaminar auditoria de seguridad con headers de IP manipulados.

---

## 4. Provisionamiento Asíncrono de Drive (MediaAccessModule)

### Problema Original

La creación de un curso/ciclo académico requería aprovisionar en Google Workspace:
carpetas de Drive, grupos de Workspace, permisos y subcarpetas de banco. Estas
operaciones de API externa pueden tardar 10-30 segundos, lo que bloqueaba la respuesta
HTTP y causaba timeouts en el frontend.

### Solución: Queue BullMQ + Patrón Fire-and-Forget

Al crear un curso, la API persiste todo en base de datos y encola el trabajo de Drive.
El frontend recibe respuesta en ~1 segundo. El worker procesa en segundo plano.

**Cola utilizada:** `QUEUES.MEDIA_ACCESS = 'media-access-queue'`

**Archivos clave:**
- `src/modules/media-access/domain/media-access.constants.ts` — constantes de jobs y acciones
- `src/modules/media-access/application/media-access-membership-dispatch.service.ts` — encola jobs
- `src/modules/media-access/infrastructure/processors/media-access-membership.processor.ts` — ejecuta jobs
- `src/modules/courses/application/course-setup.service.ts` — crea el curso y encola el job

---

### A. Flujo de Creación de Curso (CourseSetupService)

**Archivo:** `src/modules/courses/application/course-setup.service.ts`

1. Se recibe la petición con datos del curso, evaluaciones y tarjetas de banco.
2. Se ejecuta una transacción ACID en base de datos:
   - Inserta en `course`, `course_cycle`, `academic_cycle`
   - Inserta evaluaciones en `evaluation`
   - Inserta estructura de banco en `evaluation` (tipo `BANCO_ENUNCIADOS`) y `material_folder`
3. Se llama `dispatchService.enqueueProvisionCourseSetup(...)` — **fuera de la transacción**.
4. La API responde inmediatamente con `driveProvisioning: { status: 'queued' }`.

**Tablas Afectadas en la transacción:**
- `course`, `course_cycle`, `academic_cycle`
- `evaluation`, `material_folder`

**Nota de diseño:** El encolado ocurre fuera de la transacción a propósito. Si se encolara
dentro y la transacción fallara, el worker intentaría provisionar un curso que no existe.
Al estar fuera, si la transacción falla el encolado nunca ocurre.

---

### B. Job: PROVISION_COURSE_SETUP

**Nombre:** `MEDIA_ACCESS_JOB_NAMES.PROVISION_COURSE_SETUP = 'PROVISION_COURSE_SETUP'`

**Payload (`MediaAccessCourseSetupProvisionJobPayload`):**
```typescript
{
  courseCycleId: string;
  courseCode: string;
  cycleCode: string;
  evaluationIds: string[];          // IDs de evaluaciones académicas (excluye banco)
  bankCards: Array<{ evaluationTypeCode: string; number: number }>;
  bankFolders: Array<{ groupName: string; items: string[] }>;
  requestedAt: string;              // ISO timestamp de cuándo se encoló
}
```

**jobId:** `media-access__provision-course-setup__{courseCycleId}`
(idempotente — si se encola dos veces el mismo ciclo, BullMQ deduplica)

**Ejecución en el processor (`handleProvisionCourseSetup`):**
1. Para cada `evaluationId` → llama `provisioningService.provisionByEvaluationId(evaluationId)`:
   - Crea la carpeta raíz de scope en Drive.
   - Crea el grupo de viewers (`cc-{id}-viewers`) en Google Workspace.
   - Crea el grupo de profesores (`cc-{id}-profs`) en Google Workspace.
   - Asigna permisos de los grupos sobre la carpeta.
2. Llama `courseCycleDriveProvisioningService.provision(...)`:
   - Crea la carpeta del ciclo (`{courseCode}-{cycleCode}`) bajo el padre del banco.
   - Crea subcarpetas por tipo de banco (`{evaluationTypeCode}-{number}`).
   - Sincroniza membresía de profesores en el grupo de profesores.
3. Loggea éxito: `'Provisioning Drive de course setup completado'`.

**Todas las operaciones son idempotentes:** `findOrCreateDriveFolderUnderParent` y
`findOrCreateGroup` no duplican recursos si ya existen en Workspace/Drive.

---

### C. Estructura de Grupos Workspace por Curso

Para cada `evaluation` académica del curso:

| Grupo | Email | Propósito |
|---|---|---|
| Viewers | `cc-{evaluationId}-viewers@dominio` | Alumnos matriculados con acceso activo |
| Profesores | `cc-{cycleCode}-profs@dominio` | Profesores del ciclo con acceso editor |

- El grupo de **viewers** se puebla dinámicamente cuando un alumno es matriculado
  (`MEDIA_ACCESS_JOB_NAMES.SYNC_MEMBERSHIP`).
- El grupo de **viewers** estará vacío en un curso recién creado sin alumnos — esto es correcto.
- El grupo de **profesores** se puebla durante el provisioning del ciclo.

---

### D. Endpoint de Re-provisionamiento (Admin)

Permite re-disparar el provisionamiento Drive de un ciclo de curso ya existente.
Útil cuando el worker falló, la API de Workspace tuvo un error transitorio, o el curso
fue creado antes de que existiera el sistema de colas.

**Endpoint:**
```
POST /api/v1/admin/media-access/course-cycles/:id/reprovision-drive
```

**Autenticación:** Requiere rol `ADMIN` o `SUPER_ADMIN`.

**Respuesta exitosa (202 Accepted):**
```json
{
  "statusCode": 202,
  "message": "Reprovisioning Drive encolado exitosamente",
  "data": {
    "status": "ENQUEUED",
    "courseCycleId": "159",
    "evaluationsToProvision": 2,
    "bankFolderGroups": 1
  }
}
```

**Archivo:** `src/modules/media-access/presentation/media-access-admin.controller.ts`
**Método:** `reprovisionCourseCycleDrive`

**Flujo interno:**
1. Llama `CourseCycleDriveProvisioningService.loadReprovisionData(courseCycleId)`:
   - Consulta metadatos del ciclo (`courseCode`, `cycleCode`).
   - Consulta evaluaciones académicas para obtener `evaluationIds` y `bankCards`.
   - Consulta la estructura `material_folder` del banco para obtener `bankFolders`.
   - Retorna `null` si el `courseCycleId` no existe → 404.
2. Encola el job `PROVISION_COURSE_SETUP` con los datos cargados.
3. El worker ejecuta el mismo flujo idempotente descrito en la sección B.

**Seguridad del re-provisionamiento:** Como todas las operaciones son idempotentes, ejecutar
este endpoint sobre un curso ya provisionado no genera duplicados en Drive ni en Workspace.
Solo crea recursos que falten.

---

### E. Logging del Flujo Drive

| Momento | Nivel | Mensaje | Archivo |
|---|---|---|---|
| Job encolado | `log` | `'Provisioning Drive de course setup encolado'` | `media-access-membership-dispatch.service.ts` |
| Job completado | `log` | `'Provisioning Drive de course setup completado'` | `media-access-membership.processor.ts` |
| Payload inválido | `error` (UnrecoverableError) | `'Payload inválido para provision de course setup Drive'` | `media-access-membership.processor.ts` |
