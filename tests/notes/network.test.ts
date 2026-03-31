import { test } from '@fixtures/fixtures';
import { SESSIONS, API_BASE_URL } from '@data/constants';

test.describe('Network interception @regression', () => {
  test.use({ storageState: SESSIONS.alice });

  test('UI handles notes API 500 error gracefully', async ({ page, notesPage }) => {
    // Intercept GET /notes and return 500 before navigating
    await notesPage.mockApiResponse(
      `${API_BASE_URL}/notes`,
      { success: false, status: 500, message: 'Internal Server Error' },
      500,
    );

    await page.goto('https://practice.expandtesting.com/notes/app', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(1500);

    // The app should degrade gracefully — either show empty state or an error toast
    const emptyState = page.locator('[data-testid="no-notes-message"]');
    const alertMsg = page.locator('[data-testid="alert-message"]');
    const notesList = page.locator('[data-testid="notes-list"]');

    const emptyVisible = await emptyState.isVisible();
    const alertVisible = await alertMsg.isVisible();
    const listEmpty = (await page.locator('[data-testid="note-card"]').count()) === 0;

    // At minimum the notes list must show no cards (no data rendered from 500 response)
    const graceful = emptyVisible || alertVisible || listEmpty;
    if (!graceful) {
      throw new Error('App did not handle 500 gracefully — note cards rendered despite server error');
    }

    await notesPage.clearMock(`${API_BASE_URL}/notes`);
  });
});
