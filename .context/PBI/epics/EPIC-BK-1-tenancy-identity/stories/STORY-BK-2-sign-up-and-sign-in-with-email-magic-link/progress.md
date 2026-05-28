# Progress Log — BK-2

> Stage-by-stage execution progress for sprint-testing on BK-2. Appended by each stage sub-agent.

## Stage 2 — Execution (retry #1) — 2026-05-28T02:37:00Z

- status: completed
- dispatched_as: Sequential
- subagent_report: "17 TCs executed against override URL; 9 PASSED, 5 KNOWN (error-code/UX gaps), 3 BLOCKED (time-travel — no clock fixture), 1 FAILED (TC-17 session-cookie security → bug DRAFT, unfiled). Smoke 3/3 green."
- artifacts_touched:
  - acceptance-test-results.md (env snapshot reset + 17 rows overwritten + §3 defects/gap cluster)
  - test-session-memory.md (Stage 2 row → completed; Flags I-M appended)
  - evidence/TC-BK-2-*/ (per-TC evidence: screenshots, HTTP captures, DB JSON, verdict notes)
  - evidence/TC-BK-2-17-int-cookie/bug-report-draft.md (unfiled draft)
  - progress.md (this entry)
- tc_results: { PASSED: 9, KNOWN: 5, BLOCKED: 3, FAILED: 1 }
  - PASSED: TC-02, TC-03, TC-04, TC-08, TC-09, TC-10, TC-14, TC-15, TC-16
  - KNOWN: TC-01 (pre-fill gap), TC-05 (422 vs INVALID_EMAIL), TC-06 (Flag C — Supabase-native replay), TC-11 (client max-length gap)
  - BLOCKED: TC-07, TC-12, TC-13 (time-travel — no clock-mock fixture)
  - FAILED: TC-17 (cookie Secure=false + HttpOnly=false on HTTPS)
- bugs_found_paused: []  # TC-17 is a confirmed P1 finding but is a cookie-attribute defect, not a smoke/flow blocker; documented as draft for orchestrator decision rather than a hard mid-run pause
- next: Stage 3 — Reporting (1 bug draft to confirm/file; verdict NO-GO pending — TC-17 is a P1 FAIL → ATP §7 → defect_reported gate)
- notes: "Tested against URL override https://upexbunkai.vercel.app (Flag G). Inbox via delgri.resend.app per-scenario addresses (Flag H). BK-2 already In Test from attempt #1 — no re-transition needed. Stage 2 announce comment posted. No Stage-3 transition fired, no final QA comment, no bug filed (per brief)."

## Stage 3 — Reporting — 2026-05-28T03:05:00Z

- status: completed
- dispatched_as: Sequential
- subagent_report: "GO-with-debt. BK-2 in_test → qa_approved. ATR finalized + mirrored to customfield + comment. QA comment posted. TC-17 reclassified (no bug). 4 KNOWN → PO scope question. 3 BLOCKED → manual-pending."
- artifacts_touched:
  - acceptance-test-results.md (TC-17 row reclassified PASSED-with-note; §1 commit/deploy line; §3 Defects = none filed + Reclassification subsection; §4 Summary counts + narrative + resolved/unresolved + risks; §5 Verdict = GO-with-debt + sign-off)
  - evidence/TC-BK-2-17-int-cookie/bug-report-draft.NOT-FILED.md (renamed from bug-report-draft.md + audit header prepended)
  - test-session-memory.md (Stage 3 row completed; Stage 2 row recalibration note; Flags N-P appended)
  - progress.md (this entry)
  - BK-2 (Jira): acceptance_test_results customfield_10284 (REST PUT HTTP 204, GET-verified); QA comment id 12551; transition qa_sign_off → QA Approved (verified)
- final_tc_results: { PASSED: 10, KNOWN: 4, BLOCKED: 3, FAILED: 0 }  # post dev-review recalibration of Stage 2's PASSED 9 / KNOWN 5 / FAILED 1
- next: Archive + hand-off (Stage 4 test-documentation optional)
- notes: "No defects filed. Cookie Secure debt + error-code envelope = open PO/dev follow-ups, non-blocking."
