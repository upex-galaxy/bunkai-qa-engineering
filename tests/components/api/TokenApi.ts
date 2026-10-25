/**
 * KATA Architecture - Layer 3: Token API Component
 *
 * API component for Bunkai Personal Access Token (PAT) management.
 *
 * Token API surface (relative to config.apiUrl, which already ends in /api/v1):
 *   - POST   /tokens       → issue a PAT        201 (cookie session ONLY)
 *   - GET    /tokens       → list my PATs       200 { tokens }
 *   - DELETE /tokens/{id}  → revoke             204 (cookie session ONLY)
 *
 * Issuing is session-only: a Bearer PAT is rejected with 403 "Personal access
 * tokens cannot issue tokens" BEFORE the body is validated (measured on staging
 * 2026-10-25). So the issue ATC sends NO Authorization header and relies on the
 * session cookie that `api.auth.openSession()` (or the e2e storage state) left
 * on this request context, the same pattern as `AuthApi.revokeToken`.
 */

import type { APIResponse } from '@playwright/test';
import type { CreateTokenRequest } from '@schemas/auth.types';
import type { ErrorEnvelope, TokenListResponse, TokenSummary } from '@schemas/token.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase, IDEMPOTENCY_KEY_HEADER } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { atc, step } from '@utils/decorators';

// ============================================
// Token API Component
// ============================================

export class TokenApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Read-only / cleanup (no @atc)
  // ============================================

  /**
   * Helper: list the caller's PATs (Bearer or cookie session).
   *
   * @returns Tuple with response and the token list
   */
  @step
  async listTokens(): Promise<[APIResponse, TokenSummary[]]> {
    const [response, body] = await this.apiGET<TokenListResponse>(this.config.auth.tokenEndpoint);
    expect(response.status()).toBe(200);
    return [response, body.tokens];
  }

  /**
   * Helper: ids of the caller's ACTIVE (not revoked) PATs carrying `name`.
   * Safety net for tests whose regression would mint a token by mistake.
   */
  @step
  async findActiveTokenIds(name: string): Promise<string[]> {
    const [, tokens] = await this.listTokens();
    return tokens.filter(token => token.name === name && !token.revoked_at).map(token => token.id);
  }

  // ============================================
  // ATCs - Complete Test Cases (ACTION + VERIFICATION)
  // ============================================

  /**
   * ATC: Issue a PAT with an empty scopes array - expects rejection (422)
   *
   * Requires a cookie session on this request context (issuing is session-only).
   * Sends `{ name, scopes: [] }` with an Idempotency-Key and no Bearer, then
   * verifies the server rejects it as `validation_failed` on the `scopes` path
   * (zod `too_small`, minimum 1) and that the caller's token list holds no
   * token with that name.
   *
   * @param name - Unique token name for this run (e.g. `qa-tc33-<run id>`)
   * @returns Tuple with response and the parsed error envelope
   */
  @atc('BK-1231')
  async issueTokenWithoutScopes(name: string): Promise<[APIResponse, ErrorEnvelope]> {
    const payload: CreateTokenRequest = { name, scopes: [] };
    const response = await this.request.post(this.apiEndpoint(this.config.auth.tokenEndpoint), {
      headers: { ...this.requestHeaders, [IDEMPOTENCY_KEY_HEADER]: crypto.randomUUID() },
      data: payload,
    });
    const body = await this.getResponseJsonObject<ErrorEnvelope>(response);

    // Fixed assertions - validation rejects the empty scopes array
    expect(response.status()).toBe(422);
    expect(body.error.code).toBe('validation_failed');
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['scopes'], code: 'too_small', minimum: 1 }),
      ]),
    );

    // VERIFICATION: no token was created under that name
    const [, tokens] = await this.listTokens();
    expect(tokens.map(token => token.name)).not.toContain(name);

    return [response, body];
  }
}
