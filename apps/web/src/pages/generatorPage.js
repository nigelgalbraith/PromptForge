import { buildApiHealthPane } from '../Common/ApiHealthPane.js';
import { buildIntroPane } from '../Common/IntroPane.js';
import { buildProfileLoaderPane } from '../Common/ProfileLoaderPane.js';
import { buildStatusTickerPane } from '../Common/StatusTickerPane.js';
import { buildGeneratorChecklistPane } from '../Generator/GeneratorChecklistPane.js';
import { buildGeneratorCompiledPromptPane } from '../Generator/GeneratorCompiledPromptPane.js';
import { buildGeneratorFormPane } from '../Generator/GeneratorFormPane.js';
import { buildGeneratorPiperPane } from '../Generator/GeneratorPiperPane.js';
import { buildGeneratorPreviewPane } from '../Generator/GeneratorPreviewPane.js';
import { buildGeneratorProviderModelPane } from '../Generator/GeneratorProviderModelPane.js';
import { buildGeneratorSnippetsPane } from '../Generator/GeneratorSnippetsPane.js';
import { buildAppShell } from '../core/appShell.js';
import { createEventBus } from '../core/eventBus.js';
import { createPageLifecycle } from '../core/pageLifecycle.js';
import { applySavedTheme, initThemeToggle } from '../utils/theme.js';
import '../../snippets/intro.js';

const PROFILE_STATE_KEY = 'TEXT_PROFILE';

let pageLifecycle = null;

export function destroyPage() {
  if (!pageLifecycle) return;
  pageLifecycle.destroy();
  pageLifecycle = null;
}


/** Initializes the generator page and mounts all panes. */
export function initPage() {
  destroyPage();
  pageLifecycle = createPageLifecycle();
  applySavedTheme();
  const app = document.getElementById('app');
  if (!app) throw new Error('generatorPage: missing #app root element');
  const { main } = buildAppShell({
    appRoot: app,
    titleText: 'Prompt Generator',
    activeNavKey: 'generator',
  });
  const events = createEventBus();
  pageLifecycle.add(() => events.clear());
  const sharedStateStore = new Map();
  const sharedState = {
    get(key) {
      return sharedStateStore.get(String(key));
    },
    has(key) {
      return sharedStateStore.has(String(key));
    },
    set(key, value) {
      const stateKey = String(key);
      sharedStateStore.set(stateKey, value);
      events.emit('state:changed', { key: stateKey, value });
      events.emit(`state:changed:${stateKey}`, { key: stateKey, value });
      return value;
    },
  };
  const tickerControllerRef = { current: null };
  const tickerControllerProxy = {
    showTemporary(text, ms) {
      if (tickerControllerRef.current && typeof tickerControllerRef.current.showTemporary === 'function') {
        tickerControllerRef.current.showTemporary(text, ms);
      }
    },
  };

  // ---- API Health Pane ----
  const apiHealthPane = buildApiHealthPane({ healthUrl: '/api/', events });
  main.appendChild(apiHealthPane.node);
  pageLifecycle.add(() => apiHealthPane.destroy());

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
  const introPane = buildIntroPane({ introKey: 'main' });
  introPane.node.classList.add('intro-text');
  main.appendChild(introPane.node);
  pageLifecycle.add(() => introPane.destroy());

  // ---- Profile Loader Pane ----
  const profileLoaderPane = buildProfileLoaderPane({
    title: 'Profiles',
    state: sharedState,
    stateKey: PROFILE_STATE_KEY,
    tickerController: tickerControllerProxy,
  });
  main.appendChild(profileLoaderPane.node);
  pageLifecycle.add(() => profileLoaderPane.destroy());

  // ---- Generator Form Pane ----
  const generatorFormPane = buildGeneratorFormPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Details',
    defaultStyles: ['Professional', 'Friendly', 'Direct', 'Concise'],
  });
  main.appendChild(generatorFormPane.node);
  pageLifecycle.add(() => generatorFormPane.destroy());

  // ---- Generation Target Pane ----
  const generatorProviderModelPane = buildGeneratorProviderModelPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Generation Target',
  });
  main.appendChild(generatorProviderModelPane.node);
  pageLifecycle.add(() => generatorProviderModelPane.destroy());

  // ---- Generator Checklist Pane ----
  const generatorChecklistPane = buildGeneratorChecklistPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    defaultTitle: 'Options',
  });
  main.appendChild(generatorChecklistPane.node);
  pageLifecycle.add(() => generatorChecklistPane.destroy());

  // ---- Generator Snippets Pane ----
  const generatorSnippetsPane = buildGeneratorSnippetsPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    defaultTitle: 'Snippets',
  });
  main.appendChild(generatorSnippetsPane.node);
  pageLifecycle.add(() => generatorSnippetsPane.destroy());

  // ---- Compiled Prompt Pane ----
  const generatorCompiledPromptPane = buildGeneratorCompiledPromptPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    formRoot: generatorFormPane.node,
    checklistsRoot: generatorChecklistPane.node,
    snippetsRoot: generatorSnippetsPane.node,
    title: 'Compiled Prompt',
    copyLabel: 'Copy',
  });
  main.appendChild(generatorCompiledPromptPane.node);
  pageLifecycle.add(() => generatorCompiledPromptPane.destroy());

  // ---- Preview Pane ----
  const generatorPreviewPane = buildGeneratorPreviewPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    tickerController: tickerControllerProxy,
    apiUrl: '/api/generate',
    formRoot: generatorFormPane.node,
    checklistsRoot: generatorChecklistPane.node,
    snippetsRoot: generatorSnippetsPane.node,
    textId: 'generator-text',
    title: 'Preview',
    generateLabel: 'Generate',
    copyLabel: 'Copy',
    pdfLabel: 'Open PDF preview',
  });
  main.appendChild(generatorPreviewPane.node);
  pageLifecycle.add(() => generatorPreviewPane.destroy());

  // ---- Voice Pane ----
  const previewTextNode = generatorPreviewPane.node.querySelector('#generator-text');
  const generatorPiperPane = buildGeneratorPiperPane({
    piperBase: '/piper',
    voiceId: 'en_US-amy-low',
    targetElement: previewTextNode,
    tickerController: tickerControllerProxy,
    title: 'Voice (Piper)',
  });
  main.appendChild(generatorPiperPane.node);
  pageLifecycle.add(() => generatorPiperPane.destroy());

  initThemeToggle();
}

initPage();
