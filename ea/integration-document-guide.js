(function (root) {
  'use strict';
  const chapters = [
    ['Metadaten und Änderungsstand', ['version', 'authors', 'reviewers', 'approver', 'relatedDocuments']],
    ['Management Summary', ['purpose', 'criticality', 'volume', 'sla']],
    ['Kontext und Geltungsbereich', ['inScope', 'outOfScope', 'dependencies', 'businessOwner']],
    ['Systeme und Schnittstellen', ['environment', 'endpoint', 'authentication', 'schema', 'rateLimit', 'timeout', 'acknowledgement']],
    ['Architektur und Entscheidungen', ['patterns', 'decisions', 'alternatives', 'atomicity', 'idempotency', 'security']],
    ['Nachrichten und Mapping', ['fieldMappings', 'validationRules', 'defaults']],
    ['Fehlerbehandlung und Wiederanlauf', ['errorHandling', 'retry', 'deadLetterQueue', 'replay', 'escalation']],
    ['Monitoring und Betrieb', ['operationsOwner', 'metrics', 'alerts', 'logging', 'retention', 'runbook']],
    ['Tests und Abnahme', ['testCases', 'acceptanceCriteria', 'approvalEvidence']],
    ['Anhänge und offene Punkte', ['glossary', 'openItems', 'standards']]
  ];
  const labels = { version: 'Dokumentversion', authors: 'Autoren', reviewers: 'Prüfer', approver: 'Freigebende Rolle', relatedDocuments: 'Verwandte Dokumente',
    purpose: 'Geschäftlicher Nutzen', criticality: 'Kritikalität', volume: 'Nachrichtenvolumen', sla: 'Service-Level', inScope: 'Im Geltungsbereich', outOfScope: 'Nicht im Geltungsbereich', dependencies: 'Abhängigkeiten', businessOwner: 'Fachverantwortung',
    environment: 'Umgebung', endpoint: 'Endpunkt (ohne Zugangsdaten)', authentication: 'Authentifizierung', schema: 'Schema und Version', rateLimit: 'Ratenbegrenzung', timeout: 'Zeitüberschreitung', acknowledgement: 'Quittierung',
    patterns: 'Integrationsmuster', decisions: 'Entscheidungen und Begründungen', alternatives: 'Alternativen', atomicity: 'Transaktionsgrenzen', idempotency: 'Duplikaterkennung / Idempotenz', security: 'Sicherheitskonzept',
    fieldMappings: 'Feldmapping: Quelle, Ziel, Typ, Pflicht, Regel', validationRules: 'Validierungsregeln', defaults: 'Standardwerte', errorHandling: 'Fehlerklassen und Reaktionen', retry: 'Wiederholungen und Grenzen', deadLetterQueue: 'Fehlerwarteschlange', replay: 'Kontrollierter Wiederanlauf', escalation: 'Eskalation',
    operationsOwner: 'Betriebsverantwortung', metrics: 'Messgrößen', alerts: 'Alarme', logging: 'Protokollierung und Korrelation', retention: 'Aufbewahrung', runbook: 'Betriebsanleitung', testCases: 'Testfälle', acceptanceCriteria: 'Abnahmekriterien', approvalEvidence: 'Freigabenachweise', glossary: 'Glossar', openItems: 'Offene Punkte mit Owner und Termin', standards: 'Standards und Quellen' };
  function sections(source) {
    const entities = [source.integration, ...(source.connections || [])];
    return chapters.map(([title, keys], index) => ({ number: index + 1, title,
      fields: keys.map(key => ({ key, label: labels[key] || key, entries: entities.flatMap(e => {
        const value = e.documentation?.[key] ?? e[key];
        return value === undefined ? [] : [{ entity: e.id, value }];
      }) })) }));
  }
  function flatten(value, path = '$', result = {}) {
    if (value && typeof value === 'object' && Object.keys(value).length)
      Object.entries(value).forEach(([key, child]) => flatten(child, path + '.' + key, result));
    else result[path] = value;
    return result;
  }
  function diff(before, after) {
    const hl7 = root.OrcaiDocumentDetails.hl7Changes(before, after);
    if (before?.hl7 && after?.hl7) return hl7;
    const a = flatten(before), b = flatten(after);
    return [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .filter(field => JSON.stringify(a[field]) !== JSON.stringify(b[field]))
      .map(field => ({ field, before: a[field], after: b[field] }));
  }
  root.OrcaiDocumentGuide = { sections, diff };
})(typeof window === 'undefined' ? globalThis : window);
