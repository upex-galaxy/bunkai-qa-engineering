# Test Plan (ATP) — <<TICKET_KEY>> — {{Story Title}}

> Acceptance Test Plan for a single Story in Jira project `BK`. This is the test-design output of `/sprint-testing` Stage 1 (Planning).
>
> **TMS modality**:
> - **Modality A (Xray on Jira)** — mirror this content into an Xray Test Plan issue, link it to the Story via "tests" link, link Tests to the Plan via "Test Plan has Tests".
> - **Modality B (Jira-native)** — persist this content in the Story's custom field `🧪 Acceptance Test Results (ATR)` and mirror as a Jira comment for diff history.

---

## Pointers

| Field                       | Value                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Story                       | [<<TICKET_KEY>>](https://jira.upexgalaxy.com.net/browse/<<TICKET_KEY>>)             |
| Xray Test Plan (Modality A) | [{{BK-NNN}}](https://jira.upexgalaxy.com.net/browse/{{BK-NNN}}) — fill once created |
| QA owner                    | {{name}}                                                                            |
| Sprint                      | {{name}}                                                                            |
| Target env                  | {{`staging` (default) \| `local` \| `production`}}                                  |

---

## In scope

What this Test Plan covers — the ACs and code paths to exercise.

- {{AC1 paraphrase}} — covered by TC-001, TC-002.
- {{AC2 paraphrase}} — covered by TC-003.
- {{AC3 paraphrase}} — covered by TC-004, TC-005.
- Cross-cutting: cross-tenant isolation check (RLS) — TC-006.
- Cross-cutting: scope-grain check (PAT) — TC-007 (skip if Story is UI-only).

## Out of scope

- {{What we are NOT testing in this Plan}} — covered by {{another Story / Test Plan / deferred}}.

---

## Preconditions

**Data**:
- Workspace seeded: `{{workspace-slug}}` (plan: community / cloud / enterprise — match Story scope).
- At least one member of each relevant role: `{{viewer / member / admin / owner}}`.
- Project + Module tree seeded: `{{project-slug}}` → `{{module/path}}`.
- {{Any User Stories / ACs / ATCs the Story depends on, e.g., "ATC-baseline must exist"}}.

**Environment**:
- Target: `{{env}}` (URL: `{{web_url}}`).
- DB: Supabase project `{{ref}}` (read-only access for verification queries).
- Test users provisioned in Supabase Auth — **currently a Discovery Gap** (`.context/project-config.md`). Re-verify before running.

**Credentials**:
- `STAGING_USER_MEMBER_EMAIL` / `STAGING_USER_MEMBER_PASSWORD` — from `.env`.
- `STAGING_USER_ADMIN_EMAIL` / `STAGING_USER_ADMIN_PASSWORD` — from `.env`.
- PAT (if API testing): `STAGING_PAT_ATC_READ`, etc. (Discovery Gap — Phase F).

---

## Strategy

Mix of layers per Bunkai's `atcs.layer` enum:

- **UI layer**: Playwright E2E for human-driven flows (Elena's protagonist journeys).
- **API layer**: HTTP integration for endpoint contracts (Karim's API surface; covers what session-cookie callers see today + PAT once Phase F lands).
- **Unit / DB layer**: occasional direct Supabase RPC / SQL probes for RLS verification or invariant assertions (BR-001 → BR-028 in `<framework>/.context/SRS/functional-specs.md`).

Default execution mode for this Plan: **manual** in sprint, with promotions to **automated** governed by `/test-documentation` ROI scoring.

---

## Test cases

Each row will spawn one Test issue in Jira (`{{jira.work_type.test_case}}` → `Test`). TC keys filled after creation.

| #      | TC key (filled later) | Title                                         | Layer | Priority | ROI verdict              | Anchored ACs           |
| ------ | --------------------- | --------------------------------------------- | ----- | -------- | ------------------------ | ---------------------- |
| TC-001 | {{BK-NNN}}            | {{Happy path: …}}                             | UI    | High     | Candidate                | AC1                    |
| TC-002 | {{BK-NNN}}            | {{API contract: POST returns 201 with shape}} | API   | High     | Candidate                | AC1                    |
| TC-003 | {{BK-NNN}}            | {{Validation: missing field → 422}}           | API   | High     | Candidate                | AC2                    |
| TC-004 | {{BK-NNN}}            | {{Edge case: …}}                              | UI    | Medium   | Manual                   | AC3                    |
| TC-005 | {{BK-NNN}}            | {{Negative: unauthorized → 401}}              | API   | Medium   | Candidate                | AC3                    |
| TC-006 | {{BK-NNN}}            | {{RLS: cross-tenant read denied}}             | API   | High     | Candidate                | (Cross-cutting BR-RLS) |
| TC-007 | {{BK-NNN}}            | {{PAT scope: insufficient scope → 403}}       | API   | Medium   | Candidate (post Phase F) | (Cross-cutting BR-021) |

### Coverage map (AC → TCs)

| AC                   | Covered by     | Status                             |
| -------------------- | -------------- | ---------------------------------- |
| AC1 — {{paraphrase}} | TC-001, TC-002 | ☐ Designed ☐ Documented ☐ Executed |
| AC2 — {{paraphrase}} | TC-003         | ☐ ☐ ☐                              |
| AC3 — {{paraphrase}} | TC-004, TC-005 | ☐ ☐ ☐                              |

Any AC without ≥1 TC is a coverage gap — block Story exit from `In Test` until it is closed.

---

## Risks

- **R1** — {{Test users not yet provisioned}} → can only stub UI tests until fixed. Mitigation: pair with backend team to create users this sprint.
- **R2** — {{Run / Bug entities not yet migrated}} → Journey 2 + 3 contract tests cannot land until schema ships. Mitigation: defer to follow-up Test Plan.
- **R3** — {{PAT bearer middleware (Phase F) absent}} → cannot exercise full PAT surface. Mitigation: cover what session auth allows; tag PAT-blocked TCs as `pending:phase-f`.
- **R4** — {{`package.json` ↔ `bun.lock` desync}} → local dev unavailable. Mitigation: run against staging deploy only until reconciled.

---

## Exit criteria

The Story leaves `In Test` for `QA Approved` when **all** of:

- Every AC has ≥1 passing TC at the planned priority.
- No P0/P1 bugs filed against the Story remain Open.
- RLS cross-tenant check (TC-006) is green.
- Scope-grain check (TC-007) is green OR explicitly deferred to `phase-f`.
- Test Plan + Test Execution evidence linked back to the Story (Modality-specific).

---

## Session log

- **YYYY-MM-DD** — Planning kicked off. ACs reviewed. {{questions raised}}.
- **YYYY-MM-DD** — Execution day 1. TC-001 to TC-005 run. {{outcomes}}.
- **YYYY-MM-DD** — Retest pass. Story moved to `QA Approved`.
