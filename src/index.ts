import express from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { createRouter } from './routes.js';
import { createLlmService } from './llm/index.js';

const config = loadConfig();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
const llmService = createLlmService(config.llm);
app.use('/api', createRouter(llmService));

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Document Intake API running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   LLM Provider: ${config.llm.provider} (${config.llm.model})`);
});

export default app;
