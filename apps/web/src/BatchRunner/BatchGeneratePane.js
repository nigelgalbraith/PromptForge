import { button, el } from '../utils/dom.js';
/**
 * buildBatchGeneratePane.
 */
export function buildBatchGeneratePane(options = {}) {
  const {
    getQueue,
    runJob,
    onResult,
  } = options;
  if (typeof getQueue !== 'function') throw new Error('BatchGeneratePane: missing getQueue');
  if (typeof runJob !== 'function') throw new Error('BatchGeneratePane: missing runJob');
  const node = el('div', { className: 'pane-batch-generate' });
  const section = el('section', { className: 'pane pane--batch-generate' });
  const title = el('h2', { className: 'pane-title', text: 'Batch Generate' });
  const actions = el('div', { className: 'actions' });
  const btnGenerateAll = button({ className: 'primary', text: 'Generate All' });
  const btnCancel = button({ text: 'Cancel' });
  const status = el('p', { className: 'muted batch-status', text: 'Status: Idle' });
  btnCancel.disabled = true;
  actions.appendChild(btnGenerateAll);
  actions.appendChild(btnCancel);
  section.appendChild(title);
  section.appendChild(actions);
  section.appendChild(status);
  node.appendChild(section);
  let isRunning = false;
  let cancelRequested = false;
  let dotTimer = null;
  let dotCount = 0;
  function startDots(baseText) {
    if (dotTimer) clearInterval(dotTimer);
    dotCount = 0;
    status.textContent = baseText;
    dotTimer = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      status.textContent = `${baseText}${'.'.repeat(dotCount)}`;
    }, 400);
  }
  function stopDots(finalText) {
    if (dotTimer) {
      clearInterval(dotTimer);
      dotTimer = null;
    }
    if (typeof finalText === 'string') status.textContent = finalText;
  }
  function setRunning(running) {
    btnGenerateAll.disabled = !!running;
    btnCancel.disabled = !running;
  }
  async function onGenerateAllClick() {
    if (isRunning) return;
    const queue = Array.isArray(getQueue()) ? getQueue() : [];
    const total = queue.length;
    if (!total) {
      status.textContent = 'Status: Idle';
      return;
    }
    isRunning = true;
    cancelRequested = false;
    setRunning(true);
    for (let index = 0; index < total; index += 1) {
      if (cancelRequested) break;
      const job = queue[index];
      if (!job) continue;
      const baseStatus = `Status: Generating ${String(job.profileKey || '')} ${index + 1}/${total}`;
      startDots(baseStatus);
      try {
        // Required: sequential execution.
        // eslint-disable-next-line no-await-in-loop
        const result = await runJob(job, index, total);
        if (typeof onResult === 'function') onResult(result);
      } catch (error) {
        if (typeof onResult === 'function') {
          onResult({
            modelKey: String(job.modelKey || ''),
            profileId: String(job.profileKey || ''),
            ok: false,
            text: '',
            message: String(error && error.message ? error.message : error || 'Failed'),
          });
        }
      }
    }
    isRunning = false;
    setRunning(false);
    stopDots(cancelRequested ? 'Status: Cancelled' : 'Status: Idle');
  }
  function onCancelClick() {
    if (!isRunning) return;
    cancelRequested = true;
    stopDots('Status: Cancelling');
  }
  btnGenerateAll.addEventListener('click', onGenerateAllClick);
  btnCancel.addEventListener('click', onCancelClick);
  return {
    node,
    destroy() {
      stopDots();
      btnGenerateAll.removeEventListener('click', onGenerateAllClick);
      btnCancel.removeEventListener('click', onCancelClick);
    },
  };
}

