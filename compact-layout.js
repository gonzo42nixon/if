/* Combine document identity and navigation without replacing existing handlers. */
(() => {
  const get=id=>document.getElementById(id),header=document.querySelector('.doc-head');
  const links=document.createElement('div');links.className='document-links';header.append(links);
  const qrLink=document.createElement('a');qrLink.id='qrLink';qrLink.setAttribute('aria-label','Dokument über QR-Link öffnen');qrLink.append(get('qr'));links.append(qrLink);
  const copy=get('copyLink');copy.textContent='';copy.title='Dokumentlink kopieren';copy.setAttribute('aria-label',copy.title);
  copy.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/></svg>';
  links.append(copy,get('copyStatus'));
  const details=document.createElement('details');details.className='document-metadata';
  const summary=document.createElement('summary');summary.textContent='Dokumentinfos';details.append(summary);
  for(const id of ['subtitle','identity','hash','permalink'])details.append(get(id));
  header.append(details);document.querySelector('.selfref')?.remove();
  function refresh(){const link=get('permalink');qrLink.href=link.href;qrLink.title=link.href;link.title=link.href;link.textContent='Dokument öffnen';copy.title='Dokumentlink kopieren: '+link.href;}
  window.OrcaiIfCompact={refresh};
})();
