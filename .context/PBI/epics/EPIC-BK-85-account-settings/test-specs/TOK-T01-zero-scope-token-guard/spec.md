# TOK-T01: Zero-scope token guard

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Phase** | Standalone (Sprint 5 Stage 5, bug-driven) |
| **Items** | 2 TCs (1 API, 1 UI) |
| **Dependencies** | None beyond the existing auth setups |
| **Requires** | The main QA account (cookie storage state from `ui-auth.setup.ts`, PAT from `api-auth.setup.ts`) |
| **Source** | Bug: BK-1079; Story BK-88 AC2 |

## Summary

A token with no scope must never be issued, and the form must say why. BK-1231 guards the server rule (422 on `scopes: []`), BK-1042 guards the form (inline error, disabled Create, `aria-describedby`, no request sent). Neither needs a sandbox: nothing is created when the tests pass.

## Test Cases

| TMS ID | Title | Type | Priority |
|--------|-------|------|----------|
| BK-1231 | should reject POST /api/v1/tokens with 422 and create no token when the scopes array is empty | Negative (API) | P0 |
| BK-1042 | should block submission, show the inline scope error and create no token when no scope is selected in the issue-token form | Negative (UI + a11y) | P0 |

## Automation Plan

**Order**: BK-1231, then BK-1042.

**Shared fixtures**: none. Safety net: if either test ever creates a token (a regression), the test revokes it by id in a `finally` block so the shared account does not collect tokens.

**Blocked by**: nothing.

## Acceptance Criteria

- [ ] BK-1231 `{ api }`, BK-1042 `{ test }` (UI action, API read-back of the token list)
- [ ] BK-1042 asserts zero `POST /api/v1/tokens` requests through `page.on('request')`, never a timeout
