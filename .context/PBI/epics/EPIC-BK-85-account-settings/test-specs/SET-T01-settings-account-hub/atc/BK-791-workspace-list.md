# BK-791: Account workspace list

## 1. Test Case Summary
BK-87: TC2: should list workspaces with role label and active indicator when authenticated. Signed Candidate (comment 13198).

## 2. ATC Contract
`SettingsPage.viewWorkspaceList()`: precondition authenticated with several memberships; action open `/settings/account`; asserts each row. Scenario "more than ten workspaces" is outside this ATC until open decision 2 is answered.

## 3B. UI Details
Region `workspaces-list`, rows `workspace-row-<slug>`, indicator `workspace-active-<slug>`, container `workspaces-rows`.

## 4. Assertions Split
Fixed: region visible; every expected row present with name, role label and member count; the active indicator appears on the active row only.
Test-level: expected rows come from `WorkspaceApi.listWorkspaces()`.
