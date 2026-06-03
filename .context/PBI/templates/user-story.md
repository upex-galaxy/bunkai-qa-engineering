# <<TICKET_KEY>> — {{Short Story Title}}

> Local working notes for a single User Story in Jira project `BK`. Mirror authoritative content from Jira; do NOT copy it verbatim. Update as work progresses; archive to `.context/.archive/` once the Story closes if you want to keep it.

---

## Pointers

| Field          | Value                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Jira key       | [<<TICKET_KEY>>](https://jira.upexgalaxy.com.net/browse/<<TICKET_KEY>>)                                                                                                                                |
| Issue type     | Story                                                                                                                                                                                                  |
| Module / area  | {{module-slug}} (e.g., `atc-authoring`, `runs`, `tokens`, `auth`)                                                                                                                                      |
| Sprint         | {{Sprint name or "Backlog"}}                                                                                                                                                                           |
| Assignee (Dev) | {{name}}                                                                                                                                                                                               |
| Assignee (QA)  | {{name}}                                                                                                                                                                                               |
| Status         | {{Backlog \| Shift-Left QA \| Estimation \| Ready For Dev \| In Progress \| In Review \| Ready For QA \| In Test \| QA Approved \| Ready For Release \| Deployed to Production \| BLOCKED \| ABORTED}} |

---

## User story (verbatim from Jira `Description`)

**As** {{role from Bunkai persona — Elena / Mateo / Sara / Karim}}
**I want** {{capability}}
**So that** {{outcome / value}}

---

## Acceptance criteria

Mirror the Jira custom field `✅ Acceptance Criteria (Gherkin)`. Mark `[x]` once a Test Case covers it.

- [ ] **AC1** — Given … When … Then …
- [ ] **AC2** — Given … When … Then …
- [ ] **AC3** — Given … When … Then …

> If an AC is ambiguous, untestable, or missing a precondition, raise it during `/shift-left-testing` BEFORE the Story enters `Ready For Dev`. Add the question in this file under "Open Questions" + a Jira comment on the Story.

---

## Business rules (verbatim from Jira `🚩 Business Rules Specification` if populated)

- **BR-Story-1** — {{rule the system MUST enforce}}
- **BR-Story-2** — …

---

## Scope (verbatim from Jira `Scope ⛳`)

**In scope**:
- {{item}}

**Out of scope**:
- {{item — link to follow-up Story if applicable}}

---

## Code locations (filled during Shift-Left or Sprint Testing)

| Layer             | Path(s) in `upex-bunkai-tms`                                       | Notes                              |
| ----------------- | ------------------------------------------------------------------ | ---------------------------------- |
| UI route          | {{e.g., `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx`}} | —                                  |
| UI components     | {{`components/atcs/atc-editor.tsx` ...}}                           | —                                  |
| API route handler | {{`app/api/v1/atcs/route.ts`}}                                     | —                                  |
| DB migration      | {{`supabase/migrations/0009_*.sql`}}                               | If schema change                   |
| RLS policies      | {{table names + helper functions used}}                            | —                                  |
| RPCs touched      | {{`bunkai_save_atc` etc.}}                                         | —                                  |
| OpenAPI schema    | {{Zod source}}                                                     | Confirm `bun run api:sync` updated |

---

## Test data

- **Test users**: {{`STAGING_USER_MEMBER`, `STAGING_USER_ADMIN` — list which roles needed}}
- **Workspace**: {{fixture name + slug — e.g., `qa-workspace-001` / `qa-bunkai-test`}}
- **Pre-existing data**: {{any seeded modules / US / AC / ATCs the test relies on}}
- **PAT scopes needed (if API testing)**: {{`atc:read` / `atc:write` / `run:execute` / `workspace:admin`}}

---

## Test scenarios planned (will become TC issues in Jira)

| TC ID (planned) | Scenario           | Layer           | Priority | ROI verdict |
| --------------- | ------------------ | --------------- | -------- | ----------- |
| {{TC-001}}      | {{Happy path — …}} | UI / API / Unit | High     | Candidate   |
| {{TC-002}}      | {{Validation — …}} | API             | High     | Candidate   |
| {{TC-003}}      | {{Edge case — …}}  | UI              | Medium   | Manual      |
| {{TC-004}}      | {{Negative — …}}   | API             | Low      | Deferred    |

ROI verdict comes from `/test-documentation` (Candidate → automate; Manual → manual run; Deferred → reject for now).

---

## Cross-tenant / security checks (always required for Story touching shared tables)

- [ ] User A cannot read User B's `workspace_id` data (RLS check).
- [ ] PAT with insufficient scope → 403 on protected endpoint (when Phase F middleware ships).
- [ ] No service-role key leak in client bundle.
- [ ] Open-redirect guard on any new `next` / `redirect` param.

---

## Open questions (track during Shift-Left + Sprint Testing)

- [ ] {{Question}} — owner: {{PO / Tech Lead}} — raised: {{YYYY-MM-DD}}

---

## Session log

- **YYYY-MM-DD** — {{kind: shift-left | sprint-test | retest | doc | automate}}: {{1-line outcome}}
- ...

---

## Artifacts produced

- ATP / Test Plan link: {{Xray Test Plan URL or Jira comment URL}}
- ATR / Test Report link: {{Xray Test Execution URL or Story custom field}}
- TC issues: {{`BK-NNN`, `BK-NNN+1`, ...}}
- Bugs filed: {{`BK-MMM`, ...}}
- PR (automation): {{`#NNN`}}
