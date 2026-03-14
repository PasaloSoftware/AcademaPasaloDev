# Plan Tecnico de Implementacion del Reporte de Auditoria Masivo

Este documento aterriza la ejecucion tecnica de la estrategia definida en [ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md](/D:/trabajos_profesionales/academia_pasalo/repositorio-desarrollo/AcademaPasaloDev/backend/ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md).

Su objetivo es guiar una implementacion profesional, incremental y segura, minimizando regresiones sobre el backend actual y dejando una ruta de trabajo clara por fases.

Este documento **no define el comportamiento funcional base**. La definicion funcional y operativa ya esta cerrada en el documento de estrategia. Aqui se documenta:

- como organizar la implementacion;
- que areas del backend van a ser impactadas;
- que decisiones tecnicas deben respetarse durante el desarrollo;
- como avanzar por fases sin afectar funcionamiento existente.

## 1. Alcance del Plan

Este plan cubre la implementacion del nuevo flujo de exportacion de auditoria con las reglas ya aprobadas:

- exportacion por defecto sin filtros obligatorios;
- soporte para filtros opcionales;
- corte sincronico / asincrono;
- generacion de multiples excels dentro de un zip para volumen masivo;
- uso de Redis / BullMQ para jobs;
- almacenamiento temporal en EC2;
- bloqueo global de concurrencia para cualquier export de auditoria;
- endpoints de entrada, estado y descarga;
- limpieza de artefactos temporales.

Para los detalles funcionales, umbrales, nombres, reglas de concurrencia y contrato de API, tomar siempre como fuente principal:

- [ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md](/D:/trabajos_profesionales/academia_pasalo/repositorio-desarrollo/AcademaPasaloDev/backend/ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md)

## 2. Objetivo de Implementacion

La implementacion debe lograr que el backend:

- deje de depender del limite actual de 1000 filas;
- deje de construir el archivo completo en memoria para export sincronico;
- pueda producir reportes de gran volumen sin comprometer la estabilidad de la instancia;
- exponga un contrato backend claro para integracion futura con frontend;
- preserve el comportamiento del historial paginado actual mientras se reemplaza solo la exportacion.

## 3. Principio Rector de la Implementacion

La implementacion debe ser **evolutiva, no invasiva**.

Eso implica:

- no mezclar mas logica de historial paginado con logica de export masiva;
- no reescribir de golpe el modulo de auditoria si puede separarse por responsabilidades;
- no introducir acoplamientos innecesarios entre controlador, servicio, repositorio, queue y filesystem;
- no asumir que una optimizacion local sirve para todo el pipeline.

El objetivo no es solo que "funcione", sino que quede:

- mantenible;
- testeable;
- observable;
- segura ante errores operativos.

## 4. Enfoque General por Fases

La implementacion debe dividirse en fases con bajo riesgo y validacion progresiva.

### Fase 1. Separacion conceptual del flujo de export

Objetivo:

- desacoplar la exportacion del flujo actual de historial unificado;
- preparar interfaces y estructuras de datos propias del caso de export.

Resultado esperado:

- el backend sigue funcionando igual;
- pero la exportacion deja de depender conceptualmente del mismo camino que usa la UI para historial.

### Fase 2. Motor de consulta unificado

Objetivo:

- mover la union de `audit_log` y `security_event` al motor SQL;
- soportar conteo y lectura con filtros consistentes;
- dejar de depender de joins y mezcla en Node.js para export.

Resultado esperado:

- existe una fuente de datos unica para export;
- el corte sync / async puede decidirse sobre datos reales;
- la exportacion deja de usar el limite artificial actual.

### Fase 3. Bloqueo global de export

Objetivo:

- proteger el backend contra concurrencia de exports;
- evitar que varios requests de export compitan por BD, CPU, memoria o disco.

Resultado esperado:

- cualquier export concurrente se rechaza tempranamente;
- la proteccion aplica tanto a export sincronico como asincrono.

### Fase 4. Export sincronico

Objetivo:

- implementar el camino de streaming para reportes por debajo del umbral definido en estrategia;
- reemplazar el uso actual de buffer completo.

Resultado esperado:

- menor consumo de memoria;
- mejor tiempo de respuesta inicial;
- mantenimiento del flujo de descarga directa para reportes pequenos.

### Fase 5. Export asincrono

Objetivo:

- implementar el pipeline de jobs para volumenes masivos;
- generar multiples excels y consolidarlos en zip.

Resultado esperado:

- el backend soporta volumen alto sin bloquear el request original;
- el usuario puede obtener el reporte luego de finalizar el procesamiento.

### Fase 6. Estado, descarga y limpieza

Objetivo:

- completar el circuito operativo del job;
- permitir consulta de estado y descarga segura del artefacto;
- evitar acumulacion de residuos temporales.

Resultado esperado:

- el flujo queda cerrrado end-to-end;
- la operacion es sostenible en el tiempo.

### Fase 7. Pruebas, endurecimiento y validacion final

Objetivo:

- asegurar que no haya regresiones;
- validar rendimiento, manejo de errores y comportamiento operativo.

Resultado esperado:

- implementacion lista para integrarse con frontend;
- confianza suficiente para despliegue controlado.

## 5. Areas del Backend que Seran Impactadas

La implementacion afectara principalmente estas capas:

### Modulo de auditoria

Especialmente:

- controlador de auditoria;
- servicio de auditoria;
- repositorios de auditoria / export;
- constantes de auditoria;
- processors relacionados con cola de auditoria;
- DTOs o contratos del flujo de export.

### Modulo de auth

No por funcionalidad, sino por dependencia de la fuente `security_event`.

Debe cuidarse:

- consistencia de lectura;
- formato de datos;
- filtros por fuente / accion.

### Infraestructura de colas

Se reutilizara BullMQ ya presente en el proyecto.

Debe integrarse sin romper:

- jobs existentes de auditoria;
- scheduler de cleanup de logs;
- convenciones de reintento y retencion ya usadas por el proyecto.

### Infraestructura de almacenamiento temporal

Se requiere soporte para:

- escritura del artefacto temporal;
- lectura posterior por descarga;
- limpieza segura;
- manejo robusto frente a archivos faltantes o parciales.

### Capa de pruebas

Habra impacto en:

- unit tests;
- tests de integracion;
- e2e del flujo de auditoria.

## 6. Restricciones que Deben Respetarse

Durante toda la implementacion deben respetarse las restricciones ya validadas en la estrategia:

- solo 1 export de auditoria global a la vez;
- si existe otro export activo o en cola, responder `409`;
- no permitir que varios exports pequenos corran en paralelo;
- mantener `GET /audit/export` como punto de entrada;
- usar endpoints adicionales para estado y descarga;
- usar Redis / BullMQ como metadata operativa del job;
- no introducir persistencia nueva en BD para metadata de job en esta primera version;
- generar un zip en modo asincrono;
- generar excels de una sola hoja;
- partir los excels asincronos por el tamano definido en la estrategia.

Toda implementacion debe alinearse con:

- [ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md](/D:/trabajos_profesionales/academia_pasalo/repositorio-desarrollo/AcademaPasaloDev/backend/ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md)

## 7. Consideraciones de Arquitectura

### Separacion de responsabilidades

La implementacion no debe dejar un `AuditService` monolitico.

La recomendacion es separar al menos conceptualmente:

- consulta unificada de export;
- coordinacion de concurrencia;
- generacion de archivos;
- flujo de jobs;
- descarga y lifecycle del artefacto.

No es obligatorio fragmentar todo en exceso, pero si debe evitarse concentrar demasiadas responsabilidades en un solo servicio.

### Reutilizacion controlada

Se debe reutilizar la infraestructura existente cuando tenga sentido, pero sin forzar acoplamientos que vuelvan mas fragil el modulo.

Ejemplos:

- BullMQ si, porque ya es estandar del backend.
- convenciones de nombres de jobs si, para mantener coherencia.
- uso directo de los repositorios paginados actuales para export masivo, no; eso perpetuaria el cuello de botella.

### Compatibilidad hacia adelante

Aunque esta primera version no persista metadata del job en BD, la implementacion debe quedar estructurada de forma que esa mejora futura sea posible sin rehacer el contrato.

## 8. Orden de Ejecucion Recomendado

Para evitar impactos cruzados, el orden recomendado es:

1. aislar contratos y estructuras de export;
2. construir motor de consulta y conteo unificado;
3. validar indices y comportamiento de BD;
4. introducir bloqueo global;
5. reemplazar export sincronico actual;
6. agregar pipeline asincrono;
7. agregar endpoints de estado y descarga;
8. agregar cleanup y expiracion;
9. endurecer pruebas;
10. recien despues integrar frontend.

Este orden permite detectar problemas de base antes de acoplar todo el flujo asincrono.

## 9. Validacion de Base de Datos

Antes de considerar cerrada la fase del motor de consulta, debe validarse:

- consistencia del conteo;
- consistencia del ordenamiento;
- consistencia del filtrado;
- ausencia de duplicados por joins;
- impacto de la consulta en el caso sin filtros.

Se debe prestar especial atencion al caso mas costoso:

- export global sin `userId` especifico.

La validacion de performance no debe basarse solo en intuicion. Debe verificarse si los indices actuales son suficientes para el nuevo patron de lectura. Esto esta explicado a nivel funcional y operativo en:

- [ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md](/D:/trabajos_profesionales/academia_pasalo/repositorio-desarrollo/AcademaPasaloDev/backend/ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md)

## 10. Consideraciones del Flujo Sincronico

La implementacion del modo sincronico debe perseguir un objetivo tecnico claro:

- dejar de generar el archivo completo como buffer en memoria.

La estrategia ya define que el camino correcto es streaming. A nivel de implementacion, eso implica cuidar:

- apertura del stream;
- escritura incremental;
- cierre correcto del recurso;
- propagacion de errores;
- consistencia de headers HTTP.

La fase sincronica debe quedar completamente funcional antes de iniciar el endurecimiento del modo asincrono.

## 11. Consideraciones del Flujo Asincrono

La implementacion del modo asincrono no debe pensarse como "un export mas lento", sino como un flujo distinto.

Debe contemplar:

- creacion de job;
- observabilidad de estado;
- particionado del dataset;
- generacion de partes;
- empaquetado;
- almacenamiento temporal;
- descarga posterior;
- limpieza de residuos.

La estrategia operativa del zip, nombres de archivo, umbral y reglas de concurrencia ya estan definidas en:

- [ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md](/D:/trabajos_profesionales/academia_pasalo/repositorio-desarrollo/AcademaPasaloDev/backend/ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md)

## 12. Observabilidad y Diagnostico

Una implementacion profesional necesita capacidad minima de diagnostico.

Por tanto, el flujo debe dejar trazabilidad suficiente en logs para identificar:

- inicio del export;
- rechazo por concurrencia;
- decision sync / async;
- conteo total detectado;
- inicio y fin del job;
- numero de partes generadas;
- ruta o clave del artefacto temporal;
- expiracion o borrado;
- errores recuperables y no recuperables.

Esto no implica loggear data sensible ni detalles excesivos, pero si suficiente contexto operativo.

## 13. Seguridad y Control de Acceso

El flujo de export no debe abrir superficies inseguras nuevas.

Durante la implementacion debe verificarse:

- permisos del endpoint de entrada;
- permisos del endpoint de estado;
- permisos del endpoint de descarga;
- validacion de que el admin que consulta un job tenga permiso de verlo;
- comportamiento ante job inexistente, expirado o inconsistente.

Aunque la metadata viva en Redis, el control de acceso sigue siendo una responsabilidad de la aplicacion.

## 14. Estrategia de Errores

La implementacion debe manejar con claridad al menos estos escenarios:

- export concurrente rechazado;
- filtros invalidos;
- job inexistente;
- job en estado no descargable;
- archivo expirado;
- archivo faltante;
- fallo durante generacion de excel;
- fallo durante empaquetado zip;
- fallo durante cleanup.

No es necesario documentar aqui cada codigo de estado ni cada payload, porque eso ya debe alinearse al documento funcional y al estilo del backend, pero si debe asegurarse consistencia semantica entre controlador, servicio y frontend futuro.

## 15. Riesgos Tecnicos Principales

### Riesgo 1. Mezclar export con historial actual

Si la implementacion reutiliza demasiado el flujo actual de historial, se arrastraran:

- limites artificiales;
- sobrecarga de joins;
- mezcla en Node.js;
- riesgo de regresion en la UI paginada.

### Riesgo 2. Resolver demasiado en memoria

Si parte del pipeline vuelve a cargar todo el dataset o el zip completo en RAM, la estrategia pierde valor.

### Riesgo 3. Duplicados por joins a roles

Debe validarse cuidadosamente la semantica de rol para que el reporte no altere el cardinal de filas.

### Riesgo 4. Acoplar demasiado el flujo a filesystem local

Aunque el artefacto temporal vivira en EC2, la implementacion debe anticipar:

- ausencia del archivo;
- limpieza parcial;
- reinicios de proceso;
- condiciones de carrera entre descarga y borrado.

### Riesgo 5. Fase asincrona sin lifecycle completo

No basta con generar el zip; debe quedar resuelto todo el circuito hasta su descarga o expiracion.

## 16. Estrategia de Pruebas

La implementacion debe ir acompanada de pruebas por capas.

### Pruebas unitarias

Deben validar la logica de decision y coordinacion:

- corte sincronico / asincrono;
- rechazo concurrente;
- reglas de particionado;
- nombres de archivo;
- reglas de expiracion.

### Pruebas de integracion

Deben validar:

- query unificada;
- filtros;
- conteo;
- consistencia de columnas;
- ausencia de duplicados funcionales.

### Pruebas end-to-end

Deben validar:

- export directo;
- creacion de job masivo;
- estado del job;
- descarga;
- rechazo concurrente;
- comportamiento de cleanup.

### Validacion operativa

Antes de cerrar el trabajo, debe revisarse:

- estabilidad del consumo de memoria;
- comportamiento frente a datasets de alto volumen;
- comportamiento de la BD en el caso sin filtros;
- integridad del zip final.

## 17. Criterio de Calidad para Dar por Cerrada la Implementacion

La implementacion debe considerarse lista solo si cumple todo esto:

- no rompe el historial actual;
- no deja el backend vulnerable a concurrencia de exports;
- no depende de buffers completos para el camino sincronico;
- completa de punta a punta el flujo asincrono;
- limpia correctamente los artefactos temporales;
- deja trazabilidad operativa suficiente;
- queda cubierta por pruebas relevantes.

## 18. Uso de Este Documento

Este plan debe usarse como guia de trabajo durante la implementacion.

Para cualquier decision funcional, contractual o de operacion que genere duda, la referencia principal sigue siendo:

- [ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md](/D:/trabajos_profesionales/academia_pasalo/repositorio-desarrollo/AcademaPasaloDev/backend/ESTRATEGIA_REPORTE_AUDITORIA_MASIVO.md)

Para implementacion:

- usar este plan como marco de fases;
- tomar el documento de estrategia como fuente de verdad funcional;
- avanzar con cambios pequenos, verificables y reversibles.
