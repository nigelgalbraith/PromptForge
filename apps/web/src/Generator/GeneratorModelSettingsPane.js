import { DEFAULT_STATE_KEY, ensureProfileState } from '../core/profileState.js';

const FALLBACK_MODELS = {
  ollama: ['deepseek-coder:6.7b', 'codellama:13b'],
  openai: ['gpt-dummy-1', 'gpt-dummy-2'],
  gemini: ['gemini-dummy-1'],
  anthropic: ['claude-dummy-1'],
};




function normalizeModels(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return { ...FALLBACK_MODELS };
  Object.keys(raw).forEach((provider) => {
    const value = raw[provider];
    const list = Array.isArray(value)
      ? value
      : value && typeof value === 'object' && Array.isArray(value.models)
        ? value.models
        : [];
    out[String(provider).toLowerCase()] = list
      .map((m) => String(m || '').trim())
      .filter(Boolean);
  });
  const keys = Object.keys(out);
  if (!keys.length) return { ...FALLBACK_MODELS };
  return out;
}





function resolveDefaults(st, modelsByProvider) {
  const providers = Object.keys(modelsByProvider);
  const fallbackProvider = providers[0] || 'ollama';
  const defaults = st.defaults && typeof st.defaults === 'object' ? st.defaults : {};
  const wantedProvider = String(defaults.provider || '').toLowerCase();
  const provider = providers.includes(wantedProvider) ? wantedProvider : fallbackProvider;
  const models = modelsByProvider[provider] || [];
  const wantedModel = String(defaults.model || '');
  const model = models.includes(wantedModel) ? wantedModel : (models[0] || '');
  return { provider, model };
}





export function buildGeneratorModelSettingsPane(options = {}) {
  const {
    state,
    events = null,
    stateKey = DEFAULT_STATE_KEY,
    title = 'Model Settings',
    modelsUrl = 'profiles/models.json',
  } = options;
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') {
    throw new Error('GeneratorModelSettingsPane: missing state adapter');
  }
  const node = document.createElement('div');
  node.className = 'pane-generator-model-settings';
  const section = document.createElement('section');
  section.className = 'pane pane--generator-model-settings';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = title;
  const providerGroup = document.createElement('div');
  providerGroup.className = 'group';
  const providerLab = document.createElement('label');
  providerLab.textContent = 'Provider';
  const providerSel = document.createElement('select');
  const modelGroup = document.createElement('div');
  modelGroup.className = 'group';
  const modelLab = document.createElement('label');
  modelLab.textContent = 'Model';
  const modelSel = document.createElement('select');
  providerGroup.appendChild(providerLab);
  providerGroup.appendChild(providerSel);
  modelGroup.appendChild(modelLab);
  modelGroup.appendChild(modelSel);
  section.appendChild(h2);
  section.appendChild(providerGroup);
  section.appendChild(modelGroup);
  node.appendChild(section);
  let ignoreNext = false;
  let modelsByProvider = { ...FALLBACK_MODELS };



  function markLocalWrite() {
    ignoreNext = true;
    setTimeout(() => {
      ignoreNext = false;
    }, 0);
  }



  function renderSelectOptions() {
    const providers = Object.keys(modelsByProvider);
    providerSel.innerHTML = '';
    providers.forEach((provider) => {
      const opt = document.createElement('option');
      opt.value = provider;
      opt.textContent = provider;
      providerSel.appendChild(opt);
    });
  }



  function renderModelOptions(provider) {
    const models = modelsByProvider[String(provider || '').toLowerCase()] || [];
    modelSel.innerHTML = '';
    models.forEach((model) => {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      modelSel.appendChild(opt);
    });
  }



  function syncDOMToState() {
    const st = ensureProfileState(state, stateKey);
    const provider = String(providerSel.value || '').toLowerCase();
    renderModelOptions(provider);
    const models = modelsByProvider[provider] || [];
    const selectedModel = models.includes(modelSel.value) ? modelSel.value : (models[0] || '');
    modelSel.value = selectedModel;
    st.defaults = { provider, model: selectedModel };
    markLocalWrite();
    state.set(stateKey, st);
  }



  function renderFromState() {
    const st = ensureProfileState(state, stateKey);
    renderSelectOptions();
    const resolved = resolveDefaults(st, modelsByProvider);
    providerSel.value = resolved.provider;
    renderModelOptions(resolved.provider);
    modelSel.value = resolved.model;
    if (!st.defaults || st.defaults.provider !== resolved.provider || st.defaults.model !== resolved.model) {
      st.defaults = { provider: resolved.provider, model: resolved.model };
      markLocalWrite();
      state.set(stateKey, st);
    }
  }
  providerSel.addEventListener('change', syncDOMToState);
  modelSel.addEventListener('change', syncDOMToState);
  renderFromState();
  let isDestroyed = false;



  async function loadModels() {
    try {
      const res = await fetch(modelsUrl);
      if (!res.ok) return;
      const raw = await res.json();
      if (isDestroyed) return;
      modelsByProvider = normalizeModels(raw);
      renderFromState();
    } catch {
      // ignore model list load errors and keep fallbacks
    }
  }
  loadModels();
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      if (ignoreNext) return;
      renderFromState();
    });
  }
  return {
    node,
    destroy() {
      isDestroyed = true;
      if (typeof off === 'function') off();
      providerSel.removeEventListener('change', syncDOMToState);
      modelSel.removeEventListener('change', syncDOMToState);
    },
  };
}
