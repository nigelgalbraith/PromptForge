import { button, el } from '../utils/dom.js';
function extractProfileName(profileId) {
  const parts = String(profileId || '').split('/');
  return parts[parts.length - 1] || String(profileId || '');
}


function copyText(text) {
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    return Promise.reject(new Error('Clipboard unavailable'));
  }
  return navigator.clipboard.writeText(String(text || ''));
}


/**
 * buildBatchResultPane.
 */
export function buildBatchResultPane(options = {}) {
  const {
    provider = '',
    model = '',
    profileId = '',
    text = '',
    ok = true,
    message = '',
  } = options;
  const node = el('section', { className: 'pane pane--batch-result' });
  const title = el('h2', { className: 'pane-title', text: 'Batch Result' });
  const modelLine = el('p', { text: `Model: ${provider}/${model}` });
  const profileLine = el('p', { text: `Profile: ${extractProfileName(profileId)}` });
  const statusLine = el('p', {
    className: 'muted',
    text: ok ? String(message || 'Generation complete') : `Generation error: ${String(message || 'Failed')}`,
  });
  const actions = el('div', { className: 'actions' });
  const btnCopy = button({ text: 'Copy' });
  const copyStatus = el('span', { className: 'muted', text: '' });
  const textNode = el('pre', { className: 'text', text: String(text || '') });
  function onCopy() {
    if (!textNode.textContent) {
      copyStatus.textContent = 'Nothing to copy';
      return;
    }
    copyText(textNode.textContent)
      .then(() => {
        copyStatus.textContent = 'Copied';
      })
      .catch(() => {
        copyStatus.textContent = 'Copy failed';
      });
  }
  actions.appendChild(btnCopy);
  actions.appendChild(copyStatus);
  node.appendChild(title);
  node.appendChild(modelLine);
  node.appendChild(profileLine);
  node.appendChild(statusLine);
  node.appendChild(actions);
  node.appendChild(textNode);
  btnCopy.addEventListener('click', onCopy);
  return {
    node,
    destroy() {
      btnCopy.removeEventListener('click', onCopy);
    },
  };
}

