const DEFAULT_PROVIDER = 'ollama';
const DEFAULT_MODEL_TEXT = '(none)';
function resolveProviderModel(profile) {
  const defaults = profile && typeof profile === 'object' && profile.defaults && typeof profile.defaults === 'object'
    ? profile.defaults
    : {};
  const provider = String(defaults.provider || DEFAULT_PROVIDER).toLowerCase();
  const modelRaw = String(defaults.model || '').trim();
  const model = modelRaw || DEFAULT_MODEL_TEXT;
  return { provider, model };
}
// Build a read-only pane showing active provider/model from profile defaults.
/**
 * buildGeneratorProviderModelPane.
 */
export function buildGeneratorProviderModelPane(options = {}) {
  const {
    state = null,
    events = null,
    stateKey = 'TEXT_PROFILE',
    title = 'Model in Use',
  } = options;
  const node = document.createElement('div');
  node.className = 'pane-generator-provider-model';
  const section = document.createElement('section');
  section.className = 'pane pane--generator-provider-model';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = title;
  const line = document.createElement('div');
  line.className = 'provider-model-text';
  section.appendChild(h2);
  section.appendChild(line);
  node.appendChild(section);
  function render() {
    const profile = state && typeof state.get === 'function'
      ? state.get(stateKey) || {}
      : {};
    const resolved = resolveProviderModel(profile);
    line.textContent = `Provider: ${resolved.provider} | Model: ${resolved.model}`;
  }
  render();
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      render();
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
    },
  };
}

