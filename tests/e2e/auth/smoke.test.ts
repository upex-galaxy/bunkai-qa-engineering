/**
 * KATA Architecture - Auth Gateway Smoke (E2E)
 *
 * CRITICAL auth-gateway flow: the Bunkai email-first login.
 *
 * Logs in the owner test user via env credentials (resolved by config) and
 * asserts the session leaves /login and lands on /projects. If this fails,
 * every authenticated E2E flow is blocked — hence @critical.
 *
 * Starts from a clean (unauthenticated) state so it exercises a REAL login
 * rather than reusing the shared storageState.
 */

import { config, expect, test } from '@TestFixture';
import { trackSigninPats } from '@utils/mintedPats';

// Force a fresh, unauthenticated session so this is a genuine login test.
// NOTE: `undefined` falls back to the project's storageState — an EMPTY state
// object is what actually clears cookies/origins for a real login.
// Also `trace: 'off'`: the real-login test fills the REAL password into the form,
// and a retained trace would store the fill value unredacted (CI publishes the
// report dirs). `use({ trace })` is file-level only: Playwright refuses it in a describe.
test.use({ storageState: { cookies: [], origins: [] }, trace: 'off' });

test.describe('BK auth gateway', { tag: ['@critical'] }, () => {
  test('owner logs in and lands on /projects', async ({ ui, page }) => {
    // The real login mints a PAT: record it so the global teardown revokes it.
    trackSigninPats(page);

    await ui.login.goto();

    await ui.login.loginAs(config.testUser.email, config.testUser.password);

    // The authenticated app shell is /projects; never /login
    await expect(page).toHaveURL(/\/projects/);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe('BK login rejection', () => {
  test('BK-314: should show an error and stay on /login when the password is wrong', async ({ ui }) => {
    await ui.login.goto();

    await ui.login.loginWithInvalidCredentials(config.testUser.email, 'wrong-Password-123');
  });
});
