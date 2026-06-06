# Comments for BK-9

[View in Jira](https://jira.upexgalaxy.com/browse/BK-9)

---

### Ely - 5/19/2026, 9:05:48 PM

🧱 ****Architect Annotation****

**Posted by repo automation. Sections below are the architecture-grade complement to the user-facing fields (description / AC / Scope / Business Rules / Workflow). Source-of-truth on dev-side concerns — synced to local `comments.md` by `sync-jira-issues`.**

1. 

- Tree view: `<ModuleTree />` with inline "+ New Module" affordances.

1. 

- Route: `app/api/v1/projects/[id]/modules/route.ts` (POST).
- Path computation: `parent ? parent.path + "/" + slug : "/" + slug`.

1. 

- Tables: `modules` with materialized `path` column.
- Index: GIN or btree on `path` for subtree queries.

1. 

- [https://jira.upexgalaxy.com/browse/BK-8#icft=BK-8](https://jira.upexgalaxy.com/browse/BK-8#icft=BK-8) (need a project).

1. 

- [https://jira.upexgalaxy.com/browse/BK-10#icft=BK-10](https://jira.upexgalaxy.com/browse/BK-10#icft=BK-10) (rename / soft-delete needs existing modules).
- [https://jira.upexgalaxy.com/browse/BK-11#icft=BK-11](https://jira.upexgalaxy.com/browse/BK-11#icft=BK-11) (move needs ≥2 modules to swap parents).
- EPIC-BK-3, [https://jira.upexgalaxy.com/browse/BK-4#icft=BK-4](https://jira.upexgalaxy.com/browse/BK-4#icft=BK-4), [https://jira.upexgalaxy.com/browse/BK-7#icft=BK-7](https://jira.upexgalaxy.com/browse/BK-7#icft=BK-7), [https://jira.upexgalaxy.com/browse/BK-8#icft=BK-8](https://jira.upexgalaxy.com/browse/BK-8#icft=BK-8) (anchored entities need modules).

1. 

- [ ] All 5 AC scenarios pass on staging.
- [ ] Path materialization verified at DB level on 4-deep subtree.
- [ ] Soft-warning metadata present in 201 responses at depth 4.
- [ ] E2E test: create 4-deep tree via UI.

---

### Luis Eduardo Flores Villarroel - 6/1/2026, 10:36:46 PM

=== Shift-Left Refinement: [https://jira.upexgalaxy.com/browse/BK-9#icft=BK-9](https://jira.upexgalaxy.com/browse/BK-9#icft=BK-9) ===

***Shift-Left pre-sprint QA refinement completed on 2026-06-02.***

Full ATP DRAFT (25 test outlines) is stored in the ***Acceptance Test Plan*** custom field on this story.

---

## Summary

***Story***: [https://jira.upexgalaxy.com/browse/BK-9#icft=BK-9](https://jira.upexgalaxy.com/browse/BK-9#icft=BK-9) — TMS-Module | Create modules with nested sub-modules
***Mode***: Shift-Left batch grooming
***Refined by***: QA — Shift-Left batch session
***Verdict***: Needs Improvement (story has gaps — see below)

---

## Phase 1 — Key Findings

- ***Complexity***: HIGH — 5–7 SP equivalent (depth state machine × 3 paths, tree integrity, RLS isolation, path materialization, position ordering)
- ***Blocks everything downstream***: Modules are prerequisite for US + ATC authoring — this story unblocks the core product workflow
- ***No write API yet***: `POST /api/v1/modules` does not exist; `Sidebar` is read-only; [https://jira.upexgalaxy.com/browse/BK-9#icft=BK-9](https://jira.upexgalaxy.com/browse/BK-9#icft=BK-9) must create both the endpoint and the UI trigger

---

## Phase 2 — Critical Contradiction

***Depth thresholds****: Business Rules field says "Creating at depth 4 or deeper returns a soft warning." AC4 says warning fires when creating at level 5 (parent at depth 4). Data-map confirms depth 5 = warn, depth 7 = block. ****ACs are authoritative — warning fires when resulting depth = 5 or 6.***

---

## Phase 3 — Refined Acceptance Criteria (key additions)

***PO Answers received 2026-06-02:***

- Warning fires when resulting depth = 5 OR 6 (parent at depth 4+). No warning at depths 1–4.
- Depth enforcement: app layer (early return) + DB constraint (safety net). Error code: `MODULE*DEPTH*EXCEEDED`.
- Description: optional, max 500 chars, Markdown stored, renders in tree view below module name — 3-line truncate + "more" expand. 501+ chars rejected.

***New scenarios added:***

- Scenario E1: Accept name = 80 chars (max boundary)
- Scenario E2: Reject name = 81 chars
- Scenario E3: Reject whitespace-only name
- Scenario E4: Reject viewer-role creation (HTTP 403)
- Scenario E5: Reject cross-project parent*module*id
- Scenario E6: Verify position = last sibling + 1

---

## Phase 4 — Test Coverage Estimate (25 outlines)

| Type  | Count  |
| --- | --- |
| ------ | ------- |
| Positive  | 6  |
| Negative  | 8  |
| Boundary  | 4  |
| Integration  | 4  |
| API  | 3  |
| ***Total****  | ****25***  |

---

## Open Questions for Dev (non-blocking for PO)

1. Implementation pattern: REST `POST /api/v1/modules` or Server Action / Supabase RPC?
2. Position assignment strategy on concurrent sibling creates?
3. Does `POST /api/v1/modules` support `Idempotency-Key` header?
4. Does module creation write to `activity_log`?
5. Does Supabase Realtime broadcast on `modules` INSERT?
6. Exact error message text for AC3 (min name) and AC5 (depth exceeded)?

---

## Story Quality Assessment

***Verdict***: Needs Improvement

- Missing AC: 80-char name upper boundary
- Missing AC: viewer-role authorization gate
- Missing AC: description field (now resolved by PO)
- ACs use paraphrased error messages — exact text still open for AC3 and AC5
- Implementation pattern unspecified — blocks integration test strategy

---

## Risks

| Risk  | Likelihood  | Impact  |
| --- | --- | --- |
| ------ | ----------- | -------- |
| Depth threshold built at wrong level (fires at 4 instead of 5)  | Medium  | High  |
| `path` column not correctly materialized after nested create  | Medium  | High  |
| Module creation not RLS-scoped (cross-workspace access)  | Low  | Critical  |
| Position collision under concurrent creates  | Low  | Medium  |

---

**Full shift-left-refinement.md stored in the Acceptance Test Plan field. Full analysis available in** `.context/PBI/EPIC-BK-7-project-module-hierarchy/stories/STORY-BK-9-.../shift-left-refinement.md`

---

### Luis Eduardo Flores Villarroel - 6/1/2026, 10:51:18 PM

@@Ely está listo el shift-left de esta US, saludos.

---

### Ely - 6/4/2026, 3:19:21 AM

## Ready for QA — BK-9 deployed to staging

***Staging:*** https://staging-upexbunkai.vercel.app
***PR:*** #8 (merged) https://github.com/upex-galaxy/upex-bunkai-tms/pull/8

### What shipped

- POST /api/v1/projects/{id}/modules (project id = UUID, cookie-session auth). Create modules + nest sub-modules.
- Project view: "New Module" (root) + per-node "Add sub-module", create form (name + live slug preview + optional description), module breadcrumb (display names, e.g. Payment / Refunds) on selection.
- New nullable column modules.description (Markdown stored raw, plain render for now; rich editor arrives with BK-16).

### As-built contract (test against THIS — house error code + granular details.reason)

- Success: 201 { module: { id, project*id, parent*module*id, path, name, position, description, created*at }, warning? }. The warning string is present only when resulting depth >= 5 (non-blocking).
- Name shorter than 2 / longer than 80 / no alphanumeric: 422, details.reason name*too*short | name*too*long | name*no*alphanumeric. (Min is 2, not 3.)
- Description over 500 chars: 422, details.reason description*too*long.
- Resulting depth over 6: 422, details.reason depth_exceeded (blocked).
- Duplicate sibling name under same parent: 409, details.reason module*slug*duplicate.
- Parent not in this project: 422, details.reason parent_invalid.
- Non-member / viewer role: 403, details.reason not*a*member. (Viewers also do not see the create controls in the UI.)
- Bad UUID or invalid JSON: 400. Unauthenticated: 401.

### Test focus

- Depth boundaries: create at depth 5 and 6 (created + warning), depth 7 (blocked).
- Name boundaries: 2 chars accepted, 1 char rejected, 81 chars rejected, whitespace-only rejected.
- Cross-workspace: user of WS-A cannot create in a WS-B project.
- Breadcrumb reads parent display names (Payment / Refunds), not slugs.
- Slug auto-derived per parent, unique; duplicate sibling name → 409.

### data-testids

create-module-form, create-module-name, create-module-slug-preview, create-module-description, create-module-submit, create-module-cancel, create-module-modal, create-module-error, module-new-root, module-add-sub-{id}, module-row-{id}, module-breadcrumb.

### Out of scope

Rename / move / delete (BK-10, BK-11), bulk import, drag-drop reorder, per-module permissions, rich Markdown editor (BK-16).

---


_Synced from Jira by sync-jira-issues_
