import { buildCompiledPrompt } from './GeneratorPreviewPane.js';
const FLASH_AUTOHIDE_MS = 1500;
/**
 * buildGeneratorCompiledPromptPane.
 */
export function buildGeneratorCompiledPromptPane(options = {}) {
  const {
    state = null,
    events = null,
    stateKey = 'TEXT_PROFILE',
    formRoot = null,
    checklistsRoot = null,
    snippetsRoot = null,
    title = 'Compiled Prompt',
    copyLabel = 'Copy',
  } = options;
  const node = document.createElement('div');
  node.className = 'pane-generator-compiled-prompt';
  const section = document.createElement('section');
  section.className = 'pane pane--generator-compiled-prompt';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = title;
  const actions = document.createElement('div');
  actions.className = 'actions';
  const btnCopy = document.createElement('button');
  btnCopy.type = 'button';
  btnCopy.textContent = copyLabel;
  actions.appendChild(btnCopy);
  const flashDiv = document.createElement('div');
  flashDiv.className = 'flash';
  const text = document.createElement('div');
  text.className = 'text';
  text.id = 'compiled-prompt-text';
  section.appendChild(h2);
  section.appendChild(actions);
  section.appendChild(flashDiv);
  section.appendChild(text);
  node.appendChild(section);
/** Gets get profile. */
  function getProfile() {
    if (!state || typeof state.get !== 'function') return {};
    return state.get(stateKey) || {};
  }
  function renderCompiled() {
    const compiled = buildCompiledPrompt({
      profile: getProfile(),
      formRoot,
      checklistsRoot,
      snippetsRoot,
    });
    text.textContent = compiled || '';
  }
  function flash(msg) {
    flashDiv.textContent = msg || '';
    flashDiv.classList.add('show');
    setTimeout(() => {
      flashDiv.classList.remove('show');
      flashDiv.textContent = '';
    }, FLASH_AUTOHIDE_MS);
  }
  function onCopyClick() {
    const compiled = text.textContent || '';
    if (!compiled) {
      flash('Nothing to copy');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(compiled)
        .then(() => {
          flash('Copied');
        })
        .catch(() => {
          flash('Clipboard error');
        });
      return;
    }
    flash('Clipboard not available');
  }
  function onSourceChange() {
    renderCompiled();
  }
  btnCopy.addEventListener('click', onCopyClick);
  if (formRoot) {
    formRoot.addEventListener('input', onSourceChange);
    formRoot.addEventListener('change', onSourceChange);
  }
  if (checklistsRoot) {
    checklistsRoot.addEventListener('input', onSourceChange);
    checklistsRoot.addEventListener('change', onSourceChange);
    checklistsRoot.addEventListener('click', onSourceChange);
  }
  if (snippetsRoot) {
    snippetsRoot.addEventListener('input', onSourceChange);
    snippetsRoot.addEventListener('change', onSourceChange);
    snippetsRoot.addEventListener('click', onSourceChange);
  }
  renderCompiled();
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      renderCompiled();
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
      btnCopy.removeEventListener('click', onCopyClick);
      if (formRoot) {
        formRoot.removeEventListener('input', onSourceChange);
        formRoot.removeEventListener('change', onSourceChange);
      }
      if (checklistsRoot) {
        checklistsRoot.removeEventListener('input', onSourceChange);
        checklistsRoot.removeEventListener('change', onSourceChange);
        checklistsRoot.removeEventListener('click', onSourceChange);
      }
      if (snippetsRoot) {
        snippetsRoot.removeEventListener('input', onSourceChange);
        snippetsRoot.removeEventListener('change', onSourceChange);
        snippetsRoot.removeEventListener('click', onSourceChange);
      }
    },
  };
}

