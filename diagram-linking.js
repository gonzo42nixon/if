(() => {
  'use strict';
  const viewers=new Set();let selected=null;
  function select(kind,id,origin='flow') {
    selected={kind,id};let count=0;
    document.querySelectorAll('#flow [data-link-id]').forEach(node=>{
      const active=node.dataset.linkKind===kind&&(Array.isArray(id)?id.includes(node.dataset.linkId):node.dataset.linkId===id);
      node.classList.toggle('if-linked-selection',active);node.setAttribute('aria-pressed',String(active));
    });
    for(const entry of viewers)count+=entry.paint(selected);
    document.querySelectorAll('.if-role-pill').forEach(pill=>pill.classList.toggle('if-system-selected',kind==='role'&&(Array.isArray(id)?id.includes(pill.dataset.roleId):id===pill.dataset.roleId)));
    document.querySelectorAll('.if-system-pill').forEach(pill=>pill.classList.toggle('if-system-selected',kind==='system'&&pill.dataset.systemId===id));
    // Hover must never scroll the page away from the pointer.
    const status=document.getElementById('linkStatus');
    if(status)status.textContent=id+': '+count+' zugeordnete BPMN-Elemente hervorgehoben.';
  }
  function clicks(single,double){
    let timer;return {click(event){if(event?.detail===0){single();return;}clearTimeout(timer);if(!event||event.detail<2)timer=setTimeout(single,500);},
      double(){clearTimeout(timer);double();},dispose(){clearTimeout(timer);}};
  }
  function bind(node,kind,id,details){
    node.dataset.linkKind=kind;node.dataset.linkId=id;node.setAttribute('aria-pressed','false');
    node.title='Einfachklick: Details · Mouse-over: im BPMN hervorheben';
    node.onclick=()=>details();node.onmouseenter=()=>select(kind,id);node.onfocus=()=>select(kind,id);
  }
  function attach(viewer,diagram){
    const registry=viewer.get('elementRegistry'),canvas=viewer.get('canvas'),bus=viewer.get('eventBus');
    const refs=new Map();
    for(const r of diagram.systemReferences||[]){const e=registry.get(r.id);if(e?.type==='bpmn:Lane')refs.set(r.id,{kind:'system',id:r.systemId});}
    for(const r of diagram.flowReferences||[]){if(r.connectionId&&['bpmn:MessageFlow','bpmn:SequenceFlow'].includes(registry.get(r.id)?.type))refs.set(r.id,{kind:'connection',id:r.connectionId});}
    let marked=[],timer;
    const entry={paint(value){marked.forEach(id=>canvas.removeMarker(id,'if-linked-selection'));marked=[];
      if(value.kind==='role'){
        const roles=new Set(Array.isArray(value.id)?value.id:[value.id]);
        for(const r of diagram.roleReferences||[])if(roles.has(r.roleId)&&registry.get(r.id)&&!marked.includes(r.id)){canvas.addMarker(r.id,'if-linked-selection');marked.push(r.id);}
        return marked.length;
      }
      for(const [id,ref] of refs)if(ref.kind===value.kind&&ref.id===value.id){canvas.addMarker(id,'if-linked-selection');marked.push(id);}return marked.length;}};
    viewers.add(entry);if(selected)entry.paint(selected);
    const refFor=e=>refs.get(e.element?.labelTarget?.id||e.element?.id);
    const click=e=>{const ref=refFor(e);if(ref)document.dispatchEvent(new CustomEvent('if-entity-details',{detail:ref}));};
    const hover=e=>{const ref=refFor(e);if(ref)select(ref.kind,ref.id,'bpmn');};
    bus.on('element.click',2000,click);bus.on('element.hover',2000,hover);
    for(const [id,ref] of refs){const gfx=registry.getGraphics(id);gfx.style.cursor='pointer';const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=ref.id+' · Einfachklick: Details · Mouse-over: Datenfluss hervorheben';gfx.prepend(title);}
    return ()=>{clearTimeout(timer);viewers.delete(entry);bus.off('element.click',click);bus.off('element.hover',hover);};
  }
  window.OrcaiIfLinking={bind,attach,select,clicks};
})();
