import { expect, Locator, Page } from '@playwright/test';
import { BASE_URL } from '@data/constants';
import { BasePage } from './base.page';

export class NotesPage extends BasePage {
  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly notesList = this.page.locator('[data-testid="notes-list"]');
  readonly addNoteButton = this.page.locator('[data-testid="add-new-note"]');
  readonly searchInput = this.page.locator('[data-testid="search-input"]');
  readonly searchButton = this.page.locator('[data-testid="search-btn"]');
  readonly emptyStateMessage = this.page.locator('[data-testid="no-notes-message"]');
  readonly noteCards = this.page.locator('[data-testid="note-card"]');
  readonly progressInfo = this.page.locator('[data-testid="progress-info"]');
  readonly logoutButton = this.page.locator('[data-testid="logout"]');

  // Category filter buttons
  readonly categoryAll = this.page.locator('[data-testid="category-all"]');
  readonly categoryHome = this.page.locator('[data-testid="category-home"]');
  readonly categoryWork = this.page.locator('[data-testid="category-work"]');
  readonly categoryPersonal = this.page.locator('[data-testid="category-personal"]');

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(): Promise<void> {
    await this.page.goto(BASE_URL);
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    // Wait for the notes list container, then wait for the GET /notes response
    // so the React list is fully populated before we interact with it.
    await this.waitForVisible(this.notesList);
    await this.page
      .waitForResponse(
        (res) => res.url().includes('/notes/api/notes') && res.request().method() === 'GET',
        { timeout: 10_000 },
      )
      .catch(() => {
        // If no GET /notes request fires (e.g. cached), proceed anyway.
      });
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getNoteCount(): Promise<number> {
    return this.noteCards.count();
  }

  async getNotesTitles(): Promise<string[]> {
    await this.noteCards.first().waitFor({ state: 'attached', timeout: 5_000 }).catch(() => {});
    const titleLocators = this.page.locator('[data-testid="note-card-title"]');
    return titleLocators.allInnerTexts();
  }

  /** Returns a note card locator by its exact title text. */
  getNoteCardByTitle(title: string): Locator {
    return this.noteCards.filter({
      has: this.page.locator('[data-testid="note-card-title"]', { hasText: title }),
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async clickAddNote(): Promise<void> {
    // Use dispatchEvent to fire the React click handler directly on the DOM node,
    // bypassing any ad overlays on the outer practice.expandtesting.com page
    // that intercept mouse coordinates and trigger unwanted navigations.
    await this.addNoteButton.dispatchEvent('click');
    await this.waitForVisible(
      this.page.locator('[data-testid="note-title"]'),
      15_000,
    );
  }

  async searchNotes(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    // Brief wait for the list to re-render after search
    await this.page.waitForTimeout(300);
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectNotesLoaded(): Promise<void> {
    await this.waitForVisible(this.notesList);
    await expect(this.notesList).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await this.waitForVisible(this.emptyStateMessage);
    await expect(this.emptyStateMessage).toBeVisible();
  }
}
