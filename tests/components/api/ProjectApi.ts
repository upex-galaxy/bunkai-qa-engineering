/**
 * KATA Architecture - Layer 3: Project API Component
 *
 * Helpers that seed a project's hierarchy (module → user story → acceptance
 * criteria) and its run environments. No ATCs: this is precondition data for
 * the coverage suites, created inside a throwaway sandbox workspace.
 *
 * Endpoints (relative to config.apiUrl, Bearer `atc:write` or cookie):
 *   - POST /projects/{id}/modules                   201 { module }
 *   - POST /modules/{id}/user-stories               201 { user_story }
 *   - POST /user-stories/{id}/acceptance-criteria   201 { acceptance_criterion }
 *   - POST /projects/{id}/environments              201 { environment }
 */

import type {
  AcceptanceCriterionCreateRequest,
  AcceptanceCriterionCreateResponse,
  EnvironmentCreateRequest,
  EnvironmentCreateResponse,
  ModuleCreateRequest,
  ModuleCreateResponse,
  UserStoryCreateRequest,
  UserStoryCreateResponse,
} from '@schemas/project.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { step } from '@utils/decorators';

/** Acceptance criteria created concurrently per batch (200 ACs seed in ~18s on staging). */
const AC_BATCH_SIZE = 10;

// ============================================
// Project API Component
// ============================================

export class ProjectApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers (no @atc)
  // ============================================

  /** Helper: create a root module in a project. Returns the module id. */
  @step
  async createModule(projectId: string, name: string): Promise<string> {
    const [response, parsed] = await this.apiPOST<ModuleCreateResponse, ModuleCreateRequest>(
      `/projects/${projectId}/modules`,
      { name },
    );
    expect(response.status()).toBe(201);
    return parsed.module.id;
  }

  /** Helper: create a user story under a module. Returns the user story id. */
  @step
  async createUserStory(moduleId: string, title: string): Promise<string> {
    const [response, parsed] = await this.apiPOST<UserStoryCreateResponse, UserStoryCreateRequest>(
      `/modules/${moduleId}/user-stories`,
      { title },
    );
    expect(response.status()).toBe(201);
    return parsed.user_story.id;
  }

  /**
   * Helper: append `count` acceptance criteria to a user story, in batches.
   *
   * @returns the created ids, in creation order
   */
  @step
  async createAcceptanceCriteria(userStoryId: string, count: number): Promise<string[]> {
    const ids: string[] = [];
    for (let start = 0; start < count; start += AC_BATCH_SIZE) {
      const batch = Array.from({ length: Math.min(AC_BATCH_SIZE, count - start) }, async (_, offset) =>
        this.apiPOST<AcceptanceCriterionCreateResponse, AcceptanceCriterionCreateRequest>(
          `/user-stories/${userStoryId}/acceptance-criteria`,
          { title: `Acceptance criterion ${start + offset + 1}` },
        ));
      for (const [response, parsed] of await Promise.all(batch)) {
        expect(response.status()).toBe(201);
        ids.push(parsed.acceptance_criterion.id);
      }
    }
    return ids;
  }

  /** Helper: add a run environment to a project. Returns the environment id. */
  @step
  async createEnvironment(projectId: string, name: string): Promise<string> {
    const [response, parsed] = await this.apiPOST<EnvironmentCreateResponse, EnvironmentCreateRequest>(
      `/projects/${projectId}/environments`,
      { name },
    );
    expect(response.status()).toBe(201);
    return parsed.environment.id;
  }
}
