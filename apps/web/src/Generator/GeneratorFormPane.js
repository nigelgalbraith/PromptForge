import { parseCsvOrArray } from '../utils/parse.js';
const DEFAULT_TEXTAREA_ROWS = 20;
const DEFAULT_STYLES = ['Professional', 'Friendly', 'Direct', 'Concise'];
function toTitle(label) {
  return String(label || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}


function buildSchema(profile = {}) {
  if (Array.isArray(profile.formSchema) && profile.formSchema.length) {
    return profile.formSchema;
  }
  const form = profile.form || profile.profile || {};
  const keys = Object.keys(form);
  return keys.map((key) => {
    const lower = String(key).toLowerCase();
    let type = 'text';
    if (lower.indexOf('desc') !== -1) type = 'textarea';
    else if (lower.indexOf('style') !== -1) type = 'select';
    return {
      key,
      label: toTitle(key),
      type,
      rows: DEFAULT_TEXTAREA_ROWS,
    };
  });
}


function renderForm(node, profile, opts) {
  const titleText = opts.title || 'Details';
  const defaultStyles = opts.defaultStyles || DEFAULT_STYLES;
  node.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'pane pane--generator-form';
  const h2 = document.createElement('h2');
  h2.textContent = titleText;
  h2.className = 'pane-title';
  const wrap = document.createElement('div');
  const schema = buildSchema(profile);
  const formDefaults = (profile && (profile.form || profile.profile)) || {};
  const styles = Array.isArray(profile && profile.styles) ? profile.styles : defaultStyles;
  schema.forEach((field) => {
    const key = field.key;
    const label = field.label;
    const type = field.type;
    const rows = field.rows || DEFAULT_TEXTAREA_ROWS;
    const group = document.createElement('div');
    group.className = 'group';
    const lab = document.createElement('label');
    lab.textContent = label;
    let input;
    if (type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = rows;
    } else if (type === 'select') {
      input = document.createElement('select');
      styles.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement('input');
    }
    input.dataset.key = key;
    const initial = formDefaults[key];
    if (initial != null) input.value = String(initial);
    group.appendChild(lab);
    group.appendChild(input);
    wrap.appendChild(group);
  });
  section.appendChild(h2);
  section.appendChild(wrap);
  node.appendChild(section);
}


/** Gets get profile. */
function getProfile(state, stateKey) {
  if (!state || typeof state.get !== 'function') return null;
  return state.get(stateKey);
}


/**
 * buildGeneratorFormPane.
 */
export function buildGeneratorFormPane(options = {}) {
  const {
    state = null,
    events = null,
    stateKey = 'TEXT_PROFILE',
    title = 'Details',
    defaultStyles = DEFAULT_STYLES,
  } = options;
  const node = document.createElement('div');
  node.className = 'pane-generator-form';
  const resolvedStyles = parseCsvOrArray(defaultStyles, DEFAULT_STYLES);
  function renderFromState() {
    const profile = getProfile(state, stateKey);
    if (!profile) return;
    renderForm(node, profile, {
      title,
      defaultStyles: resolvedStyles,
    });
  }
  renderFromState();
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      renderFromState();
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
    },
  };
}

