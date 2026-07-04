/**
 * KATA Architecture - API Auth Setup (Project)
 *
 * Authenticates via the Bunkai API directly using AuthApi.signIn() ATC.
 * Persists the minted PAT (bk_pat_...) to api-state.json for Integration tests.
 *
 * Dependencies: global-setup
 * Dependents: integration
 */

import type { ApiState } from '@data/types';

import { writeFileSync } from 'node:fs';
import { test as setup } from '@TestFixture';
import { attachRequestResponseToAllure } from '@utils/allure';
import { config } from '@variables';

const apiStateFile = config.auth.apiStatePath;

/**
 * API Authentication Setup
 *
 * 1. Uses AuthApi.signIn() ATC (POST /auth/signin)
 * 2. Saves the minted PAT to api-state.json for integration tests
 */
setup('API Setup: authenticate via API', async ({ api }) => {
  console.log('[API Setup] Starting API authentication...');
  console.log(`[API Setup] Target: ${config.apiUrl}${config.auth.loginEndpoint}`);

  // Use AuthApi ATC — returns the Supabase session + a freshly-minted PAT
  const [response, body] = await api.auth.signIn(
    config.testUser.email,
    config.testUser.password,
  );

  // Attach to Allure for debugging (mask the raw PAT)
  await attachRequestResponseToAllure({
    url: response.url(),
    method: 'POST',
    responseBody: { ...body, pat: { ...body.pat, token: '***' } },
    requestBody: { email: config.testUser.email, password: '***' },
  });

  console.log('[API Setup] Authentication successful');
  console.log(`[API Setup] PAT scopes: ${body.pat.scopes.join(', ')}`);

  // Compute a local-cache hint from the PAT expiry, if present.
  const expiresIn = body.pat.expires_at
    ? Math.max(0, Math.floor((Date.parse(body.pat.expires_at) - Date.now()) / 1000))
    : config.auth.tokenLifetimeSeconds;

  // Save the PAT to file for use by integration tests
  const apiState: ApiState = {
    token: body.pat.token,
    tokenType: 'Bearer',
    expiresIn,
    refreshToken: body.session?.refresh_token ?? null,
    source: 'api-login',
    createdAt: new Date().toISOString(),
  };

  writeFileSync(apiStateFile, JSON.stringify(apiState, null, 2));
  console.log(`[API Setup] Token saved to ${apiStateFile}`);
});
