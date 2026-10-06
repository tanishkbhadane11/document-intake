import type { LlmService } from '../types.js';
import type { AppConfig } from '../config.js';
import { OpenAiService } from './openai.js';

// ─── LLM Factory ─────────────────────────────────────────────
// Single entry point for creating an LLM service instance.
// Add new providers here without touching the rest of the app.

export function createLlmService(config: AppConfig['llm']): LlmService {
  switch (config.provider) {
    case 'openai':
      return new OpenAiService(config);
    default:
      throw new Error(
        `Unknown LLM provider: "${config.provider}". ` +
        `Supported providers: openai`
      );
  }
}

export type { LlmService };
