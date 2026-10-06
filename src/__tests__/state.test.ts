import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  getSession,
  resetSession,
  addMessage,
  clearAllSessions,
  createEmptyState,
} from '../state.js';

beforeEach(() => {
  clearAllSessions();
});

describe('createEmptyState', () => {
  it('creates a state with all fields set to unknown', () => {
    const state = createEmptyState();

    for (const field of Object.values(state)) {
      expect(field.value).toBeNull();
      expect(field.status).toBe('unknown');
    }
  });
});

describe('session management', () => {
  it('creates a session with a unique id', () => {
    const s1 = createSession();
    const s2 = createSession();

    expect(s1.id).toBeTruthy();
    expect(s2.id).toBeTruthy();
    expect(s1.id).not.toBe(s2.id);
  });

  it('retrieves a session by id', () => {
    const session = createSession();
    const retrieved = getSession(session.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(session.id);
  });

  it('returns undefined for unknown session id', () => {
    const result = getSession('nonexistent-id');
    expect(result).toBeUndefined();
  });

  it('resets a session to empty state', () => {
    const session = createSession();
    addMessage(session, { role: 'user', content: 'Hello' });

    // Mutate the state
    session.state.full_name = { value: 'Jane', status: 'confirmed' };

    const reset = resetSession(session.id);
    expect(reset).toBeDefined();
    expect(reset!.state.full_name.status).toBe('unknown');
    expect(reset!.messages).toHaveLength(0);
  });

  it('returns undefined when resetting nonexistent session', () => {
    const result = resetSession('nonexistent');
    expect(result).toBeUndefined();
  });

  it('adds messages to a session', () => {
    const session = createSession();
    addMessage(session, { role: 'user', content: 'Hi' });
    addMessage(session, { role: 'assistant', content: 'Hello!' });

    expect(session.messages).toHaveLength(2);
    expect(session.messages[0].role).toBe('user');
    expect(session.messages[1].role).toBe('assistant');
  });
});
