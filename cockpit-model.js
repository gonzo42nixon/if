(function (root) {
  'use strict';
  function parameters(search) {
    const params = new URLSearchParams(search), id = params.get('int') || params.get('interfaceId') || params.get('id') || '';
    const model = params.get('model') || 'ORCAI-MODEL-JOHANNESSTIFT-DIAKONIE-EA';
    if ((id && !/^[A-Za-z0-9_-]{1,160}$/.test(id)) || !/^[A-Za-z0-9_-]{1,160}$/.test(model)) throw new Error('Ungültige Modell- oder Interface-ID.');
    return { id, model, handoff: params.get('handoff') || '' };
  }
  function canonicalUrl(model, id, base) { const url = new URL('/if/', base); url.searchParams.set('model', model); url.searchParams.set('int', id); return url.href; }
  function validate(source, selection) {
    if (source?.model?.id !== selection.model || source?.integration?.id !== selection.id) throw new Error('Quellenstand passt nicht zur angeforderten Auswahl.');
    for (const key of ['steps', 'systems', 'connections', 'processes', 'roles', 'messages', 'mappings']) if (!Array.isArray(source[key])) throw new Error('Unvollständige Quelle: ' + key);
    return source;
  }
  root.OrcaiIfModel = { parameters, canonicalUrl, validate };
})(typeof window === 'undefined' ? globalThis : window);
