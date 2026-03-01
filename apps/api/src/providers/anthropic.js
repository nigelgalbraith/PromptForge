/** Returns deterministic dummy output for the Anthropic provider. */
export async function generateWithAnthropic({ model, prompt }) {
  const snippet = buildSnippet(prompt);
  return `[DUMMY ANTHROPIC] model=${model}\n${snippet}`;
}


/** Builds a short prompt snippet for dummy responses. */
function buildSnippet(prompt) {
  const text = String(prompt || '');
  return text.slice(0, 120);
}

