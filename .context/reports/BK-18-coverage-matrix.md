# BK-18 — Coverage Matrix (AC → TC) + ROI Verdicts

**Story:** BK-18 — TMS-ATC API | Create and edit ATCs with steps and assertions (`POST /api/v1/atcs`, `PATCH /api/v1/atcs/{id}`)
**Epic:** BK-13 (ATC Library) · **Modality:** jira-xray · **Generated:** 2026-06-29 (test-documentation Stage 4)

## TMS containers

| Container | Key | Role |
|---|---|---|
| ATP (Test Plan) | BK-94 | designs the TCs |
| ATR (Test Execution) | BK-95 | executes the TCs (12/12 PASS, re-run 2026-06-20) |
| Pre-Condition | BK-161 | shared setup across all 12 |
| Feature Test Set | BK-186 | `Test Set: BK-13 ATC Library` (created this stage) |
| Regression Test Plan | BK-65 | `STP: Q1-S3: Regression Testing` |
| QA Test Repository epic | BK-70 | repository umbrella |
| Prior bug | BK-96 | 412 PATCH (fixed via X-If-Match); covered by TC08 |

## AC → TC coverage

| AC | Description | TCs | Status |
|---|---|---|---|
| AC1 | Create ATC with valid payload → 201, v1, slug, `atc.created` | TC01 (BK-149) | covered |
| AC2 | Reject AC from different US → 422 `ac_outside_user_story` + rollback | TC03 (BK-151), TC07 (BK-155, DB-verified rollback) | covered |
| AC3 | Reject module outside project subtree → 422 `module_outside_project_subtree` | TC04 (BK-152) | covered |
| AC4 | Step positions strictly increasing from 1 → 422 `steps_position_invalid` | TC05 (BK-153) | covered |
| AC5 | PATCH cascade-replace atomically → 200, version bump, `atc.updated` | TC08 (BK-156) | covered |
| (cross) | Auth + scope gate (401/401/403) | TC02 (BK-150) | covered (woven, not standalone security TC) |
| (boundary) | Request-body BVA (title/steps/tags/layer) | TC06 (BK-154) | covered |
| (locking) | Optimistic lock via X-If-Match (200/409/200) | TC09 (BK-157) | covered |
| (negative) | PATCH 404 not_found | TC10 (BK-158) | covered |
| (rule) | PATCH empty-body no-op (no version bump, no event) | TC11 (BK-159) | covered |
| (integrity) | PATCH immutable slug/US/module | TC12 (BK-160) | covered |

Every AC has ≥1 TC (floor met). Coverage extends beyond ACs into boundary, negative, locking, and integrity cases (risk-beyond-AC).

## ROI verdicts

| TC | Key | ROI (approx) | Verdict | Smoke | Prior-bug |
|---|---|---|---|---|---|
| TC01 | BK-149 | ~17 | Candidate | ✓ | |
| TC02 | BK-150 | ~31 | Candidate | | |
| TC03 | BK-151 | ~11 | Candidate | | |
| TC04 | BK-152 | ~11 | Candidate | | |
| TC05 | BK-153 | ~8 | Candidate | | |
| TC06 | BK-154 | ~8 | Candidate | | |
| TC07 | BK-155 | ~7 | Candidate | | |
| TC08 | BK-156 | ~17 | Candidate | ✓ | BK-96 |
| TC09 | BK-157 | ~7 | Candidate | | BK-96 area |
| TC10 | BK-158 | ~10 | Candidate | | |
| TC11 | BK-159 | ~6 | Candidate | | |
| TC12 | BK-160 | ~9 | Candidate | | |

**All 12 = Candidate; 0 Manual, 0 Deferred.** Justification: API-only contract suite (cheap to automate, stable, runs every PR) and the 12 are the already-curated sprint funnel — the derive→document reduction happened upstream in `/sprint-testing`, so promoting the full curated set is correct here (the "most should be Deferred" rule-of-thumb governs the raw derivation count, not the persisted sprint Tests).

## Cross-cutting (NOT separate TCs)
- Security/auth → woven into TC02.
- Unicode/emoji title, step content >2KB → folded into boundary coverage (TC06).
- Concurrency → modeled via optimistic-lock stale/match (TC09); not a true parallel-load test.
- No a11y/responsive/visual (API-only; UI is BK-19). Performance not budgeted.

## Dev-facing observations (not defects)
- `affected_test_ids` returns `null` though MVP contract said `[]` (`test_steps` lands in EPIC-BK-5).
- 404 message collapses three not-found causes ("ATC, user story, or module not found") — coarse, documented.
- Legacy `If-Match` header → 412 at Vercel edge — documented limitation; authoritative header is `X-If-Match`.

## Handoff
All 12 Candidate → flow to `/test-automation` (ticket-driven scope → "Ticket (Medium)"). API-only KATA: `{ api }` fixture, `app/api/v1/atcs/route.ts` + `[id]/route.ts`.
