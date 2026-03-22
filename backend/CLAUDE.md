# CLAUDE.md

This file is kept for Claude tooling compatibility.
Primary working contract is `CODEX.md`.

## Priority

When using Claude Code in this repository:

1. Follow `CODEX.md` first.
2. Follow `CONTRIBUTING.md`.
3. Follow existing code patterns.

If a conflict appears, stop and report it.

## Commands

```bash
# Development
npm run start:dev

# Build
npm run build
npm run start:prod

# Lint and format
npm run lint
npm run format

# Tests
npm run test
npm run test:cov
npm run test:e2e
npm run test:e2e:drive-live

# Infra helper
docker compose up -d redis
npm run geoip:update
```

Single test:

```bash
jest --testPathPattern="path/to/file.spec.ts"
```

## Key Rules Snapshot

- No `any`.
- `BIGINT` ids/fks as `string`.
- `synchronize: false`.
- Multi-table writes in `dataSource.transaction(...)`.
- Internal code in English; external messages in Spanish.
- No `console.log`.
- Hybrid config model:
  - `technical-settings.ts` for technical constants/defaults.
  - `system_setting` for runtime-operable values.
- Mandatory verification before delivery:
  - `npm run lint`
  - tests for touched module/scope
