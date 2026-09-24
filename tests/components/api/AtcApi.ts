/**
 * KATA Architecture - Layer 3: ATC API Component
 *
 * API component for the Bunkai TMS "ATC" (Atomic Test Component) domain.
 *
 * ATC API surface (NOTE: there is NO GET-list and NO GET-by-id endpoint):
 *   - POST  /atcs          → create (transactional)   201 { atc }
 *   - PATCH /atcs/{id}      → full-replace edit        200 { atc, version, affected_test_count }
 *                             (optimistic lock via the custom X-If-Match header)
 *   - GET   /atcs/search    → project-scoped search    200 { items }
 *
 * ATCs follow flow-based design: each ATC is an ACTION + VERIFICATION.
 * Types come from the @schemas/atc.types facade.
 *
 * Endpoints are relative to config.apiUrl (which already ends in /api/v1).
 */

import type { APIResponse } from '@playwright/test';
import type {
  Atc,
  AtcCreateRequest,
  AtcCreateResponse,
  AtcSearchParams,
  AtcSearchResponse,
  AtcUpdateRequest,
  AtcUpdateResponse,
} from '@schemas/atc.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { atc } from '@utils/decorators';

// Re-export types for consumers that import from AtcApi
export type {
  AtcCreateRequest,
  AtcCreateResponse,
  AtcSearchParams,
  AtcSearchResponse,
  AtcUpdateRequest,
  AtcUpdateResponse,
} from '@schemas/atc.types';

// ============================================
// ATC API Component
// ============================================

export class AtcApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // ATCs - Complete Test Cases (ACTION + VERIFICATION)
  // ============================================

  /**
   * ATC: Create an ATC with valid payload - expects success (201)
   *
   * Transactional create across atcs + steps + assertions + AC links.
   * Verifies the new ATC starts at version 1, carries every sent step (in
   * position order) and assertion, and gets a `<module-slug>/atc-<8 hex>` slug.
   *
   * @param body - Full create payload (atc + steps + assertions + AC links)
   * @returns Tuple with response, parsed body, and sent payload
   */
  @atc('BK-149')
  async createAtc(
    body: AtcCreateRequest,
  ): Promise<[APIResponse, AtcCreateResponse, AtcCreateRequest]> {
    const [response, parsed, sentPayload] = await this.apiPOST<AtcCreateResponse, AtcCreateRequest>(
      '/atcs',
      body,
    );
    const sentAssertions = body.assertions ?? [];

    // Fixed assertions - validates the ATC was created with its children
    expect(response.status()).toBe(201);
    expect(parsed.atc.id).toBeTruthy();
    expect(parsed.atc.version).toBe(1);
    expect(parsed.atc.slug).toMatch(/^[a-z0-9-]+\/atc-[a-z0-9]{8}$/);
    expect(parsed.atc.steps.map(step => [step.position, step.content])).toEqual(
      body.steps.map(step => [step.position, step.content]),
    );
    expect(parsed.atc.assertions.map(assertion => assertion.content)).toEqual(
      sentAssertions.map(assertion => assertion.content),
    );

    return [response, parsed, sentPayload];
  }

  /**
   * ATC: Full-replace edit of an ATC under X-If-Match - expects success (200)
   *
   * Sends the optimistic-lock token in the custom `X-If-Match` header (never
   * the legacy `If-Match`, which the Vercel edge rewrites to 412: BK-96), then
   * verifies the version is bumped by one and the steps/assertions were
   * cascade-replaced by exactly the ones sent (omitted assertions are cleared).
   *
   * @param current - The ATC as last read (id + version used as the lock token)
   * @param body - Update payload (full replace)
   * @returns Tuple with response, parsed body, and sent payload
   */
  @atc('BK-156')
  async updateAtc(
    current: Pick<Atc, 'id' | 'version'>,
    body: AtcUpdateRequest,
  ): Promise<[APIResponse, AtcUpdateResponse, AtcUpdateRequest]> {
    const [response, parsed, sentPayload] = await this.apiPATCH<AtcUpdateResponse, AtcUpdateRequest>(
      `/atcs/${current.id}`,
      body,
      { headers: { 'X-If-Match': String(current.version) } },
    );
    const sentAssertions = body.assertions ?? [];

    // Fixed assertions - validates the edit was applied as a full replace
    expect(response.status()).toBe(200);
    expect(response.headers()['x-request-id']).toBeTruthy();
    expect(parsed.version).toBe(current.version + 1);
    expect(parsed.atc.version).toBe(current.version + 1);
    expect(parsed.atc.steps.map(step => [step.position, step.content])).toEqual(
      body.steps.map(step => [step.position, step.content]),
    );
    expect(parsed.atc.assertions.map(assertion => assertion.content)).toEqual(
      sentAssertions.map(assertion => assertion.content),
    );

    return [response, parsed, sentPayload];
  }

  /**
   * ATC: Search ATCs in a project - expects success (200)
   *
   * Project-scoped full-text search over ATC title + tags. Zero matches
   * return an empty `items` array (never 404).
   *
   * @param params - Search query params (query + project_id required)
   * @returns Tuple with response and parsed body ({ items })
   */
  @atc('BK-1090')
  async searchAtcs(params: AtcSearchParams): Promise<[APIResponse, AtcSearchResponse]> {
    // apiGET params expects Record<string, string> — serialize known fields
    const queryParams: Record<string, string> = {
      query: params.query,
      project_id: params.project_id,
    };
    if (params.module_id !== undefined) {
      queryParams.module_id = params.module_id;
    }
    if (params.layer !== undefined) {
      queryParams.layer = params.layer;
    }
    if (params.limit !== undefined) {
      queryParams.limit = String(params.limit);
    }

    const [response, body] = await this.apiGET<AtcSearchResponse>('/atcs/search', {
      params: queryParams,
    });

    // Fixed assertions - validates a successful search response
    expect(response.status()).toBe(200);
    expect(Array.isArray(body.items)).toBe(true);

    return [response, body];
  }
}
