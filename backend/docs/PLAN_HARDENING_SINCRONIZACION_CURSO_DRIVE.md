# Plan por fases — Sincronización Curso / BD / Drive (pre-implementación)

## Objetivo
Dejar el backend con un flujo consistente y único para creación de cursos, evitando ambigüedad y garantizando que:

1. `BANCO_ENUNCIADOS` **nunca** se provisione como scope individual en `evaluations` Drive.
2. El acceso de profesor se mantenga por grupo `cc-<id>-professors` con permisos `writer`.
3. La sincronización asíncrona siga siendo robusta y observable.

> Contexto asumido: entorno de **desarrollo** (sin necesidad de migraciones de compatibilidad ni backward-compat en frontend).

---

## Estado actual resumido

- Existen dos estilos de creación:
  - **Flujo A (integral):** `POST /courses/setup` (más alineado con Drive).
  - **Flujo B (separado):** `POST /courses` + `POST /courses/assign-cycle` + `POST /evaluations`.
- `course-setup` ya excluye `BANCO_ENUNCIADOS` al provisionar evaluaciones Drive.
- Existe riesgo de provisión indirecta de BANCO vía sincronización asíncrona (grants por evaluación).

---

## Fase 0 — Definición de reglas (antes de codificar)

### Regla R1 (crítica)
`BANCO_ENUNCIADOS` es global de `course_cycle` y **no** debe crear carpeta en `evaluations`.

### Regla R2
Grupo docente consolidado por curso-ciclo:
- `cc-<courseCycleId>-professors@<domain>`
- Debe tener `writer` en scope `course_cycle` y en carpetas de evaluación que correspondan.

### Regla R3
Asincronía permitida (consistencia eventual), pero con reintentos, logs y capacidad de reconciliación.

---

## Fase 1 — Unificación de flujo de creación (eliminar “B de creación”)

## Cambios funcionales

Deshabilitar/eliminar rutas de creación separada que generan ambigüedad:

- `POST /courses`
- `POST /courses/assign-cycle`

Mantener rutas de **mantenimiento posterior** (sí necesarias):

- `POST /evaluations` (crear evaluación luego)
- `PUT /courses/cycle/:id/evaluation-structure`
- `POST/DELETE /courses/cycle/:id/professors`

## Archivos impactados (esperados)

- `backend/src/modules/courses/presentation/courses.controller.ts`
- `backend/src/modules/courses/application/courses.service.ts` (métodos que queden huérfanos)
- tests e2e/unit que llamen esas rutas de creación separada

## Criterio de aceptación

- La creación nueva de curso + ciclo + estructura inicial solo entra por `POST /courses/setup`.
- Ningún test/flujo de creación depende de `POST /courses` o `POST /courses/assign-cycle`.

---

## Fase 2 — Blindaje central contra BANCO_ENUNCIADOS en Drive

## Problema a cerrar

Aunque `course-setup` lo evita, BANCO puede entrar por otros caminos (por ejemplo, grants asíncronos por evaluación).

## Cambios funcionales

Implementar guardas explícitas en capa central (no solo en endpoints):

1. En provisioning de evaluación (`EvaluationDriveAccessProvisioningService`), cortar si tipo = `BANCO_ENUNCIADOS`.
2. En processor de membresías (`MediaAccessMembershipProcessor`), antes de `ensureActiveDriveAccess`, omitir jobs de evaluación BANCO.
3. En cualquier job de recuperación/reconciliación de scope, excluir BANCO.

## Archivos impactados (esperados)

- `backend/src/modules/media-access/application/evaluation-drive-access-provisioning.service.ts`
- `backend/src/modules/media-access/infrastructure/processors/media-access-membership.processor.ts`
- `backend/src/modules/media-access/application/drive-access-scope.service.ts` (si aplica)
- tests de media-access y evaluaciones

## Criterio de aceptación

- No se crea ningún `ev_<id>_BANCO_ENUNCIADOS0` en Drive.
- Jobs de sync para BANCO quedan en `skip` explícito y trazable en logs.

---

## Fase 3 — Robustez asíncrona y observabilidad

## Cambios funcionales

1. Estandarizar logs de `skip/retry/success/fail` en media-access.
2. Mantener/revisar política de retries (BullMQ + llamadas Google).
3. Asegurar que exista camino operativo de reconciliación para corregir drift (ya existe, reforzar cobertura).

## Archivos impactados (esperados)

- `backend/src/infrastructure/queue/queue.module.ts`
- `backend/src/config/technical-settings.ts`
- `backend/src/modules/media-access/infrastructure/processors/media-access-membership.processor.ts`
- `backend/src/modules/media-access/application/workspace-groups.service.ts`
- `backend/src/modules/media-access/application/drive-scope-provisioning.service.ts`

## Criterio de aceptación

- Fallos transitorios de Google no rompen consistencia final (eventual).
- Queda rastro claro en logs para auditoría técnica.

---

## Fase 4 — Validación funcional integral (QA técnico)

## Matriz mínima de casos

1. Crear curso sin profesor y sin evaluaciones iniciales.
2. Agregar profesor luego:
   - entra a `cc-<id>-professors`
   - **no** entra a viewers por ese hecho.
3. Quitar profesor:
   - se revoca de `cc-<id>-professors`.
4. Crear evaluación académica (PC/EX/LAB/PD):
   - se provisiona estructura Drive de evaluación.
   - FULL obtiene acceso vía sync asíncrono.
5. Verificar BANCO:
   - existe en BD como evaluación global del curso-ciclo.
   - **no** existe como scope individual en `evaluations` Drive.

## Criterio de aceptación

- Todos los casos pasan en e2e/integración sin pasos manuales ocultos.

---

## Riesgos conocidos y mitigación

### Riesgo 1
Eliminar rutas separadas rompe tests existentes.
- Mitigación: actualizar tests en misma fase y validar suite objetivo.

### Riesgo 2
Permisos Drive existentes en estado legado (reader previo donde se espera writer).
- Mitigación: script puntual de saneamiento de permisos por grupo profesor (si se detecta caso).

### Riesgo 3
Eventos en cola previos a cambios (en entorno activo de dev).
- Mitigación: limpiar cola al iniciar validación integral.

---

## Entregables esperados por fase

- F1: API de creación unificada + tests actualizados.
- F2: Guardas anti-BANCO en capa central + tests de no-provisión.
- F3: Logs/retries/reconciliación afinados.
- F4: reporte de QA técnico con evidencia de casos.

---

## Decisión recomendada

Proceder en orden F1 → F2 → F3 → F4.  
Prioridad máxima: **F2 (blindaje BANCO)** y **F1 (flujo único de creación)**.

