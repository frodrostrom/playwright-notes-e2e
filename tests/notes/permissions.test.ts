import { test, expect } from '@fixtures/fixtures';
import { SESSIONS, BASE_URL } from '@data/constants';

test.describe('Permissions @regression', () => {
  test.describe('unauthenticated access', () => {
    // Clear project-level storageState — run with no session at all.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // The app shows a login panel (no logout button, login trigger visible)
      const loginTrigger = page.locator('[data-testid="open-login-view"]');
      const loginSubmit = page.locator('[data-testid="login-submit"]');
      const logoutBtn = page.locator('[data-testid="logout"]');

      const isLoginView = await loginTrigger.isVisible();
      const isLoginPage = await loginSubmit.isVisible();

      expect(isLoginView || isLoginPage).toBe(true);
      await expect(logoutBtn).toBeHidden();
    });
  });

  test.describe('bob cannot see alice notes', () => {
    test.use({ storageState: SESSIONS.bob });

    test('bob cannot see alice note in his list', async ({ notesPage, aliceNote }) => {
      await notesPage.navigate();
      const titles = await notesPage.getNotesTitles();
      expect(titles).not.toContain(aliceNote.title);
    });
  });
});
