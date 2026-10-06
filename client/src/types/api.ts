// ─── Frontend API types ──────────────────────────────────────
// Mirrors the backend types needed for API communication.

export interface Field<T> {
  value: T | null;
  status: 'unknown' | 'unconfirmed' | 'confirmed';
}

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

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ─── API Response types ──────────────────────────────────────

export interface CreateSessionResponse {
  sessionId: string;
  state: PersonalWishesState;
  document: string;
  messages: Message[];
  assistantMessage: string;
}

export interface SendMessageResponse {
  sessionId: string;
  assistantMessage: string;
  state: PersonalWishesState;
  document: string;
  error?: string;
}

export interface GetSessionResponse {
  sessionId: string;
  state: PersonalWishesState;
  messages: Message[];
  document: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResetSessionResponse {
  sessionId: string;
  state: PersonalWishesState;
  messages: Message[];
  document: string;
}

export interface ApiError {
  error: string;
}
