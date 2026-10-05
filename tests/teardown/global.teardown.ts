/**
 * KATA Architecture - Global Teardown (Project)
 *
 * Runs LAST after all test projects complete.
 * Generates reports, syncs to TMS, cleans up resources.
 *
 * Dependencies: e2e, integration (runs after all tests)
 * Dependents: None (this is the final step)
 */

import type { ApiFixture } from '@ApiFixture';

import { existsSync, readFileSync } from 'node:fs';

import { test as teardown } from '@TestFixture';
import { ATC_PARTIAL_PATH } from '@utils/decorators';
import { syncResults } from '@utils/jiraSync';
import { clearMintedPats, readMintedPats } from '@utils/mintedPats';
import { config } from '@variables';

/**
 * Global Teardown: generate reports and sync TMS
 *
 * Generates ATC execution report and syncs results to TMS if enabled.
 */
teardown('Global Teardown: generate reports and sync TMS', async ({ api }) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('KATA Architecture - Global Teardown');
  console.log('='.repeat(60));

  // Read NDJSON directly (KataReporter.onEnd() hasn't fired yet)
  if (existsSync(ATC_PARTIAL_PATH)) {
    try {
      const lines = readFileSync(ATC_PARTIAL_PATH, 'utf-8').split('\n').filter(Boolean);
      const grouped: Record<string, { hasFail: boolean, allSkip: boolean, count: number }> = {};

      for (const line of lines) {
        const entry = JSON.parse(line) as { testId: string, status: string };
        if (!grouped[entry.testId]) {
          grouped[entry.testId] = { hasFail: false, allSkip: true, count: 0 };
        }
        grouped[entry.testId].count++;
        if (entry.status === 'FAIL') {
          grouped[entry.testId].hasFail = true;
        }
        if (entry.status !== 'SKIP') {
          grouped[entry.testId].allSkip = false;
        }
      }

      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let executions = 0;

      for (const g of Object.values(grouped)) {
        executions += g.count;
        if (g.hasFail) {
          failed++;
        }
        else if (g.allSkip) {
          skipped++;
        }
        else {
          passed++;
        }
      }

      const total = Object.keys(grouped).length;

      console.log('\nATC Coverage:');
      console.log(`   ${total} unique ATC tracked (${executions} total executions)`);
      console.log(`   ✅ Passed: ${passed} | ❌ Failed: ${failed} | ⏭️ Skipped: ${skipped}`);
    }
    catch (error) {
      console.warn('[WARN] Could not read ATC partial results:', error);
    }
  }
  else {
    console.log('\n[INFO] No ATC results found (no @atc decorators executed)');
  }

  // Sync results to TMS
  const { AUTO_SYNC } = process.env;

  if (AUTO_SYNC === 'true') {
    console.log('\n[SYNC] Syncing results to TMS...');
    try {
      const result = await syncResults();
      if (result) {
        console.log(`   Provider: ${result.provider}`);
        console.log(`   Status: ${result.success ? 'Success' : 'Failed'}`);
        console.log(`   Message: ${result.message}`);
      }
    }
    catch (error) {
      console.error('[ERROR] TMS sync failed:', error);
    }
  }
  else {
    console.log('\n[SKIP] TMS sync disabled (set AUTO_SYNC=true to enable)');
  }

  await revokeMintedPats(api);

  console.log(`\n${'='.repeat(60)}`);
  console.log('[OK] Global teardown complete');
  console.log(`${'='.repeat(60)}\n`);
});

/**
 * Revoke the PATs this run's setups and real-login specs minted.
 *
 * Revoking is session-only (a Bearer PAT gets 403), so it opens one cookie
 * session, which mints a PAT of its own: that one is revoked last. Only ids
 * from the ledger are touched, never a token that already existed. A failed
 * revoke warns and does not fail the run (teardown must not mask test results);
 * its id stays in the ledger for the next run.
 */
async function revokeMintedPats(api: ApiFixture): Promise<void> {
  const minted = readMintedPats();
  if (minted.length === 0) {
    return;
  }

  console.log(`\n[CLEANUP] Revoking ${minted.length} PAT(s) minted by this run...`);
  let sessionPatId: string | undefined;
  const failed: string[] = [];
  try {
    sessionPatId = await api.auth.openSession(config.testUser.email, config.testUser.password);
    for (const id of [...minted, sessionPatId]) {
      try {
        await api.auth.revokeToken(id);
      }
      catch {
        failed.push(id);
      }
    }
  }
  catch (error) {
    console.warn('[WARN] Could not open a session to revoke minted PATs:', error instanceof Error ? error.message : error);
    return;
  }

  console.log(`[CLEANUP] Revoked ${minted.length + 1 - failed.length} of ${minted.length + 1} (incl. the cleanup session's own)`);
  if (failed.length === 0) {
    clearMintedPats();
  }
  else {
    console.warn(`[WARN] ${failed.length} revoke(s) failed; ids kept in the ledger for the next run`);
  }
}
