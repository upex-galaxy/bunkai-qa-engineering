# Test Automation Plan: BK-1079 (zero-scope token guard, Story BK-88)

> Type: integration + e2e · Sprint 5 · Created 2026-10-25 (DOC1) · Approved 2026-10-25 · Coded 2026-10-25 (AUTO1)

## 2. Architecture Decisions

| Decision | Value | Rationale |
|---|---|---|
| Component | `TokenApi.ts` (new) | No token component in the manifest; `AuthApi` owns sign-in, not PAT management |
| Component | `TokensPage.ts` (new) | Settings > Tokens has no Page yet |
| Fixture | BK-1231 `{ api }`; BK-1042 `{ test }` | BK-1042 drives the dialog and reads back `GET /tokens` |
| Test files | `tests/integration/tokens/issueTokenWithoutScopes.test.ts`, `tests/e2e/tokens/issueTokenWithoutScopes.test.ts` | |

### UI Elements (BK-1042)

| Element | Locator strategy |
|---|---|
| Issue token button | role `button` + accessible name (confirm in Code with `/playwright-cli` snapshot) |
| Dialog | role `dialog` |
| Name field | label |
| Scopes fieldset | role `group` with its legend; `aria-invalid`, `aria-describedby="issue-token-scopes-error"` |
| Inline error | id `issue-token-scopes-error`, exact text `At least one scope is required.` |
| Create button | role `button` name Create, `toBeDisabled()` |

## 3. ATC Registry

| ATC ID | Component | Method | Fixed assertions |
|---|---|---|---|
| BK-1231 | TokenApi | `issueTokenWithoutScopes(name)` | 422, `validation_failed`, issue path `scopes` |
| BK-1042 | TokensPage | `submitTokenWithoutScopes(name)` | error visible with exact copy, Create disabled, fieldset `aria-invalid` + `aria-describedby`, zero POST /tokens after Enter and a forced click; checking a scope clears the error |

Helpers (no @atc): `TokenApi.listTokens()`, `TokenApi.revokeToken(id)` (safety net only).

## 4. Test Data Strategy

| Data | Source | Lifecycle |
|---|---|---|
| Token name `qa-tc33-<run id>` / `qa-tc18-<run id>` | Generate (faker suffix) | never created when green; revoked in `finally` if it ever is |

## 6. Implementation Order

- [ ] TokenApi + register in ApiFixture
- [ ] TokensPage + register in UiFixture (locators confirmed with a `/playwright-cli` snapshot)
- [ ] Both test files; local + staging; `bun run kata:manifest`

## 8. Decisions taken in Code (measured on staging, 2026-10-25)

| Decision | Value | Evidence |
|---|---|---|
| BK-1231 credential | Cookie session opened with `api.auth.openSession()` on the integration request context; the ATC sends no Bearer | A PAT gets 403 `forbidden` ("Personal access tokens cannot issue tokens") before validation; the cookie session gets the 422. The TC's Variables allow the cookie session ("measured on the cookie session in ReTest BK-1232") |
| BK-1231 session PAT | Recorded in the minted-PAT ledger; the global teardown revokes it | `tests/utils/mintedPats.ts` |
| BK-1042 read-back | Bearer cleared, token list read through the page's cookie session | api-state.json holds a PAT the teardown of any earlier integration run revoked |
| BK-1042 page load | Wait for a visible `issue-token-open` (`filter({ visible: true })`), then `toHaveCount(1)`, then `toBeVisible()` | The streamed token list first holds the button alone inside React's hidden Suspense segment, then a visible copy and the hidden one coexist for 8-120 ms. `toHaveCount(1)` alone matched the hidden copy and failed on CI with a strict-mode violation (sanity run 40240747665, fixed in `fix/BK-1042-tokens-page-double-render`) |
| Locators | `data-testid` from `components/settings/IssueTokenModal.tsx`, confirmed with a `/playwright-cli` snapshot; `aria-describedby` asserted with `toHaveAttribute` | |
