import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildLlmMessages } from '../prompts.js';
import { createEmptyState } from '../state.js';

describe('buildSystemPrompt', () => {
  it('includes all field names in the prompt', () => {
    const state = createEmptyState();
    const prompt = buildSystemPrompt(state);

    expect(prompt).toContain('full_name');
    expect(prompt).toContain('home_address');
    expect(prompt).toContain('covers_worldwide_assets');
    expect(prompt).toContain('has_children');
    expect(prompt).toContain('children');
    expect(prompt).toContain('executor');
    expect(prompt).toContain('specific_gifts');
    expect(prompt).toContain('additional_wishes');
  });

  it('shows confirmed fields in the state snapshot', () => {
    const state = createEmptyState();
    state.full_name = { value: 'Jane Doe', status: 'confirmed' };

    const prompt = buildSystemPrompt(state);

    expect(prompt).toContain('"Jane Doe"');
    expect(prompt).toContain('[CONFIRMED]');
  });

  it('shows unknown fields in the state snapshot', () => {
    const state = createEmptyState();
    const prompt = buildSystemPrompt(state);

    expect(prompt).toContain('[UNKNOWN]');
  });

  it('requires JSON response format', () => {
    const state = createEmptyState();
    const prompt = buildSystemPrompt(state);

    expect(prompt).toContain('JSON');
    expect(prompt).toContain('extracted_fields');
  });
});

describe('buildLlmMessages', () => {
  it('prepends system message to conversation history', () => {
    const state = createEmptyState();
    const history = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi!' },
    ];

    const messages = buildLlmMessages(state, history);

    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[2].role).toBe('assistant');
  });

  it('works with empty conversation history', () => {
    const state = createEmptyState();
    const messages = buildLlmMessages(state, []);

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('system');
  });
});
