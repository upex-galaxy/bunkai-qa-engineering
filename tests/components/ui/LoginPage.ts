/**
 * KATA Architecture - Layer 3: Login Page Component
 *
 * UI component for Bunkai TMS authentication via the email-first login page.
 * Handles login flows for E2E tests.
 *
 * Page: /login (Bunkai TMS — single email-first page, no separate signup page)
 *
 * Flow (existing account):
 * 1. Fill email   → [data-testid="login-email"]
 * 2. Continue     → [data-testid="login-continue"]  (calls /auth/check-email)
 * 3. Fill password→ [data-testid="login-password"]
 * 4. Sign in      → [data-testid="login-signin"]     (POST /auth/signin)
 * 5. SUCCESS      → URL leaves /login and lands on /projects
 */

import type { TestContextOptions } from '@TestContext';

import { expect } from '@playwright/test';
import { UiBase } from '@ui/UiBase';
import { atc, step } from '@utils/decorators';

// ============================================
// Types - Login data structures
// ============================================

/**
 * Login credentials for UI authentication.
 */
export interface LoginCredentials {
  email: string
  password: string
}

// ============================================
// Login Page Component
// ============================================

export class LoginPage extends UiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers (Private)
  // ============================================

  /**
   * Run the email-first form: enter email, continue, then enter password.
   * Leaves the form ready to submit (does NOT click sign-in).
   */
  private async fillEmailFirstForm(email: string, password: string): Promise<void> {
    await this.page.getByTestId('login-email').fill(email);
    await this.page.getByTestId('login-continue').click();

    // Existing account → password step is revealed after check-email resolves
    const passwordInput = this.page.getByTestId('login-password');
    await expect(passwordInput).toBeVisible({ timeout: 15000 });
    await passwordInput.fill(password);
  }

  // ============================================
  // Navigation (Public)
  // ============================================

  /**
   * Navigate to the login page.
   * Call this BEFORE using login ATCs.
   */
  @step
  async goto(): Promise<void> {
    await this.page.goto(this.buildUrl('/login'));
  }

  // ============================================
  // ATCs - Complete Test Cases
  // ============================================

  /**
   * ATC: Log in with valid credentials - expects success
   *
   * IMPORTANT: Call goto() before this ATC.
   * Runs the 2-step email-first flow, submits, and verifies the session
   * leaves /login and lands on /projects.
   *
   * @param email - Account email
   * @param password - Account password
   */
  @atc('BK-101')
  async loginAs(email: string, password: string): Promise<void> {
    await this.fillEmailFirstForm(email, password);
    await this.page.getByTestId('login-signin').click();

    // Wait for authentication to complete and redirect to /projects
    await this.page.waitForURL(/\/projects/, { timeout: 15000 });
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  /**
   * ATC: Log in with invalid credentials - expects rejection
   *
   * IMPORTANT: Call goto() before this ATC. Use an EXISTING email with a
   * WRONG password so the email-first flow reveals the password step.
   * Submits and verifies the user stays on /login (no redirect).
   *
   * @param email - Existing account email
   * @param password - Wrong password
   */
  @atc('BK-102')
  async loginWithInvalidCredentials(email: string, password: string): Promise<void> {
    await this.fillEmailFirstForm(email, password);
    await this.page.getByTestId('login-signin').click();

    // Fixed assertion - failed sign-in keeps the user on the login page
    await expect(this.page).toHaveURL(/\/login/);
  }
}
