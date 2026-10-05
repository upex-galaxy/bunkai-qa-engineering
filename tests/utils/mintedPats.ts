/**
 * KATA Architecture - Minted PAT ledger (agnostic utility)
 *
 * Every sign-in on Bunkai (API or the login form) mints a `cli-signin` PAT on
 * the shared test account, and nothing expires them. The setups and the
 * real-login spec record the id of each PAT THIS run minted here, and the
 * global teardown revokes exactly those: tokens that already existed are never
 * in the ledger, so they are never touched.
 *
 * The ledger is an append-only NDJSON file under `.auth/` (gitignored), so
 * parallel workers can write to it without coordinating. It holds ids only,
 * never a token secret.
 */

import type { Page } from '@playwright/test';

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '@variables';

/** Append one minted PAT id to the ledger. */
export function recordMintedPat(patId: string): void {
  const file = config.auth.mintedPatsPath;
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify({ id: patId, at: new Date().toISOString() })}\n`);
}

/** Unique PAT ids in the ledger (empty when there is none). */
export function readMintedPats(): string[] {
  const file = config.auth.mintedPatsPath;
  if (!existsSync(file)) {
    return [];
  }
  const ids = readFileSync(file, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return (JSON.parse(line) as { id?: string }).id ?? '';
      }
      catch {
        return '';
      }
    })
    .filter(Boolean);
  return [...new Set(ids)];
}

/** Drop the ledger once its tokens are revoked. */
export function clearMintedPats(): void {
  rmSync(config.auth.mintedPatsPath, { force: true });
}

/**
 * Record the PAT minted by every successful `POST /auth/signin` the page makes
 * (the login form). Attach BEFORE the form is submitted. Never throws: a
 * response whose body cannot be read is simply not recorded.
 */
export function trackSigninPats(page: Page): void {
  page.on('response', async (response) => {
    const request = response.request();
    if (request.method() !== 'POST' || !response.url().endsWith(config.auth.loginEndpoint) || !response.ok()) {
      return;
    }
    try {
      const body = await response.json() as { pat?: { id?: string } };
      if (body.pat?.id) {
        recordMintedPat(body.pat.id);
      }
    }
    catch {
      // Body not readable (navigation raced the response): nothing to record.
    }
  });
}
