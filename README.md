# playwright-notes-e2e

Production-grade Playwright + TypeScript E2E framework targeting the [Notes practice app](https://practice.expandtesting.com/notes/app) and its [REST API](https://practice.expandtesting.com/notes/api/api-docs/).

## Architecture

```
e2e/
├── global-setup.ts               # Creates test users via API, saves auth state to sessions/
├── playwright.config.ts          # Project config — chromium + firefox, global setup, retries
├── src/
│   ├── api/
│   │   └── api-client.ts         # Typed REST client (register, login, CRUD notes)
│   ├── data/
│   │   └── constants.ts          # Users, session paths, API routes, note categories
│   ├── fixtures/
│   │   └── fixtures.ts           # Extended test: loginPage, notesPage, aliceApi, aliceNote, assert
│   ├── matchers/
│   │   └── page-assertions.ts    # expectPage(page).toBeLoggedIn() / toShowNotes(n) / toShowError()
│   └── pages/
│       ├── base.page.ts          # Abstract: retry(), waitForApiResponse(), mockApiResponse()
│       ├── login.page.ts         # Login form — login(), expectErrorVisible()
│       ├── note-detail.page.ts   # Note view/edit — clickEdit(), fillForm(), save(), delete()
│       └── notes.page.ts         # Notes list — clickAddNote(), searchNotes(), getNoteCount()
├── tests/
│   ├── auth/
│   │   └── login.test.ts         # @smoke: login flows, session injection
│   └── notes/
│       ├── network.test.ts       # @regression: 500 error handling via route interception
│       ├── notes.test.ts         # @smoke/@regression: reading, CRUD
│       └── permissions.test.ts   # @regression: unauthenticated redirect, user isolation
└── sessions/                     # gitignored — auth state written here by global-setup
```

## Key patterns

### 1. Session injection — no UI login in tests

`global-setup.ts` registers Alice and Bob once via API, logs them in, and saves browser
`localStorage` state to `sessions/sessions.alice.json` / `sessions.bob.json`. Tests load
the saved state via `test.use({ storageState: SESSIONS.alice })` and land directly on the
authenticated notes page.

```ts
test.describe('Notes – reading @smoke', () => {
  test.use({ storageState: SESSIONS.alice });

  test('notes page loads', async ({ notesPage }) => {
    await notesPage.navigate(); // already authenticated — no login form
  });
});
```

### 2. API-first test data — `aliceNote` fixture with auto-cleanup

The `aliceNote` fixture creates a note via the REST API before each test and deletes it
after, regardless of pass/fail. Tests never depend on leftover data from prior runs.

```ts
test('pre-created note is visible', async ({ notesPage, aliceNote, assert }) => {
  await notesPage.navigate();
  await notesPage.searchNotes(aliceNote.title);
  await assert.toShowAtLeastOneNote();
}); // ← aliceNote deleted automatically
```

### 3. Network interception — mock errors without touching the backend

`BasePage.mockApiResponse()` wraps `page.route()` to intercept any request and return
a fake response. Tests can force error states (500, 401, empty list) without a test
double server.

```ts
await notesPage.mockApiResponse(`${API_BASE_URL}/notes`, { success: false }, 500);
await page.goto(BASE_URL);
// assert graceful degradation
await notesPage.clearMock(`${API_BASE_URL}/notes`);
```

### 4. `waitForApiResponse` — action + network synchronized

`BasePage.waitForApiResponse()` registers a response waiter *before* triggering the UI
action, so there is no race between the click and the `waitForResponse` registration.

```ts
protected async waitForApiResponse(urlPattern, action) {
  const [response] = await Promise.all([
    this.page.waitForResponse(url => url.includes(urlPattern)),
    action(), // click fires after waiter is registered
  ]);
  return response;
}
```

## Setup

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install --with-deps

# Run global setup manually (creates sessions/)
npx playwright test --project=chromium   # global-setup runs automatically before tests
```

## Running tests

```bash
# All tests (chromium)
npm test

# Smoke tests only
npm run test:smoke

# Regression tests only
npm run test:regression

# Specific browser
npm run test:firefox

# Type-check without running
npm run typecheck

# View HTML report
npm run report
```

## CI strategy

| Trigger | Job | Browsers |
|---|---|---|
| Pull request → `main` | Smoke gate (must pass to merge) | chromium |
| Push to `main` / `develop` | Full regression | chromium + firefox (parallel) |
| Schedule Mon–Fri 06:00 UTC | Full regression | chromium + firefox (parallel) |

Playwright reports are uploaded as artifacts on every regression run (30-day retention)
and on smoke failures (7-day retention).
