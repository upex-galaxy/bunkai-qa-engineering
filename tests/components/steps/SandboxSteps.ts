/**
 * KATA Architecture - Layer 3.5: Sandbox Steps
 *
 * Throwaway workspace per spec file (test-data isolation, ADR-0001): every
 * suite that seeds coverage data opens its own workspace + project + run
 * environment, seeds inside it, and deletes the whole workspace when it is
 * done. Nothing a suite seeds is ever visible in a shared workspace, and
 * workspace-level rollups only ever see the suite's own project.
 *
 * Not a fixture: a spec instantiates it with the `api` fixture it already has
 * (`new SandboxSteps(api)`). Steps carry no `@atc` and are not reported to the TMS.
 *
 * Lifecycle facts (measured on staging 2026-10-25):
 * - A PAT can create the workspace, projects, environments and seed data.
 * - Deleting the workspace is owner-only AND cookie-session-only (a PAT gets
 *   403), so `close()` opens a session on the request context first. That
 *   sign-in mints a PAT; it goes to the minted-PAT ledger the global teardown revokes.
 * - Delete is a soft delete (30-day purge window, restorable).
 * - The Free plan caps a workspace at 3 projects (`project_limit_reached`, 422).
 */

import type { ApiFixture } from '@ApiFixture';

import { faker } from '@faker-js/faker';
import { expect } from '@playwright/test';
import { TestContext } from '@TestContext';
import { recordMintedPat } from '@utils/mintedPats';

/** Every sandbox workspace slug starts with this; the sweep deletes only these. */
export const SANDBOX_SLUG_PREFIX = 'qa-sbx-';

/** A sandbox older than this is an orphan of a crashed run and is swept. */
const ORPHAN_AGE_MS = 2 * 60 * 60 * 1000;

export interface Sandbox {
  workspaceId: string
  projectId: string
  environmentId: string
}

export class SandboxSteps extends TestContext {
  constructor(private readonly api: ApiFixture) {
    super();
  }

  /**
   * Open a sandbox: a fresh workspace, one project and one run environment.
   *
   * @param label - short kebab label naming the suite (at most 20 chars, e.g. `cov-kpi`)
   */
  async open(label: string): Promise<Sandbox> {
    const suffix = faker.string.alphanumeric({ length: 8, casing: 'lower' });
    const workspace = await this.api.workspace.createWorkspace({
      name: `qa sandbox ${label} ${suffix}`,
      slug: `${SANDBOX_SLUG_PREFIX}${label.slice(0, 20)}-${suffix}`,
    });
    const project = await this.api.workspace.createProject(workspace.id, `qa sandbox ${label}`);
    const environmentId = await this.api.project.createEnvironment(project.id, 'staging');
    return { workspaceId: workspace.id, projectId: project.id, environmentId };
  }

  /**
   * Bind one new ATC (one step) to the given acceptance criteria.
   * Reuses the BK-149 create ATC as seeding: the coverage suites never assert on it.
   *
   * @returns the new ATC's id
   */
  async bindAtc(args: { title: string, moduleId: string, userStoryId: string, acceptanceCriterionIds: string[] }): Promise<string> {
    const [, created] = await this.api.atc.createAtc({
      title: args.title,
      module_id: args.moduleId,
      user_story_id: args.userStoryId,
      acceptance_criterion_ids: args.acceptanceCriterionIds,
      layer: 'API',
      steps: [{ position: 1, content: 'Exercise the bound acceptance criteria' }],
      assertions: [{ content: 'The bound acceptance criteria hold' }],
    });
    return created.atc.id;
  }

  /** Create a Test chaining one ATC, in the sandbox workspace. Returns the test id. */
  async createSingleAtcTest(sandbox: Sandbox, atcId: string): Promise<string> {
    return this.api.run.createTest({
      title: `qa sandbox test ${atcId.slice(0, 8)}`,
      atc_ids: [atcId],
      workspace_id: sandbox.workspaceId,
    });
  }

  /**
   * Close a sandbox: delete its workspace through a cookie session, verify it is
   * gone from the caller's list, then sweep sandbox orphans older than two hours.
   * Never touches a workspace whose slug lacks the sandbox prefix.
   */
  async close(sandbox: Sandbox): Promise<void> {
    const sessionPatId = await this.api.auth.openSession(this.config.testUser.email, this.config.testUser.password);
    recordMintedPat(sessionPatId);

    await this.api.workspace.deleteWorkspace(sandbox.workspaceId);

    const remaining = await this.api.workspace.listWorkspaces();
    expect(remaining.map(workspace => workspace.id)).not.toContain(sandbox.workspaceId);

    const cutoff = Date.now() - ORPHAN_AGE_MS;
    const orphans = remaining.filter(workspace =>
      workspace.slug.startsWith(SANDBOX_SLUG_PREFIX)
      && workspace.role === 'owner'
      && Date.parse(workspace.created_at) < cutoff);
    for (const orphan of orphans) {
      await this.api.workspace.deleteWorkspace(orphan.id);
    }
  }
}
