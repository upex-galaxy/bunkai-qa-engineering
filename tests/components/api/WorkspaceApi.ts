/**
 * KATA Architecture - Layer 3: Workspace API Component
 *
 * Helpers that build and remove the throwaway workspaces the coverage suites
 * seed into (test-data isolation, see the sandbox ADR). No ATCs: creating or
 * deleting a sandbox is a precondition, never the outcome under test.
 *
 * Endpoints (relative to config.apiUrl, which already ends in /api/v1):
 *   - POST   /workspaces                → create (Bearer ok)             201
 *   - GET    /workspaces                → list mine (Bearer ok)          200
 *   - POST   /workspaces/{id}/projects  → create a project (Bearer ok)   201
 *   - DELETE /workspaces/{id}           → soft-delete, owner via a COOKIE session only:
 *                                         a PAT gets 403 (measured on staging 2026-10-25)
 */

import type { APIResponse } from '@playwright/test';
import type {
  Project,
  ProjectCreateRequest,
  ProjectCreateResponse,
  Workspace,
  WorkspaceCreateRequest,
  WorkspaceCreateResponse,
  WorkspaceDeleteResponse,
  WorkspaceListItem,
  WorkspaceListResponse,
} from '@schemas/workspace.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { step } from '@utils/decorators';

// ============================================
// Workspace API Component
// ============================================

export class WorkspaceApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers (no @atc)
  // ============================================

  /**
   * Helper: create a workspace owned by the caller.
   *
   * @param body - name (1-80) and slug (3-40, `^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$`)
   */
  @step
  async createWorkspace(body: WorkspaceCreateRequest): Promise<Workspace> {
    const [response, parsed] = await this.apiPOST<WorkspaceCreateResponse, WorkspaceCreateRequest>('/workspaces', body);
    expect(response.status()).toBe(201);
    return parsed.workspace;
  }

  /** Helper: list the caller's workspaces (with the caller's role on each). */
  @step
  async listWorkspaces(): Promise<WorkspaceListItem[]> {
    const [response, parsed] = await this.apiGET<WorkspaceListResponse>('/workspaces');
    expect(response.status()).toBe(200);
    return parsed.workspaces;
  }

  /**
   * Helper: create a project in a workspace.
   *
   * @param workspaceId - Workspace the project belongs to
   * @param name - 3-80 chars, at least one alphanumeric
   */
  @step
  async createProject(workspaceId: string, name: string): Promise<Project> {
    const [response, parsed] = await this.apiPOST<ProjectCreateResponse, ProjectCreateRequest>(
      `/workspaces/${workspaceId}/projects`,
      { name },
    );
    expect(response.status()).toBe(201);
    return parsed.project;
  }

  /**
   * Helper: soft-delete a workspace the caller owns.
   *
   * The route is owner-only AND session-only, so this sends NO Authorization
   * header and relies on the session cookie that `api.auth.openSession()` left
   * on this request context (same pattern as `AuthApi.revokeToken`).
   *
   * @param workspaceId - Workspace to delete
   */
  @step
  async deleteWorkspace(workspaceId: string): Promise<WorkspaceDeleteResponse> {
    const response: APIResponse = await this.request.delete(this.apiEndpoint(`/workspaces/${workspaceId}`), {
      headers: { Accept: '*/*' },
    });
    expect(response.status()).toBe(200);
    const parsed = await this.getResponseJsonObject<WorkspaceDeleteResponse>(response);
    expect(parsed.workspaceId).toBe(workspaceId);
    return parsed;
  }
}
