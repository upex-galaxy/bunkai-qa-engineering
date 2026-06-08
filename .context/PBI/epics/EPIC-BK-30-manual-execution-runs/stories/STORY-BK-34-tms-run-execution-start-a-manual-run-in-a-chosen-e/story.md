# TMS-Run Execution | Start a manual run in a chosen environment

**Jira Key:** [BK-34](https://jira.upexgalaxy.com/browse/BK-34)
**Epic:** [BK-30](https://jira.upexgalaxy.com/browse/BK-30) (Manual Execution & Runs)
**Type:** Story
**Status:** Estimation
**Priority:** Medium
**Story Points:** 1
**Web Link:** https://staging-upexbunkai.vercel.app/

---

## Overview

# TMS-Run Execution | Start a manual run in a chosen environment

## User Story

As a QA Engineer, I want to start a manual run of a Test against a chosen environment so that I get a fresh checklist where every step is pending and I can begin executing immediately.

## Source

Source spec: BK-019

## Shift-Left Review Status

This Story has been reviewed through the shift-left workflow and is ready for estimation.

Note: BK-70 was intentionally ignored as a dependency for this provisional pass by product instruction. If BK-70 changes the Test Repository contract later, this Story should be refreshed before development starts.

## Scope

### In Scope

- Start a new manual Run from an existing Test.
- Select one configured Project environment before starting the Run.
- Initialize every executable Test step in pending state.
- Preserve the Test step order when the Run checklist is created.
- Block run creation when the Test has no executable steps.
- Block run creation when the selected environment is not configured for the Project.
- Reuse the existing Run when the same start token is retried within 24 hours.
- Store executor mode for human, agent, or CI execution.
- Show the newly started Run in the Test run history.

### Out Of Scope

- Updating step results; covered by BK-35.
- Aborting a run; covered by BK-36.
- Full run history filtering; covered by BK-37.
- Run reporting totals; covered by BK-38.
- Final run verdict; covered by BK-39.
- Defect filing, listing, heatmap, or sync; covered by BK-40 through BK-43.
- Creating or editing the underlying Test definition.

## Acceptance Criteria

```gherkin
Background:
  Given an authenticated workspace member with role member or higher
    And a Project exists in the active workspace
    And the Project has at least one configured environment
    And a Test exists in that Project

Scenario: Start a manual run for a Test with executable steps
  Given the Test has executable steps in a defined order
    And the user selects a configured Project environment
    And the user provides a unique start token
  When the user starts a manual Run for the Test
  Then the Run is created successfully
    And the Run is linked to the Test
    And the Run stores the selected environment
    And every executable step is initialized with status "pending"
    And the step order matches the Test definition order
    And the Run stores executor mode "human" when started by a human user

Scenario: Block run start when the Test has no executable steps
  Given the Test has no executable steps
    And the user selects a configured Project environment
  When the user starts a manual Run for the Test
  Then run creation is blocked
    And the user sees a clear message explaining that the Test needs at least one executable step
    And no Run is created

Scenario: Block run start when the selected environment is not configured for the Project
  Given the Test has executable steps
    And the selected environment is not configured for the Project
  When the user starts a manual Run for the Test
  Then run creation is blocked
    And the user sees a clear invalid-environment message
    And no Run is created

Scenario: Retry with the same start token within 24 hours opens the existing Run
  Given a Run was already started for the same Test with start token "token-123"
    And less than 24 hours have passed
  When the user starts the same Test again with start token "token-123"
  Then the existing Run is returned
    And no duplicate Run is created
    And the user can continue from the existing pending checklist

Scenario: Same Test can start a separate Run with a different start token
  Given a Run already exists for the Test with start token "token-123"
    And the Test is otherwise executable
  When the user starts the same Test with start token "token-456"
  Then a new separate Run is created
    And the original Run remains unchanged

Scenario: Agent or CI started run stores executor mode correctly
  Given the Test has executable steps
    And the selected environment is configured for the Project
  When the Run is started by an automation agent or CI context
  Then the Run stores executor mode "agent" or "ci" according to the caller context
    And the Run remains visible to authorized Project members

Scenario: Newly started Run appears in Test run history
  Given a Run is started successfully for the Test
  When a teammate with access to the Project views the Test run history
  Then the newly started Run is visible
    And the history entry includes environment, executor mode, start timestamp, and initial status
```

## Business Rules

- A Run is an execution instance of a Test, not a new Test definition.
- A Run cannot start unless the selected environment belongs to the Project.
- A Run cannot start unless the Test has executable steps.
- A repeated start request with the same token within 24 hours must not create a duplicate Run.
- Run visibility follows Project access rules.
- Executor mode must identify whether the Run was started by a human user, an agent, or CI.

## Risks And Clarifications

- Idempotency: PO / Dev must confirm whether the same token after 24 hours creates a new Run or is rejected.
- Executable source: PO must clarify whether a Test with manual steps but no ATCs can be executed.
- Success state: Design must confirm whether successful start redirects to the Run page, opens the checklist inline, or shows a toast plus history update.
- Run snapshot: Dev must confirm whether a Run snapshots step content/order at creation time or references the Test definition live.

## References

- ATP Draft and scenario matrix are documented in the shift-left handoff comment.
- Labels: shift-left-reviewed, shift-left-2026-06-08.

---

## Fields

> Each rich-text field is a separate file in this folder.

- [Acceptance Criteria](./acceptance-criteria.md)
- [Business Rules](./business-rules.md)
- [Scope](./scope.md)
- [Out Of Scope](./out-of-scope.md)
- [Workflow](./workflow.md)

---

## Traceability

### Storys (6)

- [BK-27](https://jira.upexgalaxy.com/browse/BK-27): TMS-Test Builder | Assemble a test by chaining ATCs _(Ready For Dev)_
- [BK-35](https://jira.upexgalaxy.com/browse/BK-35): TMS-Run Execution | Mark each step pass, fail, or block _(Backlog)_
- [BK-37](https://jira.upexgalaxy.com/browse/BK-37): TMS-Run History | View a test's past runs, filterable by outcome _(Backlog)_
- [BK-38](https://jira.upexgalaxy.com/browse/BK-38): TMS-Run Reporting | Filter project runs with pass/fail totals _(Backlog)_
- [BK-39](https://jira.upexgalaxy.com/browse/BK-39): TMS-Run Execution | Finish a run with a final verdict _(Backlog)_
- [BK-36](https://jira.upexgalaxy.com/browse/BK-36): TMS-Run Execution | Abort a run in progress with a reason _(Backlog)_

---

## Metadata

- **Created:** 5/28/2026
- **Updated:** 6/7/2026
- **Reporter:** Ely
- **Assignee:** jesusgpythondev
- **Labels:** shift-left-2026-06-08, shift-left-reviewed

---

_Synced from Jira by sync-jira-issues_
