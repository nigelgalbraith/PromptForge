function isApiHealthy(payload) {
  return Boolean(payload && payload.status === 'ok');
}


function buildStatusMessage(ok, details) {
  if (ok) return 'API status: Connected';
  if (details) return `API status: Disconnected (${details})`;
  return 'API status: Disconnected';
}


function setHealthState(statusEl, ok, details) {
  statusEl.classList.remove('api-health--checking', 'api-health--connected', 'api-health--disconnected');
  if (ok) {
    statusEl.classList.add('api-health--connected');
    statusEl.textContent = buildStatusMessage(true);
    return;
  }
  statusEl.classList.add('api-health--disconnected');
  statusEl.textContent = buildStatusMessage(false, details);
}


function formatHttpFailure(res) {
  const status = Number(res && res.status ? res.status : 0);
  const text = String(res && res.statusText ? res.statusText : '').trim();
  if (status && text) return `HTTP ${status} ${text}`;
  if (status) return `HTTP ${status}`;
  return 'HTTP request failed';
}


function formatErrorMessage(error) {
  if (!error) return 'Request failed';
  const msg = String(error && error.message ? error.message : error).trim();
  return msg || 'Request failed';
}


/**
 * buildApiHealthPane.
 */
export function buildApiHealthPane(options = {}) {
  const { healthUrl = '/api/', events = null } = options;
  const node = document.createElement('div');
  node.className = 'api-health-pane';
  const status = document.createElement('div');
  status.className = 'api-health-status api-health--checking';
  status.textContent = 'API status: Checking...';
  node.appendChild(status);
  let aborted = false;
  const abortController = new AbortController();
  fetch(healthUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: abortController.signal,
  })
    .then((res) => {
      if (!res.ok) {
        setHealthState(status, false, formatHttpFailure(res));
        return null;
      }
      return res.json();
    })
    .then((payload) => {
      if (aborted) return;
      if (!payload) return;
      if (isApiHealthy(payload)) {
        setHealthState(status, true);
        return;
      }
      setHealthState(status, false, 'Unexpected health payload');
    })
    .catch((error) => {
      if (aborted) return;
      setHealthState(status, false, formatErrorMessage(error));
    });
  let offApiStatus = null;
  if (events && typeof events.on === 'function') {
    offApiStatus = events.on('api:status', (ev) => {
      const detail = ev && ev.detail ? ev.detail : {};
      const connected = Boolean(detail.connected);
      const lastError = detail.lastError ? String(detail.lastError) : '';
      setHealthState(status, connected, lastError);
    });
  }
  return {
    node,
    destroy() {
      aborted = true;
      abortController.abort();
      if (typeof offApiStatus === 'function') offApiStatus();
    },
  };
}

