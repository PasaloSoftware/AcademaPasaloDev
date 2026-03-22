# CODEX.md

This document defines the working contract for Codex in this repository.

## 1) Mission And Scope

- Build and maintain a production-grade educational backend with professional quality from the first pass.
- Keep architecture boundaries, security guarantees, and data integrity as non-negotiable.
- Default behavior: implement and verify changes end-to-end, not partial drafts.

## 2) Rule Precedence

1. `CODEX.md`
2. Task-specific constraints explicitly provided by the user in the current request
3. `CONTRIBUTING.md`
4. Existing implementation patterns in the codebase

If rules conflict, stop and report the conflict before proceeding.

## 3) Architecture Guardrails

- Stack: NestJS + TypeORM + MySQL + Redis + BullMQ.
- Follow Modular DDD structure per module:
  - `presentation/`
  - `application/`
  - `domain/`
  - `infrastructure/`
- Do not bypass layers (for example, controllers must not access repositories directly).
- Reuse existing module patterns before introducing new abstractions.
- DDD is pragmatic in this codebase:
  - Cross-module collaboration is allowed when justified by business flow.
  - Prefer application-service orchestration and explicit contracts.
  - Avoid tight coupling to another module's infrastructure internals.
  - If introducing a new cross-module dependency, document the reason in delivery notes.

Current modules in `src/modules/`:
`audit`, `auth`, `courses`, `cycles`, `enrollments`, `evaluations`, `events`, `feedback`, `materials`, `media-access`, `notifications`, `settings`, `users`.

## 4) Non-Negotiable Engineering Rules

- `any` is forbidden.
- Database `BIGINT` ids and foreign keys must be `string` in TypeScript.
- `synchronize: false` is mandatory.
- Multi-table writes must use `dataSource.transaction(...)`.
- Database errors must be mapped to semantic NestJS exceptions.
- No `console.log`; use structured logs.
- Internal code identifiers in English.
- External API messages in Spanish.
- Commit messages in Spanish, imperative, one line.

## 5) Configuration Policy (Hybrid, Mandatory)

Configuration is hybrid and must remain explicit:

- `src/config/technical-settings.ts`:
  - Technical defaults and code-level constants.
  - Infrastructure settings (cache TTLs, queue, retries, cron defaults, upload limits, etc.).
- `system_setting` table (via `SettingsService` / `SystemSettingRepository`):
  - Runtime-operable values that may be managed from frontend/admin flows.

Do not hardcode values when they belong to either configuration channel.

## 6) Validation And Security Minimums

- DTO validation with `class-validator` is required.
- Use `@MaxLength` aligned with SQL schema limits for persisted strings.
- JWT signature validation alone is not enough:
  - Validate active user state.
  - Validate active session state against database/session services.
- Refresh token handling must preserve rotation and `jti` checks.

## 7) Comments Policy

- Default: no comments in business logic or routine code.
- Exception allowed in `technical-settings.ts` for traceability of constants and source mapping.
- Short technical comments are acceptable only when they prevent ambiguity in non-obvious code.

## 8) Execution Protocol (Strict)

For every non-trivial change, Codex must:

1. Read affected contracts first (DTOs, entities, service interfaces, module wiring).
2. Implement minimal coherent changes that preserve layer boundaries.
3. Self-review before running commands:
   - rule compliance (`any`, layering, config, language, logging)
   - regression risk
   - missing validation/transaction/error mapping
4. Run mandatory verification:
   - `npm run lint`
   - module-specific tests for the touched scope (unit/integration/e2e as applicable)
5. Report clearly:
   - files changed
   - commands executed
   - pass/fail results
   - residual risks or gaps

## 9) Quality Gate (Definition Of Done)

A task is not done unless all are true:

- Architecture rules respected.
- Mandatory lint passed.
- Mandatory tests for touched module passed.
- No unresolved TODOs left by the agent.
- Response includes explicit validation status.

## 10) Canonical Commands

```bash
# Development
npm run start:dev

# Build
npm run build
npm run start:prod

# Lint / format
npm run lint
npm run format

# Tests
npm run test
npm run test:cov
npm run test:e2e
npm run test:e2e:drive-live
```

Run a specific test file:

```bash
jest --testPathPattern="path/to/file.spec.ts"
```

## 11) Source Of Truth References

- `src/main.ts`
- `src/config/technical-settings.ts`
- `src/infrastructure/database/database.module.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/auth/application/session-validator.service.ts`
- `src/modules/settings/application/settings.service.ts`
- `src/modules/settings/infrastructure/system-setting.repository.ts`

## 12) Out Of Scope For This File

- Historical architecture decisions and ADR timelines
- Deep module-specific procedures (move to skills)
- Long business-domain documentation (keep in dedicated docs)

## 13) Compact Reporting Protocol (Token Saving)

Delivery reports must be concise and adaptive to task complexity.

- Always include:
  - what was done
  - what was validated (`lint` + touched module tests)
  - key risks or explicit confirmation of no known risk
- Include only high-value details that help decisions; avoid verbose narration.
- Structure can vary by task, but must remain easy to scan.
- If work is documentation-only, explicitly say `Code runtime impact: none`.

## 14) Engram Memory Protocol (Professional Standard)

### 14.1 Objective

Use Engram as persistent engineering memory to reduce rework, preserve decisions, and keep consistency across sessions and projects.

### 14.2 What Must Be Saved

- Architecture/design decisions and tradeoffs.
- Bug fixes with root cause and applied correction.
- Configuration and environment changes.
- New conventions/patterns adopted by the team.
- Non-obvious discoveries that affect implementation or operations.

### 14.3 What Must Not Be Saved

- Raw logs, command noise, and temporary debug output.
- Minor edits without architectural or operational impact.
- Duplicated information already captured in recent memory.

### 14.4 Save Triggers (Mandatory)

Codex must save memory immediately after:

1. Closing a significant bugfix.
2. Making or changing a technical decision.
3. Completing meaningful config/infrastructure changes.
4. Establishing or updating a reusable development pattern.

At session close, Codex must save a concise session summary.

### 14.5 Required Memory Format

Every significant memory must use:

- **What**
- **Why**
- **Where**
- **Learned** (optional but recommended)

### 14.6 Retrieval Flow Before Acting

When user asks to recall previous work, or when the task may depend on past decisions:

1. Read recent context first.
2. Search memory by topic keywords.
3. Open full observation only when needed.
4. Prefer latest valid decision when conflicts exist; if ambiguous, report and ask.

### 14.7 Scope And Hygiene

- Default scope: project.
- Use stable topic grouping for evolving decisions.
- Keep entries concise and actionable.
- Avoid memory spam; quality over quantity.

## 15) Skill Selection Policy (Auto + Guided)

- Codex should auto-select the most suitable skill when task context clearly matches.
- Codex must explicitly state why a skill was selected before execution.
- If user requests a skill that is not optimal, Codex must:
  1. acknowledge the requested skill,
  2. explain the mismatch briefly,
  3. suggest the best alternative skill,
  4. continue with user-approved option.
- Skill names must remain short, clear, and easy to call.
- Prefer one primary skill per task; add secondary skill only when justified.
