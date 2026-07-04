# BK-151 — BK-18: TC03: should reject POST /atcs with 422 ac_outside_user_story when an acceptance criterion belongs to a different user story

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** AC2
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@high @regression @api @automation-candidate @BK-18
Feature: Cross-entity AC validation on POST /api/v1/atcs

  Scenario Outline: should reject POST /atcs with 422 ac_outside_user_story given <ac_condition>
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: AC2
    ROI: ~11. Verdict: Candidate.
    Variables:
      {pat_write}      - Bearer PAT scope atc:write
      {user_story_id}  - target US
      {foreign_ac_id}  - AC under a DIFFERENT user story
    Note: validation runs before the transaction opens -> rollback, zero rows.
    """

    # === PRECONDITIONS ===
    Given a valid Bearer PAT "{pat_write}" and user story "{user_story_id}"

    # === ACTION ===
    When the client sends POST "/api/v1/atcs" with acceptance_criterion_ids referencing "<ac_value>"

    # === VALIDATIONS ===
    Then the response status is 422
    And the error code is "ac_outside_user_story"
    And no rows are written to atcs, atc_steps or atc_assertions

    # === EQUIVALENT PARTITIONS ===
    Examples: AC partitions
      | ac_condition                 | ac_value        |
      | AC of a different user story | {foreign_ac_id} |
      | non-existent AC uuid         | random-uuid     |
```

## Notes
Cross-entity validation runs before the transaction opens, so a foreign or non-existent AC id yields a `422 ac_outside_user_story` with zero rows written.
