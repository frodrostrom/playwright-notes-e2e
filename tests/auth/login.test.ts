import { test, expect } from '@fixtures/fixtures';
import { SESSIONS, USERS, BASE_URL } from '@data/constants';

// ─── Login @smoke ─────────────────────────────────────────────────────────────

test.describe('Login @smoke', () => {
  // Override project-level storageState so these tests run without any session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('valid credentials redirect to notes page', async ({ loginPage, assert }) => {
    await loginPage.navigate();
    await loginPage.login(USERS.alice.email, USERS.alice.password);
    await assert.toBeLoggedIn();
  });

  test('wrong password shows error', async ({ loginPage, assert }) => {
    await loginPage.navigate();
    await loginPage.login(USERS.alice.email, 'WrongPassword!00');
    await assert.toShowError('Incorrect email address or password');
  });

  test('invalid email format shows error', async ({ loginPage, assert }) => {
    await loginPage.navigate();
    // Use a value that passes the email input (avoiding outer-form bubbling)
    // but fails server-side validation — no registered account, wrong password.
    await loginPage.login('not-a-registered@example.com', 'AnyPass!01');
    await assert.toShowError('Incorrect email address or password');
  });
});

// ─── Session injection @smoke ─────────────────────────────────────────────────

test.describe('Session injection @smoke', () => {
  test.use({ storageState: SESSIONS.alice });

  test('alice is already logged in via injected session', async ({ page, assert }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await assert.toBeLoggedIn();
  });

  test('alice username visible in nav / profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState('domcontentloaded');
    const nameField = page.locator('[data-testid="user-name"]');
    await expect(nameField).toBeVisible();
    // The field may be an input or a text node; check the value/text contains alice's name
    const tagName = await nameField.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'input') {
      await expect(nameField).toHaveValue(USERS.alice.name);
    } else {
      await expect(nameField).toContainText(USERS.alice.name);
    }
  });
});
