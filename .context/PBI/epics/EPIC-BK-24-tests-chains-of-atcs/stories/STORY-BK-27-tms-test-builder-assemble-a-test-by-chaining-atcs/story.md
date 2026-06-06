# TMS-Test Builder | Assemble a test by chaining ATCs

**Jira Key:** [BK-27](https://jira.upexgalaxy.com/browse/BK-27)
**Epic:** [BK-24](https://jira.upexgalaxy.com/browse/BK-24) (Tests (chains of ATCs))
**Type:** Story
**Status:** Estimation
**Priority:** Medium
**Story Points:** 3
**Web Link:** https://staging-upexbunkai.vercel.app/

---

## Overview

***Source spec:*** BK-015

## User story

***As a*** QA Engineer (Elena persona)
***I want to*** assemble a Test by chaining a sequence of ATCs from my workspace's library
***So that*** I can execute those chained validations together in one Run when verifying a User Story

## Definition of done

- [ ] Functionality available behind the workspace's role permissions (member and above can create; viewer cannot)
- [ ] New Test appears in the Test list immediately after saving
- [ ] Activity log records who created the Test and when
- [ ] Operation works whether triggered from the UI or from an AI agent / CI client using the same Bunkai surface
- [ ] Acceptance criteria validated end-to-end against staging
- [ ] No P0 / P1 bugs open against this story

## QA Refinements (Shift-Left Analysis)

Shift-Left QA reviewed this Story on 2026-06-06. The full ATP DRAFT lives in the 🧪 Acceptance Test Plan (ATP) field; refined ACs are in the ✅ Acceptance Criteria (Gherkin) field. Risk: HIGH — feasibility, not clarity.

### Edge Cases Identified

- Viewer creates via the headless API — UI hides the button, but the API must still enforce; expect server-side 403.
- Same ATC referenced twice in one chain — allowed (sequence, not set); both positions must persist in order, no de-dup.
- Title at exactly 200 vs 201 chars — 200 accepted, 201 rejected.
- Title with surrounding whitespace around real text (e.g. "  Cart  ") — confirm trim-then-validate vs preserve.
- Active workspace switched mid-form before Save — binding instant (form-open vs Save click) is ambiguous and permanent.
- Double-submit inside vs outside the idempotency window — exactly one Test inside the window.
- Referenced ATC deleted/soft-deleted after being chained — block (RESTRICT), cascade, or null-out is undefined.
- Two Tests with identical title in same workspace — both succeed (no uniqueness rule stated).
- Max chain length / picker over a large ATC library — no cap or performance budget defined.

### Clarified Business Rules

- Title required, max 200 chars, whitespace-only rejected.
- A Test must include at least one ATC; the chain is an ordered sequence (duplicates allowed, not a set).
- A Test binds permanently to the workspace active at creation; binding is immutable thereafter.
- Cross-workspace ATC references are rejected without disclosing existence (INV-3 non-disclosure).
- `viewer` is read-only; create requires `member` or above (`bunkai*can*write_workspace`).
- Double-submit must be deduped via a retry-safe identifier / idempotency key.

### Open Questions for PO / Dev

- Is building the `tests` entity (table + ordered ATC join + create path + RLS) part of THIS Story, or a prerequisite assumed to exist? No `tests` table, no `/api/v1/tests` route, "New Test" is an unwired stub. NEEDS PO/DEV CONFIRMATION.
- What does a "selectable / published ATC" mean? `atcs.status` has no `published` state. NEEDS PO/DEV CONFIRMATION.
- Define the idempotency window + retry-safe-identifier source (client-supplied vs server-derived). `idempotency_keys` table exists but is unwired. NEEDS PO/DEV CONFIRMATION.
- Is the `activity_log` write in scope? The table exists (0009) but has no runtime write path in code, so the DoD audit criterion is currently unverifiable. NEEDS PO/DEV CONFIRMATION.
- Exact status code + verbatim copy for the cross-workspace ATC rejection (403 vs 404/422) — must be byte-identical to a wholly-nonexistent ATC id. NEEDS PO/DEV CONFIRMATION.
- Server-side re-validation of empty chain + title rules on the headless surface (UI validation is not a boundary). NEEDS PO/DEV CONFIRMATION.
- Behavior when a referenced ATC is deleted/soft-deleted after being chained (RESTRICT vs cascade vs null). NEEDS PO/DEV CONFIRMATION.
- Binding instant under a mid-form workspace switch (form-open vs Save). NEEDS PO/DEV CONFIRMATION.

---

## Fields

> Each rich-text field is a separate file in this folder.

- [Acceptance Criteria](./acceptance-criteria.md)
- [Business Rules](./business-rules.md)
- [Scope](./scope.md)
- [Out Of Scope](./out-of-scope.md)
- [Workflow](./workflow.md)
- [Acceptance Test Plan (QA)](./acceptance-test-plan.md)

---

## Traceability

### Storys (4)

- [BK-33](https://jira.upexgalaxy.com/browse/BK-33): TMS-Test Tags | Assign reserved and custom tags to a test _(Backlog)_
- [BK-34](https://jira.upexgalaxy.com/browse/BK-34): TMS-Run Execution | Start a manual run in a chosen environment _(Backlog)_
- [BK-32](https://jira.upexgalaxy.com/browse/BK-32): TMS-Test View | View a test with all chained ATCs expanded _(Backlog)_
- [BK-28](https://jira.upexgalaxy.com/browse/BK-28): TMS-Test Builder | Reorder ATCs inside a test _(Shift-Left QA)_

---

## Metadata

- **Created:** 5/27/2026
- **Updated:** 6/6/2026
- **Reporter:** Ely
- **Assignee:** Ely
- **Labels:** master-sprint-4, mvp, shift-left-2026-06-06, shift-left-reviewed, tests-epic

---

_Synced from Jira by sync-jira-issues_
