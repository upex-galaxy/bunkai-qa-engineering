import type { TestContextOptions } from '@TestContext';

import { LoginPage } from '@ui/LoginPage';
import { SettingsPage } from '@ui/SettingsPage';
import { TokensPage } from '@ui/TokensPage';
import { UiBase } from '@ui/UiBase';

export class UiFixture extends UiBase {
  readonly login: LoginPage;

  readonly tokens: TokensPage;

  readonly settings: SettingsPage;

  constructor(options: TestContextOptions) {
    super(options);

    this.login = new LoginPage(options);
    this.tokens = new TokensPage(options);
    this.settings = new SettingsPage(options);
  }
}
