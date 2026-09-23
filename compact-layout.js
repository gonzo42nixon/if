/* Combine document identity and navigation without replacing existing handlers. */
(() => {
  const get=id=>document.getElementById(id),header=document.querySelector('.doc-head');
  const links=document.createElement('div');links.className='document-links';header.append(links);
  const qrLink=document.createElement('a');qrLink.id='qrLink';qrLink.setAttribute('aria-label','Dokument über QR-Link öffnen');qrLink.append(get('qr'));links.append(qrLink);
  const copy=get('copyLink');
  const details=document.createElement('details');details.className='document-metadata';
  const summary=document.createElement('summary');summary.textContent='Dokumentinfos';details.append(summary);
  for(const id of ['subtitle','identity','hash','permalink'])details.append(get(id));
  if(copy){copy.style.display='none';details.append(copy);}
  header.append(details);document.querySelector('.selfref')?.remove();
  function refresh(){const link=get('permalink');qrLink.href=link.href;qrLink.title=link.href;link.title=link.href;link.textContent='Dokument öffnen';}
  window.OrcaiIfCompact={refresh};
})();
