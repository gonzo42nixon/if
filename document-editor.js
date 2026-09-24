(() => {
  'use strict';
  const el=(tag,text,parent)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;parent?.append(n);return n;};
  let current;
  function proposals(raw,source){
    const parsed=JSON.parse(String(raw).replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));
    const allowed=new Set(OrcaiDocumentGuide.sections(source).flatMap(s=>s.fields.map(f=>f.key)));
    const blocked=new Set(['approvalEvidence','approver','reviewers','version','authors']);
    if(!Array.isArray(parsed.proposals)||parsed.proposals.length>10)throw new Error('Agentenantwort enthält keine gültige Vorschlagsliste.');
    const seen=new Set();
    return parsed.proposals.map(p=>{
      if(!allowed.has(p.field)||blocked.has(p.field)||seen.has(p.field)||typeof p.value!=='string'||!p.value.trim()||p.value.length>10000||typeof p.reason!=='string')throw new Error('Nicht zulässiger oder doppelter Änderungsvorschlag.');
      if(p.nextSteps!==undefined&&(typeof p.nextSteps!=='string'||p.nextSteps.length>10000))throw new Error('Nächste Schritte müssen als separater Text vorliegen.');
      // Separate an explicit workflow-plan heading; do not strip planned tests
      // or other domain content merely because it mentions future activity.
      const marker=/(?:^|\n|\s)(?:#{1,4}\s*|\*\*)?(?:Geplante\s+)?[Nn]ächste\s+Schritte\s*:?\s*(?:\*\*)?/m.exec(p.value);
      let value=marker?p.value.slice(0,marker.index).trim():p.value;
      if(p.field==='relatedDocuments')for(const process of source.processes||[]){
        if(value.includes(process.id)&&!value.includes('proc='+encodeURIComponent(process.id))){
          const url=new URL('/ea/',location.origin);url.searchParams.set('model',source.model.id);url.searchParams.set('proc',process.id);url.searchParams.set('diagram','bpmn');
          value+='\n\n['+process.id+' · Prozessmodell]('+url.href+')';
        }
      }
      const nextSteps=[p.nextSteps,marker?p.value.slice(marker.index+marker[0].length).trim():''].filter(Boolean).join('\n\n');
      if(!value.trim())throw new Error('Der Vorschlag enthält nur nächste Schritte, keinen Dokumentationstext.');
      seen.add(p.field);return {field:p.field,value,reason:p.reason.slice(0,2000),nextSteps};
    });
  }
  function maturity(source){
    const fields=OrcaiDocumentGuide.sections(source).flatMap(s=>s.fields);
    const meaningful=v=>v!==null&&v!==undefined&&(Array.isArray(v)?v.some(meaningful):typeof v==='object'?Object.values(v).some(meaningful):Boolean(String(v).trim())&&!/^\s*(OFFEN|ENTWURF|VORSCHLAG)/i.test(String(v)));
    const complete=fields.filter(f=>f.entries.some(e=>meaningful(e.value))).length;
    const percent=Math.round(100*complete/fields.length);
    return {percent,label:percent===100?'Grün · vollständig dokumentiert':percent>=50?'Gelb · in Ausarbeitung':'Rot · Entwurf',color:percent===100?'#237443':percent>=50?'#916900':'#b42318'};
  }
  function mount(source,record,api){
    current={source,record,api};let host=document.getElementById('documentVersion');
    if(!host){host=el('aside',undefined,document.querySelector('.doc-head'));host.id='documentVersion';host.setAttribute('aria-label','Dokumentversion und Reifegrad');}
    host.replaceChildren();
    const status=el('p','',host);status.setAttribute('role','status');
    const run=fn=>async()=>{try{status.textContent='Bitte warten …';await fn();status.textContent='';}catch(e){status.textContent=e.message;}};
    const button=(label,fn)=>{const b=el('button',label,host);b.type='button';b.onclick=async()=>{b.disabled=true;try{await run(fn)();}finally{b.disabled=false;}};return b;};
    const m=maturity(source),badge=el('strong',m.label+' · '+m.percent+' %',host);badge.style.color=m.color;
    badge.title='Dokumentationsabdeckung, keine fachliche Freigabe. KI-Entwürfe zählen nicht als belegte Angaben.';
    if(record){
      const history=record.head.ifDocument.versions;
      const nav=el('nav',undefined,host);nav.setAttribute('aria-label','Versionsauswahl und Historie');
      const select=el('select',undefined,nav);select.className='if-version-select';select.setAttribute('aria-label','Dokumentversion auswählen');
      const pad=n=>String(n).padStart(2,'0');
      const formatOpt=v=>{
        const d=new Date(v.date);
        const dateStr=`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        const isLatest=v.number===history.length;
        return `V${v.number} · ${dateStr}${isLatest?' (aktuell)':''}`;
      };
      history.slice().reverse().forEach(v=>{
        const opt=el('option',formatOpt(v),select);
        opt.value=v.number;
        opt.selected=v.number===record.entry.number;
      });
      select.onchange=()=>{
        const targetVer=Number(select.value)===history.length?null:select.value;
        location.assign(OrcaiIfVersions.url(source,record.client,record.key,targetVer));
      };
      button('Änderungshistorie',()=>showHistory(record,source));
      const share=OrcaiIfVersions.url(source,record.client,record.key);
      document.getElementById('permalink').href=share;document.getElementById('permalink').textContent=share;
      document.getElementById('identity').textContent='Dokument '+record.key+' · Version '+record.entry.number+' · Share-Link zeigt immer die aktuelle Fassung';
      const q=document.getElementById('qr');if(window.qrcode){const qr=qrcode(0,'M');qr.addData(share);qr.make();q.innerHTML=qr.createSvgTag(3,12);}
      button('Share · aktuelle Fassung',async()=>{if(navigator.share)await navigator.share({title:source.integration.id+' · Dokumentation',url:share});else await navigator.clipboard.writeText(share);});
    }else el('span','Nicht gespeichert · EA-Quellstand',host);
    const latest=!record||record.entry.number===record.head.ifDocument.versions.length;
    if(latest){
      button(record?'Neue Version speichern':'Dokumentation speichern',async()=>{
        let client=record?.client||localStorage.getItem('orcai-active-client')||'';
        if(!record){client=prompt('In welchem ORCAI-Client speichern? Bestehende Zugriffsrechte gelten unverändert.',client);if(client===null)return;}
        const saved=await OrcaiIfVersions.save({source,diagrams:api.diagrams()},record,client,'Manuell gespeichert');
        location.assign(OrcaiIfVersions.url(source,saved.client,saved.key));
      });
      if(record)button('Angabe bearbeiten / prüfen',()=>edit(current));
    }
    const hint=el('small',m.percent<100?'Nächster Schritt: offene Angaben zu Zuständigkeit, Fehlerbehandlung und Tests konkretisieren.':'Nächster Schritt: Quellenstand und Nachweise fachlich prüfen lassen.',host);
    hint.title='Der Agent kann Entwürfe erstellen. Annahmen bleiben als ENTWURF markiert, bis sie fachlich bearbeitet werden.';
    window.OrcaiIfCompact?.refresh();
    window.OrcaiIfGuided?.mount(current);
  }

  let zIndex = 15000;
  function raise(node) {
    node.style.setProperty('z-index', String(++zIndex), 'important');
  }
  function clamp(node) {
    const r = node.getBoundingClientRect();
    node.style.left = Math.max(8, Math.min(r.left, window.innerWidth - Math.min(r.width, window.innerWidth - 16) - 8)) + 'px';
    node.style.top = Math.max(8, Math.min(r.top, window.innerHeight - 60)) + 'px';
  }
  function makeDraggable(node, handle) {
    if (node.dataset.floatBound) return;
    node.dataset.floatBound = 'true';
    handle.classList.add('workspace-handle');
    handle.addEventListener('mousedown', e => {
      if (!e.target.closest('button,a,input,select,textarea')) e.stopImmediatePropagation();
    }, true);
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button,a,input,select,textarea')) return;
      e.preventDefault(); e.stopPropagation();
      const r = node.getBoundingClientRect(), x = e.clientX, y = e.clientY;
      raise(node);
      handle.setPointerCapture(e.pointerId);
      const move = evt => {
        node.style.left = (r.left + evt.clientX - x) + 'px';
        node.style.top = (r.top + evt.clientY - y) + 'px';
        clamp(node);
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
    node.addEventListener('pointerdown', () => raise(node), true);
  }

  const KNOWN_AUTHORS = {
    'Ge6RiR1RWFbUyVT2sF6aEOGNLDC3': 'drueffler@gmail.com',
    'migration': 'Migration'
  };
  function formatAuthor(uid) {
    if (!uid) return '–';
    if (KNOWN_AUTHORS[uid]) return KNOWN_AUTHORS[uid];
    const cur = window.firebase?.auth?.().currentUser;
    if (cur && cur.uid === uid && cur.email) return cur.email;
    if (String(uid).includes('@')) return uid;
    return String(uid).length > 14 ? String(uid).slice(0, 10) + '…' : String(uid);
  }

  function escapeHtml(text) {
    return String(text || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }
  function renderMarkdown(text) {
    if (!text) return '';
    const frame = document.getElementById('agentFrame');
    const win = frame?.contentWindow;
    if (win?.OrcaiAgentReasoning?.renderMarkdown) {
      try { return win.OrcaiAgentReasoning.renderMarkdown(text); } catch (_) {}
    }
    const safe = escapeHtml(text).replace(/\r/g, '');
    const inline = value => value
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => inline(cell.trim()));
    const lines = safe.split('\n');
    let html = '', listOpen = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
        if (listOpen) { html += '</ul>'; listOpen = false; }
        html += '<div style="overflow-x:auto;margin:8px 0;"><table class="if-history-table"><thead><tr>' +
          cells(line).map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          html += '<tr>' + cells(lines[i]).map(c => '<td>' + c + '</td>').join('') + '</tr>';
          i++;
        }
        html += '</tbody></table></div>';
        i--;
        continue;
      }
      const heading = line.match(/^\s*(#{1,4})\s+(.+)/);
      const list = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)/);
      if (list) {
        if (!listOpen) { html += '<ul style="margin:6px 0;padding-left:20px;">'; listOpen = true; }
        html += '<li style="margin:3px 0;">' + inline(list[1]) + '</li>';
      } else {
        if (listOpen) { html += '</ul>'; listOpen = false; }
        if (heading) html += '<h' + heading[1].length + ' style="margin:12px 0 6px;font-size:' + (18 - heading[1].length * 2) + 'px;">' + inline(heading[2]) + '</h' + heading[1].length + '>';
        else if (line.trim()) html += '<p style="margin:6px 0;line-height:1.5;">' + inline(line.trim()) + '</p>';
      }
    }
    return html + (listOpen ? '</ul>' : '');
  }

  function showHistory(record,source){
    if(!record?.head?.ifDocument?.versions)return;
    const history=record.head.ifDocument.versions;
    const existing=document.getElementById('ifHistoryPopout');
    if(existing){
      raise(existing);
      return;
    }
    const popout=el('section',undefined,document.body);
    popout.id='ifHistoryPopout';
    popout.className='workspace-window workspace-floating if-history-popout';
    popout.setAttribute('role','region');
    popout.setAttribute('aria-label',`Änderungshistorie · ${source.integration.id}`);

    const width=Math.min(920,window.innerWidth-32);
    const left=Math.max(16,Math.round((window.innerWidth-width)/2));
    popout.style.cssText=`left:${left}px;top:90px;width:${width}px;height:520px;min-width:440px;min-height:280px;`;

    const bar=el('div',undefined,popout);
    bar.className='workspace-window-bar';
    const title=el('h2',`Änderungshistorie · ${source.integration.id}`,bar);
    title.style.margin='0';

    const closeBtn=el('button','×',bar);
    closeBtn.type='button';
    closeBtn.className='workspace-close-btn';
    closeBtn.title='Schließen';
    closeBtn.setAttribute('aria-label','Schließen');
    closeBtn.onclick=()=>popout.remove();

    const body=el('div',undefined,popout);
    body.className='workspace-window-content';

    makeDraggable(popout,bar);
    raise(popout);
    clamp(popout);

    const desc=el('p',`Gesamte Versionierung für dieses Interface-Dokument (${record.key}) im Mandanten "${record.client}".`,body);
    desc.style.cssText='font-size:12px;color:var(--muted,#64748b);margin:0 0 10px;';

    const tableWrap=el('div',undefined,body);
    tableWrap.style.cssText='overflow:auto;max-height:calc(100% - 32px);';
    const table=el('table',undefined,tableWrap);
    table.className='if-history-table';
    const thead=el('thead',undefined,table);
    const headRow=el('tr',undefined,thead);
    ['Version','Datum & Uhrzeit','Autor','Änderungsgrund','Aktionen'].forEach(h=>el('th',h,headRow));

    const tbody=el('tbody',undefined,table);
    const pad=n=>String(n).padStart(2,'0');
    history.slice().reverse().forEach(v=>{
      const row=el('tr',undefined,tbody);
      const isCurrent=v.number===record.entry.number;
      const isLatest=v.number===history.length;
      if(isCurrent)row.className='active-row';

      const tdVer=el('td',undefined,row);
      tdVer.innerHTML=`<strong>V${v.number}</strong>${isLatest?' <span style="font-size:10px;background:#22c55e22;color:#16a34a;padding:1px 4px;border-radius:3px;">aktuell</span>':''}${isCurrent?' <span style="font-size:10px;background:#0ea5e922;color:#0284c7;padding:1px 4px;border-radius:3px;">angezeigt</span>':''}`;

      const d=new Date(v.date);
      const tdDate=el('td',`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,row);
      tdDate.style.whiteSpace='nowrap';

      const authorText=formatAuthor(v.author);
      const tdAuthor=el('td',authorText,row);
      if(v.author)tdAuthor.title=`UID: ${v.author}`;
      tdAuthor.style.fontSize='11px';

      const tdReason=el('td',v.reason||'–',row);
      tdReason.style.maxWidth='280px';

      const tdAction=el('td',undefined,row);
      tdAction.style.whiteSpace='nowrap';
      tdAction.style.display='flex';
      tdAction.style.gap='6px';
      tdAction.style.alignItems='center';

      const detailBtn=el('button','Änderungsinfo ↗',tdAction);
      detailBtn.type='button';
      detailBtn.className='if-action-btn';
      detailBtn.title=`Änderungsinfo zu Version ${v.number} als Pop-Out öffnen`;
      detailBtn.onclick=()=>openChangeDetail(v,record,source);

      if(isCurrent){
        const span=el('span','(angezeigt)',tdAction);
        span.style.cssText='font-size:11px;color:var(--muted,#64748b);font-style:italic;';
      }else{
        const link=el('a','Öffnen ↗',tdAction);
        link.className='if-action-btn';
        link.href=OrcaiIfVersions.url(source,record.client,record.key,isLatest?null:v.number);
      }
    });
  }

  async function openChangeDetail(v,record,source){
    if(!v)return;
    const vNum=v.number;
    const existing=document.getElementById('ifChangeDetailPopout_'+vNum);
    if(existing){
      raise(existing);
      return;
    }
    const popout=el('section',undefined,document.body);
    popout.id='ifChangeDetailPopout_'+vNum;
    popout.className='workspace-window workspace-floating if-change-popout';
    popout.setAttribute('role','region');
    popout.setAttribute('aria-label',`Änderungsinfo Version ${vNum}`);

    const offset=((vNum*28)%140);
    const width=Math.min(720,window.innerWidth-32);
    const left=Math.max(16,Math.min(window.innerWidth-width-16,Math.round((window.innerWidth-width)/2+offset-40)));
    popout.style.cssText=`left:${left}px;top:${110+offset}px;width:${width}px;height:520px;min-width:380px;min-height:260px;`;

    const bar=el('div',undefined,popout);
    bar.className='workspace-window-bar';
    const titleWrap=el('div',undefined,bar);
    titleWrap.style.cssText='display:flex;align-items:center;gap:8px;overflow:hidden;';
    const title=el('h2',`Änderungsinfo · V${vNum}`,titleWrap);
    title.style.margin='0';

    const closeBtn=el('button','×',bar);
    closeBtn.type='button';
    closeBtn.className='workspace-close-btn';
    closeBtn.title='Schließen';
    closeBtn.setAttribute('aria-label','Schließen');
    closeBtn.onclick=()=>popout.remove();

    const body=el('div',undefined,popout);
    body.className='workspace-window-content';

    makeDraggable(popout,bar);
    raise(popout);
    clamp(popout);

    const meta=el('div',undefined,body);
    meta.className='if-change-meta';
    const isCurrent=vNum===record?.entry?.number;
    const isLatest=vNum===record?.head?.ifDocument?.versions?.length;
    const badge=el('span',`V${vNum}${isLatest?' (aktuell)':''}${isCurrent?' (angezeigt)':''}`,meta);
    badge.className=`if-change-badge ${isCurrent?'current':isLatest?'latest':''}`;

    const pad=n=>String(n).padStart(2,'0');
    if(v.date){
      const d=new Date(v.date);
      el('span',`📅 ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,meta);
    }
    const authorText=formatAuthor(v.author);
    const authorEl=el('span',`👤 ${authorText}`,meta);
    if(v.author)authorEl.title=`UID: ${v.author}`;

    if(v.reason){
      const reasonEl=el('div',undefined,meta);
      reasonEl.style.cssText='width:100%;margin-top:2px;font-style:italic;';
      reasonEl.textContent=`Grund: ${v.reason}`;
    }

    const contentArea=el('div',undefined,body);

    function renderFieldBlock(fLabel,textVal){
      const block=el('div',undefined,contentArea);
      block.className='if-change-block';
      block.style.marginBottom='16px';

      const hRow=el('div',undefined,block);
      hRow.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;';
      const h3=el('h3',fLabel,hRow);
      h3.style.cssText='margin:0;font-size:14px;color:var(--blue,#0284c7);';

      const copyBtn=el('button','Kopieren',hRow);
      copyBtn.type='button';
      copyBtn.className='if-action-btn';
      copyBtn.onclick=async()=>{
        try{
          await navigator.clipboard.writeText(textVal||'');
          copyBtn.textContent='Kopiert!';
          setTimeout(()=>{copyBtn.textContent='Kopieren';},2000);
        }catch(_){}
      };

      const bodyDiv=el('div',undefined,block);
      bodyDiv.className='if-change-body';
      bodyDiv.innerHTML=renderMarkdown(textVal||'–');
    }

    if(v.text&&v.field){
      title.textContent=`Änderungsinfo · V${vNum} · ${v.label||v.field}`;
      renderFieldBlock(v.label||v.field,v.text);
      return;
    }

    contentArea.textContent='Lade Daten für Version '+vNum+' …';

    try{
      let targetSource=source;
      let prevSource=null;

      if(vNum===record?.entry?.number){
        targetSource=source;
      }else{
        const res=await OrcaiIfVersions.read(record.client,record.key,vNum);
        targetSource=res.payload.source;
      }

      const sections=OrcaiDocumentGuide.sections(targetSource);
      const allFields=sections.flatMap(s=>s.fields);
      const reason=v.reason||'';

      let matchedField=allFields.find(f=>new RegExp(`(?:^|[\\s:·,])${f.key}(?:[\\s:·,]|$)`,'i').test(reason));
      if(!matchedField){
        matchedField=allFields.find(f=>reason.toLowerCase().includes(f.label.toLowerCase()));
      }

      contentArea.replaceChildren();

      if(matchedField){
        title.textContent=`Änderungsinfo · V${vNum} · ${matchedField.label}`;
        const val=targetSource.integration.documentation?.[matchedField.key]??targetSource.integration[matchedField.key];
        renderFieldBlock(matchedField.label,typeof val==='string'?val:JSON.stringify(val,null,2));
      }else{
        if(vNum>1){
          try{
            const prevRes=await OrcaiIfVersions.read(record.client,record.key,vNum-1);
            prevSource=prevRes.payload.source;
          }catch(_){}
        }

        const currDoc=targetSource.integration.documentation||{};
        const prevDoc=prevSource?.integration?.documentation||{};
        const changedKeys=Object.keys(currDoc).filter(k=>JSON.stringify(currDoc[k])!==JSON.stringify(prevDoc[k]));

        if(changedKeys.length){
          title.textContent=`Änderungsinfo · V${vNum} · ${changedKeys.length} Feld(er) geändert`;
          changedKeys.forEach(k=>{
            const f=allFields.find(field=>field.key===k);
            const val=currDoc[k];
            renderFieldBlock(f?.label||k,typeof val==='string'?val:JSON.stringify(val,null,2));
          });
        }else{
          title.textContent=`Änderungsinfo · V${vNum}`;
          const note=el('p','Keine isolierten Textänderungen gegenüber Vorversion erkannt. Dokumentstand dieser Version:',contentArea);
          note.style.cssText='font-size:12px;color:var(--muted);';
          const pre=el('pre',JSON.stringify(currDoc,null,2),contentArea);
          pre.style.cssText='background:var(--surface-hover,rgba(0,0,0,0.04));padding:10px;border-radius:6px;overflow:auto;max-height:300px;font-size:11px;';
        }
      }

      if(!isCurrent){
        const switchWrap=el('div',undefined,contentArea);
        switchWrap.style.cssText='margin-top:16px;padding-top:12px;border-top:1px solid var(--border,#cbd5e1);display:flex;justify-content:flex-end;';
        const switchLink=el('a',`Version V${vNum} im Cockpit anzeigen ↗`,switchWrap);
        switchLink.className='if-action-btn if-action-btn-primary';
        switchLink.href=OrcaiIfVersions.url(source,record.client,record.key,isLatest?null:vNum);
      }
    }catch(err){
      contentArea.replaceChildren();
      const errBox=el('p',`Fehler beim Laden von Version ${vNum}: ${err.message}`,contentArea);
      errBox.style.color='var(--red,#b42318)';
    }
  }

  window.addEventListener('resize',()=>document.querySelectorAll('.workspace-floating').forEach(clamp));

  function edit({source,record,api},fieldKey){
    if(!record){alert('Bitte die Dokumentation zuerst speichern, bevor Angaben versioniert bearbeitet werden.');return;}
    if(record.entry.number!==record.head.ifDocument.versions.length){alert('Bitte die aktuelle Version zum Bearbeiten öffnen.');return;}
    const dialog=el('dialog',undefined,document.body);el('h2','Dokumentationsangabe bearbeiten',dialog);
    el('p','Nur selbst geprüfte Angaben als Tatsachen formulieren. Diese Bearbeitung ist keine technische oder fachliche Gesamtfreigabe.',dialog);
    const fields=OrcaiDocumentGuide.sections(source).flatMap(s=>s.fields);
    const select=el('select',undefined,dialog);select.setAttribute('aria-label','Dokumentationsfeld');
    fields.forEach(f=>{const option=el('option',f.label,select);option.value=f.key;});
    const value=el('textarea',undefined,dialog);value.rows=8;value.style.width='100%';value.setAttribute('aria-label','Dokumentationsangabe');
    if(fieldKey)select.value=fieldKey;
    const load=()=>{const v=source.integration.documentation?.[select.value]??source.integration[select.value];value.value=v===undefined?'':typeof v==='string'?v:JSON.stringify(v,null,2);};select.onchange=load;load();
    const reason=el('input',undefined,dialog);reason.placeholder='Änderungsgrund / Quelle';reason.setAttribute('aria-label','Änderungsgrund / Quelle');
    const status=el('p','',dialog),save=el('button','Save · neue Version speichern',dialog);
    save.onclick=async()=>{save.disabled=true;try{
      if(!value.value.trim()||!reason.value.trim())throw new Error('Angabe und Änderungsgrund/Quelle sind erforderlich.');
      const next=JSON.parse(JSON.stringify(source));next.integration.documentation={...next.integration.documentation,[select.value]:value.value.trim()};
      const saved=await OrcaiIfVersions.save({source:next,diagrams:api.diagrams()},record,record.client,'Manuell geprüft/bearbeitet: '+select.value+' · '+reason.value);
      location.assign(OrcaiIfVersions.url(next,saved.client,saved.key));
    }catch(e){status.textContent=e.message;}finally{save.disabled=false;}};
    const cancel=el('button','Abbrechen',dialog);cancel.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
  }
  window.OrcaiIfDocumentEditor={
    mount,
    proposals,
    maturity,
    showHistory:(rec,src)=>showHistory(rec||current?.record,src||current?.source),
    openChangeDetail:(v,rec,src)=>openChangeDetail(v,rec||current?.record,src||current?.source),
    editField:key=>current&&edit(current,key),
    reference:()=>current?.record?{url:OrcaiIfVersions.url(current.source,current.record.client,current.record.key),version:current.record.entry.number,date:current.record.entry.date}:null
  };
  window.document?.addEventListener('orcai:share-request',event=>{
    const reference=window.OrcaiIfDocumentEditor.reference();if(!reference)return;event.preventDefault();
    const action=navigator.share?navigator.share({title:document.title,url:reference.url}):navigator.clipboard.writeText(reference.url);
    action.catch(error=>{if(error.name!=='AbortError')document.querySelector('#documentVersion [role=status]').textContent='Teilen nicht möglich. Bitte den Dokumentlink unten kopieren.';});
  });
})();
