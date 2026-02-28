import { generateWithOpenAI } from '../providers/openai.js';
import { generateWithGemini } from '../providers/gemini.js';
import { generateWithAnthropic } from '../providers/anthropic.js';

export const providers = {
  openai: generateWithOpenAI,
  gemini: generateWithGemini,
  anthropic: generateWithAnthropic,
};
