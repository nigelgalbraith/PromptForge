const FLASH_DURATION = 1200;
function toSlug(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}


function flash(flashDiv, msg, timeout) {
  if (!flashDiv) return;
  flashDiv.textContent = msg || '';
  flashDiv.classList.add('show');
  setTimeout(() => {
    flashDiv.classList.remove('show');
  }, timeout || FLASH_DURATION);
}


function renderOneGroup(group, container, defaultTitle) {
  const section = document.createElement('section');
  section.className = 'pane checklist-group';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = group.title || defaultTitle || 'Options';
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
  list.className = 'checklist';
  const flashDiv = document.createElement('div');
  flashDiv.className = 'flash';
  const slug = toSlug(group.title || defaultTitle || 'options');
  function renderList() {
    list.innerHTML = '';
    (group.items || []).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'checkrow';
      const lab = document.createElement('label');
      lab.textContent = item.label || '';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!item.selected;
      cb.dataset.group = slug;
      cb.dataset.label = item.label || '';
      cb.addEventListener('change', () => {
        item.selected = cb.checked;
      });
      row.appendChild(lab);
      row.appendChild(cb);
      list.appendChild(row);
    });
  }
  btnAll.addEventListener('click', () => {
    (group.items || []).forEach((i) => {
      i.selected = true;
    });
    renderList();
    flash(flashDiv, 'All selected');
  });
  btnNone.addEventListener('click', () => {
    (group.items || []).forEach((i) => {
      i.selected = false;
    });
    renderList();
    flash(flashDiv, 'Cleared');
  });
  renderList();
  section.appendChild(h2);
  section.appendChild(actions);
  section.appendChild(list);
  section.appendChild(flashDiv);
  container.appendChild(section);
}


function renderAll(node, profile, defaultTitle) {
  node.innerHTML = '';
  const groups = Array.isArray(profile && profile.options) ? profile.options : [];
  groups.forEach((g) => {
    renderOneGroup(
      {
        title: g.title || defaultTitle || 'Options',
        items: (g.items || []).map((it) => ({
          label: it.label || '',
          selected: !!it.selected,
        })),
      },
      node,
      defaultTitle,
    );
  });
}


/** Gets get profile. */
function getProfile(state, stateKey) {
  if (!state || typeof state.get !== 'function') return null;
  return state.get(stateKey);
}


/**
 * buildGeneratorChecklistPane.
 */
export function buildGeneratorChecklistPane(options = {}) {
  const {
    state = null,
    events = null,
    stateKey = 'TEXT_PROFILE',
    defaultTitle = 'Options',
  } = options;
  const node = document.createElement('div');
  node.className = 'pane-generator-checklists';
  function rerenderFromState() {
    const profile = getProfile(state, stateKey);
    if (!profile) {
  node.innerHTML = '';
      return;
    }
    renderAll(node, profile, defaultTitle);
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

