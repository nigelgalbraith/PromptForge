export const DEFAULT_STATE_KEY = 'TEXT_PROFILE';
const DEFAULT_PROVIDER = 'ollama';
const DEFAULT_MODEL = 'deepseek-coder:6.7b';


/** Creates a new empty profile with default provider metadata. */
export function createEmptyProfile() {
  return {
    form: {},
    styles: [],
    options: [],
    snippets: [],
    mode: 'template',
    template: '',
    prompt: '',
    defaults: { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL },
    providers: {},
  };
}


/** Reads a profile object from shared state. */
export function getProfile(state, stateKey = DEFAULT_STATE_KEY) {
  if (!state || typeof state.get !== 'function') return null;
  return state.get(String(stateKey));
}


/** Writes a profile object to shared state. */
export function setProfile(state, profile, stateKey = DEFAULT_STATE_KEY) {
  if (!state || typeof state.set !== 'function') throw new Error('profileState: missing state.set adapter');
  state.set(String(stateKey), profile);
  return profile;
}


export function normalizeProfile(profile) {
  const normalized = profile && typeof profile === 'object' ? profile : createEmptyProfile();
  if (!normalized.form || typeof normalized.form !== 'object') normalized.form = {};
  if (!Array.isArray(normalized.styles)) normalized.styles = [];
  if (!Array.isArray(normalized.options)) normalized.options = [];
  if (!Array.isArray(normalized.snippets)) normalized.snippets = [];
  if (!normalized.defaults || typeof normalized.defaults !== 'object') {
    normalized.defaults = { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL };
  } else {
    if (!normalized.defaults.provider) normalized.defaults.provider = DEFAULT_PROVIDER;
    if (!normalized.defaults.model) normalized.defaults.model = DEFAULT_MODEL;
  }
  if (!normalized.providers || typeof normalized.providers !== 'object') normalized.providers = {};
  if (normalized.ollama && typeof normalized.ollama === 'object') {
    const legacyOptions = normalized.ollama.options && typeof normalized.ollama.options === 'object'
      ? normalized.ollama.options
      : {};
    const existingOllama = normalized.providers.ollama && typeof normalized.providers.ollama === 'object'
      ? normalized.providers.ollama
      : {};
    const existingOptions = existingOllama.options && typeof existingOllama.options === 'object'
      ? existingOllama.options
      : {};
    normalized.providers.ollama = {
      ...existingOllama,
      options: { ...existingOptions, ...legacyOptions },
    };
    delete normalized.ollama;
  }
  return normalized;
}


/** Ensures profile state exists and returns a normalized profile object. */
export function ensureProfileState(state, stateKey = DEFAULT_STATE_KEY) {
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') throw new Error('profileState: missing state adapter');
  const key = String(stateKey);
  const existingProfile = getProfile(state, key);
  const profile = normalizeProfile(existingProfile);
  if (!existingProfile || typeof existingProfile !== 'object') {
    setProfile(state, profile, key);
    return profile;
  }
  return profile;
}
