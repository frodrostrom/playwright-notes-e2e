import { expect, Page } from '@playwright/test';

export class PageAssertions {
  constructor(private readonly page: Page) {}

  // Reuse the same data-testid selectors the page objects use.
  private get logoutButton() { return this.page.locator('[data-testid="logout"]'); }
  private get loginSubmit()  { return this.page.locator('[data-testid="login-submit"]'); }
  private get noteCards()    { return this.page.locator('[data-testid="note-card"]'); }
  private get emptyState()   { return this.page.locator('[data-testid="no-notes-message"]'); }
  private get alertMessage() { return this.page.locator('[data-testid="alert-message"]'); }

  // ── Auth state ────────────────────────────────────────────────────────────

  async toBeLoggedIn(): Promise<void> {
    await expect(this.logoutButton, 'expected logout button to be visible (logged in)').toBeVisible();
    await expect(this.loginSubmit, 'expected login button to be hidden (logged in)').toBeHidden();
  }

  async toBeLoggedOut(): Promise<void> {
    await expect(this.loginSubmit, 'expected login button to be visible (logged out)').toBeVisible();
    await expect(this.logoutButton, 'expected logout button to be hidden (logged out)').toBeHidden();
  }

  // ── Note list state ───────────────────────────────────────────────────────

  async toShowNotes(count: number): Promise<void> {
    await expect(
      this.noteCards,
      `expected exactly ${count} note card(s)`,
    ).toHaveCount(count);
  }

  async toShowAtLeastOneNote(): Promise<void> {
    await expect(
      this.noteCards.first(),
      'expected at least one note card to be visible',
    ).toBeVisible();
  }

  async toShowEmptyState(): Promise<void> {
    await expect(
      this.emptyState,
      'expected empty-state message to be visible',
    ).toBeVisible();
  }

  // ── Error / alert ─────────────────────────────────────────────────────────

  async toShowError(text: string): Promise<void> {
    await expect(
      this.alertMessage,
      `expected error toast to contain "${text}"`,
    ).toContainText(text);
  }
}

export function expectPage(page: Page): PageAssertions {
  return new PageAssertions(page);
}
