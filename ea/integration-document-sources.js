(function (root) {
  'use strict';
  const VERSION = 'integration-document-3.0.0';
  const HASH_POLICY = 'technical-metadata-v1';
  // Exact metadata keys only, never a date-pattern replacement. Business dates,
  // payloads (including object payloads), scripts and evidence dates stay intact.
  const VOLATILE = new Set(['generatedAt', 'persistedAt', 'exportedAt', 'renderedAt',
    'fetchedAt', 'retrievedAt', 'accessedAt', 'lastFetchedAt', 'cachedAt']);
  function cleanMetadata(value) {
    if (Array.isArray(value)) return value.map(cleanMetadata);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !VOLATILE.has(key))
      .map(([key, item]) => [key, cleanMetadata(item)]));
  }
  function hashInput(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
    const entity = value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
      const result = { ...value };
      for (const field of ['provenance', 'sources']) {
        if (Object.prototype.hasOwnProperty.call(value, field)) result[field] = cleanMetadata(value[field]);
      }
      return result;
    };
    const result = { ...source };
    for (const field of ['model', 'integration']) {
      if (Object.prototype.hasOwnProperty.call(source, field)) result[field] = entity(source[field]);
    }
    for (const field of ['systems', 'connections', 'processes', 'roles', 'messages', 'mappings']) {
      if (Array.isArray(source[field])) result[field] = source[field].map(entity);
    }
    return result;
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(item => canonical(item ?? null)).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
      .filter(key => value[key] !== undefined).map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }
  async function hash(value) {
    const bytes = new TextEncoder().encode(canonical(hashInput(value)));
    return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  }
  // Whitelist the documented fields: force-layout coordinates, token state and
  // UI selection must not manufacture new document versions.
  function pick(item, fields) {
    if (!item) return null;
    return Object.fromEntries(fields.split(' ').filter(key => item[key] !== undefined).map(key => [key, item[key]]));
  }
  const common = 'id name title description desc provenance sources validationGaps status owner businessOwner technicalOwner operationsOwner sla timeout retry errorHandling escalation security testCases acceptanceCriteria documentation';
  function snapshot(integration, env = root) {
    const runtime = env.OrcaiIntegrationFlowRuntime;
    runtime?.prepare();
    const catalog = env.OrcaiIntegrationCatalog;
    const steps = runtime?.orderedSteps(integration) || integration.steps || [];
    const connections = steps.map(s => (env.CONNECTIONS_DATA || []).find(c => c.id === s.connectionId) || { id: s.connectionId, missing: true })
      .map(c => ({ ...pick(c, common + ' missing protocol messageType flowType messageIds mappingIds authentication security'),
        source: typeof c.source === 'object' ? c.source?.id : c.source,
        target: typeof c.target === 'object' ? c.target?.id : c.target }));
    const messageIds = new Set(), mappingIds = new Set();
    const references = [...steps, ...(integration.messageFlow || []), ...connections];
    references.forEach(s => {
      ['messageId', 'inputMessageId', 'outputMessageId', 'inboundMessageId', 'outboundMessageId'].forEach(k => { if (s[k]) messageIds.add(s[k]); });
      (s.messageIds || []).forEach(id => messageIds.add(id));
      ['mappingId', 'producedByMappingId'].forEach(k => { if (s[k]) mappingIds.add(s[k]); });
      (s.mappingIds || []).forEach(id => mappingIds.add(id));
    });
    steps.forEach((s, index) => {
      const message = runtime?.stepMessage(integration, index);
      if (message) messageIds.add(message.id);
      (runtime?.stepMappings(integration, index) || []).forEach(m => mappingIds.add(m.id));
    });
    const mappings = [...mappingIds].sort().map(id => {
      const m = catalog?.getMappingById(id);
      if (!m) return { id, missing: true };
      ['inputMessageId', 'outputMessageId', 'inboundMessageId', 'outboundMessageId'].forEach(k => { if (m[k]) messageIds.add(m[k]); });
      return pick(m, common + ' orcaiId mappingType middlewareSystemId inputMessageId outputMessageId inboundMessageId outboundMessageId inboundConnectionId outboundConnectionId mappingScript postprocessor serializerSource');
    });
    const messages = [...messageIds].sort().map(id => {
      const m = catalog?.getMessageById(id);
      return m ? pick(m, common + ' orcaiId standard messageType format samplePayload') : { id, missing: true };
    });
    const systemIds = new Set([integration.sourceSystem, integration.targetSystem]);
    steps.forEach(s => [s.from, s.to, s.middlewareSystemId].forEach(id => systemIds.add(id)));
    mappings.forEach(m => systemIds.add(m.middlewareSystemId));
    const systems = [...systemIds].filter(Boolean).sort().map(id => {
      const s = (env.SYSTEMS_DATA || []).find(item => item.id === id);
      return s ? pick(s, common + ' vendor type domain hosting platform criticality') : { id, missing: true };
    });
    const processes = (env.PROCESSES_DATA || []).filter(p => (p.cleanIntegIds || p.integrations || []).includes(integration.id))
      .map(p => pick(p, common + ' apqc apqcMappings apqcHierarchyId')).sort((a, b) => a.id.localeCompare(b.id));
    const processIds = new Set(processes.map(p => p.id));
    const roles = (env.ACTORS_DATA || []).filter(a => (a.processes || []).some(id => processIds.has(id)))
      .map(a => ({...pick(a, common + ' scope role processes interactionMode'),clients:(a.clients||[]).map(c=>pick(c,'id name targetSystemId'))})).sort((a, b) => a.id.localeCompare(b.id));
    const model = (env.registeredLandscapeModels || []).find(m => m.id === env.currentModelId);
    // JSON clone freezes the source snapshot against later in-place edits.
    return JSON.parse(JSON.stringify({ templateVersion: VERSION, model: {
      id: env.currentModelId || 'unspecified', name: model?.name || model?.title || env.currentModelId || 'EA',
      provenance: model?.data?.meta?.provenance, sources: model?.data?.meta?.sources
    }, integration: pick(integration, common + ' sourceSystem targetSystem simulationNotice messageFlow'),
    steps: steps.map(s => pick(s, 'order connectionId from to messageId messageIds mappingId mappingIds producedByMappingId middlewareSystemId')),
    systems, connections, processes, roles, messages, mappings }));
  }
  function scope(source) {
    const uid = root.firebase?.auth?.().currentUser?.uid || 'anonymous';
    const client = root.localStorage?.getItem('orcai-active-client') || 'ACME';
    return JSON.stringify([client, uid, source.model.id, source.integration.id]);
  }
  root.OrcaiDocumentSources = { VERSION, HASH_POLICY, canonical, hashInput, hash, snapshot, scope };
})(typeof window === 'undefined' ? globalThis : window);
