/**
 * KATA Architecture - Settings > Account workspace list (E2E)
 *
 * BK-87 AC 1.2: the Workspaces section lists every workspace the user belongs
 * to with its name, role, member count and an active indicator on the active one.
 *
 * The expected rows come from the API list of the same account, never from
 * hardcoded slugs, and the active workspace is chosen by the test before the
 * page opens. The 12-workspace scroll scenario is a recorded follow-up (needs 9
 * extra workspaces on the shared account).
 */

import { expect, test } from '@TestFixture';

test.describe('BK-87: Validate the Settings workspace list', { tag: ['@regression'] }, () => {
  test('BK-791: should list each workspace with name, role, active indicator and member count', async ({ test: kata }) => {
    const workspaces = await kata.ui.settings.listMyWorkspaces();
    expect(workspaces.length, 'the staging account belongs to at least 3 workspaces').toBeGreaterThanOrEqual(3);

    const active = workspaces[0];
    await kata.ui.settings.selectWorkspace(active.id);

    await kata.ui.settings.viewWorkspaceList({ workspaces, activeSlug: active.slug });
  });
});
