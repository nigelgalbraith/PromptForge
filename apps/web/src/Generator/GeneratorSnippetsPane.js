const FLASH_DURATION = 1200;
function flash(flashDiv, msg, timeout) {
  if (!flashDiv) return;
  flashDiv.textContent = msg || '';
  flashDiv.classList.add('show');
  setTimeout(() => {
    flashDiv.classList.remove('show');
  }, timeout || FLASH_DURATION);
}


function renderOneItem(item, list) {
  const card = document.createElement('div');
  card.className = 'snippet-card';
  const head = document.createElement('div');
  head.className = 'snippet-head';
  const subject = document.createElement('div');
  subject.className = 'snippet-subject';
  subject.textContent = item.subject || '';
  const include = document.createElement('label');
  include.className = 'snippet-include';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = item.selected !== false;
  cb.dataset.role = 'snippet-selected';
  cb.dataset.subject = item.subject || '';
  cb.addEventListener('change', () => {
    item.selected = cb.checked;
  });
  const span = document.createElement('span');
  span.textContent = 'Use';
  include.appendChild(cb);
  include.appendChild(span);
  head.appendChild(subject);
  head.appendChild(include);
  const body = document.createElement('div');
  body.className = 'snippet-body';
  const ta = document.createElement('textarea');
  ta.readOnly = true;
  ta.rows = 4;
  ta.value = item.text || '';
  ta.dataset.role = 'snippet-text';
  ta.dataset.subject = item.subject || '';
  body.appendChild(ta);
  card.appendChild(head);
  card.appendChild(body);
  list.appendChild(card);
}


function render(node, profile, defaultTitle) {
  node.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'pane pane--generator-snippets';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = defaultTitle || 'Snippets';
  const actions = document.createElement('div');
  actions.className = 'actions';
  const btnAll = document.createElement('button');
  btnAll.className = 'mini';
  btnAll.type = 'button';
  btnAll.textContent = 'Select All';
  const btnNone = document.createElement('button');
  btnNone.className = 'mini';
  btnNone.type = 'button';
  btnNone.textContent = 'Clear';
  actions.appendChild(btnAll);
  actions.appendChild(btnNone);
  const list = document.createElement('div');
  list.className = 'snippet-list';
  const flashDiv = document.createElement('div');
  flashDiv.className = 'flash';
  const items = Array.isArray(profile && profile.snippets) ? profile.snippets : [];
  function rerenderList() {
    list.innerHTML = '';
    items.forEach((it) => {
      if (!it) return;
      if (!String(it.subject || '').trim() && !String(it.text || '').trim()) return;
      renderOneItem(it, list);
    });
  }
  btnAll.addEventListener('click', () => {
    items.forEach((i) => {
      if (i) i.selected = true;
    });
    rerenderList();
    flash(flashDiv, 'All selected');
  });
  btnNone.addEventListener('click', () => {
    items.forEach((i) => {
      if (i) i.selected = false;
    });
    rerenderList();
    flash(flashDiv, 'Cleared');
  });
  rerenderList();
  section.appendChild(h2);
  section.appendChild(actions);
  section.appendChild(list);
  section.appendChild(flashDiv);
  node.appendChild(section);
}


/** Gets get profile. */
function getProfile(state, stateKey) {
  if (!state || typeof state.get !== 'function') return null;
  return state.get(stateKey);
}


/**
 * buildGeneratorSnippetsPane.
 */
export function buildGeneratorSnippetsPane(options = {}) {
  const {
    state = null,
    events = null,
    stateKey = 'TEXT_PROFILE',
    defaultTitle = 'Snippets',
  } = options;
  const node = document.createElement('div');
  node.className = 'pane-generator-snippets';
  function rerenderFromState() {
    const profile = getProfile(state, stateKey);
    if (!profile) {
  node.innerHTML = '';
      return;
    }
    render(node, profile, defaultTitle);
  }
  rerenderFromState();
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      rerenderFromState();
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
    },
  };
}

