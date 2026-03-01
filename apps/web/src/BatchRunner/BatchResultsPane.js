import { buildBatchResultPane } from './BatchResultPane.js';
import { button, clear, el } from '../utils/dom.js';
/**
 * buildBatchResultsPane.
 */
export function buildBatchResultsPane(options = {}) {
  const {
    title = 'Results',
  } = options;
  const node = el('div', { className: 'pane-batch-results' });
  const section = el('section', { className: 'pane pane--batch-results' });
  const heading = el('h2', { className: 'pane-title', text: title });
  const actions = el('div', { className: 'actions' });
  const btnClear = button({ text: 'Clear Results' });
  const list = el('div', { attrs: { id: 'batch-results' } });
  const items = [];
  function addResult(result) {
    const pane = buildBatchResultPane(result || {});
    items.push(pane);
    list.appendChild(pane.node);
  }
  function clearResults() {
    items.forEach((pane) => pane.destroy());
    items.length = 0;
    clear(list);
  }
  function onClear() {
    clearResults();
  }
  btnClear.addEventListener('click', onClear);
  actions.appendChild(btnClear);
  section.appendChild(heading);
  section.appendChild(actions);
  section.appendChild(list);
  node.appendChild(section);
  return {
    node,
    addResult,
    clearResults,
    destroy() {
      btnClear.removeEventListener('click', onClear);
      clearResults();
    },
  };
}

