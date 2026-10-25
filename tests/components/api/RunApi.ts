/**
 * KATA Architecture - Layer 3: Run API Component
 *
 * Helpers that create Tests (ATC chains) and drive manual Runs to a chosen
 * outcome, so the coverage suites can seed "most recent run" states. No ATCs:
 * the run lifecycle is a precondition here, never the outcome under test.
 *
 * Endpoints (relative to config.apiUrl, Bearer `atc:write` / `run:execute`):
 *   - POST /tests                           201 { test }   (Bearer must send workspace_id)
 *   - POST /runs                            201 { run }    (every ATC starts pending)
 *   - POST /runs/{id}/steps/{stepId}/mark   200 { run }    (passed | failed | blocked)
 *   - POST /runs/{id}/finish                200 { run }    (unmarked steps become skipped)
 *   - POST /runs/{id}/abort                 200 { run }    (unmarked steps become skipped)
 *
 * Runs of one Test must be created one after the other: the latest-run tie
 * order is random when two runs share a timestamp (open bug BK-1220).
 */

import type {
  Run,
  RunAbortRequest,
  RunFinishRequest,
  RunResponse,
  RunStartRequest,
  RunStepMarkRequest,
  TestCreateRequest,
  TestCreateResponse,
} from '@schemas/run.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { step } from '@utils/decorators';

/** The status an ATC ends a run with, as the coverage rollup reads it. */
export type AtcRunOutcome = 'passed' | 'failed' | 'blocked' | 'skipped' | 'pending';

// ============================================
// Run API Component
// ============================================

export class RunApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers (no @atc)
  // ============================================

  /** Helper: create a Test chaining the given ATCs. Returns the test id. */
  @step
  async createTest(body: TestCreateRequest): Promise<string> {
    const [response, parsed] = await this.apiPOST<TestCreateResponse, TestCreateRequest>('/tests', body);
    expect(response.status()).toBe(201);
    return parsed.test.id;
  }

  /** Helper: start a manual run of a Test; every ATC starts `pending`. */
  @step
  async startRun(testId: string, environmentId: string): Promise<Run> {
    const [response, parsed] = await this.apiPOST<RunResponse, RunStartRequest>('/runs', {
      test_id: testId,
      environment_id: environmentId,
    });
    expect(response.status()).toBe(201);
    return parsed.run;
  }

  /** Helper: mark one run step. */
  @step
  async markStep(run: Pick<Run, 'id'>, args: { stepId: string, status: RunStepMarkRequest['status'] }): Promise<Run> {
    const [response, parsed] = await this.apiPOST<RunResponse, RunStepMarkRequest>(
      `/runs/${run.id}/steps/${args.stepId}/mark`,
      { status: args.status },
    );
    expect(response.status()).toBe(200);
    return parsed.run;
  }

  /** Helper: finish a running run with a verdict. */
  @step
  async finishRun(run: Pick<Run, 'id'>, verdict: RunFinishRequest['verdict']): Promise<Run> {
    const [response, parsed] = await this.apiPOST<RunResponse, RunFinishRequest>(`/runs/${run.id}/finish`, { verdict });
    expect(response.status()).toBe(200);
    return parsed.run;
  }

  /** Helper: abort a running run. */
  @step
  async abortRun(run: Pick<Run, 'id'>, reason: RunAbortRequest['reason']): Promise<Run> {
    const [response, parsed] = await this.apiPOST<RunResponse, RunAbortRequest>(`/runs/${run.id}/abort`, { reason });
    expect(response.status()).toBe(200);
    return parsed.run;
  }

  /**
   * Helper: drive a running run so every ATC in it ends with `outcome`.
   *
   * passed / failed / blocked = mark every step, then finish (failed verdict for
   * blocked); skipped = abort (unmarked steps become skipped); pending = leave
   * the run open. Verifies the ATC statuses the run reports back.
   */
  @step
  async closeRunAs(run: Run, outcome: AtcRunOutcome): Promise<Run> {
    let closed = run;
    if (outcome === 'skipped') {
      closed = await this.abortRun(run, 'Seeded skipped outcome for a coverage regression');
    }
    else if (outcome !== 'pending') {
      for (const stepId of run.atcs.flatMap(runAtc => runAtc.steps.map(runStep => runStep.id))) {
        closed = await this.markStep(run, { stepId, status: outcome });
      }
      closed = await this.finishRun(run, outcome === 'passed' ? 'passed' : 'failed');
    }
    expect(closed.atcs.map(runAtc => runAtc.status)).toEqual(run.atcs.map(() => outcome));
    return closed;
  }
}
