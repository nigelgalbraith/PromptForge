import { DEFAULT_STATE_KEY, ensureProfileState } from '../core/profileState.js';
function syncFromDOM(rowsWrap, profileState, state, stateKey) {
  const rows = rowsWrap.querySelectorAll('.snippet-row');
  const out = [];
  Array.prototype.forEach.call(rows, (row) => {
    let subject = (row.querySelector('input[data-role="subject"]') || {}).value || '';
    let text = (row.querySelector('textarea[data-role="text"]') || {}).value || '';
    const selectedEl = row.querySelector('input[type="checkbox"][data-role="selected"]');
    const selected = selectedEl ? !!selectedEl.checked : false;
    subject = String(subject).trim();
    text = String(text).trim();
    if (!subject && !text) return;
    out.push({ subject, text, selected });
  });
  profileState.snippets = out;
  state.set(stateKey, profileState);
}


function snippetRow(rowsWrap, profileState, state, stateKey, data, markLocalWrite) {
  const resolvedData = data || {};
  const row = document.createElement('div');
  row.className = 'group snippet-row';
  const top = document.createElement('div');
  top.className = 'snippet-row-top';
  const subjectWrap = document.createElement('div');
  subjectWrap.className = 'snippet-subject-wrap';
  const subjectLab = document.createElement('label');
  subjectLab.textContent = 'Subject';
  const subject = document.createElement('input');
  subject.placeholder = 'What this relates to (e.g., Troubleshooting, Leadership)';
  subject.value = resolvedData.subject || '';
  subject.dataset.role = 'subject';
  subject.addEventListener('input', () => {
    markLocalWrite();
    syncFromDOM(rowsWrap, profileState, state, stateKey);
  });
  subjectWrap.appendChild(subjectLab);
  subjectWrap.appendChild(subject);
  const includeWrap = document.createElement('label');
  includeWrap.className = 'snippet-include';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.dataset.role = 'selected';
  cb.checked = resolvedData.selected !== false;
  cb.addEventListener('change', () => {
    markLocalWrite();
    syncFromDOM(rowsWrap, profileState, state, stateKey);
  });
  const span = document.createElement('span');
  span.textContent = 'Default include';
  includeWrap.appendChild(cb);
  includeWrap.appendChild(span);
  top.appendChild(subjectWrap);
  top.appendChild(includeWrap);
  const textLab = document.createElement('label');
  textLab.textContent = 'Example text';
  const ta = document.createElement('textarea');
  ta.placeholder = 'Example of use (keep it reusable)';
  ta.rows = 5;
  ta.dataset.role = 'text';
  ta.value = resolvedData.text || '';
  ta.addEventListener('input', () => {
    markLocalWrite();
    syncFromDOM(rowsWrap, profileState, state, stateKey);
  });
  const btnRemove = document.createElement('button');
  btnRemove.type = 'button';
  btnRemove.className = 'mini danger';
  btnRemove.textContent = 'Remove';
  btnRemove.addEventListener('click', () => {
    row.remove();
    markLocalWrite();
    syncFromDOM(rowsWrap, profileState, state, stateKey);
  });
  row.appendChild(top);
  row.appendChild(textLab);
  row.appendChild(ta);
  row.appendChild(btnRemove);
  return row;
}


function render(node, state, stateKey, opts, markLocalWrite) {
  const titleText = opts.title || 'Snippets';
  const profileState = ensureProfileState(state, stateKey);
  node.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'pane pane--builder-snippets';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = titleText;
  const help = document.createElement('p');
  help.className = 'muted';
  help.textContent = 'Reusable blocks + an example. You can choose which ones to include when generating.';
  const rowsWrap = document.createElement('div');
  rowsWrap.className = 'builder-snippets';
  const actions = document.createElement('div');
  actions.className = 'actions';
  const btnAdd = document.createElement('button');
  btnAdd.type = 'button';
  btnAdd.className = 'mini';
  btnAdd.textContent = '+ Add Snippet';
  btnAdd.addEventListener('click', () => {
    rowsWrap.appendChild(snippetRow(rowsWrap, profileState, state, stateKey, { selected: true }, markLocalWrite));
    markLocalWrite();
    syncFromDOM(rowsWrap, profileState, state, stateKey);
  });
  actions.appendChild(btnAdd);
  section.appendChild(h2);
  section.appendChild(help);
  section.appendChild(rowsWrap);
  section.appendChild(actions);
  node.appendChild(section);
  const existing = Array.isArray(profileState.snippets) ? profileState.snippets : [];
  if (existing.length) {
    existing.forEach((sn) => {
      rowsWrap.appendChild(snippetRow(rowsWrap, profileState, state, stateKey, sn, markLocalWrite));
    });
  } else {
    rowsWrap.appendChild(snippetRow(rowsWrap, profileState, state, stateKey, { selected: true }, markLocalWrite));
  }
}


/**
 * buildBuilderSnippetsPane.
 */
export function buildBuilderSnippetsPane(options = {}) {
  const {
    state,
    events = null,
    stateKey = DEFAULT_STATE_KEY,
    title = 'Snippets',
  } = options;
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') {
    throw new Error('BuilderSnippetsPane: missing state adapter');
  }
  const node = document.createElement('div');
  node.className = 'pane-builder-snippets';
  const paneOptions = { title };
  let ignoreNext = false;
  function markLocalWrite() {
    ignoreNext = true;
    setTimeout(() => {
      ignoreNext = false;
    }, 0);
  }
  render(node, state, stateKey, paneOptions, markLocalWrite);
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      if (ignoreNext) return;
      render(node, state, stateKey, paneOptions, markLocalWrite);
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
    },
  };
}

