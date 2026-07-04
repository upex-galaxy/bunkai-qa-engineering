# BK-158 — BK-18: TC10: should return 404 not_found when PATCH /atcs/{id} targets a non-existent ATC id

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** negative path
- **Smoke:** no · **Prior-bug:** none

## Gherkin

```gherkin
@medium @regression @api @automation-candidate @BK-18
Feature: Not-found handling on PATCH /api/v1/atcs/{id}

  Scenario Outline: should return 404 not_found when PATCH /atcs/{id} targets a non-existent ATC id "<atc_id>"
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: negative path
    ROI: ~10. Verdict: Candidate.
    Doc note: the 404 message ("ATC, user story, or module not found") collapses three not-found causes (coarse, not a defect).
    Variables:
      {pat_write} - Bearer PAT scope atc:write
    """

    # === PRECONDITIONS ===
    Given a valid Bearer PAT "{pat_write}"

    # === ACTION ===
    When the client sends PATCH "/api/v1/atcs/<atc_id>" with a valid body and header "X-If-Match: 1"

    # === VALIDATIONS ===
    Then the response status is 404
    And the error code is "not_found"

    # === EQUIVALENT PARTITIONS ===
    Examples: non-existent ids
      | atc_id                               |
      | 00000000-0000-0000-0000-000000000000 |
      | a-random-non-existent-uuid           |
```

## Notes
Coarse 404 message — "ATC, user story, or module not found" collapses three distinct not-found causes into one message. Documented as intentional (not a defect).
