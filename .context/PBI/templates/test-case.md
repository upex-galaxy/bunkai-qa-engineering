# Test Case (TC) — <<TC_KEY>> — {{Short scenario title}}

> Single Test Case draft for Jira project `BK` (issue type: `Test`). Mirrors the structure of a KATA Acceptance Test Case so a `Candidate` TC can be promoted to an automated ATC by `/test-automation` with minimal translation.

---

## Identity

| Field                                  | Value                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Jira key                               | [<<TC_KEY>>](https://jira.upexgalaxy.com.net/browse/<<TC_KEY>>) — fill once created                                             |
| Status                                 | {{Draft \| In Design \| In Review \| Candidate \| In Automation \| Pull Request \| AUTOMATED \| READY \| MANUAL \| DEPRECATED}} |
| Layer                                  | {{`UI` \| `API` \| `Unit`}} (mirrors Bunkai `atcs.layer` enum)                                                                  |
| Priority                               | {{P0 \| P1 \| P2 \| P3}}                                                                                                        |
| ROI verdict                            | {{Candidate (automate) \| Manual (don't automate) \| Deferred (skip for now)}}                                                  |
| Owner (QA)                             | {{name}}                                                                                                                        |
| Owner (Automation, when In Automation) | {{name}}                                                                                                                        |

---

## Linkage

- **Story** — [{{BK-XXX}}](https://jira.upexgalaxy.com.net/browse/{{BK-XXX}})
- **Acceptance Criteria** anchored — `AC<<N>>` (Bunkai data-model invariant: every TC must satisfy ≥1 AC; see BR-017 in `<framework>/.context/SRS/functional-specs.md`).
- **Test Plan** (Modality A: Xray Test Plan; Modality B: Story custom field comment-mirror) — [{{BK-PPP}}]
- **Bug originated from** (if regression TC) — [{{BK-BBB}}]

---

## Preconditions

> Mirrors `atc_steps.input_data` semantics — what must already be true before the test starts.

- {{Workspace + project + module tree seeded}}
- {{User signed in as `{{role}}` OR PAT with scope `{{scope}}`}}
- {{Pre-existing entities: e.g., ATC `BK-NNN` exists with 5 steps}}
- {{Time/state assumptions: e.g., feature flag `atc-bulk-edit` enabled}}

---

## Steps (ordered)

| #   | Step                                | Input data                      | Expected (per-step)            |
| --- | ----------------------------------- | ------------------------------- | ------------------------------ |
| 1   | {{Action — verb-first, ≤120 chars}} | {{payload / form value if any}} | {{observable result per step}} |
| 2   | …                                   | …                               | …                              |
| 3   | …                                   | …                               | …                              |

> Mirrors `atc_steps` table (`<target>/supabase/migrations/0004_atcs.sql`). Each row will become one `atc_steps` row when promoted to automation.

---

## Assertions (ordered)

> Mirrors `atc_assertions` table. Single observable check per row.

1. **A1** — {{e.g., "Response status is 201."}}
2. **A2** — {{e.g., "Response body matches OpenAPI schema for `POST /api/v1/tokens`."}}
3. **A3** — {{e.g., "DB row `access_tokens` exists with `user_id = caller.id`."}}
4. **A4** — {{e.g., "Returned `token` matches `/^bk_pat_[A-Za-z0-9_-]{12}\\.[A-Za-z0-9_-]+$/`."}}

---

## Tags

> Mirrors `atcs.tags` array. Used for filtering execution runs (smoke / critical / regression / phase-f).

`{{smoke}}` `{{regression}}` `{{p0}}` `{{layer-api}}` `{{auth}}` `{{phase-f}}` (omit `phase-f` once Phase F bearer middleware lands)

---

## ROI scoring (`/test-documentation` Stage 4)

| Dimension                            | Score (1-5)                   | Note                                |
| ------------------------------------ | ----------------------------- | ----------------------------------- |
| Business risk if breaks              | {{1-5}}                       | {{rationale}}                       |
| Probability of regression            | {{1-5}}                       | {{rationale}}                       |
| Frequency of execution (per release) | {{1-5}}                       | {{rationale}}                       |
| Manual cost per execution (mins)     | {{1-5}}                       | {{higher = more value to automate}} |
| Automation cost (relative)           | {{1-5}}                       | {{higher = harder to automate}}     |
| **Verdict**                          | Candidate / Manual / Deferred | —                                   |

Rule of thumb: Verdict = `Candidate` when (risk × frequency × manual cost) > automation cost AND test is deterministic.

---

## When promoted to AUTOMATED — KATA mapping

Filled by `/test-automation` after writing code.

| KATA artifact             | Path in framework                                                               |
| ------------------------- | ------------------------------------------------------------------------------- |
| ATC file                  | `<framework>/tests/components/{ui\|api}/{Component}/{atcName}.ts`               |
| Component (Page or Api)   | `<framework>/tests/components/{ui\|api}/{Component}/index.ts`                   |
| Fixture used              | {{`api` \| `ui` \| `test`}} (see KATA reference in `<framework>/CLAUDE.md` §10) |
| Spec file (orchestrator)  | `<framework>/tests/{e2e\|integration}/{module}/{spec}.spec.ts`                  |
| `@atc('TC-ID')` decorator | `@atc('<<TC_KEY>>')` — must match this Jira key for traceability                |
| PR                        | [#<<NNN>>](https://github.com/.../pull/<<NNN>>)                                 |

`kata-manifest.json` will list the new component + ATC after `bun run kata:manifest`.

---

## Manual execution log (when Status = MANUAL or Candidate-not-yet-automated)

- **YYYY-MM-DD** — Ran on `{{env}}`, deployment `{{commit SHA}}`. Result: Pass / Fail / Blocked. {{1-line note}}.
- ...

---

## Discovery / dependency notes

- {{TC blocked by Phase F bearer middleware}}
- {{TC requires Bug/Test/Run entity migration before automation}}
- {{TC depends on TC-XXX as a precondition flow}}
