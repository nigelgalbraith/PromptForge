export const httpProviders = {
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://ollama:11434',
    path: '/api/generate',
    format: 'ollama_generate',
    responsePath: 'response',
    defaultOptions: { temperature: 0.3 },
  },
  localai: {
    baseUrl: process.env.LOCALAI_BASE_URL || 'http://localai:8080',
    path: '/v1/chat/completions',
    format: 'openai_chat',
    responsePath: 'choices.0.message.content',
    defaultOptions: { temperature: 0.3 },
  },
};

