import { clear, el } from '../utils/dom.js';
function renderQueue(listNode, queue) {
  clear(listNode);
  if (!queue.length) {
    listNode.appendChild(el('p', { className: 'muted', text: 'Queue is empty.' }));
    return;
  }
  queue.forEach((job, index) => {
    const row = el('div', { className: 'group' });
    const text = el('p', { text: `${index + 1}. ${String(job.modelKey || '')} -> ${String(job.profileKey || '')}` });
    row.appendChild(text);
    listNode.appendChild(row);
  });
}


/**
 * buildBatchQueuePane.
 */
export function buildBatchQueuePane(options = {}) {
  const {
    title = 'Queue',
  } = options;
  const node = el('div', { className: 'pane-batch-queue' });
  const section = el('section', { className: 'pane pane--batch-queue' });
  const heading = el('h2', { className: 'pane-title', text: title });
  const list = el('div');
  function setQueue(queue) {
    renderQueue(list, Array.isArray(queue) ? queue : []);
  }
  function clearQueue() {
    setQueue([]);
  }
  section.appendChild(heading);
  section.appendChild(list);
  node.appendChild(section);
  setQueue([]);
  return {
    node,
    setQueue,
    clearQueue,
    destroy() {
      // no-op
    },
  };
}

