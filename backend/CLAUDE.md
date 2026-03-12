# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev          # Watch mode, API at http://localhost:3000/api/v1

# Build & Production
npm run build
npm run start:prod

# Lint & Format
npm run lint               # ESLint with auto-fix
npm run format             # Prettier

# Tests
npm run test               # Unit tests (spec files in src/)
npm run test:watch
npm run test:cov
npm run test:e2e           # E2E tests, forces STORAGE_PROVIDER=LOCAL
npm run test:e2e:drive-live  # E2E with real Google Drive (STORAGE_PROVIDER=GDRIVE)

# Infrastructure
docker compose up -d redis  # Required before starting the app
npm run geoip:update        # Update GeoIP database (required for security features)
```

To run a single test file: `jest --testPathPattern="path/to/file.spec.ts"`

## Path Aliases

TypeScript path aliases configured in `jest` and `tsconfig`:
- `@/` → `src/`
- `@modules/` → `src/modules/`
- `@common/` → `src/common/`
- `@infrastructure/` → `src/infrastructure/`
- `@config/` → `src/config/`

## Architecture

NestJS REST API following **Modular DDD**. Every module uses a 4-layer structure:
```
src/modules/<domain>/
  presentation/   # Controllers, DTOs
  application/    # Services (use cases)
  domain/         # Entities, value objects, interfaces
  infrastructure/ # Repositories, external adapters, subscribers, processors
```

**Modules:** `auth`, `users`, `courses`, `cycles`, `enrollments`, `evaluations`, `materials`, `events`, `notifications`, `audit`, `settings`, `feedback`, `media-access`

**Shared layers:**
- `src/common/` — Decorators (`@Auth`, `@CurrentUser`), global exception filter, response interceptor, RBAC guards
- `src/infrastructure/` — `database/` (TypeORM config), `cache/` (Redis wrapper), `storage/` (LOCAL/GDRIVE), `queue/` (BullMQ), `geo/` (GeoIP)
- `src/config/technical-settings.ts` — **All operational constants** (TTLs, thresholds, cron patterns, queue config). Never hardcode values — add them here.

**Global behaviors (wired in `src/main.ts`):**
- `AllExceptionsFilter` — All errors return structured JSON
- `TransformInterceptor` — All success responses use `{ statusCode, message, data, timestamp }`
- `ValidationPipe` — `whitelist: true, forbidNonWhitelisted: true, transform: true`

## Hard Rules (from CONTRIBUTING.md)

### Code Style
- **No comments.** Code must be self-explanatory.
- **No `any`.** Strict TypeScript everywhere.
- **BIGINT columns → `string` in TypeScript** (all IDs and FKs).
- Code: **English**. UI messages/errors (external): **Spanish**. Technical log `message` field: **Spanish**. Commits: **Spanish** (imperative, one line).

### Database
- `synchronize: false` always. Entities are mapping-only. Schema changes require manual SQL scripts.
- All multi-table writes must use `dataSource.transaction(...)`.
- Catch specific DB errors (e.g., `ER_DUP_ENTRY`) and throw NestJS semantic exceptions (`ConflictException`, etc.).

### Security & Validation
- All DTOs must include `@MaxLength` matching the SQL column size.
- JWT strategy must validate `isActive` and `sessionStatus` from DB — not just the token signature.
- Auth session lookup for refresh/reauth uses `refresh_token_jti` with pessimistic lock.

### Background Jobs
- Use `QueueModule` (BullMQ + Redis) exclusively for async tasks.
- Retry config and cron patterns must be defined in `technical-settings.ts`.
- All processor logs must include `job: jobName` in the JSON object.
- Mass mutation jobs must write to `audit_log`.

### Logging
- JSON structured logs only. No `console.log`, no emojis.

### Cache
- Use `RedisCacheService` wrapper (`src/infrastructure/cache/redis-cache.service.ts`). Never inject `CacheManager` directly in domain services.
- Use key namespacing for bulk invalidation (e.g., `cache:course:123`).

## Critical Business Logic

### Enrollment System (`src/modules/enrollments/`)
- **FULL** enrollment: grants access to all evaluations in the base cycle + specified historical cycles.
- **PARTIAL** enrollment: grants access only to explicitly listed `evaluationIds`.
- Access window (`access_start_date`/`access_end_date`) is always derived from the **base `courseCycle`** academic period — never per evaluation.
- **`EvaluationSubscriber`** (`src/modules/evaluations/infrastructure/evaluation.subscriber.ts`): on new evaluation insert, auto-grants access to existing active enrollments (FULL for all types; all enrollments for `BANCO_ENUNCIADOS` type).

### Auth & Session Security (`src/modules/auth/`)
- Concurrent session detection returns `PENDING_CONCURRENT_RESOLUTION` — forces user to choose between sessions.
- Impossible travel detection uses Haversine formula; threshold: 800 km/h.
- `device_id` fingerprinting prevents local account sharing.
- Refresh token rotation uses `jti` claim. Each refresh emits a new token with new `jti`; previous token is blacklisted by hash.

## Infrastructure Setup

**Prerequisites before first run:**
1. MySQL 8.0 — create database `academia_pasalo` and run SQL scripts in `db/` manually.
2. Redis — `docker compose up -d redis`
3. `.env` — copy from `.env.example` and fill values.
4. GeoIP — `npm run geoip:update`

**Storage provider** (`STORAGE_PROVIDER` env var):
- `LOCAL` — for development and E2E tests, no Google credentials needed.
- `GDRIVE` — production; requires `GOOGLE_APPLICATION_CREDENTIALS` and `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
