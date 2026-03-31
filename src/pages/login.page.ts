import { expect, Page } from '@playwright/test';
import { BASE_URL, API_ROUTES } from '@data/constants';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly emailInput = this.page.locator('[data-testid="login-email"]');
  readonly passwordInput = this.page.locator('[data-testid="login-password"]');
  readonly submitButton = this.page.locator('[data-testid="login-submit"]');
  readonly alertMessage = this.page.locator('[data-testid="alert-message"]');

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.page.goto(`${BASE_URL}/login`);
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.waitForVisible(this.submitButton);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Fills credentials and submits the form, waiting for the /users/login
   * API response before resolving.
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    await this.waitForApiResponse(API_ROUTES.users.login, () =>
      this.submitButton.click(),
    );
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectErrorVisible(text: string): Promise<void> {
    await this.waitForVisible(this.alertMessage);
    await expect(this.alertMessage).toContainText(text);
  }
}
