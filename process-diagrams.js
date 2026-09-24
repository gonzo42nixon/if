(() => {
  'use strict';
  let dispose=()=>{},revision=0, exports=[], pending=Promise.resolve(), snapshots=[];
  const el=(tag,text,parent)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;parent?.append(n);return n;};
  async function mount(host,diagrams,integrationId,note='') {
    const run=++revision;dispose();host.replaceChildren();exports=[];snapshots=JSON.parse(JSON.stringify(diagrams));
    const cleanups=[];dispose=()=>cleanups.splice(0).forEach(fn=>fn());
    el('h2','BPMN-Prozesse · '+integrationId,host);
    if(note)el('p',note,host);
    if(!diagrams.length){el('p','Diesem Interface sind keine BPMN-Prozesse zugeordnet.',host);return;}
    const requested=new URLSearchParams(location.search).get('proc');
    const ordered=[...diagrams].sort((a,b)=>Number(b.id===requested)-Number(a.id===requested));
    if(requested&&!diagrams.some(d=>d.id===requested))el('p','Der angeforderte Prozess '+requested+' ist dieser Integration nicht zugeordnet.',host);
    let focusedCard;
    for(const diagram of ordered){
      if(run!==revision)return;
      const card=el('article',undefined,host);card.className='if-bpmn-card';
      card.dataset.processId=diagram.id;
      if(diagram.id===requested){card.classList.add('if-requested-process');card.tabIndex=-1;focusedCard=card;}
      const header=el('header',undefined,card);el('h3',diagram.id+' · '+diagram.name,header);
      const chip=el('span',integrationId,header);chip.className='if-bpmn-pill';
      const tools=el('div',undefined,header);tools.className='if-bpmn-tools';
      const status=el('p','Diagramm wird geladen …',card);status.setAttribute('role','status');
      if(diagram.error){status.textContent=diagram.error;exports.push({diagram,error:diagram.error});continue;}
      const viewport=el('div',undefined,card);viewport.className='if-bpmn-viewport';
      viewport.setAttribute('aria-label','BPMN '+diagram.id);viewport.setAttribute('tabindex','0');
      let viewer;
      try {
        if(typeof window.BpmnJS!=='function')throw new Error('BPMN-Viewer konnte nicht geladen werden. Bitte Seite neu laden.');
        viewer=new window.BpmnJS({container:viewport});cleanups.push(()=>viewer.destroy());
        const {warnings}=await viewer.importXML(diagram.xml);
        if(run!==revision)return;
        const canvas=viewer.get('canvas'),registry=viewer.get('elementRegistry'),overlays=viewer.get('overlays');
        const matches=(diagram.highlightIds||[]).map(id=>registry.get(id)).filter(Boolean);
        const roleAnchors=new Set();
        for(const ref of diagram.roleReferences||[]){
          const element=registry.get(ref.id);if(!element)continue;
          const lane=element.type==='bpmn:Lane'?element:(element.businessObject?.lanes||[]).map(l=>registry.get(l.id)).find(Boolean)||(diagram.roleReferences||[]).filter(r=>r.roleId===ref.roleId).map(r=>registry.get(r.id)).find(e=>e?.type==='bpmn:Lane');
          const anchor=lane||element,key=anchor.id+'|'+ref.roleId;if(roleAnchors.has(key))continue;roleAnchors.add(key);
          const pill=el('button','ROLE: '+ref.roleId);pill.type='button';pill.className='if-bpmn-pill if-role-pill';pill.dataset.roleId=ref.roleId;
          pill.title=ref.roleId+' · Mouse-over: Rolle hervorheben · Klick: Rollendetails';
          pill.onmouseenter=pill.onfocus=()=>window.OrcaiIfLinking.select('role',ref.roleId,'bpmn');
          pill.onclick=e=>{e.stopPropagation();document.dispatchEvent(new CustomEvent('if-entity-details',{detail:{kind:'role',id:ref.roleId}}));};
          const offset=[...roleAnchors].filter(k=>k.startsWith(anchor.id+'|')).length-1;
          overlays.add(anchor.id,{position:{top:lane?34+offset*27:-28-offset*27,left:36},html:pill});
        }
        for(const ref of diagram.systemReferences||[]){
          const lane=registry.get(ref.id);if(!ref.participating||lane?.type!=='bpmn:Lane')continue;
          const pill=el('span','SYS: '+ref.systemId);pill.className='if-bpmn-pill if-system-pill';pill.dataset.systemId=ref.systemId;
          pill.title=ref.name+' · Einfachklick: Details · Mouse-over: Datenfluss hervorheben';
          pill.tabIndex=0;pill.setAttribute('role','button');
          pill.onclick=e=>{e.stopPropagation();document.dispatchEvent(new CustomEvent('if-entity-details',{detail:{kind:'system',id:ref.systemId}}));};
          pill.onmouseenter=pill.onfocus=()=>window.OrcaiIfLinking.select('system',ref.systemId,'bpmn');
          pill.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pill.click();}};
          overlays.add(lane.id,{position:{top:6,left:36},html:pill});
        }
        for(const element of matches){
          canvas.addMarker(element.id,'if-current-integration');
          const badge=el('span');badge.className='if-bpmn-reference';
          const integrationLink=el('a',integrationId,badge),cockpitUrl=new URL(location.href);
          cockpitUrl.searchParams.set('int',integrationId);cockpitUrl.searchParams.set('proc',diagram.id);cockpitUrl.hash='';
          integrationLink.className='if-bpmn-pill if-integration-link';integrationLink.href=cockpitUrl.href;
          integrationLink.target='_blank';integrationLink.rel='noopener noreferrer';integrationLink.title='Integration und diesen Prozess in IF öffnen (neuer Tab)';
          for(const event of ['pointerdown','mousedown','click','dblclick'])integrationLink.addEventListener(event,e=>e.stopPropagation());
          const connection=diagram.flowReferences?.find(r=>r.id===element.id)?.connectionId;
          const connectionBadge=el('span',connection||'Connection: offen',badge);connectionBadge.className='if-bpmn-pill if-connection-pill';
          connectionBadge.title=connection?'Zugeordnete Connection':'Diagrammfluss ohne hinterlegte Connection-Zuordnung';
          const anchor=element.label||element;
          overlays.add(anchor.id,{position:{bottom:4,right:0},html:badge});
        }
        status.textContent=matches.length
          ? matches.length+' zugeordnete Flüsse/Aktivitäten hervorgehoben. Ziehen zum Verschieben.'
          : 'Prozess zugeordnet; keine eindeutige Zuordnung seiner Diagrammelemente zum Interface hinterlegt.';
        if(warnings?.length)status.textContent+=' Hinweis: '+warnings.length+' BPMN-Importwarnung(en).';
        const missing=matches.filter(e=>!diagram.flowReferences?.find(r=>r.id===e.id)?.connectionId).length;
        if(missing)status.textContent+=' '+missing+' davon ohne Connection-Zuordnung.';
        const button=(label,title,action)=>{const b=el('button',label,tools);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.onclick=action;return b;};
        let autoFit=true;
        const fit=()=>{canvas.resized();canvas.zoom('fit-viewport','auto');};
        button('−','Diagramm verkleinern',()=>{autoFit=false;canvas.zoom(Math.max(.1,canvas.zoom()/1.25));});
        button('+','Diagramm vergrößern',()=>{autoFit=false;canvas.zoom(Math.min(4,canvas.zoom()*1.25));});
        const fitBtn=button('','Fit to window',()=>{autoFit=true;fit();});
        fitBtn.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><line x1="12" y1="3" x2="12" y2="8.5"/><polyline points="9.5,6.5 12,9 14.5,6.5"/><line x1="12" y1="21" x2="12" y2="15.5"/><polyline points="9.5,17.5 12,15 14.5,17.5"/><line x1="3" y1="12" x2="8.5" y2="12"/><polyline points="6.5,9.5 9,12 6.5,14.5"/><line x1="21" y1="12" x2="15.5" y2="12"/><polyline points="17.5,9.5 15,12 17.5,14.5"/></svg>';
        const enterFsSvg='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9V5a2 2 0 0 1 2-2h4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M21 15v4a2 2 0 0 1-2 2h-4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/></svg>';
        const exitFsSvg='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3v4a2 2 0 0 1-2 2H3"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/><path d="M9 21v-4a2 2 0 0 0-2-2H3"/><path d="M15 21v-4a2 2 0 0 1 2-2h4"/></svg>';
        const fsBtn=button('','Fullscreen',async()=>{
          try{
            const isFs=(document.fullscreenElement||document.webkitFullscreenElement)===card;
            if(isFs){
              if(document.exitFullscreen)await document.exitFullscreen();
              else if(document.webkitExitFullscreen)await document.webkitExitFullscreen();
            }else{
              if(card.requestFullscreen)await card.requestFullscreen();
              else if(card.webkitRequestFullscreen)await card.webkitRequestFullscreen();
            }
          }catch(e){console.warn('[BPMN Fullscreen]',e);}
        });
        fsBtn.innerHTML=enterFsSvg;
        const onFsChange=()=>{
          const isFs=(document.fullscreenElement||document.webkitFullscreenElement)===card;
          fsBtn.innerHTML=isFs?exitFsSvg:enterFsSvg;
          fsBtn.title=isFs?'Fullscreen beenden':'Fullscreen';
          fsBtn.setAttribute('aria-label',fsBtn.title);
          card.classList.toggle('if-fullscreen-active',isFs);
          setTimeout(()=>{autoFit=true;fit();},80);
        };
        document.addEventListener('fullscreenchange',onFsChange);
        document.addEventListener('webkitfullscreenchange',onFsChange);
        cleanups.push(()=>{
          document.removeEventListener('fullscreenchange',onFsChange);
          document.removeEventListener('webkitfullscreenchange',onFsChange);
        });
        const ea=el('a','',tools),url=new URL('/ea/',location.origin);
        const icon=el('img',undefined,ea);icon.src='../ea/ea-icon.svg';icon.alt='EA';icon.width=30;icon.height=30;
        ea.title='Dieses BPMN-Prozessmodell in EA im Vollbild öffnen';ea.setAttribute('aria-label',ea.title);
        url.searchParams.set('diagram','bpmn');
        url.searchParams.set('model',new URLSearchParams(location.search).get('model')||'ORCAI-MODEL-JOHANNESSTIFT-DIAKONIE-EA');
        url.searchParams.set('proc',diagram.id);url.searchParams.set('int',integrationId);
        ea.href=url.href;ea.target='_blank';ea.rel='noopener noreferrer';
        const observer=new ResizeObserver(()=>{if(autoFit)fit();else canvas.resized();});observer.observe(viewport);cleanups.push(()=>observer.disconnect());
        fit();
        exports.push({diagram,viewer});
        cleanups.push(window.OrcaiIfLinking.attach(viewer,diagram));
      } catch(error){status.textContent='BPMN nicht darstellbar: '+error.message;viewport.hidden=true;exports.push({diagram,error:error.message});}
    }
    if(run===revision&&focusedCard){focusedCard.focus({preventScroll:true});focusedCard.scrollIntoView({block:'start'});}
  }
  async function images(){
    await pending;
    const result=[];
    for(const {diagram,viewer,error} of exports){
      if(error)throw new Error(diagram.id+': '+error);
      const {svg}=await viewer.saveSVG();
      const root=new DOMParser().parseFromString(svg,'image/svg+xml').documentElement;
      // saveSVG excludes HTML overlays; bake the integration highlight into the SVG itself.
      for(const id of diagram.highlightIds||[]){
        const group=Array.from(root.querySelectorAll('[data-element-id]')).find(n=>n.getAttribute('data-element-id')===id);
        group?.querySelectorAll('.djs-visual > path,.djs-visual > rect').forEach(n=>{n.style.stroke='#b87900';n.style.strokeWidth='3px';if(n.tagName==='rect')n.style.fill='#fff0a3';});
      }
      const width=parseFloat(root.getAttribute('width')),height=parseFloat(root.getAttribute('height'));
      if(!(width>0&&height>0))throw new Error('Ungültige Diagrammgröße: '+diagram.id);
      const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'}));
      try{
        const img=new Image();img.src=url;await img.decode();
        const canvas=document.createElement('canvas'),scale=Math.min(3,4096/width,4096/height);
        canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
        result.push({id:diagram.id,name:diagram.name,width,height,data:canvas.toDataURL('image/png')});
      }finally{URL.revokeObjectURL(url);}
    }
    return result;
  }
  window.OrcaiIfDiagrams={mount(...args){pending=mount(...args);return pending;},images,snapshot:()=>JSON.parse(JSON.stringify(snapshots))};
})();
