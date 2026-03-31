import { expect, Page } from '@playwright/test';
import { BASE_URL, API_ROUTES, NoteCategory } from '@data/constants';
import { BasePage } from './base.page';

export interface NoteFormData {
  title: string;
  description: string;
  category: NoteCategory;
  completed?: boolean;
}

export class NoteDetailPage extends BasePage {
  // ── View-mode selectors ───────────────────────────────────────────────────

  readonly noteCard = this.page.locator('[data-testid="note-card"]');
  readonly noteTitleDisplay = this.page.locator('[data-testid="note-card-title"]');
  readonly noteDescriptionDisplay = this.page.locator('[data-testid="note-card-description"]');
  readonly editButton = this.page.locator('[data-testid="note-edit"]');
  readonly deleteButton = this.page.locator('[data-testid="note-delete"]');
  readonly deleteConfirmButton = this.page.locator('[data-testid="note-delete-confirm"]');
  readonly toggleSwitch = this.page.locator('[data-testid="toggle-note-switch"]');

  // ── Edit-form selectors ───────────────────────────────────────────────────
  // These appear inline (both on notes list and detail page) when editing.

  readonly titleInput = this.page.locator('[data-testid="note-title"]');
  readonly descriptionInput = this.page.locator('[data-testid="note-description"]');
  readonly categorySelect = this.page.locator('[data-testid="note-category"]');
  readonly completedCheckbox = this.page.locator('[data-testid="note-completed"]');
  readonly submitButton = this.page.locator('[data-testid="note-submit"]');
  readonly cancelButton = this.page.locator('[data-testid="note-cancel"]');

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Navigate directly to a note's detail page by its API id. */
  async navigate(id?: string): Promise<void> {
    if (!id) throw new Error('NoteDetailPage.navigate() requires a note id');
    await this.page.goto(`${BASE_URL}/notes/${id}`);
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.waitForVisible(this.noteCard);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Click the Edit button to enter edit mode (form appears inline). */
  async clickEdit(): Promise<void> {
    // dispatchEvent bypasses ad overlays on the outer page that intercept clicks.
    await this.editButton.dispatchEvent('click');
    await this.waitForVisible(this.titleInput, 15_000);
  }

  /**
   * Fill the inline note form (create or edit).
   * Clears existing values before typing.
   */
  async fillForm(data: NoteFormData): Promise<void> {
    await this.titleInput.clear();
    await this.titleInput.fill(data.title);

    await this.descriptionInput.clear();
    await this.descriptionInput.fill(data.description);

    await this.categorySelect.selectOption(data.category);

    if (data.completed !== undefined) {
      const isChecked = await this.completedCheckbox.isChecked();
      if (data.completed !== isChecked) {
        await this.completedCheckbox.click();
      }
    }
  }

  /**
   * Submit the note form, waiting for the relevant API response.
   * Works for both create (POST /notes) and update (PUT /notes/{id}).
   */
  async save(): Promise<void> {
    await this.waitForApiResponse(/\/notes/, () => this.submitButton.click());
  }

  /**
   * Click the delete button, confirm the modal, wait for DELETE API response.
   * The app navigates back to the notes list after deletion.
   */
  async delete(): Promise<void> {
    await this.deleteButton.click();
    await this.waitForVisible(this.deleteConfirmButton);
    await this.waitForApiResponse(
      /\/notes\//,
      () => this.deleteConfirmButton.click(),
    );
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectTitle(title: string): Promise<void> {
    await this.waitForVisible(this.noteTitleDisplay);
    await expect(this.noteTitleDisplay).toHaveText(title);
  }

  async expectDescription(description: string): Promise<void> {
    await expect(this.noteDescriptionDisplay).toHaveText(description);
  }
}
