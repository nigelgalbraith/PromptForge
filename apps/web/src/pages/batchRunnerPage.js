import { buildBatchGeneratePane } from '../BatchRunner/BatchGeneratePane.js';
import { buildBatchProfileSelectionPane } from '../BatchRunner/BatchProfileSelectionPane.js';
import { buildBatchQueuePane } from '../BatchRunner/BatchQueuePane.js';
import { buildBatchResultsPane } from '../BatchRunner/BatchResultsPane.js';
import { fetchProfileById, fetchProfilesList } from '../BatchRunner/batchRunnerApi.js';
import { buildIntroPane } from '../Common/IntroPane.js';
import { buildStatusTickerPane } from '../Common/StatusTickerPane.js';
import { buildAppShell } from '../core/appShell.js';
import { createPageLifecycle } from '../core/pageLifecycle.js';
import { el } from '../utils/dom.js';
import { applySavedTheme, initThemeToggle } from '../utils/theme.js';
import '../../snippets/intro.js';
let pageLifecycle = null;
/**
 * destroyPage.
 */
export function destroyPage() {
  if (!pageLifecycle) return;
  pageLifecycle.destroy();
  pageLifecycle = null;
}


function parseModelKey(modelKey) {
  const parts = String(modelKey || '').split('/');
  return {
    provider: String(parts[0] || '').trim().toLowerCase(),
    model: String(parts[1] || '').trim(),
  };
}


function buildProfileTree(list) {
  const tree = Object.create(null);
  (Array.isArray(list) ? list : []).forEach((entry) => {
    const parts = String(entry || '').split('/');
    if (parts.length !== 3) return;
    const [ai, model, profile] = parts;
    if (!ai || !model || !profile || !profile.endsWith('.json')) return;
    if (!tree[ai]) tree[ai] = Object.create(null);
    if (!tree[ai][model]) tree[ai][model] = [];
    tree[ai][model].push(profile);
  });
  Object.keys(tree).forEach((ai) => {
    Object.keys(tree[ai]).forEach((model) => {
      tree[ai][model].sort((a, b) => a.localeCompare(b));
    });
  });
  return tree;
}


function buildJobsInOrder(queue, modelOrder) {
  const grouped = new Map();
  queue.forEach((job) => {
    const key = String(job && job.modelKey ? job.modelKey : '').trim();
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(job);
  });
  const out = [];
  modelOrder.forEach((modelKey) => {
    const jobs = grouped.get(modelKey);
    if (!jobs) return;
    jobs.forEach((job) => out.push(job));
  });
  grouped.forEach((jobs, key) => {
    if (modelOrder.includes(key)) return;
    jobs.forEach((job) => out.push(job));
  });
  return out;
}


async function runGenerate(provider, model, prompt) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model, prompt }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP ${response.status}`);
  }
  const data = await response.json();
  const outputText =
    typeof data?.output === 'string'
      ? data.output
      : typeof data?.response === 'string'
        ? data.response
        : typeof data?.text === 'string'
          ? data.text
          : '';
  return String(outputText || '').trim();
}


async function executeJob(job, abortSignal) {
  const profileName = String(job && job.profileKey ? job.profileKey : '').trim();
  const profileId = `${String(job && job.modelKey ? job.modelKey : '').trim()}/${profileName}`;
  const profile = await fetchProfileById(profileId, abortSignal);
  const defaults = profile && typeof profile === 'object' ? profile.defaults : null;
  const providerFromProfile = String(defaults && defaults.provider ? defaults.provider : '').trim().toLowerCase();
  const modelFromProfile = String(defaults && defaults.model ? defaults.model : '').trim();
  const provider = providerFromProfile;
  const model = modelFromProfile;
  if (!provider || !model) {
    return {
      provider,
      model,
      profileId,
      ok: false,
      text: '',
      message: 'Profile defaults missing provider/model',
    };
  }
  const prompt = String(profile && (profile.prompt || profile.template) ? profile.prompt || profile.template : '').trim();
  if (!prompt) {
    return {
      provider,
      model,
      profileId,
      ok: false,
      text: '',
      message: 'Missing prompt/template',
    };
  }
  try {
    const text = await runGenerate(provider, model, prompt);
    return {
      provider,
      model,
      profileId,
      ok: true,
      text,
      message: 'Generation complete',
    };
  } catch (error) {
    return {
      provider,
      model,
      profileId,
      ok: false,
      text: '',
      message: String(error && error.message ? error.message : error || 'Failed'),
    };
  }
}


/** Initializes the batch runner page and mounts all panes. */
export function initPage() {
  destroyPage();
  pageLifecycle = createPageLifecycle();
  applySavedTheme();
  const app = document.getElementById('app');
  if (!app) throw new Error('batchRunnerPage: missing #app root element');
  const { main } = buildAppShell({
    appRoot: app,
    titleText: 'Batch Runner',
    activeNavKey: 'batch',
  });
  const selectionByModel = {};
  let queue = [];
  const modelOrder = [];
  const selectionPanes = [];
  const tickerControllerRef = { current: null };
  // ---- Status Ticker Pane ----
  const tickerPane = buildStatusTickerPane({
    messagesUrl: 'profiles/messages.json',
    tickerId: 'profile-main',
    onController(controller) {
      tickerControllerRef.current = controller;
    },
  });
  main.appendChild(tickerPane.node);
  pageLifecycle.add(() => tickerPane.destroy());
  // ---- Intro Pane ----
  const introPane = buildIntroPane({ introKey: 'batch' });
  introPane.node.classList.add('intro-text');
  main.appendChild(introPane.node);
  pageLifecycle.add(() => introPane.destroy());
  const modelContainer = el('div', { attrs: { id: 'batch-model-container' } });
  const queueContainer = el('div', { attrs: { id: 'batch-queue-container' } });
  const generateContainer = el('div', { attrs: { id: 'batch-generate-container' } });
  main.appendChild(modelContainer);
  main.appendChild(queueContainer);
  main.appendChild(generateContainer);
  // ---- Batch Results Pane ----
  const resultsPane = buildBatchResultsPane({ title: 'Results' });
  main.appendChild(resultsPane.node);
  pageLifecycle.add(() => resultsPane.destroy());
  function buildQueueFromSelections(currentSelectionByModel) {
    const nextQueue = [];
    for (const modelKey in currentSelectionByModel) {
      if (!Object.prototype.hasOwnProperty.call(currentSelectionByModel, modelKey)) continue;
      const profiles = Array.isArray(currentSelectionByModel[modelKey]) ? currentSelectionByModel[modelKey] : [];
      profiles.forEach((profileKey) => {
        nextQueue.push({ modelKey, profileKey });
      });
    }
    return nextQueue;
  }
  function rebuildQueue() {
    queue = buildQueueFromSelections(selectionByModel);
    queuePane.setQueue(buildJobsInOrder(queue, modelOrder));
  }
  const queuePane = buildBatchQueuePane({
    title: 'Queue',
  });
  queueContainer.appendChild(queuePane.node);
  pageLifecycle.add(() => queuePane.destroy());
  const controller = new AbortController();
  pageLifecycle.add(() => controller.abort());
  // ---- Batch Generate Pane ----
  const generatePane = buildBatchGeneratePane({
    getQueue() {
      return buildJobsInOrder(queue, modelOrder).slice();
    },
    async runJob(job) {
      return executeJob(job, controller.signal);
    },
    onResult(result) {
      resultsPane.addResult(result);
    },
  });
  generateContainer.appendChild(generatePane.node);
  pageLifecycle.add(() => generatePane.destroy());
  pageLifecycle.add(() => {
    selectionPanes.forEach((pane) => pane.destroy());
  });
  fetchProfilesList(controller.signal)
    .then((profilesList) => {
      const profileTree = buildProfileTree(profilesList);
      const ais = Object.keys(profileTree).sort((a, b) => a.localeCompare(b));
      ais.forEach((ai) => {
        const models = Object.keys(profileTree[ai] || {}).sort((a, b) => a.localeCompare(b));
        models.forEach((model) => {
          const profiles = Array.isArray(profileTree[ai][model]) ? profileTree[ai][model] : [];
          if (!profiles.length) return;
          const modelKey = `${ai}/${model}`;
          modelOrder.push(modelKey);
          selectionByModel[modelKey] = [];
          const pane = buildBatchProfileSelectionPane({
            modelKey,
            profiles,
            onSelectionChange(payload) {
              const key = String(payload && payload.modelKey ? payload.modelKey : modelKey);
              const selectedProfiles = Array.isArray(payload && payload.selectedProfiles) ? payload.selectedProfiles : [];
              selectionByModel[key] = selectedProfiles.slice();
              rebuildQueue();
            },
          });
          modelContainer.appendChild(pane.node);
          selectionPanes.push(pane);
        });
      });
      if (!selectionPanes.length) {
        modelContainer.appendChild(el('p', { className: 'muted', text: 'No saved profiles found.' }));
      }
      rebuildQueue();
    })
    .catch(() => {
      const msg = 'Unable to load profiles.';
      modelContainer.appendChild(el('p', { className: 'muted', text: msg }));
      if (tickerControllerRef.current && typeof tickerControllerRef.current.showTemporary === 'function') {
        tickerControllerRef.current.showTemporary(msg, 3000);
      }
    });
  initThemeToggle();
}
initPage();

