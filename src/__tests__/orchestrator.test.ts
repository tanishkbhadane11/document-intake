import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationOrchestrator } from '../orchestrator.js';
import { createSession, clearAllSessions } from '../state.js';
import type { LlmService, LlmResponse, Message } from '../types.js';

// ─── Mock LLM Service ────────────────────────────────────────
// A controllable mock so we can test the orchestrator in isolation.

function createMockLlmService(response?: LlmResponse | Error): LlmService {
  return {
    chat: vi.fn(async (_messages: Message[]): Promise<LlmResponse> => {
      if (response instanceof Error) {
        throw response;
      }
      return response ?? {
        message: 'Default mock response.',
        extracted_fields: {},
      };
    }),
  };
}

beforeEach(() => {
  clearAllSessions();
});

describe('ConversationOrchestrator', () => {
  it('processes a valid LLM response and updates state', async () => {
    const mockService = createMockLlmService({
      message: 'Nice to meet you, Jane!',
      extracted_fields: {
        full_name: 'Jane Doe',
      },
    });

    const orchestrator = new ConversationOrchestrator(mockService);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'My name is Jane Doe');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assistantMessage).toBe('Nice to meet you, Jane!');
      expect(result.data.state.full_name.value).toBe('Jane Doe');
      expect(result.data.state.full_name.status).toBe('confirmed');
      expect(result.data.document).toContain('Jane Doe');
    }
  });

  it('handles multiple fields in one LLM response', async () => {
    const mockService = createMockLlmService({
      message: 'Got it — name, address, and children noted!',
      extracted_fields: {
        full_name: 'Jane Doe',
        home_address: '42 Elm Street',
        has_children: true,
        children: [{ name: 'Tom', age: 12 }],
      },
    });

    const orchestrator = new ConversationOrchestrator(mockService);
    const session = createSession();

    const result = await orchestrator.handleMessage(
      session,
      'I am Jane Doe, I live at 42 Elm Street, and I have one son Tom who is 12.'
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.full_name.value).toBe('Jane Doe');
      expect(result.data.state.home_address.value).toBe('42 Elm Street');
      expect(result.data.state.has_children.value).toBe(true);
      expect(result.data.state.children.value).toHaveLength(1);
    }
  });

  it('handles user correcting previously captured information', async () => {
    const mockService1 = createMockLlmService({
      message: 'Got it, Jane!',
      extracted_fields: { full_name: 'Jane Doe' },
    });

    const orchestrator1 = new ConversationOrchestrator(mockService1);
    const session = createSession();

    await orchestrator1.handleMessage(session, 'My name is Jane Doe');
    expect(session.state.full_name.value).toBe('Jane Doe');

    // User corrects their name
    const mockService2 = createMockLlmService({
      message: 'Updated to Jane Smith!',
      extracted_fields: { full_name: 'Jane Smith' },
    });

    const orchestrator2 = new ConversationOrchestrator(mockService2);
    const result = await orchestrator2.handleMessage(
      session,
      'Actually, my name is Jane Smith'
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.full_name.value).toBe('Jane Smith');
      expect(result.data.state.full_name.status).toBe('confirmed');
    }
  });

  it('handles LLM API failure gracefully', async () => {
    const mockService = createMockLlmService(
      new Error('API rate limit exceeded')
    );

    const orchestrator = new ConversationOrchestrator(mockService);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error).toContain('API rate limit exceeded');
      expect(result.error.recoverable).toBe(true);
    }

    // Session should still be usable — the user message was recorded
    expect(session.messages.length).toBeGreaterThan(0);
  });

  it('handles malformed LLM response gracefully', async () => {
    // Return something that doesn't match our schema
    const mockService: LlmService = {
      chat: vi.fn(async () => {
        return { garbage: true } as unknown as LlmResponse;
      }),
    };

    const orchestrator = new ConversationOrchestrator(mockService);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Hello');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.error).toContain('Malformed LLM response');
      expect(result.error.recoverable).toBe(true);
    }
  });

  it('handles LLM response with no extracted fields (clarification)', async () => {
    const mockService = createMockLlmService({
      message: 'Could you clarify what you mean by that?',
      extracted_fields: {},
    });

    const orchestrator = new ConversationOrchestrator(mockService);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Something ambiguous');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assistantMessage).toContain('clarify');
      // State should remain unchanged
      expect(result.data.state.full_name.status).toBe('unknown');
    }
  });

  it('preserves conversation history across multiple messages', async () => {
    const mockService = createMockLlmService({
      message: 'Noted!',
      extracted_fields: {},
    });

    const orchestrator = new ConversationOrchestrator(mockService);
    const session = createSession();

    await orchestrator.handleMessage(session, 'First message');
    await orchestrator.handleMessage(session, 'Second message');

    // 2 user messages + 2 assistant messages
    expect(session.messages).toHaveLength(4);
    expect(session.messages[0].content).toBe('First message');
    expect(session.messages[2].content).toBe('Second message');
  });

  it('generates a document after each message', async () => {
    const mockService = createMockLlmService({
      message: 'Thanks!',
      extracted_fields: {
        full_name: 'Jane Doe',
        executor: { name: 'John', relationship: 'brother' },
      },
    });

    const orchestrator = new ConversationOrchestrator(mockService);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'test');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.document).toContain('Jane Doe');
      expect(result.data.document).toContain('John');
      expect(result.data.document).toContain('brother');
      expect(result.data.document).toContain('FICTIONAL');
    }
  });
});
