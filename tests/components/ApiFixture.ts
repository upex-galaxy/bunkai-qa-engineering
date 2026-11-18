import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { AtcApi } from '@api/AtcApi';
import { AuthApi } from '@api/AuthApi';
import { CoverageApi } from '@api/CoverageApi';
import { ProjectApi } from '@api/ProjectApi';
import { RunApi } from '@api/RunApi';
import { TokenApi } from '@api/TokenApi';
import { WorkspaceApi } from '@api/WorkspaceApi';

export class ApiFixture extends ApiBase {
  readonly auth: AuthApi;

  readonly atc: AtcApi;

  readonly token: TokenApi;

  readonly workspace: WorkspaceApi;

  readonly project: ProjectApi;

  readonly run: RunApi;

  readonly coverage: CoverageApi;

  constructor(options: TestContextOptions) {
    super(options);

    this.auth = new AuthApi(options);
    this.atc = new AtcApi(options);
    this.token = new TokenApi(options);
    this.workspace = new WorkspaceApi(options);
    this.project = new ProjectApi(options);
    this.run = new RunApi(options);
    this.coverage = new CoverageApi(options);
  }

  override setAuthToken(token: string) {
    super.setAuthToken(token);
    this.auth.setAuthToken(token);
    this.atc.setAuthToken(token);
    this.token.setAuthToken(token);
    this.workspace.setAuthToken(token);
    this.project.setAuthToken(token);
    this.run.setAuthToken(token);
    this.coverage.setAuthToken(token);
  }

  override clearAuthToken() {
    super.clearAuthToken();
    this.auth.clearAuthToken();
    this.atc.clearAuthToken();
    this.token.clearAuthToken();
    this.workspace.clearAuthToken();
    this.project.clearAuthToken();
    this.run.clearAuthToken();
    this.coverage.clearAuthToken();
  }
}
