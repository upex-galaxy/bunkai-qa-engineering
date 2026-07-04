# BK-150 — BK-18: TC02: should reject POST /atcs with 401 when auth is missing/invalid and 403 when the token lacks atc:write scope

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** auth/scope gating (cross-cutting woven here, not a standalone security TC)
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@critical @regression @api @automation-candidate @BK-18
Feature: Authentication and scope gate on POST /api/v1/atcs

  Scenario Outline: should reject POST /atcs with <status> <error_code> given <auth_condition>
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: auth/scope gating (cross-cutting woven here, not a standalone security TC)
    ROI: ~31. Verdict: Candidate.
    Variables:
      {pat_read}  - Bearer PAT with scope atc:read only
      {bad_token} - malformed/invalid bearer string
    Note: 401 paths reject BEFORE any DB access (zero writes).
    """

    # === PRECONDITIONS ===
    Given an otherwise valid POST "/api/v1/atcs" payload

    # === ACTION ===
    When the client sends the request with "<auth_header>"

    # === VALIDATIONS ===
    Then the response status is <status>
    And the error code is "<error_code>"
    And no rows are written to atcs, atc_steps or atc_assertions

    # === EQUIVALENT PARTITIONS ===
    Examples: Auth/scope partitions
      | auth_condition        | auth_header                  | status | error_code   |
      | no Authorization      | (none)                       | 401    | unauthorized |
      | invalid bearer        | Bearer {bad_token}           | 401    | unauthorized |
      | read-only scope       | Bearer {pat_read}            | 403    | forbidden    |
```

## Notes
Highest-ROI TC (~31). 401 paths reject before any DB access (zero writes); 403 covers a valid token whose scope is `atc:read` only.
