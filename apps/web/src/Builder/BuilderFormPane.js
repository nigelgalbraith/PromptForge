import { DEFAULT_STATE_KEY, ensureProfileState } from '../core/profileState.js';
import { parseCsvOrArray } from '../utils/parse.js';

const DEFAULT_DEFAULT_FIELDS = ['applicant', 'role'];




function setForm(state, stateKey, nextForm) {
  const st = ensureProfileState(state, stateKey);
  st.form = nextForm || {};
  state.set(stateKey, st);
}





function render(node, state, cfg, markLocalWrite) {
  const titleText = cfg.title || 'Form Fields';
  node.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'pane pane--builder-form';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = titleText;
  const rowsWrap = document.createElement('div');
  rowsWrap.className = 'builder-form-rows';
  const btnAdd = document.createElement('button');
  btnAdd.className = 'mini';
  btnAdd.type = 'button';
  btnAdd.textContent = '+ Add Field';
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.appendChild(btnAdd);
  section.appendChild(h2);
  section.appendChild(rowsWrap);
  section.appendChild(actions);
  node.appendChild(section);



  function readCurrentFormFromDOM() {
    const out = {};
    const blocks = rowsWrap.querySelectorAll('.form-field-block');
    Array.prototype.forEach.call(blocks, (block) => {
      const keyInput = block.querySelector('input[data-role="key"]');
      const valInput = block.querySelector('input[data-role="val"]');
      const k = keyInput ? String(keyInput.value || '').trim() : '';
      if (!k) return;
      out[k] = valInput ? String(valInput.value || '') : '';
    });
    return out;
  }



  function commitDOMToState() {
    markLocalWrite();
    setForm(state, cfg.stateKey, readCurrentFormFromDOM());
  }



  function addFieldRow(key, val) {
    const block = document.createElement('div');
    block.className = 'group form-field-block';
    const keyRow = document.createElement('div');
    keyRow.className = 'form-field-key-row';
    const kLab = document.createElement('label');
    kLab.textContent = 'Field Name';
    const keyInput = document.createElement('input');
    keyInput.className = 'form-key-input';
    keyInput.placeholder = 'key (e.g., applicant)';
    keyInput.value = key || '';
    keyInput.dataset.role = 'key';
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'mini danger';
    btnRemove.textContent = 'Remove';
    keyRow.appendChild(kLab);
    keyRow.appendChild(keyInput);
    keyRow.appendChild(btnRemove);
    const valRow = document.createElement('div');
    valRow.className = 'form-field-value-row';
    const vLab = document.createElement('label');
    vLab.textContent = 'Value';
    const valInput = document.createElement('input');
    valInput.className = 'form-value-input';
    valInput.placeholder = 'value (e.g., Jane Doe)';
    valInput.value = val || '';
    valInput.dataset.role = 'val';
    valRow.appendChild(vLab);
    valRow.appendChild(valInput);



    function onAnyInput() {
      commitDOMToState();
    }
    keyInput.addEventListener('input', onAnyInput);
    valInput.addEventListener('input', onAnyInput);
    btnRemove.addEventListener('click', () => {
      block.remove();
      commitDOMToState();
    });
    block.appendChild(keyRow);
    block.appendChild(valRow);
    rowsWrap.appendChild(block);
  }
  const st = ensureProfileState(state, cfg.stateKey);
  const form = st.form || {};
  const keys = Object.keys(form);
  if (keys.length) {
    keys.forEach((k) => {
      addFieldRow(k, form[k]);
    });
  } else {
    parseCsvOrArray(cfg.defaultFields, DEFAULT_DEFAULT_FIELDS).forEach((k) => {
      addFieldRow(k, '');
    });
    commitDOMToState();
  }
  btnAdd.addEventListener('click', () => {
    addFieldRow('', '');
    commitDOMToState();
  });
}





export function buildBuilderFormPane(options = {}) {
  const {
    state,
    events = null,
    stateKey = DEFAULT_STATE_KEY,
    title = 'Form Fields',
    defaultFields = DEFAULT_DEFAULT_FIELDS,
  } = options;
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') {
    throw new Error('BuilderFormPane: missing state adapter');
  }
  const node = document.createElement('div');
  node.className = 'pane-builder-form';
  let ignoreNext = false;



  function markLocalWrite() {
    ignoreNext = true;
    setTimeout(() => {
      ignoreNext = false;
    }, 0);
  }
  const cfg = {
    stateKey,
    title,
    defaultFields,
  };
  render(node, state, cfg, markLocalWrite);
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      if (ignoreNext) return;
      render(node, state, cfg, markLocalWrite);
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
    },
  };
}
