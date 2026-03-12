# Materials Versioning Refactor Plan

## Objective

Profesionalizar el versionado de materiales para que el historial canónico dependa de `materialId` y no del archivo físico actual, manteniendo compatibilidad hacia atrás en los contratos JSON existentes.

## Non-Negotiable Constraints

- No se deben romper los contratos JSON actuales consumidos por frontend.
- No se usarán migraciones TypeORM.
- Los cambios de esquema deben reflejarse en los scripts SQL base:
  - creación de tabla en el SQL de creación
  - `DROP` correspondiente en el SQL de eliminación
- Cada fase debe validarse antes de avanzar.
- No se asumirán reglas de negocio no confirmadas.

## Current Verified State

- La semántica de negocio actual es correcta:
  - `POST /materials` crea un material nuevo.
  - `POST /materials/:id/versions` crea una nueva versión del mismo material.
- La integración vigente con Google Drive para materiales usa el scope de `media-access`, específicamente la subcarpeta `documentos` de la evaluación.
- El modelo actual usa `file_version` como fuente de versión actual, pero eso no representa de forma canónica el historial por `materialId`.

## Target Model

Separar claramente:

- `material`: documento lógico de negocio.
- `material_version`: historial canónico del documento.
- `file_resource`: archivo físico almacenado y deduplicable.

### Proposed Core Tables

#### material

Mantener el rol actual de documento lógico, pero con puntero explícito a versión actual:

- `id`
- `material_folder_id`
- `class_event_id`
- `material_status_id`
- `display_name`
- `visible_from`
- `visible_until`
- `created_by`
- `created_at`
- `updated_at`
- `current_version_id`

Decisiones cerradas:

- `current_version_id` sera `nullable` en esquema y entidad.
- En flujo normal debe completarse inmediatamente despues de crear la primera version.
- `file_resource_id` se mantiene en `material` como referencia al recurso actual.

#### material_version

Nueva tabla canónica de historial:

- `id`
- `material_id`
- `version_number`
- `file_resource_id`
- `created_by`
- `created_at`
- `restored_from_material_version_id` nullable

Decisiones cerradas:

- `material_version` sera la fuente de verdad del historial por `materialId`.
- `version_number` se calculara por `materialId`, no por `fileResourceId`.

### Required Constraints

- `UNIQUE(material_id, version_number)`
- FK `material.current_version_id -> material_version.id`
- FK `material_version.material_id -> material.id`
- FK `material_version.file_resource_id -> file_resource.id`
- FK `material_version.restored_from_material_version_id -> material_version.id`

## Backward Compatibility Policy

Los endpoints actuales deben mantener el mismo contrato JSON.

### Existing Requests That Must Not Change

- `POST /materials`
- `POST /materials/:id/versions`
- `POST /materials/request-deletion`
- `POST /admin/materials/requests/:id/review`

### Existing Responses That Must Not Change

- `GET /materials/folders/:folderId`
- `GET /materials/class-event/:classEventId`
- `GET /materials/:id/download`
- `GET /materials/:id/authorized-link`
- `GET /materials/:id/last-modified`
- `GET /admin/materials/files`
- `GET /admin/materials/requests/pending`

Nota:
campos como `fileVersionId` o `versionNumber` se mantendrán externamente, aunque internamente pasen a salir de `material_version`.

Decisiones cerradas:

- No se modificara el JSON esperado por frontend en endpoints existentes.
- Los nombres externos heredados se mantendran por compatibilidad.
- El unico contrato nuevo sera el del endpoint de historial.

## Direct Replacement Decision

Decisiones cerradas:

- `file_version` se reemplaza de forma directa.
- No habra convivencia prolongada entre `file_version` y `material_version` como modelos de negocio.
- `file_resource` se mantiene como capa fisica de almacenamiento y deduplicacion.

## Confirmed Impact Surface

### Directly Affected Modules

- `src/modules/materials/application/materials.service.ts`
- `src/modules/materials/application/materials-admin.service.ts`
- `src/modules/materials/domain/material.entity.ts`
- `src/modules/materials/domain/file-version.entity.ts`
- `src/modules/materials/infrastructure/material.repository.ts`
- `src/modules/materials/infrastructure/file-version.repository.ts`
- `src/modules/materials/materials.module.ts`

### Data / Bootstrap / Docs Affected

- `db/creacion_tablas_academia_pasalo_v1.sql`
- `db/eliminar_tablas_academia_pasalo_v1.sql`
- scripts seed de materiales/Drive
- docs de materiales en `/docs`

### Tests Affected

- unit tests de `materials.service`
- unit tests de `materials-admin.service`
- e2e de materiales
- e2e de materials-admin
- e2e de materials-versions
- e2e live de materials-drive

## Phased Strategy

## Phase 0 - Scope Lock

### Goal

Congelar reglas de negocio y alcance antes de tocar código.

### Output

- Confirmación de que:
  - el historial canónico es por `materialId`
  - la restauración futura crea una nueva versión
  - no se rompe el JSON actual
  - no se usan migraciones

### Validation Gate

- Aprobación explícita del enfoque

## Phase 1 - Data Model Design

### Goal

Diseñar el modelo definitivo de persistencia y la estrategia SQL sin ambigüedad.

### Tasks

- Diseñar `material_version`
- Redefinir `material` para referenciar versión actual
- Reemplazar directamente `file_version`
- Diseñar índices y FKs
- Diseñar backfill de datos existentes

### SQL Work

- Agregar `CREATE TABLE material_version` en `db/creacion_tablas_academia_pasalo_v1.sql`
- Agregar `DROP TABLE IF EXISTS material_version` en `db/eliminar_tablas_academia_pasalo_v1.sql`
- Ajustar `CREATE TABLE material` para usar `current_version_id`
- Retirar `file_version` del SQL base operativo

### Validation Gate

- Revisión del esquema final
- Revisión de constraints y orden de creación/eliminación

## Phase 2 - Persistence Refactor

### Goal

Introducir el nuevo modelo en entidades y repositorios sin romper compilación ni contratos.

### Tasks

- Crear entidad `MaterialVersion`
- Crear repositorio `MaterialVersionRepository`
- Adaptar entidad `Material`
- Ajustar módulo de materiales
- Mantener compatibilidad interna temporal donde sea necesario

### Validation Gate

- Proyecto compila
- tests unitarios de repositorio/entidades pasan

## Phase 3 - Business Logic Refactor

### Goal

Mover la lógica de creación y versionado a `material_version`.

### Tasks

- `POST /materials`
  - crea `file_resource`
  - crea `material`
  - crea `material_version` v1
  - apunta `material.current_version_id`
- `POST /materials/:id/versions`
  - crea o reutiliza `file_resource`
  - calcula siguiente `version_number` por `materialId`
  - crea `material_version`
  - actualiza `material.current_version_id`
- Adaptar lectura de versión actual para no depender de `file_version`

### Validation Gate

- unit tests de `materials.service`
- e2e de upload/versioning verdes

## Phase 4 - Dependent Flows Refactor

### Goal

Actualizar flujos dependientes al nuevo modelo sin romper respuestas existentes.

### Tasks

- Admin file listing
- Pending deletion requests metadata
- Hard delete
- Descarga y authorized-link usando siempre la versión actual del material
- Lecturas de folder/class-event manteniendo JSON actual

### Hard Delete Rule

Hard delete debe:

- eliminar el `material`
- eliminar sus `material_version`
- eliminar `file_resource` solo si no queda referenciado por ninguna `material_version`

### Validation Gate

- unit tests de `materials-admin.service`
- e2e admin verdes

## Phase 5 - Version History Endpoint

### Goal

Agregar el endpoint nuevo de historial sin tocar contratos existentes.

### Proposed Endpoint

- `GET /materials/:id/versions-history`

### Expected Response

- `materialId`
- `currentVersionId`
- `currentVersionNumber`
- `versions[]`

Cada item:

- `versionId`
- `versionNumber`
- `isCurrent`
- `createdAt`
- `createdBy`
- `fileResourceId`
- `storageProvider`
- `driveFileId`
- `originalName`
- `mimeType`
- `sizeBytes`

### Validation Gate

- unit tests del historial
- e2e de historial
- revisión de permisos

## Phase 6 - Final Hardening

### Goal

Cerrar el cambio con calidad de producción.

### Tasks

- actualizar docs
- actualizar scripts seed
- limpiar dependencias residuales del modelo viejo
- revisar rendimiento de queries
- revisar integridad de datos

### Final Validation Checklist

- compilación OK
- tests unitarios OK
- e2e relevantes OK
- docs alineadas
- SQL base alineado
- sin ruptura de contratos actuales
- hard delete consistente
- historial correcto por `materialId`

## Closed Decisions

Decisiones ya validadas:

1. Reemplazo directo de `file_version` por `material_version`.
2. Compatibilidad total del JSON actual en endpoints existentes.
3. Sin migraciones; solo scripts SQL base.
4. `material.current_version_id` nullable por diseño tecnico.
5. `material.file_resource_id` se conserva como referencia al recurso actual.

## Working Rule For Execution

No se avanzará a la siguiente fase sin:

- validación funcional
- validación técnica
- revisión de impacto
- confirmación de que no se rompió compatibilidad JSON existente
