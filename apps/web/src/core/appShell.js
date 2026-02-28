const NAV_ITEMS = [
  { key: 'generator', href: 'index.html', label: 'Generator', external: false },
  { key: 'profile', href: 'profile.html', label: 'Profile Builder', external: false },
  { key: 'localai', href: 'http://127.0.0.1:8080/', label: 'Local AI', external: true },
  { key: 'openwebui', href: 'http://127.0.0.1:3001/', label: 'Ollama UI', external: true }
];

// Build the shared app shell for generator/profile pages.


export function buildAppShell(config = {}) {
  const {
    appRoot,
    titleText,
    activeNavKey,
  } = config;
  if (!appRoot) {
    throw new Error('buildAppShell: missing appRoot');
  }
  const appNode = document.createElement('div');
  appNode.className = 'app';
  const header = document.createElement('header');
  header.className = 'header-centered';
  const title = document.createElement('h1');
  title.textContent = titleText || '';
  const themeToggleWrapper = document.createElement('div');
  themeToggleWrapper.className = 'theme-toggle-wrapper';
  const themeButton = document.createElement('button');
  themeButton.className = 'theme-toggle';
  themeButton.type = 'button';
  themeButton.setAttribute('aria-label', 'Toggle light/dark mode');
  themeButton.setAttribute('aria-pressed', 'false');
  themeButton.title = 'Toggle light/dark mode';
  const themeIcon = document.createElement('span');
  themeIcon.className = 'theme-toggle-icon';
  themeIcon.setAttribute('aria-hidden', 'true');
  themeIcon.textContent = '☾';
  const themeText = document.createElement('span');
  themeText.className = 'theme-toggle-text';
  themeText.textContent = 'Theme';
  themeButton.appendChild(themeIcon);
  themeButton.appendChild(themeText);
  themeToggleWrapper.appendChild(themeButton);
  const nav = document.createElement('nav');
  nav.className = 'nav';
  const navLinks = document.createElement('div');
  navLinks.className = 'nav-links';
  const navLinkNodes = {};
  NAV_ITEMS.forEach((item) => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;

    if (item.key === activeNavKey) {
      link.setAttribute('aria-current', 'page');
    }

    if (item.external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }

    navLinks.appendChild(link);
    navLinkNodes[item.key] = link;
  });
  nav.appendChild(navLinks);
  const main = document.createElement('main');
  main.className = 'split';
  main.id = 'root';
  header.appendChild(title);
  header.appendChild(themeToggleWrapper);
  header.appendChild(nav);
  appNode.appendChild(header);
  appNode.appendChild(main);
  appRoot.replaceChildren(appNode);
  return {
    appNode,
    header,
    main,
    navLinks: navLinkNodes,
    themeButton,
  };
}
