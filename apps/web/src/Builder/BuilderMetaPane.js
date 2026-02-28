import { DEFAULT_STATE_KEY, ensureProfileState } from '../core/profileState.js';

const FALLBACK_TEMP = 0.3;
const FALLBACK_PROVIDER = 'ollama';
const MODES = ['template', 'llm'];




function parseTemp(raw, fallback) {
  const n = Number(raw);
  return Number.isNaN(n) ? fallback : n;
}





function setDisabled(el, disabled) {
  el.disabled = !!disabled;
  el.classList.toggle('is-disabled', !!disabled);
}





function normalizeModels(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  Object.keys(raw).forEach((provider) => {
    const value = raw[provider];
    const list = Array.isArray(value)
      ? value
      : value && typeof value === 'object' && Array.isArray(value.models)
        ? value.models
        : [];
    const clean = list
      .map((model) => String(model || '').trim())
      .filter(Boolean);
    if (clean.length) out[String(provider).toLowerCase()] = clean;
  });
  return out;
}





function resolveProvider(modelsByProvider, wantedProvider) {
  const providers = Object.keys(modelsByProvider || {});
  const wantedRaw = String(wantedProvider || '').trim();
  const wanted = wantedRaw.toLowerCase();
  if (wantedRaw) {
    if (providers.includes(wanted)) return wanted;
    return wantedRaw;
  }
  if (!providers.length) return FALLBACK_PROVIDER;
  if (providers.includes(FALLBACK_PROVIDER)) return FALLBACK_PROVIDER;
  return providers[0];
}





function resolveModel(modelsByProvider, provider, wantedModel) {
  const list = (modelsByProvider && modelsByProvider[String(provider || '').toLowerCase()]) || [];
  const wanted = String(wantedModel || '').trim();
  if (wanted) {
    if (list.includes(wanted)) return wanted;
    return wanted;
  }
  return list[0] || '';
}





function render(node, state, cfg, markLocalWrite) {
  node.innerHTML = '';
  function seedProviderConfig(st, provider) {
    const providerKey = String(provider || '').toLowerCase();
    if (!providerKey) return;
    if (!st.providers || typeof st.providers !== 'object') st.providers = {};
    if (st.providers[providerKey] && typeof st.providers[providerKey] === 'object') return;
    const rawCfg = cfg.modelsRawByProvider[providerKey];
    if (!rawCfg || typeof rawCfg !== 'object') return;
    const seeded = {};
    if (typeof rawCfg.endpoint === 'string') seeded.endpoint = rawCfg.endpoint;
    if (typeof rawCfg.requestFormat === 'string') seeded.requestFormat = rawCfg.requestFormat;
    if (rawCfg.options && typeof rawCfg.options === 'object') seeded.options = { ...rawCfg.options };
    st.providers[providerKey] = seeded;
  }
  const section = document.createElement('section');
  section.className = 'pane pane--builder-meta';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = cfg.title || 'Profile';
  const defaultsProviderGroup = document.createElement('div');
  defaultsProviderGroup.className = 'group';
  const defaultsProviderLab = document.createElement('label');
  defaultsProviderLab.textContent = 'Provider';
  const defaultsProviderSel = document.createElement('select');
  defaultsProviderGroup.appendChild(defaultsProviderLab);
  defaultsProviderGroup.appendChild(defaultsProviderSel);
  const defaultsModelGroup = document.createElement('div');
  defaultsModelGroup.className = 'group';
  const defaultsModelLab = document.createElement('label');
  defaultsModelLab.textContent = 'Model';
  const defaultsModelSel = document.createElement('select');
  defaultsModelGroup.appendChild(defaultsModelLab);
  defaultsModelGroup.appendChild(defaultsModelSel);
  const modeGroup = document.createElement('div');
  modeGroup.className = 'group';
  const modeLab = document.createElement('label');
  modeLab.textContent = 'Mode';
  const selMode = document.createElement('select');
  MODES.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    selMode.appendChild(opt);
  });
  modeGroup.appendChild(modeLab);
  modeGroup.appendChild(selMode);
  const tempGroup = document.createElement('div');
  tempGroup.className = 'group';
  const tempLab = document.createElement('label');
  tempLab.textContent = 'LLM Temperature';
  const tempInput = document.createElement('input');
  tempInput.type = 'number';
  tempInput.step = 0.05;
  tempInput.min = 0;
  tempInput.max = 1;
  tempGroup.appendChild(tempLab);
  tempGroup.appendChild(tempInput);
  const tmplLab = document.createElement('label');
  tmplLab.textContent = 'Template';
  const tmplArea = document.createElement('textarea');
  const promptLab = document.createElement('label');
  promptLab.textContent = 'Prompt';
  const promptArea = document.createElement('textarea');
  section.appendChild(h2);
  section.appendChild(defaultsProviderGroup);
  section.appendChild(defaultsModelGroup);
  section.appendChild(modeGroup);
  section.appendChild(tempGroup);
  section.appendChild(tmplLab);
  section.appendChild(tmplArea);
  section.appendChild(promptLab);
  section.appendChild(promptArea);
  node.appendChild(section);



  function renderProviderOptions(selectedProvider) {
    const providers = Object.keys(cfg.modelsByProvider || {});
    const resolvedProvider = resolveProvider(cfg.modelsByProvider, selectedProvider);
    if (resolvedProvider && !providers.includes(resolvedProvider)) {
      providers.unshift(resolvedProvider);
    }
    defaultsProviderSel.innerHTML = '';
    providers.forEach((provider) => {
      const opt = document.createElement('option');
      opt.value = provider;
      opt.textContent = provider;
      defaultsProviderSel.appendChild(opt);
    });
    if (!providers.length) {
      const fallback = document.createElement('option');
      fallback.value = FALLBACK_PROVIDER;
      fallback.textContent = FALLBACK_PROVIDER;
      defaultsProviderSel.appendChild(fallback);
    }
    defaultsProviderSel.value = resolvedProvider;
    defaultsProviderSel.disabled = !defaultsProviderSel.options.length;
  }



  function renderModelOptions(provider, selectedModel) {
    const list = (cfg.modelsByProvider && cfg.modelsByProvider[String(provider || '').toLowerCase()]) || [];
    const resolvedModel = resolveModel(cfg.modelsByProvider, provider, selectedModel);
    const models = list.slice();
    if (resolvedModel && !models.includes(resolvedModel)) {
      models.unshift(resolvedModel);
    }
    defaultsModelSel.innerHTML = '';
    models.forEach((model) => {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      defaultsModelSel.appendChild(opt);
    });
    defaultsModelSel.value = resolvedModel;
    defaultsModelSel.disabled = !defaultsModelSel.options.length;
  }



  function syncFromDOM() {
    const st = ensureProfileState(state, cfg.stateKey);
    st.mode = selMode.value === 'llm' ? 'llm' : 'template';
    const isLLM = st.mode === 'llm';
    st.template = tmplArea.value || '';
    st.prompt = promptArea.value || '';
    const provider = resolveProvider(cfg.modelsByProvider, defaultsProviderSel.value);
    const model = resolveModel(cfg.modelsByProvider, provider, defaultsModelSel.value);
    st.defaults = { provider, model };
    seedProviderConfig(st, provider);
    if (!st.providers || typeof st.providers !== 'object') st.providers = {};
    if (isLLM) {
      const providerState = st.providers[provider] && typeof st.providers[provider] === 'object'
        ? st.providers[provider]
        : {};
      const providerOptions = providerState.options && typeof providerState.options === 'object'
        ? providerState.options
        : {};
      st.providers[provider] = {
        ...providerState,
        options: {
          ...providerOptions,
          temperature: parseTemp(tempInput.value, cfg.defaultTemp),
        },
      };
    }
    setDisabled(tmplArea, isLLM);
    setDisabled(promptArea, !isLLM);
    setDisabled(tempInput, !isLLM);
    markLocalWrite();
    state.set(cfg.stateKey, st);
  }



  function onProviderChange() {
    renderModelOptions(defaultsProviderSel.value, defaultsModelSel.value);
    syncFromDOM();
  }
  const st0 = ensureProfileState(state, cfg.stateKey);
  const defaults = st0.defaults && typeof st0.defaults === 'object' ? st0.defaults : {};
  const selectedProvider = resolveProvider(cfg.modelsByProvider, defaults.provider);
  const selectedModel = resolveModel(cfg.modelsByProvider, selectedProvider, defaults.model);
  renderProviderOptions(selectedProvider);
  renderModelOptions(selectedProvider, selectedModel);
  selMode.value = st0.mode === 'llm' ? 'llm' : 'template';
  const providerTemp =
    st0.providers &&
    st0.providers[selectedProvider] &&
    st0.providers[selectedProvider].options &&
    typeof st0.providers[selectedProvider].options.temperature === 'number'
      ? st0.providers[selectedProvider].options.temperature
      : null;
  const legacyTemp =
    st0.ollama && st0.ollama.options && typeof st0.ollama.options.temperature === 'number'
      ? st0.ollama.options.temperature
      : null;
  const stTemp = providerTemp != null ? providerTemp : legacyTemp;
  tempInput.value = stTemp != null ? stTemp : cfg.defaultTemp;
  tmplArea.value = st0.template || '';
  promptArea.value = st0.prompt || '';
  defaultsProviderSel.addEventListener('change', onProviderChange);
  defaultsModelSel.addEventListener('change', syncFromDOM);
  selMode.addEventListener('change', syncFromDOM);
  tempInput.addEventListener('input', syncFromDOM);
  tmplArea.addEventListener('input', syncFromDOM);
  promptArea.addEventListener('input', syncFromDOM);
  syncFromDOM();
}

export function buildBuilderMetaPane(options = {}) {
  const {
    state,
    events = null,
    stateKey = DEFAULT_STATE_KEY,
    title = 'Profile',
    defaultTemp = FALLBACK_TEMP,
    modelsUrl = '/api/profiles/models', 
  } = options;
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') {
    throw new Error('BuilderMetaPane: missing state adapter');
  }
  const node = document.createElement('div');
  node.className = 'pane-builder-meta';
  const cfg = {
    stateKey,
    title,
    defaultTemp: parseTemp(defaultTemp, FALLBACK_TEMP),
    modelsByProvider: {},
    modelsRawByProvider: {},
  };
  let ignoreNext = false;



  function markLocalWrite() {
    ignoreNext = true;
    setTimeout(() => {
      ignoreNext = false;
    }, 0);
  }



  function renderNow() {
    render(node, state, cfg, markLocalWrite);
  }
  renderNow();



  async function loadModels() {
    try {
      const res = await fetch(modelsUrl);
      if (!res.ok) return;
      const raw = await res.json();
      cfg.modelsByProvider = normalizeModels(raw);
      cfg.modelsRawByProvider = {};
      if (raw && typeof raw === 'object') {
        Object.keys(raw).forEach((provider) => {
          cfg.modelsRawByProvider[String(provider).toLowerCase()] = raw[provider];
        });
      }
      renderNow();
    } catch {
      // ignore model list load failures
    }
  }
  loadModels();
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      if (ignoreNext) return;
      renderNow();
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
    },
  };
}
