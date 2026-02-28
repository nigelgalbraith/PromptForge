/** Returns deterministic dummy output for the OpenAI provider. */


export async function generateWithOpenAI({ model, prompt }) {
  const snippet = buildSnippet(prompt);
  return `[DUMMY OPENAI] model=${model}\n${snippet}`;
}


/** Builds a short prompt snippet for dummy responses. */


function buildSnippet(prompt) {
  const text = String(prompt || '');
  return text.slice(0, 120);
}
