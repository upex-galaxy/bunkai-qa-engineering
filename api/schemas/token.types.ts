/**
 * KATA Framework - Type Facade: Personal Access Token Domain
 *
 * Bunkai PAT management contract pulled from the generated OpenAPI types
 * (`api/openapi-types.ts`, refreshed via `bun run api:sync`).
 *
 * Token API surface:
 *   - POST   /api/v1/tokens       → issue a PAT (cookie session only; a PAT gets 403)   201
 *   - GET    /api/v1/tokens       → list the caller's PATs (Bearer or cookie)           200 { tokens }
 *   - DELETE /api/v1/tokens/{id}  → revoke (cookie session only)                        204
 *
 * The create request/response types stay in `@schemas/auth.types` (CreateTokenRequest,
 * CreateTokenResponse), where sign-in already declared them.
 *
 * NOTE: this facade is the ONLY place allowed to import `@openapi` for this domain.
 */

import type { components, paths } from '@openapi';

// ============================================================================
// Schema Types (from components.schemas)
// ============================================================================

/** One PAT as listed (never carries the secret). */
export type TokenSummary = components['schemas']['TokenSummary'];

/** Shared error envelope: `{ error: { code, message, details?, request_id? } }`. */
export type ErrorEnvelope = components['schemas']['ErrorEnvelope'];

// ============================================================================
// Endpoint Types - GET /api/v1/tokens (list)
// ============================================================================

type ListTokensPath = paths['/api/v1/tokens']['get'];

/** List success (200): { tokens }. */
export type TokenListResponse = ListTokensPath['responses']['200']['content']['application/json'];
