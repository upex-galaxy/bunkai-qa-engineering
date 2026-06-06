# Comments for BK-28

[View in Jira](https://jira.upexgalaxy.com/browse/BK-28)

---

### jesusgpythondev - 6/4/2026, 10:39:04 PM

## 🧪 Acceptance Test Plan (ATP) — Shift-Left v2

> Refined by QA Lead Sr on 2026-06-04. 12 Gherkin scenarios covering Happy (2), No-op (2), Negative (4), Boundary (2), Integration (2).

### AC → Gherkin Traceability

| AC | Original Scenario | Gherkin Scenarios | Coverage |
|---|---|---|---|
| AC-1 | Elena drags ATC and saves | GS-1 (Happy: reorder), GS-2 (Persistence) | ✅ Full |
| AC-2 | No-op reorder | GS-3 (No-op: same order), GS-4 (Single ATC) | ✅ Full |
| AC-3 | Viewer cannot reorder | GS-5 (Unauthenticated), GS-6 (Viewer forbidden) | ✅ Full |
| AC-4 | Concurrent reorder blocked | GS-7 (Version conflict), GS-12 (Retry-safe) | ✅ Full |
| — | — | GS-8 (Chain mismatch), GS-9 (Duplicate ids), GS-10 (Empty chain), GS-11 (Activity log) | ✅ New |

### Gherkin Scenarios

***Background:***
- Given workspace has Test TEST-1 with chain [ATC-A, ATC-B, ATC-C, ATC-D] at version 1
- Elena has PAT with scope test:write

***GS-1 — Successful reorder:**** PATCH /tests/TEST-1/reorder with chain [A,D,B,C] + If-Match:1 → 200, version=2, DB positions updated (SELECT count(**) = 4, position 1 = A, position 2 = D, etc.), test.reordered event logged with old*chain and new*chain

***GS-2 — Reorder persists:*** GET /tests/TEST-1 after reorder → chain shows [A,D,B,C], version = 2

***GS-3 — No-op same order:*** PATCH with same chain [A,B,C] → 200, version unchanged (3), updated_at unchanged, no event logged

***GS-4 — Single-ATC no-op:*** PATCH [A] on single-ATC Test → 200, version unchanged (1), no event

***GS-5 — Unauthenticated:*** No auth header → 401 unauthorized, no rows updated

***GS-6 — Viewer forbidden:*** Role viewer → 403 forbidden, no rows updated

***GS-7 — Version conflict:*** Two concurrent PATCHes with If-Match:1 → first 200 v2, second 409 with current*chain = [C,B,A] and current*version = 2 in body. Only 1 event logged.

***GS-8 — Chain mismatch:**** Submitted chain has ATC-X not in Test → 422 chain_mismatch with missing = [ATC-B] and extra = [ATC-X] in details. SELECT count(**) unchanged.

***GS-9 — Duplicate ATC ids:*** Chain [A,A,B] → 422 chain_invalid (duplicate references). No rows updated.

***GS-10 — Empty chain:*** Chain [] → 422 chain_invalid (at least one ATC). No rows updated.

***GS-11 — Activity log:*** Real reorder → test.reordered event with old*chain = [A,B,C], new*chain = [C,A,B], author_id = Elena's id, timestamp within 1 second

***GS-12 — Retry-safe:*** Double-click same reorder → first 200 v2, second 200 v2 (no-op), only 1 event logged

### Risk Score: 🟢 12/125
- Complexity: 2 (single PATCH, array reorder, no-op detection)
- Uncertainty: 2 (pattern exists from BK-18; tests table pending from BK-27)
- Blast Radius: 3 (affects Run execution order, no data loss)

### Dependency: blocked-by BK-27 (Test assembly) — tests table does not exist yet


---

### jesusgpythondev - 6/4/2026, 10:39:14 PM

## Senior Decisions — Shift-Left Refinement Rationale

> Resolved inline by 4 senior roles on 2026-06-04. No open questions remain.

### 🧪 Senior QA Decisions

1. ***Error codes***: chain*mismatch (422), chain*invalid (422), conflict (409) — all fit existing API*ERROR*CODES envelope pattern. chain*mismatch includes details.missing and details.extra arrays so the UI can show exactly what's wrong. chain*invalid covers empty arrays, duplicates, and other structural violations.

2. ***Permission gate***: requireAuth() + role check (member/admin/owner) — viewer gets 403 forbidden. Same pattern as ATC routes. RLS policy tests*update*workspace*role*member_plus also blocks at DB level (defense in depth). The API route checks first for fast-fail before the DB query runs.

3. ***Activity log shape***: test.reordered with old*chain + new*chain arrays — full audit trail, not just summary. Event payload includes test*id, author*id, old*chain (array of uuids before reorder), new*chain (array of uuids after reorder), and timestamp. If no event_log table exists yet, this Story creates a minimal one.

### 👑 Senior PO Decisions

1. ***If-Match lenient mode***: UI clients may not track version — absent header skips check, version still bumps on real change. Matches BK-18 precedent. Bearer/agent clients SHOULD send it for safety. Strict mode can be added later if audit requirements demand it — changing from lenient→strict is backward-compatible; the reverse is not.

2. ***Activity log detail***: Full chains in event payload — debugging needs before/after, not just "someone reordered". Event consumers (future activity-log UI, BK-30 Runs) can filter or aggregate as needed.

3. ***Scope boundary***: Reorder only — add/remove ATCs is separate Story. Set equality check enforces this at API level. The business rule is explicit: "Reorder preserves the set of ATCs exactly."

### 🔧 Senior DEV Decisions

1. ***API endpoint***: PATCH /api/v1/tests/{id}/reorder — dedicated sub-resource, body is complete new order (not a diff). Keeps reorder separate from full Test PATCH (which would handle title edits, metadata, etc.). The server computes the delta.

2. ***Optimistic locking***: If-Match header, 409 on mismatch with current chain in response body. RFC 7232 standard. Same pattern as BK-18 ATC PATCH. Route handler checks header BEFORE opening DB transaction — cheap fail-fast.

3. ***No-op detection***: JSON.stringify comparison of ordered arrays — exact match = no version bump, no event, no updated*at change. The bunkai*set*updated*at() trigger does not fire because no UPDATE occurs. O(n) comparison before transaction.

4. ***Chain validation***: Set equality + uniqueness check before DB write. Set equality: new Set(a).size === new Set(b).size && [...new Set(a)].every(x => b.includes(x)). Uniqueness: new Set(chain).size === chain.length. Zod superRefine for duplicates.

5. ***Version field***: tests table needs version int (BK-27 should include it; if not, BK-28 adds migration: ALTER TABLE tests ADD COLUMN version int not null default 1). Same pattern as atcs.version in migration 0004.

6. ***DB operation***: UPDATE test_steps positions in single transaction — atomic, no partial state. The chain array maps to positions: position 1 = chain[0], position 2 = chain[1], etc. Uses CASE WHEN or unnest with ordinality for efficiency.

7. ***Idempotency***: Not needed — optimistic locking + no-op detection make retries inherently safe. Double-click from UI: first 200 (version bumps), second 200 (no-op, same order).

### 🎨 Senior Design Decisions

1. ***Conflict resolution UX***: Modal with side-by-side comparison (Your order vs Current order). Two buttons: "Keep theirs" (reload) and "Apply mine" (retry with new version). Modal shows ATC titles (not just ids) for readability.

2. ***No-op feedback***: Silent 200 — Save button shows brief checkmark then re-enables. No toast for no change. The user already sees the chain hasn't moved, so a toast would be redundant.

### Dependency Note

BK-28 is ***blocked-by BK-27*** (Test assembly). The tests and test_steps tables do not exist yet. BK-27 must land first (or in the same sprint with BK-27 scheduled before BK-28).


---


_Synced from Jira by sync-jira-issues_
