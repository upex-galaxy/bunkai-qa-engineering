/**
 * KATA Architecture - Zero-scope token guard (E2E)
 *
 * Regression for BK-1079 (Story BK-88 AC2): the issue-token form must block a
 * submission with no scope, say why inline, and link the message to the
 * Scopes fieldset for assistive technology (absorbs the a11y check of BK-1230).
 *
 * Runs on the member session of `ui-auth.setup.ts`. The read-back of the token
 * list goes through the page's cookie session: the Bearer from api-state.json
 * is cleared first because that PAT is revoked by the teardown of any earlier
 * integration run. Nothing is created when the test passes; if a regression
 * ever issues the token, the `finally` block revokes it by id.
 */

import { faker } from '@faker-js/faker';
import { expect, test } from '@TestFixture';

test.describe('BK-1079: Zero-scope token guard (UI)', { tag: ['@regression'] }, () => {
  test('BK-1042: should block submission, show the inline scope error and create no token when no scope is selected in the issue-token form', async ({ test: kata }) => {
    const name = `qa-tc18-${faker.string.alphanumeric({ length: 10, casing: 'lower' })}`;
    kata.clearAuthToken();

    try {
      await kata.ui.tokens.goto();
      await kata.ui.tokens.submitTokenWithoutScopes(name);
      expect(await kata.api.token.findActiveTokenIds(name)).toEqual([]);
    }
    finally {
      for (const leakedId of await kata.api.token.findActiveTokenIds(name)) {
        await kata.api.auth.revokeToken(leakedId);
      }
    }
  });
});
