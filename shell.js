/* Reuse ORCAI authentication and toolbar; size the containing EA-agent drawer. */
(() => {
  const drawer = document.getElementById('agentDrawer');
  new ResizeObserver(()=>document.documentElement.style.setProperty('--if-drawer-actual',drawer.getBoundingClientRect().width+'px')).observe(drawer);
  const actions = document.querySelector('orcai-app-shell .orcai-actions');
  const agent = document.getElementById('agentToggle'), print = document.getElementById('print');
  agent.className = print.className = 'orcai-icon-button';
  agent.title = 'AI-Agent öffnen'; agent.setAttribute('aria-label', agent.title);
  agent.innerHTML = '<img src="/favicon.svg" width="25" height="25" alt="">';
  print.title = 'Drucken / PDF · eine DIN-A4-Seite'; print.setAttribute('aria-label', print.title);
  print.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9V3h12v6M6 17H3V9h18v8h-3"/><path d="M6 14h12v7H6z"/><circle cx="17" cy="11" r=".7"/></svg>';
  actions.prepend(agent, print);
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== document.getElementById('agentFrame').contentWindow) return;
    if (event.data?.type === 'orcai-if-agent-size' && [380,520,720,1200].includes(event.data.width)) drawer.style.setProperty('--if-agent-width', event.data.width + 'px');
    if (event.data?.type === 'orcai-if-agent-side') drawer.dataset.side = drawer.dataset.side === 'left' ? 'right' : 'left';
  });
})();
