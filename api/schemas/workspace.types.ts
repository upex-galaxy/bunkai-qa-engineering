/**
 * KATA Framework - Type Facade: Workspace Domain
 *
 * Bunkai workspace + project-creation contract pulled from the generated OpenAPI
 * types (`api/openapi-types.ts`, refreshed via `bun run api:sync`).
 *
 * Workspace API surface used by the test sandboxes:
 *   - POST   /api/v1/workspaces                → create (caller becomes owner)     201 { workspace }
 *   - GET    /api/v1/workspaces                → list the caller's workspaces      200 { workspaces }
 *   - DELETE /api/v1/workspaces/{id}           → soft-delete (owner, cookie only)  200
 *   - POST   /api/v1/workspaces/{id}/projects  → create a project                  201 { project }
 *   - GET    /api/v1/workspaces/{id}/coverage  → AC-weighted rollup, 60s memo      200
 *
 * NOTE: this facade is the ONLY place allowed to import `@openapi` for this domain.
 */

import type { components, paths } from '@openapi';

// ============================================================================
// Schema Types (from components.schemas)
// ============================================================================

/** Canonical workspace entity. */
export type Workspace = components['schemas']['Workspace'];

/** Canonical project entity. */
export type Project = components['schemas']['Project'];

/** Workspace coverage rollup, including the clamped percentages the Home card prints. */
export type WorkspaceCoverage = components['schemas']['WorkspaceCoverage'];

// ============================================================================
// Endpoint Types
// ============================================================================

type CreateWorkspacePath = paths['/api/v1/workspaces']['post'];
type ListWorkspacesPath = paths['/api/v1/workspaces']['get'];
type DeleteWorkspacePath = paths['/api/v1/workspaces/{id}']['delete'];
type CreateProjectPath = paths['/api/v1/workspaces/{id}/projects']['post'];

/** Create-workspace request body (name, slug). */
export type WorkspaceCreateRequest = CreateWorkspacePath['requestBody']['content']['application/json'];

/** Create-workspace success (201): { workspace }. */
export type WorkspaceCreateResponse = CreateWorkspacePath['responses']['201']['content']['application/json'];

/** List success (200): { workspaces } with the caller's role on each. */
export type WorkspaceListResponse = ListWorkspacesPath['responses']['200']['content']['application/json'];

/** One listed workspace (carries the caller's `role`). */
export type WorkspaceListItem = WorkspaceListResponse['workspaces'][number];

/** Delete success (200): soft-delete receipt with the purge deadline. */
export type WorkspaceDeleteResponse = DeleteWorkspacePath['responses']['200']['content']['application/json'];

/** Create-project request body (name, optional description). */
export type ProjectCreateRequest = NonNullable<CreateProjectPath['requestBody']>['content']['application/json'];

/** Create-project success (201): { project }. */
export type ProjectCreateResponse = CreateProjectPath['responses']['201']['content']['application/json'];
