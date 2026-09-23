/* Same-origin IF adapter: reuses the actual EA agent, not a second chat client. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('embed') !== 'if-agent' || parent === window) return;
  window.OrcaiIfContext = { app: 'IF', source: null };
  function init() {
    const drawer = document.getElementById('sidebarAgent');
    if (!drawer) return;
    document.body.classList.add('if-agent-host'); document.body.append(drawer);
    drawer.classList.remove('collapsed');
    const style = document.createElement('style');
    style.textContent = `body.if-agent-host>:not(#sidebarAgent):not(#orcaiToolingStudioPopout):not(script):not(style){display:none!important}
      html body.if-agent-host{margin:0!important;padding:0!important;overflow:hidden!important}
      html body.if-agent-host #sidebarAgent{display:flex!important;position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;pointer-events:auto!important;transform:none!important;visibility:visible!important;opacity:1!important;border-radius:0!important;z-index:99999!important}
      body.if-agent-host .mobile-agent-navigation{display:none!important}
      body.if-agent-host .agent-size-group{display:flex!important}
      body.if-agent-host #btnAgentSideToggle,body.if-agent-host #btnAgentS,body.if-agent-host #btnAgentM,body.if-agent-host #btnAgentL,body.if-agent-host #btnAgentXL{display:inline-flex!important}
      body.if-agent-host #orcaiToolingStudioPopout{position:fixed!important;inset:6px!important;width:calc(100% - 12px)!important;height:calc(100% - 12px)!important;max-width:none!important;min-width:0!important;transform:none!important;z-index:100001!important}
      body.if-agent-host .agent-drawer-header{flex-wrap:wrap;height:auto!important;min-height:48px}
      body.if-agent-host .drawer-actions{flex-wrap:wrap}
      body.if-agent-host .agent-header-brand{min-width:0}`;
    document.head.append(style);
    const layout=document.createElement('link');layout.rel='stylesheet';layout.href='./if-agent-layout.css?v=20260923-01';document.head.append(layout);
    document.getElementById('agentSidebar')?.classList.add('is-iconified');
    document.getElementById('btnAgentCollapse').onclick = () => parent.postMessage({ type: 'orcai-if-close-agent' }, location.origin);
    document.getElementById('btnAgentSideToggle').onclick = () => parent.postMessage({type:'orcai-if-agent-side'}, location.origin);
    [['S',380],['M',520],['L',720],['XL',1200]].forEach(([size,width]) => {
      const button = document.getElementById('btnAgent'+size), original = button.onclick;
      button.onclick = event => { original?.call(button,event); parent.postMessage({type:'orcai-if-agent-size',width},location.origin); };
    });
    const story = document.getElementById('btnAgentStoryteller');
    const suggestions=document.getElementById('agentPromptSuggestions');
    suggestions?.querySelectorAll('.agent-prompt-chip').forEach(chip=>{chip.title=chip.getAttribute('onclick')?.match(/askOrcaiAgent\('([^']+)'/)?.[1]||chip.textContent;});
    if(story&&suggestions){suggestions.append(story);story.className='agent-prompt-chip';story.textContent='📖 Story-Teller';story.title='Erkläre die aktuelle Interface-Dokumentation, ihren Datenfluss und das ausgewählte Kapitel. Trenne Modellangaben, offene Punkte und Testnachweise.';}
    if (story) story.onclick = () => window.askOrcaiAgent?.('Erkläre das aktuell geöffnete Interface-Cockpit, seinen Datenfluss und das ausgewählte Kapitel. Trenne modellierte Angaben, offene Punkte und tatsächliche Testnachweise.', false);
    parent.postMessage({ type: 'orcai-if-ready' }, location.origin);
  }
  window.addEventListener('message', async event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    const data = event.data;
    if (data?.type === 'orcai-if-context') {
      if (data.context?.source?.integration?.id && data.context.source.model?.id)
        window.OrcaiIfContext = data.context;
      return;
    }
    if(data?.type==='orcai-if-proposals'){
      try{
        const source=window.OrcaiIfContext?.source;
        if(!source||source.integration.id!==data.source?.integration?.id||source.model.id!==data.source?.model?.id)throw new Error('Dokumentkontext hat sich geändert.');
        const fields=window.OrcaiDocumentGuide.sections(source).flatMap(s=>s.fields.map(f=>f.key)).filter(k=>!['approvalEvidence','approver','reviewers','version','authors'].includes(k));
        const result=await window.OrcaiAgentReasoning.ask('Erstelle prüfbare Dokumentationsvorschläge zum IF-Cockpit. Nutzerziel: '+String(data.goal).slice(0,2000)+'. Antworte ausschließlich als JSON {"proposals":[{"field":"purpose","value":"Entwurfstext","reason":"Begründung und benötigte Prüfung"}]}. Maximal 5 unterschiedliche Felder aus '+fields.join(', ')+'. Nur integration.documentation bearbeiten. Keine IDs, Diagramme, ausführbaren Skripte, Freigaben oder Quellen erfinden. Unbelegte Aussagen ausdrücklich als Annahme formulieren. Keine weiteren Angebote außerhalb des JSON.',{kind:'if-document-proposal'});
        parent.postMessage({type:'orcai-if-proposals-result',requestId:data.requestId,raw:result.raw},location.origin);
      }catch(error){parent.postMessage({type:'orcai-if-proposals-result',requestId:data.requestId,error:error.message},location.origin);}
      return;
    }
    if (data?.type === 'orcai-if-test') {
      try {
        const source = window.OrcaiIfContext?.source;
        if (!source || source.integration.id !== data.id || source.model.id !== data.model) throw new Error('Testkontext stimmt nicht mit der Auswahl überein.');
        const tests = [];
        for (const mapping of source.mappings) tests.push({ mappingId: mapping.id, checkedAt: new Date().toISOString(), ...await window.OrcaiDocumentDetails.validate(mapping, source) });
        parent.postMessage({ type: 'orcai-if-test-result', requestId: data.requestId, tests }, location.origin);
      } catch (error) { parent.postMessage({ type: 'orcai-if-test-result', requestId: data.requestId, error: error.message }, location.origin); }
      return;
    }
    if (data?.type !== 'orcai-if-source') return;
    try {
      if (data.model !== window.currentModelId) throw new Error('Das angeforderte Landschaftsmodell ist nicht geladen.');
      const integration = window.INTEGRATIONS_DATA?.find(i => i.id === data.id);
      if (!integration) throw new Error('Interface-ID in dieser Landschaft nicht gefunden: ' + data.id);
      const source = window.OrcaiDocumentSources.snapshot(integration);
      const diagrams = window.OrcaiIfProcessDiagrams.capture(integration);
      parent.postMessage({ type: 'orcai-if-source-result', requestId: data.requestId, source, diagrams }, location.origin);
    } catch (error) { parent.postMessage({ type: 'orcai-if-source-result', requestId: data.requestId, error: error.message }, location.origin); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
