import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationOrchestrator } from '../orchestrator.js';
import { createSession, clearAllSessions } from '../state.js';
import type { LlmService, LlmResponse, Message } from '../types.js';

// ─── Correction tests ────────────────────────────────────────
// The spec explicitly requires users to correct previously
// supplied information. These tests verify corrections work
// for every field type and that old values are fully replaced.

function mockLlm(response: LlmResponse): LlmService {
  return {
    chat: vi.fn(async () => response),
  };
}

beforeEach(() => {
  clearAllSessions();
});

describe('Corrections to previously captured information', () => {
  it('corrects full_name', async () => {
    const session = createSession();

    // Set initial name
    let orch = new ConversationOrchestrator(mockLlm({
      message: 'Got it.',
      extracted_fields: { full_name: 'Jane Doe' },
    }));
    await orch.handleMessage(session, 'My name is Jane Doe');
    expect(session.state.full_name.value).toBe('Jane Doe');

    // Correct name
    orch = new ConversationOrchestrator(mockLlm({
      message: 'Updated!',
      extracted_fields: { full_name: 'Jane Smith' },
    }));
    const result = await orch.handleMessage(session, 'Actually, my name is Jane Smith');
    expect(result.success).toBe(true);
    expect(session.state.full_name.value).toBe('Jane Smith');
    expect(session.state.full_name.status).toBe('confirmed');
  });

  it('corrects home_address', async () => {
    const session = createSession();

    let orch = new ConversationOrchestrator(mockLlm({
      message: 'Noted.',
      extracted_fields: { home_address: '10 Downing Street' },
    }));
    await orch.handleMessage(session, '10 Downing Street');
    expect(session.state.home_address.value).toBe('10 Downing Street');

    orch = new ConversationOrchestrator(mockLlm({
      message: 'Updated!',
      extracted_fields: { home_address: '42 Baker Street' },
    }));
    await orch.handleMessage(session, 'Sorry, it is 42 Baker Street');
    expect(session.state.home_address.value).toBe('42 Baker Street');
  });

  it('corrects covers_worldwide_assets', async () => {
    const session = createSession();

    let orch = new ConversationOrchestrator(mockLlm({
      message: 'OK.',
      extracted_fields: { covers_worldwide_assets: true },
    }));
    await orch.handleMessage(session, 'Yes worldwide');

    orch = new ConversationOrchestrator(mockLlm({
      message: 'Updated.',
      extracted_fields: { covers_worldwide_assets: false },
    }));
    await orch.handleMessage(session, 'Actually no, domestic only');
    expect(session.state.covers_worldwide_assets.value).toBe(false);
    expect(session.state.covers_worldwide_assets.status).toBe('confirmed');
  });

  it('corrects children list', async () => {
    const session = createSession();

    let orch = new ConversationOrchestrator(mockLlm({
      message: 'OK.',
      extracted_fields: {
        has_children: true,
        children: [{ name: 'James', age: 10 }],
      },
    }));
    await orch.handleMessage(session, 'I have one son James, age 10');
    expect(session.state.children.value).toHaveLength(1);

    // Correct: actually two children
    orch = new ConversationOrchestrator(mockLlm({
      message: 'Updated.',
      extracted_fields: {
        children: [{ name: 'James', age: 10 }, { name: 'Emily', age: 8 }],
      },
    }));
    await orch.handleMessage(session, 'I also have a daughter Emily age 8');
    expect(session.state.children.value).toHaveLength(2);
    expect(session.state.children.value![1].name).toBe('Emily');
  });

  it('corrects executor', async () => {
    const session = createSession();

    let orch = new ConversationOrchestrator(mockLlm({
      message: 'OK.',
      extracted_fields: { executor: { name: 'John', relationship: 'brother' } },
    }));
    await orch.handleMessage(session, 'My executor is John, my brother');
    expect(session.state.executor.value!.name).toBe('John');

    // Correct executor
    orch = new ConversationOrchestrator(mockLlm({
      message: 'Updated.',
      extracted_fields: { executor: { name: 'James', relationship: 'son' } },
    }));
    await orch.handleMessage(session, 'Actually, my executor is James, my son');
    expect(session.state.executor.value!.name).toBe('James');
    expect(session.state.executor.value!.relationship).toBe('son');
  });

  it('corrects specific_gifts', async () => {
    const session = createSession();

    let orch = new ConversationOrchestrator(mockLlm({
      message: 'OK.',
      extracted_fields: {
        specific_gifts: [{ item: 'Watch', recipient: 'James' }],
      },
    }));
    await orch.handleMessage(session, 'My watch to James');

    // Correct: actually give the watch to Emily
    orch = new ConversationOrchestrator(mockLlm({
      message: 'Updated.',
      extracted_fields: {
        specific_gifts: [{ item: 'Watch', recipient: 'Emily' }],
      },
    }));
    await orch.handleMessage(session, 'Actually, give the watch to Emily');
    expect(session.state.specific_gifts.value![0].recipient).toBe('Emily');
  });

  it('corrects additional_wishes', async () => {
    const session = createSession();

    let orch = new ConversationOrchestrator(mockLlm({
      message: 'OK.',
      extracted_fields: { additional_wishes: 'Simple funeral.' },
    }));
    await orch.handleMessage(session, 'Simple funeral');

    orch = new ConversationOrchestrator(mockLlm({
      message: 'Updated.',
      extracted_fields: { additional_wishes: 'Cremation and scatter ashes at sea.' },
    }));
    await orch.handleMessage(session, 'Actually I want cremation and ashes scattered at sea');
    expect(session.state.additional_wishes.value).toBe('Cremation and scatter ashes at sea.');
  });

  it('document reflects corrected values, not old values', async () => {
    const session = createSession();

    let orch = new ConversationOrchestrator(mockLlm({
      message: 'OK.',
      extracted_fields: { full_name: 'Jane Doe', executor: { name: 'John', relationship: 'brother' } },
    }));
    await orch.handleMessage(session, 'Jane Doe, executor John my brother');

    // Correct both
    orch = new ConversationOrchestrator(mockLlm({
      message: 'Updated.',
      extracted_fields: { full_name: 'Jane Smith', executor: { name: 'James', relationship: 'son' } },
    }));
    const result = await orch.handleMessage(session, 'Corrections');
    expect(result.success).toBe(true);
    if (result.success) {
      // Document should have new values
      expect(result.data.document).toContain('Jane Smith');
      expect(result.data.document).toContain('James');
      expect(result.data.document).toContain('son');
      // Document should NOT have old values
      expect(result.data.document).not.toContain('Jane Doe');
      expect(result.data.document).not.toContain('John');
      expect(result.data.document).not.toMatch(/\bbrother\b/);
    }
  });
});
