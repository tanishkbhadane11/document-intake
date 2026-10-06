import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  llm: {
    provider: string;
    apiKey: string;
    model: string;
  };
}

export function loadConfig(): AppConfig {
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey || apiKey === 'your-api-key-here') {
    console.warn(
      '⚠️  LLM_API_KEY is not configured. LLM calls will fail. ' +
      'Copy .env.example to .env and set your key.'
    );
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    llm: {
      provider: process.env.LLM_PROVIDER || 'openai',
      apiKey: apiKey || '',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
    },
  };
}
