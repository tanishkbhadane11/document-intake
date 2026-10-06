import { Router, Request, Response } from 'express';
import { createSession, getSession, resetSession } from './state.js';
import { generateDocument } from './document.js';
import { ConversationOrchestrator } from './orchestrator.js';
import type { LlmService } from './types.js';

// ─── API Routes ──────────────────────────────────────────────

/** Maximum allowed message length (characters). */
const MAX_MESSAGE_LENGTH = 10_000;

interface SessionParams {
  sessionId: string;
}

export function createRouter(llmService: LlmService): Router {
  const router = Router();
  const orchestrator = new ConversationOrchestrator(llmService);

  /**
   * POST /api/sessions
   * Creates a new conversation session.
   * Returns session ID, initial state, and a greeting message.
   */
  router.post('/sessions', (_req: Request, res: Response) => {
    const session = createSession();
    const document = generateDocument(session.state);

    res.status(201).json({
      sessionId: session.id,
      state: session.state,
      document,
      messages: [],
      assistantMessage:
        'Hello! I\'m here to help you create your Personal Wishes Document. ' +
        'Let\'s start — could you please tell me your full name?',
    });
  });

  /**
   * GET /api/sessions/:sessionId
   * Returns current session state, messages, and document.
   */
  router.get('/sessions/:sessionId', (req: Request<SessionParams>, res: Response) => {
    const session = getSession(req.params.sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const document = generateDocument(session.state);

    res.json({
      sessionId: session.id,
      state: session.state,
      messages: session.messages,
      document,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  });

  /**
   * POST /api/sessions/:sessionId/messages
   * Accepts a user message, processes it through the LLM,
   * and returns the updated state + assistant reply + document.
   */
  router.post('/sessions/:sessionId/messages', async (req: Request<SessionParams>, res: Response) => {
    const session = getSession(req.params.sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const { message } = req.body as { message?: string };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message is required and must be a non-empty string' });
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({
        error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      });
      return;
    }

    const result = await orchestrator.handleMessage(session, message.trim());

    if (result.success) {
      res.json({
        sessionId: session.id,
        assistantMessage: result.data.assistantMessage,
        state: result.data.state,
        document: result.data.document,
      });
    } else {
      // Return a 200 with error info — the session is still valid.
      // The fallback assistant message was already added to history.
      const document = generateDocument(session.state);
      res.status(result.error.recoverable ? 200 : 500).json({
        sessionId: session.id,
        assistantMessage: 'I apologise, but I had trouble processing that. Please try again.',
        state: session.state,
        document,
        error: result.error.error,
      });
    }
  });

  /**
   * POST /api/sessions/:sessionId/reset
   * Resets the session state and clears conversation history.
   */
  router.post('/sessions/:sessionId/reset', (req: Request<SessionParams>, res: Response) => {
    const session = resetSession(req.params.sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const document = generateDocument(session.state);

    res.json({
      sessionId: session.id,
      state: session.state,
      messages: [],
      document,
    });
  });

  return router;
}
