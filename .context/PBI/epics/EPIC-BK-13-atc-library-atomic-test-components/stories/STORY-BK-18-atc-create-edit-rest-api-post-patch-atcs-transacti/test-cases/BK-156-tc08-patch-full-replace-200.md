# BK-156 — BK-18: TC08: should return 200, bump version and cascade-replace children when PATCH /atcs/{id} full-replaces with X-If-Match (BK-96 regression)

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** AC5
- **Smoke:** yes · **Prior-bug:** BK-96

## Gherkin

```gherkin
@critical @smoke @regression @api @automation-candidate @BK-18
Feature: ATC full-replace edit via PATCH /api/v1/atcs/{id}

  Scenario: should return 200, bump version and cascade-replace children when PATCH /atcs/{id} full-replaces with X-If-Match (BK-96 regression)
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: AC5
    Bugs covered: BK-96 (legacy If-Match -> 412 at Vercel edge; fixed by custom X-If-Match header, PR #30 / 421a917)
    ROI: ~17 (smoke + prior-bug). Verdict: Candidate.
    Variables:
      {pat_write} - Bearer PAT scope atc:write
      {atc_id}    - existing ATC currently at version 1 with 3 steps + assertions
    Regression guard: the OPTIMISTIC-LOCK token MUST travel in the custom header X-If-Match, never legacy If-Match.
    """

    # === PRECONDITIONS ===
    Given an existing ATC "{atc_id}" at version 1 with 3 steps and assertions
    And a valid Bearer PAT "{pat_write}"

    # === ACTION ===
    When the client sends PATCH "/api/v1/atcs/{atc_id}" with header "X-If-Match: 1" and a full-replace body of a new title plus 2 steps and no assertions

    # === VALIDATIONS ===
    Then the response status is 200
    And the response is a JSON envelope carrying an x-request-id
    And the ATC version is bumped from 1 to 2
    And the steps are cascade-replaced from 3 to 2
    And the assertions are cleared to 0
    And one "atc.updated" event is written to activity_log
```

## Notes
BK-96 regression: legacy `If-Match` was stripped to 412 at the Vercel edge; fixed by the custom `X-If-Match` header (PR #30 / 421a917). Regression guard — the optimistic-lock token MUST travel in `X-If-Match`, never legacy `If-Match`. Verifies version bump 1->2 and cascade-replace of children.
