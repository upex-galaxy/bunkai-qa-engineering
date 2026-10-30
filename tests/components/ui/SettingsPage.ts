/**
 * KATA Architecture - Layer 3: Settings Page Component
 *
 * UI component for Bunkai Settings > Account and the Settings auth guard.
 *
 * Pages: /settings, /settings/account
 *
 * Elements (components/settings/IdentityCard.tsx and WorkspacesList.tsx, target repo):
 *   - Identity card   → [data-testid="identity-card"], identity-email, identity-role
 *   - Workspace list  → [data-testid="workspaces-list"] (region), workspaces-rows
 *   - One row         → [data-testid="workspace-row-<slug>"], workspace-active-<slug>
 *
 * Deviation from the plan, on purpose: the workspace list is read with the
 * browser session (`page.request`, cookie) instead of `WorkspaceApi`, because the
 * Bearer of the hybrid fixture can be revoked by an earlier integration run and
 * the role switch below is cookie-only anyway.
 *
 * Role switching: POST /api/v1/me/active-workspace sets the httpOnly cookie
 * `bk_active_ws`. The route is cookie-only, so it goes through `page.request`
 * (shares the browser context cookies), never through the Bearer API client.
 */

import type { WorkspaceListItem } from '@schemas/workspace.types';
import type { TestContextOptions } from '@TestContext';

import { expect } from '@playwright/test';
import { UiBase } from '@ui/UiBase';
import { atc, step } from '@utils/decorators';

/** UI label of each membership role (lib/account/role-label.ts in the target). */
const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

/** Label the UI shows for a role; fails loudly on a null or unknown role instead of matching ''. */
function roleLabel(role: string | null): string {
  const label = ROLE_LABELS[role ?? ''];
  if (!label) {
    throw new Error(`No UI label known for role "${role}"`);
  }
  return label;
}

export interface IdentityArgs {
  /** Email of the signed-in user (the only identity label the page renders). */
  email: string
  /** One workspace per role to check; the active workspace is switched to each in turn. */
  workspaces: WorkspaceListItem[]
}

export interface WorkspaceListArgs {
  /** Workspaces the user belongs to, as the API reports them. */
  workspaces: WorkspaceListItem[]
  /** Slug of the workspace that is active when the page opens. */
  activeSlug: string
}

// ============================================
// Settings Page Component
// ============================================

export class SettingsPage extends UiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers (no @atc)
  // ============================================

  /**
   * Open Settings > Account and wait until both async sections have settled.
   * The workspace list streams in through Suspense, so a hidden copy of its
   * region can coexist with the visible one for a few milliseconds: wait for a
   * visible region first, then for the hidden copy to go away.
   */
  @step
  async gotoAccount(): Promise<void> {
    await this.page.goto(this.buildUrl('/settings/account'));
    await expect(this.page.getByTestId('identity-card')).toBeVisible();
    const list = this.page.getByTestId('workspaces-list');
    await expect(list.filter({ visible: true })).toBeVisible();
    await expect(list).toHaveCount(1);
    await expect(this.page.getByTestId('workspaces-rows')).toBeVisible();
  }

  /** Helper: list the caller's workspaces with the browser session (cookie), role included. */
  @step
  async listMyWorkspaces(): Promise<WorkspaceListItem[]> {
    const response = await this.page.request.get(this.buildUrl('/api/v1/workspaces'));
    expect(response.status()).toBe(200);
    const body = await response.json() as { workspaces: WorkspaceListItem[] };
    return body.workspaces;
  }

  /** Helper: make a workspace the active one for this browser session. */
  @step
  async selectWorkspace(workspaceId: string): Promise<void> {
    const response = await this.page.request.post(this.buildUrl('/api/v1/me/active-workspace'), {
      data: { workspace_id: workspaceId },
    });
    expect(response.status(), `switching the active workspace to ${workspaceId}`).toBe(200);
  }

  // ============================================
  // ATCs - Complete Test Cases
  // ============================================

  /**
   * ATC: The identity card shows the email and the role of the active workspace
   *
   * For each workspace given, switches the active workspace to it, opens
   * Settings > Account and checks the card. The active workspace lives in a
   * cookie of this browser context, so there is no server state to restore.
   *
   * @param args - email and the workspaces (one per role) to check
   */
  @atc('BK-790')
  async viewAccountIdentity(args: IdentityArgs): Promise<void> {
    for (const workspace of args.workspaces) {
      await this.selectWorkspace(workspace.id);
      await this.gotoAccount();

      const card = this.page.getByTestId('identity-card');
      // Email is the primary label
      await expect(card.getByTestId('identity-email'), `email on the ${workspace.role} workspace`).toHaveText(args.email);
      // Role of the user in the active workspace, with the label of that role
      const role = card.getByTestId('identity-role');
      await expect(role, `role label on the ${workspace.role} workspace`).toContainText(roleLabel(workspace.role));
      await expect(role).toContainText(workspace.slug);
      // Email-only identity: the card holds no input, so no (empty) display-name field exists
      await expect(card.getByRole('textbox'), `no input in the card on the ${workspace.role} workspace`).toHaveCount(0);
    }
  }

  /**
   * ATC: The workspace list shows every workspace with name, role, active indicator and member count
   *
   * IMPORTANT: opens the page itself. The caller makes `activeSlug` active first
   * (selectWorkspace), so the expected active row is known by construction and
   * is not read back from the page under test.
   *
   * The member count is checked for format only ("N member(s)"): the API list
   * carries no count to compare with.
   *
   * @param args - the expected workspaces and the slug that must carry the active indicator
   */
  @atc('BK-791')
  async viewWorkspaceList(args: WorkspaceListArgs): Promise<void> {
    await this.gotoAccount();

    const region = this.page.getByTestId('workspaces-list');
    await expect(region).toBeVisible();
    await expect(region.getByRole('heading', { name: 'Workspaces' })).toBeVisible();

    const rows = region.getByTestId('workspaces-rows').locator('[data-testid^="workspace-row-"]');
    await expect(rows).toHaveCount(args.workspaces.length);

    for (const workspace of args.workspaces) {
      const row = region.getByTestId(`workspace-row-${workspace.slug}`);
      await expect(row).toContainText(workspace.name);
      await expect(row).toContainText(roleLabel(workspace.role));
      await expect(row).toContainText(/\d+ members?/);

      // Only the active workspace carries the indicator
      const indicator = row.getByTestId(`workspace-active-${workspace.slug}`);
      if (workspace.slug === args.activeSlug) {
        await expect(indicator).toHaveText('active');
      }
      else {
        await expect(indicator).toHaveText('');
      }
    }
  }

  /**
   * ATC: An anonymous visit to a protected Settings route is redirected to login, keeping the return path
   *
   * Run it with an empty storage state (no session).
   *
   * @param routes - protected routes to request, one after the other
   */
  @atc('BK-793')
  async openSettingsWithoutSession(routes: string[]): Promise<void> {
    for (const route of routes) {
      await this.page.goto(this.buildUrl(route));
      await expect(this.page, `redirect for ${route}`).toHaveURL(/\/login/);

      const landed = new URL(this.page.url());
      expect(landed.pathname, `login path for ${route}`).toBe('/login');
      expect(landed.searchParams.get('next'), `next parameter for ${route}`).toBe(route);
    }
  }
}
