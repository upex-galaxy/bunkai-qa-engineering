# BK-790: Account identity card

## 1. Test Case Summary
BK-87: TC1: should show user identity with email and role when authenticated. Signed Candidate (comment 13197).

## 2. ATC Contract
`SettingsPage.viewAccountIdentity(role)`: precondition authenticated session with `role` in the active workspace; action open `/settings/account`; asserts below. One ATC, rows owner / admin / viewer.

## 3B. UI Details
Path `/settings/account`. `identity-card`, `identity-email`, `identity-role`. Active workspace switched through the `bk_active_ws` cookie before navigation.

## 4. Assertions Split
Fixed (inside ATC): email visible and equal to the session email; role label equals the expected label; the card renders no empty display-name field.
Test-level: the list of roles under test and the workspace chosen for each.
