/**
 * KATA Architecture - Layer 3: ATC API Component
 *
 * API component for the Bunkai TMS "ATC" (Atomic Test Component) domain.
 *
 * ATC API surface (NOTE: there is NO GET-list and NO GET-by-id endpoint):
 *   - POST  /atcs          → create (transactional)   201 { atc }
 *   - PATCH /atcs/{id}      → full-replace edit        200 { atc, version, affected_test_count }
 *   - GET   /atcs/search    → project-scoped search    200 { items }
 *
 * ATCs follow flow-based design: each ATC is an ACTION + VERIFICATION.
 * Types come from the @schemas/atc.types facade.
 *
 * Endpoints are relative to config.apiUrl (which already ends in /api/v1).
 */

import type { APIResponse } from '@playwright/test';
import type {
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
   *
   * @param body - Full create payload (atc + steps + assertions + AC links)
   * @returns Tuple with response, parsed body, and sent payload
   */
  @atc('BK-201')
  async createAtc(
    body: AtcCreateRequest,
  ): Promise<[APIResponse, AtcCreateResponse, AtcCreateRequest]> {
    const [response, parsed, sentPayload] = await this.apiPOST<AtcCreateResponse, AtcCreateRequest>(
      '/atcs',
      body,
    );

    // Fixed assertions - validates the ATC was created
    expect(response.status()).toBe(201);
    expect(parsed.atc).toBeDefined();
    expect(parsed.atc.id).toBeDefined();

    return [response, parsed, sentPayload];
  }

  /**
   * ATC: Update an existing ATC - expects success (200)
   *
   * Full-replace edit of the ATC's steps/assertions.
   *
   * @param id - Target ATC id
   * @param body - Update payload (full replace)
   * @returns Tuple with response, parsed body, and sent payload
   */
  @atc('BK-202')
  async updateAtc(
    id: string,
    body: AtcUpdateRequest,
  ): Promise<[APIResponse, AtcUpdateResponse, AtcUpdateRequest]> {
    const [response, parsed, sentPayload] = await this.apiPATCH<AtcUpdateResponse, AtcUpdateRequest>(
      `/atcs/${id}`,
      body,
    );

    // Fixed assertions - validates the ATC was updated
    expect(response.status()).toBe(200);
    expect(parsed.atc).toBeDefined();

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
  @atc('BK-203')
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
