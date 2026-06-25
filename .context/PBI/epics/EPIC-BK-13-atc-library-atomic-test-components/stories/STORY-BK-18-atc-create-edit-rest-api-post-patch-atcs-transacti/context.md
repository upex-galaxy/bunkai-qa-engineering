# BK-18 — Session Notes & Open Questions

> Hand-authored ticket-local context (NON-Jira). Session notes + open questions only.

## What this story is (plain terms)

A transactional REST API to **create and edit ATCs** (Atomic Test Components) — the reusable test building blocks that are Bunkai's core product. One call creates the ATC header + its ordered steps + its assertions atomically. Consumed by CLI/scripts/agents via Bearer PAT (the UI form is a separate story, BK-19).

Two endpoints:
- `POST /api/v1/atcs` → 201 (create with full payload)
- `PATCH /api/v1/atcs/{id}` → 200 (full-replace edit, version-bumped)

The hard part is **atomicity + cross-entity validation**: ACs must belong to the given User Story, the module must sit in the same project subtree, step positions must be strictly increasing from 1 — and any failure rolls back to zero rows written.

## Why it matters (risk posture)

Per master-test-plan §1: ATC authoring is the **product's reason to exist** + the anchoring moat (INV-1/INV-2: every ATC links to a US + ≥1 AC). A bug that lets an ATC exist without a valid US/AC link is a hole in the value proposition, not a cosmetic defect. Plus this is the head of the ATC chain — BK-19/20/21/22/23/27 all depend on this contract.

## Session notes

- 2026-06-08 — Session Start. Story synced, implementation confirmed landed on staging (routes + migration 0021 + openapi). Modality xray. Surfaces: API + DB (no UI).

## Open questions

1. **`API_TOKEN` scope** — does the `.env` token carry `atc:write`? If not, all happy-path writes 403. Resolve at Stage 2 start (mint a scoped PAT if needed). RESOLVED — minted full-scope PAT via `bun run api:login staging`.
2. **DB seed data** — do staging fixtures exist for a project P-1 with module M-10, US-100, AC-1/AC-2 (and a cross-US AC-9, cross-project module M-99) to exercise the negative cross-entity scenarios? Stage 1 test-data identification must confirm or seed. RESOLVED — "Openapi Test Project" + cross-subtree module in "BK-9 Module Test Project".
3. **Test isolation** — created ATCs pollute the shared staging DB. Need a cleanup strategy (delete created rows post-run, or tag with a session marker). Precedent: BK-15/BK-17 seeded → exercised → cleaned up via Supabase MCP. RESOLVED — smoke ATC DELETEd, cascade verified, counts restored to baseline.

## Final Status (RE-RUN 2026-06-20)

**Result:** PASSED (GO) — 12/12 TCs.
**BK-96:** verified FIXED end-to-end (X-If-Match contract; PR #30 / 421a917). NOT reopened.
**BK-18 status:** QA Approved (qa_sign_off).
**Artifacts:** ATP BK-94 (updated) · Tests BK-149..160 · Pre-Condition BK-161 · Test Execution BK-95 (all PASSED).
**Observation:** affected_test_ids returns null (contract said []).
