# Comments for BK-34

[View in Jira](https://jira.upexgalaxy.com/browse/BK-34)

---

### jesusgpythondev - 6/7/2026, 10:22:51 PM

# Shift-Left Review Update

## Summary

BK-34 has been refined for estimation using the shift-left workflow.

The ticket description now contains the business-readable scope, refined Acceptance Criteria, business rules, and open clarifications. This comment is only the handoff changelog, not a duplicate copy of the full Story specification.

## Findings

- Scope is limited to starting a manual Run and creating the initial pending checklist.
- Step result updates, abort flow, final verdict, reporting, and defect handling stay out of scope.
- Idempotency with a 24-hour start token is a high-value behavior and should be estimated explicitly.
- Environment validation must prevent starting a Run against an environment not configured for the Project.

## Risks

| Risk | Severity | Notes |
|---|---|---|
| Duplicate Run creation on retry | High | Same start token within 24 hours should return the existing Run. |
| Invalid environment selected | High | Must block Run creation and show a clear message. |
| Test has no executable steps | High | Must block Run creation and avoid partial records. |
| BK-70 dependency ignored for this pass | Medium | Accepted by instruction for this provisional refinement; refresh if Test Repository contract changes. |

## Recommendations

- Estimate BK-34 as the run-start entry point only.
- Keep BK-35 through BK-43 separate; do not pull their behaviors into BK-34.
- Resolve the open PO/Design/Dev clarifications before moving to Ready For Dev.

## Open Questions

- After the 24-hour idempotency window, should the same token create a new Run or be rejected as expired?
- Should a Test with manual steps but no ATCs be executable?
- What success state should the user see after starting a Run?
- Should a Run snapshot step content/order at creation time?

---

### jesusgpythondev - 6/7/2026, 10:47:10 PM

# Acceptance Test Plan (ATP) - Shift-Left Draft

## Summary

This ATP Draft exists as a Jira comment fallback because the current Jira REST/custom-field path cannot update the ATP custom field reliably in this environment.

## Scenario Matrix

| ***ID**** | ****Outline**** | ****Type**** | ****Priority*** |
| --- | --- | --- | --- |
| BK-34-ATC-01 | Start Run creates pending checklist in correct order | Positive | High |
| BK-34-ATC-02 | Start Run blocks Test with no executable steps | Negative | High |
| BK-34-ATC-03 | Start Run blocks invalid Project environment | Negative | High |
| BK-34-ATC-04 | Same token within 24 hours returns existing Run | Boundary | High |
| BK-34-ATC-05 | Different token creates separate Run | Positive | Medium |
| BK-34-ATC-06 | Agent or CI executor mode is stored correctly | Integration | Medium |
| BK-34-ATC-07 | Newly started Run appears in run history | Integration | Medium |

## Coverage Notes

- Positive coverage validates successful Run creation and history visibility.
- Negative coverage validates blockers for missing executable steps and invalid environments.
- Boundary coverage validates duplicate prevention through the start token.
- Integration coverage validates executor mode and cross-user visibility.

---


_Synced from Jira by sync-jira-issues_
