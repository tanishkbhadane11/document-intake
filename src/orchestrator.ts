import type { LlmService, Session, Message } from './types.js';
import { buildLlmMessages } from './prompts.js';
import { parseLlmResponse, mergeExtractedFields } from './llm-parser.js';
import { addMessage, updateSession } from './state.js';
import { generateDocument } from './document.js';
import { LlmResponseSchema } from './schemas.js';

// ─── Conversation Orchestration ──────────────────────────────
// Central service that ties together the conversation flow:
// user message → LLM call → validate → merge state → generate doc

export interface OrchestratorResult {
  assistantMessage: string;
  state: Session['state'];
  document: string;
}

export interface OrchestratorError {
  error: string;
  /** The session is still usable — state wasn't corrupted. */
  recoverable: boolean;
}

export type OrchestratorResponse = 
  | { success: true; data: OrchestratorResult }
  | { success: false; error: OrchestratorError };

export class ConversationOrchestrator {
  constructor(private llmService: LlmService) {}

  async handleMessage(
    session: Session,
    userMessage: string,
  ): Promise<OrchestratorResponse> {
    // 1. Record the user message
    const userMsg: Message = { role: 'user', content: userMessage };
    addMessage(session, userMsg);

    try {
      // 2. Build the prompt with current state + history
      const llmMessages = buildLlmMessages(session.state, session.messages);

      // 3. Call the LLM
      let rawResponse: unknown;
      try {
        rawResponse = await this.llmService.chat(llmMessages);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown LLM error';
        
        // Add a fallback assistant message so the conversation can continue
        const fallbackMsg: Message = {
          role: 'assistant',
          content: 'I apologise, but I\'m having trouble connecting to my AI service right now. Could you please try again in a moment?',
        };
        addMessage(session, fallbackMsg);
        updateSession(session);

        return {
          success: false,
          error: {
            error: `LLM service error: ${errorMessage}`,
            recoverable: true,
          },
        };
      }

      // 4. Validate the LLM response structure
      const validationResult = LlmResponseSchema.safeParse(rawResponse);

      if (!validationResult.success) {
        const issues = validationResult.error.issues
          .map(i => `${i.path.join('.')}: ${i.message}`)
          .join('; ');

        const fallbackMsg: Message = {
          role: 'assistant',
          content: 'I had trouble processing that. Could you please rephrase or try again?',
        };
        addMessage(session, fallbackMsg);
        updateSession(session);

        return {
          success: false,
          error: {
            error: `Malformed LLM response: ${issues}`,
            recoverable: true,
          },
        };
      }

      const llmResponse = validationResult.data;

      // 5. Merge extracted fields into state
      session.state = mergeExtractedFields(
        session.state,
        llmResponse.extracted_fields,
      );

      // 6. Record the assistant message
      const assistantMsg: Message = {
        role: 'assistant',
        content: llmResponse.message,
      };
      addMessage(session, assistantMsg);

      // 7. Generate the draft document
      const document = generateDocument(session.state);

      // 8. Persist
      updateSession(session);

      return {
        success: true,
        data: {
          assistantMessage: llmResponse.message,
          state: session.state,
          document,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: {
          error: `Unexpected error: ${errorMessage}`,
          recoverable: true,
        },
      };
    }
  }
}
