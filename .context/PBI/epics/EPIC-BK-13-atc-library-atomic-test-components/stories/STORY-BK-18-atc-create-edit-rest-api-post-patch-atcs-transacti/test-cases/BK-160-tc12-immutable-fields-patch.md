# BK-160 — BK-18: TC12: should keep slug, user_story_id and module_id immutable when PATCH /atcs/{id} attempts to change them

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** immutability / data integrity
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@medium @regression @api @automation-candidate @BK-18
Feature: Immutable fields on PATCH /api/v1/atcs/{id}

  Scenario Outline: should keep <field> immutable when PATCH /atcs/{id} attempts to change it
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: immutability / data integrity
    ROI: ~9. Verdict: Candidate.
    Rule: slug, user_story_id and module_id are silently ignored on PATCH (preserved, not errored).
    Variables:
      {pat_write} - Bearer PAT scope atc:write
      {atc_id}    - existing ATC (e.g. slug credit-cards/atc-c386c6c6)
    """

    # === PRECONDITIONS ===
    Given an existing ATC "{atc_id}" with known slug, user_story_id and module_id
    And a valid Bearer PAT "{pat_write}"

    # === ACTION ===
    When the client sends PATCH "/api/v1/atcs/{atc_id}" attempting to change "<field>" to "<new_value>"

    # === VALIDATIONS ===
    Then the response status is 200
    And the field "<field>" keeps its original value

    # === EQUIVALENT PARTITIONS ===
    Examples: immutable fields
      | field         | new_value     |
      | slug          | hacked/atc-00000000 |
      | user_story_id | other-us-uuid |
      | module_id     | other-module-uuid |
```

## Notes
Immutability rule: slug, user_story_id and module_id are silently ignored on PATCH (preserved, not errored) — the request returns 200 and the fields keep their original values rather than raising a validation error.
