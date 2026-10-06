import { describe, it, expect } from 'vitest';
import { parseLlmResponse, mergeExtractedFields } from '../llm-parser.js';
import { createEmptyState } from '../state.js';

describe('parseLlmResponse', () => {
  it('parses a valid JSON response with multiple fields', () => {
    const raw = JSON.stringify({
      message: 'Thanks! I have your name and address.',
      extracted_fields: {
        full_name: 'Jane Doe',
        home_address: '42 Elm Street, London',
      },
    });

    const result = parseLlmResponse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toBe('Thanks! I have your name and address.');
      expect(result.extractedFields.full_name).toBe('Jane Doe');
      expect(result.extractedFields.home_address).toBe('42 Elm Street, London');
    }
  });

  it('rejects invalid JSON', () => {
    const result = parseLlmResponse('this is not json {{{');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('invalid JSON');
    }
  });

  it('rejects JSON missing required fields', () => {
    const raw = JSON.stringify({ foo: 'bar' });
    const result = parseLlmResponse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('validation failed');
    }
  });

  it('rejects response with empty message', () => {
    const raw = JSON.stringify({
      message: '',
      extracted_fields: {},
    });
    const result = parseLlmResponse(raw);
    expect(result.success).toBe(false);
  });

  it('accepts response with empty extracted_fields', () => {
    const raw = JSON.stringify({
      message: 'Could you tell me more?',
      extracted_fields: {},
    });
    const result = parseLlmResponse(raw);
    expect(result.success).toBe(true);
  });

  it('rejects malformed executor (missing relationship)', () => {
    const raw = JSON.stringify({
      message: 'Noted.',
      extracted_fields: {
        executor: { name: 'John' },
      },
    });
    const result = parseLlmResponse(raw);
    expect(result.success).toBe(false);
  });
});

describe('mergeExtractedFields', () => {
  it('merges a single field into empty state', () => {
    const state = createEmptyState();
    const updated = mergeExtractedFields(state, { full_name: 'Jane Doe' });

    expect(updated.full_name.value).toBe('Jane Doe');
    expect(updated.full_name.status).toBe('confirmed');
    // Other fields should remain unknown
    expect(updated.home_address.status).toBe('unknown');
  });

  it('merges multiple fields at once', () => {
    const state = createEmptyState();
    const updated = mergeExtractedFields(state, {
      full_name: 'Jane Doe',
      has_children: true,
      children: [{ name: 'Tom', age: 12 }, { name: 'Lisa' }],
    });

    expect(updated.full_name.value).toBe('Jane Doe');
    expect(updated.full_name.status).toBe('confirmed');
    expect(updated.has_children.value).toBe(true);
    expect(updated.has_children.status).toBe('confirmed');
    expect(updated.children.value).toHaveLength(2);
    expect(updated.children.status).toBe('confirmed');
  });

  it('supports correcting a previously confirmed field', () => {
    let state = createEmptyState();
    state = mergeExtractedFields(state, { full_name: 'Jane Doe' });
    expect(state.full_name.value).toBe('Jane Doe');

    // User corrects their name
    state = mergeExtractedFields(state, { full_name: 'Jane Smith' });
    expect(state.full_name.value).toBe('Jane Smith');
    expect(state.full_name.status).toBe('confirmed');
  });

  it('resets a field to unknown when null is provided', () => {
    let state = createEmptyState();
    state = mergeExtractedFields(state, { full_name: 'Jane Doe' });
    expect(state.full_name.status).toBe('confirmed');

    // LLM sends null to clear the field
    state = mergeExtractedFields(state, { full_name: null });
    expect(state.full_name.value).toBeNull();
    expect(state.full_name.status).toBe('unknown');
  });

  it('does not modify fields that are not in extracted_fields', () => {
    let state = createEmptyState();
    state = mergeExtractedFields(state, { full_name: 'Jane Doe' });

    // Only update address — name should remain
    state = mergeExtractedFields(state, { home_address: '123 Main St' });

    expect(state.full_name.value).toBe('Jane Doe');
    expect(state.full_name.status).toBe('confirmed');
    expect(state.home_address.value).toBe('123 Main St');
    expect(state.home_address.status).toBe('confirmed');
  });

  it('handles executor field correctly', () => {
    const state = createEmptyState();
    const updated = mergeExtractedFields(state, {
      executor: { name: 'John Smith', relationship: 'brother' },
    });

    expect(updated.executor.value).toEqual({ name: 'John Smith', relationship: 'brother' });
    expect(updated.executor.status).toBe('confirmed');
  });

  it('handles specific_gifts field correctly', () => {
    const state = createEmptyState();
    const updated = mergeExtractedFields(state, {
      specific_gifts: [
        { item: 'Piano', recipient: 'Tom' },
        { item: 'Ring', recipient: 'Lisa' },
      ],
    });

    expect(updated.specific_gifts.value).toHaveLength(2);
    expect(updated.specific_gifts.status).toBe('confirmed');
  });
});
