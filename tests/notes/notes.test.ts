import { test, expect } from '@fixtures/fixtures';
import { SESSIONS } from '@data/constants';

// ─── Notes – reading @smoke ───────────────────────────────────────────────────

test.describe('Notes – reading @smoke', () => {
  test.use({ storageState: SESSIONS.alice });

  test('notes page loads for authenticated user', async ({ notesPage, assert }) => {
    await notesPage.navigate();
    // Accept either populated or empty list — just verify the shell loaded
    const count = await notesPage.getNoteCount();
    if (count > 0) {
      await assert.toShowAtLeastOneNote();
    } else {
      await assert.toShowEmptyState();
    }
  });

  test('pre-created note is visible', async ({ notesPage, aliceNote, assert }) => {
    await notesPage.navigate();
    await notesPage.searchNotes(aliceNote.title);
    await assert.toShowAtLeastOneNote();
  });
});

// ─── Notes – CRUD @regression ────────────────────────────────────────────────

test.describe('Notes – CRUD @regression', () => {
  test.use({ storageState: SESSIONS.alice });

  test('alice can create a note via UI', async ({ notesPage, aliceApi }) => {
    await notesPage.navigate();
    await notesPage.clickAddNote();

    const title = `UI Created ${Date.now()}`;
    const page = notesPage['page'];

    await page.locator('[data-testid="note-title"]').fill(title);
    await page.locator('[data-testid="note-description"]').fill('Created via UI');
    await page.locator('[data-testid="note-category"]').selectOption('Personal');

    // Save and wait for POST /notes response
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/notes') && res.request().method() === 'POST'),
      page.locator('[data-testid="note-submit"]').click(),
    ]);

    await notesPage.searchNotes(title);
    const titles = await notesPage.getNotesTitles();
    expect(titles).toContain(title);

    // Cleanup
    const notes = await aliceApi.getNotes();
    const created = notes.find(n => n.title === title);
    if (created) await aliceApi.deleteNote(created.id);
  });

  test('alice can delete a note', async ({ page, notesPage, noteDetailPage, aliceNote, assert }) => {
    await noteDetailPage.navigate(aliceNote.id);

    await noteDetailPage.delete();

    // After delete the app navigates back to the notes list
    await page.waitForTimeout(1000);
    await notesPage.searchNotes(aliceNote.title);
    await page.waitForTimeout(500);
    const titles = await notesPage.getNotesTitles();
    expect(titles).not.toContain(aliceNote.title);
  });

  test('alice can edit a note', async ({ notesPage, noteDetailPage, aliceNote }) => {
    await noteDetailPage.navigate(aliceNote.id);
    await noteDetailPage.clickEdit();

    const updatedTitle = `Updated ${Date.now()}`;
    await noteDetailPage.fillForm({
      title: updatedTitle,
      description: aliceNote.description,
      category: aliceNote.category,
    });
    await noteDetailPage.save();

    await noteDetailPage.expectTitle(updatedTitle);
  });
});
