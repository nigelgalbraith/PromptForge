import { httpProviders } from '../config/provider_http.js';
const DEFAULT_TIMEOUT_MS = 600000;
function pickTimeoutMs(options) {
  const n = Number(options && options.timeoutMs);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TIMEOUT_MS;
  return n;
}


function buildRequestBody(format, params) {
  const { model, prompt, options } = params;
  const temperature = typeof options?.temperature === 'number' ? options.temperature : undefined;
  if (format === 'ollama_generate') {
    const body = { model, prompt, stream: false };
    if (temperature != null) body.options = { temperature };
    return body;
  }
  if (format === 'openai_chat') {
    const body = {
      model,
      messages: [{ role: 'user', content: prompt }],
    };
    if (temperature != null) body.temperature = temperature;
    return body;
  }
  throw new Error(`Unsupported HTTP provider format: ${format}`);
}


function getByPath(value, path) {
  const parts = String(path || '').split('.').filter(Boolean);
  let current = value;
  for (let i = 0; i < parts.length; i += 1) {
    const rawKey = parts[i];
    const key = /^\d+$/.test(rawKey) ? Number(rawKey) : rawKey;
    if (current == null || !(key in Object(current))) return undefined;
    current = current[key];
  }
  return current;
}


/**
 * generateWithHTTP.
 */
export async function generateWithHTTP({
  providerKey,
  model,
  prompt,
  options,
  requestFormatOverride,
  endpointOverride,
}) {
  const key = String(providerKey || '').toLowerCase();
  const cfg = httpProviders[key];
  if (!cfg) throw new Error(`Unsupported provider: ${key}`);
  const mergedOptions = {
    ...(cfg.defaultOptions && typeof cfg.defaultOptions === 'object' ? cfg.defaultOptions : {}),
    ...(options && typeof options === 'object' ? options : {}),
  };
  const format = String(requestFormatOverride || cfg.format || '').toLowerCase();
  const url = endpointOverride || `${cfg.baseUrl}${cfg.path}`;
  const timeoutMs = pickTimeoutMs(mergedOptions);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = buildRequestBody(format, { model, prompt, options: mergedOptions });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const rawBody = await response.text();
    if (!response.ok) {
      const detail = rawBody.slice(0, 500);
      throw new Error(`HTTP ${response.status} from ${key}: ${detail}`);
    }
    let payload = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      throw new Error(`Failed to parse ${key} JSON response`);
    }
    const extracted = getByPath(payload, cfg.responsePath);
    if (typeof extracted !== 'string') {
      throw new Error(`Missing string at responsePath: ${cfg.responsePath}`);
    }
    return extracted;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(`${key} request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

