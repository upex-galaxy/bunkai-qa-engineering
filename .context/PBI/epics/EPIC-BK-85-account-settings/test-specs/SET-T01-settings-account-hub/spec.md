# SET-T01: Settings hub, Account section (identity, workspaces, auth guard)

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Phase** | Standalone (ticket-driven, Medium) |
| **Items** | 3 TCs (3 UI) |
| **Dependencies** | The existing UI auth setup (`ui-auth.setup.ts`) for BK-790 and BK-791; none for BK-793 (anonymous) |
| **Requires** | The main QA account on staging (owner of `bunkai-qa-auto-ec8c39`, admin of `bk337-admin-role-qa`, viewer of `bk337-viewer-role-qa`) |
| **Source** | Story BK-87 (Settings hub); ACs 1.1, 1.2, 1.4 |

## Summary

Regression coverage for the Settings > Account page: the identity card (email + role in the active workspace), the workspace list (name, role, active indicator, member count) and the anonymous redirect to login. The page has not changed since 2026-07-30 and BK-87 was verified PASSED on staging (2026-08-31). Only the three Candidates the owner signed are in scope.

## Test Cases

| TMS ID | Title | Type | Priority |
|--------|-------|------|----------|
| BK-790 | BK-87: TC1: should show user identity with email and role when authenticated | Positive (UI), EP over roles | P1 |
| BK-791 | BK-87: TC2: should list workspaces with role label and active indicator when authenticated | Positive (UI) + boundary (10+ rows) | P1 |
| BK-793 | BK-87: TC4: should redirect to login when accessing settings without authentication | Negative (UI, anonymous) | P0 |

Signature record (TC source gate, read from Jira before this plan): BK-790 comment 13197, BK-791 comment 13198, BK-793 comment 13199.

## Out of scope (listed, not a stop)

| TMS ID | State | Why |
|--------|-------|-----|
| BK-792 | Candidate in Jira, no signature | The owner confirmed Deferred; `/test-documentation` Phase 3 still has to take it out of the RTP |
| BK-794, BK-795, BK-796 | MANUAL | Deferred verdicts confirmed by the owner |

## Automation Plan

**Order**: BK-793 (no data), BK-790, BK-791.

**Shared fixtures**: the main QA account storage state for BK-790 and BK-791. BK-793 runs with an empty storage state.

**Blocked by**: nothing for the base scenarios. Two scenarios of the signed TCs cannot run as written (see Open decisions in `automation-plan.md`): the `member` role row of BK-790 and the 12-workspace scenario of BK-791.

## Acceptance Criteria

- [ ] BK-790 `{ ui }`: identity card shows the session email as primary label and the role label of the active workspace, for owner, admin and viewer
- [ ] BK-791 `{ ui }`: the Workspaces region lists every membership with name, role label, active indicator on the active row and member count
- [ ] BK-793 `{ ui }`, empty storage state: `/settings` and `/settings/account` redirect to `/login` with `next` set to the requested route
