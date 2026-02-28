import express from 'express';
import { providers } from '../config/providers.js';
import { httpProviders } from '../config/provider_http.js';
import { generateWithHTTP } from '../providers/http_generic.js';

export const generateRouter = express.Router();

/** Handles GET /api/ health checks. */
function handleApiRoot(_req, res) {
  return res.json({ status: 'ok' });
}


/** Handles POST /api/generate and dispatches the request to a provider. */
async function handleGenerate(req, res) {
  const provider = String(req.body?.provider || '').toLowerCase();
  const model = String(req.body?.model || '');
  const prompt = String(req.body?.prompt || '');
  const options = req.body?.options && typeof req.body.options === 'object' ? req.body.options : undefined;
  const handler = providers[provider];
  const isHttpProvider = !!httpProviders[provider];
  console.log('[api/generate] request', JSON.stringify({
    provider,
    model,
    promptLength: prompt.length,
    options: options ?? null,
  }));
  if (!provider || !model || !prompt) return res.status(400).json({ error: 'provider, model, and prompt are required' });
  if (!handler && !isHttpProvider) return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  try {
    const output = isHttpProvider
      ? await generateWithHTTP({ providerKey: provider, model, prompt, options })
      : await handler({ model, prompt, options });
    return res.json({ provider, model, output });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Provider call failed' });
  }
}

generateRouter.post('/generate', handleGenerate);
generateRouter.get('/', handleApiRoot);
