import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { API_BASE_URL, API_ROUTES, NoteCategory } from '@data/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserCredentials {
  name?: string;
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface Note {
  id: string;
  title: string;
  description: string;
  category: NoteCategory;
  completed: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateNotePayload {
  title: string;
  description: string;
  category: NoteCategory;
}

export interface UpdateNotePayload extends CreateNotePayload {
  completed: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
}

// ─── ApiClient ────────────────────────────────────────────────────────────────

export class ApiClient {
  private token: string | null = null;
  private ctx: APIRequestContext;

  private constructor(ctx: APIRequestContext) {
    this.ctx = ctx;
  }

  // ── Factory ───────────────────────────────────────────────────────────────

  /** Creates a standalone ApiClient (useful in global-setup where there's no test context). */
  static async create(): Promise<ApiClient> {
    const ctx = await request.newContext();
    return new ApiClient(ctx);
  }

  /** Creates an ApiClient backed by a Playwright test's request context. */
  static fromContext(ctx: APIRequestContext): ApiClient {
    return new ApiClient(ctx);
  }

  /** Builds a full URL from an API route path. */
  private url(route: string): string {
    return `${API_BASE_URL}${route}`;
  }

  // ── Auth helpers ──────────────────────────────────────────────────────────

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string {
    if (!this.token) throw new Error('ApiClient: no token set — call login() first');
    return this.token;
  }

  private authHeaders(): Record<string, string> {
    return { 'x-auth-token': this.getToken() };
  }

  // ── Low-level helpers ─────────────────────────────────────────────────────

  private async assertOk<T>(res: APIResponse, label: string): Promise<ApiResponse<T>> {
    if (!res.ok()) {
      const body = await res.text().catch(() => '<unreadable>');
      throw new Error(`ApiClient [${label}] HTTP ${res.status()}: ${body}`);
    }
    return res.json() as Promise<ApiResponse<T>>;
  }

  // ── User endpoints ────────────────────────────────────────────────────────

  async register(creds: Required<UserCredentials>): Promise<UserProfile> {
    const res = await this.ctx.post(this.url(API_ROUTES.users.register), {
      form: { name: creds.name, email: creds.email, password: creds.password },
    });
    const body = await this.assertOk<UserProfile>(res, 'register');
    return body.data;
  }

  async login(creds: UserCredentials): Promise<string> {
    const res = await this.ctx.post(this.url(API_ROUTES.users.login), {
      form: { email: creds.email, password: creds.password },
    });
    const body = await this.assertOk<{ token: string } & UserProfile>(res, 'login');
    this.token = body.data.token;
    return this.token;
  }

  async logout(): Promise<void> {
    const res = await this.ctx.delete(this.url(API_ROUTES.users.logout), {
      headers: this.authHeaders(),
    });
    await this.assertOk(res, 'logout');
    this.token = null;
  }

  async getProfile(): Promise<UserProfile> {
    const res = await this.ctx.get(this.url(API_ROUTES.users.profile), {
      headers: this.authHeaders(),
    });
    const body = await this.assertOk<UserProfile>(res, 'getProfile');
    return body.data;
  }

  async deleteAccount(): Promise<void> {
    const res = await this.ctx.delete(this.url(API_ROUTES.users.deleteAccount), {
      headers: this.authHeaders(),
    });
    await this.assertOk(res, 'deleteAccount');
  }

  // ── Note endpoints ────────────────────────────────────────────────────────

  async createNote(payload: CreateNotePayload): Promise<Note> {
    const res = await this.ctx.post(this.url(API_ROUTES.notes.create), {
      headers: this.authHeaders(),
      form: payload as unknown as Record<string, string>,
    });
    const body = await this.assertOk<Note>(res, 'createNote');
    return body.data;
  }

  async getNotes(): Promise<Note[]> {
    const res = await this.ctx.get(this.url(API_ROUTES.notes.list), {
      headers: this.authHeaders(),
    });
    const body = await this.assertOk<Note[]>(res, 'getNotes');
    return body.data;
  }

  async getNoteById(id: string): Promise<Note> {
    const res = await this.ctx.get(this.url(API_ROUTES.notes.getById(id)), {
      headers: this.authHeaders(),
    });
    const body = await this.assertOk<Note>(res, 'getNoteById');
    return body.data;
  }

  async updateNote(id: string, payload: UpdateNotePayload): Promise<Note> {
    const res = await this.ctx.put(this.url(API_ROUTES.notes.update(id)), {
      headers: this.authHeaders(),
      form: { ...payload, completed: String(payload.completed) },
    });
    const body = await this.assertOk<Note>(res, 'updateNote');
    return body.data;
  }

  async patchNoteCompleted(id: string, completed: boolean): Promise<Note> {
    const res = await this.ctx.patch(this.url(API_ROUTES.notes.patch(id)), {
      headers: this.authHeaders(),
      form: { completed: String(completed) },
    });
    const body = await this.assertOk<Note>(res, 'patchNoteCompleted');
    return body.data;
  }

  async deleteNote(id: string): Promise<void> {
    const res = await this.ctx.delete(this.url(API_ROUTES.notes.delete(id)), {
      headers: this.authHeaders(),
    });
    await this.assertOk(res, 'deleteNote');
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}
