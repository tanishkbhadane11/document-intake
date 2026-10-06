import type { LlmService, LlmResponse, Message } from '../types.js';
import type { AppConfig } from '../config.js';

// ─── OpenAI LLM Service ─────────────────────────────────────
// Concrete implementation of LlmService using the OpenAI API.
// Uses raw fetch to avoid an extra SDK dependency.

export class OpenAiService implements LlmService {
  private apiKey: string;
  private model: string;
  private baseUrl = process.env.LLM_BASE_URL || 'https://api.openai.com/v1/chat/completions';

  constructor(config: AppConfig['llm']) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async chat(messages: Message[]): Promise<LlmResponse> {
    if (!this.apiKey) {
      throw new Error(
        'LLM_API_KEY is not configured. Set it in your .env file.'
      );
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown error');
      throw new Error(
        `OpenAI API error (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    // Raw content is returned as string — parsing/validation
    // happens in the llm-parser layer, not here.
    return JSON.parse(content) as LlmResponse;
  }
}
