# Estrategia de Reporte de Auditoria Masivo (Arquitectura 2026)

Este documento define la estrategia tecnica para exportar reportes de auditoria en formato Excel (.xlsx) de forma segura y escalable dentro del backend actual. El objetivo es soportar desde pocas filas hasta volumenes masivos sin comprometer la estabilidad del servidor EC2 ni la disponibilidad general de la API.

## 1. Problema Actual Confirmado

La implementacion actual del endpoint de exportacion:

- esta limitada explicitamente a **1000 filas**;
- mezcla datos de `audit_log` y `security_event` en Node.js;
- construye el archivo completo en memoria;
- devuelve un `Buffer` completo antes de responder.

Esto genera cuatro riesgos reales:

- **Consumo de RAM**: el enfoque de buffer completo no escala a volumenes altos.
- **Timeouts**: el navegador o el proxy pueden cortar la conexion antes de terminar la construccion del archivo.
- **Carga innecesaria en Node.js**: el backend hoy une, ordena y transforma la data fuera de la BD.
- **Riesgo operativo**: multiples exports concurrentes pueden castigar simultaneamente BD, CPU, I/O y memoria.

## 2. Objetivo de la Solucion

Implementar una estrategia de exportacion que:

- soporte descarga por defecto de toda la auditoria, incluso sin filtros;
- soporte filtros opcionales (`startDate`, `endDate`, `userId`, `source`, `actionCode`);
- mantenga un camino rapido para reportes pequenos;
- derive automaticamente a procesamiento asincrono cuando el volumen lo requiera;
- limite la concurrencia global para proteger la base de datos y el servidor.

## 3. Principios Tecnicos

### A. Unificacion en SQL

La data no debe seguir mezclandose en Node.js para export masivo.

Se implementara una consulta unificada basada en **SQL raw + UNION ALL** entre:

- `audit_log`
- `security_event`

La consulta debe:

- normalizar columnas comunes;
- aplicar filtros desde SQL;
- devolver la data ordenada por `event_datetime DESC`;
- servir tanto para `COUNT(*)` como para lectura por tramos.

### B. Dos caminos de ejecucion

La exportacion tendra dos modos:

- **Modo sincronico** para reportes menores a 100,000 filas.
- **Modo asincrono** para reportes de 100,000 filas o mas.

### C. Proteccion operativa global

Se permitira **solo 1 export de auditoria a la vez en toda la plataforma**, sin importar si el nuevo intento seria pequeno o masivo.

Si ya existe un export `queued` o `active`, cualquier nuevo request de export debe responder:

- **409 Conflict**
- mensaje funcional indicando que ya existe una exportacion en proceso y que debe intentarse mas tarde.

Esta restriccion existe para evitar picos simultaneos sobre:

- MySQL
- CPU del backend
- memoria
- disco temporal
- generacion de Excel

## 4. Reglas de Negocio Confirmadas

| Concepto | Valor |
| :--- | :--- |
| Umbral sincronico | Menor a 100,000 filas |
| Salto a asincrono | 100,000 filas o mas |
| Tamano por archivo Excel | 100,000 filas maximo |
| Formato en asincrono | Un `.zip` con multiples `.xlsx` |
| Hojas por Excel | 1 hoja por archivo |
| Concurrencia global | 1 export de auditoria total a la vez |
| Estado concurrente | Rechazar nuevos intentos con `409 Conflict` |
| Persistencia de metadata del job | Redis / BullMQ |
| Almacenamiento del archivo temporal | Disco local en EC2 |
| Limpieza del archivo | Al descargar o por TTL de 1 hora |

## 5. Contrato de API Recomendado

El front puede mantener **un solo boton de descarga**, pero el backend debe tener un contrato claro para ambos caminos.

### Endpoint de entrada

`GET /audit/export`

Comportamiento:

- Si el total es menor a 100,000 filas:
  - responde directamente el `.xlsx`.
- Si el total es 100,000 filas o mas:
  - crea job asincrono;
  - responde `202 Accepted`;
  - devuelve `jobId`, `status` y mensaje.
- Si ya existe otro export en proceso:
  - responde `409 Conflict`.

### Endpoint de estado

`GET /audit/export-jobs/:id`

Estados esperados:

- `queued`
- `processing`
- `ready`
- `failed`
- `expired`

### Endpoint de descarga

`GET /audit/export-jobs/:id/download`

Comportamiento:

- descarga el `.zip` cuando el job este listo;
- si el recurso ya fue eliminado, devuelve error funcional;
- al terminar la descarga, se elimina el artefacto o se deja expirar por TTL de 1 hora, lo que ocurra primero segun la implementacion.

## 6. Filtros Soportados

El sistema debe soportar:

- `startDate`
- `endDate`
- `userId`
- `source`
- `actionCode`

Consideraciones:

- La exportacion por defecto debe funcionar **sin filtros**.
- El caso sin `userId` significa reporte global de auditoria para toda la plataforma.
- Todos los filtros deben aplicarse desde SQL, no post-filtrarse en Node.js.

## 7. Estructura del Reporte

Columnas:

`FECHA Y HORA | USUARIO | CORREO | ROL | ACCION | CODIGO | FUENTE | IP | NAVEGADOR`

Reglas:

- **Jerarquia de rol**: `lastActiveRole` -> `roles[0]` -> `Sin Rol`
- `FUENTE` debe diferenciar claramente `AUDITORIA` y `SEGURIDAD`
- `IP` y `NAVEGADOR` pueden venir vacios para eventos que no los tengan

## 8. Estrategia de Archivos

### Export sincronico

Nombre recomendado:

- `reporte-auditoria_YYYY-MM-DD_HH-mm-ss.xlsx`

Ejemplo:

- `reporte-auditoria_2026-03-14_15-42-10.xlsx`

### Export asincrono

Archivo final:

- `reporte-auditoria-masivo_YYYY-MM-DD_HH-mm-ss.zip`

Ejemplo:

- `reporte-auditoria-masivo_2026-03-14_15-42-10.zip`

Archivos internos dentro del zip:

- `reporte-auditoria_parte-001_de-020.xlsx`
- `reporte-auditoria_parte-002_de-020.xlsx`
- `reporte-auditoria_parte-003_de-020.xlsx`

Justificacion:

- un solo archivo descargable para el usuario;
- nombres ordenables alfabeticamente;
- trazabilidad clara de cuantas partes existen;
- evita exponer filtros largos o sensibles en el nombre.

## 9. Estrategia Sincronica (< 100k)

Para el camino sincronico:

- usar `ExcelJS` en modo `WorkbookWriter` o equivalente de streaming;
- escribir directamente al `Response`;
- evitar `writeBuffer()` completo;
- evitar arreglos gigantes en memoria;
- comenzar la respuesta lo antes posible.

Ventajas:

- mejor TTFB;
- uso acotado de RAM;
- UX inmediata para reportes pequenos.

## 10. Estrategia Asincrona (>= 100k)

Para el camino asincrono:

- hacer `COUNT(*)` unificado primero;
- crear job BullMQ en Redis;
- generar multiples `.xlsx` de hasta 100,000 filas;
- empaquetarlos en un solo `.zip`;
- guardar temporalmente el `.zip` en disco local del EC2;
- permitir descarga posterior por endpoint dedicado.

### Por que zip y no multiples descargas

Se elige `.zip` porque:

- el front maneja un solo archivo;
- el usuario descarga una sola vez;
- simplifica el contrato;
- evita coordinar multiples descargas secuenciales;
- encapsula bien los casos de 2M+ filas.

## 11. Redis / BullMQ

La metadata operativa del job vivira en Redis a traves de BullMQ.

No se requiere persistir metadata del job en base de datos para esta primera version.

Se reaprovechara la configuracion ya existente del proyecto para:

- reintentos;
- `removeOnFail`;
- `removeOnComplete`;
- consulta de estado del job.

El flujo esperado es:

- crear job;
- consultar estado;
- descargar cuando este listo;
- limpiar archivo temporal;
- dejar expirar o eliminar job segun las politicas BullMQ ya configuradas.

## 12. Estrategia de Limpieza

El artefacto temporal asincrono debe eliminarse:

- idealmente despues de una descarga exitosa;
- y como respaldo por TTL de 1 hora.

Esto evita:

- acumular zips antiguos en EC2;
- consumo innecesario de disco;
- artefactos obsoletos accesibles por demasiado tiempo.

Tambien debe considerarse limpieza si:

- el job falla luego de crear archivos parciales;
- el proceso es cancelado;
- el recurso expira sin ser descargado.

## 13. Riesgos Tecnicos a Considerar Antes de Implementar

### A. Indices

Hoy existen indices compuestos por `(user_id, event_datetime)` en:

- `audit_log`
- `security_event`

Eso ayuda cuando el filtro por usuario existe, pero no necesariamente optimiza el caso mas pesado:

- export global sin `userId`
- filtrado por fecha
- ordenamiento masivo por `event_datetime`

Por eso debe evaluarse si hacen falta indices adicionales orientados al reporte masivo, por ejemplo sobre:

- `event_datetime`
- `event_datetime, user_id`
- o variantes que se validen con `EXPLAIN`

### B. Joins que multiplican filas

Debe cuidarse la resolucion de rol y usuario para no duplicar registros por joins a `roles`.

### C. Rechazo de concurrencia

El bloqueo global debe cubrir tanto:

- export sincronico;
- como export asincrono.

No debe permitirse que varios exports pequenos se ejecuten en paralelo, porque igualmente castigan la BD.

### D. Reinicio del proceso

Como la metadata del job no ira en BD:

- Redis es suficiente para esta version;
- pero debe asumirse que un reinicio de proceso o perdida del artefacto temporal puede dejar jobs invalidos;
- el endpoint de descarga debe responder con error funcional si el archivo ya no existe.

## 14. Fases de Implementacion

### Fase 1: Motor de consulta unificado

- SQL raw con `UNION ALL`
- normalizacion de columnas
- filtros nuevos
- conteo previo (`COUNT(*)`)
- validacion de ordenamiento y deduplicacion

### Fase 2: Bloqueo global de export

- deteccion de job `queued` o `active`
- rechazo con `409 Conflict`
- mensaje funcional consistente

### Fase 3: Export sincronico

- streaming del `.xlsx`
- eliminacion del buffer completo
- respuesta directa al cliente

### Fase 4: Export asincrono

- job BullMQ
- generacion de multiples excels
- empaquetado zip
- guardado temporal en EC2

### Fase 5: Estado y descarga

- endpoint de estado
- endpoint de descarga
- expiracion y limpieza

### Fase 6: Pruebas

- pruebas unitarias del corte sync/async
- pruebas del rechazo concurrente
- pruebas del zip multiarchivo
- pruebas de cleanup
- pruebas e2e del contrato completo

## 15. Resultado Esperado

Al terminar esta estrategia, el sistema podra:

- exportar auditoria completa o filtrada;
- responder rapido para reportes pequenos;
- manejar volumen masivo con zip multiarchivo;
- proteger la estabilidad del backend con bloqueo global;
- dejar un contrato claro y sostenible para frontend y backend.
