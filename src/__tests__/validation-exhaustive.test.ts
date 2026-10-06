import { describe, it, expect } from 'vitest';
import { LlmResponseSchema, LlmExtractedFieldsSchema } from '../schemas.js';

// ─── LLM response validation exhaustive tests ────────────────
// Point 7: Validates every possible kind of malformed/invalid
// LLM response to ensure bad data never reaches state.

describe('LLM response validation — exhaustive', () => {
  // ── Invalid JSON structure ──
  describe('invalid JSON structure', () => {
    it('rejects a response that is a string', () => {
      const result = LlmResponseSchema.safeParse('just a string');
      expect(result.success).toBe(false);
    });

    it('rejects a response that is a number', () => {
      const result = LlmResponseSchema.safeParse(42);
      expect(result.success).toBe(false);
    });

    it('rejects a response that is null', () => {
      const result = LlmResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('rejects a response that is an array', () => {
      const result = LlmResponseSchema.safeParse([{ message: 'hi' }]);
      expect(result.success).toBe(false);
    });

    it('rejects an empty object', () => {
      const result = LlmResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ── Missing required properties ──
  describe('missing required properties', () => {
    it('rejects when message is missing', () => {
      const result = LlmResponseSchema.safeParse({
        extracted_fields: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects when extracted_fields is missing', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'Hello!',
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Incorrect data types ──
  describe('incorrect data types', () => {
    it('rejects when message is a number', () => {
      const result = LlmResponseSchema.safeParse({
        message: 123,
        extracted_fields: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects when extracted_fields is a string', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'Hello',
        extracted_fields: 'not an object',
      });
      expect(result.success).toBe(false);
    });

    it('rejects when full_name is a number', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: { full_name: 42 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects when has_children is a string instead of boolean', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: { has_children: 'yes' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects when covers_worldwide_assets is a string instead of boolean', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: { covers_worldwide_assets: 'true' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects when children is an object instead of array', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: { children: { name: 'Tom' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects when executor is a string', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: { executor: 'John' },
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Invalid field shapes ──
  describe('invalid field shapes', () => {
    it('rejects executor missing relationship', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          executor: { name: 'John' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects executor missing name', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          executor: { relationship: 'brother' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects child with empty name', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          children: [{ name: '' }],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects child with negative age', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          children: [{ name: 'Tom', age: -1 }],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects child with non-integer age', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          children: [{ name: 'Tom', age: 5.5 }],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects specific_gift with empty item', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          specific_gifts: [{ item: '', recipient: 'Tom' }],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects specific_gift with empty recipient', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          specific_gifts: [{ item: 'Watch', recipient: '' }],
        },
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Unexpected fields are stripped ──
  describe('unexpected fields are stripped', () => {
    it('strips unknown top-level keys from LLM response', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'Hello',
        extracted_fields: {},
        confidence: 0.95,
        internal_notes: 'something',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('confidence');
        expect(result.data).not.toHaveProperty('internal_notes');
      }
    });

    it('strips unknown keys from extracted_fields', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'Hello',
        extracted_fields: {
          full_name: 'Jane',
          favourite_color: 'blue',
          social_security: '123-45-6789',
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extracted_fields).not.toHaveProperty('favourite_color');
        expect(result.data.extracted_fields).not.toHaveProperty('social_security');
        expect(result.data.extracted_fields.full_name).toBe('Jane');
      }
    });
  });

  // ── Valid edge cases ──
  describe('valid edge cases', () => {
    it('accepts empty extracted_fields', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'Could you clarify?',
        extracted_fields: {},
      });
      expect(result.success).toBe(true);
    });

    it('accepts null values (field clearing)', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'Cleared.',
        extracted_fields: {
          full_name: null,
          home_address: null,
          covers_worldwide_assets: null,
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts children with age omitted', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          children: [{ name: 'Tom' }],
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty arrays for children and gifts', () => {
      const result = LlmResponseSchema.safeParse({
        message: 'OK',
        extracted_fields: {
          children: [],
          specific_gifts: [],
        },
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Partially valid responses', () => {
  it('rejects response where message is valid but extracted_fields has wrong types', () => {
    const result = LlmResponseSchema.safeParse({
      message: 'This message is fine',
      extracted_fields: {
        full_name: 42,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects response where one child is valid and another is invalid', () => {
    const result = LlmResponseSchema.safeParse({
      message: 'OK',
      extracted_fields: {
        children: [
          { name: 'Valid Child', age: 10 },
          { name: '', age: -5 },
        ],
      },
    });
    expect(result.success).toBe(false);
  });
});
