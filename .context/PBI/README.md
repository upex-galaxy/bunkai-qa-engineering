# Product Backlog Items (PBI) — Bunkai TMS

> Updated by `/project-discovery` Phase 4 on 2026-05-24. Connects this QA framework with the Bunkai TMS Jira backlog.

This directory holds **local working notes** per Story / Bug / Test — never a copy of the Jira backlog. Jira is the single source of truth for tickets; PBI mirrors only what the QA work needs to ground itself: AC summaries, code locations, test data, session progress, evidence links.

---

## Jira project

| Field | Value | Source |
|---|---|---|
| **Project key** | `BK` | `<framework>/.agents/project.yaml > project.project_key` |
| **Project name** | Bunkai TMS | confirmed via `acli jira project view --key BK` (2026-05-24) |
| **Lead** | Ely | same |
| **Type** | software | same |
| **Atlassian site** | `https://upexgalaxy67.atlassian.net/` | `.agents/project.yaml > issue_tracker.atlassian_url` |
| **Issue tracker CLI** | `acli` (v1.3+) | `.agents/project.yaml > issue_tracker.issue_tracker_cli` |
| **TMS** | Xray on Jira — CLI `bun xray` (Modality A) | `.agents/project.yaml > testing.tms_cli` |

Credentials live in `<framework>/.env`: `ATLASSIAN_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`. Refresh by running `acli jira auth login` if calls 401.

> **Legacy reference**: `<framework>/.context/PBI/auth/UPEX-101-*` and `UPEX-105-*` are sample artifacts left from boilerplate scaffolding. They use the `UPEX-` prefix (not Bunkai's `BK-`). **Ignore them — do not migrate or use as authoritative.** Real Bunkai tickets always start with `BK-`.

---

## Workflow hierarchy

Three work types are in scope for the QA framework. Statuses below are sync'd from Jira via `bun run jira:sync-workflows` (catalog at `<framework>/.agents/jira-workflows.json`):

### Story (`{{jira.work_type.story}}` — issue type id `10005`)

**Workflow**: `UPEX Feature (US) Workflow`.

```
Backlog → Shift-Left QA → Estimation → Ready For Dev → In Progress →
  In Review → Ready For QA → In Test → QA Approved → Ready For Release → Deployed to Production
```

Side states: `BLOCKED`, `ABORTED`.

QA-skill entry points:
- `/shift-left-testing` — Stories in `Backlog`, `Shift-Left QA`, `Estimation`, `Ready For Dev`.
- `/sprint-testing` — Stories in `Ready For QA` (manual QA + bug filing) and bugs in `Ready For QA` (retest).
- `/test-documentation` — Stories in `In Test` / `QA Approved` (TMS docs + ROI).
- `/test-automation` — Stories with TMS Candidates (regardless of Story state) + bugs in `Closed` (regression TC).
- `/regression-testing` — runs the CI regression suite; not Story-scoped.

### Bug (`{{jira.work_type.bug}}`)

**Workflow**: `UPEX BUG/DEFECT LIFE CYCLE`.

```
Open → In Progress → In Review → Ready For QA → Closed
```

Side states: `Deferred`, `Duplicated`, `Enhancement`, `Rejected`, `Cannot Reproduce`, `ABORTED`.

### Test (TC) (`{{jira.work_type.test_case}}`)

**Workflow**: `UPEX Test (TC) Workflow`.

```
Draft → In Design → In Review → Candidate → {AUTOMATED via In Automation+Pull Request | MANUAL | DEPRECATED}
              └→ READY (intermediate ready state before AUTOMATED/MANUAL)
```

Owned by `/test-documentation` (creates TCs as `Candidate` / `Manual` / `Deferred`) and `/test-automation` (transitions to `In Automation` → `Pull Request` → `AUTOMATED`).

---

## Common Queries (JQL)

Run via `acli jira workitem search --jql "<query>"` or in Jira UI.

```jql
# 1. Stories assigned to me in the open sprint
project = BK AND sprint in openSprints() AND assignee = currentUser()

# 2. Stories awaiting QA on the open sprint
project = BK AND status = "Ready For QA" AND sprint in openSprints()

# 3. Stories in active QA execution
project = BK AND status = "In Test"

# 4. Backlog awaiting shift-left grooming
project = BK AND status in (Backlog, "Shift-Left QA") ORDER BY priority DESC, created ASC

# 5. Open bugs (excluding done categories)
project = BK AND issuetype = Bug AND statusCategory != Done ORDER BY priority DESC

# 6. Bugs awaiting retest
project = BK AND issuetype = Bug AND status = "Ready For QA"

# 7. Candidate Test cases (TCs flagged for automation by ROI)
project = BK AND issuetype = Test AND status = Candidate

# 8. Test cases ready to be automated this sprint
project = BK AND issuetype = Test AND status = "In Automation"

# 9. Recently closed bugs needing regression TCs (last 14 days)
project = BK AND issuetype = Bug AND status = Closed AND resolved >= -14d

# 10. Stories that completed QA approval (input for retro / metrics)
project = BK AND status = "QA Approved" AND resolved >= -30d
```

### CLI recipes (read-only)

```bash
# View a specific Story
acli jira workitem view --key BK-123

# Search by JQL
acli jira workitem search --jql 'project = BK AND status = "Ready For QA"' --limit 20

# List sprints (active + closed)
acli jira project view --key BK
acli jira workitem search --jql 'project = BK AND sprint in openSprints()' --fields key,summary,status,assignee

# Pull custom fields (uses sync scripts under the hood)
bun run jira:sync-fields            # refresh .agents/jira-fields.json
bun run jira:sync-workflows         # refresh .agents/jira-workflows.json
bun run jira:check                  # validate .env + field catalog vs required
```

---

## Local PBI structure

Two patterns — pick per ticket complexity.

```
.context/PBI/
├── README.md                                       # this file
├── templates/
│   ├── user-story.md                               # per-Story working notes
│   ├── bug-report.md                               # bug filing prep (steps to reproduce, expected/actual, evidence)
│   ├── test-plan.md                                # ATP draft (mirrors Story custom field or Xray Test Plan)
│   ├── test-case.md                                # TC draft (aligned with KATA ATC format)
│   ├── module-context-template.md                  # (existing) per-module technical context
│   ├── ROADMAP-template.md                         # (existing) module roadmap with phases
│   └── PROGRESS-template.md                        # (existing) cross-session progress tracker
│
├── ── PER-STORY (simple — single Story, few TCs) ─
├── BK-123-feature-name.md                          # copied from templates/user-story.md
│
└── ── PER-MODULE (complex — many tickets) ──────
    └── {module-slug}/                              # e.g., atc-authoring/, runs/, auth/
        ├── {module}-test-plan.md                   # master test plan
        ├── BK-123-feature/                         # per-ticket dir
        │   ├── context.md                          # AC summary + code locations + test data
        │   └── evidence/                           # screenshots, traces, logs (gitignored)
        └── test-specs/                             # automation specs (KATA-aligned)
            ├── ROADMAP.md
            ├── PROGRESS.md
            └── {PREFIX}-T01-{name}/
                ├── spec.md                         # Gherkin-style TCs
                ├── implementation-plan.md          # KATA components + fixtures
                └── atc/                            # per-ATC contract
                    └── BK-NNN-{atc-name}.md
```

### When to use each

| Structure | Use when | Example |
|---|---|---|
| **Per-Story** | Single Story, ≤5 TCs, no cross-session tracking | Small bug fix, copy tweak |
| **Per-Module** | Multi-ticket module, ≥6 TCs, multi-session automation | ATC authoring flow, run execution, auth |

---

## Conventions

- **Ticket prefix**: `BK-` (NOT `UPEX-`, NOT `BK_`). Source: `<framework>/.agents/project.yaml > project.project_key`.
- **File names**: kebab-case. `BK-123-add-step-reordering.md`, not `BK-123_Add_Step_Reordering.md`.
- **Module slugs**: kebab-case, match domain (`atc-authoring`, `runs`, `tokens`, `workspace-membership`).
- **AC status**: mark `[x]` once a Test Case covers it.
- **Evidence**: under `evidence/` per ticket folder. Always gitignored (`*/evidence/` in `.gitignore`).
- **Cross-references**:
  - Story → ATP: Story custom field `acceptance_test_results` (Modality B mirror) or Xray Test Plan link (Modality A).
  - ATP → TCs: Xray "Test Plan has Tests" (Modality A) or Story comment block listing TC keys (Modality B).
  - Bug → failing Run + ATC: free-text fields `external_id` on `runs` / `atcs` if Bunkai data layer ever offers them; for now, paste in Jira bug description.

---

## Discovery Gaps (Phase 4)

- [ ] **Custom field `acceptance_test_results`** — listed as required in `<framework>/.agents/jira-required.yaml`. Confirm it exists in the BK Jira instance (`bun run jira:check` should pass).
- [ ] **Xray license** — `bun xray` is referenced as TMS CLI; confirm Xray is enabled on the BK project (open a Test issue and verify Xray panels appear).
- [ ] **Sprint cadence** — board / sprint configuration (cadence, columns, ceremonies) not yet documented. Pull from Jira UI when needed.
- [ ] **Component labels** — common labels (e.g., `module:atc-authoring`, `area:auth`) not yet enumerated. Will surface during first `/sprint-testing` run.
- [ ] **Bug severity custom field** — Journey 2 mentions severity (P0-P4); confirm field exists or migrate to priority.
