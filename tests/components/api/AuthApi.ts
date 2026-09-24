/**
 * KATA Architecture - Layer 3: Auth API Component
 *
 * API component for Bunkai TMS authentication.
 * Handles password sign-in (which also mints a Bearer PAT) and the
 * read-only `me` lookup used for session verification.
 *
 * Bunkai auth model: Supabase password + email-OTP. `POST /auth/signin`
 * returns the Supabase session AND a freshly-minted PAT
 * (`bk_pat_<prefix>.<secret>`) in one response. The PAT is the canonical
 * Bearer credential for headless API calls.
 *
 * ATCs follow flow-based design: each ATC is an ACTION + VERIFICATION,
 * not a simple GET. Read-only operations are helpers (no @atc).
 *
 * Endpoints (relative to config.apiUrl, which already ends in /api/v1):
 * - POST /auth/signin - Authenticate; returns { user, session, pat }
 * - GET  /me          - Get current user info (requires auth)
 *
 * NOTE: a successful signin also sets the Supabase session cookie
 * (`sb-<ref>-auth-token`) on the request context, so a `/me` call on the SAME
 * context would pass on the cookie alone. The ATCs verify `/me` from a fresh,
 * cookie-less context instead, so the check proves the credential under test.
 */

import type { APIResponse } from '@playwright/test';
import type { SigninRequest, SigninResponse, UserInfoResponse } from '@schemas/auth.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { expect, request } from '@playwright/test';
import { atc, step } from '@utils/decorators';

// Re-export types for consumers that import from AuthApi
export type { SigninRequest, SigninResponse } from '@schemas/auth.types';

// ============================================
// Auth API Component
// ============================================

export class AuthApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Read-only operations (no @atc)
  // ============================================

  /**
   * Helper: Get current authenticated user info.
   *
   * Read-only GET — used as a verification step inside ATCs
   * or for test-level assertions. Not an ATC because it's
   * just a data retrieval, not a complete action flow.
   *
   * @returns Tuple with response and user info
   */
  @step
  async getCurrentUser(): Promise<[APIResponse, UserInfoResponse]> {
    const [response, body] = await this.apiGET<UserInfoResponse>(this.config.auth.meEndpoint);
    return [response, body];
  }

  /**
   * Private helper: GET /me from a FRESH request context (no cookies, no
   * stored auth state). Sends only the given Bearer token, or none at all.
   */
  private async getMeInIsolation(token?: string): Promise<[APIResponse, UserInfoResponse]> {
    const isolated = await request.newContext({ ignoreHTTPSErrors: true });
    try {
      const headers: Record<string, string> = token
        ? { ...this.requestHeaders, Authorization: `Bearer ${token}` }
        : { ...this.requestHeaders };
      const response = await isolated.get(this.apiEndpoint(this.config.auth.meEndpoint), { headers });
      const body = await this.getResponseJsonObject<UserInfoResponse>(response);
      return [response, body];
    }
    finally {
      await isolated.dispose();
    }
  }

  // ============================================
  // ATCs - Complete Test Cases (ACTION + VERIFICATION)
  // ============================================

  /**
   * ATC: Sign in with valid credentials - expects success (200)
   *
   * Complete flow:
   * 1. POST credentials to /auth/signin (ACTION)
   * 2. Validate the session + minted PAT are present (VERIFICATION)
   * 3. GET /me with ONLY the minted PAT (fresh context) returns 200 for the same user
   *
   * The PAT (bk_pat_...) is automatically set as the Bearer token for
   * subsequent API requests.
   *
   * @param email - Account email
   * @param password - Account password
   * @returns Tuple with response, parsed body, and sent payload
   */
  @atc('BK-311')
  async signIn(
    email: string,
    password: string,
  ): Promise<[APIResponse, SigninResponse, SigninRequest]> {
    const payload: SigninRequest = { email, password };

    // ACTION: POST sign-in credentials
    const [response, body, sentPayload] = await this.apiPOST<SigninResponse, SigninRequest>(
      this.config.auth.loginEndpoint,
      payload,
    );

    // Fixed assertions - validates successful authentication
    expect(response.status()).toBe(200);
    expect(body.user).toBeDefined();
    expect(body.session?.access_token).toBeDefined();
    expect(body.pat?.token).toBeDefined();

    // VERIFICATION: the minted PAT alone authenticates GET /me
    const [meResponse, meBody] = await this.getMeInIsolation(body.pat.token);
    expect(meResponse.status()).toBe(200);
    expect(meBody.user?.id).toBe(body.user.id);

    // Store the PAT for subsequent Bearer-authenticated requests
    this.setAuthToken(body.pat.token);

    return [response, body, sentPayload];
  }

  /**
   * ATC: Sign in with invalid credentials - expects error (401)
   *
   * Complete flow:
   * 1. POST invalid credentials to /auth/signin (ACTION)
   * 2. Validate the request was rejected and no PAT was issued (VERIFICATION)
   * 3. GET /me without any credential (fresh context) returns 401
   *
   * @param email - Account email
   * @param password - Wrong password
   * @returns Tuple with error response, parsed body, and sent payload
   */
  @atc('BK-312')
  async signInWithInvalidCredentials(
    email: string,
    password: string,
  ): Promise<[APIResponse, Record<string, unknown>, SigninRequest]> {
    const payload: SigninRequest = { email, password };

    // ACTION: POST invalid credentials
    const [response, body, sentPayload] = await this.apiPOST<Record<string, unknown>, SigninRequest>(
      this.config.auth.loginEndpoint,
      payload,
    );

    // Fixed assertions - validates rejection (no session/PAT issued)
    expect(response.status()).toBe(401);
    expect(response.ok()).toBe(false);
    expect(body.pat).toBeUndefined();

    // VERIFICATION: no usable session exists — GET /me without credential is rejected
    const [meResponse] = await this.getMeInIsolation();
    expect(meResponse.status()).toBe(401);

    return [response, body, sentPayload];
  }
}
