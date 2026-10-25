/**
 * KATA Architecture - Executed coverage follows the latest run (Integration)
 *
 * Regression for BK-1081 (fix PR #248, migration 0090), Story BK-46: an
 * acceptance criterion counts as executed coverage only when its ATC's most
 * recent run passed or failed; skipped, blocked and pending latest runs read
 * not_run, whatever an earlier run said.
 *
 * One throwaway sandbox workspace per run (SandboxSteps). Each Examples row of
 * the BK-1071 Gherkin gets its own module holding one acceptance criterion bound
 * to one ATC, so the module row of the rollup IS that criterion's state. Runs of
 * a row are created strictly one after the other (open bug BK-1220 breaks
 * latest-run ties randomly).
 */

import type { AcceptanceCriterionState } from '@api/CoverageApi';
import type { AtcRunOutcome } from '@api/RunApi';
import type { ModuleCoverageStatus } from '@schemas/project.types';
import type { Sandbox } from '@steps/SandboxSteps';

import { SandboxSteps } from '@steps/SandboxSteps';
import { test } from '@TestFixture';

interface ExecutedCoverageRow {
  earlierRun: Exclude<AtcRunOutcome, 'pending'> | null
  latestRun: AtcRunOutcome
  acState: AcceptanceCriterionState
  moduleStatus: ModuleCoverageStatus
}

/** The Examples tables of BK-1071, verbatim (earlier_run `none` = null). */
const ROWS: ExecutedCoverageRow[] = [
  // Latest run did not execute the ATC
  { earlierRun: null, latestRun: 'skipped', acState: 'not_run', moduleStatus: 'not_run' },
  { earlierRun: null, latestRun: 'blocked', acState: 'not_run', moduleStatus: 'not_run' },
  { earlierRun: null, latestRun: 'pending', acState: 'not_run', moduleStatus: 'not_run' },
  // Latest run executed the ATC
  { earlierRun: null, latestRun: 'passed', acState: 'executed', moduleStatus: 'fully_covered' },
  { earlierRun: null, latestRun: 'failed', acState: 'executed', moduleStatus: 'fully_covered' },
  // Point in time (the most recent run decides)
  { earlierRun: 'passed', latestRun: 'skipped', acState: 'not_run', moduleStatus: 'not_run' },
  { earlierRun: 'skipped', latestRun: 'passed', acState: 'executed', moduleStatus: 'fully_covered' },
];

test.describe('BK-1081: Executed coverage follows the latest run', { tag: ['@regression'] }, () => {
  test('BK-1071: should count an ATC as executed coverage only when its most recent run passed or failed', async ({ api }) => {
    test.setTimeout(180_000);
    const sandboxSteps = new SandboxSteps(api);
    let sandbox: Sandbox | undefined;

    try {
      const opened = await sandboxSteps.open('cov-exec');
      sandbox = opened;
      const { projectId, environmentId } = opened;

      for (const [index, row] of ROWS.entries()) {
        const label = `row ${index + 1}: ${row.earlierRun ?? 'none'} then ${row.latestRun}`;
        await test.step(label, async () => {
          const moduleId = await api.project.createModule(projectId, `Row ${index + 1} ${row.earlierRun ?? 'none'} ${row.latestRun}`);
          const userStoryId = await api.project.createUserStory(moduleId, `Story for ${label}`);
          const acceptanceCriterionIds = await api.project.createAcceptanceCriteria(userStoryId, 1);
          const atcId = await sandboxSteps.bindAtc({ title: `ATC for ${label}`, moduleId, userStoryId, acceptanceCriterionIds });
          const testId = await sandboxSteps.createSingleAtcTest(opened, atcId);

          if (row.earlierRun) {
            await api.run.closeRunAs(await api.run.startRun(testId, environmentId), row.earlierRun);
          }
          await api.run.closeRunAs(await api.run.startRun(testId, environmentId), row.latestRun);

          await api.coverage.readAcceptanceCriterionState({
            projectId,
            moduleId,
            acState: row.acState,
            moduleStatus: row.moduleStatus,
          });
        });
      }
    }
    finally {
      if (sandbox) {
        await sandboxSteps.close(sandbox);
      }
    }
  });
});
