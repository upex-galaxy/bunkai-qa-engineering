# Comments for BK-20

[View in Jira](https://upexgalaxy67.atlassian.net/browse/BK-20)

---

### Ely - 5/19/2026, 9:57:26 PM

# 🧱 Architect Annotation

## Technical Notes
- DB tables touched: `atcs` gets a generated `search*tsv tsvector` column (or trigger-maintained, decided at impl plan). GIN index `atcs*search*tsv*idx` on the tsvector column. No new tables.
- Tsvector construction: `setweight(to*tsvector('simple', title), 'A') || setweight(to*tsvector('simple', array*to*string(tags, ' ')), 'B')`. Weight A for title, B for tags.
- Trigger `atcs*tsv*trg` fires BEFORE INSERT OR UPDATE OF title, tags on `atcs` to refresh `search_tsv`. Or use a `GENERATED ALWAYS AS ... STORED` column if Postgres version allows the immutable function constraints (decide in impl plan).
- API surface: `GET /atcs/search` returns 200 with `{ items: [...] }`. Query params: `query` (required, ≥1 char), `module_id` (optional), `layer` (optional enum), `limit` (optional int, default 20, capped 50).
- Ranking SQL: `SELECT ..., ts*rank(search*tsv, plainto*tsquery('simple', $1)) * exp(- EXTRACT(EPOCH FROM (now() - updated*at)) / $decay) AS score`. `$decay` defaults to 7 days in seconds (documented constant in code).
- Module-subtree filter: reuses existing recursive CTE or materialized `module*paths` (depending on Wave 1 implementation). Filter applied as `WHERE module*id IN (SELECT id FROM module_subtree($2))`.
- Workspace scoping at service layer: `WHERE workspace*id = $session.workspace*id` always applied, even if RLS exists (defense in depth).
- Response shape: `{ atc*id, slug, title, module*path, layer, status*dot }`. `module*path` is a denormalized string like `Module A / Submodule B` to avoid a second roundtrip.

## Dependencies
- Upstream: BK-18 (atcs table must exist with title + tags + updated*at + module*id + workspace_id columns). Wave 1 modules subtree mechanism.
- Downstream: Test composition UI (EPIC-BK-5) consumes this endpoint as the ATC picker autocomplete. The picker debounces user input (~200ms) and renders the result list.
- External: PostgreSQL `tsvector`, `to*tsquery`, `ts*rank`, GIN indexes. No pg_trgm needed for MVP (semantic/fuzzy search deferred to Phase 2).

## Definition of Done (expanded)
- [ ] Migration adds `search_tsv` column + GIN index + trigger (or generated column)
- [ ] Backfill statement populates `search_tsv` for all existing atcs rows
- [ ] OpenAPI entry for `GET /atcs/search` with query schema and response shape
- [ ] `bun run api:sync` passes
- [ ] Unit tests for: empty query rejected, single-word match, multi-word match, recency decay ordering (newer wins on equal text relevance), workspace isolation
- [ ] Integration tests for: module subtree filter, layer filter, limit cap at 50
- [ ] Performance budget documented: search must return < 100ms p95 on a 10k-ATC workspace
- [ ] Lint + typecheck pass

## Related Documentation
- PRD: `.context/PRD/mvp-scope.md` § EPIC-BK-004 (US 4.3)
- SRS: `.context/SRS/functional-specs.md` § FR-011
- Business map: `.context/business/business-data-map.md` § atcs (search_tsv column)
- API contract: `.context/SRS/api-contracts.yaml` § paths./atcs/search


---


_Synced from Jira by sync-jira-issues_
_Last sync: 2026-05-24T23:31:46.150Z_
