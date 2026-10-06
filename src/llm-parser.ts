import type { LlmExtractedFields, PersonalWishesState } from './types.js';
import { LlmResponseSchema } from './schemas.js';

// ─── LLM Response Parsing & Validation ──────────────────────

export interface ParseSuccess {
  success: true;
  message: string;
  extractedFields: LlmExtractedFields;
}

export interface ParseFailure {
  success: false;
  error: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

/**
 * Parses raw LLM output (expected as JSON string) and validates
 * it against our schema. Never trusts the LLM blindly.
 */
export function parseLlmResponse(raw: string): ParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: 'LLM returned invalid JSON' };
  }

  const result = LlmResponseSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return { success: false, error: `LLM response validation failed: ${issues}` };
  }

  return {
    success: true,
    message: result.data.message,
    extractedFields: result.data.extracted_fields,
  };
}

/**
 * Merges validated extracted fields into the current state.
 * Only updates fields that the LLM actually returned.
 * Supports corrections — if a field was already confirmed,
 * the new value overwrites it.
 */
export function mergeExtractedFields(
  state: PersonalWishesState,
  fields: LlmExtractedFields,
): PersonalWishesState {
  const updated = { ...state };

  if (fields.full_name !== undefined) {
    updated.full_name = {
      value: fields.full_name,
      status: fields.full_name !== null ? 'confirmed' : 'unknown',
    };
  }

  if (fields.home_address !== undefined) {
    updated.home_address = {
      value: fields.home_address,
      status: fields.home_address !== null ? 'confirmed' : 'unknown',
    };
  }

  if (fields.covers_worldwide_assets !== undefined) {
    updated.covers_worldwide_assets = {
      value: fields.covers_worldwide_assets,
      status: fields.covers_worldwide_assets !== null ? 'confirmed' : 'unknown',
    };
  }

  if (fields.has_children !== undefined) {
    updated.has_children = {
      value: fields.has_children,
      status: fields.has_children !== null ? 'confirmed' : 'unknown',
    };
  }

  if (fields.children !== undefined) {
    updated.children = {
      value: fields.children,
      status: fields.children !== null ? 'confirmed' : 'unknown',
    };
  }

  if (fields.executor !== undefined) {
    updated.executor = {
      value: fields.executor,
      status: fields.executor !== null ? 'confirmed' : 'unknown',
    };
  }

  if (fields.specific_gifts !== undefined) {
    updated.specific_gifts = {
      value: fields.specific_gifts,
      status: fields.specific_gifts !== null ? 'confirmed' : 'unknown',
    };
  }

  if (fields.additional_wishes !== undefined) {
    updated.additional_wishes = {
      value: fields.additional_wishes,
      status: fields.additional_wishes !== null ? 'confirmed' : 'unknown',
    };
  }

  return updated;
}
