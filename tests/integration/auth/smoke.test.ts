/**
 * KATA Architecture - Auth API Smoke (Integration)
 *
 * CRITICAL auth-gateway flow over the API: password sign-in mints a Bearer PAT
 * that authenticates GET /me, and a wrong password is rejected with no usable
 * session. If this fails, every Bearer-authenticated integration flow is
 * blocked — hence @critical.
 *
 * Orchestration only: the fixed assertions (status codes, PAT present, /me
 * verification) live inside the AuthApi ATCs.
 */

import { config, test } from '@TestFixture';

test.describe('BK auth API gateway', { tag: ['@critical'] }, () => {
  // Each sign-in mints a PAT on the shared staging account and nothing else
  // revokes it. Revoke the one this test minted (session-only route, so it uses
  // the cookie signIn left on the request context, never the PAT).
  let mintedPatId: string | undefined;

  test.afterEach(async ({ api }) => {
    if (mintedPatId) {
      const tokenId = mintedPatId;
      mintedPatId = undefined;
      await api.auth.revokeToken(tokenId);
    }
  });

  test('BK-311: should sign in and authenticate GET /me with the minted PAT', async ({ api }) => {
    const [, body] = await api.auth.signIn(config.testUser.email, config.testUser.password);
    mintedPatId = body.pat.id;
  });

  test('BK-312: should reject a wrong password and leave GET /me unauthenticated', async ({ api }) => {
    await api.auth.signInWithInvalidCredentials(config.testUser.email, 'wrong-Password-123');
  });
});
