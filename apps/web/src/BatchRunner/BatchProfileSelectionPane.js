import { button, clear, el } from '../utils/dom.js';
function setAllChecked(listNode, checked) {
  listNode.querySelectorAll('input[data-role="batch-profile"]').forEach((node) => {
    node.checked = checked;
  });
}


function collectSelected(listNode) {
  return Array.from(listNode.querySelectorAll('input[data-role="batch-profile"]:checked'))
    .map((node) => String(node.value || '').trim())
    .filter(Boolean);
}


function renderProfiles(listNode, profiles) {
  clear(listNode);
  profiles.forEach((profileName) => {
    const name = String(profileName || '').trim();
    if (!name) return;
    const row = el('label', { className: 'checkbox-row' });
    const input = el('input', {
      attrs: {
        type: 'checkbox',
        value: name,
        'data-role': 'batch-profile',
      },
    });
    const text = el('span', { text: name });
    row.appendChild(input);
    row.appendChild(text);
    listNode.appendChild(row);
  });
}


/**
 * buildBatchProfileSelectionPane.
 */
export function buildBatchProfileSelectionPane(options = {}) {
  const {
    modelKey,
    profiles = [],
    onSelectionChange,
  } = options;
  const normalizedModelKey = String(modelKey || '').trim();
  const profileNames = (Array.isArray(profiles) ? profiles : [])
    .map((name) => String(name || '').trim())
    .filter(Boolean);
  const node = el('div', { className: 'pane-batch-profile-selection' });
  const section = el('section', { className: 'pane pane--batch-profile-selection' });
  const title = el('h2', { className: 'pane-title', text: normalizedModelKey });
  const actions = el('div', { className: 'actions' });
  const btnSelectAll = button({ text: 'Select All' });
  const btnClear = button({ text: 'Clear' });
  const list = el('div', { className: 'checklist' });
  renderProfiles(list, profileNames);
  actions.appendChild(btnSelectAll);
  actions.appendChild(btnClear);
  section.appendChild(title);
  section.appendChild(actions);
  section.appendChild(list);
  node.appendChild(section);
  function emitSelection() {
    if (typeof onSelectionChange !== 'function') return;
    onSelectionChange({
      modelKey: normalizedModelKey,
      selectedProfiles: collectSelected(list),
    });
  }
  function onSelectAllClick() {
    setAllChecked(list, true);
    emitSelection();
  }
  function onClearClick() {
    setAllChecked(list, false);
    emitSelection();
  }
  function onListChange() {
    emitSelection();
  }
  btnSelectAll.addEventListener('click', onSelectAllClick);
  btnClear.addEventListener('click', onClearClick);
  list.addEventListener('change', onListChange);
  emitSelection();
  return {
    node,
    destroy() {
      btnSelectAll.removeEventListener('click', onSelectAllClick);
      btnClear.removeEventListener('click', onClearClick);
      list.removeEventListener('change', onListChange);
    },
  };
}

