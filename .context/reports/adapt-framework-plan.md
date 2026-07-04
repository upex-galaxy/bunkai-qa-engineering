> Generated: 2026-06-29
> Project: Bunkai (BK)
> Status: COMPLETED (2026-06-29)

## Results (Phase 9 close)

- **Created**: `tests/components/api/AtcApi.ts`, `api/schemas/atc.types.ts`, `tests/e2e/auth/smoke.test.ts` (`@critical`).
- **Adapted**: `AuthApi.ts` (signin → `.pat.token`, BK-101/102), `LoginPage.ts` (email-first testids), `auth.types.ts`, `api-auth.setup.ts` / `ui-auth.setup.ts`, fixtures (registered `atc`, dropped `example`), `DataFactory`/`types` (dropped hotel/booking), `config/variables.ts` (auth endpoints), `.env` (owner creds + API_BASE_URL/OPENAPI_SPEC_PATH), `allurerc.mjs` → `Bunkai TMS QA`, `playwright.config.ts` (removed module-example ignore).
- **Deleted**: `ExampleApi/ExamplePage/ExampleSteps`, `example.types.ts`, `example.json`, `module-example/` dirs, leftover UPEX template specs (`dashboard.test.ts`, `user-session.test.ts`).
- **OpenAPI**: synced (40 endpoints), `openapi-types.ts` real.
- **kata-manifest**: regenerated — 3 components, 7 ATCs (BK-101/102/201/202/203), 0 Example.
- **Live verification (staging)**: api-setup ✅, ui-setup ✅, smoke ×2 ✅, `repo:check` exit 0 ✅, `kata:manifest:check` ✅.
- **Genericness scan**: all ADAPTED (no PROJ/UPEX decorators, no Example, no hotel/booking, `@openapi` only in facades, allurerc renamed).
- **CLAUDE.md**: updated §13.1 with resolved auth/entity/OpenAPI/gaps.

### Gaps / owed
- member/admin/viewer users — blocked by Supabase email rate limit; `scratchpad/invite-users.sh` ready when it resets.
- GitHub repo Secrets (`STAGING_USER_EMAIL/_PASSWORD`) for CI — set externally before first CI run.
- LOCAL env creds still placeholder.
- Doc scrub (README/CONTEXT/INSTALLER/docs) → `/sync-ai-memory` (owner-owned, separate pass).

---

> Generated: 2026-06-29
> Project: Bunkai (BK)
> Status (original): APPROVED (user authorized full run — "continúa las fases hasta el final")

# Adapt Framework Plan — Bunkai TMS

## 1. Project Summary

| Field | Value |
|-------|-------|
| Project under test | Bunkai TMS (open-core, multi-tenant SaaS) |
| Stack | Next.js 15 App Router + React 19 + Supabase (Postgres + Auth + RLS) + Tailwind/shadcn + Vercel |
| Project key | `BK` |
| Staging URL | `https://staging-upexbunkai.vercel.app` |
| Production URL | `https://upexbunkai.vercel.app` |
| Default env | `staging` |
| OpenAPI source | URL `https://staging-upexbunkai.vercel.app/api/openapi` (HTTP 200, ~200KB, reachable) |
| Issue tracker | Jira (`acli`), `https://jira.upexgalaxy.com` |
| Main entities | Atc, Module, Project, UserStory, AcceptanceCriterion, Test, Run, Workspace, Token, Environment |

## 2. Auth Strategy — HYBRID (cookie session + Bearer PAT)

`auth-method=supabase-password+otp+cookie+bearer-pat` (from `/qa` page).

- **Signin (existing account)**: `POST /api/v1/auth/signin` `{email, password}` → 200 `{user, session, pat}`. Sets Supabase session cookie `sb-<ref>-auth-token`.
- **PAT**: response includes `pat: { token: "bk_pat_<prefix>.<secret>" }`. Also mintable via `POST /api/v1/tokens` (cookie or Bearer). Header: `Authorization: Bearer bk_pat_...`.
- **Password rule**: `z.string().min(8).max(128)` signup; `min(6)` signin (legacy). No complexity.
- **Refresh**: per-run mint (no auto-refresh). `api-login.ts` mints PAT each run. Accept default; re-run setup when stale.
- **Success indicator**: URL not `/login`; redirect `/projects`. Session cookie present.
- **Test user (staging, owner)**: `bunkai-auto-owner-ec8c39@delgri.resend.app` (created 2026-06-29). Stored `.env` `STAGING_USER_*`.
- **Obstacles**: email OTP confirmation on signup (handled via Resend inbound inbox `@delgri.resend.app`). No 2FA/captcha. Magic-link secondary (skip).

## 3. OpenAPI Strategy

- Source = URL. Command: `bun run api:sync --url https://staging-upexbunkai.vercel.app/api/openapi -t`.
- Outputs `api/openapi.json`, `api/openapi-types.ts` (currently STUB), `api/.openapi-config.json`.
- Facades to create in `api/schemas/`:
  - `auth.types.ts` — adapt to signin/confirm/PAT shape (CheckEmail, Confirm, CreateToken).
  - `atc.types.ts` — `Atc`, `AtcCreateBody`, `AtcUpdateBody`, `AtcSearchResult`, `AtcUsageReport` (first entity).
- `openapi` MCP server: KEEP enabled (API exists). `API_BASE_URL=https://staging-upexbunkai.vercel.app`, `OPENAPI_SPEC_PATH` → `/api/openapi`.

## 4. Identity + Variables

- `.agents/project.yaml`: identity mostly filled (project_name Bunkai, key BK, urls). Remaining `null`s are runtime-cache leaves (epic keys, git integration) — leave.
- `config/variables.ts`: `envDataMap` staging base `https://staging-upexbunkai.vercel.app`, api `/api/v1`. Add `auth.loginEndpoint=/api/v1/auth/signin`, `meEndpoint=/api/v1/me`, `tokenEndpoint=/api/v1/tokens`.
- `.env`: `STAGING_USER_*` populated (owner). `RESEND_API_KEY` set. Add `API_BASE_URL`, `OPENAPI_SPEC_PATH`.
- Env-enum reconciliation: `local | staging` across variables.ts / project.yaml / validateTestEnv.ts / workflows.

## 5. Components — Create / Modify / Delete

| Action | File | Notes |
|--------|------|-------|
| MODIFY | `tests/components/api/AuthApi.ts` | real signin endpoint, `@atc('BK-NNN')`, types from `@schemas/auth.types` |
| MODIFY | `tests/components/ui/LoginPage.ts` | real `login-email`/`login-password`/`login-continue`/`login-signin` testids, `@atc('BK-NNN')` |
| CREATE | `tests/components/api/AtcApi.ts` | first domain component, `/api/v1/atcs` CRUD + search |
| CREATE | `api/schemas/atc.types.ts` | facade from `@openapi` |
| DELETE | `ExampleApi.ts`, `ExamplePage.ts`, `ExampleSteps.ts`, `api/schemas/example.types.ts` | example artifacts |
| DELETE | `tests/e2e/module-example/`, `tests/integration/module-example/` | example specs (PROJ-/UPEX- keys) |
| DELETE | `tests/data/fixtures/example.json` | hotel/booking data |
| MODIFY | `tests/data/{DataFactory,types}.ts` | drop Hotel/Booking, add Atc/UserStory factories; keep User/Credentials |
| MODIFY | `playwright.config.ts` | remove `module-example` testIgnore |

ATC-key rewrite: `PROJ-101/102/103` → `BK-NNN` in AuthApi/LoginPage (Example* deleted).

## 6. Fixtures

Register `AtcApi` in `ApiFixture.ts` + `TestFixture.ts`; remove `ExampleApi`/`ExamplePage`. Alias imports `@api/AtcApi`.

## 7. CI + MCP + Reporting

- `.github/workflows/{regression,sanity,smoke,build}.yml`: env options `local|staging`; secrets `STAGING_USER_EMAIL/_PASSWORD`; smoke filter `@critical`.
- MCP dual-file (`.mcp.json` + `opencode.jsonc`): keep `openapi` + `dbhub`; set `API_BASE_URL`/`OPENAPI_SPEC_PATH`.
- `dbhub.toml`: Supabase Postgres — set `DBHUB_*` if DB validation needed (else disable dbhub MCP). DECISION GAP: DB creds not yet provided.
- `allurerc.mjs`: rename `Agentic QA Boilerplate` → `Bunkai TMS QA`.

## 8. Implementation Phases → maps to Phases 3-8 of /adapt-framework.

## 9. First smoke test

`tests/e2e/auth/smoke.test.ts` tagged `@critical`: login as owner via LoginPage → assert lands on `/projects`. API smoke: `tests/integration/atc/` GET atcs.

## 10. Discovery Gaps

- DB validation creds (`DBHUB_*`) not provided → dbhub MCP may stay disabled until user supplies.
- Invited users (member/admin/viewer) — invite flow being verified separately; may skip if incomplete.
- OTP email template mislabels 8-digit code as "6-digit" (cosmetic bug in target; not QA-repo concern).
- `LOCAL_USER_*` still placeholder — local env not provisioned (staging-only for now).

## 11. Genericness Baseline (Phase 0 snapshot — what this run closes)

GENERIC at start: Example components, hotel/booking data, PROJ- ATC keys, openapi-types STUB, allurerc name, first entity missing.
ADAPTED at start: .context business maps, project.yaml identity, variables.ts URLs, staging owner user.
