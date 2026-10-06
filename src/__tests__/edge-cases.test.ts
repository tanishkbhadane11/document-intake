import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationOrchestrator } from '../orchestrator.js';
import { createSession, clearAllSessions } from '../state.js';
import { generateDocument } from '../document.js';
import { mergeExtractedFields } from '../llm-parser.js';
import { createEmptyState } from '../state.js';
import type { LlmService, LlmResponse, PersonalWishesState } from '../types.js';

// ─── Ambiguity, contradiction, and missing info tests ────────
// Points 4, 5, 6: Tests that the system handles ambiguous input,
// contradictory information, and missing data correctly.

function mockLlm(response: LlmResponse): LlmService {
  return {
    chat: vi.fn(async () => response),
  };
}

beforeEach(() => {
  clearAllSessions();
});

describe('Ambiguous information', () => {
  it('LLM asks for clarification without setting incomplete executor (name only)', async () => {
    // When user says "My executor will be Alex" without relationship,
    // the LLM should ask for relationship and NOT set the executor field.
    const llm = mockLlm({
      message: 'Thank you! What is Alex\'s relationship to you? For example, are they a friend, sibling, or spouse?',
      extracted_fields: {}, // No executor set — correctly asking for more info
    });

    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'My executor will be Alex');
    expect(result.success).toBe(true);
    if (result.success) {
      // Executor should remain unknown since we don't have the relationship
      expect(result.data.state.executor.status).toBe('unknown');
      expect(result.data.state.executor.value).toBeNull();
    }
  });

  it('ambiguous "Yes" does not incorrectly set a field', async () => {
    // When the user says just "Yes" without clear context, the LLM
    // should ask for clarification rather than guessing.
    const llm = mockLlm({
      message: 'I want to make sure I understand correctly. Could you tell me what you\'re saying yes to?',
      extracted_fields: {},
    });

    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(session, 'Yes');
    expect(result.success).toBe(true);
    if (result.success) {
      // No fields should be set
      const s = result.data.state;
      expect(s.full_name.status).toBe('unknown');
      expect(s.home_address.status).toBe('unknown');
      expect(s.covers_worldwide_assets.status).toBe('unknown');
      expect(s.has_children.status).toBe('unknown');
    }
  });
});

describe('Contradictory information', () => {
  it('contradiction: said no children, then mentions a child', async () => {
    const session = createSession();

    // Step 1: User says no children
    const orch1 = new ConversationOrchestrator(mockLlm({
      message: 'No children, noted.',
      extracted_fields: { has_children: false },
    }));
    await orch1.handleMessage(session, 'I do not have children');
    expect(session.state.has_children.value).toBe(false);

    // Step 2: User contradicts by mentioning a son.
    // A well-behaved LLM should notice the contradiction and ask
    // for clarification WITHOUT updating the field.
    const orch2 = new ConversationOrchestrator(mockLlm({
      message: 'I notice you previously mentioned you don\'t have children, ' +
        'but now you\'re mentioning a son named James. Could you clarify — ' +
        'do you have children?',
      extracted_fields: {}, // No update — asking for clarification
    }));
    const result = await orch2.handleMessage(session, 'I have a son named James');

    expect(result.success).toBe(true);
    if (result.success) {
      // The state should still say no children (not updated because contradictory)
      // The LLM asked for clarification instead of silently overwriting
      expect(result.data.state.has_children.value).toBe(false);
      expect(result.data.assistantMessage).toContain('clarif');
    }
  });

  it('contradiction resolved: user confirms the correction', async () => {
    const session = createSession();

    // Step 1: No children
    const orch1 = new ConversationOrchestrator(mockLlm({
      message: 'Noted.',
      extracted_fields: { has_children: false },
    }));
    await orch1.handleMessage(session, 'No children');
    expect(session.state.has_children.value).toBe(false);

    // Step 2: Contradiction detected (LLM asks)
    const orch2 = new ConversationOrchestrator(mockLlm({
      message: 'Could you clarify?',
      extracted_fields: {},
    }));
    await orch2.handleMessage(session, 'I have a son James');

    // Step 3: User confirms the correction
    const orch3 = new ConversationOrchestrator(mockLlm({
      message: 'Updated! You have one son, James.',
      extracted_fields: {
        has_children: true,
        children: [{ name: 'James' }],
      },
    }));
    const result = await orch3.handleMessage(session, 'Yes, I do have a son. I made a mistake earlier.');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state.has_children.value).toBe(true);
      expect(result.data.state.children.value).toHaveLength(1);
      expect(result.data.state.children.value![0].name).toBe('James');
    }
  });
});

describe('Missing information', () => {
  it('unknown fields remain null/unknown when not provided', async () => {
    const session = createSession();

    // User only provides name — everything else should stay unknown
    const orch = new ConversationOrchestrator(mockLlm({
      message: 'Thanks Jane! What\'s your home address?',
      extracted_fields: { full_name: 'Jane Smith' },
    }));
    await orch.handleMessage(session, 'My name is Jane Smith');

    expect(session.state.full_name.value).toBe('Jane Smith');
    expect(session.state.home_address.status).toBe('unknown');
    expect(session.state.home_address.value).toBeNull();
    expect(session.state.covers_worldwide_assets.status).toBe('unknown');
    expect(session.state.has_children.status).toBe('unknown');
    expect(session.state.children.status).toBe('unknown');
    expect(session.state.executor.status).toBe('unknown');
    expect(session.state.specific_gifts.status).toBe('unknown');
    expect(session.state.additional_wishes.status).toBe('unknown');
  });

  it('document shows placeholders for unknown fields', () => {
    const state = createEmptyState();
    state.full_name = { value: 'Jane Smith', status: 'confirmed' };
    // Only name confirmed — rest are unknown

    const doc = generateDocument(state);
    expect(doc).toContain('Jane Smith');
    expect(doc).toContain('[Not yet provided]'); // address
    expect(doc).toContain('[Not yet confirmed]'); // worldwide assets
    expect(doc).toContain('[Not yet confirmed]'); // has children
    expect(doc).toContain('[Not yet designated]'); // executor
    expect(doc).toContain('No specific gifts designated');
    expect(doc).toContain('No additional wishes recorded');
  });

  it('mergeExtractedFields does not fill in missing fields', () => {
    const state = createEmptyState();
    // Only provide one field
    const updated = mergeExtractedFields(state, { full_name: 'Jane' });

    // The provided field should be set
    expect(updated.full_name.value).toBe('Jane');
    expect(updated.full_name.status).toBe('confirmed');

    // All other fields should remain unknown
    expect(updated.home_address.status).toBe('unknown');
    expect(updated.home_address.value).toBeNull();
    expect(updated.covers_worldwide_assets.status).toBe('unknown');
    expect(updated.has_children.status).toBe('unknown');
    expect(updated.children.status).toBe('unknown');
    expect(updated.executor.status).toBe('unknown');
    expect(updated.specific_gifts.status).toBe('unknown');
    expect(updated.additional_wishes.status).toBe('unknown');
  });
});

describe('Document preview consistency', () => {
  it('document always matches the latest state after a correction', () => {
    // Start with full state
    let state: PersonalWishesState = {
      full_name: { value: 'Jane Doe', status: 'confirmed' },
      home_address: { value: '10 Old Road', status: 'confirmed' },
      covers_worldwide_assets: { value: true, status: 'confirmed' },
      has_children: { value: true, status: 'confirmed' },
      children: { value: [{ name: 'Tom', age: 10 }], status: 'confirmed' },
      executor: { value: { name: 'John', relationship: 'brother' }, status: 'confirmed' },
      specific_gifts: { value: [{ item: 'Piano', recipient: 'Tom' }], status: 'confirmed' },
      additional_wishes: { value: 'Scatter ashes.', status: 'confirmed' },
    };

    // Correct multiple fields
    state = mergeExtractedFields(state, {
      full_name: 'Jane Smith',
      home_address: '20 New Road',
      executor: { name: 'James', relationship: 'son' },
    });

    const doc = generateDocument(state);

    // New values should be present
    expect(doc).toContain('Jane Smith');
    expect(doc).toContain('20 New Road');
    expect(doc).toContain('James');
    expect(doc).toContain('son');

    // Old values should NOT be present
    expect(doc).not.toContain('Jane Doe');
    expect(doc).not.toContain('10 Old Road');
    expect(doc).not.toContain('John');
    expect(doc).not.toMatch(/\bbrother\b/);

    // Unchanged fields should still be present
    expect(doc).toContain('Tom');
    expect(doc).toContain('Piano');
    expect(doc).toContain('Scatter ashes');
  });
});
