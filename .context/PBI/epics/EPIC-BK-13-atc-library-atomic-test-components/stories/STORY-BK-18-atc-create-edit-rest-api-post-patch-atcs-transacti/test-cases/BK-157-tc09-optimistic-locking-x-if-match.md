# BK-157 — BK-18: TC09: should honor optimistic locking on PATCH /atcs/{id} (200 matching X-If-Match / 409 stale / 200 absent)

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** optimistic locking (BK-96 area)
- **Smoke:** no · **Prior-bug:** BK-96 area

## Gherkin

```gherkin
@high @regression @api @automation-candidate @BK-18
Feature: Optimistic locking on PATCH /api/v1/atcs/{id} via X-If-Match

  Scenario Outline: should <outcome> when PATCH /atcs/{id} carries X-If-Match "<header>" given current version <current>
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: optimistic locking (BK-96 area)
    ROI: ~7 (prior-bug area). Verdict: Candidate.
    Rule: matching version -> apply (200); stale -> 409 conflict with current_version; absent -> lenient skip (200).
    Variables:
      {pat_write} - Bearer PAT scope atc:write
      {atc_id}    - existing ATC at known version {current}
    Note: legacy header If-Match -> 412 at the Vercel edge is a documented limitation (informational, not asserted here).
    """

    # === PRECONDITIONS ===
    Given an existing ATC "{atc_id}" at version <current>
    And a valid Bearer PAT "{pat_write}"

    # === ACTION ===
    When the client sends PATCH "/api/v1/atcs/{atc_id}" with header "X-If-Match: <header>"

    # === VALIDATIONS ===
    Then the response status is <status>
    And the error code is "<error_code>"
    And when 409 the body includes the current_version "<current>"

    # === EQUIVALENT PARTITIONS ===
    Examples: lock outcomes
      | outcome              | current | header  | status | error_code |
      | apply the edit       | 2       | 2       | 200    | (none)     |
      | reject as stale      | 2       | 1       | 409    | conflict   |
      | skip the lock check  | 2       | (absent)| 200    | (none)     |
```

## Notes
Lock rule: matching version applies (200), stale yields 409 `conflict` with `current_version`, absent header is a lenient skip (200). Edge limitation: legacy `If-Match` -> 412 at the Vercel edge is a documented limitation, informational only and not asserted here.
