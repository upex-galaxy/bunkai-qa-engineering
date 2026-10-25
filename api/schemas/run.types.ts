/**
 * KATA Framework - Type Facade: Test + Run Domain
 *
 * Bunkai Test (a chain of ATCs) and manual Run contract, pulled from the generated
 * OpenAPI types (`api/openapi-types.ts`, refreshed via `bun run api:sync`).
 *
 * Surface used to seed run outcomes:
 *   - POST /api/v1/tests                              201 { test }   (Bearer needs workspace_id)
 *   - POST /api/v1/runs                               201 { run }    (every ATC starts pending)
 *   - POST /api/v1/runs/{id}/steps/{stepId}/mark      200 { run }    (passed | failed | blocked)
 *   - POST /api/v1/runs/{id}/finish                   200 { run }    (unmarked steps → skipped)
 *   - POST /api/v1/runs/{id}/abort                    200 { run }    (unmarked steps → skipped)
 *
 * NOTE: this facade is the ONLY place allowed to import `@openapi` for this domain.
 */

import type { paths } from '@openapi';

// ============================================================================
// Endpoint Types
// ============================================================================

type CreateTestPath = paths['/api/v1/tests']['post'];
type StartRunPath = paths['/api/v1/runs']['post'];
type MarkStepPath = paths['/api/v1/runs/{id}/steps/{stepId}/mark']['post'];
type FinishRunPath = paths['/api/v1/runs/{id}/finish']['post'];
type AbortRunPath = paths['/api/v1/runs/{id}/abort']['post'];

/** Create-test request body (title, ordered atc_ids, workspace_id). */
export type TestCreateRequest = NonNullable<CreateTestPath['requestBody']>['content']['application/json'];

/** Create-test success (201): { test }. */
export type TestCreateResponse = CreateTestPath['responses']['201']['content']['application/json'];

/** Start-run request body (test_id, environment_id, executor_mode, start_token). */
export type RunStartRequest = NonNullable<StartRunPath['requestBody']>['content']['application/json'];

/** Start-run success (201): { run } with its ATC + step snapshot. */
export type RunResponse = StartRunPath['responses']['201']['content']['application/json'];

/** The composed Run every run endpoint returns. */
export type Run = RunResponse['run'];

/** Mark-step request body. */
export type RunStepMarkRequest = NonNullable<MarkStepPath['requestBody']>['content']['application/json'];

/** Finish request body (verdict passed | failed). */
export type RunFinishRequest = NonNullable<FinishRunPath['requestBody']>['content']['application/json'];

/** Abort request body (reason). */
export type RunAbortRequest = NonNullable<AbortRunPath['requestBody']>['content']['application/json'];
