# BK-152 — BK-18: TC04: should reject POST /atcs with 422 module_outside_project_subtree when the module is outside the user story subtree

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** AC3
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@high @regression @api @automation-candidate @BK-18
Feature: Module subtree validation on POST /api/v1/atcs

  Scenario: should reject POST /atcs with 422 module_outside_project_subtree given a module in a different project
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: AC3
    ROI: ~11. Verdict: Candidate.
    Variables:
      {pat_write}        - Bearer PAT scope atc:write
      {user_story_id}    - US in project A
      {foreign_module_id}- module in project B (staging: 2c4175d7-... in project ae10a3bd-...)
    """

    # === PRECONDITIONS ===
    Given a valid Bearer PAT "{pat_write}" and user story "{user_story_id}" in project A

    # === ACTION ===
    When the client sends POST "/api/v1/atcs" with module_id "{foreign_module_id}" located outside the user story project subtree

    # === VALIDATIONS ===
    Then the response status is 422
    And the error code is "module_outside_project_subtree"
    And no rows are written to atcs, atc_steps or atc_assertions
```

## Notes
A module belonging to a different project (project B) fails the subtree check against the user story's project (project A), returning `422 module_outside_project_subtree` with zero rows written.
