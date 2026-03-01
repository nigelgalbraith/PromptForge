import { notifyTicker } from '../utils/ticker.js';
import { button, clear, el } from '../utils/dom.js';
const FLASH_DURATION_MS = 5000;
const DEFAULT_STATE_KEY = 'TEXT_PROFILE';
function flash(flashEl, msg) {
  flashEl.textContent = msg || '';
  flashEl.classList.add('show');
  setTimeout(() => {
    flashEl.classList.remove('show');
    flashEl.textContent = '';
  }, FLASH_DURATION_MS);
}


function resolveData({ getData, data, state, stateKey }) {
  if (typeof getData === 'function') {
    return getData();
  }
  if (typeof data !== 'undefined') {
    return data;
  }
  if (state && typeof state.get === 'function') {
    return state.get(stateKey);
  }
  return null;
}


async function saveProfileToServer(obj, filename, ai, model) {
  const name = `${ai}/${model}/${filename}`;
  const response = await fetch('/api/profiles/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, profile: obj }),
  });
  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      // ignore
    }
    throw new Error(`Save request failed: HTTP ${response.status} ${errorBody}`);
  }
  return response.json();
}


function normalizeFilename(raw) {
  const base = String(raw || '').trim();
  if (!base) return '';
  if (base.endsWith('.json')) return base;
  return `${base}.json`;
}


function toSafeSegment(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const normalized = s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return normalized;
}


async function onExportClick(config) {
  const {
    getData,
    data,
    state,
    stateKey,
    getFilename,
    setFilename,
    getAi,
    getModel,
    msgExportEmpty,
    flashEl,
    tickerController,
  } = config;
  const obj = resolveData({ getData, data, state, stateKey });
  if (!obj) {
    flash(flashEl, msgExportEmpty);
    notifyTicker(tickerController, msgExportEmpty, FLASH_DURATION_MS);
    return;
  }
  const filename = normalizeFilename(typeof getFilename === 'function' ? getFilename() : '');
  if (!filename) {
    const msg = 'Enter a filename';
    flash(flashEl, msg);
    notifyTicker(tickerController, msg, FLASH_DURATION_MS);
    return;
  }
  if (filename.includes('/') || filename.includes('\\')) {
    const msg = 'Filename must not include path separators';
    flash(flashEl, msg);
    notifyTicker(tickerController, msg, FLASH_DURATION_MS);
    return;
  }
  const aiRaw = String(getAi?.() || '').trim();
  const modelRaw = String(getModel?.() || '').trim();
  const ai = toSafeSegment(aiRaw);
  const model = toSafeSegment(modelRaw);
  if (!ai || !model) {
    const msg = 'Select AI and Model before saving';
    flash(flashEl, msg);
    notifyTicker(tickerController, msg, FLASH_DURATION_MS);
    return;
  }
  if (typeof getFilename === 'function' && typeof setFilename === 'function') {
    setFilename(filename);
  }
  try {
    await saveProfileToServer(obj, filename, ai, model);
    const msg = `Saved to server: ${ai}/${model}/${filename}`;
    flash(flashEl, msg);
    notifyTicker(tickerController, msg, FLASH_DURATION_MS);
  } catch (error) {
    const msg = 'Save failed';
    flash(flashEl, msg);
    notifyTicker(tickerController, msg, FLASH_DURATION_MS);
    console.error('Export failed:', error);
  }
}


/**
 * buildExportPane.
 */
export function buildExportPane(options = {}) {
  const {
    title = 'Export',
    filename = 'profile.json',
    buttonLabel = 'Save Profile',
    msgExportEmpty = 'Nothing to export',
    getData,
    data,
    getAi,
    getModel,
    state = null,
    stateKey = DEFAULT_STATE_KEY,
    tickerController = null,
  } = options;
  const node = el('div', { className: 'pane-builder-export' });
  clear(node);
  const section = el('section', { className: 'pane pane--builder-export' });
  const h2 = el('h2', { className: 'pane-title', text: title });
  const filenameGroup = el('div', { className: 'group' });
  const filenameLabel = el('label', { text: 'Filename' });
  const filenameInput = el('input', { attrs: { type: 'text', value: filename } });
  const actions = el('div', { className: 'actions' });
  const btn = button({ className: 'primary', text: buttonLabel });
  const flashDiv = el('div', { className: 'flash' });
  filenameGroup.appendChild(filenameLabel);
  filenameGroup.appendChild(filenameInput);
  actions.appendChild(btn);
  section.appendChild(h2);
  section.appendChild(filenameGroup);
  section.appendChild(actions);
  section.appendChild(flashDiv);
  node.appendChild(section);
  const clickHandler = () => {
    onExportClick({
      getData,
      data,
      state,
      stateKey,
      getFilename: () => filenameInput.value,
      setFilename: (value) => {
        filenameInput.value = String(value || '');
      },
      getAi,
      getModel,
      msgExportEmpty,
      flashEl: flashDiv,
      tickerController,
      }).catch((err) => {
      console.error('Export click failed:', err);
    });
  };
  btn.addEventListener('click', clickHandler);
  return {
    node,
    destroy() {
      btn.removeEventListener('click', clickHandler);
    },
  };
}

