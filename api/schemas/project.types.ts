/**
 * KATA Framework - Type Facade: Project Hierarchy + Coverage Domain
 *
 * Bunkai project hierarchy (module → user story → acceptance criterion), project
 * environments and the project coverage rollup, pulled from the generated OpenAPI
 * types (`api/openapi-types.ts`, refreshed via `bun run api:sync`).
 *
 * Surface used by the test sandboxes and the coverage ATCs:
 *   - POST /api/v1/projects/{id}/modules                     201 { module }
 *   - POST /api/v1/modules/{id}/user-stories                 201 { user_story }
 *   - POST /api/v1/user-stories/{id}/acceptance-criteria     201 { acceptance_criterion }
 *   - POST /api/v1/projects/{id}/environments                201 { environment }
 *   - GET  /api/v1/projects/{id}/coverage                    200 { kpis, modules, no_coverage } (counts only, not memoized)
 *
 * NOTE: this facade is the ONLY place allowed to import `@openapi` for this domain.
 */

import type { paths } from '@openapi';

// ============================================================================
// Endpoint Types
// ============================================================================

type CreateModulePath = paths['/api/v1/projects/{id}/modules']['post'];
type CreateUserStoryPath = paths['/api/v1/modules/{id}/user-stories']['post'];
type CreateAcceptanceCriterionPath = paths['/api/v1/user-stories/{id}/acceptance-criteria']['post'];
type CreateEnvironmentPath = paths['/api/v1/projects/{id}/environments']['post'];
type ProjectCoveragePath = paths['/api/v1/projects/{id}/coverage']['get'];

/** Create-module request body. */
export type ModuleCreateRequest = NonNullable<CreateModulePath['requestBody']>['content']['application/json'];

/** Create-module success (201): { module }. */
export type ModuleCreateResponse = CreateModulePath['responses']['201']['content']['application/json'];

/** Create-user-story request body. */
export type UserStoryCreateRequest = NonNullable<CreateUserStoryPath['requestBody']>['content']['application/json'];

/** Create-user-story success (201): { user_story }. */
export type UserStoryCreateResponse = CreateUserStoryPath['responses']['201']['content']['application/json'];

/** Create-acceptance-criterion request body. */
export type AcceptanceCriterionCreateRequest = NonNullable<CreateAcceptanceCriterionPath['requestBody']>['content']['application/json'];

/** Create-acceptance-criterion success (201): { acceptance_criterion }. */
export type AcceptanceCriterionCreateResponse = CreateAcceptanceCriterionPath['responses']['201']['content']['application/json'];

/** Create-environment request body. */
export type EnvironmentCreateRequest = NonNullable<CreateEnvironmentPath['requestBody']>['content']['application/json'];

/** Create-environment success (201): { environment }. */
export type EnvironmentCreateResponse = CreateEnvironmentPath['responses']['201']['content']['application/json'];

/** Project coverage rollup (200): { kpis, modules, no_coverage }. */
export type ProjectCoverage = ProjectCoveragePath['responses']['200']['content']['application/json'];

/** One module row of the project coverage rollup. */
export type ModuleCoverage = ProjectCoverage['modules'][number];

/** Coverage status of a module: uncovered | not_run | fully_covered | no_acs. */
export type ModuleCoverageStatus = ModuleCoverage['status'];
