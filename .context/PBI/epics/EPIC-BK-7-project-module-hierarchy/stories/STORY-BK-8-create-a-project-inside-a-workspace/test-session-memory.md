# BK-8 — Test Session Memory (cross-stage shared state)

> NON-Jira hand-authored file. Shared payload across Session Start → Stage 1 → Stage 2 → Stage 3.
> Story: TMS-Project | Create a project inside a workspace. Epic BK-7. Status: In Test.

## TMS modality
Jira-native (no Xray). ATR = Story field `{{jira.acceptance_test_results}}` + QA comment. Bugs = Jira `Bug` issues, project key `BK`.

## Environment (session)
- Active env: **staging** — `https://staging-upexbunkai.vercel.app` (reachable, 307 login redirect on root).
- API base: `/api/v1`. Supabase project `fmbpikzpkafptqximhxn`.
- No override. No prod testing.

## Auth recipe (load-bearing — staging user has NO password)
Password grant fails (both app `/auth/signin` and raw Supabase `grant_type=password` → invalid_credentials). Working path = **PKCE magic-link via Resend inbox**:
1. `POST /api/v1/auth/magic-link {email}` with cookie jar `-c` → captures `sb-<ref>-auth-token-code-verifier` cookie. (Rate limit: 7s between requests.)
2. `resend emails receiving list/get <id>` → extract `…/auth/v1/verify?token=pkce_…&type=magiclink&redirect_to=…` (inbox `bunkai-staging-user@delgri.resend.app` DOES receive).
3. `curl -b jar -c jar -L <verify-url>` → redirects through `/auth/callback`, mints `sb-<ref>-auth-token` session cookie.
4. Project-create route is **cookie-session only** (reads cookies via `@lib/supabase/server`; a bare Bearer token would 401).
- Test user `b9912574-bcd2-4e90-b5b3-7f331a705a6e` started with ZERO workspace memberships → had to create workspaces first.

## Preconditions created (test data on staging — throwaway QA workspaces)
- WS1 `bc75c0d4-6d92-4d3f-a92f-f41e4b1774fe` slug `qa-bk8-1780533325` (active).
- WS2 `3fea0e11-ff28-4d84-93bd-fcb0c511561c` slug `qa-bk8b-1780534540`.
- ~17 projects created across both for the battery (incl. reserved-slug projects api/new/settings/admin/null/docs). DB `projects` table was EMPTY before this session.

## As-built contract (source of truth — supersedes ATP error codes)
Validation now returns **422 `validation_failed`** (ATP assumed 400). Reasons: `name_too_short|name_too_long|name_no_alphanumeric|description_too_large`. Dup → 409 `conflict` `slug_duplicate_in_workspace`. Non-member → 403 `forbidden` `not_a_member`. Bad UUID/JSON → 400 `bad_request`. Unauth → 401.

## Test execution matrix (Stage 2, staging, 2026-06-04)
| TC | Case | Expected (as-built) | Actual | Verdict |
|----|------|------|--------|---------|
| T01 | happy `Checkout v2` | 201 slug checkout-v2 | 201 ✓ | PASS |
| T02 | name 2ch `AB` | 422 name_too_short | 422 ✓ | PASS |
| T03 | name 81ch | 422 name_too_long | 422 ✓ | PASS |
| T04 | name `---` | 422 name_no_alphanumeric | 422 ✓ | PASS |
| Tb | name 3ch / 80ch (boundary) | 201 | 201 ✓ | PASS |
| T05 | dup slug same ws | 409 slug_duplicate_in_workspace | 409 ✓ | PASS |
| T06 | same slug diff ws | 201 | 201 ✓ | PASS |
| T07 | non-member ws | 403 not_a_member | 403 ✓ | PASS |
| T09 | **reserved slug `api`/`new`/`settings`/`admin`/`null`/`docs`** | 422/400 SLUG_RESERVED | **201 (all)** | **FAIL → BUG-1** |
| T10 | ghost ws UUID | 403 (enumeration-safe) | 403 ✓ | PASS |
| T11 | desc 5121B / 5120B | 422 / 201 | 422 / 201 ✓ | PASS |
| T12 | desc null | 201 | 201 ✓ | PASS |
| T13 | slug derivation: accents `Café Münchën`→cafe-munchen, `##Hi Project##`→hi-project, emoji→rocket, 40-char truncation no dangling hyphen | 201 + correct slug | ✓ | PASS |
| T13b | **i18n `日本語プロジェクト` / Cyrillic `Проект`** | 201 (valid name) | **422 name_no_alphanumeric** | **FAIL → BUG-3** |
| T14 | DB integrity post-201 | rows match, per-ws unique | ✓ (16 rows) | PASS |
| T15 | unauthenticated | 401 | 401 ✓ | PASS |
| Tx | bad UUID / invalid JSON | 400 bad_request | 400 ✓ | PASS |
| T08 | viewer role → 403 | 403 | live-BLOCKED (no viewer user); code+RLS verified (migration 0002 INSERT limited to member/admin/owner) | DEFERRED |
| UI-1 | form renders + live slug preview | slug updates per keystroke | ✓ `My New Checkout Flow!!`→`my-new-checkout-flow` | PASS |
| UI-2 | create via UI → list refresh | project appears | ✓ stays on /projects (MVP) | PASS (scope note) |
| UI-3 | **`/projects/{slug}` detail not workspace-scoped** | scoped per workspace | **cross-workspace: loads non-active WS project; dup slug shadows** | **FAIL → BUG-2** |

## Defects found
- **BUG-1 (Major)** — Reserved-slug validation absent. All reserved words create 201. Violates AC-11 + Dev Q8 commitment + arch acceptance criterion. Code: `app/api/v1/workspaces/[id]/projects/route.ts` has no reserved check (workspaces route does); `SLUG_RESERVED` not in API_ERROR_CODES. Latent routing-collision risk under `/projects/[projectSlug]`.
- **BUG-2 (Major)** — Project detail route `/projects/{slug}` omits workspace; global slug resolution crosses workspace boundary and shadows duplicate-slug projects. Active-WS `checkout-v2` unreachable (Second WS wins). Contradicts workflow AC step 9 (`/workspaces/{ws-slug}/projects/{project-slug}`). Undermines the per-workspace-unique-slug design (T06 "valid across workspaces" is created but not addressable).
- **BUG-3 (Minor / Improvement)** — `hasAlphanumeric` is ASCII-only `[a-z0-9]`; CJK/Cyrillic/other non-Latin names rejected with `name_no_alphanumeric`. International users cannot name a project in their own script. Latin accents are fine (NFD-stripped).
- **NIT** — Viewer (a member) blocked by RLS returns reason `not_a_member` (misleading; true cause is role-too-low).

## Verdict
**QA FAILED — NO-GO.** Core API/DB validation is solid, but AC-11 (reserved slugs) fails outright and the detail-route is not workspace-scoped (BUG-2). Recommend story back to dev.
