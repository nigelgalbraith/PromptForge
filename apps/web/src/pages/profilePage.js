import { buildBuilderChecklistPane } from '../Builder/BuilderChecklistPane.js';
import { buildBuilderFormPane } from '../Builder/BuilderFormPane.js';
import { buildBuilderMetaPane } from '../Builder/BuilderMetaPane.js';
import { buildBuilderSnippetsPane } from '../Builder/BuilderSnippetsPane.js';
import { buildBuilderStylesPane } from '../Builder/BuilderStylesPane.js';
import { buildExportPane } from '../Common/ExportPane.js';
import { buildIntroPane } from '../Common/IntroPane.js';
import { buildProfileLoaderPane } from '../Common/ProfileLoaderPane.js';
import { buildStatusTickerPane } from '../Common/StatusTickerPane.js';
import { buildAppShell } from '../core/appShell.js';
import { createEventBus } from '../core/eventBus.js';
import { createPageLifecycle } from '../core/pageLifecycle.js';
import { applySavedTheme, initThemeToggle } from '../utils/theme.js';
import '../../snippets/intro.js';
const PROFILE_STATE_KEY = 'TEXT_PROFILE';
let pageLifecycle = null;
/**
 * destroyPage.
 */
export function destroyPage() {
  if (!pageLifecycle) return;
  pageLifecycle.destroy();
  pageLifecycle = null;
}


/** Initializes the profile page and mounts all panes. */
export function initPage() {
  destroyPage();
  pageLifecycle = createPageLifecycle();
  applySavedTheme();
  const app = document.getElementById('app');
  if (!app) throw new Error('profilePage: missing #app root element');
  const { main } = buildAppShell({
    appRoot: app,
    titleText: 'Profile Builder',
    activeNavKey: 'profile',
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
  const introPane = buildIntroPane({ introKey: 'profile' });
  introPane.node.classList.add('intro-text');
  main.appendChild(introPane.node);
  pageLifecycle.add(() => introPane.destroy());
  // ---- Profile Loader Pane ----
  const loaderPane = buildProfileLoaderPane({
    title: 'Profiles',
    state: sharedState,
    stateKey: PROFILE_STATE_KEY,
    tickerController: tickerControllerProxy,
  });
  main.appendChild(loaderPane.node);
  pageLifecycle.add(() => loaderPane.destroy());
  // ---- Builder Meta Pane ----
  const builderMetaPane = buildBuilderMetaPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Profile',
  });
  main.appendChild(builderMetaPane.node);
  pageLifecycle.add(() => builderMetaPane.destroy());
  // ---- Builder Form Pane ----
  const builderFormPane = buildBuilderFormPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Form Fields',
  });
  main.appendChild(builderFormPane.node);
  pageLifecycle.add(() => builderFormPane.destroy());
  // ---- Builder Checklist Pane ----
  const builderChecklistPane = buildBuilderChecklistPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Checklist Groups',
  });
  main.appendChild(builderChecklistPane.node);
  pageLifecycle.add(() => builderChecklistPane.destroy());
  // ---- Builder Snippets Pane ----
  const builderSnippetsPane = buildBuilderSnippetsPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Snippets',
  });
  main.appendChild(builderSnippetsPane.node);
  pageLifecycle.add(() => builderSnippetsPane.destroy());
  // ---- Builder Styles Pane ----
  const builderStylesPane = buildBuilderStylesPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Styles',
  });
  main.appendChild(builderStylesPane.node);
  pageLifecycle.add(() => builderStylesPane.destroy());
  // ---- Export Pane ----
  const exportPane = buildExportPane({
    title: 'Export Profile',
    filename: 'profile.json',
    buttonLabel: 'Save Profile',
    stateKey: PROFILE_STATE_KEY,
    getData: () => sharedState.get(PROFILE_STATE_KEY),
    getAi: () => {
      const profile = sharedState.get(PROFILE_STATE_KEY);
      return profile && profile.defaults ? profile.defaults.provider : '';
    },
    getModel: () => {
      const profile = sharedState.get(PROFILE_STATE_KEY);
      return profile && profile.defaults ? profile.defaults.model : '';
    },
    tickerController: tickerControllerProxy,
  });
  main.appendChild(exportPane.node);
  pageLifecycle.add(() => exportPane.destroy());
  initThemeToggle();
}
initPage();

