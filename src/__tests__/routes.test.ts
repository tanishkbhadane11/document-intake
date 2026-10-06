import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import { createRouter } from '../routes.js';
import { clearAllSessions } from '../state.js';
import type { LlmService, LlmResponse, Message } from '../types.js';

// ─── API Route tests ─────────────────────────────────────────
// Point 11: Tests the API contract, HTTP status codes,
// response shapes, and input validation at the route level.

function mockLlm(response: LlmResponse): LlmService {
  return {
    chat: vi.fn(async () => response),
  };
}

function createTestApp(llm?: LlmService) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  const service = llm ?? mockLlm({
    message: 'Hello!',
    extracted_fields: {},
  });
  app.use('/api', createRouter(service));
  return app;
}

/** Simple helper to make requests against the Express app without supertest. */
async function request(app: express.Express, method: string, path: string, body?: unknown) {
  // Use node's built-in test server approach
  const { createServer } = await import('http');
  const server = createServer(app);

  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Server address unavailable'));
        return;
      }

      const url = `http://127.0.0.1:${addr.port}${path}`;
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body !== undefined) {
        options.body = JSON.stringify(body);
      }

      fetch(url, options)
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          server.close();
          resolve({ status: res.status, body: json });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

beforeEach(() => {
  clearAllSessions();
});

describe('API routes', () => {
  describe('POST /api/sessions', () => {
    it('returns 201 with sessionId, state, document, and assistantMessage', async () => {
      const app = createTestApp();
      const res = await request(app, 'POST', '/api/sessions');

      expect(res.status).toBe(201);
      expect(res.body.sessionId).toBeDefined();
      expect(typeof res.body.sessionId).toBe('string');
      expect(res.body.state).toBeDefined();
      expect(res.body.document).toBeDefined();
      expect(res.body.assistantMessage).toBeDefined();
      expect(typeof res.body.assistantMessage).toBe('string');
      expect(res.body.messages).toEqual([]);
    });
  });

  describe('GET /api/sessions/:sessionId', () => {
    it('returns 404 for unknown session', async () => {
      const app = createTestApp();
      const res = await request(app, 'GET', '/api/sessions/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });

    it('returns session data for existing session', async () => {
      const app = createTestApp();

      // Create session first
      const createRes = await request(app, 'POST', '/api/sessions');
      const sessionId = createRes.body.sessionId;

      // Fetch it
      const res = await request(app, 'GET', `/api/sessions/${sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe(sessionId);
      expect(res.body.state).toBeDefined();
      expect(res.body.messages).toBeDefined();
      expect(res.body.document).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });
  });

  describe('POST /api/sessions/:sessionId/messages', () => {
    it('returns 404 for unknown session', async () => {
      const app = createTestApp();
      const res = await request(app, 'POST', '/api/sessions/bad-id/messages', {
        message: 'Hello',
      });

      expect(res.status).toBe(404);
    });

    it('returns 400 for empty message', async () => {
      const app = createTestApp();
      const createRes = await request(app, 'POST', '/api/sessions');
      const sessionId = createRes.body.sessionId;

      const res = await request(app, 'POST', `/api/sessions/${sessionId}/messages`, {
        message: '',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('non-empty');
    });

    it('returns 400 for missing message field', async () => {
      const app = createTestApp();
      const createRes = await request(app, 'POST', '/api/sessions');
      const sessionId = createRes.body.sessionId;

      const res = await request(app, 'POST', `/api/sessions/${sessionId}/messages`, {});

      expect(res.status).toBe(400);
    });

    it('returns 400 for whitespace-only message', async () => {
      const app = createTestApp();
      const createRes = await request(app, 'POST', '/api/sessions');
      const sessionId = createRes.body.sessionId;

      const res = await request(app, 'POST', `/api/sessions/${sessionId}/messages`, {
        message: '   ',
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 for excessively long message', async () => {
      const app = createTestApp();
      const createRes = await request(app, 'POST', '/api/sessions');
      const sessionId = createRes.body.sessionId;

      const res = await request(app, 'POST', `/api/sessions/${sessionId}/messages`, {
        message: 'x'.repeat(10_001),
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('maximum length');
    });

    it('returns sessionId in successful message response', async () => {
      const llm = mockLlm({
        message: 'Got it!',
        extracted_fields: { full_name: 'Jane' },
      });
      const app = createTestApp(llm);
      const createRes = await request(app, 'POST', '/api/sessions');
      const sessionId = createRes.body.sessionId;

      const res = await request(app, 'POST', `/api/sessions/${sessionId}/messages`, {
        message: 'My name is Jane',
      });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe(sessionId);
      expect(res.body.assistantMessage).toBe('Got it!');
      expect(res.body.state).toBeDefined();
      expect(res.body.document).toBeDefined();
    });
  });

  describe('POST /api/sessions/:sessionId/reset', () => {
    it('returns 404 for unknown session', async () => {
      const app = createTestApp();
      const res = await request(app, 'POST', '/api/sessions/bad-id/reset');

      expect(res.status).toBe(404);
    });

    it('resets session state and messages', async () => {
      const llm = mockLlm({
        message: 'Hi!',
        extracted_fields: { full_name: 'Jane' },
      });
      const app = createTestApp(llm);

      // Create and populate session
      const createRes = await request(app, 'POST', '/api/sessions');
      const sessionId = createRes.body.sessionId;
      await request(app, 'POST', `/api/sessions/${sessionId}/messages`, {
        message: 'My name is Jane',
      });

      // Reset
      const resetRes = await request(app, 'POST', `/api/sessions/${sessionId}/reset`);

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.sessionId).toBe(sessionId);
      expect(resetRes.body.messages).toEqual([]);
      expect(resetRes.body.state.full_name.status).toBe('unknown');
      expect(resetRes.body.state.full_name.value).toBeNull();
    });
  });
});
