/* ORCAI application catalog: add future applications here. */
(() => {
  'use strict';
  const apps = [
    { name: 'ORCAI', description: 'Objekte und Sammlungen', href: '/', color: '#087dcc', image: '/favicon.png' },
    { name: 'EA', description: 'IT-Landschaften', href: '/ea/', color: '#087dcc', icon: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>' },
    { name: 'Markdown', description: 'Markdown Studio', href: '/markdown/', color: '#8250df', icon: '<path d="M3 17V7l5 6 5-6v10M19 7v10m-3-3 3 3 3-3"/>' },
    { name: 'IF', description: 'Integrations-Cockpit', href: '/if/', color: '#09836e', icon: '<rect x="2" y="7" width="6" height="10" rx="2"/><rect x="16" y="7" width="6" height="10" rx="2"/><path d="M8 12h8m-3-3 3 3-3 3"/>' }
  ];
  if (new URLSearchParams(location.search).get('embed') === 'if-agent') return;
  const info = document.querySelector('orcai-app-shell [data-action="info"], #btnAppInfo');
  if (!info || document.getElementById('orcaiAppsButton')) return;
  const button = document.createElement('button');
  button.id = 'orcaiAppsButton'; button.type = 'button'; button.className = info.id === 'btnAppInfo' ? 'header-action-btn' : 'orcai-icon-button';
  button.title = 'ORCAI Apps'; button.setAttribute('aria-label', 'ORCAI Apps');
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'orcaiAppsPanel');
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    [5, 12, 19].flatMap(y => [5, 12, 19].map(x => `<circle cx="${x}" cy="${y}" r="2"/>`)).join('') + '</svg>';
  const panel = document.createElement('section');
  panel.id = 'orcaiAppsPanel'; panel.className = 'orcai-apps-panel';
  panel.setAttribute('popover', 'auto'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'ORCAI Apps');
  const header = document.createElement('header');
  const title = document.createElement('strong'); title.textContent = 'ORCAI Apps'; header.append(title);
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '×';
  close.className = 'orcai-apps-close'; close.setAttribute('aria-label', 'Apps schließen'); header.append(close); panel.append(header);
  const nav = document.createElement('nav'); nav.className = 'orcai-apps-grid'; nav.setAttribute('aria-label', 'Anwendungen');
  for (const app of apps) {
    const link = document.createElement('a'); link.href = app.href; link.title = app.description;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', app.name + ' – in neuem Tab öffnen');
    const icon = document.createElement('span'); icon.className = 'orcai-app-icon'; icon.style.backgroundColor = app.color;
    if (app.image) { const image = document.createElement('img'); image.src = app.image; image.alt = ''; image.width = image.height = 40; icon.append(image); }
    else icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + app.icon + '</svg>';
    const name = document.createElement('span'); name.textContent = app.name;
    link.append(icon, name); nav.append(link);
  }
  panel.append(nav); document.body.append(panel);
  // EA: seventh action, immediately before the eighth action (account).
  const account = info.id === 'btnAppInfo' && document.getElementById('orcaiAccount');
  if (account && account.parentElement === info.parentElement) account.before(button);
  else info.after(button);
  const native = typeof panel.showPopover === 'function';
  if (!native) panel.hidden = true;
  const isOpen = () => native ? panel.matches(':popover-open') : !panel.hidden;
  function position() {
    if (!isOpen()) return;
    const rect = button.getBoundingClientRect(), width = panel.getBoundingClientRect().width;
    panel.style.left = Math.max(8, Math.min(rect.right - width, innerWidth - width - 8)) + 'px';
    panel.style.top = Math.max(8, Math.min(rect.bottom + 12, innerHeight - panel.offsetHeight - 8)) + 'px';
  }
  function hide(restoreFocus = false) {
    if (isOpen()) { if (native) panel.hidePopover(); else panel.hidden = true; }
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus();
  }
  button.addEventListener('click', () => {
    if (isOpen()) return hide();
    if (native) panel.showPopover(); else panel.hidden = false;
    button.setAttribute('aria-expanded', 'true'); position(); nav.querySelector('a').focus();
  });
  close.addEventListener('click', () => hide(true));
  panel.addEventListener('toggle', () => { button.setAttribute('aria-expanded', String(isOpen())); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && isOpen()) { event.preventDefault(); hide(true); } });
  document.addEventListener('click', event => { if (isOpen() && !panel.contains(event.target) && !button.contains(event.target)) hide(); });
  document.addEventListener('focusin', event => { if (isOpen() && !panel.contains(event.target) && !button.contains(event.target)) hide(); });
  nav.addEventListener('keydown', event => {
    const links = [...nav.querySelectorAll('a')], index = links.indexOf(document.activeElement);
    const steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };
    if (index >= 0 && event.key in steps) { event.preventDefault(); links[(index + steps[event.key] + links.length) % links.length].focus(); }
  });
  window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
  document.addEventListener('orcai:selection-change', () => hide());
})();
