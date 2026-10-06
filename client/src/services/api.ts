import type {
  CreateSessionResponse,
  SendMessageResponse,
  GetSessionResponse,
  ResetSessionResponse,
} from '../types/api';

// ─── API Client ──────────────────────────────────────────────
// Centralised fetch wrapper for the backend API.

const BASE_URL = '/api';

class ApiError extends Error {
  public status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the server. Please check that the backend is running.');
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return body as T;
}

// ─── API Methods ─────────────────────────────────────────────

export async function createSession(): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>('/sessions', { method: 'POST' });
}

export async function sendMessage(
  sessionId: string,
  message: string,
): Promise<SendMessageResponse> {
  return request<SendMessageResponse>(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getSession(sessionId: string): Promise<GetSessionResponse> {
  return request<GetSessionResponse>(`/sessions/${sessionId}`);
}

export async function resetSession(sessionId: string): Promise<ResetSessionResponse> {
  return request<ResetSessionResponse>(`/sessions/${sessionId}/reset`, {
    method: 'POST',
  });
}

export { ApiError };
