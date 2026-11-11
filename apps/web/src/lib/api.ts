import type {
  PlanLimits,
  Tracker,
  TrackerFormInput,
  TrackerSummary,
  UsageInfo,
  UserProfile,
} from '../types';

const TOKEN_STORAGE_KEY = 'dueguard_auth_token_v1';
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  includeAuth = true
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (includeAuth) {
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      payload?.error || `Request failed (${res.status})`,
      res.status,
      payload?.code
    );
  }
  return payload as T;
}

export const api = {
  async register(params: {
    name: string;
    email: string;
    password: string;
    importTrackers?: TrackerFormInput[];
  }) {
    return apiFetch<{
      token: string;
      user: Pick<UserProfile, 'id' | 'email' | 'name' | 'plan'>;
      importedCount: number;
    }>('/api/auth/register', { method: 'POST', body: JSON.stringify(params) }, false);
  },

  async login(params: { email: string; password: string }) {
    return apiFetch<{
      token: string;
      user: Pick<UserProfile, 'id' | 'email' | 'name' | 'plan'>;
    }>('/api/auth/login', { method: 'POST', body: JSON.stringify(params) }, false);
  },

  async getMe() {
    return apiFetch<{ user: UserProfile; usage: UsageInfo }>('/api/auth/me');
  },

  async updateSettings(data: {
    name?: string;
    emailAlertsEnabled?: boolean;
    telegramAlertsEnabled?: boolean;
  }) {
    return apiFetch<{ ok: boolean }>('/api/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getTrackers() {
    return apiFetch<{
      trackers: Tracker[];
      summary: TrackerSummary;
      limits: PlanLimits;
    }>('/api/trackers');
  },

  async createTracker(input: TrackerFormInput) {
    return apiFetch<{ tracker: Tracker }>('/api/trackers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateTracker(id: string, input: Partial<TrackerFormInput>) {
    return apiFetch<{ tracker: Tracker }>(`/api/trackers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteTracker(id: string) {
    return apiFetch<{ ok: boolean }>(`/api/trackers/${id}`, {
      method: 'DELETE',
    });
  },

  async renewTracker(id: string) {
    return apiFetch<{ tracker: Tracker }>(`/api/trackers/${id}/renew`, {
      method: 'POST',
    });
  },

  async snoozeTracker(id: string, days = 2) {
    return apiFetch<{ tracker: Tracker }>(`/api/trackers/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  },

  async uploadAttachment(trackerId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<{ tracker: Tracker }>(`/api/trackers/${trackerId}/attachment`, {
      method: 'POST',
      body: form,
    });
  },

  async fetchAttachmentObjectUrl(trackerId: string): Promise<string> {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/api/trackers/${trackerId}/attachment`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new ApiError('Could not load attachment.', res.status);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  async deleteAttachment(trackerId: string) {
    return apiFetch<{ ok: boolean }>(`/api/trackers/${trackerId}/attachment`, {
      method: 'DELETE',
    });
  },

  async generateTelegramLinkCode() {
    return apiFetch<{
      code: string;
      botUsername: string | null;
      command: string;
    }>('/api/telegram/link-code', { method: 'POST' });
  },

  async syncTelegramLink() {
    return apiFetch<{ linked: boolean; configured?: boolean; message?: string }>(
      '/api/telegram/sync',
      { method: 'POST' }
    );
  },

  async testTelegramAlert() {
    return apiFetch<{ ok: boolean; simulated?: boolean }>('/api/telegram/test', {
      method: 'POST',
    });
  },

  async unlinkTelegram() {
    return apiFetch<{ ok: boolean }>('/api/telegram/unlink', { method: 'POST' });
  },

  async exportAccount() {
    return apiFetch<Record<string, unknown>>('/api/account/export');
  },

  async deleteAccount() {
    return apiFetch<{ ok: boolean }>('/api/account', { method: 'DELETE' });
  },
};
