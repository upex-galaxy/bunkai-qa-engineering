/**
 * Unit test (bun test, no network): the Idempotency-Key header ApiBase.apiPOST sends.
 *
 * The create endpoints of workspaces, projects, user-stories, atcs and bugs refuse a
 * create without the header (BK-667), so the base must send one per logical create.
 */

import type { RequestOptions } from '@api/ApiBase';
import type { APIRequestContext, APIResponse } from '@playwright/test';

import { ApiBase, IDEMPOTENCY_KEY_HEADER } from '@api/ApiBase';
import { describe, expect, test } from 'bun:test';

interface PostOptions { headers?: Record<string, string> }

class ProbeApi extends ApiBase {
  async create(options: RequestOptions = {}) {
    return this.apiPOST('/things', { name: 'x' }, options);
  }
}

function fakeRequest(sent: PostOptions[]): APIRequestContext {
  const response = {
    status: () => 201,
    ok: () => true,
    url: () => 'https://example.test/api/v1/things',
    json: async () => ({}),
  } as unknown as APIResponse;
  return {
    post: async (_url: string, options: PostOptions) => {
      sent.push(options);
      return response;
    },
  } as unknown as APIRequestContext;
}

function newProbe(sent: PostOptions[]): ProbeApi {
  return new ProbeApi({ request: fakeRequest(sent) });
}

describe('ApiBase.apiPOST Idempotency-Key', () => {
  test('sends a fresh UUID on every create', async () => {
    const sent: PostOptions[] = [];
    const api = newProbe(sent);

    await api.create();
    await api.create();

    const keys = sent.map(options => options.headers?.[IDEMPOTENCY_KEY_HEADER]);
    expect(keys[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(keys[1]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[0]).not.toBe(keys[1]);
  });

  test('replays the key the caller names, byte for byte', async () => {
    const sent: PostOptions[] = [];
    const api = newProbe(sent);

    await api.create({ idempotencyKey: 'replay-me-1' });
    await api.create({ idempotencyKey: 'replay-me-1' });

    expect(sent.map(options => options.headers?.[IDEMPOTENCY_KEY_HEADER])).toEqual(['replay-me-1', 'replay-me-1']);
  });

  test('sends no key when the caller passes null', async () => {
    const sent: PostOptions[] = [];

    await newProbe(sent).create({ idempotencyKey: null });

    expect(sent[0].headers).not.toHaveProperty(IDEMPOTENCY_KEY_HEADER);
  });

  test('an explicit header wins over the option and the generated key', async () => {
    const sent: PostOptions[] = [];

    await newProbe(sent).create({ idempotencyKey: 'from-option', headers: { [IDEMPOTENCY_KEY_HEADER]: 'from-header' } });

    expect(sent[0].headers?.[IDEMPOTENCY_KEY_HEADER]).toBe('from-header');
  });
});
