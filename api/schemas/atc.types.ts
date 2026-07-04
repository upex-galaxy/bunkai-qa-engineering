/**
 * KATA Framework - Type Facade: ATC Domain
 *
 * Real Bunkai ATC (Atomic Test Component) contract pulled from the generated
 * OpenAPI types (`api/openapi-types.ts`, refreshed via `bun run api:sync`).
 *
 * ATC API surface (NOTE: there is NO GET-list and NO GET-single endpoint):
 *   - POST   /api/v1/atcs                 → create (transactional)        201 { atc }
 *   - PATCH  /api/v1/atcs/{id}            → full-replace edit            200 { atc, version, affected_test_count }
 *   - GET    /api/v1/atcs/search          → project-scoped search        200 { items }
 *   - POST   /api/v1/atcs/{id}/duplicate  → deep-copy                     201 { atc }
 *   - GET    /api/v1/atcs/{id}/usage      → "used in N tests" report      200 AtcUsageReport
 *
 * NOTE: this facade is the ONLY place allowed to import `@openapi`.
 * Components import the named types below from `@schemas/atc.types`.
 */

import type { components, paths } from '@openapi';

// ============================================================================
// Schema Types (from components.schemas)
// ============================================================================

/** Canonical ATC entity. */
export type Atc = components['schemas']['Atc'];

/** A single ranked search hit from the ATC search endpoint. */
export type AtcSearchResult = components['schemas']['AtcSearchResult'];

/** Usage report: distinct Tests that chain an ATC, plus a count. */
export type AtcUsageReport = components['schemas']['AtcUsageReport'];

// ============================================================================
// Endpoint Types - POST /api/v1/atcs (create)
// ============================================================================

type CreateAtcPath = paths['/api/v1/atcs']['post'];

/** Create request body (atc + steps + assertions + AC links). */
export type AtcCreateRequest = CreateAtcPath['requestBody']['content']['application/json'];

/** Create success (201): { atc }. */
export type AtcCreateResponse = CreateAtcPath['responses']['201']['content']['application/json'];

// ============================================================================
// Endpoint Types - PATCH /api/v1/atcs/{id} (full-replace edit)
// ============================================================================

type UpdateAtcPath = paths['/api/v1/atcs/{id}']['patch'];

/** Update request body (full replace of steps/assertions; optional/no-op allowed). */
export type AtcUpdateRequest = NonNullable<UpdateAtcPath['requestBody']>['content']['application/json'];

/** Update success (200): { atc, version, affected_test_count }. */
export type AtcUpdateResponse = UpdateAtcPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - GET /api/v1/atcs/search
// ============================================================================

type SearchAtcPath = paths['/api/v1/atcs/search']['get'];

/** Search query parameters (query + project_id required). */
export type AtcSearchParams = SearchAtcPath['parameters']['query'];

/** Search success (200): { items: AtcSearchResult[] }. */
export type AtcSearchResponse = SearchAtcPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - POST /api/v1/atcs/{id}/duplicate (deep-copy)
// ============================================================================

type DuplicateAtcPath = paths['/api/v1/atcs/{id}/duplicate']['post'];

/** Duplicate request body (optional title override). */
export type AtcDuplicateRequest = NonNullable<DuplicateAtcPath['requestBody']>['content']['application/json'];

/** Duplicate success (201): { atc }. */
export type AtcDuplicateResponse = DuplicateAtcPath['responses']['201']['content']['application/json'];

// ============================================================================
// Endpoint Types - GET /api/v1/atcs/{id}/usage
// ============================================================================

type AtcUsagePath = paths['/api/v1/atcs/{id}/usage']['get'];

/** Usage success (200): AtcUsageReport. */
export type AtcUsageResponse = AtcUsagePath['responses']['200']['content']['application/json'];
