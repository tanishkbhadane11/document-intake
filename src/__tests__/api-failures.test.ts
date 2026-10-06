import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationOrchestrator } from '../orchestrator.js';
import { createSession, clearAllSessions } from '../state.js';
import type { LlmService, LlmResponse, Message } from '../types.js';

// ─── LLM/API failure tests ───────────────────────────────────
// Point 8: Simulates various API failure modes and verifies
// the server doesn't crash and returns clean errors.

beforeEach(() => {
  clearAllSessions();
});

function failingLlm(error: Error): LlmService {
  return {
    chat: vi.fn(async () => { throw error; }),
  };
}

describe('LLM/API failure handling', () => {
  it('handles API timeout', async () => {
    const llm = failingLlm(new Error('Request timed out after 30000ms'));
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error).toContain('timed out');
      expect(result.error.recoverable).toBe(true);
    }
    // Session should still be usable
    expect(session.messages.length).toBeGreaterThan(0);
  });

  it('handles network failure', async () => {
    const llm = failingLlm(new Error('fetch failed: ECONNREFUSED'));
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error).toContain('ECONNREFUSED');
      expect(result.error.recoverable).toBe(true);
    }
  });

  it('handles rate limit error', async () => {
    const llm = failingLlm(new Error('OpenAI API error (429): Rate limit exceeded'));
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error).toContain('429');
      expect(result.error.recoverable).toBe(true);
    }
  });

  it('handles invalid API key error', async () => {
    const llm = failingLlm(new Error('LLM_API_KEY is not configured. Set it in your .env file.'));
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error).toContain('LLM_API_KEY');
      expect(result.error.recoverable).toBe(true);
    }
  });

  it('handles unexpected provider response (not valid JSON structure)', async () => {
    const llm: LlmService = {
      chat: vi.fn(async () => {
        // Simulate provider returning something completely wrong
        return 'This is plain text, not JSON' as unknown as LlmResponse;
      }),
    };
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error).toContain('Malformed');
      expect(result.error.recoverable).toBe(true);
    }
  });

  it('handles provider returning null', async () => {
    const llm: LlmService = {
      chat: vi.fn(async () => null as unknown as LlmResponse),
    };
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.recoverable).toBe(true);
    }
  });

  it('handles provider returning undefined', async () => {
    const llm: LlmService = {
      chat: vi.fn(async () => undefined as unknown as LlmResponse),
    };
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.recoverable).toBe(true);
    }
  });

  it('state is not corrupted after LLM failure', async () => {
    const session = createSession();

    // First: set some state successfully
    const goodLlm: LlmService = {
      chat: vi.fn(async () => ({
        message: 'Got it!',
        extracted_fields: { full_name: 'Jane Smith' },
      })),
    };
    const orch1 = new ConversationOrchestrator(goodLlm);
    await orch1.handleMessage(session, 'My name is Jane Smith');
    expect(session.state.full_name.value).toBe('Jane Smith');

    // Second: LLM fails
    const badLlm = failingLlm(new Error('API crashed'));
    const orch2 = new ConversationOrchestrator(badLlm);
    const result = await orch2.handleMessage(session, 'Something');

    expect(result.success).toBe(false);

    // State should be unchanged — name should still be Jane Smith
    expect(session.state.full_name.value).toBe('Jane Smith');
    expect(session.state.full_name.status).toBe('confirmed');
  });

  it('state is not corrupted after malformed LLM response', async () => {
    const session = createSession();

    // Set initial state
    const goodLlm: LlmService = {
      chat: vi.fn(async () => ({
        message: 'Got it!',
        extracted_fields: { full_name: 'Jane Smith' },
      })),
    };
    const orch1 = new ConversationOrchestrator(goodLlm);
    await orch1.handleMessage(session, 'Jane Smith');
    expect(session.state.full_name.value).toBe('Jane Smith');

    // Malformed response should NOT corrupt state
    const malformedLlm: LlmService = {
      chat: vi.fn(async () => ({
        garbage: true,
        extracted_fields: { full_name: 'CORRUPTED' },
      } as unknown as LlmResponse)),
    };
    const orch2 = new ConversationOrchestrator(malformedLlm);
    await orch2.handleMessage(session, 'Something');

    // State should still have original value
    expect(session.state.full_name.value).toBe('Jane Smith');
  });

  it('conversation can continue after failure', async () => {
    const session = createSession();

    // First: failure
    const badLlm = failingLlm(new Error('Temporary error'));
    const orch1 = new ConversationOrchestrator(badLlm);
    await orch1.handleMessage(session, 'Hello');

    // Second: success
    const goodLlm: LlmService = {
      chat: vi.fn(async () => ({
        message: 'Welcome back!',
        extracted_fields: { full_name: 'Jane Smith' },
      })),
    };
    const orch2 = new ConversationOrchestrator(goodLlm);
    const result = await orch2.handleMessage(session, 'My name is Jane Smith');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.full_name.value).toBe('Jane Smith');
    }
  });
});
