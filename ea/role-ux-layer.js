/* Mirror only role-to-UX edges above Bay cards; retain original SVG interactions. */
(() => {
  'use strict';
  const ns='http://www.w3.org/2000/svg';let host,svg,defs;const copies=new Map();
  function frame(){
    const bay=document.getElementById('popoutsContainer');
    if(bay&&(bay!==host||!svg?.isConnected)){host=bay;svg=document.createElementNS(ns,'svg');svg.classList.add('role-ux-foreground');svg.setAttribute('aria-hidden','true');defs=document.createElementNS(ns,'defs');svg.append(defs);bay.append(svg);copies.clear();}
    if(svg?.isConnected){
      const paths=[...document.querySelectorAll('#gHitlOverlay .hitl-edge-human-client')];
      for(const [source,copy] of copies)if(!paths.includes(source)){copy.remove();copies.delete(source);}
      const inverse=svg.getScreenCTM()?.inverse();
      for(const source of paths){
        let copy=copies.get(source);if(!copy){copy=document.createElementNS(ns,'path');svg.append(copy);copies.set(source,copy);}
        const matrix=source.getScreenCTM(),style=getComputedStyle(source);
        copy.style.display=source.getClientRects().length&&style.visibility!=='hidden'&&inverse&&matrix?'':'none';
        if(!matrix||!inverse)continue;
        const m=inverse.multiply(matrix);copy.setAttribute('transform',`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);copy.setAttribute('d',source.getAttribute('d')||'');
        for(const property of ['fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','opacity'])copy.style.setProperty(property,style.getPropertyValue(property));
        for(const property of ['marker-start','marker-end']){
          const id=source.getAttribute(property)?.match(/#([^)]*)/)?.[1];if(!id)continue;
          const target='role-ux-front-'+id;
          if(!defs.querySelector('#'+CSS.escape(target))){const marker=document.getElementById(id)?.cloneNode(true);if(marker){marker.id=target;defs.append(marker);}}
          copy.setAttribute(property,'url(#'+target+')');
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
