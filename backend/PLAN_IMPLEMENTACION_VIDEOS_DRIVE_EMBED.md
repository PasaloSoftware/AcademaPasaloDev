# Plan Implementacion Drive Links - Videos y Documentos

Fecha base: 2026-03-01  
Ultima actualizacion: 2026-03-02  
Estado: Documento base de ejecucion por fases.

## 1. Objetivo
Implementar entrega de contenido educativo desde Google Drive con URLs directas para:
1. Videos.
2. Documentos.

Manteniendo:
1. Control de acceso academico vigente.
2. Revocacion por cambios de matricula/acceso.
3. Menor carga de trafico en EC2 (Drive sirve los bytes).

## 2. Contexto real del sistema (base ya existente)
### 2.1 Backend actual
1. Login con Google ya operativo.
2. Reglas de acceso academico ya implementadas en backend.
3. Storage Drive para materiales ya existe (subida, descarga, borrado).
4. Roles y validaciones de acceso a materiales ya existen.

### 2.2 Modelo de acceso academico vigente (clave para diseno)
1. El acceso de alumno se valida por evaluacion (`enrollment_evaluation`), no solo por curso.
2. Se valida estado activo + ventana temporal + matricula no cancelada.
3. Matricula `PARTIAL` puede acceder solo a algunas evaluaciones.
4. Matricula `FULL` accede a todas las evaluaciones del scope aplicable.

Implicancia directa:
1. La unidad de permiso en Drive debe alinearse con evaluacion.
2. Grupo por curso/ciclo no replica correctamente `PARTIAL`.

## 3. Decisiones tecnicas confirmadas
### 3.1 Unidad de permiso en Drive
1. Grupo por evaluacion (canon).
2. Mismo grupo para videos y documentos de esa evaluacion.

Ejemplo:
1. `ev-552-viewers@academiapasalo.com`

### 3.2 Estructura minima de carpetas
No usar carpeta global unica para todo el contenido.

Estructura minima recomendada:
1. `uploads/objects/ev_<evaluationId>/videos`
2. `uploads/objects/ev_<evaluationId>/documentos`

Notas:
1. Separa operacion por tipo de contenido sin duplicar grupos.
2. `evaluationId` es la llave tecnica principal.
3. Puedes agregar nombres legibles, pero el mapeo oficial debe ser por ID.

### 3.3 Entrega al frontend
1. Videos: URL directa de Drive para visualizacion embebida.
2. Documentos: URL directa de Drive para visualizacion/descarga.
3. En ambos casos, backend decide si entrega URL o no.

### 3.4 Regla de excepcion para visibilidad fina
Para contenido que use `visibleFrom/visibleUntil`:
1. Mantener gate/proxy desde backend (segun endpoint y caso).
2. No depender solo de permiso de grupo en Drive para esa regla.

Razon:
1. Drive no aplica nativamente la logica de visibilidad fina por item como lo hace backend.

## 4. Por que se hace asi (justificacion)
1. Trafico alto: URLs directas reducen carga de EC2.
2. Reglas iguales para video/documento: un solo grupo por evaluacion evita complejidad innecesaria.
3. Modelo academico actual: acceso real es por evaluacion, por eso grupo por evaluacion.
4. Revocacion: al quitar miembro del grupo, URL antigua deja de funcionar para ese usuario.
5. Operacion: subcarpetas separadas (`videos`/`documentos`) simplifican orden y auditoria.

## 5. Lo que SI y NO garantiza este enfoque
### 5.1 Si garantiza
1. Control de acceso a origen (Drive) segun estado academico.
2. Revocacion posterior por baja/cancelacion/vencimiento.
3. Escalabilidad mejor que proxy continuo en backend.

### 5.2 No garantiza
1. Impedir al 100% que un usuario conserve copia local si ya pudo ver/descargar.

## 6. Variables de entorno requeridas
1. `GOOGLE_APPLICATION_CREDENTIALS`
2. `GOOGLE_DRIVE_ROOT_FOLDER_ID`
3. `GOOGLE_WORKSPACE_ADMIN_EMAIL`
4. `GOOGLE_WORKSPACE_GROUP_DOMAIN`
5. `STORAGE_PROVIDER=GDRIVE` (segun entorno)

## 7. Alcance funcional objetivo unificado
1. Provision automatica de recursos Drive por evaluacion:
   - carpeta `videos`
   - carpeta `documentos`
   - grupo viewer
2. Permiso de lectura de ambas carpetas al mismo grupo.
3. Sincronizacion automatica de miembros por eventos de negocio.
4. Reconciliacion periodica como fallback.
5. Endpoints de entrega de URL autorizada para frontend.
6. Excepcion controlada para items con `visibleFrom/visibleUntil`.

## 8. Fases de implementacion
Regla obligatoria para todas las fases:
1. Implementacion profesional y optimizada.
2. Al cierre de cada fase:
   - actualizar/crear tests
   - ejecutar pruebas impactadas
   - detenerse
   - reportar resultados
   - esperar aprobacion

### Fase 1 - Fundacion de modelo unificado
Estado: PENDIENTE

Objetivo:
Definir modelos persistentes para scope evaluacion + recursos Drive compartidos para videos/documentos.

Entregables:
1. Tabla de mapeo por evaluacion:
   - evaluationId
   - driveFolderIdBase (ev_<id>)
   - driveVideosFolderId
   - driveDocumentosFolderId
   - groupEmail/groupId
2. Contratos de servicio:
   - resolver scope academico
   - resolver/provisionar carpeta y grupo
3. Reglas estandar de naming.
4. DTOs base de respuesta para URL autorizada.

Tests:
1. Unit de naming.
2. Unit de resolucion de scope.
3. Unit de mapeo entidad/dto.

Criterio de cierre:
1. Modelo sin ambiguedad y alineado al acceso por evaluacion.

### Fase 2 - Provision idempotente de carpetas y grupo
Estado: PENDIENTE

Objetivo:
Crear/obtener de forma idempotente carpeta base de evaluacion + subcarpetas + grupo.

Entregables:
1. Drive provisioner:
   - `find-or-create` carpeta base evaluacion.
   - `find-or-create` subcarpetas `videos` y `documentos`.
2. Workspace provisioner:
   - `find-or-create` grupo viewer por evaluacion.
3. Vincular permisos:
   - grupo viewer -> read en ambas subcarpetas.
4. Persistir IDs y metadatos en BD.

Tests:
1. Unit con mocks (existente/no existente/ambiguedad/error API).
2. Test de idempotencia (doble provision no duplica).

Criterio de cierre:
1. Provision repetible, trazable y sin duplicados.

### Fase 3 - Sync por eventos de negocio
Estado: PENDIENTE

Objetivo:
Sincronizar membresia del grupo segun matriculas y accesos por evaluacion.

Entregables:
1. Jobs BullMQ:
   - grant member
   - revoke member
2. Triggers por eventos:
   - matricula creada
   - matricula cancelada
   - alta/baja de acceso por evaluacion
   - cambios relevantes de profesor (si aplica visualizacion)
3. Idempotencia add/remove.
4. Retry y DLQ.

Tests:
1. Unit de encolado.
2. Unit de processors.
3. E2E de grant/revoke en casos clave.

Criterio de cierre:
1. Los cambios academicos se reflejan en grupos sin drift inmediato.

### Fase 4 - Reconciliacion periodica
Estado: PENDIENTE

Objetivo:
Corregir desalineaciones por fallos transitorios o propagacion tardia.

Entregables:
1. Job periodico:
   - miembros esperados por evaluacion
   - miembros reales del grupo
   - delta add/remove
2. Telemetria de drift detectado/corregido.
3. Throttling para cuotas API.

Tests:
1. Unit de calculo de delta.
2. Unit de errores parciales.
3. Prueba integrada de convergencia.

Criterio de cierre:
1. El sistema converge automaticamente a estado correcto.

### Fase 5 - API de consumo frontend (direct URL)
Estado: PENDIENTE

Objetivo:
Exponer endpoints para que frontend reciba URL directa solo cuando este autorizado.

Entregables:
1. Endpoint video (embed/direct):
   - valida acceso vigente
   - retorna URL + metadata
2. Endpoint documento (view/download direct):
   - valida acceso vigente
   - retorna URL + metadata
3. Politica clara:
   - si no hay acceso, no devolver URL.
4. Auditoria de consultas sensibles.

Tests:
1. Unit autorizacion.
2. E2E permitido/denegado/revocado.
3. E2E post-cancelacion/post-vencimiento.

Criterio de cierre:
1. Front integra sin ambiguedad y con trazabilidad.

### Fase 6 - Excepcion visibleFrom/visibleUntil
Estado: PENDIENTE

Objetivo:
Cubrir los casos menos frecuentes que requieren visibilidad fina por fecha.

Entregables:
1. Regla de ruteo:
   - contenido normal: URL directa.
   - contenido con visibilidad fina: gate/proxy backend.
2. Documentacion de contrato frontend para ambos caminos.
3. Observabilidad de uso de esta via de excepcion.

Tests:
1. Unit de decision de ruta (direct vs proxy).
2. E2E con fechas antes/dentro/despues de ventana.

Criterio de cierre:
1. Se respeta visibilidad fina sin degradar el camino masivo de alto trafico.

## 9. Reglas operativas fijas
1. No usar `public with link` para contenido protegido.
2. No crear grupos separados por videos/documentos si las reglas son identicas.
3. No usar carpeta global unica para todo el contenido de todas las evaluaciones.
4. Crear grupos de forma lazy (solo cuando exista contenido o necesidad real).
5. Mantener reconciliacion periodica activa.
6. No borrar grupos automaticamente al cierre de ciclo sin politica definida.

## 10. Riesgos y mitigaciones
1. Propagacion de permisos no instantanea.
   Mitigacion: retries + reconciliacion.
2. Cuotas de APIs de Google.
   Mitigacion: batching, backoff, throttling.
3. Drift por eventos perdidos.
   Mitigacion: reconciliacion periodica y auditoria.
4. Exposicion accidental por mala comparticion.
   Mitigacion: validaciones de compliance y pruebas automatizadas.

## 11. Checklist de arranque
1. Confirmar naming final de grupo por evaluacion.
2. Confirmar naming final de carpeta base y subcarpetas.
3. Confirmar politica de miembros para profesores/admins.
4. Confirmar SLA de reconciliacion (cada cuanto corre).
5. Confirmar politica de retencion/archivo por ciclo.
6. Confirmar contrato frontend para:
   - URL directa (camino principal)
   - proxy/gate por visibilidad fina (camino excepcional)
