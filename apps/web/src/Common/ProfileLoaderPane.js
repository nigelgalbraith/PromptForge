import { notifyTicker } from '../utils/ticker.js';
import { button, clear, el } from '../utils/dom.js';
import { normalizeProfile } from '../core/profileState.js';
const DEFAULT_STATE_KEY = 'TEXT_PROFILE';
const FLASH_DURATION_MS = 5000;
function flash(flashEl, msg) {
  flashEl.textContent = msg || '';
  flashEl.classList.add('show');
  setTimeout(() => {
    flashEl.classList.remove('show');
    flashEl.textContent = '';
  }, FLASH_DURATION_MS);
}


function setSharedState(state, stateKey, setState, profile) {
  if (typeof setState === 'function') {
    setState(profile);
    return;
  }
  if (state && typeof state.set === 'function') {
    state.set(stateKey, profile);
  }
}


async function fetchProfilesList() {
  const response = await fetch('/api/profiles/list', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload)) return [];
  return payload
    .map((name) => String(name || '').trim())
    .filter((name) => name.endsWith('.json'));
}


async function fetchProfileByName(name) {
  const response = await fetch(`/api/profiles/${encodeURIComponent(name)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}


/**
 * buildProfileLoaderPane.
 */
export function buildProfileLoaderPane(options = {}) {
  const {
    title = 'Profiles',
    state = null,
    stateKey = DEFAULT_STATE_KEY,
    setState,
    tickerController = null,
  } = options;
  const node = el('section', { className: 'pane pane--profile-loader' });
  clear(node);
  const h2 = el('h2', { className: 'pane-title', text: title });
  const group = el('div', { className: 'group' });
  const aiLabel = el('label', { text: 'AI' });
  const aiSelect = el('select');
  const modelLabel = el('label', { text: 'Model' });
  const modelSelect = el('select');
  const profileLabel = el('label', { text: 'Profile' });
  const profileSelect = el('select');
  const actions = el('div', { className: 'actions' });
  const btnLoad = button({ className: 'primary', text: 'Load Profile' });
  const btnRefresh = button({ text: 'Refresh' });
  const flashDiv = el('div', { className: 'flash' });
  group.appendChild(aiLabel);
  group.appendChild(aiSelect);
  group.appendChild(modelLabel);
  group.appendChild(modelSelect);
  group.appendChild(profileLabel);
  group.appendChild(profileSelect);
  actions.appendChild(btnLoad);
  actions.appendChild(btnRefresh);
  node.appendChild(h2);
  node.appendChild(group);
  node.appendChild(actions);
  node.appendChild(flashDiv);
  let destroyed = false;
  let tree = Object.create(null);
  function showMessage(msg) {
    flash(flashDiv, msg);
    notifyTicker(tickerController, msg, FLASH_DURATION_MS);
  }
  function buildTree(list) {
    const next = Object.create(null);
    list.forEach((entry) => {
      const parts = String(entry || '').split('/');
      if (parts.length !== 3) return;
      const [ai, model, profile] = parts;
      if (!ai || !model || !profile || !profile.endsWith('.json')) return;
      if (!next[ai]) next[ai] = Object.create(null);
      if (!next[ai][model]) next[ai][model] = [];
      next[ai][model].push(profile);
    });
    Object.keys(next).forEach((ai) => {
      Object.keys(next[ai]).forEach((model) => {
        next[ai][model].sort((a, b) => a.localeCompare(b));
      });
    });
    return next;
  }
  function fillSelect(selectNode, values) {
    clear(selectNode);
    values.forEach((value) => {
      selectNode.appendChild(el('option', { text: value, attrs: { value } }));
    });
  }
  function renderList(list, opts = {}) {
    const { quiet = false } = opts;
    tree = buildTree(Array.isArray(list) ? list : []);
    const aiNames = Object.keys(tree).sort((a, b) => a.localeCompare(b));
    clear(aiSelect);
    clear(modelSelect);
    clear(profileSelect);
    if (!aiNames.length) {
      const emptyOpt = el('option', { text: 'No saved profiles', attrs: { value: '' } });
      aiSelect.appendChild(emptyOpt);
      modelSelect.appendChild(el('option', { text: 'No saved profiles', attrs: { value: '' } }));
      profileSelect.appendChild(el('option', { text: 'No saved profiles', attrs: { value: '' } }));
      aiSelect.disabled = true;
      modelSelect.disabled = true;
      profileSelect.disabled = true;
      btnLoad.disabled = true;
      if (!quiet) showMessage('No saved profiles');
      return;
    }
    fillSelect(aiSelect, aiNames);
    const selectedAI = String(aiSelect.value || aiNames[0] || '');
    const models = Object.keys(tree[selectedAI] || {}).sort((a, b) => a.localeCompare(b));
    fillSelect(modelSelect, models);
    const selectedModel = String(modelSelect.value || models[0] || '');
    const profiles = ((tree[selectedAI] || Object.create(null))[selectedModel] || []).slice();
    fillSelect(profileSelect, profiles);
    aiSelect.disabled = false;
    modelSelect.disabled = !models.length;
    profileSelect.disabled = !profiles.length;
    btnLoad.disabled = !selectedAI || !selectedModel || !profiles.length;
  }
  function updateModelsForAI() {
    const selectedAI = String(aiSelect.value || '').trim();
    const models = Object.keys(tree[selectedAI] || {}).sort((a, b) => a.localeCompare(b));
    fillSelect(modelSelect, models);
    modelSelect.disabled = !models.length;
    updateProfilesForModel();
  }
  function updateProfilesForModel() {
    const selectedAI = String(aiSelect.value || '').trim();
    const selectedModel = String(modelSelect.value || '').trim();
    const profiles = ((tree[selectedAI] || Object.create(null))[selectedModel] || []).slice();
    fillSelect(profileSelect, profiles);
    profileSelect.disabled = !profiles.length;
    btnLoad.disabled = !selectedAI || !selectedModel || !profiles.length;
  }
  async function refreshProfiles() {
    try {
      const list = await fetchProfilesList();
      if (destroyed) return;
      renderList(list);
    } catch {
      if (destroyed) return;
      renderList([], { quiet: true });
      showMessage('Failed to load profiles');
    }
  }
  async function loadSelectedProfile() {
    const ai = String(aiSelect.value || '').trim();
    const model = String(modelSelect.value || '').trim();
    const profileName = String(profileSelect.value || '').trim();
    if (!ai || !model || !profileName) return;
    const relPath = `${ai}/${model}/${profileName}`;
    try {
      const profile = await fetchProfileByName(relPath);
      if (destroyed) return;
      const normalized = normalizeProfile(profile);
      setSharedState(state, stateKey, setState, normalized);
      showMessage(`Loaded profile: ${relPath}`);
    } catch {
      if (destroyed) return;
      showMessage('Failed to load profile');
    }
  }
  btnLoad.addEventListener('click', loadSelectedProfile);
  btnRefresh.addEventListener('click', refreshProfiles);
  aiSelect.addEventListener('change', updateModelsForAI);
  modelSelect.addEventListener('change', updateProfilesForModel);
  refreshProfiles();
  return {
    node,
    destroy() {
      destroyed = true;
      btnLoad.removeEventListener('click', loadSelectedProfile);
      btnRefresh.removeEventListener('click', refreshProfiles);
      aiSelect.removeEventListener('change', updateModelsForAI);
      modelSelect.removeEventListener('change', updateProfilesForModel);
    },
  };
}

