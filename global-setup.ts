/**
 * Global setup — runs once before the entire test suite.
 *
 * Creates two test users (Alice, Bob) via the REST API, logs them in,
 * then saves browser localStorage auth state to disk so tests can load
 * it via `storageState` without performing UI login.
 *
 * Re-uses existing sessions when the session files already exist AND the
 * tokens are still valid (profile endpoint returns 200).
 */

import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { USERS, SESSIONS, BASE_URL } from './src/data/constants';
import { ApiClient } from './src/api/api-client';

async function saveAuthState(
  token: string,
  sessionPath: string,
  config: FullConfig,
): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  // Navigate to the app so the origin is set, then inject the token into
  // localStorage — this mirrors how the React app persists auth.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t: string) => localStorage.setItem('token', t), token);

  await context.storageState({ path: sessionPath });
  await browser.close();
}

async function ensureUser(
  api: ApiClient,
  user: { name: string; email: string; password: string },
  sessionPath: string,
  config: FullConfig,
): Promise<void> {
  // Fast path: session file exists, try to reuse it.
  if (fs.existsSync(sessionPath)) {
    try {
      await api.login(user);
      console.log(`[global-setup] Reusing session for ${user.email}`);
      await saveAuthState(api.getToken(), sessionPath, config);
      return;
    } catch {
      // Token stale or user gone — fall through to recreate.
    }
  }

  // Register (ignore 409 conflict — user may already exist from a previous run).
  try {
    await api.register(user);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('409') && !msg.includes('already exists')) throw err;
  }

  await api.login(user);
  console.log(`[global-setup] Created session for ${user.email}`);

  const dir = path.dirname(sessionPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await saveAuthState(api.getToken(), sessionPath, config);
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const aliceApi = await ApiClient.create();
  const bobApi = await ApiClient.create();

  try {
    await Promise.all([
      ensureUser(aliceApi, USERS.alice, SESSIONS.alice, config),
      ensureUser(bobApi, USERS.bob, SESSIONS.bob, config),
    ]);
  } finally {
    await aliceApi.dispose();
    await bobApi.dispose();
  }

  console.log('[global-setup] All sessions ready.');
}
