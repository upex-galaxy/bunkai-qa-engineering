# Test Automation Plan: BK-1082 + BK-1081 (coverage regressions, Story BK-46)

> Type: integration · Sprint 5 · Created 2026-10-25 (DOC1) · Approved 2026-10-25 · Coded 2026-10-25 (AUTO1)

## 2. Architecture Decisions

| Decision | Value | Rationale |
|---|---|---|
| Component | `CoverageApi.ts` (new) | No coverage component in the manifest |
| Component | `RunApi.ts` (new, helpers only) | Create test, start run, mark step, finish / abort: preconditions, not outcomes |
| Component | `ProjectApi.ts` (new, helpers only; shared with ATCX/TOK through SandboxSteps) | modules, user stories, acceptance criteria, environments |
| Fixture | `{ api }` | API-only |
| Test files | `tests/integration/coverage/readCoverageKpis.test.ts`, `tests/integration/coverage/readExecutedCoverage.test.ts` | |

### API Details

| Aspect | Value |
|---|---|
| Endpoint | `GET /api/v1/projects/{id}/coverage` (kpis bound / executed / total, per-AC state, per-module status) |
| Seeding | `POST /modules/{id}/user-stories`, `POST /user-stories/{id}/acceptance-criteria`, `POST /atcs` (BK-149), `POST /tests`, `POST /projects/{id}/environments`, `POST /runs`, `POST /runs/{id}/steps/{stepId}/mark`, `POST /runs/{id}/finish`, `POST /runs/{id}/abort` |
| Auth | Bearer PAT |

## 3. ATC Registry

| ATC ID | Component | Method | Fixed assertions |
|---|---|---|---|
| BK-149 (reuse) | AtcApi | `createAtc` | seeding |
| BK-1070 (new) | CoverageApi | `readCoverageKpis(projectId, expected)` | 200; kpis equal `expected`; each tile value = clampedPercent(n, d) per the rule; no tiles when total = 0 |
| BK-1071 (new) | CoverageApi | `readAcceptanceCriterionState(args)` | 200; AC state and module status equal the expected pair |

Helpers (no @atc): `RunApi.createTest`, `RunApi.startRun`, `RunApi.markStep`, `RunApi.finishRun`, `RunApi.abortRun`; `ProjectApi.createModule`, `createUserStory`, `createAcceptanceCriteria(count)`, `createEnvironment`.

Assertion note: the expected tile value is written literally in the test data (99, 1, 100), never computed by re-implementing `clampedPercent` in the test.

## 4. Test Data Strategy

| Data | Source | Lifecycle |
|---|---|---|
| Sandbox + environment | Generate (SandboxSteps) | per file |
| 201 ACs under one story; ATC-A bound to 200, ATC-B bound to the 201st | Generate | inside the sandbox |
| One AC + ATC + Test per BK-1071 row; runs closed in sequence | Generate | inside the sandbox |

Run statuses map: skipped = `abort`, blocked = `mark blocked` then finish, pending = started and never finished, passed / failed = mark + finish.

## 6. Implementation Order

- [ ] ProjectApi, RunApi helpers (shared)
- [ ] CoverageApi ATCs
- [ ] `readExecutedCoverage.test.ts` (BK-1071), then `readCoverageKpis.test.ts` (BK-1070)
- [ ] local + staging, `bun run kata:manifest`

## 7. Success Criteria

- [ ] Every Examples row of both Gherkin definitions asserted; output BVA at 0, 1, 99, 100
- [ ] No ATC calls another ATC; seeding through helpers only

## 8. Decisions taken in Code (measured on staging, 2026-10-25)

| Decision | Value | Evidence |
|---|---|---|
| Sandbox | One throwaway workspace per spec, opened and closed inside the test (`try/finally`): `beforeAll` cannot use the test-scoped `api` fixture. See ADR-0001 | Spikes S1, S2 |
| Sandbox delete | Cookie session via `api.auth.openSession()`, then `DELETE /workspaces/{id}` with no Bearer; session PAT to the teardown ledger | A PAT gets 403 "Workspace deletion is available to the Owner via a browser session only" |
| S3 | One ATC create binds 199 criteria (`acceptance_criterion_ids`), no chunking needed | 201 on staging |
| BK-1070 tile values | Read from `GET /workspaces/{id}/coverage` (`ac_coverage_percent`, `executed_coverage_percent`) of the sandbox, which holds exactly one seeded project; counts from `GET /projects/{id}/coverage`. The ATC asserts the workspace counts equal the project kpis before trusting a percentage | The project endpoint returns counts only. Both the project Metrics tiles (`lib/coverage/coverage-view.ts`) and the workspace rollup (`lib/home/coverage.ts`) call `lib/coverage/clamped-percent.ts` |
| BK-1070 freshness | `CoverageApi.waitForWorkspaceCoverage` polls the workspace rollup until its counts match the seed (90s ceiling), then the ATC reads | The rollup is memoized in process per server instance (60s TTL) and keyed by the project set; refreshing by adding projects hits the Free plan's 3-project cap (`project_limit_reached`, 422, measured) |
| BK-1070 walk | One project walked through the Examples as states: empty, 200/199/199, 201/200/0, 201/201/0, 201/201/1, 201/201/200, 201/201/201. A new run of an ATC resets it to pending | Gherkin rows of BK-1070 |
| BK-1070 empty state | API proxy: zeroed kpis and `null` percentages (the UI "No acceptance criteria yet" copy stays manual) | `WorkspaceCoverage` contract: null when `ac_total` is 0 |
| BK-1071 rows | One module per Examples row (one AC, one ATC, one Test); runs of a row created strictly in sequence (BK-1220) | 7 rows |
| Run outcomes | `RunApi.closeRunAs`: passed / failed / blocked = mark every step then finish (failed verdict for blocked); skipped = abort; pending = run left open. Verified on the ATC status the run returns | Run contract |
| Runtime | BK-1071 about 30s; BK-1070 several minutes (memo polling between states) | |
