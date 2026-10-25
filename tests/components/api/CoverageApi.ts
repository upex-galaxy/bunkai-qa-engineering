/**
 * KATA Architecture - Layer 3: Coverage API Component
 *
 * API component for the Bunkai coverage rollups (Story BK-46).
 *
 * Endpoints (relative to config.apiUrl, Bearer `atc:read` or cookie):
 *   - GET /projects/{id}/coverage    → counts only: kpis (bound / executed / total),
 *                                      one row per module, the uncovered ACs. Not memoized.
 *   - GET /workspaces/{id}/coverage  → the same rollup summed over the workspace, plus the
 *                                      clamped percentages (`clampedPercent`, fix PR #250) the
 *                                      Home card and the project Metrics tiles print.
 *                                      Memoized up to 60s per server instance: the ATC re-reads
 *                                      it until its counts match the seed.
 *
 * The project endpoint carries no percentage, so the tile values are read from
 * the workspace endpoint of a throwaway sandbox workspace holding exactly one
 * seeded project: there the workspace figure IS the project tile (both call
 * `lib/coverage/clamped-percent.ts`). The ATC proves the workspace read is fresh
 * by matching its counts against the project kpis before trusting a percentage.
 */

import type { APIResponse } from '@playwright/test';
import type { ModuleCoverage, ModuleCoverageStatus, ProjectCoverage } from '@schemas/project.types';
import type { WorkspaceCoverage } from '@schemas/workspace.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { atc, step } from '@utils/decorators';

// ============================================
// Types
// ============================================

/** One Examples row of BK-1070: the seeded counts and the tile values they must print. */
export interface CoverageKpiExpectation {
  total: number
  bound: number
  executed: number
  /** "AC coverage" tile, whole percent; null = no tile (empty state) */
  acTile: number | null
  /** "Executed coverage" tile, whole percent; null = no tile (empty state) */
  executedTile: number | null
  /** Acceptance criteria listed as having no coverage */
  gap: number
}

/** The per-acceptance-criterion state BK-1071 reads off a one-AC module. */
export type AcceptanceCriterionState = 'executed' | 'not_run';

export interface ModuleCoverageExpectation {
  projectId: string
  moduleId: string
  acState: AcceptanceCriterionState
  moduleStatus: ModuleCoverageStatus
}

// ============================================
// Coverage API Component
// ============================================

export class CoverageApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Read-only (no @atc)
  // ============================================

  /** Helper: GET the project coverage rollup (counts only). */
  @step
  async getProjectCoverage(projectId: string): Promise<[APIResponse, ProjectCoverage]> {
    const [response, body] = await this.apiGET<ProjectCoverage>(`/projects/${projectId}/coverage`);
    expect(response.status()).toBe(200);
    return [response, body];
  }

  /** Helper: GET the workspace coverage rollup (counts + clamped percentages, memoized). */
  @step
  async getWorkspaceCoverage(workspaceId: string): Promise<[APIResponse, WorkspaceCoverage]> {
    const [response, body] = await this.apiGET<WorkspaceCoverage>(`/workspaces/${workspaceId}/coverage`);
    expect(response.status()).toBe(200);
    return [response, body];
  }

  // ============================================
  // ATCs - Complete Test Cases (ACTION + VERIFICATION)
  // ============================================

  /**
   * ATC: Read the coverage KPIs of a seeded project - expects the clamped tiles
   *
   * Reads the project rollup (authoritative counts) and the sandbox workspace
   * rollup (the tile percentages). Verifies the kpis echo bound / executed /
   * total and the no-coverage list holds `gap` criteria. The workspace rollup is
   * memoized per server instance for up to 60s, so it is re-read until its counts
   * match the seed (90s ceiling, never a sleep); the tiles are then asserted on
   * that same fresh response. Each tile must read the literal expected value: 100
   * only when n = d, 0 only when n = 0, otherwise 1-99; null (no tile) when the
   * project has no criteria.
   *
   * @param target - the sandbox workspace and its single seeded project
   * @param target.workspaceId - sandbox workspace (holds exactly one seeded project)
   * @param target.projectId - the seeded project
   * @param expected - one Examples row of BK-1070
   */
  @atc('BK-1070')
  async readCoverageKpis(
    target: { workspaceId: string, projectId: string },
    expected: CoverageKpiExpectation,
  ): Promise<[ProjectCoverage, WorkspaceCoverage]> {
    const [, project] = await this.getProjectCoverage(target.projectId);

    // Fixed assertions - the counts the tiles are computed from
    expect(project.kpis).toMatchObject({
      ac_total: expected.total,
      ac_bound: expected.bound,
      ac_executed: expected.executed,
    });
    expect(project.no_coverage).toHaveLength(expected.gap);

    // The workspace read is fresh and covers exactly this project's criteria
    let workspace = {} as WorkspaceCoverage;
    await expect(async () => {
      [, workspace] = await this.getWorkspaceCoverage(target.workspaceId);
      expect(workspace).toMatchObject({
        ac_total: expected.total,
        ac_bound: expected.bound,
        ac_executed: expected.executed,
        ac_uncovered: expected.gap,
      });
    }).toPass({ timeout: 90_000, intervals: [2_000, 5_000, 10_000] });

    // The tiles: clamped percentages, null for the empty state
    expect(workspace.ac_coverage_percent).toBe(expected.acTile);
    expect(workspace.executed_coverage_percent).toBe(expected.executedTile);

    return [project, workspace];
  }

  /**
   * ATC: Read the coverage state of a one-AC module - expects the latest-run rule
   *
   * The module holds one acceptance criterion bound to one ATC, so the module
   * row IS that criterion's state. Verifies the criterion counts as executed
   * (and the module fully_covered) only when the expected state says so, and
   * as not_run otherwise.
   *
   * @param expected - module to read and the state + status it must report
   */
  @atc('BK-1071')
  async readAcceptanceCriterionState(expected: ModuleCoverageExpectation): Promise<ModuleCoverage> {
    const [, project] = await this.getProjectCoverage(expected.projectId);
    const row = project.modules.find(module => module.module_id === expected.moduleId);

    // Fixed assertions - one bound criterion, in exactly one state bucket
    expect(row, `module ${expected.moduleId} is missing from the coverage rollup`).toBeDefined();
    expect(row).toMatchObject({
      ac_total: 1,
      ac_uncovered: 0,
      ac_executed: expected.acState === 'executed' ? 1 : 0,
      ac_not_run: expected.acState === 'not_run' ? 1 : 0,
      status: expected.moduleStatus,
    });
    expect(project.no_coverage.map(ac => ac.module_id)).not.toContain(expected.moduleId);

    return row as ModuleCoverage;
  }
}
