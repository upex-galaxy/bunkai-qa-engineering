# BK-2: Sign up and sign in with email (magic-link)

**Ticket:** [BK-2](https://jira.upexgalaxy.com.net/browse/BK-2) | **Module:** tenancy-identity | **Status:** Ready For QA | **Sprint:** Bunkai (67) Sprint 1 (active, 2026-05-11 → 2026-06-08)
**Epic:** [BK-1](https://jira.upexgalaxy.com.net/browse/BK-1) — Tenancy & Identity
**Source spec:** FR-001 (email side only; OAuth covered by BK-3)
**Reporter:** Ely | **Assignee:** Unassigned | **Priority:** Medium | **Story Points:** —
**Labels:** `auth`, `mvp`, `wave-1`, `shift-left-2026-05-25`, `shift-left-reviewed`

---

## Acceptance Criteria

Refined ACs are documented in [`shift-left-refinement.md`](./shift-left-refinement.md) §3 (Background + 12 scenarios across happy / negative / boundary / edge).

Original Jira AC (from `story.md`, pre-refinement) covers 4 scenarios:
- AC1 — Successful email magic-link sign-up.
- AC2 — Invalid email format rejected.
- AC3 — Magic-link token replay blocked.
- AC4 — Magic-link expiry rejection.

Reconciliation decisions made in shift-left §2:
- §2.1 Redirect target: `/onboarding → /projects` chain replaces non-existent `/home`.
- §2.2 Workspace bootstrap: manual `/onboarding` wins over auto-create on first sign-in; UX pre-fills name + slug suggestions.
- §2.3 Error codes: extend `ApiError` envelope with `INVALID_EMAIL`, `TOKEN_USED`, `TOKEN_EXPIRED`, `MISSING_CODE`, `RATE_LIMITED`, `UPSTREAM_ERROR`.
- §2.4 TTL 15 min — ops/docs concern (Supabase `auth.otp_exp = 900`).
- §2.5 RFC 5321 254-char enforcement: server `z.string().email().max(254)` + client length guard.
- §2.6 Resend-before-expiry: MVP keeps both tokens valid + 60s UI cooldown.

**Jira customfield state (verified 2026-05-27):** `Acceptance Criteria (Gherkin)`, `Acceptance Test Plan (ATP)`, `Acceptance Test Results (ATR)`, `Business Rules Specification`, `Scope`, `WORKFLOW` are ALL EMPTY on the Jira Story. Refined content lives only in `shift-left-refinement.md` locally. Stage 1 will mirror the refined ATP into the `acceptance_test_plan` Jira custom field per Modality jira-native flow.

---

## Team Discussion

> Extracted from Jira comments (3 total, all by Ely — sole reporter on this ticket).

### Key Decisions

- **[Ely] (2026-05-19):** Architect Annotation — established stack: Frontend `app/(auth)/login/page.tsx` + `<MagicLinkForm />`; Callback `app/auth/callback/route.ts`; Backend wraps Supabase `signInWithOtp`; tables `auth.users`, `workspaces`, `workspace_members`; mailer = Supabase managed.
- **[Ely] (2026-05-25):** Shift-Left Refinement passed (mirror of `shift-left-refinement.md`). Story moved to label set `shift-left-2026-05-25 + shift-left-reviewed`. Sprint-testing Stage 1 can short-circuit AC re-analysis.
- **[Ely as Dev] (2026-05-27):** **Implementation comment** — sprint MVP closes EPIC-BK-1 lean: commit `69669d2` "feat(auth): rfc 5321 email length cap + magic-link audit trail"; Sprint 1 base shipped `POST /api/v1/auth/magic-link` route + `/auth/callback` exchange.

### Technical Notes

- **[Ely-Dev] (2026-05-27):** Surfaces ready for QA:
  - `POST /api/v1/auth/magic-link` — Zod-validated, RFC 5321 email length cap 254.
  - `/login` UI consumes it.
  - `magic_link_tokens` audit table (migration `0009`) — best-effort issuance log with `ip_hash` + `user_agent`.
- **[Ely-Dev] (2026-05-27):** Reference doc on target: `.context/PBI/epics/EPIC-BK-1-tenancy-identity/MVP-NOTES.md` (LOCAL TO TARGET REPO — NOT YET SYNCED HERE).
- **[Ely-Dev] (2026-05-27):** In-app testability guide: `/qa` on the running app + Jira Epic BK-29.

### Edge Cases / Scope Cuts Raised

- **[Ely-Dev] (2026-05-27):** OUT OF SCOPE for this MVP: dedicated replay enforcement — Supabase Auth handles OTP replay natively. ⚠️ **This contradicts shift-left §2.3 + §3 negative scenario `TC-OUT-NEG-03` (TOKEN_USED).** Decision: still test replay behavior via Supabase-native rejection path, but do NOT expect the custom `TOKEN_USED` envelope code — record whatever Supabase returns and flag any UX gap in the QA report.

---

## Related Code (target repo `../upex-bunkai-tms`)

### Frontend
- `app/(auth)/login/page.tsx` — sign-in shell (brand panel + Suspense-wrapped form).
- `app/(auth)/login/magic-link-form.tsx` — client form, regex email validation, POSTs `/api/v1/auth/magic-link`.
- `app/(app)/onboarding/page.tsx` — server-side guard: signed-in + no workspace → form; has workspace → `/projects`.
- `app/(app)/onboarding/onboarding-form.tsx` — manual slug + name input, calls RPC `bunkai_bootstrap_workspace`.

### Backend / Routes
- `app/api/v1/auth/magic-link/route.ts` — Zod schema, Supabase `signInWithOtp`, 429 → `rate_limited`. RFC 5321 cap added 2026-05-27 (commit `69669d2`).
- `app/auth/callback/route.ts` — Supabase `exchangeCodeForSession`, redirect to `/projects` (per code; AC says `/onboarding` — known divergence, see shift-left §2.1).
- `middleware.ts` — protects `/projects` + `/onboarding`, preserves `?next=` round-trip.

### Database
- `supabase/migrations/0006_bootstrap_workspace.sql` — atomic workspace + workspace_members row insert, security-definer RPC.
- `supabase/migrations/0009_*` — `magic_link_tokens` audit table (issuance log with `ip_hash` + `user_agent`) — **NEW for this sprint**.
- Tables touched at runtime: `auth.users` (Supabase-managed), `workspaces`, `workspace_members`, `magic_link_tokens`.

### External Services
- Supabase Auth — magic-link email dispatch (15-min TTL via `auth.otp_exp = 900`, ops-managed).

---

## TMS Artifacts

| Artifact                                                                                 | ID      | Status             |
| ---------------------------------------------------------------------------------------- | ------- | ------------------ |
| ATP (Modality jira-native: Story `acceptance_test_plan` customfield + comment mirror)    | Pending | Created in Stage 1 |
| ATR (Modality jira-native: Story `acceptance_test_results` customfield + comment mirror) | Pending | Created in Stage 3 |

> TMS Modality resolved as **jira-native** (no Xray). `.context/master-test-plan.md` is missing — DEFAULTED per Phase 0 §4 fallback. Confirm with user before Stage 1 fires.

---

## Open Questions (carry-overs from shift-left §7)

These were filed at shift-left time and remain open. QA does NOT block on them but should surface answers/observations during Stage 2.

### For PO (un-answered as of 2026-05-27)
1. **Resend semantics:** MVP = both tokens valid + 60s cooldown — confirm during QA review.
2. **Workspace-name default:** Pre-fill `"{email-prefix}'s workspace"` — observe in onboarding form.
3. **Modern UX scope:** Verify which of §5.1-5.9 actually landed in this MVP (observe and document gaps).
4. **`/home` route:** AC says `/home`; code says `/projects` (or `/onboarding`). Will QA actually find `/home`? Test answers the question.
5. **Magic-link email template:** Default GoTrue template ships — note any branding gaps.

### For Dev (technical)
6. **Supabase error code mapping:** Observe actual codes returned by `exchangeCodeForSession` on (a) replay and (b) expiry — record verbatim.
7. **`auth.otp_exp = 900` ops checklist:** Verify on staging by sending a link + waiting >15 min.
8. **Bootstrap RPC race:** Double-click `/onboarding` — observe behavior (expected: `23505` surfaces as "slug taken").
9. **`workspace_members.status='active'` invariant:** Confirm guard filter behavior.

### New (raised by dev 2026-05-27 implementation comment)
10. **Replay enforcement strategy:** Dev says Supabase-native replay handling — what is the actual error envelope returned to UI? Does it map cleanly to `?error=TOKEN_USED` per shift-left §2.3, or is there a UX gap?
11. **Where is `MVP-NOTES.md`?** Dev references `.context/PBI/epics/EPIC-BK-1-tenancy-identity/MVP-NOTES.md` — file MISSING in this repo. Either sync from target or read it directly via `../upex-bunkai-tms/...` path.
12. **`/qa` route + Epic BK-29 testability guide:** Dev pointed to in-app `/qa` page — explore during Stage 1 smoke for QA testability shortcuts (data-testid map? seed users?).

---

## Session Notes

### Session 1 — 2026-05-27 (Session Start, sprint-testing single-ticket mode)

- Context fetched from Jira via `acli` + REST (acli base view shape is thin — used REST for custom-field probing).
- Status verified: **Ready For QA** ✓ (canonical sprint-testing entry).
- Shift-left handoff confirmed: `shift-left-reviewed` label present; refined ACs + 17 outline TCs already documented in `shift-left-refinement.md`.
- Dev implementation comment (2026-05-27) lands the same day as session start — fresh code, no prior QA passes.
- Sprint: `Bunkai (67) Sprint 1` (active).
- TMS modality defaulted to `jira-native` (no Xray evidence in repo).
- ATP/ATR/AC customfields on Jira are EMPTY — Stage 1 will populate.
- Sprint-testing Stage 1 will inherit the shift-left ATP DRAFT as starting input (skip Phases 1-3 re-analysis per `shift-left-reviewed` short-circuit).
