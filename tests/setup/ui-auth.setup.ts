/**
 * KATA Architecture - UI Auth Setup
 *
 * Authenticates via the Bunkai email-first login page and saves the browser
 * session (storageState) for E2E tests.
 *
 * NOTE: Bunkai's normal login does NOT hit a separate /tokens endpoint — the
 * PAT arrives inside the /auth/signin response. For UI E2E tests we only need
 * the browser session cookie (sb-<ref>-auth-token), so we save storageState
 * and gate on the post-login redirect to /projects. Integration tests get a
 * Bearer PAT from api-auth.setup.ts instead.
 *
 * Dependencies: global-setup
 * Dependents: e2e
 */

import { existsSync, statSync } from 'node:fs';
import { test as setup } from '@TestFixture';
import { config } from '@variables';

const storageStateFile = config.auth.storageStatePath;

/**
 * UI Authentication Setup
 *
 * 1. Navigates to the login page (via LoginPage.goto())
 * 2. Runs the email-first login flow (LoginPage.loginAs())
 * 3. Waits for the redirect to /projects
 * 4. Saves storageState (cookies) for UI tests
 */
setup('UI Setup: authenticate via UI', async ({ ui, page }) => {
  console.log('[UI Setup] Starting UI authentication...');
  console.log('[UI Setup] Target: /login');

  // Navigate to login page (outside of ATC)
  await ui.login.goto();

  // Run the email-first login flow (asserts redirect away from /login)
  await ui.login.loginAs(config.testUser.email, config.testUser.password);
  console.log('[UI Setup] UI login successful');

  // Confirm we landed on the authenticated app shell
  await page.waitForURL(/\/projects/, { timeout: 15000 });
  console.log(`[UI Setup] Current URL: ${page.url()}`);

  // Save storage state (cookies + localStorage) for UI tests
  await page.context().storageState({ path: storageStateFile });
  console.log(`[UI Setup] Storage state saved to ${storageStateFile}`);

  // Verify the storageState file was written and is non-empty
  if (!existsSync(storageStateFile) || statSync(storageStateFile).size === 0) {
    throw new Error(`Storage state file is missing or empty: ${storageStateFile}`);
  }

  console.log('[UI Setup] Authentication successful');
});
