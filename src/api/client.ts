import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  storeAccessToken,
  storeSession,
  updateStoredUser,
} from './session';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class DeliveryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DeliveryApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  retryOnUnauthorized?: boolean;
}

function buildUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }
  if (path.startsWith('/api')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const candidate = payload as { message?: string; error?: string; detail?: string };
    return candidate.message ?? candidate.error ?? candidate.detail ?? `Error HTTP ${status}`;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  return `Error HTTP ${status}`;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return false;
  }

  const payload = (await parseResponse(response)) as Partial<AuthResponse>;
  if (!payload.accessToken) {
    clearSession();
    return false;
  }

  storeAccessToken(payload.accessToken);
  if (payload.user) {
    updateStoredUser(payload.user);
  }
  return true;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401 && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return api<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new DeliveryApiError(errorMessage(response.status, payload), response.status, payload);
  }

  return payload as T;
}

export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const token = getAccessToken();
  const form = new FormData();
  form.append('file', file);

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: form,
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new DeliveryApiError(errorMessage(response.status, payload), response.status, payload);
  }

  return payload as T;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const auth = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: credentials,
      skipAuth: true,
    });
    storeSession(auth);
    return auth;
  },

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const auth = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: request,
      skipAuth: true,
    });
    storeSession(auth);
    return auth;
  },

  async me(): Promise<User> {
    const user = await api<User>('/auth/me');
    updateStoredUser(user);
    return user;
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api<void>('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          retryOnUnauthorized: false,
        });
      }
    } finally {
      clearSession();
    }
  },
};
