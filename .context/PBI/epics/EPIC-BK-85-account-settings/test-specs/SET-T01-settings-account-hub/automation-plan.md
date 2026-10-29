# Test Automation Plan: BK-87 (Settings hub, Account section)

> Type: e2e · Sprint 5 · Created 2026-10-28 · Status: APPROVED (aprobado por el dueño en el chat de la sesión preparar-flota-cloud-fleet-handoff-05, 2026-10-29)

## 1. Ticket Summary

Three signed Candidates of Story BK-87 (BK-790, BK-791, BK-793), all UI. Manifest check (`kata-manifest.json`, 2026-10-28): none of the three ids is taken, and there is no Settings > Account page component.

## 2. Architecture Decisions

| Decision | Value | Rationale |
|---|---|---|
| Component | `SettingsPage.ts` (new, `tests/components/ui/`) | One page family (`/settings`, `/settings/account`); `TokensPage` already owns `/settings/tokens` |
| Fixture | BK-790, BK-791 `{ test }`; BK-793 `{ ui }` | Role switching sets the active-workspace cookie through the API on the page's own request context, so the hybrid fixture is needed for BK-790 |
| Registration | `SettingsPage` added to `tests/components/UiFixture.ts` | Same pattern as `TokensPage` |
| Test files | `tests/e2e/settings/viewAccountIdentity.test.ts`, `viewWorkspaceList.test.ts`, `redirectAnonymousToLogin.test.ts` | One file per feature |
| Anonymous session | `test.use({ storageState: { cookies: [], origins: [] } })` in the BK-793 file | The `e2e` project injects the saved session by default |
| Role switch | `bk_active_ws` cookie, set through `POST /api/v1/me/active-workspace` (route exists in the target) | Confirm the verb and body with `/playwright-cli` and the OpenAPI schema in Code |
| Parameterization | BK-790 roles and BK-793 routes iterate rows inside ONE ATC each | Same behavior per partition (doctrine Part 2.5) |

### UI Elements

| Element | Locator strategy |
|---|---|
| Identity card | `getByTestId('identity-card')`; `identity-email`, `identity-role` |
| Workspaces region | `getByTestId('workspaces-list')` (role region); rows `workspace-row-<slug>` |
| Active indicator | `workspace-active-<slug>` |
| Role badge and member count | text inside the row (role label from `roleLabel`: Owner, Admin, Member, Viewer; "N member(s)") |
| Rows container | `workspaces-rows` (`max-h-[400px] overflow-y-auto`) |
| Login redirect | `toHaveURL` with `/login?next=<encoded route>` |

Locators are read from the target components (`IdentityCard.tsx`, `WorkspacesList.tsx`, `middleware.ts`); confirm with a `/playwright-cli` snapshot in Code before relying on them.

## 3. ATC Registry

| ATC ID | Component | Method | Fixed assertions |
|---|---|---|---|
| BK-790 | SettingsPage | `viewAccountIdentity(role)` | email is the primary label; role label matches the active workspace; no empty display-name field |
| BK-791 | SettingsPage | `viewWorkspaceList()` | region visible; each row has name, role label, member count; only the active row shows "active" |
| BK-793 | SettingsPage | `openSettingsWithoutSession(route)` | final URL is `/login`; `next` equals the requested route |

Helpers (no @atc): `SettingsPage.goto(path)`, `SettingsPage.selectWorkspace(slug)` (cookie switch). The expected rows come from `GET /api/v1/workspaces` read with the browser session (`page.request`) through `SettingsPage.listMyWorkspaces()`, not from `WorkspaceApi`: the Bearer of the hybrid fixture can be revoked by an earlier integration run (changed in Code, recorded in the component header).

## 4. Test Data Strategy

| Data | Class | Source | Lifecycle |
|---|---|---|---|
| Session and email | Discover | `config.testUser` (staging account) | read only |
| Workspace list, roles, slugs | Discover | `WorkspaceApi.listWorkspaces()` for the same account | read only; expected rows are built from it, never hardcoded slugs |
| Active workspace | Modify | cookie `bk_active_ws` switch | per test; the cookie lives in the test's own browser context, so nothing persists and nothing needs restoring (changed in Code after review) |
| Role `member` | none exists | see Open decisions | blocked |
| 10+ workspaces | Generate | see Open decisions | blocked |

## 5. Test Scenarios

- `tests/e2e/settings/redirectAnonymousToLogin.test.ts`: `BK-793: should redirect an anonymous request to login preserving the return path`, rows `/settings`, `/settings/account`.
- `tests/e2e/settings/viewAccountIdentity.test.ts`: `BK-790: should show the email and the role of the active workspace for every role`, rows owner, admin, viewer.
- `tests/e2e/settings/viewWorkspaceList.test.ts`: `BK-791: should list each workspace with name, role, active indicator and member count`.

## 6. Implementation Order

- [ ] `SettingsPage` + register in `UiFixture` (locators confirmed with a snapshot)
- [ ] BK-793 test, then BK-790, then BK-791; local and staging
- [ ] `bun run kata:manifest`; `test`, `types:check`, `lint:check`; separate verifier before merge

## 7. Open decisions (the person decides; the plan assumes the recommendation)

| # | Item | Recommendation | Cost of the alternative |
|---|---|---|---|
| 1 | BK-790 Examples include `member`; the staging account holds no member workspace (project.yaml notes, `agent-project.md` 13.1; the member/admin/owner accounts answer 401) | Automate owner, admin, viewer now. Leave the `member` row as a recorded gap. | Seeding a member needs a second authenticated account that does not exist |
| 2 | BK-791 second scenario (12 workspaces, list scrolls) needs 9 more workspaces on the shared account | Ship scenario 1 (3 workspaces, read-only) now. Track the 12-workspace scenario as a follow-up | Creating and deleting 9 workspaces per run is slow, and workspace deletion mails the members |
| 3 | BK-792 is still a Candidate in the RTP though the owner confirmed Deferred | Out of scope here; route back to `/test-documentation` Phase 3 | none |

## 8. Success Criteria

- [ ] Three ATCs on the signed TC keys, none duplicated in the manifest
- [ ] Zero retries, no hardcoded waits, no hardcoded slugs or emails
- [ ] Local and staging green; `bun run kata:manifest:check` clean
