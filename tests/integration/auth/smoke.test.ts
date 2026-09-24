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
  test('BK-311: should sign in and authenticate GET /me with the minted PAT', async ({ api }) => {
    await api.auth.signIn(config.testUser.email, config.testUser.password);
  });

  test('BK-312: should reject a wrong password and leave GET /me unauthenticated', async ({ api }) => {
    await api.auth.signInWithInvalidCredentials(config.testUser.email, 'wrong-Password-123');
  });
});
