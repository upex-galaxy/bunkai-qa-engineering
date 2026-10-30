# BK-793: Anonymous redirect to login

## 1. Test Case Summary
BK-87: TC4: should redirect to login when accessing settings without authentication. Signed Candidate (comment 13199).

## 2. ATC Contract
`SettingsPage.openSettingsWithoutSession(route)`: precondition empty storage state; action navigate directly to `route`; asserts the redirect. One ATC, rows `/settings`, `/settings/account`.

## 3B. UI Details
Redirect comes from `middleware.ts` (`PROTECTED_PREFIXES` includes `/settings`): `/login?next=<route>`. The parameter is `next`, not `returnUrl` (decision TD3 of BK-87).

## 4. Assertions Split
Fixed: URL path is `/login`; `next` equals the requested route.
Test-level: the route list.
