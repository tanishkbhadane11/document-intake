import { z } from 'zod';

// ─── Zod Schemas ─────────────────────────────────────────────
// Mirror the TypeScript types but as runtime-validated schemas.
// Used to validate both internal state and LLM output.

const FieldStatusSchema = z.enum(['unknown', 'unconfirmed', 'confirmed']);

/** Generic field wrapper schema factory. */
function fieldSchema<T extends z.ZodType>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable(),
    status: FieldStatusSchema,
  });
}

export const ChildSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0).max(150).optional(),
});

export const ExecutorSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
});

export const SpecificGiftSchema = z.object({
  item: z.string().min(1),
  recipient: z.string().min(1),
});

/** Full state schema — validates the entire PersonalWishesState object. */
export const PersonalWishesStateSchema = z.object({
  full_name: fieldSchema(z.string().min(1)),
  home_address: fieldSchema(z.string().min(1)),
  covers_worldwide_assets: fieldSchema(z.boolean()),
  has_children: fieldSchema(z.boolean()),
  children: fieldSchema(z.array(ChildSchema)),
  executor: fieldSchema(ExecutorSchema),
  specific_gifts: fieldSchema(z.array(SpecificGiftSchema)),
  additional_wishes: fieldSchema(z.string()),
});

/**
 * Schema for fields extracted by the LLM.
 * Every field is optional because the LLM may only return a subset
 * from a single user message. Uses .strip() to discard any
 * unexpected keys the LLM might invent.
 */
export const LlmExtractedFieldsSchema = z.object({
  full_name: z.string().min(1).nullable().optional(),
  home_address: z.string().min(1).nullable().optional(),
  covers_worldwide_assets: z.boolean().nullable().optional(),
  has_children: z.boolean().nullable().optional(),
  children: z.array(ChildSchema).nullable().optional(),
  executor: ExecutorSchema.nullable().optional(),
  specific_gifts: z.array(SpecificGiftSchema).nullable().optional(),
  additional_wishes: z.string().nullable().optional(),
}).strip();

/** Schema for the full LLM response payload. Uses .strip() to discard unexpected top-level keys. */
export const LlmResponseSchema = z.object({
  message: z.string().min(1),
  extracted_fields: LlmExtractedFieldsSchema,
}).strip();
