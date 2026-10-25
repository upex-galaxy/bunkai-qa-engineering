/**
 * KATA Architecture - Zero-scope token guard (Integration)
 *
 * Regression for BK-1079 (Story BK-88 AC2): the server must never issue a
 * personal access token with no scope.
 *
 * Issuing is session-only (a Bearer PAT gets 403 before validation), so the
 * test opens a cookie session on its own request context first. That sign-in
 * mints a PAT of its own: it goes to the minted-PAT ledger and the global
 * teardown revokes it. Nothing else is created when the test passes; if a
 * regression ever issues the token, the `finally` block revokes it by id.
 */

import { faker } from '@faker-js/faker';
import { config, test } from '@TestFixture';
import { recordMintedPat } from '@utils/mintedPats';

test.describe('BK-1079: Zero-scope token guard (API)', { tag: ['@regression'] }, () => {
  test('BK-1231: should reject POST /api/v1/tokens with 422 and create no token when the scopes array is empty', async ({ api }) => {
    const name = `qa-tc33-${faker.string.alphanumeric({ length: 10, casing: 'lower' })}`;
    const sessionPatId = await api.auth.openSession(config.testUser.email, config.testUser.password);
    recordMintedPat(sessionPatId);

    try {
      await api.token.issueTokenWithoutScopes(name);
    }
    finally {
      // Safety net only: a cleanup failure must not replace the test's own error.
      try {
        for (const leakedId of await api.token.findActiveTokenIds(name)) {
          await api.auth.revokeToken(leakedId);
        }
      }
      catch (error) {
        console.warn(`[BK-1231] token cleanup failed for ${name}:`, error);
      }
    }
  });
});
