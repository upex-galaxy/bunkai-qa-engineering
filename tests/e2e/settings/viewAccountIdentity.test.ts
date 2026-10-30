/**
 * KATA Architecture - Settings > Account identity card (E2E)
 *
 * BK-87 AC 1.1: the identity card shows the email and the role the user holds
 * in the active workspace. One row per role the staging account can reach:
 * owner, admin, viewer. `member` is a recorded gap (no workspace with that role
 * exists, and the role-specific accounts do not authenticate).
 *
 * The role is switched by changing the active workspace of the working account.
 * That choice is a cookie of this test's browser context, so nothing persists.
 */

import { expect, test } from '@TestFixture';
import { config } from '@variables';

const ROLES_UNDER_TEST = ['owner', 'admin', 'viewer'] as const;

test.describe('BK-87: Validate the Settings account identity card', { tag: ['@regression'] }, () => {
  test('BK-790: should show the email and the role of the active workspace for every role', async ({ test: kata }) => {
    const workspaces = await kata.ui.settings.listMyWorkspaces();
    const onePerRole = ROLES_UNDER_TEST.map((role) => {
      const found = workspaces.find(workspace => workspace.role === role);
      expect(found, `the staging account holds a workspace where it is ${role}`).toBeDefined();
      return found!;
    });

    await kata.ui.settings.viewAccountIdentity({ email: config.testUser.email, workspaces: onePerRole });
  });
});
