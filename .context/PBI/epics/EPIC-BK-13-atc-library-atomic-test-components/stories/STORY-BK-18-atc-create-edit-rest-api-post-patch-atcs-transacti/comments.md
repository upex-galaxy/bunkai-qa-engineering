# Comments for BK-18

[View in Jira](https://jira.upexgalaxy.com.net/browse/BK-18)

---

### Ely - 5/19/2026, 9:57:17 PM

# 🧱 Architect Annotation

## Technical Notes
- DB tables touched: `atcs` (new row), `atc*steps` (bulk insert), `atc*assertions` (bulk insert). Both child tables FK to `atcs.id` with `ON DELETE CASCADE`. Index `atc*steps(atc*id, position)` UNIQUE; `atc*assertions(atc*id, position)` UNIQUE.
- API surface: `POST /atcs` returns 201, `PATCH /atcs/{id}` returns 200. Validation errors return 422 with `{ error_code, fields[] }`. OpenAPI spec under `api/openapi.yaml` → `paths./atcs.post`, `paths./atcs/{id}.patch`. Run `bun run api:sync` after spec changes.
- Server-side transaction boundary: BEGIN → INSERT atcs → INSERT atc*steps (batch) → INSERT atc*assertions (batch) → UPDATE atcs SET slug = compute*slug(atc*id, module*id) → COMMIT. PATCH: BEGIN → SELECT FOR UPDATE → UPDATE atcs → DELETE atc*steps + atc_assertions → re-INSERT → COMMIT.
- Slug computation: `{module-slug}/atc-{atc_id padded to 6 digits}`. Slug is set once and never re-computed on rename.
- Event emission: `atc.created` (POST) and `atc.updated` (PATCH) published via the existing event bus on commit (after-commit hook). Payload includes the full ATC + steps + assertions; PATCH event additionally carries `affected*test*ids[]`.
- Cross-entity validation runs before the transaction opens (cheap reads to verify AC→US and module→project subtree). Avoids holding row locks during validation.

## Dependencies
- Upstream: BK-13 (parent epic), and Wave 1 entities — User Stories (`user*stories` table), Acceptance Criteria (`acceptance*criteria` table), Modules (`modules` table) must already exist with the validation columns this story references.
- Downstream: BK-19 (UI form consumes this API), BK-20 (search reads from `atcs`), BK-21 (PATCH propagation extends this endpoint), BK-22 (usage report joins `test*steps` → `atcs`), BK-23 (duplicate reuses the create path), EPIC-BK-5 Tests (test*steps table references atc_id).
- External: PostgreSQL 15+ for `gen*random*uuid`/CTE features; internal event bus (existing module).

## Definition of Done (expanded)
- [ ] DB migration creates `atcs`, `atc*steps`, `atc*assertions` (if not present) — applies and reverts cleanly
- [ ] OpenAPI updated for POST and PATCH; `bun run api:sync` passes with no diff
- [ ] Unit tests cover: happy create, happy patch, AC-outside-US, module-outside-subtree, invalid layer enum, non-monotonic step positions
- [ ] Integration tests verify transaction rollback when ANY step/assertion insert fails
- [ ] Lint + typecheck pass
- [ ] Manual smoke: `curl -X POST /atcs` succeeds with sample payload; `curl -X PATCH` returns version+1
- [ ] PR description references each AC by Gherkin scenario name
- [ ] Event payload schema documented in `.context/business/events.md` under `atc.created` and `atc.updated`

## Related Documentation
- PRD: `.context/PRD/mvp-scope.md` § EPIC-BK-004 (US 4.1, US 4.2)
- SRS: `.context/SRS/functional-specs.md` § FR-010
- Business map: `.context/business/business-data-map.md` § atcs / atc*steps / atc*assertions
- API contract: `.context/SRS/api-contracts.yaml` § paths./atcs and paths./atcs/{id}


---


_Synced from Jira by sync-jira-issues_
_Last sync: 2026-05-24T23:31:45.211Z_
