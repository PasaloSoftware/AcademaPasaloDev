# CONTRIBUTING

## Golden Rules (Hard Rules)

Any code that violates these rules must be rejected.

### 1) Clean Code And Typing

- No `any` in this project.
- Keep code self-explanatory.
- Comments are forbidden in routine/business code.
- Exception: comments are allowed in `src/config/technical-settings.ts` for traceability.
- `BIGINT` ids and foreign keys must be represented as `string` in TypeScript.
- Respect project formatter and linter configuration.

### 2) Language

- Internal code identifiers: English.
- Technical log `message`: Spanish.
- External API messages (`message` and user-facing errors): Spanish.
- Commit messages: Spanish, imperative, single line.

### 3) Architecture And Persistence

- Follow Modular DDD boundaries:
  - `presentation`
  - `application`
  - `domain`
  - `infrastructure`
- Structured JSON logs only. Do not use `console.log`.
- Multi-table writes or integrity-sensitive writes must run inside `dataSource.transaction(...)`.
- `synchronize: false` is mandatory. Entities are mapping only.
- Map known database errors to semantic NestJS exceptions.

### 4) Configuration Policy (Hybrid)

- `src/config/technical-settings.ts`:
  - technical defaults and code-level constants.
- `system_setting` table (through `SettingsService` and repository):
  - runtime-operable business values that may be changed from frontend/admin flows.
- Hardcoding is forbidden when a value belongs to one of the two channels above.

### 5) Security And Validation

- DTO validation with `class-validator` is mandatory.
- Persisted string fields must include size limits aligned with SQL schema.
- Never trust only JWT signature.
- Authentication flow must validate user active state and session state.
- Keep refresh token rotation and `jti` validation guarantees.

### 6) Background Jobs

- Use `QueueModule` (BullMQ + Redis) for async workflows.
- Retry/backoff and scheduler defaults must live in `technical-settings.ts`.
- Processor logs must include job context.
- Mass mutation jobs must leave audit trace.

### 7) Mandatory Quality Gate

Before delivering any change:

1. Run `npm run lint`.
2. Run tests for the touched module/scope (unit/integration/e2e as needed).
3. Confirm no rule violations from this file.
4. Report what was executed and results.

If lint/tests cannot run, explicitly report why and what remains unverified.
