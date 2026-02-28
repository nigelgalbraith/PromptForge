const DEFAULT_TICKER_MESSAGES = [
  'Tip: Load a profile JSON to get started.',
  'You can always export your current setup.',
];

const TYPING_DELAY = 70;
const HOLD_DELAY = 4000;
const BETWEEN_DELAY = 800;
const INITIAL_DELAY = 600;
const TEMP_MESSAGE_MS = 5000;




function loadTickerMessages(url) {
  if (!url) return Promise.resolve(DEFAULT_TICKER_MESSAGES.slice());
  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.messages)) return data.messages;
      return DEFAULT_TICKER_MESSAGES.slice();
    })
    .catch(() => DEFAULT_TICKER_MESSAGES.slice());
}

class StatusTicker {
  constructor(el, messages, opts = {}) {
    this.el = el;
    this.messages = messages || [];
    this.opts = opts;
    this.opts.typingDelay = this.opts.typingDelay || TYPING_DELAY;
    this.opts.holdDelay = this.opts.holdDelay || HOLD_DELAY;
    this.opts.betweenDelay = this.opts.betweenDelay || BETWEEN_DELAY;
    this.opts.initialDelay = this.opts.initialDelay || INITIAL_DELAY;
    this._idx = 0;
    this._running = false;
    this._stop = false;
    this._interrupt = false;
    this._tempSeq = 0;
  }
  _sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  async _type(text) {
    this.el.textContent = '';
    for (let i = 0; i < text.length; i += 1) {
      if (this._interrupt || this._stop) return;
      this.el.textContent += text.charAt(i);
      // eslint-disable-next-line no-await-in-loop
      await this._sleep(this.opts.typingDelay);
    }
  }
  async _loop() {
    this._running = true;
    await this._sleep(this.opts.initialDelay);
    while (!this._stop) {
      if (!this.messages.length) {
        await this._sleep(1000);
        continue;
      }
      const text = this.messages[this._idx % this.messages.length];
      this._idx += 1;
      this._interrupt = false;
      await this._type(text);
      if (this._interrupt || this._stop) break;
      await this._sleep(this.opts.holdDelay);
      if (this._interrupt || this._stop) break;
      await this._sleep(this.opts.betweenDelay);
    }
    this._running = false;
  }
  start() {
    if (this._running) return;
    this._stop = false;
    this._interrupt = false;
    this._loop();
  }
  stop() {
    this._stop = true;
    this._interrupt = true;
  }
  setMessages(msgs) {
    this.messages = msgs || [];
    this._idx = 0;
  }
  showTemporary(text, ms) {
    const token = ++this._tempSeq;
    this.stop();
    this.el.textContent = text;
    this._sleep(ms || TEMP_MESSAGE_MS).then(() => {
      if (token !== this._tempSeq) return;
      if (this.messages && this.messages.length) {
        this._stop = false;
        this._interrupt = false;
        this.start();
      }
    });
  }
}





function wireTickerEvents({ events, tickerId, status, getTicker }) {
  if (!events || typeof events.on !== 'function') {
    return [];
  }
  const offTmp = events.on('ticker:temporary', (ev) => {
    const detail = ev && ev.detail ? ev.detail : {};
    if (detail.tickerId && detail.tickerId !== tickerId) return;
    const text = String(detail.text || '');
    const ms = detail.ms;
    const color = detail.color;
    if (!text) return;
    status.style.color = color || '';
    const ticker = getTicker();
    if (ticker) ticker.showTemporary(text, ms);
    else status.textContent = text;
  });
  const offSet = events.on('ticker:setMessages', (ev) => {
    const detail = ev && ev.detail ? ev.detail : {};
    if (detail.tickerId && detail.tickerId !== tickerId) return;
    const msgs = detail.messages;
    if (!Array.isArray(msgs)) return;
    const ticker = getTicker();
    if (ticker) ticker.setMessages(msgs);
  });
  return [offTmp, offSet].filter((off) => typeof off === 'function');
}





function destroyTicker(ticker, offFns) {
  try {
    if (ticker && typeof ticker.stop === 'function') {
      ticker.stop();
    }
  } catch {
  }
  offFns.forEach((off) => {
    try {
      off();
    } catch {
    }
  });
}





export function buildStatusTickerPane(options = {}) {
  const {
    messagesUrl = 'messages.json',
    tickerId = 'default',
    events = null,
    tickerOptions = {},
    onController,
  } = options;
  const node = document.createElement('div');
  node.className = 'pane-status-ticker';
  const status = document.createElement('div');
  status.className = 'status-text';
  node.appendChild(status);
  let ticker = null;
  const offFns = wireTickerEvents({
    events,
    tickerId,
    status,
    getTicker: () => ticker,
  });
  loadTickerMessages(messagesUrl).then((msgs) => {
    ticker = new StatusTicker(status, msgs, tickerOptions);
    const controller = {
      start: () => ticker && ticker.start(),
      stop: () => ticker && ticker.stop(),
      setMessages: (nextMsgs) => ticker && ticker.setMessages(nextMsgs),
      showTemporary: (text, ms) => ticker && ticker.showTemporary(text, ms),
    };
    if (typeof onController === 'function') {
      onController(controller);
    }
    status.classList.add('show');
    ticker.start();
  });
  return {
    node,
    destroy() {
      destroyTicker(ticker, offFns);
    },
  };
}
