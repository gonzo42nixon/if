(() => {
  'use strict';
  const $ = id => document.getElementById(id), frame = $('agentFrame'), model = window.OrcaiIfModel;
  const el = (tag, text, parent) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; parent?.append(n); return n; };
  const button = (text, parent, action) => { const n = el('button', text, parent); n.type = 'button'; n.onclick = action; return n; };
  const show = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  let selected, source, hash, chapter = 'Übersicht', ready = false, testResults = [];
  const requests = new Map();
  function download(name, value) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const a = el('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function send(type, values = {}) { frame.contentWindow.postMessage({ type, ...values }, location.origin); }
  function rpc(type, values) {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { requests.delete(requestId); reject(new Error('EA antwortet nicht. Bitte erneut laden.')); }, type==='orcai-if-proposals'?180000:30000);
      requests.set(requestId, { resolve, reject, timer }); send(type, { ...values, requestId });
    });
  }
  function context() {
    if (ready && source) send('orcai-if-context', { context: { app: 'IF', url: model.canonicalUrl(selected.model, selected.id, location.origin), chapter, sourceHash: hash, source, testResults,
      note: 'Sichtbare IF-Ansicht. Keine sichtbare EA-Landkarte. Teststatus nur aus testResults; keine automatische Freigabe.' } });
  }
  function setAgent(open) {
    $('agentDrawer').classList.toggle('open', open); document.body.classList.toggle('agent-open', open); $('agentToggle').setAttribute('aria-expanded', String(open)); context();
  }
  function detail(title, render) {
    chapter = title; $('detailTitle').textContent = title; $('detailContent').replaceChildren(); render($('detailContent'));
    if (!$('detail').open) $('detail').showModal(); context();
  }
  function table(parent, rows) { const t = el('table', undefined, parent); rows.forEach(([key, value]) => { const r = el('tr', undefined, t); el('th', key, r); el('td', value === undefined ? 'OFFEN' : show(value), r); }); }
  function entity(item) { detail(item.id + ' · ' + (item.name || item.title || ''), parent => table(parent, Object.entries(item))); }
  function artifacts(parent, group) {
    if (!source[group].length) el('p', 'Keine Einträge hinterlegt.', parent);
    source[group].forEach(item => {
      const d = el('details', undefined, parent); el('summary', item.id + ' · ' + (item.name || item.title || ''), d);
      el('pre', group === 'messages' ? window.OrcaiDocumentDetails.payload(item.samplePayload) : show(item), d);
    });
  }
  async function runTests(parent) {
    const status = el('p', 'Lokale synthetische Mapping-Tests laufen …', parent);
    try {
      const result = await rpc('orcai-if-test', { id: selected.id, model: selected.model });
      testResults = result.tests; status.textContent = 'Testlauf abgeschlossen. Keine Übertragung an Zielsysteme.';
      testResults.forEach(test => { el('h3', test.mappingId, parent); el('p', test.status + ': ' + test.reason, parent);
        if (test.result !== undefined) el('pre', window.OrcaiDocumentDetails.payload(test.result), parent); });
      button('Testprotokoll herunterladen', parent, () => download(selected.id + '-testprotokoll.json', { sourceHash: hash, tests: testResults })); context();
    } catch (error) { status.textContent = error.message; }
  }
  function openChapter(section) {
    detail(section.number + ' · ' + section.title, parent => {
      const index = section.number;
      if (index === 1) table(parent, [['Interface-ID', source.integration.id], ['Quellen-Hash', hash], ['Vorlage', source.templateVersion]]);
      if (index === 2) el('p', source.integration.description || source.integration.desc || 'Zweck: OFFEN', parent);
      if (index === 3) { artifacts(parent, 'processes'); artifacts(parent, 'roles'); }
      if (index === 4) { artifacts(parent, 'systems'); artifacts(parent, 'connections'); }
      if (index === 6) { artifacts(parent, 'messages'); artifacts(parent, 'mappings'); }
      if (index === 9) {
        const testSummary = el('p', testResults.length ? 'Testprotokoll dieser Sitzung vorhanden; keine Abnahme.' : 'In dieser Sitzung noch kein Test ausgeführt. Die Vorlage ist kein Testnachweis.', parent);
        if (source.mappings.length) {
          const run = button('Synthetische Mapping-Tests lokal ausführen', parent, async () => { run.disabled = true; await runTests(parent); if (testResults.length) testSummary.textContent = 'Testprotokoll dieser Sitzung vorhanden; keine Abnahme.'; run.disabled = false; });
        }
        if (testResults.length) el('pre', show(testResults), parent);
      }
      if (index === 10) button('Vollständige Quellen herunterladen', parent, () => download(selected.id + '-quellen.json', source));
      section.fields.forEach(f=>{
        el('h3',f.label,parent);
        const content=el('div',undefined,parent),text=f.entries.length?f.entries.map(e=>e.entity+': '+show(e.value)).join('\n\n'):'OFFEN';
        const renderer=frame.contentWindow?.OrcaiAgentReasoning?.renderMarkdown;
        if(renderer)content.innerHTML=renderer(text);else content.textContent=text;
        button('Edit · '+f.label,parent,()=>window.OrcaiIfDocumentEditor.editField(f.key));
      });
      el('p', 'OFFEN: Angabe, zuständige Rolle und Klärungstermin sind ohne gesonderten Eintrag nicht dokumentiert.', parent);
    });
  }
  async function render(value, origin) {
    source = model.validate(value, selected); hash = await window.OrcaiDocumentSources.hash(source); testResults = [];
    document.title = selected.id + ' · ORCAI Interface-Cockpit'; $('title').textContent = source.integration.id + ' · ' + (source.integration.name || source.integration.title || 'Integration');
    $('subtitle').textContent = source.model.name + ' · Vorlage ' + source.templateVersion + ' · Quellen-Hash ' + hash.slice(0, 12);
    $('loadStatus').textContent = origin + ' · Kein Produktivnachweis.';
    window.OrcaiIfDataFlow.mount($('flow'),source,(kind,item)=>{
      if(kind==='message')detail(item.id+' · '+(item.name||'Nachricht'),parent=>{
        el('p',item.description||'Beispielnachricht; kein Versandnachweis.',parent);
        el('pre',item.samplePayload===undefined?'Payload OFFEN':window.OrcaiDocumentDetails.payload(item.samplePayload),parent);
      });
      else entity(item);
    });
    const sections = window.OrcaiDocumentGuide.sections(source); $('chapters').replaceChildren(); $('gaps').replaceChildren();
    sections.forEach(section => {
      const n = button('', $('chapters'), () => openChapter(section)); n.className = 'card';
      const missing = section.fields.filter(f => !f.entries.length).length;
      n.dataset.status = missing === 0 ? 'green' : missing === section.fields.length ? 'red' : 'yellow';
      el('span', section.number, n).className = 'num'; el('h2', section.title, n); el('p', missing + ' von ' + section.fields.length + ' Angaben offen', n); el('span', '→ Details', n).className = 'more';
    });
    sections.flatMap(s => s.fields.filter(f => !f.entries.length).map(f => ({ s, f }))).slice(0, 5).forEach(({ s, f }) => button(f.label + ' · OFFEN', el('li', undefined, $('gaps')), () => openChapter(s)));
    $('quicklinks').replaceChildren(); button('quellen.json herunterladen', $('quicklinks'), () => download(selected.id + '-quellen.json', source));
    button('Nachrichten & Mapping', $('quicklinks'), () => openChapter(sections[5])); button('Tests & Abnahme', $('quicklinks'), () => openChapter(sections[8]));
    const permalink = model.canonicalUrl(selected.model, selected.id, location.origin);
    $('identity').textContent = 'Interface-ID: ' + selected.id + ' · Modell: ' + selected.model; $('permalink').href = permalink; $('permalink').textContent = permalink;
    $('hash').textContent = 'SHA-256: ' + hash; $('qr').replaceChildren();
    if (window.qrcode) { const qr = window.qrcode(0, 'M'); qr.addData(permalink); qr.make(); $('qr').innerHTML = qr.createSvgTag(3, 12); }
    $('cockpit').hidden = false; context();
    window.OrcaiIfCompact?.refresh();
  }
  async function loadSource() {
    try {
      const params=new URLSearchParams(location.search);
      if(!params.has('doc')&&params.get('source')!=='ea'){
        const client=params.get('client')||localStorage.getItem('orcai-active-client')||'ACME';
        $('loadStatus').textContent='Gespeicherte Dokumentationen werden gesucht …';
        const matches=await OrcaiIfVersions.find(client,selected.model,selected.id);
        if(matches.length){
          const latest=matches[0];params.set('doc',latest.key);params.set('client',client);params.delete('version');
          history.replaceState(null,'',location.pathname+'?'+params.toString());
          if(matches.length>1){
            document.getElementById('savedDocumentChoice')?.remove();
            const select=el('select');select.id='savedDocumentChoice';select.setAttribute('aria-label','Gespeicherte Dokumentreihe auswählen');
            matches.forEach(m=>{const option=el('option',m.key+' · V'+m.entry.number+' · '+new Date(m.entry.date).toLocaleString('de-DE'),select);option.value=m.key;});
            select.onchange=()=>{const target=new URL(location.href);target.searchParams.set('doc',select.value);target.searchParams.delete('version');location.assign(target.href);};
            $('loadStatus').after(select);
          }
        }else $('loadStatus').textContent='Keine zugängliche gespeicherte Dokumentation in '+client+' gefunden. EA-Ausgangsstand wird geladen.';
      }
      if(params.has('doc')){
        const record=await OrcaiIfVersions.read(params.get('client'),params.get('doc'),params.get('version'));
        await render(record.payload.source,'Gespeicherte Dokumentation · Version '+record.entry.number);
        // Older snapshots omitted role metadata. Enrich only when the entire XML
        // is unchanged; never substitute a current process for a historical one.
        if((record.payload.diagrams||[]).some(d=>!d.roleReferences)){
          try{const live=await rpc('orcai-if-source',{id:selected.id,model:selected.model});
            for(const diagram of record.payload.diagrams){const match=live.diagrams?.find(d=>d.id===diagram.id&&d.xml===diagram.xml);if(match&&!diagram.roleReferences)diagram.roleReferences=match.roleReferences;}
          }catch(error){console.warn('Rollenreferenzen konnten nicht ergänzt werden:',error.message);}
        }
        await OrcaiIfDiagrams.mount($('processDiagrams'),record.payload.diagrams||[],selected.id);
        OrcaiIfDocumentEditor.mount(source,record,{rpc,diagrams:()=>OrcaiIfDiagrams.snapshot()});
        return;
      }
      if (selected.handoff) {
        const raw = sessionStorage.getItem('orcai-if-handoff:' + selected.handoff);
        if (!raw) throw new Error('Lokale EA-Übergabe nicht verfügbar. Bitte aus EA erneut öffnen oder EA-Stand neu laden.');
        const handoff = JSON.parse(raw); await render(handoff.source, 'Übernommener EA-Sitzungsstand vom ' + new Date(handoff.createdAt).toLocaleString('de-DE'));
        if (Array.isArray(handoff.diagrams)) await window.OrcaiIfDiagrams.mount($('processDiagrams'), handoff.diagrams, selected.id);
        else {
          const result = await rpc('orcai-if-source', { id: selected.id, model: selected.model });
          await window.OrcaiIfDiagrams.mount($('processDiagrams'), result.diagrams || [], selected.id, 'Diagramme: aktueller EA-Modellstand; die ältere Übergabe enthielt noch keine Diagramme.');
        }
      } else {
        const result = await rpc('orcai-if-source', { id: selected.id, model: selected.model }); await render(result.source, 'Aktueller EA-Modellstand geladen');
        await window.OrcaiIfDiagrams.mount($('processDiagrams'), result.diagrams || [], selected.id);
      }
      OrcaiIfDocumentEditor.mount(source,null,{rpc,diagrams:()=>OrcaiIfDiagrams.snapshot()});
    } catch (error) { $('loadStatus').textContent = error.message; $('cockpit').hidden = true; }
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (data?.type === 'orcai-if-ready') { ready = true; if (selected.id) loadSource(); else $('loadStatus').textContent = 'Bitte eine Interface-ID eingeben, z. B. JSD-INT-03.'; }
    if (data?.type === 'orcai-if-close-agent') setAgent(false);
    if(data?.type==='orcai-if-improve-document'){
      setAgent(true);
      const question = frame?.contentWindow?.document?.getElementById('ifNextStepQuestion');
      if(question) question.click();
    }
    if (['orcai-if-source-result', 'orcai-if-test-result','orcai-if-proposals-result'].includes(data?.type)) {
      const pending = requests.get(data.requestId); if (!pending) return;
      clearTimeout(pending.timer); requests.delete(data.requestId); data.error ? pending.reject(new Error(data.error)) : pending.resolve(data);
    }
  });
  document.addEventListener('if-entity-details',event=>{
    const {kind,id}=event.detail||{},item=(kind==='role'?source?.roles:kind==='system'?source?.systems:source?.connections)?.find(x=>x.id===id);
    if(item)entity(item);
  });
  $('agentToggle').onclick = () => setAgent(!$('agentDrawer').classList.contains('open')); $('closeAgent').onclick = () => setAgent(false);
  $('closeDetail').onclick = () => $('detail').close(); $('detail').addEventListener('close', () => { chapter = 'Übersicht'; context(); });
  $('print').onclick = async () => {
    if (!source) { $('loadStatus').textContent = 'Bitte zuerst eine Integration laden.'; return; }
    $('print').disabled = true;
    try { await window.OrcaiIfPdf.download(source, hash); }
    catch (error) { $('loadStatus').textContent = 'PDF konnte nicht erzeugt werden: ' + error.message; }
  };
  const copyBtn = $('copyLink');
  if (copyBtn) copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText($('permalink').href); $('copyStatus').textContent = 'Cockpit-Link kopiert (lädt den Modellstand, nicht die lokale Übergabe).'; }
    catch (_) { $('copyStatus').textContent = 'Bitte den sichtbaren Link manuell kopieren.'; }
  };
  $('selection').onsubmit = event => { event.preventDefault(); const target=new URL(model.canonicalUrl($('model').value.trim(), $('interfaceId').value.trim(), location.origin));target.searchParams.set('client',new URLSearchParams(location.search).get('client')||localStorage.getItem('orcai-active-client')||'ACME');location.assign(target.href); };
  $('refresh').onclick = () => { if (selected?.id&&confirm('EA-Ausgangsstand anzeigen? Gespeicherte Dokumentfassungen bleiben unverändert.')){const target=new URL(model.canonicalUrl(selected.model,selected.id,location.origin));target.searchParams.set('source','ea');target.searchParams.set('client',new URLSearchParams(location.search).get('client')||localStorage.getItem('orcai-active-client')||'ACME');location.assign(target.href);} };
  try {
    selected = model.parameters(location.search); $('model').value = selected.model; $('interfaceId').value = selected.id;
    const ea = new URL('/ea/', location.origin); ea.searchParams.set('model', selected.model); if (selected.id) ea.searchParams.set('int', selected.id);
    ea.searchParams.set('embed', 'if-agent'); frame.src = ea.href;
    setTimeout(() => { if (!ready) $('loadStatus').textContent = 'EA-Agent lädt noch oder ist nicht erreichbar. Bitte Seite neu laden.'; }, 45000);
  } catch (error) { $('loadStatus').textContent = error.message; }
})();
