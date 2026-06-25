# BK-18 — Test Session Memory

> Cross-stage shared payload for the 4 sub-agent dispatches (Session Start → Stage 1 → Stage 2 → Stage 3). Hand-authored, NON-Jira. Do not put Jira-mirrored content here.

## TMS Modality

**jira-xray** (user-specified at invocation). ATP/ATR materialize as Xray `Test Plan` / `Test Execution` issues; TCs as Xray `Test` issues. Writes via `/acli` (Jira) + `/xray-cli` (Xray entities). Detailed reads via `bun run jira:sync-issues`.

## Ticket

- **Key**: BK-18 · Story · 5 SP · Priority Medium · Status **Ready For QA**
- **Title**: TMS-ATC API | Create and edit ATCs with steps and assertions
- **Epic**: BK-13 (ATC Library) · Wave 2
- **Spec**: FR-010a (server surface only — UI is BK-19)
- **Labels**: api, atc, backend, mvp, shift-left-2026-05-27, **shift-left-reviewed**, wave-2

## Surfaces in scope

- **API** — `POST /api/v1/atcs` (201), `PATCH /api/v1/atcs/{id}` (200). Both deployed on staging (probed 401 = auth-gated, exists).
- **DB** — transactional rollback verification (count `atcs` / `atc_steps` / `atc_assertions` before/after), slug uniqueness, version increment, `activity_log` event rows. Via DBHub MCP (`staging-dbhub`).
- **UI** — OUT (no UI in this story; UI is BK-19).
- **Code-review** — read `app/api/v1/atcs/route.ts`, `[id]/route.ts`, migration `0021_atc_create_update.sql` to reconcile contract vs implementation.

## Environment

- **Active env**: staging (project.yaml default).
- WEB_URL: https://staging-upexbunkai.vercel.app
- API base (real path): https://staging-upexbunkai.vercel.app/api/v1
- No WEB_URL_OVERRIDE / API_URL_OVERRIDE set.
- Implementation confirmed landed: route files (Jun 8), migration 0021, openapi paths 23→25.

## Implementation verification (2026-06-08) — CONFIRMED IMPLEMENTED

BK-18 IS implemented at the API layer. Evidence:
- Route handlers exist + complete: `app/api/v1/atcs/route.ts` (POST), `[id]/route.ts` (PATCH) — auth `requires:['atc:write']`, Zod validation, `stepPositionsError`, RPC calls (`createAtc`/`updateAtc`/`getAtc`), If-Match optimistic lock, empty-body no-op.
- Migration `0021_atc_create_update.sql` present.
- OpenAPI paths registered (23→25).
- Live staging contract behavior verified: POST no-auth → 401; POST read-token → 403 `forbidden` "Missing required capability: atc:write"; GET → 405 (route exists, GET is BK-20). Scope gate runs correctly.
- **UI has no create button by design** — that is BK-19 (ATC builder UI, status Estimation, NOT shipped). UI empty-state literally says "ATCs arrive with the builder next sprint." BK-18 is testable **only via API**.

## Auth — RESOLVED (2026-06-08)

- Minted full-scope PAT for **openapi-testing** via `STAGING_USER_EMAIL=openapi-testing@delgri.resend.app STAGING_USER_PASSWORD=<provided> bun run api:login staging` (inline override, `.env` role creds untouched).
- New `.env API_TOKEN` = prefix `bk_pat_X6q2mW2Q...`. Verified: POST empty body → **422 validation_failed** (scope gate passes → has `atc:write`). Actor IS member of "Openapi Test Project" workspace.
- POST required fields (from 422): `title` (str 3..200), `layer` ∈ {UI,API,Unit}, `steps[]` (min 1), `acceptance_criterion_ids[]` (min 1), `module_id` (uuid), `user_story_id` (uuid). `assertions[]` / `tags[]` optional.
- Testing via curl reads `.env` fresh — no agent restart needed.
- NOTE: signin PAT cache hint 3600s (session JWT); DB cli-signin PATs are no-expiry. Re-mint with same command if 401 appears.

## Auth — BLOCKER for write path (historical — now resolved above)

- Endpoints require Bearer PAT scope **`atc:write`** (`atc:read` → 403).
- `.env` `API_TOKEN` = token `demo-openpai-testing` (prefix `5WgDCUTX9-Nw`), scopes **`[atc:read]` ONLY**, expires 2026-06-09. CANNOT create/edit ATCs.
- A separate token `openapi-testing` (prefix `12sUFSY594Rj`) has full scopes incl `atc:write` but secret is hashed (not recoverable) + expires 2026-06-09.
- **Fix**: `bun run api:login:staging` (script `scripts/api-login.ts`) mints a fresh PAT via headless signin using `STAGING_USER_*` creds (= `***@delgri.resend.app`, same openapi-testing user) → writes full-scope token to `.env API_TOKEN`. cli-signin tokens carry `[atc:read, atc:write, run:execute, workspace:admin]`. Testing via curl reads `.env` fresh — no agent restart needed (OpenAPI MCP would need restart, but curl path doesn't).
- DBHub creds present (`DBHUB_*`), DB reachable.

## Test data — READY (staging seed, project "Openapi Test Project")

- project_id: `269850ea-a759-44a1-a45e-3a6187cac5ec` (slug `openapi-test-project`)
- user_story (FSX-45 "Add Support for American Express CC"): `b1f68acf-855a-4320-95f0-e81df5e948c3`
- module "Billing": `e4e42a7d-dd0d-4eb2-8bc2-6b2e313c6032` (path `billing`)
- module "Credit Cards": `8da2b639-5e65-4c91-9238-e92d0977d484` (path `billing/credit-cards`)
- ACs AC1–AC7 exist under the US (IDs to fetch in Stage 1 for happy-path + cross-US negative).
- Still need for negatives: a SECOND US (cross-US AC) + a module in a DIFFERENT project (cross-subtree). Confirm/seed in Stage 1.

## Key contract decisions (from Shift-Left ATP 2026-05-27)

- Slug: `<module-slug>/atc-<8 hex>` immutable. Regex `/^[a-z0-9-]+\/atc-[a-z0-9]{8}$/`.
- PATCH = full-replace (PUT-style); omitted children cleared. Empty body `{}` = no-op 200, no version bump, no event.
- Optimistic lock: `If-Match: <version>` header. Absent = skip. Mismatch = 409 `conflict`.
- New error codes: `ac_outside_user_story`(422), `module_outside_project_subtree`(422), `steps_position_invalid`(422), `slug_collision`(409).
- `user_story_id` / `module_id` / `slug` immutable on PATCH.
- `affected_test_ids: []` always in MVP (`test_steps` table not migrated yet — EPIC-BK-5).
- RPCs: `bunkai_create_atc` (returns uuid), `bunkai_update_atc` — both SECURITY DEFINER, take explicit `p_actor_user_id`.
- Events → `activity_log` (NOT `event_log`): `atc.created` / `atc.updated`.

## ATP scenario inventory (from Shift-Left)

13 Gherkin scenarios: Happy 2 / Negative 7 / Boundary 2 / Integration 2. 14 edge cases (6 High / 5 Med / 3 Low). Story is `shift-left-reviewed` (12 days old) → Stage 1 short-circuits Phases 1-3 of acceptance-test-planning.md, continues from Phase 4.

## Stage state

| Stage | Status | Notes |
|---|---|---|
| Session Start | completed | artifacts written |
| Stage 1 Planning | completed | short-circuit P1-3 (shift-left-reviewed); ATP=BK-94 + ATR=BK-95 created + linked. 14 TC drafts. Cache materialization BLOCKED (see below). |
| Stage 2 Execution | completed | Smoke PASS (201, DB-verified). 12/13 scenarios PASS, 1 FAIL (H2 PATCH happy path → 412 instead of 200, but commits). 1 Major non-blocking bug. DB rollback + slug-uniqueness + cleanup all verified. |
| Stage 3 Reporting | completed | ATR body published to BK-95 description (md-to-adf, round-trip verified). Bug **BK-96** filed (Major, all custom fields set) + linked Relates BK-18. QA comment (Template B FAILED) posted on BK-18. BK-18 transitioned In Test → BLOCKED via `defect_reported`. ATR cache materialization BLOCKED (Test Execution not in work_types — known config gap). Recommend NOT QA Sign-Off until H2 status-code fixed. |

## TMS Artifacts (Stage 1)

| Artifact | Key | Title | Link to BK-18 |
|---|---|---|---|
| Test Plan (ATP) | **BK-94** | [ATP] BK-18 — ATC create/edit REST API | BK-18 *is tested by* BK-94 (Test) ✓ |
| Test Execution (ATR) | **BK-95** | [ATR] BK-18 — ATC create/edit REST API | BK-18 *is tested by* BK-95 (Test) ✓ |
| Bug (Stage 3) | **BK-96** | ATC Library: ATC PATCH API: Happy-path PATCH /atcs/{id} returns 412 instead of 200 though the edit commits | BK-96 *Relates* BK-18 ✓ (Severity Mayor, Error Type Functional, Env Staging, Root Cause Code Error, Fix Bugfix; labels api/atc/bug) |

- ATP body (risk triage + 14 TC drafts + test-data) authored as Markdown → md-to-adf → BK-94 description. ATR is an empty placeholder (Stage 2 fills runs).
- Link direction verified via REST: both show `BK-18 [is tested by] BK-94/BK-95`.
- **Cache materialization BLOCKED** — `bun run jira:sync-issues get BK-94/BK-95` skips them: issue types `Test Plan` / `Test Execution` are NOT declared under `work_types:` in `.agents/jira-required.yaml`. Syncing the Story (`get BK-18`) also does not override `acceptance-test-plan.md` with the BK-94 body for the same reason (registry has no `role: atp`/`atr` entry → `classifyCoverageLinks` skips the links). The synced `acceptance-test-plan.md` still holds the OLD Shift-Left custom-field copy, NOT the new BK-94 ATP. Fix = owner adds `test_plan` (role: atp, container, coverable) + `test_execution` (role: atr) entries to `.agents/jira-required.yaml`, then re-run `bun run jira:sync-issues get BK-18`. Did NOT hand-write the caches (rule).

## Stage 1 — Planning results

- **Risk distribution** (13 ATP scenarios → 14 outlines): **P0=6, P1=5, P2=2**. P0 = anchoring-moat validation (AC→US `ac_outside_user_story`, module→subtree `module_outside_project_subtree`), transactional rollback (zero rows), auth 401, scope 403, happy-path create 201.
- **TC draft count**: 14 (Happy 2 / Negative 6 / Boundary 2 / Integration 2 — rollback split into its own DB-count outline). Drafts only; formal Xray `Test` issues = Stage 4.
- **AC IDs (staging, US b1f68acf...)**: AC1 `58f143d1-7522-4933-bbc6-2db7d4493436`, AC2 `f087fcca-5076-4a88-9282-9ed601c8d3fc`, AC3 `6776fbac-64b7-48a4-b154-30f08a77d460`, AC4 `d93ae9a2-8d7c-4f25-a6f3-32b49d61ece7`, AC5 `a9e91b7e-9bb8-4f60-85e2-b2a2817516e0`, AC6 `407ff671-84c7-46a9-9dcd-b61468400957`, AC7 `83473920-18bd-42a8-b949-b9d6a565ec77`. Happy path uses AC1.
- **Test-data gaps (Stage 2, do NOT seed at planning)**:
  - *Cross-US AC negative* (`ac_outside_user_story`): "Openapi Test Project" has only ONE US (b1f68acf...), so no clean same-project second US. Workaround: use an AC under a US in a DIFFERENT project (check rejects any AC not under target US), or seed a 2nd US in Stage 2.
  - *Cross-subtree module negative* (`module_outside_project_subtree`): RESOLVED — candidate module `2c4175d7-d449-40f7-abf1-7c7e429c51c7` in project `ae10a3bd-574f-4caf-8076-f19a8e80f5a6` ("BK-9 Module Test Project").
- **Contract divergence reaffirmed**: assertion = `{ content }` only (NO position). Implementation `validation.ts` wins over the original ATP table.

## Stage 2 — Execution results (2026-06-08, staging, API + DB only — no UI)

**Env:** Staging (`https://staging-upexbunkai.vercel.app/api/v1`). Auth: openapi-testing PAT (`bk_pat_X6q2m…`, scope `atc:write`). Read-only PAT minted for N2 (`bk_pat_koF-GQd…`, scope `atc:read`).

### Smoke (Go/No-Go)
- Result: **PASSED**. Happy POST `/atcs` → **201**. ATC `51dc234f-2cb1-44d6-8372-87e07f8f7854`, slug `credit-cards/atc-4a07b897` (matches regex), version 1, 3 steps + 2 assertions returned.
- DB-verified: 1 atc / 3 steps / 2 assertions / 1 ac-link + `atc.created` activity_log row. Evidence: `evidence/smoke-h1-request.json`, `smoke-h1-response.json`, `db-baseline.txt`.
- Go decision granted → proceeded to full exploration.

### API + DB matrix (13 scenarios)

| ID | Scenario | Expected | Actual | Result | Evidence |
|----|----------|----------|--------|--------|----------|
| H1 (smoke) | Happy POST /atcs | 201, v1, 3 steps/2 assertions, atc.created | 201, v1, slug ok, DB rows + event verified | **PASSED** | smoke-h1-*.json, db-baseline.txt |
| H2 | Happy PATCH /atcs/{id} If-Match:1, 2 steps/no assertions | 200, v2, 2 steps/0 assertions, atc.updated | **412 PRECONDITION_FAILED** to client, BUT DB committed: v2, 2 steps, 0 assertions, atc.updated logged | **FAILED** | h2-patch-412-bug.md, h2-patch-response.json, db-final.txt |
| N1 | POST no Authorization | 401 unauthorized | 401 `unauthorized` | **PASSED** | n1-no-auth.json |
| N2 | POST read-only token | 403 forbidden | 403 `forbidden` "Missing required capability: atc:write" | **PASSED** | n2-readonly-403.json |
| N3 | PATCH non-existent id | 404 not_found | 404 `not_found` | **PASSED** | n3-not-found.json |
| N4 | POST cross-US AC | 422 ac_outside_user_story + rollback | 422 `ac_outside_user_story`; DB zero new rows (rollback verified) | **PASSED** | n4-ac-outside-us.json, db-final.txt |
| N5 | POST cross-project module | 422 module_outside_project_subtree | 422 `module_outside_project_subtree` | **PASSED** | n5-module-outside-subtree.json |
| N6 | POST steps [1,3,2] | 422 steps_position_invalid + offenders | 422 `steps_position_invalid`, `positions:[2]` | **PASSED** | n6-steps-132.json |
| N7 | POST steps [2,3,4] | 422 steps_position_invalid | 422 `steps_position_invalid`, `positions:[2]` | **PASSED** | n7-steps-234.json |
| N8 | PATCH stale If-Match:1 (ATC at v2) | 409 conflict + current version | 409 `conflict`, `current_version:2` | **PASSED** | n8-version-conflict.json |
| B1 | POST title "AB" | 422 validation_failed | 422 `validation_failed` (title too_small) | **PASSED** | b1-title-short.json |
| B2 | POST steps [] | 422 validation_failed | 422 `validation_failed` (steps min 1) | **PASSED** | b2-empty-steps.json |
| I1 | POST invalid bearer | 401, before DB | 401 `unauthorized` "Invalid token"; zero DB writes | **PASSED** | i1-invalid-token.json |

**Tally: 12 PASSED / 1 FAILED / 13 total.**

### DB Exploration (triforce)
| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Baseline counts | all 0 | atcs/steps/assertions/ac 0, activity_log 0 | PASSED |
| Smoke persistence | 1/3/2/1 + atc.created | exact match | PASSED |
| H2 persistence | v2, 2 steps, 0 assertions, atc.updated | exact match (despite 412 to client) | PASSED |
| N4 transactional rollback | zero new rows | atcs=1 unchanged (only smoke), zero residue | PASSED |
| activity_log scope | exactly created+updated | exactly 2 events, both smoke ATC, no spurious | PASSED |
| Slug uniqueness constraint | UNIQUE (project_id, slug) | `atcs_project_id_slug_key UNIQUE (project_id, slug)` present | PASSED |
| Cleanup cascade | counts restored, children gone | all counts 0, 0 orphan steps/assertions | PASSED |

### Bugs Found (carry to Stage 3 — DO NOT file here)
- **BUG-1 (Major, non-blocking)** — H2: happy-path `PATCH /atcs/{id}` with the CORRECT `If-Match` returns **HTTP 412 PRECONDITION_FAILED** (non-JSON platform error page) instead of **200**, even though the update commits correctly server-side (version bumps 1→2, steps cascade-replaced, assertions cleared, `atc.updated` emitted). The documented success response (200 + version + affected_test_ids) is never delivered to the client. Corroborated by N8 (409 with current_version:2). Impact: a well-behaved client sees its edit as failed and may retry → double-apply or 409. Root-cause candidate: If-Match precondition check in `app/api/v1/atcs/[id]/route.ts` mis-evaluates a MATCHING version as a precondition failure (or evaluates against post-increment version). Evidence: `evidence/h2-patch-412-bug.md`, `h2-patch-response.json`.

### Observations
- **assertion contract** confirmed live: response returns `assertions[].position` (1,2 auto-assigned) even though POST body sends `{content}` only — server assigns position. No position required on input (matches validation.ts). Non-issue.
- **`affected_test_ids`** could NOT be observed on H2 because the 412 returned an error page, not the success body. Per contract it is `[]` in MVP (test_steps not migrated). Re-verify once BUG-1 fixed.
- **N3 404 message** is coarse ("ATC, user story, or module not found") with `reason: not_found` — acceptable; collapses three not-found causes into one code. Worth a doc note, not a bug.
- All negatives rolled back with zero DB residue — transactional boundary and validation-before-commit hold solidly across the anchoring-moat checks (the P0 value-proposition guarantee).

### Cleanup
- Smoke ATC `51dc234f-…` DELETEd → children cascaded (0 orphans). Project counts restored to baseline (0/0/0/0). No seed data touched (project had none). `CLEANUP COMPLETE`.

## Transition Trail

| When | From | To | Via | Result |
|---|---|---|---|---|
| 2026-06-08 (Stage 2 start) | Ready For QA | In Test | `acli jira workitem transition --key BK-18 --status "In Test"` (transition `start_testing`, id 9) | SUCCESS — "Work item BK-18 has been successfully transitioned to In Test" |
| 2026-06-08 (Stage 3 close) | In Test | BLOCKED | `acli jira workitem transition --key BK-18 --status "BLOCKED"` (transition `defect_reported`, id 13 — formal FAILED gate, `qa.formal_blocked_gate: true`) | SUCCESS — "Work item BK-18 has been successfully transitioned to BLOCKED" |

## Stage 3 — Reporting results (2026-06-08)

- **Result**: FAILED (12/13 PASS, 92%). Confirmed functional defect (H2), NOT security/auth/framework-default → no §5.0 recalibration gate applied.
- **ATR (BK-95)**: ATR body authored as Markdown → md-to-adf → set as BK-95 Test Execution **description** via `acli workitem edit --description-file`. Round-trip verified (heading/panel/table preserved, no server coercion). Includes 13-scenario matrix, H2 defect detail + evidence refs, DB-integrity note, environment, auth note, link to BK-96.
- **Bug BK-96 filed** via `acli workitem create --from-json`: summary per §1.2 (`ATC Library: ATC PATCH API: ...`). Description carries Summary / Steps to Reproduce / root-cause hypotheses / Impact (BK-19/21/23) / Related Stories / Evidence. Custom fields set via `additionalAttributes` with **option `{id:...}` shape** (NOT `{value:slug}` — slug != Jira option value): Severity=Mayor (10026), Error Type=Functional (10164), Test Environment=Staging (10047), Root Cause=Code Error (10146), Fix=Bugfix (10043); paragraph fields Actual Result (10056) / Expected Result (10059) / Evidence (10061) as ADF docs. Labels api/atc/bug. Verified in create response (the immediate `view` read showed stale nulls — eventual consistency; create response is authoritative).
- **Link**: BK-96 *Relates* BK-18 (symmetric type — immune to acli `--out/--in` inversion gotcha).
- **QA comment**: Template B (Story FAILED) posted on BK-18 — md-to-adf → `comment create --body-file`. Human-authored, no AI attribution.
- **ATR cache materialization BLOCKED**: `bun run jira:sync-issues get BK-95` skips it — issue type `Test Execution` not declared under `work_types:` in `.agents/jira-required.yaml` (same Stage-1 gap affecting BK-94/BK-95). Did NOT hand-write the cache (rule). Fix = owner adds `test_execution`/`test_plan` work_type entries, then re-run sync.
- **Errors during execution**: first bug-create attempt failed (option fields sent as `{value:"mayor"}` → "Specify a valid value" 400); corrected to option `{id:"10026"}` and succeeded on retry. No auto-retry of transitions; transition succeeded first try.

---

## RE-RUN 2026-06-20 (jira-xray, API+DB)

### Defect retest verdict
- BK-96 **FIXED** (verified E2E — gap left by Nahuel's code-review-only retest). Fix = optimistic-lock token moved to custom header **`X-If-Match`** (PR #30, commit 421a917). Legacy `If-Match` → 412 at Vercel edge (documented limitation). NOT reopened.

### New TMS artifacts (Stage 1)
- ATP BK-94 description REPLACED with refactored 12-TC parametrized ATP (EP+BVA, X-If-Match contract).
- 12 Xray Manual Tests created + added to Test Plan BK-94 + linked `Test` to BK-18 (coverage 12/12):
  | TC | Key | Focus | P |
  |----|-----|-------|---|
  | TC01 | BK-149 | POST happy 201 (layer UI/API/Unit) | P0 |
  | TC02 | BK-150 | auth/scope gate (401/401/403) | P0 |
  | TC03 | BK-151 | ac_outside_user_story 422 + rollback | P0 |
  | TC04 | BK-152 | module_outside_project_subtree 422 + rollback | P0 |
  | TC05 | BK-153 | steps_position_invalid (parametrized) | P1 |
  | TC06 | BK-154 | request boundaries BVA (title/steps/tags/layer) | P1 |
  | TC07 | BK-155 | transactional rollback DB-count | P0 |
  | TC08 | BK-156 | PATCH happy 200 X-If-Match (BK-96 regression) | P0 |
  | TC09 | BK-157 | optimistic lock X-If-Match (match/stale/absent) | P1 |
  | TC10 | BK-158 | PATCH 404 not_found | P1 |
  | TC11 | BK-159 | PATCH empty-body no-op | P2 |
  | TC12 | BK-160 | immutable fields slug/US/module | P2 |

### Pending cleanup
- Probe ATCs 48f99904, 56a977c1 left in staging (DELETE=405, no endpoint). Clean via DBHub at Stage 2 end + any ATCs created during the matrix run.

### Stage 2/3 results (RE-RUN)
- Execution: 12/12 PASSED (API+DB). BK-96 verified fixed E2E (X-If-Match). DB rollback + persistence + cleanup verified (0/0/0). Final matrix: evidence/rerun-2026-06-20/FINAL-MATRIX.md.
- Xray: 12 Tests populated with steps (add-step; create --step did NOT persist — gotcha) + shared Pre-Condition BK-161 linked to all 12. Test Execution BK-95: all 12 runs PASSED. ATR body published to BK-95 description.
- Reporting: QA comment (PASSED) on BK-18. BK-18 transitioned In Test -> QA Approved (qa_sign_off).
- Verdict: GO. Non-blocking observation: affected_test_ids returns null (contract said []).
