/** Returns deterministic dummy output for the Gemini provider. */


export async function generateWithGemini({ model, prompt }) {
  const snippet = buildSnippet(prompt);
  return `[DUMMY GEMINI] model=${model}\n${snippet}`;
}


/** Builds a short prompt snippet for dummy responses. */


function buildSnippet(prompt) {
  const text = String(prompt || '');
  return text.slice(0, 120);
}
