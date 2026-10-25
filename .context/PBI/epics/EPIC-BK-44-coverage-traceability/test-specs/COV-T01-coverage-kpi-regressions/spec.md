# COV-T01: Coverage KPI and executed-rule regressions

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Phase** | Standalone (Sprint 5 Stage 5, bug-driven) |
| **Items** | 2 TCs |
| **Dependencies** | SANDBOX-T00 (session index) |
| **Requires** | A throwaway sandbox (workspace + project + environment); runs created and closed through the API |
| **Source** | Bugs: BK-1082 (KPI rounding), BK-1081 (skipped/blocked counted as executed); Story BK-46 |

## Summary

Locks the two coverage fixes shipped in build 1ba50026: the KPI tiles never round to 100% or 0% while the numerator says otherwise (PR #250), and only a passed or failed most-recent run counts as executed (PR #248, migration 0090). Both read `GET /api/v1/projects/{id}/coverage`, so the suite is API-only; the UI tile is the same number (verified in ReTest BK-1184) and stays out of automation.

## Test Cases

| TMS ID | Title | Type | Priority |
|--------|-------|------|----------|
| BK-1070 | should not round a coverage KPI to 100% or 0% while its numerator differs from the total or from zero | BVA on the output (6 rows + empty state) | P0 |
| BK-1071 | should count an ATC as executed coverage only when its most recent run passed or failed | State-Transition on run status (7 rows) | P0 |

## Automation Plan

**Order**: BK-1071 first (small seed: one AC + one ATC per row), then BK-1070 (201 ACs).

**Shared fixtures**: one sandbox per spec file. BK-1070 walks its rows on ONE seeded project as states (bind the 201st AC, then execute 1, 200, 201) instead of re-seeding 201 ACs per row; the coverage read ATC is called once per state.

**Blocked by**: `bun run api:sync`. Spike S3: can one ATC bind 200 ACs in a single create (`acceptance_criterion_ids` array limit)? If not, bind in chunks.

**Preconditions for the whole scope**: a project environment for runs (`POST /projects/{id}/environments`).

## Merged TCs

| Removed ID | Merged Into | Reason |
|---|---|---|
| BK-1185 | BK-1070 | Executed-tile rows of the same clamping rule |
| BK-1201 | BK-1071 | Point-in-time rows of the same rule |

## Acceptance Criteria

- [ ] 2 TCs automated, `{ api }`, every Examples row asserted
- [ ] Runs are created strictly one after another (open bug BK-1220 breaks latest-run ties randomly)
- [ ] Tests pass on local and staging
