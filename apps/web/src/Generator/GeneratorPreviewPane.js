import { notifyTicker } from '../utils/ticker.js';
const GENERATE_DOT_INTERVAL = 350;
const FLASH_AUTOHIDE_MS = 1500;
const DEFAULT_API_URL = '/api/generate';
const MUSTACHE = /\{\{\s*(\w+)\s*\}\}/g;
const MAX_ERROR_TEXT_LEN = 320;
function trimErrorText(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (text.length <= MAX_ERROR_TEXT_LEN) return text;
  return `${text.slice(0, MAX_ERROR_TEXT_LEN)}...`;
}


function renderTemplate(str, ctx) {
  return String(str || '').replace(MUSTACHE, (_, k) => (k in ctx ? String(ctx[k]) : ''));
}


async function generateWithApi(params) {
  const provider = String(params.provider || '').toLowerCase();
  const model = params.model;
  const finalPrompt = String(params.prompt || '');
  const requestFormat = String(params.requestFormat || 'standard').toLowerCase();
  const providerOptions = params.providerOptions && typeof params.providerOptions === 'object' ? params.providerOptions : null;
  const apiUrl = params.apiUrl || DEFAULT_API_URL;
  if (!provider || !model || !finalPrompt) throw new Error('API: missing provider, model, or prompt');
  const body = requestFormat === 'ollama' ? { model, prompt: finalPrompt, stream: false } : { provider, model, prompt: finalPrompt };
  if (providerOptions && Object.keys(providerOptions).length) body.options = providerOptions;
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    let responseText = '';
    try {
      responseText = await resp.text();
    } catch {
      // ignore
    }
    const details = [`provider=${provider}`, `model=${String(model)}`];
    const httpParts = [`HTTP ${resp.status}`];
    if (resp.statusText) httpParts.push(resp.statusText);
    const body = trimErrorText(responseText);
    if (body) {
      throw new Error(`API request failed (${details.join(', ')}): ${httpParts.join(' ')} - ${body}`);
    }
    throw new Error(`API request failed (${details.join(', ')}): ${httpParts.join(' ')}`);
  }
  const data = await resp.json();
  const outputText =
    typeof data?.output === 'string'
      ? data.output
      : typeof data?.response === 'string'
        ? data.response
        : typeof data?.text === 'string'
          ? data.text
          : typeof data?.content === 'string'
            ? data.content
            : Array.isArray(data?.choices) && typeof data.choices[0]?.message?.content === 'string'
              ? data.choices[0].message.content
              : '';
  return String(outputText || '').trim();
}


/** Gets get error message. */
function getErrorMessage(error) {
  const msg = String(error && error.message ? error.message : error || '').trim();
  if (!msg) return 'Request failed';
  return trimErrorText(msg);
}


function buildPrintHTML(text) {
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  const body = esc(text).replace(/\r?\n/g, '<br>');
  return (
    '<!doctype html>' +
    '<html>' +
    '<head>' +
    '  <meta charset="utf-8">' +
    '  <title>Text – PDF Preview</title>' +
    '  <style>' +
    '    @page { margin: 20mm; }' +
    '    :root {' +
    '      --text: #111;' +
    '      --font: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif;' +
    '    }' +
    '    body {' +
    '      background: #fff;' +
    '      color: var(--text);' +
    '      font-family: var(--font);' +
    '      line-height: 1.5;' +
    '      font-size: 12pt;' +
    '      margin: 0;' +
    '      padding: 20mm;' +
    '    }' +
    '    .text {' +
    '      max-width: 800px;' +
    '      margin: 0 auto;' +
    '    }' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="text">' + body + '</div>' +
    '  <script>' +
    '    window.onload = function () {' +
    '      setTimeout(function () { window.print(); }, 250);' +
    '    };' +
    '  <\\/script>' +
    '</body>' +
    '</html>'
  );
}


function buildCtx(formRoot, checklistsRoot, snippetsRoot) {
  const ctx = {};
  if (formRoot) {
    const inputs = formRoot.querySelectorAll('input, textarea, select');
    Array.prototype.forEach.call(inputs, (inp) => {
      const key = inp.dataset.key;
      if (!key) return;
      ctx[key] = inp.value || '';
    });
  }
  const optionsMap = {};
  if (checklistsRoot) {
    const boxes = checklistsRoot.querySelectorAll('input[type="checkbox"][data-group][data-label]');
    const grouped = {};
    Array.prototype.forEach.call(boxes, (cb) => {
      const g = cb.dataset.group;
      const label = cb.dataset.label || '';
      if (!grouped[g]) grouped[g] = [];
      if (cb.checked) grouped[g].push(label);
    });
    Object.keys(grouped).forEach((slug) => {
      const joined = grouped[slug].join(', ');
      ctx[slug] = joined;
      optionsMap[slug] = joined;
    });
  }
  ctx.options_json = JSON.stringify(optionsMap);
  if (snippetsRoot) {
    const cards = snippetsRoot.querySelectorAll('.snippet-card');
    const chosen = [];
    Array.prototype.forEach.call(cards, (card) => {
      const cb = card.querySelector('input[type="checkbox"][data-role="snippet-selected"][data-subject]');
      if (!cb || !cb.checked) return;
      let subj = cb.dataset.subject || '';
      const ta = card.querySelector('textarea[data-role="snippet-text"][data-subject]');
      let text = ta ? ta.value || '' : '';
      subj = String(subj).trim();
      text = String(text).trim();
      if (!subj && !text) return;
      chosen.push({ subject: subj, text });
    });
    ctx.snippets = chosen
      .map((s) => {
        if (s.subject && s.text) return `${s.subject}: ${s.text}`;
        return s.subject || s.text;
      })
      .join('\n');
    ctx.snippets_json = JSON.stringify(chosen);
  }
  return ctx;
}


/**
 * buildCompiledPrompt.
 */
export function buildCompiledPrompt(params) {
  const {
    profile,
    formRoot,
    checklistsRoot,
    snippetsRoot,
  } = params || {};
  const ctx = buildCtx(formRoot, checklistsRoot, snippetsRoot);
  const mode = profile && profile.mode === 'llm' ? 'llm' : 'template';
  const prompt = profile && typeof profile.prompt === 'string' ? profile.prompt : '';
  const template = profile && typeof profile.template === 'string' ? profile.template : '';
  if (mode === 'llm' && prompt.trim()) return renderTemplate(prompt, ctx);
  if (template.trim()) return renderTemplate(template, ctx);
  return '';
}


async function generateText(params) {
  const {
    state,
    stateKey,
    formRoot,
    checklistsRoot,
    snippetsRoot,
  } = params;
  const profile = state && typeof state.get === 'function' ? state.get(stateKey) || {} : {};
  const compiledPrompt = buildCompiledPrompt({
    profile,
    formRoot,
    checklistsRoot,
    snippetsRoot,
  });
  const mode = profile.mode === 'llm' ? 'llm' : 'template';
  const defaults = profile && profile.defaults && typeof profile.defaults === 'object' ? profile.defaults : {};
  const provider = String(defaults.provider || '').toLowerCase();
  const model = String(defaults.model || '');
  if (mode === 'llm') {
    if (!String(compiledPrompt || '').trim()) throw new Error('Missing prompt');
    if (!provider) throw new Error('Missing provider');
    if (!model) throw new Error('Missing model');
  }
  const providers = profile && typeof profile.providers === 'object' ? profile.providers : {};
  const providerCfg = providers[provider];
  if (!providerCfg || typeof providerCfg !== 'object') throw new Error(`Provider not configured: ${provider}`);
  const endpoint = typeof providerCfg.endpoint === 'string' ? providerCfg.endpoint : '';
  const requestFormat = providerCfg.requestFormat || 'standard';
  const providerOptions = providerCfg.options && typeof providerCfg.options === 'object' ? providerCfg.options : null;
  if (!endpoint) throw new Error(`Missing endpoint for provider: ${provider}`);
  const targetApiUrl = endpoint;
  if (mode === 'llm' && compiledPrompt && model) {
    return generateWithApi({
      provider,
      model,
      prompt: compiledPrompt,
      requestFormat,
      providerOptions,
      apiUrl: targetApiUrl,
    });
  }
  if (compiledPrompt) return compiledPrompt;
  return '';
}


function hasProfile(state, stateKey) {
  if (!state) return false;
  if (typeof state.has === 'function') return !!state.has(stateKey);
  if (typeof state.get === 'function') return !!state.get(stateKey);
  return false;
}


/**
 * buildGeneratorPreviewPane.
 */
export function buildGeneratorPreviewPane(options = {}) {
  const {
    state = null,
    events = null,
    stateKey = 'TEXT_PROFILE',
    tickerController = null,
    tickerMsgGenerating = 'Generating text...',
    tickerMsgComplete = 'Text ready.',
    tickerMsgError = 'Generation failed.',
    tickerMsgBusy = 'Already generating…',
    apiUrl = DEFAULT_API_URL,
    formRoot = null,
    checklistsRoot = null,
    snippetsRoot = null,
    textId = 'generator-text',
    title = 'Preview',
    generateLabel = 'Generate',
    copyLabel = 'Copy',
    pdfLabel = 'Open PDF preview',
  } = options;
  const node = document.createElement('div');
  node.className = 'pane-generator-preview';
  const section = document.createElement('section');
  section.className = 'pane pane--generator-preview';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = title;
  const actions = document.createElement('div');
  actions.className = 'actions';
  const btnGen = document.createElement('button');
  btnGen.className = 'primary';
  btnGen.type = 'button';
  btnGen.textContent = generateLabel;
  const btnCopy = document.createElement('button');
  btnCopy.type = 'button';
  btnCopy.textContent = copyLabel;
  const btnPdf = document.createElement('button');
  btnPdf.type = 'button';
  btnPdf.textContent = pdfLabel;
  actions.appendChild(btnGen);
  actions.appendChild(btnCopy);
  actions.appendChild(btnPdf);
  const flashDiv = document.createElement('div');
  flashDiv.id = 'preview-flash';
  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = 'true';
  text.id = textId;
  section.appendChild(h2);
  section.appendChild(actions);
  section.appendChild(flashDiv);
  section.appendChild(text);
  node.appendChild(section);
  function setGenerateEnabled() {
    btnGen.disabled = !hasProfile(state, stateKey);
  }
  setGenerateEnabled();
  let isGenerating = false;
  let dotTimer = null;
  let hideTimer = null;
  function clearPreviewOnProfileChange() {
    if (isGenerating) return;
    text.textContent = '';
  }
  function flash(msg, autoHide) {
    flashDiv.textContent = msg || '';
    flashDiv.classList.add('show');
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (autoHide !== false) {
      hideTimer = setTimeout(() => {
        flashDiv.classList.remove('show');
        hideTimer = null;
      }, FLASH_AUTOHIDE_MS);
    }
  }
/** Starts start dots. */
  function startDots() {
    let dots = 0;
    flash('Generating', false);
    if (dotTimer) {
      clearInterval(dotTimer);
      dotTimer = null;
    }
    dotTimer = setInterval(() => {
      dots = (dots + 1) % 4;
      flash(`Generating${'.'.repeat(dots)}`, false);
    }, GENERATE_DOT_INTERVAL);
  }
/** Stops stop dots. */
  function stopDots(finalMsg) {
    if (dotTimer) {
      clearInterval(dotTimer);
      dotTimer = null;
    }
    flash(finalMsg || '', true);
  }
  function onGenerateClick() {
    if (!hasProfile(state, stateKey)) {
      flash('Load a profile first', true);
      notifyTicker(tickerController, 'Load a profile first', 2000);
      return;
    }
    if (isGenerating) {
      flash(tickerMsgBusy, true);
      notifyTicker(tickerController, tickerMsgBusy, 2000);
      return;
    }
    isGenerating = true;
    notifyTicker(tickerController, tickerMsgGenerating, 4000);
    startDots();
    generateText({
      state,
      stateKey,
      apiUrl,
      formRoot,
      checklistsRoot,
      snippetsRoot,
    })
      .then((txt) => {
        text.textContent = txt || '';
        stopDots('Generation complete');
        notifyTicker(tickerController, tickerMsgComplete, 3000);
        if (events && typeof events.emit === 'function') {
          events.emit('api:status', { connected: true, source: 'generate', lastError: '' });
        }
      })
      .catch((error) => {
        const errMsg = getErrorMessage(error);
        stopDots(`Generation error: ${errMsg}`);
        notifyTicker(tickerController, `${tickerMsgError} ${errMsg}`, 4000);
        if (events && typeof events.emit === 'function') {
          events.emit('api:status', {
            connected: false,
            source: 'generate',
            lastError: errMsg,
          });
        }
      })
      .finally(() => {
        isGenerating = false;
      });
  }
  function onCopyClick() {
    const txt = text.textContent || '';
    if (!txt) {
      flash('Nothing to copy', true);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(txt)
        .then(() => {
          flash('Copied', true);
        })
        .catch(() => {
          flash('Clipboard error', true);
        });
    } else {
      flash('Clipboard not available', true);
    }
  }
  function onPdfClick() {
    const txt = text.textContent || '';
    const html = buildPrintHTML(txt);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      flash('Popup blocked — allow popups', true);
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  }
  btnGen.addEventListener('click', onGenerateClick);
  btnCopy.addEventListener('click', onCopyClick);
  btnPdf.addEventListener('click', onPdfClick);
  let offEnable = null;
  let offState = null;
  if (events && typeof events.on === 'function') {
    offEnable = events.on(`state:changed:${stateKey}`, () => {
      setGenerateEnabled();
    });
    offState = events.on(`state:changed:${stateKey}`, () => {
      clearPreviewOnProfileChange();
    });
  }
  return {
    node,
    destroy() {
      try {
        if (dotTimer) clearInterval(dotTimer);
        if (hideTimer) clearTimeout(hideTimer);
      } catch {
        // ignore timer cleanup errors
      }
      if (typeof offState === 'function') offState();
      if (typeof offEnable === 'function') offEnable();
      btnGen.removeEventListener('click', onGenerateClick);
      btnCopy.removeEventListener('click', onCopyClick);
      btnPdf.removeEventListener('click', onPdfClick);
    },
  };
}

