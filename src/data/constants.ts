import path from 'path';

// ─── Base URLs ───────────────────────────────────────────────────────────────

export const BASE_URL = 'https://practice.expandtesting.com/notes/app';
export const API_BASE_URL = 'https://practice.expandtesting.com/notes/api';

// ─── Test Users ──────────────────────────────────────────────────────────────

export const USERS = {
  alice: {
    name: 'Alice Tester',
    email: 'alice.e2e.fixed@mailtest.dev',
    password: 'AlicePass!99',
  },
  bob: {
    name: 'Bob Tester',
    email: 'bob.e2e.fixed@mailtest.dev',
    password: 'BobPass!99',
  },
} as const;

// ─── Session storage paths ───────────────────────────────────────────────────

export const SESSIONS = {
  alice: path.resolve(__dirname, '../../sessions/sessions.alice.json'),
  bob: path.resolve(__dirname, '../../sessions/sessions.bob.json'),
} as const;

// ─── API Routes ──────────────────────────────────────────────────────────────

export const API_ROUTES = {
  healthCheck: '/health-check',

  users: {
    register: '/users/register',
    login: '/users/login',
    logout: '/users/logout',
    profile: '/users/profile',
    changePassword: '/users/change-password',
    forgotPassword: '/users/forgot-password',
    deleteAccount: '/users/delete-account',
  },

  notes: {
    list: '/notes',
    create: '/notes',
    getById: (id: string) => `/notes/${id}`,
    update: (id: string) => `/notes/${id}`,
    patch: (id: string) => `/notes/${id}`,
    delete: (id: string) => `/notes/${id}`,
  },
} as const;

// ─── Note categories ─────────────────────────────────────────────────────────

export const NOTE_CATEGORIES = ['Home', 'Work', 'Personal'] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];
