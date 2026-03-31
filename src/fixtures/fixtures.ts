import { test as base, expect } from '@playwright/test';
import { USERS, SESSIONS } from '@data/constants';
import { ApiClient, Note } from '@api/api-client';
import { LoginPage } from '@pages/login.page';
import { NotesPage } from '@pages/notes.page';
import { NoteDetailPage } from '@pages/note-detail.page';
import { expectPage, PageAssertions } from '@matchers/page-assertions';

type Fixtures = {
  // Page objects
  loginPage: LoginPage;
  notesPage: NotesPage;
  noteDetailPage: NoteDetailPage;

  // API clients (authenticated)
  aliceApi: ApiClient;
  bobApi: ApiClient;

  // Pre-created note, auto-deleted after test
  aliceNote: Note;

  // Custom assertion helper
  assert: PageAssertions;
};

export const test = base.extend<Fixtures>({
  // ── Page objects ───────────────────────────────────────────────────────────

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  notesPage: async ({ page }, use) => {
    await use(new NotesPage(page));
  },

  noteDetailPage: async ({ page }, use) => {
    await use(new NoteDetailPage(page));
  },

  // ── API clients ────────────────────────────────────────────────────────────

  aliceApi: async ({ request }, use) => {
    const api = ApiClient.fromContext(request);
    await api.login(USERS.alice);
    await use(api);
    // ApiClient backed by Playwright's request context — no explicit dispose needed.
  },

  bobApi: async ({ request }, use) => {
    const api = ApiClient.fromContext(request);
    await api.login(USERS.bob);
    await use(api);
  },

  // ── aliceNote ──────────────────────────────────────────────────────────────
  // Depends on aliceApi so it re-uses the same authenticated context.

  aliceNote: async ({ aliceApi }, use) => {
    const note = await aliceApi.createNote({
      title: `E2E Note ${Date.now()}`,
      description: 'E2E test note',
      category: 'Work',
    });
    await use(note);
    // Cleanup — best-effort, ignore 404 if already deleted by the test.
    await aliceApi.deleteNote(note.id).catch(() => {});
  },

  // ── Custom assertions ──────────────────────────────────────────────────────

  assert: async ({ page }, use) => {
    await use(expectPage(page));
  },
});

export { expect };
