import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationOrchestrator } from '../orchestrator.js';
import { createSession, clearAllSessions } from '../state.js';
import type { LlmService, LlmResponse, Message } from '../types.js';

// ─── Multi-turn conversation flow tests ──────────────────────
// Simulates a realistic step-by-step conversation where the user
// provides information across multiple messages. Verifies state
// is updated correctly after every turn and no data is lost.

/** Helper: creates a mock LLM service from a sequence of responses. */
function createSequentialMockLlm(responses: LlmResponse[]): LlmService {
  let callIndex = 0;
  return {
    chat: vi.fn(async (_msgs: Message[]): Promise<LlmResponse> => {
      const response = responses[callIndex];
      if (!response) {
        throw new Error(`Mock LLM: no response configured for call index ${callIndex}`);
      }
      callIndex++;
      return response;
    }),
  };
}

beforeEach(() => {
  clearAllSessions();
});

describe('Multi-turn conversation flow', () => {
  it('collects all fields across 8 sequential messages', async () => {
    const responses: LlmResponse[] = [
      {
        message: 'Nice to meet you, Jane!',
        extracted_fields: { full_name: 'Jane Smith' },
      },
      {
        message: 'Got your address, thank you.',
        extracted_fields: { home_address: '12 High Street, London' },
      },
      {
        message: 'Understood, worldwide coverage.',
        extracted_fields: { covers_worldwide_assets: true },
      },
      {
        message: 'Two children, James and Emily. Got it.',
        extracted_fields: {
          has_children: true,
          children: [{ name: 'James' }, { name: 'Emily' }],
        },
      },
      {
        message: 'Your brother John as executor, noted.',
        extracted_fields: {
          executor: { name: 'John', relationship: 'brother' },
        },
      },
      {
        message: 'Relationship already noted as brother.',
        extracted_fields: {},
      },
      {
        message: 'Watch to James — noted.',
        extracted_fields: {
          specific_gifts: [{ item: 'Watch', recipient: 'James' }],
        },
      },
      {
        message: 'Simple funeral recorded as your additional wishes.',
        extracted_fields: { additional_wishes: 'I want a simple funeral.' },
      },
    ];

    const llm = createSequentialMockLlm(responses);
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    // Turn 1: Name
    let result = await orchestrator.handleMessage(session, 'My name is Jane Smith.');
    expect(result.success).toBe(true);
    expect(session.state.full_name).toEqual({ value: 'Jane Smith', status: 'confirmed' });
    expect(session.state.home_address.status).toBe('unknown');

    // Turn 2: Address
    result = await orchestrator.handleMessage(session, 'I live at 12 High Street, London.');
    expect(result.success).toBe(true);
    expect(session.state.home_address).toEqual({ value: '12 High Street, London', status: 'confirmed' });
    // Name should still be confirmed from turn 1
    expect(session.state.full_name.value).toBe('Jane Smith');

    // Turn 3: Worldwide assets
    result = await orchestrator.handleMessage(session, 'Yes, it covers my assets worldwide.');
    expect(result.success).toBe(true);
    expect(session.state.covers_worldwide_assets).toEqual({ value: true, status: 'confirmed' });

    // Turn 4: Children
    result = await orchestrator.handleMessage(session, 'I have two children, James and Emily.');
    expect(result.success).toBe(true);
    expect(session.state.has_children).toEqual({ value: true, status: 'confirmed' });
    expect(session.state.children.value).toHaveLength(2);
    expect(session.state.children.value![0].name).toBe('James');
    expect(session.state.children.value![1].name).toBe('Emily');

    // Turn 5: Executor
    result = await orchestrator.handleMessage(session, 'My brother John will be my executor.');
    expect(result.success).toBe(true);
    expect(session.state.executor.value).toEqual({ name: 'John', relationship: 'brother' });

    // Turn 6: Redundant info (no state change expected)
    result = await orchestrator.handleMessage(session, 'He is my brother.');
    expect(result.success).toBe(true);
    expect(session.state.executor.value).toEqual({ name: 'John', relationship: 'brother' });

    // Turn 7: Specific gifts
    result = await orchestrator.handleMessage(session, 'I want to leave my watch to James.');
    expect(result.success).toBe(true);
    expect(session.state.specific_gifts.value).toHaveLength(1);
    expect(session.state.specific_gifts.value![0]).toEqual({ item: 'Watch', recipient: 'James' });

    // Turn 8: Additional wishes
    result = await orchestrator.handleMessage(session, 'I also want a simple funeral.');
    expect(result.success).toBe(true);
    expect(session.state.additional_wishes.value).toBe('I want a simple funeral.');

    // Final: All fields confirmed
    const s = session.state;
    expect(s.full_name.status).toBe('confirmed');
    expect(s.home_address.status).toBe('confirmed');
    expect(s.covers_worldwide_assets.status).toBe('confirmed');
    expect(s.has_children.status).toBe('confirmed');
    expect(s.children.status).toBe('confirmed');
    expect(s.executor.status).toBe('confirmed');
    expect(s.specific_gifts.status).toBe('confirmed');
    expect(s.additional_wishes.status).toBe('confirmed');

    // Verify conversation history has all messages
    // 8 user + 8 assistant = 16
    expect(session.messages).toHaveLength(16);
  });

  it('handles all fields in a single message', async () => {
    const llm = createSequentialMockLlm([{
      message: 'Wow, that is a lot of information! I have recorded everything.',
      extracted_fields: {
        full_name: 'Jane Smith',
        home_address: '12 High Street, London',
        covers_worldwide_assets: true,
        has_children: true,
        children: [{ name: 'James', age: 10 }, { name: 'Emily', age: 8 }],
        executor: { name: 'John', relationship: 'brother' },
        specific_gifts: [{ item: 'Watch', recipient: 'James' }],
        additional_wishes: 'Simple funeral.',
      },
    }]);

    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    const result = await orchestrator.handleMessage(
      session,
      'I\'m Jane Smith, I live in London, I have two children James and Emily, and my brother John is my executor.'
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const s = result.data.state;
      expect(s.full_name.value).toBe('Jane Smith');
      expect(s.home_address.value).toBe('12 High Street, London');
      expect(s.covers_worldwide_assets.value).toBe(true);
      expect(s.has_children.value).toBe(true);
      expect(s.children.value).toHaveLength(2);
      expect(s.executor.value).toEqual({ name: 'John', relationship: 'brother' });
      expect(s.specific_gifts.value).toHaveLength(1);
      expect(s.additional_wishes.value).toBe('Simple funeral.');
    }
  });

  it('document reflects the latest state after every turn', async () => {
    const responses: LlmResponse[] = [
      {
        message: 'Got it!',
        extracted_fields: { full_name: 'Jane Smith' },
      },
      {
        message: 'Address recorded.',
        extracted_fields: { home_address: '42 Elm St' },
      },
    ];

    const llm = createSequentialMockLlm(responses);
    const orchestrator = new ConversationOrchestrator(llm);
    const session = createSession();

    // After turn 1: document should have name but not address
    const r1 = await orchestrator.handleMessage(session, 'Jane Smith');
    expect(r1.success).toBe(true);
    if (r1.success) {
      expect(r1.data.document).toContain('Jane Smith');
      expect(r1.data.document).toContain('[Not yet provided]'); // address
    }

    // After turn 2: document should have both
    const r2 = await orchestrator.handleMessage(session, '42 Elm St');
    expect(r2.success).toBe(true);
    if (r2.success) {
      expect(r2.data.document).toContain('Jane Smith');
      expect(r2.data.document).toContain('42 Elm St');
    }
  });
});
