/**
 * KATA Architecture - Coverage KPIs never round to 100% or 0% (Integration)
 *
 * Regression for BK-1082 (fix PR #250, `clampedPercent`), Story BK-46: a
 * coverage tile reads 100% only when n = d, 0% only when n = 0, otherwise a
 * whole percent in [1, 99]; no tile (null) when the project has no criteria.
 * Absorbs BK-1185 (the executed tile at 1 of 201).
 *
 * One throwaway sandbox workspace holding one seeded project, walked through
 * the Examples rows of the BK-1070 Gherkin as successive states instead of
 * re-seeding 201 criteria per row:
 *
 *   empty → 200 ACs, A bound to 199 and passed  → +1 AC, B bound to the 200th, A re-run (pending)
 *         → C bound to the 201st → C passed → A passed → B passed
 *
 * A new run of an ATC resets it to pending, which is how executed falls back to
 * 0 between states. Expected tile values are literals from the Gherkin, never
 * recomputed here. The workspace rollup is memoized up to 60s per server
 * instance, so the ATC re-reads it until its counts match the seed (the walk
 * takes a few minutes for that reason).
 */

import type { CoverageKpiExpectation } from '@api/CoverageApi';
import type { Sandbox } from '@steps/SandboxSteps';

import { SandboxSteps } from '@steps/SandboxSteps';
import { test } from '@TestFixture';

test.describe('BK-1082: Coverage KPIs never round to 100% or 0%', { tag: ['@regression'] }, () => {
  test('BK-1070: should not round a coverage KPI to 100% or 0% while its numerator differs from the total or from zero', async ({ api }) => {
    test.setTimeout(720_000);
    const sandboxSteps = new SandboxSteps(api);
    let sandbox: Sandbox | undefined;

    try {
      const opened = await sandboxSteps.open('cov-kpi');
      sandbox = opened;
      const { projectId, environmentId } = opened;
      const readKpis = async (expected: CoverageKpiExpectation): Promise<void> => {
        await api.coverage.readCoverageKpis({ workspaceId: opened.workspaceId, projectId }, expected);
      };

      await test.step('empty state: no criteria, no tile', async () => {
        await readKpis({ total: 0, bound: 0, executed: 0, acTile: null, executedTile: null, gap: 0 });
      });

      const moduleId = await api.project.createModule(projectId, 'Coverage KPI rounding');
      const userStoryId = await api.project.createUserStory(moduleId, 'Coverage KPI rounding story');
      const criteria = await api.project.createAcceptanceCriteria(userStoryId, 200);
      const atcA = await sandboxSteps.bindAtc({ title: 'ATC A (199 criteria)', moduleId, userStoryId, acceptanceCriterionIds: criteria.slice(0, 199) });
      const testA = await sandboxSteps.createSingleAtcTest(opened, atcA);
      await api.run.closeRunAs(await api.run.startRun(testA, environmentId), 'passed');

      await test.step('total 200, bound 199, executed 199 → 99% / 99%', async () => {
        await readKpis({ total: 200, bound: 199, executed: 199, acTile: 99, executedTile: 99, gap: 1 });
      });

      const [criterion201] = await api.project.createAcceptanceCriteria(userStoryId, 1);
      const atcB = await sandboxSteps.bindAtc({ title: 'ATC B (criterion 200)', moduleId, userStoryId, acceptanceCriterionIds: [criteria[199]] });
      const rerunA = await api.run.startRun(testA, environmentId);

      await test.step('total 201, bound 200, executed 0 → 99% / 0%', async () => {
        await readKpis({ total: 201, bound: 200, executed: 0, acTile: 99, executedTile: 0, gap: 1 });
      });

      const atcC = await sandboxSteps.bindAtc({ title: 'ATC C (criterion 201)', moduleId, userStoryId, acceptanceCriterionIds: [criterion201] });

      await test.step('total 201, bound 201, executed 0 → 100% / 0%', async () => {
        await readKpis({ total: 201, bound: 201, executed: 0, acTile: 100, executedTile: 0, gap: 0 });
      });

      const testC = await sandboxSteps.createSingleAtcTest(opened, atcC);
      await api.run.closeRunAs(await api.run.startRun(testC, environmentId), 'passed');

      await test.step('total 201, bound 201, executed 1 → 100% / 1%', async () => {
        await readKpis({ total: 201, bound: 201, executed: 1, acTile: 100, executedTile: 1, gap: 0 });
      });

      await api.run.closeRunAs(rerunA, 'passed');

      await test.step('total 201, bound 201, executed 200 → 100% / 99%', async () => {
        await readKpis({ total: 201, bound: 201, executed: 200, acTile: 100, executedTile: 99, gap: 0 });
      });

      const testB = await sandboxSteps.createSingleAtcTest(opened, atcB);
      await api.run.closeRunAs(await api.run.startRun(testB, environmentId), 'passed');

      await test.step('total 201, bound 201, executed 201 → 100% / 100%', async () => {
        await readKpis({ total: 201, bound: 201, executed: 201, acTile: 100, executedTile: 100, gap: 0 });
      });
    }
    finally {
      // A cleanup failure must not replace the test's own error; the sweep retries later.
      if (sandbox) {
        await sandboxSteps.close(sandbox).catch((error: unknown) =>
          console.warn(`[SandboxSteps] sandbox ${sandbox?.workspaceId} not closed:`, error));
      }
    }
  });
});
