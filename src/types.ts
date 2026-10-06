// ─── Types ───────────────────────────────────────────────────
// Core domain types for the Personal Wishes Document intake.
// A field can be "unknown" (not yet asked), "unconfirmed" (LLM suggested
// but not validated by user), or a concrete value.

/** Sentinel for values the user hasn't provided yet. */
export const UNKNOWN = 'unknown' as const;

/** Sentinel for values the LLM suggested but the user hasn't confirmed. */
export const UNCONFIRMED = 'unconfirmed' as const;

export type FieldStatus = typeof UNKNOWN | typeof UNCONFIRMED;

/**
 * Wraps every collectable field so we can distinguish between
 * "not yet gathered", "suggested but unconfirmed", and "confirmed".
 */
export type Field<T> = {
  value: T | null;
  status: 'unknown' | 'unconfirmed' | 'confirmed';
};

export interface Child {
  name: string;
  age?: number;
}

export interface Executor {
  name: string;
  relationship: string;
}

export interface SpecificGift {
  item: string;
  recipient: string;
}

/**
 * The structured state collected during the conversation.
 * Every field is wrapped in Field<T> to track its status.
 */
export interface PersonalWishesState {
  full_name: Field<string>;
  home_address: Field<string>;
  covers_worldwide_assets: Field<boolean>;
  has_children: Field<boolean>;
  children: Field<Child[]>;
  executor: Field<Executor>;
  specific_gifts: Field<SpecificGift[]>;
  additional_wishes: Field<string>;
}

/** A single message in the conversation. */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Represents a full conversation session. */
export interface Session {
  id: string;
  state: PersonalWishesState;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// ─── LLM Types ───────────────────────────────────────────────

/**
 * The structured data we expect the LLM to return alongside its
 * conversational reply. Each key is optional — the LLM only returns
 * fields it extracted from the latest user message.
 */
export interface LlmExtractedFields {
  full_name?: string | null;
  home_address?: string | null;
  covers_worldwide_assets?: boolean | null;
  has_children?: boolean | null;
  children?: Child[] | null;
  executor?: Executor | null;
  specific_gifts?: SpecificGift[] | null;
  additional_wishes?: string | null;
}

/** The shape we require back from the LLM. */
export interface LlmResponse {
  message: string;
  extracted_fields: LlmExtractedFields;
}

/** Interface every LLM provider must implement. */
export interface LlmService {
  chat(messages: Message[]): Promise<LlmResponse>;
}
