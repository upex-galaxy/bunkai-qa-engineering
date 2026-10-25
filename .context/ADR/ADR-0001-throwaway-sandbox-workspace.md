# ADR-0001: Throwaway sandbox workspace per spec file for seeded test data

- **Status**: Proposed
- **Date**: 2026-10-25
- **Deciders**: Ely (project owner) chose option D1a when approving the Sprint 5 automation plan (`.session/decisions/stage4-sprint5-verdicts-2026-10-25.md`, "Automation plan approval"). The Code brief asked for this record to be drafted as Proposed; the open points below are what keeps it there.
- **Supersedes**: none
- **Superseded by**: none

## Context

The Sprint 5 regression suites (coverage KPIs BK-1070, executed coverage BK-1071, and next the ATC CSV export BK-761..784) need data no shared fixture holds: 200+ acceptance criteria, ATCs bound to them, Tests and Runs closed with chosen outcomes. Seeding that into the shared QA workspace `Bunkai QA Automation` would:

- pollute every workspace-level rollup (Home coverage card, `GET /workspaces/{id}/coverage`), so a suite could never assert an exact percentage;
- leave data behind: the API has no DELETE for ATCs, user stories or projects;
- couple parallel runs and parallel workers through shared counts.

Measured on staging (2026-10-25, plan spikes S1 to S3):

- The main QA account can create workspaces with its PAT (S1), and seed projects, environments, modules, stories, criteria, ATCs (199 criteria on one ATC create, S3), Tests and Runs with it.
- `DELETE /workspaces/{id}` is owner-only and cookie-session-only: a PAT gets 403 (S2). A cookie session opened on the same request context (`api.auth.openSession`) deletes it (200). The delete is soft: 30-day purge window, restorable.
- The Free (community) plan caps a workspace at 3 projects (`project_limit_reached`, 422).
- The workspace coverage rollup is memoized in process per server instance (60s TTL), keyed by the workspace's project set.

## Decision

Every spec file that seeds data opens its own **throwaway sandbox workspace** and deletes it when it ends:

1. `SandboxSteps.open(label)` creates a workspace (slug prefix `qa-sbx-`, unique suffix), one project and one run environment with the PAT.
2. The spec seeds everything inside that workspace and asserts against it.
3. `SandboxSteps.close(sandbox)`, in a `finally`, opens a cookie session (its PAT goes to the minted-PAT ledger the global teardown revokes), deletes the workspace, and verifies it is gone from the caller's list.
4. The same `close()` sweeps orphans: workspaces the caller owns whose slug starts with `qa-sbx-` and that are older than two hours (a crashed run's leftovers). Nothing without the prefix is ever touched.

Suites read workspace-level rollups only from their own sandbox, so the workspace figure is exactly the seeded project's figure.

## Consequences

**Positive**

- Exact assertions on workspace-level numbers, with no interference from other suites or manual QA.
- No seeded data left in shared workspaces; cleanup does not need DELETE endpoints the API lacks.
- Parallel workers cannot collide: each one owns its workspace.

**Negative**

- Each spec file signs in once more to delete its sandbox (one extra PAT per file, revoked at teardown).
- Deleted sandboxes stay as soft-deleted rows for 30 days on staging.
- The 3-project cap on the Free plan limits a sandbox to three projects.
- A memoized workspace rollup must be polled until it reflects the seed (up to 60s per state), which makes multi-state walks slow (BK-1070 takes minutes).
- If the delete fails, the sandbox survives until the next sweep (two hours later at the earliest).

## Open points (why this is Proposed)

- Whether the account's workspace count has a ceiling that a burst of parallel workers could hit (not measured beyond one extra workspace per run).
- Whether the orphan sweep should also run from the global teardown, so a run that never reaches `close()` still cleans up the same day.
- Whether `ATCX-T01` (8 export Tests) adopts the same sandbox once its owner hands the Tests over.

## Alternatives considered

- **(D1b) One persistent "qa-automation" workspace, projects created and deleted per run**: needs a project DELETE the API does not have, and the 3-project cap would block it after three runs.
- **Seed into the shared `Bunkai QA Automation` workspace**: no cleanup path, and workspace rollups become unassertable.
- **Seed through the database (DBHub)**: bypasses the API contracts the suites exist to protect and needs service-role writes on staging.
