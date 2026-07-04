# BK-155 — BK-18: TC07: should write zero rows across atcs/atc_steps/atc_assertions when POST /atcs fails a cross-entity check given a transactional rollback

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** AC2 / data integrity
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@critical @regression @api @automation-candidate @BK-18
Feature: Transactional rollback integrity on POST /api/v1/atcs

  Scenario: should write zero rows across all three tables when POST /atcs fails a cross-entity check given a transactional rollback
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: AC2 / data integrity
    ROI: ~7. Verdict: Candidate (data-integrity guard).
    Variables:
      {pat_write}     - Bearer PAT scope atc:write
      {foreign_ac_id} - AC under a different user story (forces post-validation failure)
    DB invariants observed in sprint: counts atcs/atc_steps/atc_assertions stay at baseline (8/16/8 -> unchanged).
    """

    # === PRECONDITIONS ===
    Given baseline row counts for atcs, atc_steps and atc_assertions are recorded
    And a valid Bearer PAT "{pat_write}"

    # === ACTION ===
    When the client sends POST "/api/v1/atcs" with a foreign acceptance_criterion_id "{foreign_ac_id}" that fails the cross-entity check

    # === VALIDATIONS ===
    Then the response status is 422
    And the error code is "ac_outside_user_story"
    And the row count of atcs is unchanged from baseline
    And the row count of atc_steps is unchanged from baseline
    And the row count of atc_assertions is unchanged from baseline
```

## Notes
Data-integrity guard: forces a post-validation failure with a foreign AC id and asserts all three tables stay at baseline (sprint baseline observed at atcs/atc_steps/atc_assertions = 8/16/8). Verifies the transaction rolls back rather than leaving orphan rows.
