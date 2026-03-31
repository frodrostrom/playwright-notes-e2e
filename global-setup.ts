/**
 * Global setup — runs once before the entire test suite.
 *
 * Creates two test users (Alice, Bob) via the REST API, logs them in,
 * then writes the Playwright storageState JSON directly to disk.
 *
 * No browser is launched — only HTTP calls are made, so any browser
 * project (chromium, firefox, webkit) can run without the others installed.
 *
 * storageState format understood by Playwright:
 * {
 *   "cookies": [],
 *   "origins": [{
 *     "origin": "https://practice.expandtesting.com",
 *     "localStorage": [{ "name": "token", "value": "<jwt>" }]
 *   }]
 * }
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { USERS, SESSIONS, BASE_URL } from './src/data/constants';
import { ApiClient } from './src/api/api-client';

/** The origin the React app uses when reading localStorage. */
const APP_ORIGIN = new URL(BASE_URL).origin; // https://practice.expandtesting.com

function writeStorageState(token: string, sessionPath: string): void {
  const state = {
    cookies: [],
    origins: [
      {
        origin: APP_ORIGIN,
        localStorage: [{ name: 'token', value: token }],
      },
    ],
  };
  const dir = path.dirname(sessionPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(sessionPath, JSON.stringify(state, null, 2));
}

async function ensureUser(
  api: ApiClient,
  user: { name: string; email: string; password: string },
  sessionPath: string,
): Promise<void> {
  // Register — tolerate 409 when the account already exists from a prior run.
  try {
    await api.register(user);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('409') && !msg.includes('already exists')) throw err;
  }

  await api.login(user);
  writeStorageState(api.getToken(), sessionPath);
  console.log(`[global-setup] Session written for ${user.email}`);
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const aliceApi = await ApiClient.create();
  const bobApi = await ApiClient.create();

  try {
    await Promise.all([
      ensureUser(aliceApi, USERS.alice, SESSIONS.alice),
      ensureUser(bobApi, USERS.bob, SESSIONS.bob),
    ]);
  } finally {
    await aliceApi.dispose();
    await bobApi.dispose();
  }

  console.log('[global-setup] All sessions ready.');
}
