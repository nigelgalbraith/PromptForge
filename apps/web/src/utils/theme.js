const THEME_KEY = 'theme';
const DEFAULT_THEME = 'dark';




function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}





function readSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return normalizeTheme(saved || DEFAULT_THEME);
  } catch {
    return DEFAULT_THEME;
  }
}





function writeSavedTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, normalizeTheme(theme));
  } catch {
  }
}





function setDocumentTheme(theme) {
  document.documentElement.dataset.theme = normalizeTheme(theme);
}





export function applySavedTheme() {
  setDocumentTheme(readSavedTheme());
}



/** Initializes init theme toggle. */


export function initThemeToggle() {
  const button = document.querySelector('button.theme-toggle');
  if (!button) return;
  if (button.dataset.themeInit === '1') return;
  button.dataset.themeInit = '1';
  applySavedTheme();
  const syncAriaPressed = () => {
    const isLight = document.documentElement.dataset.theme === 'light';
    button.setAttribute('aria-pressed', String(isLight));
  };
  syncAriaPressed();
  button.addEventListener('click', () => {
    const isLight = document.documentElement.dataset.theme === 'light';
    const nextTheme = isLight ? 'dark' : 'light';
    setDocumentTheme(nextTheme);
    writeSavedTheme(nextTheme);
    syncAriaPressed();
  });
}
