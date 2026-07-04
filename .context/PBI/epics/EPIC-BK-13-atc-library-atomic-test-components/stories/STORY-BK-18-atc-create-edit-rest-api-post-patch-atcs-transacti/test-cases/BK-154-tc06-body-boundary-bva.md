# BK-154 — BK-18: TC06: should enforce POST /atcs body boundaries for title length, step count, tag count and layer enum

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** input boundaries (BVA)
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@high @regression @api @automation-candidate @BK-18
Feature: Request-body boundary validation on POST /api/v1/atcs (BVA)

  Scenario Outline: should <verb> POST /atcs with <status> when <field> is <case>
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: input boundaries (BVA)
    ROI: ~8. Verdict: Candidate.
    Limits: title 3..200 chars, steps minItems 1, tags maxItems 10, layer enum {UI,API,Unit}.
    Variables:
      {pat_write} - Bearer PAT scope atc:write
    """

    # === PRECONDITIONS ===
    Given a valid Bearer PAT "{pat_write}" and an otherwise valid ATC payload

    # === ACTION ===
    When the client sends POST "/api/v1/atcs" with "<field>" set to "<case>"

    # === VALIDATIONS ===
    Then the response status is <status>
    And the error code is "<error_code>"

    # === BOUNDARY VALUES ===
    Examples: title length (3..200)
      | field | case        | verb   | status | error_code        |
      | title | 2 chars     | reject | 422    | validation_failed |
      | title | 3 chars     | accept | 201    | (none)            |
      | title | 200 chars   | accept | 201    | (none)            |
      | title | 201 chars   | reject | 422    | validation_failed |
    Examples: steps minItems
      | field | case        | verb   | status | error_code        |
      | steps | [] empty    | reject | 422    | validation_failed |
    Examples: tags maxItems (10)
      | field | case        | verb   | status | error_code        |
      | tags  | 10 tags     | accept | 201    | (none)            |
      | tags  | 11 tags     | reject | 422    | validation_failed |
    Examples: layer enum
      | field | case        | verb   | status | error_code        |
      | layer | E2E         | reject | 422    | validation_failed |
```

## Notes
Boundary-value analysis on Zod limits: title 3..200 chars, steps minItems 1, tags maxItems 10, layer enum {UI,API,Unit}. Each boundary tests both the accept side (201) and reject side (422 `validation_failed`).
