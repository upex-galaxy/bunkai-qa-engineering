# BK-153 — BK-18: TC05: should reject POST /atcs with 422 steps_position_invalid when step positions are not strictly increasing from 1

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** AC4
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@high @regression @api @automation-candidate @BK-18
Feature: Step position validation on POST /api/v1/atcs

  Scenario Outline: should reject POST /atcs with 422 steps_position_invalid given positions <positions>
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: AC4
    ROI: ~8. Verdict: Candidate.
    Rule: step positions must be integers, strictly increasing, starting at 1.
    Variables:
      {pat_write} - Bearer PAT scope atc:write
    """

    # === PRECONDITIONS ===
    Given a valid Bearer PAT "{pat_write}" and an otherwise valid ATC payload

    # === ACTION ===
    When the client sends POST "/api/v1/atcs" with step positions "<positions>"

    # === VALIDATIONS ===
    Then the response status is <status>
    And the error code is "<error_code>"
    And when rejected the body lists the offending positions

    # === EQUIVALENT PARTITIONS / BVA ===
    Examples: Invalid position sequences
      | positions | status | error_code             |
      | [1,3,2]   | 422    | steps_position_invalid |
      | [2,3,4]   | 422    | steps_position_invalid |
      | [1,1,2]   | 422    | steps_position_invalid |
      | [0,1,2]   | 422    | steps_position_invalid |
    Examples: Valid control
      | positions | status | error_code             |
      | [1,2,3]   | 201    | (none)                 |
```

## Notes
Rule: step positions must be integers, strictly increasing, starting at 1. Includes a `[1,2,3]` valid control row that returns 201, and the rejected body lists the offending positions.
