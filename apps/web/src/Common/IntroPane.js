const DEFAULT_INTRO_KEY = 'main';




function resolveIntroHtml(introKey) {
  const key = introKey || DEFAULT_INTRO_KEY;
  if (!window.INTRO_TEXT || !window.INTRO_TEXT[key]) {
    return '';
  }
  return window.INTRO_TEXT[key];
}





function noop() {}



export function buildIntroPane(options = {}) {
  const { introKey = DEFAULT_INTRO_KEY } = options;
  const node = document.createElement('div');
  node.className = 'pane-intro-text';
  node.innerHTML = resolveIntroHtml(introKey);
  return {
    node,
    destroy: noop,
  };
}
