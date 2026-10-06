import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationOrchestrator } from '../orchestrator.js';
import { createSession, getSession, clearAllSessions } from '../state.js';
import type { LlmService, LlmResponse, Message } from '../types.js';

// ─── Session isolation tests ─────────────────────────────────
// Verifies that information from one session never leaks into another.

function mockLlm(response: LlmResponse): LlmService {
  return {
    chat: vi.fn(async () => response),
  };
}

beforeEach(() => {
  clearAllSessions();
});

describe('Session isolation', () => {
  it('two sessions have completely separate states', async () => {
    // Session A: Jane Smith
    const sessionA = createSession();
    const orchA = new ConversationOrchestrator(mockLlm({
      message: 'Hi Jane!',
      extracted_fields: { full_name: 'Jane Smith', home_address: '10 Elm St' },
    }));
    await orchA.handleMessage(sessionA, 'I am Jane Smith at 10 Elm St');

    // Session B: John Brown
    const sessionB = createSession();
    const orchB = new ConversationOrchestrator(mockLlm({
      message: 'Hi John!',
      extracted_fields: { full_name: 'John Brown', home_address: '20 Oak Ave' },
    }));
    await orchB.handleMessage(sessionB, 'I am John Brown at 20 Oak Ave');

    // Verify isolation
    expect(sessionA.state.full_name.value).toBe('Jane Smith');
    expect(sessionA.state.home_address.value).toBe('10 Elm St');

    expect(sessionB.state.full_name.value).toBe('John Brown');
    expect(sessionB.state.home_address.value).toBe('20 Oak Ave');

    // Session A should not contain Session B's data
    expect(sessionA.state.full_name.value).not.toBe('John Brown');
    expect(sessionB.state.full_name.value).not.toBe('Jane Smith');
  });

  it('session messages are independent', async () => {
    const sessionA = createSession();
    const sessionB = createSession();

    const orch = new ConversationOrchestrator(mockLlm({
      message: 'OK.',
      extracted_fields: {},
    }));

    await orch.handleMessage(sessionA, 'Message for A');
    await orch.handleMessage(sessionB, 'Message for B');

    // Session A should only have its messages
    expect(sessionA.messages).toHaveLength(2); // user + assistant
    expect(sessionA.messages[0].content).toBe('Message for A');

    // Session B should only have its messages
    expect(sessionB.messages).toHaveLength(2);
    expect(sessionB.messages[0].content).toBe('Message for B');
  });

  it('resetting one session does not affect another', async () => {
    const sessionA = createSession();
    const sessionB = createSession();

    const orch = new ConversationOrchestrator(mockLlm({
      message: 'OK.',
      extracted_fields: { full_name: 'Test User' },
    }));

    await orch.handleMessage(sessionA, 'Test');
    await orch.handleMessage(sessionB, 'Test');

    expect(sessionA.state.full_name.value).toBe('Test User');
    expect(sessionB.state.full_name.value).toBe('Test User');

    // Reset session A only
    const { resetSession } = await import('../state.js');
    resetSession(sessionA.id);

    // Re-fetch to check
    const fetchedA = getSession(sessionA.id);
    const fetchedB = getSession(sessionB.id);

    expect(fetchedA!.state.full_name.status).toBe('unknown');
    expect(fetchedA!.state.full_name.value).toBeNull();

    // Session B should be unaffected
    expect(fetchedB!.state.full_name.value).toBe('Test User');
    expect(fetchedB!.state.full_name.status).toBe('confirmed');
  });

  it('sessions have unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(createSession().id);
    }
    expect(ids.size).toBe(50);
  });
});
