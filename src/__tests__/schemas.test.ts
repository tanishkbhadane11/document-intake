import { describe, it, expect } from 'vitest';
import { LlmResponseSchema, PersonalWishesStateSchema, LlmExtractedFieldsSchema } from '../schemas.js';
import { createEmptyState } from '../state.js';

describe('PersonalWishesStateSchema', () => {
  it('validates a correct empty state', () => {
    const state = createEmptyState();
    const result = PersonalWishesStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('validates a fully populated state', () => {
    const state = {
      full_name: { value: 'Jane Doe', status: 'confirmed' },
      home_address: { value: '123 Main St', status: 'confirmed' },
      covers_worldwide_assets: { value: true, status: 'confirmed' },
      has_children: { value: true, status: 'confirmed' },
      children: { value: [{ name: 'Tom', age: 12 }], status: 'confirmed' },
      executor: { value: { name: 'John', relationship: 'brother' }, status: 'confirmed' },
      specific_gifts: { value: [{ item: 'Piano', recipient: 'Tom' }], status: 'confirmed' },
      additional_wishes: { value: 'Scatter ashes at sea', status: 'confirmed' },
    };

    const result = PersonalWishesStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('rejects invalid field status', () => {
    const state = createEmptyState();
    (state.full_name as any).status = 'invalid_status';

    const result = PersonalWishesStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it('rejects child with empty name', () => {
    const state = createEmptyState();
    state.children = { value: [{ name: '', age: 5 }], status: 'confirmed' };

    const result = PersonalWishesStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });
});

describe('LlmResponseSchema', () => {
  it('validates a correct LLM response with multiple fields', () => {
    const response = {
      message: 'Thank you for providing your information.',
      extracted_fields: {
        full_name: 'Jane Doe',
        has_children: true,
        children: [{ name: 'Tom', age: 12 }],
      },
    };

    const result = LlmResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('validates a response with empty extracted_fields', () => {
    const response = {
      message: 'Could you tell me more about that?',
      extracted_fields: {},
    };

    const result = LlmResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('rejects response with missing message', () => {
    const response = {
      extracted_fields: { full_name: 'Jane' },
    };

    const result = LlmResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('rejects response with empty message', () => {
    const response = {
      message: '',
      extracted_fields: {},
    };

    const result = LlmResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('rejects response with missing extracted_fields', () => {
    const response = {
      message: 'Hello!',
    };

    const result = LlmResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('rejects invalid executor shape', () => {
    const response = {
      message: 'Got it.',
      extracted_fields: {
        executor: { name: 'John' }, // missing relationship
      },
    };

    const result = LlmResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('accepts null values for fields (clearing a field)', () => {
    const response = {
      message: 'I have cleared that field.',
      extracted_fields: {
        full_name: null,
      },
    };

    const result = LlmResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('LlmExtractedFieldsSchema', () => {
  it('accepts specific_gifts as an array', () => {
    const fields = {
      specific_gifts: [
        { item: 'Watch', recipient: 'Son' },
        { item: 'Ring', recipient: 'Daughter' },
      ],
    };

    const result = LlmExtractedFieldsSchema.safeParse(fields);
    expect(result.success).toBe(true);
  });

  it('rejects specific_gift with empty item', () => {
    const fields = {
      specific_gifts: [{ item: '', recipient: 'Son' }],
    };

    const result = LlmExtractedFieldsSchema.safeParse(fields);
    expect(result.success).toBe(false);
  });
});
