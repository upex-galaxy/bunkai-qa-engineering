# Bug Report — {{Short summary, ≤80 chars}}

> Working draft of a Bug for Jira project `BK` (issue type: Bug). Copy into Jira via `acli jira workitem create --type Bug ...` or paste manually. Keep this file under the relevant PBI module folder so the failing Run / ATC context stays linked.

---

## Bug identity

| Field                               | Value                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Jira key (filed)                    | [{{BK-NNN}}](https://jira.upexgalaxy.com.net/browse/{{BK-NNN}}) — fill once created    |
| Status                              | Open → In Progress → In Review → Ready For QA → Closed                                 |
| Side states                         | Deferred · Duplicated · Enhancement · Rejected · Cannot Reproduce · ABORTED            |
| Priority                            | {{P0 Critical \| P1 High \| P2 Medium \| P3 Low}}                                      |
| Severity (if distinct field exists) | {{Critical / High / Medium / Low}}                                                     |
| Reporter (QA)                       | {{name}}                                                                               |
| Assignee (Dev)                      | {{name or "unassigned"}}                                                               |
| Environment                         | {{`local` \| `staging` \| `production`}}                                               |
| Discovered during                   | {{Sprint testing of `BK-XXX` \| Regression run \| Exploratory \| Production incident}} |
| Linked Story                        | {{`BK-XXX`}}                                                                           |
| Failing ATC / TC                    | {{`BK-YYY`}} or {{TMS Test key}}                                                       |
| Failing Run (if recorded)           | {{Run ID once Run entity ships}}                                                       |

---

## Summary (one sentence)

{{What's broken in one line — visible in Jira list view. Example: "ATC editor loses unsaved steps when navigating between modules."}}

---

## Steps to reproduce

Numbered, copy-pasteable, ≤8 steps. Include exact URLs, button labels, payloads.

1. Sign in as `{{role}}` user.
2. Navigate to `https://staging-upexbunkai.vercel.app/projects/{{project-slug}}/atcs/{{atc-id}}`.
3. Click **Edit steps**.
4. Add a new step ("Step 99 — verify foo").
5. Without saving, click breadcrumb back to the project.
6. Reopen the same ATC.

Test data used: workspace `{{slug}}`, project `{{slug}}`, ATC `BK-{{slug}}`.

---

## Expected result

{{What SHOULD happen, anchored to the Story's AC if applicable. Cite the AC ID: "Per `BK-XXX` AC2: unsaved changes prompt the user before navigation."}}

---

## Actual result

{{What HAPPENS. Be precise: error message verbatim, status code, screenshot reference. Example: "Navigation completes silently. The new step is gone on reopen. No toast, no confirm dialog."}}

---

## Evidence

Store under `.context/PBI/{{module}}/{{ticket}}/evidence/` (gitignored). Reference paths here.

- Screenshot: `evidence/atc-editor-data-loss-step5.png`
- Browser console log: `evidence/console-2026-05-24.log`
- Network trace (HAR): `evidence/network-2026-05-24.har`
- Playwright trace: `evidence/trace.zip`
- Server log excerpt (Vercel): `evidence/vercel-log-request-id-<uuid>.txt`

When filing in Jira: attach copies as Jira attachments, paste this list as a Markdown block in the bug Description.

---

## Impact / scope of bug

- **Users affected**: {{which roles / personas — viewer / member / admin / owner / Karim agent}}
- **Workspaces / tenants affected**: {{all / specific plan / specific size of module tree}}
- **Frequency**: {{always / intermittent / once in N runs}}
- **Workaround available**: {{none / "save before navigating" / etc.}}
- **Data loss risk**: {{yes / no — describe}}
- **Security risk**: {{none / data leak / privilege escalation / etc.}}

---

## Diagnosis hints (optional — fill if you have a hypothesis)

- Suspected component: {{path}}
- Suspected commit / PR: {{SHA / PR URL}}
- Related log entries (with `x-request-id`): {{`request_id: <uuid>`}}
- Related Supabase log: {{snippet}}

---

## Acceptance criteria for the FIX (so retester knows what "Closed" means)

- [ ] Steps above no longer reproduce the issue.
- [ ] Underlying invariant restored: {{e.g., "unsaved changes trigger a confirm dialog before route change"}}.
- [ ] Regression Test Case added to TMS as `Candidate` (if reproducible deterministically).
- [ ] No regression on related ACs of `BK-XXX`.

---

## Retest log

- **YYYY-MM-DD** — Retested on `{{env}}`, build `{{commit SHA or Vercel deployment URL}}`. Result: {{Pass / Fail / Cannot Reproduce}}. {{1-line note}}.
- ...
