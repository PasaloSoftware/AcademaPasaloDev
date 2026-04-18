# Migraciones DB — Guía corta para DevOps

## Comando clave

```bash
npm run migration:run
```

### Qué hace `migration:run`

1. Lee las migraciones del código (`src/database/migrations`).
2. Revisa la tabla `schema_migrations` en MySQL.
3. Ejecuta solo las migraciones pendientes (ordenadas por timestamp).
4. Registra cada migración ejecutada en `schema_migrations`.

No vuelve a ejecutar migraciones ya registradas.

---

## Comandos disponibles

```bash
# Crear archivo de migración (uso de desarrollo)
npm run migration:create -- <nombre>

# Ver estado de migraciones (ejecutadas / pendientes)
npm run migration:show

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir última migración (solo uso controlado)
npm run migration:revert
```

---

## Nota de baseline

Existe una migración baseline inicial:

- `20260418000000-baseline-existing-production-schema.ts`

Su objetivo es marcar el punto de inicio del historial de migraciones para una BD ya existente.

---

## Integración recomendada en deploy

En despliegue de `main` (producción), ejecutar `migration:run` antes de dejar la nueva versión activa.

Si `migration:run` falla, el deploy debe fallar.
