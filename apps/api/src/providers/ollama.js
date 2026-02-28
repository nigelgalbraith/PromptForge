/** Calls Ollama and returns generated text from the response payload. */
export async function generateWithOllama({ model, prompt, options }) {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
  const requestBody = { model, prompt, stream: false };
  if (options && typeof options === 'object' && Object.keys(options).length) requestBody.options = options;
  console.log('[ollama] request', JSON.stringify({ baseUrl, model, requestBody }));
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const rawBody = await response.text();
  console.log('[ollama] response', JSON.stringify({ status: response.status, body: rawBody }));
  if (!response.ok) {
    const error = new Error(`Ollama request failed: HTTP ${response.status} - ${rawBody}`);
    error.upstreamStatus = response.status;
    error.upstreamBody = rawBody;
    try {
      error.upstreamJson = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      error.upstreamJson = null;
    }
    throw error;
  }
  let data;
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new Error(`Ollama response parse failed: ${rawBody}`);
  }
  const output = typeof data.response === 'string' ? data.response : '';
  return output;
}
