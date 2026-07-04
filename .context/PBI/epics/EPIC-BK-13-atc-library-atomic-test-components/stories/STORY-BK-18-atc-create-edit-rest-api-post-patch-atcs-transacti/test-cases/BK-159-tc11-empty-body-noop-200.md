# BK-159 — BK-18: TC11: should treat PATCH /atcs/{id} with an empty body as a 200 no-op without version bump or event

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** no-op business rule
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@medium @regression @api @automation-candidate @BK-18
Feature: Empty-body no-op on PATCH /api/v1/atcs/{id}

  Scenario: should treat PATCH /atcs/{id} with an empty body as a 200 no-op without version bump or event
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: no-op business rule
    ROI: ~6. Verdict: Candidate.
    Rule: empty body {} -> 200, version unchanged, no atc.updated event, RPC not called.
    Variables:
      {pat_write} - Bearer PAT scope atc:write
      {atc_id}    - existing ATC currently at version 5
    """

    # === PRECONDITIONS ===
    Given an existing ATC "{atc_id}" at version 5
    And a valid Bearer PAT "{pat_write}"

    # === ACTION ===
    When the client sends PATCH "/api/v1/atcs/{atc_id}" with an empty body "{}"

    # === VALIDATIONS ===
    Then the response status is 200
    And the ATC version is unchanged at 5
    And no "atc.updated" event is written to activity_log
```

## Notes
No-op rule: empty body `{}` returns 200, version stays unchanged (5), no `atc.updated` event is emitted and the underlying RPC is never called.
