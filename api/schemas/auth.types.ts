/**
 * KATA Framework - Type Facade: Auth Domain
 *
 * Real Bunkai auth contract pulled from the generated OpenAPI types
 * (`api/openapi-types.ts`, refreshed via `bun run api:sync`).
 *
 * Bunkai auth model: Supabase password + email-OTP. `signin` and `confirm`
 * both return the Supabase session AND a freshly-minted Bearer PAT
 * (`bk_pat_<prefix>.<secret>`) in one response. PATs are minted via
 * `POST /api/v1/tokens` under a cookie session (a PAT cannot mint a PAT).
 *
 * Consumed by: tests/components/api/AuthApi.ts
 *
 * NOTE: this facade is the ONLY place allowed to import `@openapi`.
 * Components import the named types below from `@schemas/auth.types`.
 */

import type { components, paths } from '@openapi';

// ============================================================================
// Endpoint Types - POST /api/v1/auth/signin (password sign-in + auto-minted PAT)
// ============================================================================

type SigninPath = paths['/api/v1/auth/signin']['post'];

/** Sign-in request body (email + password, optional PAT shaping). */
export type SigninRequest = SigninPath['requestBody']['content']['application/json'];

/** Sign-in success (200): { user, session, pat, warning }. */
export type SigninResponse = SigninPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - POST /api/v1/auth/confirm (verify email OTP → session + PAT)
// ============================================================================

type ConfirmPath = paths['/api/v1/auth/confirm']['post'];

/** Confirm (email OTP) request body. */
export type ConfirmRequest = ConfirmPath['requestBody']['content']['application/json'];

/** Confirm success (200): same shape as signin. */
export type ConfirmResponse = ConfirmPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - POST /api/v1/auth/check-email (email-first routing probe)
// ============================================================================

type CheckEmailPath = paths['/api/v1/auth/check-email']['post'];

/** Check-email request body. */
export type CheckEmailRequest = CheckEmailPath['requestBody']['content']['application/json'];

/** Check-email success (200): email registration/confirmation status. */
export type CheckEmailResponse = CheckEmailPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - POST /api/v1/tokens (mint a PAT; cookie-session only)
// ============================================================================

type CreateTokenPath = paths['/api/v1/tokens']['post'];

/** Create-token request body (name, scopes, optional workspace + TTL). */
export type CreateTokenRequest = CreateTokenPath['requestBody']['content']['application/json'];

/** Create-token success (201): raw `token` shown exactly once. */
export type CreateTokenResponse = CreateTokenPath['responses']['201']['content']['application/json'];

// ============================================================================
// Schema Types (from components.schemas)
// ============================================================================

/**
 * Minted Personal Access Token block returned inline by signin/confirm.
 * No standalone `Pat` schema exists in the spec — it lives inside SigninResponse.
 */
export type Pat = components['schemas']['SigninResponse']['pat'];

// ============================================================================
// Legacy Custom Types (RETAINED — consumed by AuthApi.ts + ui-auth.setup.ts)
// ============================================================================
//
// These pre-date the OpenAPI sync and are still imported by un-migrated
// components/setup. Kept to preserve the build; prefer the OpenAPI-backed
// types above for new code.

/**
 * Login request payload.
 * @deprecated Prefer `SigninRequest` (OpenAPI-backed).
 */
export interface LoginPayload {
  email: string
  password: string
}

/**
 * Token response from authentication endpoints.
 * @deprecated Prefer `SigninResponse` (OpenAPI-backed; carries `pat`, `session`).
 */
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

/**
 * Error response for failed authentication.
 * @deprecated Bunkai errors use the `ErrorEnvelope` schema; kept for legacy consumers.
 */
export interface AuthErrorResponse {
  error: string
  statusCode?: number
  identityServerError?: {
    error: string
    error_description: string
  }
  hint?: string
}

/**
 * User info response from the `me` endpoint.
 * @deprecated Prefer the OpenAPI `MeResponse` schema.
 */
export interface UserInfoResponse {
  user: {
    id: string
    email: string
    name: string
    createdAt: string
    updatedAt: string
  }
}
