import { DEFAULT_STATE_KEY, ensureProfileState } from '../core/profileState.js';
function syncFromDOM(groupsWrap, profileState, state, stateKey) {
  const result = [];
  const groups = groupsWrap.querySelectorAll('.builder-group');
  Array.prototype.forEach.call(groups, (g) => {
    const inputs = g.querySelectorAll('input');
    if (!inputs.length) return;
    const title = (inputs[0].value || '').trim();
    const items = Array.prototype.slice
      .call(inputs, 1)
      .map((inp) => ({ label: (inp.value || '').trim() }))
      .filter((it) => it.label);
    if (title) result.push({ title, items });
  });
  profileState.options = result;
  state.set(stateKey, profileState);
}


function itemRow(groupsWrap, profileState, state, stateKey, value, markLocalWrite) {
  const row = document.createElement('div');
  row.className = 'checklist-item-row';
  const input = document.createElement('input');
  input.placeholder = 'Item label';
  input.value = value || '';
  input.addEventListener('input', () => {
    markLocalWrite();
    syncFromDOM(groupsWrap, profileState, state, stateKey);
  });
  const btnRemove = document.createElement('button');
  btnRemove.type = 'button';
  btnRemove.className = 'mini danger';
  btnRemove.textContent = '×';
  btnRemove.addEventListener('click', () => {
    row.remove();
    markLocalWrite();
    syncFromDOM(groupsWrap, profileState, state, stateKey);
  });
  row.appendChild(input);
  row.appendChild(btnRemove);
  return row;
}


function addGroup(groupsWrap, profileState, state, stateKey, title, items, markLocalWrite) {
  const resolvedTitle = title || '';
  const resolvedItems = items || [];
  const group = document.createElement('div');
  group.className = 'group builder-group';
  const lab = document.createElement('label');
  lab.textContent = 'Group';
  const titleInput = document.createElement('input');
  titleInput.placeholder = 'Group Title (e.g., Core Capabilities)';
  titleInput.value = resolvedTitle;
  titleInput.addEventListener('input', () => {
    markLocalWrite();
    syncFromDOM(groupsWrap, profileState, state, stateKey);
  });
  const titleWrap = document.createElement('div');
  titleWrap.className = 'checklist-title-wrap';
  titleWrap.appendChild(lab);
  titleWrap.appendChild(titleInput);
  const itemsWrap = document.createElement('div');
  itemsWrap.className = 'checklist-items-wrap';
  const inner = document.createElement('div');
  resolvedItems.forEach((it) => {
    inner.appendChild(itemRow(groupsWrap, profileState, state, stateKey, (it && it.label) || '', markLocalWrite));
  });
  const btnAdd = document.createElement('button');
  btnAdd.type = 'button';
  btnAdd.className = 'mini';
  btnAdd.textContent = '+ Item';
  btnAdd.addEventListener('click', () => {
    inner.appendChild(itemRow(groupsWrap, profileState, state, stateKey, '', markLocalWrite));
    markLocalWrite();
    syncFromDOM(groupsWrap, profileState, state, stateKey);
  });
  itemsWrap.appendChild(inner);
  itemsWrap.appendChild(btnAdd);
  group.appendChild(titleWrap);
  group.appendChild(itemsWrap);
  groupsWrap.appendChild(group);
  markLocalWrite();
  syncFromDOM(groupsWrap, profileState, state, stateKey);
}


function render(node, state, stateKey, opts, markLocalWrite) {
  const titleText = opts.title || 'Checklist Groups';
  const defaultGroupTitle = opts.defaultGroup || 'Core Skills';
  const profileState = ensureProfileState(state, stateKey);
  node.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'pane pane--builder-checklists';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = titleText;
  const groupsWrap = document.createElement('div');
  groupsWrap.className = 'builder-checklist-groups';
  const btnAddGroup = document.createElement('button');
  btnAddGroup.type = 'button';
  btnAddGroup.className = 'mini';
  btnAddGroup.textContent = '+ Add Group';
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.appendChild(btnAddGroup);
  section.appendChild(h2);
  section.appendChild(groupsWrap);
  section.appendChild(actions);
  node.appendChild(section);
  btnAddGroup.addEventListener('click', () => {
    addGroup(groupsWrap, profileState, state, stateKey, '', [], markLocalWrite);
  });
  const existing = Array.isArray(profileState.options) ? profileState.options : [];
  if (existing.length) {
    existing.forEach((g) => {
      addGroup(groupsWrap, profileState, state, stateKey, g.title, g.items || [], markLocalWrite);
    });
  } else {
    addGroup(groupsWrap, profileState, state, stateKey, defaultGroupTitle, [], markLocalWrite);
  }
}


/**
 * buildBuilderChecklistPane.
 */
export function buildBuilderChecklistPane(options = {}) {
  const {
    state,
    events = null,
    stateKey = DEFAULT_STATE_KEY,
    title = 'Checklist Groups',
    defaultGroup = 'Core Skills',
  } = options;
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') {
    throw new Error('BuilderChecklistPane: missing state adapter');
  }
  const node = document.createElement('div');
  node.className = 'pane-builder-checklists';
  const paneOptions = {
    title,
    defaultGroup,
  };
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

