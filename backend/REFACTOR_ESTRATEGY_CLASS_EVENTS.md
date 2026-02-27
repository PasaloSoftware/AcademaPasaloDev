# ESTRATEGIA DE REFACTORIZACIÓN: CLASS EVENTS SERVICE

## Objetivo General
Desacoplar el "God Object" `ClassEventsService` (+1000 LOC) en servicios especializados para mejorar la mantenibilidad, facilitar la integración con Google Calendar y reducir la complejidad de los tests, **sin alterar en absoluto el flujo de negocio ni el comportamiento actual del API.**

## Reglas de Oro
1. **Flujo Intacto:** El comportamiento externo (API, respuestas, efectos en DB/Caché) NO debe cambiar.
2. **Validación Atómica:** Tras cada fase, se DEBEN ejecutar los tests unitarios y E2E para confirmar "Zero Regressions".
3. **Consistencia de Tipos:** Utilizar las interfaces definidas en `src/modules/events/interfaces/`.
4. **Cero Comentarios:** No añadir comentarios en el código, mantenerlo limpio y autodocumentado.

---

## Fase 1: Extracción de Lógica de Permisos (IAM) [COMPLETADA]
**Objetivo:** Crear un servicio dedicado a la autorización para limpiar dependencias externas del servicio principal.

### Pasos Técnicos:
1. Crear `src/modules/events/application/class-events-permission.service.ts`.
2. Mover los siguientes métodos:
   - `checkUserAuthorization`, `checkUserAuthorizationWithUser`, `checkUserAuthorizationForUser`
   - `assertMutationAllowedForEvaluation`, `validateEventOwnership`, `isAdminUser`.
3. Mover las inyecciones de: `UserRepository`, `EnrollmentEvaluationRepository`, `CourseCycleProfessorRepository`, `AuthSettingsService`.
4. Inyectar `ClassEventsPermissionService` en `ClassEventsService` y delegar las llamadas.
5. **Verificación:** Ejecutar `npm run test:e2e -- test/e2e/class-events.e2e-spec.ts`.

---

## Fase 2: Extracción de Scheduling y Bloqueos (Concurrency)
**Objetivo:** Encapsular la lógica de colisiones de horario y bloqueos de base de datos.

### Pasos Técnicos:
1. Crear `src/modules/events/application/class-events-scheduling.service.ts`.
2. Mover la lógica de:
   - `acquireCalendarLock`, `releaseCalendarLock`, `getCalendarLockKey`.
   - Lógica de detección de traslapes (`findOverlap`).
   - Validación de fechas de evaluación (`validateEventDates`).
3. Inyectar en el servicio principal y delegar.
4. **Verificación:** Probar creación de eventos con traslape en E2E para confirmar que el error `409 Conflict` sigue funcionando igual.

---

## Fase 3: Orquestación de Caché (Redis Layer)
**Objetivo:** Centralizar la gestión de llaves e invalidación de índices.

### Pasos Técnicos:
1. Crear `src/modules/events/application/class-events-cache.service.ts`.
2. Mover la lógica de:
   - `invalidateEventCache`, `getRecordingStatusCacheKey`.
   - Gestión de TTLs específicos del módulo.
3. El servicio principal solo llamará a `cacheService.invalidateForEvaluation(id)`.
4. **Verificación:** Confirmar que `my-schedule` se limpia correctamente tras un `PATCH` en E2E.

---

## Fase 4: Separación de Queries (CQRS Lite)
**Objetivo:** Separar las lecturas complejas de las acciones de escritura.

### Pasos Técnicos:
1. Crear `src/modules/events/application/class-events-query.service.ts`.
2. Mover los métodos de lectura:
   - `getMySchedule`, `getGlobalSessions`, `getDiscoveryLayers`.
   - Lógica de agrupación de sesiones globales.
3. Actualizar el `ClassEventsController` para inyectar ambos servicios según el endpoint.
4. **Verificación:** Ejecutar la suite completa de tests del módulo.

---

## Fase 5: Preparación para Google Calendar
**Objetivo:** Dejar el terreno listo para la sincronización externa.

### Pasos Técnicos:
1. Implementar `GoogleCalendarSyncService` (Pendiente de credenciales/configuración).
2. Suscribir este servicio a los cambios realizados en el `ClassEventsService` (Escritura) mediante un sistema de eventos interno (EventEmitter).
