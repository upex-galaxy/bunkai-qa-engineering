+--------------------------------------------------------------------+
|                                                                    |
|                  BUNKAI TMS — MASTER TEST PLAN                      |
|                                                                    |
|     What to test in this system, and why it matters.               |
|     The strategy layer above business-data-map + feature-map.      |
|                                                                    |
+--------------------------------------------------------------------+

> **What this is**: a ranked testing roadmap for Bunkai TMS — an open-core,
> multi-tenant test-management SaaS (Next.js 15 App Router + Supabase Postgres/Auth/RLS).
> It sits on top of `business-data-map.md`, `business-feature-map.md`, and `business-api-map.md`
> and converts them into "test this first, and here's the business reason."
>
> **What this is NOT**: a flow catalog (→ data-map), a feature inventory (→ feature-map),
> an endpoint reference (→ api-map), or a test-case list (→ TMS, via `/test-documentation`).
>
> **One meta-point to hold the whole time you read this**: Bunkai is a system whose *product*
> is correctness and traceability. Its anchoring moat — every ATC must link to a User Story and
> at least one Acceptance Criterion (INV-1, INV-2) — is the thing customers pay for. So a bug that
> silently lets an ATC exist without a Story isn't a cosmetic defect; it's a hole in the value
> proposition. Treat data-integrity invariants here the way you'd treat a balance calculation in a
> banking app.

---

## 1. Executive risk map

The most fragile surfaces in Bunkai are not the screens — they're the **authorization boundary** and the
**credential plumbing**. Almost all real authorization lives inside Postgres RLS, reached through four
`SECURITY DEFINER` helper functions that exist specifically to dodge an infinite-recursion bug (42P17);
the API handlers "mostly trust the database to be the boundary." That means an RLS regression is a security
breach, not a glitch, and it will be invisible from the UI. Layered on top is a freshly re-architected
secret-isolation scheme (migrations 0011/0012) that moved every credential hash into service-role-only
sibling tables — recent, security-critical, and only partially verifiable from migration source. The PAT/Bearer
path is the third fragile zone: scope enforcement is *defined but never called*, so an `atc:read` token behaves
exactly like a `workspace:admin` token. Below that sit the authoring write path (the product's core job) and the
invite flow (privilege-escalation surface). Everything else is read-mature but write-thin.

| Priority   | Flow / Area                                  | Why it matters                                                        | Depends on / Affects                          |
|------------|----------------------------------------------|-----------------------------------------------------------------------|-----------------------------------------------|
| CRITICAL   | Auth gateway (Flow A magic-link + A' headless)| If login breaks, the whole product is unreachable; entry to every flow | Supabase Auth; gates B, C, D, E               |
| CRITICAL   | Tenant isolation + secret isolation (Flow F) | Cross-workspace leak or credential-hash exposure = multi-tenant breach | RLS helpers; every table; all tenants         |
| CRITICAL   | PAT + Bearer auth (Flow D / E)               | Credential issuance + privilege; scope unenforced = silent escalation  | Agents/CI/AI; `access_tokens(_secrets)`       |
| HIGH       | ATC authoring (Flow B, `bunkai_save_atc`)    | The product's reason to exist; the anchoring moat (INV-1/INV-2)        | Workspace must exist first (Flow A)           |
| HIGH       | Workspace bootstrap (Flow A, FEAT-003)       | No first workspace = new user stranded at `/onboarding`                | RPC `bunkai_bootstrap_workspace`; gates B     |
| HIGH       | Teammate invitation + acceptance (Flow C)    | Privilege escalation (INV-12); single-user lock-in if it fails         | `workspace_members`; promotes invited→active  |
| HIGH       | Module tree (FEAT-011)                       | App-layer path materialization with no trigger backing; depth-cap ≤6   | Authoring tree; recursive query blow-up risk  |

Everything below HIGH (read-only grids, docs page, command palette, planned-but-unwired tables) is in §8 as a short list.

---

## 2. What to test first and why

### CRITICAL — Auth gateway (Flow A magic-link, Flow A' headless)

**Why it matters.** This is the front door. Humans arrive via passwordless magic-link; CLI/agents (the persona
"Karim") arrive via headless signup/signin that *also* mints a token in the same round trip. If either path
breaks, no one — human or machine — gets in, and every downstream flow is dead. There's also a real security
contract baked in here: failures must return a uniform 401 that never reveals whether an email exists, and the
`next` redirect param must stay root-relative (INV-9) or you've shipped an open redirect.

**What commonly breaks.** The single most likely failure isn't logic — it's the environment. The app reads legacy
Supabase key names (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) but `.env.example` advertises the
new-style names; a `.env` filled strictly from the example boots straight into "Invalid environment variables" and
every route 500s. After that: magic-link replay (the `consumed_at` column is written but never read, so the audit
row is *not* a replay guard), open-redirect bypass on `next`, and the no-email-leak contract slipping on an edge path.

**Dependencies.** Entirely on Supabase Auth (`signInWithOtp`, `exchangeCodeForSession`, `signInWithPassword`). The
only inbound webhook in the whole system is `GET /auth/callback`.

**What an experienced QA would check.**
- A login with a non-existent email returns the *same* 401 shape and timing as a wrong password — no existence leak.
- A magic-link code, once exchanged, cannot be replayed a second time (and confirm whether anything actually enforces this — see §11).
- A crafted `next=//evil.com` or `next=https://evil.com` is rejected; only root-relative paths survive the callback.
- Headless signup returns both a working session *and* a usable PAT, and the PAT's default scope set matches what's documented.
- Boot the app with an `.env` copied verbatim from `.env.example` and confirm whether it starts — this is a likely first-run trap for any new tester.

### CRITICAL — Tenant isolation + secret isolation (Flow F, INV-3 / INV-11)

**Why it matters.** Bunkai is multi-tenant. Two paying customers' test suites live in the same database, separated
only by RLS. A single missing or mis-scoped policy means Customer A reads Customer B's ATCs — the worst thing a
TMS can do. On top of that, migrations 0011/0012 just moved every credential hash (PAT, invite, magic-link) out of
the main tables into service-role-only `*_secrets` sibling tables, specifically so a read-only QA/analytics DB role
can never read credential material. That re-architecture is recent and security-critical.

**What commonly breaks.** RLS is reached through four `SECURITY DEFINER` helpers (`bunkai_is_workspace_member`,
`_can_write_`, `_is_admin_`, `_is_owner_`) that exist to break a 42P17 recursion loop — exactly the kind of clever
plumbing that breaks quietly when a new policy is added. The secret-isolation feature also leans on roles
(`qa_inspector_ro` / `qa_inspector_rw`) that are referenced only in migration *comments* — no `CREATE ROLE` exists
in any migration, so it's unverified that the isolation can actually be exercised end to end.

**Dependencies.** Every table. `workspace_members` is the authorization backbone every policy probes; the four DEFINER
helpers are load-bearing for all of RLS.

**What an experienced QA would check.**
- Authenticated as a member of Workspace X, attempt to read/write any row belonging to Workspace Y — through both the cookie/server-component path *and* the Bearer path (they enforce tenancy differently; see next section).
- A read-only DB role can see token/invite/magic-link *metadata* but gets nothing from the `*_secrets` tables.
- Adding or moving a row never widens visibility — a suspended member (`status='suspended'`) loses all RLS access immediately.
- Confirm the DEFINER helpers actually return `false` for non-members rather than erroring or recursing.

### CRITICAL — PAT + Bearer auth (Flow D introspection, Flow E lifecycle)

**Why it matters.** This is how every agent, CI job, and AI consumer authenticates. It's also where the sharpest
known gap lives: **PAT scopes are validated at mint time but never at use time.** `requireScope` /
`requireScopeOrCookie` are defined and never called anywhere, so a token minted with only `atc:read` behaves
identically to a `workspace:admin` token on the routes that honor Bearer at all. That's a latent privilege-escalation
hole, and it's the highest-value thing to pin down with a test.

**What commonly breaks.** Bearer verification reconstructs the *full* secret (`prefix + remainder`) before hashing —
this was a real fixed bug (INV-13) that previously returned 401 on every call, so it's a regression magnet. Bearer is
also genuinely wired on only **2 of the 11** endpoints the OpenAPI spec advertises with `bearerAuth`
(`GET /api/v1/me` and `GET /api/v1/workspaces`); the other 9 are cookie-only and will 401 a Bearer-only caller,
contradicting the published contract. Soft-revoke (INV-14) and "secret returned exactly once" (INV-10) round out the area.

**Dependencies.** `access_tokens` + `access_token_secrets`; the admin/`service_role` client (because under service_role
`auth.uid()` is unset, Bearer paths re-implement tenant scoping in JS — that JS is the *only* tenant guard on those routes).

**What an experienced QA would check.**
- Mint a PAT with only `atc:read`, then attempt a write or admin action on a Bearer route — does scope actually stop it? (Today, expectation says no — capture that as a defect, not a pass.)
- The raw secret is shown exactly once and is never re-fetchable from any list endpoint.
- A soft-revoked token (DELETE → `revoked_at` set) is rejected on the next Bearer call, and the row is retained for audit.
- An expired token (`expires_at < now`) is rejected at the boundary; `expires_in_days` over 365 is refused at mint.
- A PAT cannot be used to mint another PAT (issuance is cookie-only).
- Hit one of the 9 "Bearer-advertised-but-cookie-only" endpoints with a Bearer token and document the 401 as spec drift.

### HIGH — ATC authoring (Flow B, `bunkai_save_atc`)

**Why it matters.** Authoring projects → modules → stories → ACs → ATCs is the product's primary job, and the
anchoring moat (every ATC must have a Story and ≥1 AC) is its differentiator. Break this and customers can't build
the asset they came for, or worse, they build one that silently violates the "100% anchoring" guarantee.

**What commonly breaks.** `bunkai_save_atc` is a single-transaction **full-replace** of child rows — steps,
assertions, and AC links are deleted and recreated on every save, so their row IDs are *not* preserved. It bumps
`version` as an optimistic lock but deliberately never touches `status`. The save runs as a Next *server action*,
not a `/api/v1` fetch, so it's RPC-contract-tested but not endpoint-tested. Concurrent edits are the classic failure:
two editors, one stale, last-write-wins unless the version check is honored.

**Dependencies.** A workspace must already exist (Flow A), and the editor re-validates Story + ≥1 AC + non-empty title
both in the UI and again server-side.

**What an experienced QA would check.**
- A save with no Story, or zero ACs, or an empty title is rejected at the server action — not just hidden in the UI.
- Two concurrent saves: the stale one is detected via the `version` bump rather than silently clobbering.
- After a full-replace save, the ATC's steps/assertions reflect the new payload exactly (no orphaned old rows).
- Deleting a User Story that still has ATCs is blocked (RESTRICT FK, INV-1) — traceability survives.

### HIGH — Workspace bootstrap (Flow A, FEAT-003)

**Why it matters.** A brand-new user with no membership gets auto-onboarded into a first workspace. If the bootstrap
RPC fails, they're stranded at `/onboarding` and the product is unusable for them — a 100% blocker for net-new signups.

**What commonly breaks.** `bunkai_bootstrap_workspace` is a `SECURITY DEFINER` RPC that atomically creates the
workspace *and* self-enrolls the creator as `owner` — it has to be atomic because a plain insert deadlocks on the
chicken-and-egg (you must already be an admin to add a member). It validates the slug regex and reserved-slug blocklist,
and enforces global slug uniqueness (INV-6). It is **not idempotent on retry** (idempotency middleware exists but is
never invoked) — a double-submit can collide.

**What an experienced QA would check.**
- A reserved or malformed slug is rejected with a clear error, not a 500.
- Two users racing for the same slug: one wins, the other gets a clean uniqueness error.
- A retried/double-clicked bootstrap doesn't create two workspaces or a half-enrolled owner.
- The creator lands as `owner` with an `active` membership in one atomic step.

### HIGH — Teammate invitation + acceptance (Flow C)

**Why it matters.** This is the only path off single-user workspaces, and it's a privilege-escalation surface. The
hard rule (INV-12): an invite can **never** grant `owner`, and the redeemer's email must match the invite. Break
either and you've got invite hijacking or self-promotion to owner.

**What commonly breaks.** The invite state machine is *derived from timestamp columns*, not a stored enum, and the
accept guard has a strict order — revoked (409) → already-accepted (409) → expired (409) → wrong-email (403). Get the
order wrong and an expired-but-revoked invite returns the wrong signal. Also: no email is actually sent (Resend is
declared but unwired), so the accept URL is returned once and copied to clipboard / logged to stdout — easy to
mistake "no email arrived" for a bug when it's deferred by design.

**What an experienced QA would check.**
- An invite for `role=owner` is refused at issuance.
- Redeeming with an email that doesn't match the invite returns 403.
- Re-accepting an already-accepted, revoked, or expired invite returns the correct 409 per the guard order.
- Rotating/resending an invite resets `expires_at` and issues a fresh secret, invalidating the old link.

### HIGH — Module tree (FEAT-011)

**Why it matters.** The module hierarchy organizes every story and ATC. Its slash-path (`modules.path`) is what tree
queries walk, and it's capped at depth 6 (INV-5) to prevent recursive query blow-ups.

**What commonly breaks.** The path is materialized in **application code on create/move — there is no DB trigger
backing it**, only a `BETWEEN 1 AND 6` depth CHECK. So a move that forgets to recompute the path leaves the tree
internally inconsistent with nothing flagging it (a silent killer — see §5). The depth cap is enforced at the DB but
the path correctness is not.

**What an experienced QA would check.**
- Creating a 7th-level module is rejected by the depth CHECK with a clean error.
- Moving a subtree recomputes every descendant's path correctly (no stale path fragments).
- A module move never silently produces a path that disagrees with the actual parent chain.

---

## 3. State machines that matter

Only the machines with security, integrity, or operational consequence. Cosmetic UI states are skipped.

### `access_tokens` lifecycle — `active → revoked` / `active → expired`
The transitions *are* the security boundary. `active` means `revoked_at IS NULL AND (expires_at IS NULL OR expires_at >= now())`.
`revoked` is terminal (you need a new PAT), and revocation is a soft UPDATE — never a hard DELETE — so the audit trail
survives (INV-14). **Most likely to break**: the Bearer middleware failing to reject a revoked or expired token at the
boundary, which would let a withdrawn credential keep working. **Detection**: only via an explicit test hitting a Bearer
route with a revoked/expired token — there is no UI surface that would reveal this.

### `workspace_members.status` — `invited → active → suspended`
Only `active` grants any RLS access; every policy filters on it. **Most likely to break**: a `suspended` member not
actually losing access (an RLS policy that forgets the status filter), or an invite-accept upsert that promotes the
wrong row. **Detection**: cross-tenant read attempt as a suspended user — silent if untested, because the UI won't show
the leak.

### `workspace_invites` lifecycle — `pending → accepted / revoked / expired`
Status is *derived from timestamps*, not stored, and the accept guard order matters (revoked → accepted → expired →
email-mismatch). **Forbidden transition to guard**: anything that lets a revoked or already-accepted invite be redeemed
again, or that grants a role above what the invite specified (never `owner`, INV-12). **Detection**: only by exercising
each illegal redemption explicitly; the derived-state design means there's no single column to eyeball.

### `atcs.status` — `unrun ↔ running → pass/fail/blocked/skipped`
**The important finding here is what's missing**: the DB constrains only the *value domain*, not the order, and the code
path that flips status (run execution) **does not exist in the source through migration 0012**. `bunkai_save_atc`
deliberately never touches `status`. So today this "state machine" has no driver — status is free-form and unenforced.
Treat any test asserting run-driven status transitions as testing a feature that isn't built yet (§11).

### `atcs.version` — monotonic optimistic lock
Bumps +1 on every save. The transition's only job is concurrency detection. **Detection of corruption**: a concurrent
overwrite that *doesn't* bump version would let a stale editor silently win — catchable only with a concurrent-save test.

---

## 4. Silent killers — automated processes with no feedback path

This is almost always the most undertested area of a system, and Bunkai has several. None of these surface an error to
a user when they fail — they just rot.

### `modules.path` materialization (application-layer, no trigger)
**What it does**: builds the slash-path that all tree queries depend on, on module create/move. **Why it's a silent
killer**: unlike the `updated_at` and search-vector triggers, this is *not* DB-enforced — it's app code with only a depth
CHECK behind it. A move that skips the recompute leaves the tree internally broken with nothing flagging it. **Detection
today**: none. **QA strategy**: a scheduled integrity audit query that asserts every module's `path` matches its actual
parent chain.

### `atcs_refresh_tsv` trigger (search vector)
**What it does**: rebuilds the GIN-indexed `tsv` search column on insert/update of title or tags. **Why it matters**:
ATC search depends on it; if it silently stops firing or builds wrong, search quietly returns nothing and users assume
their data is gone. **Detection today**: none surfaced. **QA strategy**: after creating an ATC, assert it's findable by
a title/tag search — a synthetic probe.

### `atcs_set_updated_at` trigger
Keeps `updated_at` fresh without app code. Lower stakes, but if it stops firing, "recently changed" views and any
optimistic-concurrency reasoning built on timestamps drift silently.

### `access_tokens.last_used_at` touch (fire-and-forget)
Updated non-blocking on every Bearer auth. **Why it matters**: this is the audit signal for "is this token still in use?"
If the fire-and-forget write silently fails, you lose the ability to spot stale/abandoned credentials. **Detection**: none.

### Invite email delivery (Resend — declared, NOT wired)
**The trap**: the system *looks* like it sends invite emails (`RESEND_API_KEY` is in `.env.example`) but no SDK is
imported. Invites are delivered by returning the accept URL once and logging to stdout. A tester will see "invited
successfully" with no email arriving and may file a false bug — or worse, assume real email delivery is covered when
it doesn't exist. **QA strategy**: assert the accept URL is returned/logged, and explicitly document that email delivery
is out of scope until Resend is wired.

### Run-execution path (does not exist)
Already flagged in §3: there is no process that drives `atcs.status` from `running` to an outcome. It's a silent absence,
not a silent failure — but it means any test plan assuming "run a test and see status change" is testing vapor today.

### No CI/CD gate (structural silent killer)
`.github/workflows/` is empty. Deploys are presumed Vercel-auto-via-Git with **no automated test or lint gate before
production**. Every regression ships silently until someone notices in prod. **QA strategy**: this is the single highest-
leverage process fix — a smoke/lint gate before deploy would convert a class of silent failures into loud ones.

---

## 5. External integrations — failure points

There is effectively **one** third-party service in the live request path. That's a strength (small blast surface) and a
risk (single point of failure for everything).

### Supabase (Auth + Postgres + RLS) — the spine
**What stops if it's down**: everything. Every protected route and server page reads/writes through Supabase.
**Critical failure modes**: missing Supabase env vars throw at *app boot* (`lib/env.ts`) → 500 on any route importing
`env`. Auth rate-limiting surfaces as Supabase's own 429 (`rate_limited`); other upstream errors as `upstream_error`;
a bad/expired magic-link code redirects to `/login?error=otp_exchange_failed`. **Known quirk**: there are no app-level
retries or timeouts — if Auth hangs, every login/refresh stalls and Bunkai just passes through Supabase's 429/5xx.
**Acceptable degradation**: none — this is hard-fail across the board.

### Resend (transactional email) — declared, not wired
**What stops if it's down**: nothing, because it's not connected. Invite delivery is MVP-deferred. **The risk is the
opposite of a normal integration**: tests must not assume email is sent. See §4.

### Scalar API Reference + zod-to-openapi (docs)
**What stops if it's down**: the `/api/docs` page renders empty if `/api/openapi` 500s. **No runtime data impact** —
this is documentation only. Acceptable degradation: full.

### Monaco Editor / TanStack Table (UI libraries)
ATC step/assertion editing (Monaco) and the ATC grid (TanStack). UI-only; degrade to a broken editing surface, no data risk.

### Jira / Atlassian, Tavily / n8n / Supabase MCP
Declared in `.env.example` as dev-tooling / agent slots. **Not app-runtime integrations** — `user_stories.external_id`
is a data reference with no bidirectional sync code. Don't test these as live product integrations.

---

## 6. Dependency cascade between flows

Testing a flow in isolation hides breakage that only appears in the chain. The two cascades that matter most:

```
  Supabase (Auth + Postgres + RLS)
        |
        v
  Flow A  Bootstrap ──► Flow B  Authoring ──► ATC anchoring (INV-1/INV-2)
  (login + first       (Project/Module/      (the product's value:
   workspace)           Story/AC/ATC)          Story + ≥1 AC per ATC)
        |                     |                        |
        └ no workspace =      └ no save path =          └ broken moat = the
          stranded at           can't build the           guarantee customers
          /onboarding           core asset                 pay for is void

  RLS authorization spine:
  workspace_members(status='active') ──► bunkai_is_workspace_* DEFINER helpers ──► every RLS policy
        |                                          |
        └ invite-accept promotes                   └ if these recurse/return wrong,
          invited → active                           ALL tenant isolation fails at once
```

- **Chain 1 — Onboarding to value**: `Supabase up → Flow A bootstrap → Flow B authoring → anchoring invariants`. If
  bootstrap half-succeeds (workspace created, owner not enrolled), authoring will appear available but every write
  fails on RLS — a failure that only surfaces *after* login, not at the bootstrap step you'd naturally test.
- **Chain 2 — The RLS spine**: `workspace_members.status='active' → the four DEFINER helpers → every policy`. A single
  helper regression doesn't break one screen; it breaks tenant isolation everywhere at once. Test the helpers directly,
  not just the screens that happen to use them.
- **Chain 3 — Token precedence**: `requireAuth checks Bearer first → a stale cookie can't shadow an explicit PAT`. Test
  the both-credentials-present case, not just one at a time.

---

## 7. Edge cases developers commonly forget

Grouped by theme, each pointing at the specific Bunkai flow most at risk.

- **Concurrency** — `bunkai_save_atc` concurrent edits (does the `version` optimistic lock actually catch the stale
  writer?); workspace bootstrap double-submit (non-idempotent, can collide on slug); **all mutating POSTs are
  non-idempotent on retry** because the idempotency middleware exists but is never invoked — mint-token, create-workspace,
  issue-invite, accept-invite can all double-fire.
- **Data limits** — module depth exactly at 6 vs 7 (INV-5 CHECK); workspace slug at the regex boundary (1-char too short,
  reserved word, uppercase); ATC slug uniqueness within a project (INV-7).
- **Timezone / clock boundaries** — token `expires_at`, invite `expires_at` (7-day), magic-link TTL (1-hour): test
  redemption *exactly at* the expiry instant and just past it; clock skew at the boundary is where expiry guards leak.
- **Permission boundaries** — the big one: an `atc:read` PAT used for a write (scope unenforced today, INV-4 only at mint);
  the `/workspaces/{id}/members` page is **not** in middleware `PROTECTED_PREFIXES` (gated only by in-page `getUser()`);
  invite role can never be `owner` (INV-12); a suspended member retaining access.
- **Orphaned / forbidden states** — deleting a User Story that still has ATCs (RESTRICT, must be blocked); deleting an
  auth user who still owns a workspace (RESTRICT); re-redeeming a revoked/accepted/expired invite (guard-order 409s);
  a revoked PAT being treated as still-active.
- **Idempotency** — covered under concurrency; flagged separately because the `idempotency_keys` table and middleware
  exist and look wired but aren't — the most dangerous kind of "looks covered."
- **Open redirect / no-leak contracts** — `next` param at `/auth/callback` (root-relative only, INV-9); uniform 401 on
  signin/signup failure (no email-existence leak).

---

## 8. Pre-release checklist (priority-ordered)

CRITICAL first, then HIGH. Each line is one verifiable check; TC IDs live in the TMS, not here.

1. Verify a member of Workspace X cannot read or write any Workspace Y row, via **both** the cookie path and the Bearer path.
2. Verify a read-only DB role sees token/invite/magic-link metadata but **nothing** from the `*_secrets` tables.
3. Verify the four `bunkai_is_workspace_*` DEFINER helpers return correct allow/deny without recursing, for member/non-member/suspended.
4. Verify an `atc:read`-only PAT is rejected on a write/admin Bearer action (today, expect a defect — capture it).
5. Verify a revoked PAT and an expired PAT are both rejected at the Bearer boundary on the next call.
6. Verify the raw PAT secret is shown exactly once and is never retrievable from any list endpoint.
7. Verify signin/signup failure returns a uniform 401 with no email-existence leak.
8. Verify `next=//evil.com` and absolute-URL redirects are rejected at `/auth/callback`; only root-relative survive.
9. Verify the app boots (or fails loudly with a clear message) when `.env` is filled strictly from `.env.example`.
10. Verify an invite can never grant `owner`, and a wrong-email redemption returns 403.
11. Verify the invite accept guard order (revoked → accepted → expired → email-mismatch) returns the correct code at each gate.
12. Verify `bunkai_save_atc` rejects a save missing a Story, missing all ACs, or with an empty title — at the server action.
13. Verify two concurrent ATC saves: the stale one is caught by the `version` bump, not silently clobbered.
14. Verify a 7th-level module is rejected and a subtree move recomputes all descendant `path` values correctly.
15. Verify a double-submitted workspace bootstrap doesn't create two workspaces or a half-enrolled owner.

---

## 9. What is NOT in this plan

- Flow-level diagrams and full state-machine transition tables → `.context/business/business-data-map.md`
- Feature catalog, CRUD matrix, feature flags, QA-relevance tagging → `.context/business/business-feature-map.md`
- API endpoint inventory, auth-tier detail, request/response contracts → `.context/business/business-api-map.md` and `bun run api:sync`
- Detailed test-case definitions and US-ATP-ATR-TC traceability → TMS (see `/test-documentation`)
- Sprint-level execution order and per-ticket QA → `.context/reports/SPRINT-{N}-TESTING.md` (see `/sprint-testing`)
- KATA/Playwright automation design → `/test-automation`

---

## 10. Discovery gaps

Grounded honesty — these are the things the maps could not fully verify, restated here because each one shapes what you
can and can't test today:

- **Run-execution does not exist.** No `tests` / `runs` / `run_step_results` / `bugs` tables through migration 0012, and
  no code flips `atcs.status`. Any "execute a test and check status" scenario is testing an unbuilt feature.
- **PAT scope enforcement is absent.** `requireScope` / `requireScopeOrCookie` are defined but never called repo-wide —
  scope is checked only at mint. The privilege-escalation test (checklist #4) will likely *fail by design* until this is wired.
- **Bearer auth drift (9 of 11 endpoints).** The OpenAPI spec advertises `bearerAuth` on 11 operations, but only
  `GET /api/v1/me` and `GET /api/v1/workspaces` genuinely implement it; the other 9 are cookie-only. It's **unverified**
  whether this is aspirational spec or a bug — confirm intent before writing the contract tests.
- **`qa_inspector_ro` / `qa_inspector_rw` roles unverified.** Referenced only in migration 0011 comments — no `CREATE ROLE`
  or grant exists in any migration. The secret-isolation feature can't be fully exercised from migration source alone.
- **Authoring-tree write handlers missing.** Journeys narrate creating Projects/Modules/Stories/ACs, but no wired
  create/update handler was found for any of them except `atcs`. "New ATC" / "New Test" / "Cancel" buttons are unwired
  stubs. **Where these rows actually get created is unknown** — confirm before planning authoring E2E coverage.
- **Idempotency middleware is dead code.** Implemented and CORS-advertised, but no handler invokes it. All POSTs are
  non-idempotent on retry until a route wires it in.
- **Magic-link replay is not enforced.** `consumed_at` is written but never read; the callback delegates entirely to
  Supabase. The only rate-limit is Supabase's own 429; dedicated middleware is deferred to "Phase F".
- **Env key-name mismatch.** Code reads legacy Supabase key names; `.env.example` lists new-style names. A by-the-book
  `.env` boots into "Invalid environment variables." This is a live first-run trap, not a hypothetical.
- **No Supabase SLA / timeout/retry policy documented** — degradation behavior under Auth latency is inferred, not specified.
- **Two onboarding blockers (from CLAUDE.md §13, carried forward):** the target's `package.json` ↔ `bun.lock` desync
  (blocks `bun dev`), and no test users provisioned in the target Supabase Auth (blocks real-login E2E). Both must be
  cleared before `/sprint-testing` can run live against the target.
- **Breakage-likelihood signal is weak.** Git churn in *this* repo is QA-framework infrastructure (cli/, scripts/), not
  the target `upex-bunkai-tms` app — so recent-change risk for the target was scored from the maps' own "recent / NEW"
  annotations (Flows A', C, D, F; migrations 0011/0012), not from target git history, which wasn't available here.

> All three source maps (data-map, feature-map, api-map) were present at generation time, so this plan reflects the full
> three-map picture — no soft-warning fallback was triggered.
