(function (root) {
  'use strict';
  function parse(value) {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch (_) { return value; }
  }
  function payload(value) {
    const parsed = parse(value);
    if (typeof parsed?.hl7 === 'string') return parsed.hl7.split(/\r\n|\r|\n/).filter(Boolean).join('\n');
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
  }
  function mappingReferences(step) {
    const applied = [...new Set([step.mappingId, ...(step.mappingIds || [])].filter(Boolean))];
    const result = applied.map(id => 'Mapping am Schritt: ' + id);
    if (step.producedByMappingId) result.push('Nachricht erzeugt durch: ' + step.producedByMappingId + ' (kein erneutes Mapping)');
    return result.length ? result : ['Kein expliziter Mapping-Bezug dokumentiert.'];
  }
  async function validate(mapping, source) {
    const input = source.messages.find(m => m.id === (mapping.inboundMessageId || mapping.inputMessageId));
    const expected = source.messages.find(m => m.id === (mapping.outboundMessageId || mapping.outputMessageId));
    if (String(mapping.mappingType).toUpperCase() !== 'JSONATA' || !root.OrcaiMappingExecution)
      return { status: 'NICHT GETESTET', reason: 'Keine unterstützte lokale Ausführung verfügbar.' };
    const value = parse(input?.samplePayload);
    if (value?.synthetic !== true) return { status: 'NICHT GETESTET', reason: 'Kein ausdrücklich synthetisches Eingangsbeispiel vorhanden.' };
    try {
      const result = await root.OrcaiMappingExecution.execute(mapping, value);
      const same = expected && root.OrcaiDocumentSources.canonical(result) === root.OrcaiDocumentSources.canonical(parse(expected.samplePayload));
      return { status: 'LOKAL AUSGEFÜHRT', reason: !expected ? 'Kein Sollbeispiel für Ergebnisvergleich vorhanden.' : same ?
        'Ergebnis stimmt mit dem gespeicherten Sollbeispiel überein.' : 'ABWEICHUNG vom gespeicherten Sollbeispiel.', result };
    } catch (error) { return { status: 'LOKAL FEHLGESCHLAGEN', reason: error.message }; }
  }
  function hl7Changes(before, after) {
    const fields = value => {
      const parsed = parse(value), result = {}, count = {};
      if (!parsed?.hl7?.startsWith('MSH|')) return null;
      parsed.hl7.split(/\r\n|\r|\n/).filter(Boolean).forEach(line => {
        const parts = line.split('|'), segment = parts[0];
        const occurrence = count[segment] = (count[segment] || 0) + 1;
        parts.slice(1).forEach((part, index) => {
          result[segment + '[' + occurrence + ']-' + (index + (segment === 'MSH' ? 2 : 1))] = part;
        });
      });
      return result;
    };
    const a = fields(before), b = fields(after);
    if (!a || !b) return [];
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => a[key] !== b[key])
      .map(key => ({ field: key, before: a[key] ?? '(fehlt)', after: b[key] ?? '(fehlt)' }));
  }
  root.OrcaiDocumentDetails = { parse, payload, mappingReferences, validate, hl7Changes };
})(typeof window === 'undefined' ? globalThis : window);
