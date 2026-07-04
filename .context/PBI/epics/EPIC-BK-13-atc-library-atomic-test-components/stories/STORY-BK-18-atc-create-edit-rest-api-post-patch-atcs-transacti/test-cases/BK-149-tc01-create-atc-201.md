# BK-149 — BK-18: TC01: should create an ATC and return 201 with steps, assertions, slug and version 1 when POST /atcs receives a valid payload

- **Story:** BK-18 · **Epic:** BK-13
- **Type:** Cucumber · **Status:** Candidate · **ROI verdict:** Candidate
- **ATP:** BK-94 · **ATR:** BK-95 · **Pre-Condition:** BK-161
- **Test Set:** BK-186 · **Regression Plan:** BK-65
- **Labels:** regression, api, automation-candidate, regression-candidate
- **AC covered:** AC1
- **Smoke:** yes · **Prior-bug:** none

## Gherkin

```gherkin
@critical @smoke @regression @api @automation-candidate @BK-18
Feature: ATC creation via POST /api/v1/atcs

  Scenario Outline: should create an ATC and return 201 with version 1 given a valid payload on layer <layer>
    """
    Related Story: BK-18
    ATP: BK-94  ATR: BK-95  Pre-Condition: BK-161
    AC covered: AC1
    Bugs covered: none
    ROI: ~17 (smoke). Verdict: Candidate.
    Variables:
      {pat_write}      - Bearer PAT with scope atc:write
      {project_id}     - seeded project (staging: 269850ea-a759-44a1-a45e-3a6187cac5ec)
      {user_story_id}  - US under {project_id} (staging FSX-45: b1f68acf-855a-4320-95f0-e81df5e948c3)
      {ac_id}          - AC belonging to {user_story_id}
      {module_id}      - module == US module or descendant in same project
    """

    # === PRECONDITIONS ===
    Given a valid Bearer PAT "{pat_write}" with scope "atc:write"
    And a seeded project "{project_id}" with user story "{user_story_id}", acceptance criterion "{ac_id}" and module "{module_id}"

    # === ACTION ===
    When the client sends POST "/api/v1/atcs" with a valid body on layer "<layer>" with "<steps_count>" steps and "<assertions_count>" assertions

    # === VALIDATIONS ===
    Then the response status is 201
    And the body returns the new ATC with version 1
    And the body contains "<steps_count>" ordered steps and "<assertions_count>" assertions
    And the slug matches "^[a-z0-9-]+\/atc-[a-z0-9]{8}$"
    And exactly one "atc.created" event is written to activity_log

    # === EQUIVALENT PARTITIONS ===
    Examples: Layers (EP over the layer enum)
      | layer | steps_count | assertions_count |
      | UI    | 3           | 2                |
      | API   | 1           | 0                |
      | Unit  | 5           | 3                |
```

## Notes
Happy-path smoke covering the layer enum (UI/API/Unit) as equivalence partitions. Asserts version starts at 1, slug regex `^[a-z0-9-]+/atc-[a-z0-9]{8}$`, and exactly one `atc.created` activity_log event.
