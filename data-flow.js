/* Shared screen/print scene; only explicit references determine messages and mappings. */
(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function chains(source){const result=[];for(const step of source.steps||[]){let row=result.at(-1);if(!row||row.at(-1).to!==step.from){row=[];result.push(row);}row.push(step);}return result;}
 function messageIds(step,source){const c=(source.connections||[]).find(c=>c.id===step.connectionId)||{};const ids=new Set([step.messageId,...(step.messageIds||[]),...(c.messageIds||[])]);
  for(const m of source.mappings||[]){if(m.outboundConnectionId===step.connectionId)ids.add(m.outboundMessageId||m.outputMessageId);if(m.inboundConnectionId===step.connectionId)ids.add(m.inboundMessageId||m.inputMessageId);}
  return [...ids].filter(Boolean);
 }
 function scene(source){const rows=chains(source),items=[],parts=[],colors=['#dceaff','#d5f3e9','#d8f2fc','#fff0bf','#eee0ff'];let total=0,width=920;
  const text=(value,x,y,max=25,size=13,bold=false)=>{const words=String(value??'').split(/\s+/),lines=[];let line='';for(let word of words){while(word.length>max){if(line){lines.push(line);line='';}lines.push(word.slice(0,max));word=word.slice(max);}if((line+' '+word).trim().length>max){lines.push(line);line='';}line=(line+' '+word).trim();}if(line)lines.push(line);return `<text x="${x}" y="${y}" text-anchor="middle" fill="#153246" font-family="Arial,sans-serif" font-size="${size}" font-weight="${bold?700:400}">${lines.map((s,i)=>`<tspan x="${x}" dy="${i?size+3:0}">${esc(s)}</tspan>`).join('')}</text>`;};
  function item(kind,data,body,title){const key=items.push({kind,data})-1;return `<g data-item="${key}" role="button" tabindex="0" aria-label="${esc(title)}" style="cursor:pointer"><title>${esc(title)}</title>${body}</g>`;}
  function documentIcon(x,y,label,kind,data,extra){return item(kind,data,`<path d="M${x-11} ${y}h15l8 8v18h-23z M${x+4} ${y}v8h8" fill="white" stroke="${kind==='mapping'?'#7350ac':'#14689a'}" stroke-width="1.5"/>${text(label,x,y+41,27,12,true)}${text(extra,x,y+56,29,11)}`,label+' · '+(data.name||'')+' · Details öffnen');}
  if(!rows.length)return {svg:'',width,height:0,items};
  rows.forEach((steps,rowIndex)=>{const systems=[steps[0].from,...steps.map(s=>s.to)],messages=steps.map(s=>messageIds(s,source));
   const maps=systems.map((sys,index)=>(source.mappings||[]).filter(m=>m.middlewareSystemId===sys&&(!m.outboundConnectionId||m.outboundConnectionId===steps[index]?.connectionId)));
   const rolesFor=id=>(source.roles||[]).filter(r=>(r.clients||[]).some(c=>c.targetSystemId===id));
   const top=12+Math.max(1,...messages.map(m=>m.length))*68,cy=top+60,mapTop=cy+96+Math.max(0,...systems.map(id=>rolesFor(id).length))*26;
   const endpointMaps=Math.max(maps[0].length,maps.at(-1).length),storeY=mapTop+(endpointMaps?endpointMaps*68:0)+8;
   const height=Math.max(storeY+64,mapTop+Math.max(1,...maps.map(m=>m.length))*68)+10;
   const rowWidth=Math.max(920,systems.length*280);width=Math.max(width,rowWidth);parts.push(`<g transform="translate(0 ${total})">`);
   if(rows.length>1)parts.push(text('Teilpfad '+(rowIndex+1)+' · keine Verbindung zum nächsten Teilpfad unterstellt',rowWidth/2,18,100,12));
   steps.forEach((step,index)=>{const x=140+index*280,mid=x+140,c=(source.connections||[]).find(c=>c.id===step.connectionId)||{id:step.connectionId};
    parts.push(item('connection',{...c,from:step.from,to:step.to},`<path d="M${x+76} ${cy-17}h105v-10l24 27-24 27v-10h-105z" fill="#788593" stroke="#fff" stroke-width="2"/>${text(step.connectionId,mid,cy-40,25,12,true)}${text(c.protocol||'Protokoll OFFEN',mid,cy+48,21,11)}`,step.connectionId+' · '+(c.protocol||'Protokoll OFFEN')));
    if(!messages[index].length)parts.push(text('Nachricht OFFEN',mid,top-45,24,12));
    messages[index].forEach((id,j)=>{const m=(source.messages||[]).find(m=>m.id===id)||{id,missing:true};parts.push(documentIcon(mid,12+j*68,id,'message',m,m.format||m.standard||'Format OFFEN'));});
   });
   systems.forEach((id,index)=>{const x=140+index*280,s=(source.systems||[]).find(s=>s.id===id)||{id,name:'Referenz nicht aufgelöst'};
    parts.push(item('system',s,`<circle cx="${x}" cy="${cy}" r="60" fill="${colors[index%colors.length]}" stroke="#40708a" stroke-width="2"/>${text(id,x,cy-28,23,14,true)}${text(s.name||s.title||'',x,cy-6,19,12)}`,id+' · '+(s.name||s.title||'')));
    const interactions=(source.roles||[]).flatMap(role=>(role.clients||[]).filter(c=>c.targetSystemId===id).map(ux=>({roleId:role.id,role:role.name||role.title,uxId:ux.id,ux:ux.name,mode:role.interactionMode||'unspecified'})));
    if(interactions.length){const exception=interactions.every(r=>r.mode==='exception'),label=(exception?'Ausnahme':'Mitwirkung')+' · '+interactions.length+' Rolle/UX';
     parts.push(item('interaction',{id:'Human Interaction · '+id,name:label,systemId:id,interactions,note:'Prozessbezogene Modellzuordnung. Keine Behauptung, dass jede Nachricht manuell bearbeitet wird. Detailablauf im BPMN.'},`<rect x="${x-100}" y="${cy+65}" width="200" height="23" rx="11" fill="${exception?'#fff1d5':'#e9e2ff'}" stroke="#7350ac"/><circle cx="${x-84}" cy="${cy+71}" r="3" fill="#604185"/><path d="M${x-90} ${cy+83}q6-15 12 0" fill="#604185"/>${text(label,x+5,cy+81,31,11,true)}`,label+' · '+interactions.map(r=>r.role+' / '+r.ux).join('; ')));}
    rolesFor(id).forEach((role,j)=>{const y=cy+92+j*26,label='ROLE: '+role.id;parts.push(item('role',role,`<rect x="${x-120}" y="${y}" width="240" height="23" rx="11" fill="#e9e2ff" stroke="#7350ac"/>${text(label.length>34?label.slice(0,31)+'…':label,x,y+16,40,11,true)}`,role.id+' · '+(role.name||role.title||'Rolle')+' · Mouse-over: BPMN · Klick: Details'));});
    if(!maps[index].length&&index!==0&&index!==systems.length-1)parts.push(text('Mapping nicht dokumentiert',x,mapTop+20,24,11));
    maps[index].forEach((m,j)=>parts.push(documentIcon(x,mapTop+j*68,m.id,'mapping',m,m.mappingType||'Mapping')));
    if(index===0||index===systems.length-1){const label=index===0?'Quell-Store':'Ziel-Store',data={id:label+' · '+id,systemId:id,name:'Logischer Store · Modellannahme',status:'Nicht als reale Datenbank / Queue belegt',description:'Darstellung des logischen Datenursprungs bzw. der Ablage. Persistenz, Produkt und tatsächliche Speicherung sind offen.'};
     parts.push(item('store',data,`<path d="M${x-23} ${storeY}v28c0 12 46 12 46 0v-28" fill="white" stroke="#526b7d" stroke-width="2"/><ellipse cx="${x}" cy="${storeY}" rx="23" ry="7" fill="white" stroke="#526b7d" stroke-width="2"/>${text(label+' · Annahme',x,storeY+56,28,11)}`,data.name+' · '+id));}
   });parts.push('</g>');total+=height;
  });
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${total}" width="${width}" height="${total}" role="group" aria-label="Datenfluss mit Systemen, Connections, Nachrichten, Mappings und logischen Stores"><rect width="100%" height="100%" fill="#f6f9fc"/>${parts.join('')}</svg>`,width,height:total,items};
 }
 function mount(container,source,open){const result=scene(source);container.replaceChildren();if(!result.svg){container.textContent='Keine Verbindungen hinterlegt.';return;}
  const scroll=document.createElement('div');scroll.className='if-flow-scroll';scroll.innerHTML=result.svg;container.append(scroll);
  for(const node of scroll.querySelectorAll('[data-item]')){const {kind,data}=result.items[+node.dataset.item];const action=()=>open(kind,data);
   if(kind==='system'||kind==='connection'||kind==='role')root.OrcaiIfLinking.bind(node,kind,data.id,action);else node.onclick=action;
   if(kind==='interaction'){node.onmouseenter=node.onfocus=()=>root.OrcaiIfLinking.select('role',data.interactions.map(r=>r.roleId),'flow');node.title='Mouse-over: mitwirkende Rollen im BPMN hervorheben · Klick: Details';}
   node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}};
  }
  const legend=document.createElement('p');legend.className='if-flow-legend';legend.textContent='Kreise: Systeme · Graue Pfeile: Connections · Oben: Nachrichten · Unten: Mappings am ausführenden System. Stores sind logische Modellannahmen, keine bestätigte Speicherung. EIP-inspirierte ORCAI-Sicht.';container.append(legend);
 }
 async function png(source){const result=scene(source);if(!result.svg)return null;const url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas'),factor=Math.min(2,8192/result.width,8192/result.height);canvas.width=result.width*factor;canvas.height=result.height*factor;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return {data:canvas.toDataURL('image/png'),width:result.width,height:result.height};}finally{URL.revokeObjectURL(url);}}
 root.OrcaiIfDataFlow={chains,messageIds,scene,mount,png};
})(typeof window==='undefined'?globalThis:window);
