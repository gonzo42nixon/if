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
  function showHistory(record,source){
    if(!record?.head?.ifDocument?.versions)return;
    const history=record.head.ifDocument.versions;
    const dialog=el('dialog',undefined,document.body);
    dialog.className='if-history-dialog';
    const header=el('header',undefined,dialog);
    const title=el('h2',`Änderungshistorie · ${source.integration.id}`,header);
    title.style.margin='0';
    const closeBtn=el('button','×',header);
    closeBtn.type='button';
    closeBtn.style.cssText='border:none;background:none;font-size:24px;cursor:pointer;line-height:1;padding:0 4px;color:inherit;';
    closeBtn.onclick=()=>dialog.close();

    const desc=el('p',`Gesamte Versionierung für dieses Interface-Dokument (${record.key}) im Mandanten "${record.client}".`,dialog);
    desc.style.cssText='font-size:12px;color:var(--muted,#64748b);margin:4px 0 12px;';

    const table=el('table',undefined,dialog);
    table.className='if-history-table';
    const thead=el('thead',undefined,table);
    const headRow=el('tr',undefined,thead);
    ['Version','Datum & Uhrzeit','Autor / ID','Änderungsgrund','Aktion'].forEach(h=>el('th',h,headRow));

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

      const tdAuthor=el('td',(v.author?String(v.author).slice(0,10)+'…':'–'),row);
      tdAuthor.style.fontFamily='monospace';
      tdAuthor.style.fontSize='11px';

      const tdReason=el('td',v.reason||'–',row);
      tdReason.style.maxWidth='320px';

      const tdAction=el('td',undefined,row);
      if(isCurrent){
        const span=el('span','(angezeigt)',tdAction);
        span.style.cssText='font-size:11px;color:var(--muted,#64748b);font-style:italic;';
      }else{
        const link=el('a','Öffnen ↗',tdAction);
        link.className='insp-action-btn';
        link.style.cssText='padding:3px 8px;font-size:11px;text-decoration:none;display:inline-block;';
        link.href=OrcaiIfVersions.url(source,record.client,record.key,isLatest?null:v.number);
      }
    });

    const footer=el('div',undefined,dialog);
    footer.style.cssText='margin-top:14px;display:flex;justify-content:flex-end;';
    const closeBottom=el('button','Schließen',footer);
    closeBottom.type='button';
    closeBottom.style.cssText='padding:6px 14px;border-radius:6px;cursor:pointer;';
    closeBottom.onclick=()=>dialog.close();

    dialog.addEventListener('close',()=>dialog.remove());
    dialog.showModal();
  }
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
  window.OrcaiIfDocumentEditor={mount,proposals,maturity,editField:key=>current&&edit(current,key),reference:()=>current?.record?{url:OrcaiIfVersions.url(current.source,current.record.client,current.record.key),version:current.record.entry.number,date:current.record.entry.date}:null};
  window.document?.addEventListener('orcai:share-request',event=>{
    const reference=window.OrcaiIfDocumentEditor.reference();if(!reference)return;event.preventDefault();
    const action=navigator.share?navigator.share({title:document.title,url:reference.url}):navigator.clipboard.writeText(reference.url);
    action.catch(error=>{if(error.name!=='AbortError')document.querySelector('#documentVersion [role=status]').textContent='Teilen nicht möglich. Bitte den Dokumentlink unten kopieren.';});
  });
})();
