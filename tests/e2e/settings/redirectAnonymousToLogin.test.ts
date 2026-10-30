/**
 * KATA Architecture - Settings auth guard (E2E)
 *
 * BK-87 AC 1.4: an anonymous request to a protected Settings route lands on
 * /login with the return path in the `next` parameter.
 *
 * Starts with an EMPTY storage state: the `e2e` project injects the saved
 * session by default, which would defeat the test.
 */

import { test } from '@TestFixture';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('BK-87: Validate the Settings auth guard', { tag: ['@regression'] }, () => {
  test('BK-793: should redirect an anonymous request to login preserving the return path', async ({ ui }) => {
    await ui.settings.openSettingsWithoutSession(['/settings', '/settings/account']);
  });
});
