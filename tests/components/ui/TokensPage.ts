/**
 * KATA Architecture - Layer 3: Tokens Page Component
 *
 * UI component for Bunkai Settings > Tokens (personal access tokens).
 *
 * Page: /settings/tokens
 *
 * Issue-token dialog (components/settings/IssueTokenModal.tsx, confirmed on staging):
 *   - Open       → [data-testid="issue-token-open"] ("New token")
 *   - Dialog     → [data-testid="issue-token-modal"] (role dialog "New personal access token")
 *   - Name       → [data-testid="issue-token-name"]
 *   - Scopes     → fieldset "Scopes — at least one", one checkbox per scope
 *                  [data-testid="issue-token-scope-<scope>"], all unchecked on open
 *   - Error      → #issue-token-scopes-error, shown once a name is typed and no scope is checked
 *   - Create     → [data-testid="issue-token-create"], disabled while the form is invalid
 */

import type { Request } from '@playwright/test';
import type { TestContextOptions } from '@TestContext';

import { expect } from '@playwright/test';
import { UiBase } from '@ui/UiBase';
import { atc, step } from '@utils/decorators';

/** Exact copy of the inline scope error (BK-88 AC2, fix BK-1079). */
const SCOPES_REQUIRED_MESSAGE = 'At least one scope is required.';

/** Id the Scopes fieldset and the Create button point at with aria-describedby. */
const SCOPES_ERROR_ID = 'issue-token-scopes-error';

// ============================================
// Tokens Page Component
// ============================================

export class TokensPage extends UiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Navigation (Public)
  // ============================================

  /**
   * Navigate to Settings > Tokens and wait for the "New token" button.
   * Call this BEFORE using the token ATCs.
   */
  @step
  async goto(): Promise<void> {
    await this.page.goto(this.buildUrl('/settings/tokens'));
    // The token list streams in through Suspense (measured on staging): its
    // button first sits alone inside React's hidden segment (e.g.
    // `<div hidden id="S:0">`), then for 8-120 ms a visible copy and that
    // hidden one coexist. A count of 1 alone can match the hidden copy, so wait
    // for a visible button first, then for the hidden copy to go away.
    const open = this.page.getByTestId('issue-token-open');
    await expect(open.filter({ visible: true })).toBeVisible();
    await expect(open).toHaveCount(1);
    await expect(open).toBeVisible();
  }

  // ============================================
  // ATCs - Complete Test Cases
  // ============================================

  /**
   * ATC: Submit the issue-token form with no scope selected - expects it blocked
   *
   * IMPORTANT: Call goto() before this ATC.
   * Opens the dialog, types a name with every scope unchecked, then makes the
   * two submit attempts of the TC: Enter in the name field and a forced click
   * on Create. Today neither can submit (the dialog has no <form>, and React
   * drops clicks on a button whose `disabled` prop is true), so the zero-POST
   * check guards a future change such as wrapping the dialog in a form; the
   * server-side rule is BK-1231's. Verifies the inline error copy, the disabled
   * Create button, the aria-invalid + aria-describedby links to the error, and
   * that no POST /tokens left the browser. Checking a scope must clear the
   * error and enable Create; the dialog is then cancelled so nothing is created.
   *
   * @param name - Unique token name for this run (e.g. `qa-tc18-<run id>`)
   */
  @atc('BK-1042')
  async submitTokenWithoutScopes(name: string): Promise<void> {
    const tokenPosts: string[] = [];
    const recordTokenPost = (request: Request): void => {
      if (request.method() === 'POST' && /\/api\/v1\/tokens(?:\?|$)/.test(request.url())) {
        tokenPosts.push(request.url());
      }
    };
    this.page.on('request', recordTokenPost);

    try {
      await this.page.getByTestId('issue-token-open').click();
      const dialog = this.page.getByTestId('issue-token-modal');
      await expect(dialog).toBeVisible();

      const scopes = dialog.getByRole('checkbox');
      await expect(scopes.first()).toBeVisible();
      for (const scope of await scopes.all()) {
        await expect(scope).not.toBeChecked();
      }

      const nameInput = dialog.getByTestId('issue-token-name');
      const create = dialog.getByTestId('issue-token-create');
      await nameInput.fill(name);
      await nameInput.press('Enter');
      await create.click({ force: true });

      // Fixed assertions - the form is blocked and says why
      const fieldset = dialog.getByRole('group', { name: /^Scopes/ });
      const error = dialog.locator(`#${SCOPES_ERROR_ID}`);
      await expect(error).toHaveText(SCOPES_REQUIRED_MESSAGE);
      await expect(create).toBeDisabled();
      await expect(fieldset).toHaveAttribute('aria-invalid', 'true');
      await expect(fieldset).toHaveAttribute('aria-describedby', SCOPES_ERROR_ID);
      await expect(create).toHaveAttribute('aria-describedby', SCOPES_ERROR_ID);
      await expect(dialog).toBeVisible();

      // Checking a scope clears the error and enables Create
      await scopes.first().check();
      await expect(error).toBeHidden();
      await expect(fieldset).not.toHaveAttribute('aria-invalid', 'true');
      await expect(create).toBeEnabled();

      // Leave without creating: Cancel closes the dialog
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();
    }
    finally {
      this.page.off('request', recordTokenPost);
    }

    expect(tokenPosts, 'no POST /api/v1/tokens may leave the browser').toEqual([]);
  }
}
