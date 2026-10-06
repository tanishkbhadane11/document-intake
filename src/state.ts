import type { PersonalWishesState, Session, Message } from './types.js';
import { v4 as uuidv4 } from 'uuid';

// ─── State Factory ───────────────────────────────────────────

/** Creates a blank PersonalWishesState with every field set to unknown. */
export function createEmptyState(): PersonalWishesState {
  return {
    full_name: { value: null, status: 'unknown' },
    home_address: { value: null, status: 'unknown' },
    covers_worldwide_assets: { value: null, status: 'unknown' },
    has_children: { value: null, status: 'unknown' },
    children: { value: null, status: 'unknown' },
    executor: { value: null, status: 'unknown' },
    specific_gifts: { value: null, status: 'unknown' },
    additional_wishes: { value: null, status: 'unknown' },
  };
}

// ─── Session Store ───────────────────────────────────────────
// In-memory session store. Swap this for a database-backed store
// in production without changing the rest of the application.

const sessions = new Map<string, Session>();

export function createSession(): Session {
  const now = new Date().toISOString();
  const session: Session = {
    id: uuidv4(),
    state: createEmptyState(),
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function updateSession(session: Session): void {
  session.updatedAt = new Date().toISOString();
  sessions.set(session.id, session);
}

export function resetSession(id: string): Session | undefined {
  const existing = sessions.get(id);
  if (!existing) return undefined;

  existing.state = createEmptyState();
  existing.messages = [];
  existing.updatedAt = new Date().toISOString();
  return existing;
}

export function addMessage(session: Session, message: Message): void {
  session.messages.push(message);
}

/** Clears all sessions — useful for testing. */
export function clearAllSessions(): void {
  sessions.clear();
}
