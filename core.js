/* Lógica compartida de consulta; sin DOM ni servicios externos. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FitoCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim();
  const missing = value => !value || value === '-' || value === 'No informado en la ficha SFE';
  const compare = (a, b) => String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
  function chemicalReferences(product, catalog) {
    const found = [], visited = new Set(), pending = [...product.molecules];
    while (pending.length) {
      const id = pending.shift(); if (visited.has(id)) continue; visited.add(id);
      const reference = catalog?.[id]; if (!reference) continue;
      found.push(reference); pending.push(...(reference.components || []));
    }
    return found;
  }
  function chemicalSummary(product) {
    const refs = product.chemicalReferences || [];
    if (product.categories && !product.categories.includes('fungicida')) return {codes:[],coverage:product.categories.includes('herbicida')?'No aplica FRAC; consultar HRAC':'No aplica FRAC; consultar IRAC',refs:[]};
    const assigned = refs.filter(r => r.fracCode && r.fracStatus.startsWith('Verificado'));
    const codes = [...new Set(assigned.map(r => r.fracCode))];
    const complete = refs.length > 0 && refs.every(r => r.fracCode && r.fracStatus.startsWith('Verificado') && r.kind !== 'mixture');
    const coverage = !refs.length ? 'Sin referencia de ingrediente' : complete ? 'Completa para los ingredientes identificados' : codes.length ? 'Parcial: revisar componentes pendientes' : 'Sin asignación FRAC verificada';
    return { codes, coverage, refs };
  }
  function hracSummary(product) {
    const refs=product.hracReferences || [];
    if (!product.categories?.includes('herbicida')) return {codes:[],coverage:'No aplica a este grupo de productos',refs:[]};
    const assigned=refs.filter(r=>r.hracCode && r.status.startsWith('Verificado'));
    // 0 es una clasificación explícita. 4/29 es un grupo dual de un solo ingrediente, no una mezcla.
    const codes=[...new Set(assigned.map(r=>r.hracCode))];
    const complete=refs.length>0 && refs.length===product.molecules.length && assigned.length===refs.length;
    return {codes,coverage:complete?'Completa para los ingredientes identificados':codes.length?'Parcial: revisar componentes pendientes':'Sin asignación HRAC verificada',refs};
  }
  function iracSummary(product) {
    const refs=product.iracReferences || [];
    if (!product.categories?.includes('insecticida')) return {codes:[],coverage:'No aplica a este grupo de productos',refs:[]};
    // UN y sus variantes son códigos oficiales explícitos, nunca un sustituto de un dato ausente.
    const assigned=refs.filter(r=>r.iracCode && r.status.startsWith('Verificado'));
    const codes=[...new Set(assigned.map(r=>r.iracCode))];
    const complete=refs.length>0 && refs.length===product.molecules.length && assigned.length===refs.length && refs.every(r=>!r.partial);
    const outside=refs.length>0 && refs.length===product.molecules.length && refs.every(r=>r.status==='Fuera de alcance IRAC');
    return {codes,coverage:outside?'Fuera del alcance IRAC: depredadores o parasitoides':complete?'Completa para los ingredientes identificados':codes.length?'Parcial: revisar componentes pendientes':'Sin asignación IRAC verificada',refs};
  }
  function createStore(data) {
    const crops = new Map(data.crops.map(c => [c.id, c]));
    const molecules = new Map(data.molecules.map(m => [m.id, m]));
    const products = new Map(data.products.map(p => [p.id, { ...p, useIds: [], _search: norm([p.id, p.name, p.ingredients, p.registrant, p.classes].join(' ')) }]));
    for (const p of products.values()) {
      const nonFungicide = p.categories && !p.categories.includes('fungicida');
      p.chemicalReferences = nonFungicide ? [] : chemicalReferences(p, data.chemistry?.ingredients);
      p.fracVersion = nonFungicide ? '' : data.chemistry?.meta?.fracVersion || '';
      p.hracReferences=p.categories?.includes('herbicida') ? chemicalReferences(p,data.hrac?.ingredients) : [];
      p.hracVersion=p.categories?.includes('herbicida') ? data.hrac?.meta?.version || '' : '';
      if(p.categories?.includes('herbicida'))p.hracStatus=hracSummary(p).coverage;
      p.iracReferences=p.categories?.includes('insecticida') ? chemicalReferences(p,data.irac?.ingredients) : [];
      p.iracVersion=p.categories?.includes('insecticida') ? data.irac?.meta?.version || '' : '';
      if(p.categories?.includes('insecticida'))p.iracStatus=iracSummary(p).coverage;
    }
    const uses = data.uses.map(raw => {
      const product = products.get(raw.productId), crop = crops.get(raw.cropId);
      if (!product || !crop) throw new Error(`Referencia de datos inválida: ${raw.id}`);
      product.useIds.push(raw.id);
      return { ...raw, product, crop, _search: norm([product._search, crop.name, crop.scientific, ...raw.pests.flatMap(p => [p.name, p.scientific])].join(' ')) };
    });
    const byId = new Map(uses.map(u => [u.id, u]));
    return { data, products, crops, molecules, uses, byId };
  }
  const pestKey = p => JSON.stringify([p.name, p.scientific]);
  function productMatches(p, f) {
    return (!f.category || (p.categories || ['fungicida']).includes(f.category)) && (!f.commercial || norm(p.name).includes(norm(f.commercial))) &&
      (!f.moleculeText || norm(p.ingredients).includes(norm(f.moleculeText))) &&
      (!f.molecule || p.molecules.includes(f.molecule)) && (!f.type || p.typeId === f.type) &&
      (!f.status || (f.status === 'restricted' ? p.restricted : !p.restricted));
  }
  function useMatches(u, f) {
    return (!f.crop || u.cropId === f.crop) && (!f.q || u._search.includes(norm(f.q))) &&
      (!f.pestKey || u.pests.some(p => pestKey(p) === f.pestKey)) &&
      (!f.pest || u.pests.some(p => norm(`${p.name} ${p.scientific}`).includes(norm(f.pest))));
  }
  function filter(store, f = {}) {
    const matchedUses = store.uses.filter(u => productMatches(u.product, f) && useMatches(u, f)).map(u => ({ ...u,
      matchedPests: u.pests.filter(p => (!f.pestKey || pestKey(p) === f.pestKey) && (!f.pest || norm(`${p.name} ${p.scientific}`).includes(norm(f.pest))))
    }));
    let items;
    if (f.view === 'inventory') {
      const matchIds = new Set(matchedUses.map(u => u.productId));
      items = [...store.products.values()].filter(p => productMatches(p, f) && (
        f.crop || f.pest || f.pestKey ? matchIds.has(p.id) : !f.q || p._search.includes(norm(f.q)) || matchIds.has(p.id)
      ));
    } else items = matchedUses;
    const productIds = new Set(f.view === 'inventory' ? items.map(p => p.id) : matchedUses.map(u => u.productId));
    const relevantUses = matchedUses.filter(u => productIds.has(u.productId));
    return { items, matchedUses: relevantUses, productIds, productCount: productIds.size,
      useCount: relevantUses.length, rowCount: relevantUses.reduce((n, u) => n + u.matchedPests.length, 0),
      cropCount: new Set(relevantUses.map(u => u.cropId)).size };
  }
  function sortItems(items, sort = 'name', view = 'uses') {
    const product = item => view === 'inventory' ? item : item.product;
    return [...items].sort((a, b) => {
      let result = 0;
      if (sort === 'crop' && view !== 'inventory') result = compare(a.crop.name, b.crop.name) || compare(a.crop.scientific, b.crop.scientific);
      else if (sort === 'molecule') result = compare(product(a).ingredients, product(b).ingredients);
      if (!result) result = compare(product(a).name, product(b).name) || compare(product(a).id, product(b).id);
      if (!result && view !== 'inventory') result = compare(a.crop.name, b.crop.name) || compare(a.id, b.id);
      return result;
    });
  }
  function paginate(items, page = 1, size = 15) {
    const pages = Math.max(1, Math.ceil(items.length / size));
    const current = Math.min(Math.max(1, page), pages);
    return { items: items.slice((current - 1) * size, current * size), page: current, pages,
      start: items.length ? (current - 1) * size + 1 : 0, end: Math.min(current * size, items.length) };
  }
  function facets(store, f, field) {
    const relaxed = { ...f, [field]: '' }, found = filter(store, relaxed), counts = new Map();
    if (field === 'molecule') {
      for (const id of found.productIds) for (const molecule of store.products.get(id).molecules) counts.set(molecule, (counts.get(molecule) || 0) + 1);
      return [...counts].map(([id, count]) => ({ id, label: store.molecules.get(id).name, count })).sort((a, b) => compare(a.label, b.label));
    }
    const sets = new Map();
    for (const u of found.matchedUses) {
      if (!sets.has(u.cropId)) sets.set(u.cropId, new Set());
      sets.get(u.cropId).add(u.productId);
    }
    return [...sets].map(([id, ids]) => { const c = store.crops.get(id); return { id, label: c.name, sublabel: c.scientific, count: ids.size }; }).sort((a, b) => compare(a.label, b.label) || compare(a.sublabel, b.sublabel));
  }
  const CSV_FIELDS = ['numero_registro','marca_comercial','ingredientes_activos','tipo_plaguicida','estado','registrante','clases','cultivo','cultivo_nombre_cientifico','dosis','volumen_terrestre','volumen_aereo','intervalo_aplicacion','periodo_carencia','reingreso','plaga_nombre_comun','plaga_nombre_cientifico','alcance_dosis','observaciones','recomendaciones','fecha_consulta_detalle','fecha_censo','fuente','frac_codigos_verificados','frac_cobertura','frac_version','frac_identidad_componentes_json','grupo_uso','hrac_estado','hrac_codigos_verificados','hrac_cobertura','hrac_version','hrac_componentes_json','irac_codigos_verificados','irac_cobertura','irac_version','irac_componentes_json','censos_origen_json','composicion_sfe_json','plaga_estadio'];
  function exportRows(result, view = 'uses') {
    const cache=new Map();
    const common = p => { if(cache.has(p.id))return cache.get(p.id); const row=({ numero_registro: p.id, marca_comercial: p.name, ingredientes_activos: p.ingredients,
      tipo_plaguicida: p.type, estado: p.status, registrante: p.registrant, clases: p.classes,
      observaciones: p.observations, recomendaciones: p.recommendations, fecha_consulta_detalle: p.detailDate,
      fecha_censo: p.censusDate, fuente: p.source, grupo_uso:(p.categories || ['fungicida']).join(' + '), hrac_estado:hracSummary(p).coverage,
      irac_codigos_verificados:iracSummary(p).codes.join(' + '),irac_cobertura:iracSummary(p).coverage,irac_version:p.iracVersion,
      irac_componentes_json:JSON.stringify((p.iracReferences||[]).map(r=>({ingrediente_sfe:r.sfeName,activo_referencia:r.referenceActive,codigo_irac:r.iracCode,grupo_principal:r.mainGroup,subgrupo:r.subgroup,modo_accion:r.modeOfActionEs,modo_accion_original:r.modeOfAction,familia:r.chemicalFamily,estado:r.status,parcial:!!r.partial,nota:r.mappingNote,fuente:r.sourceUrl,pagina_pdf:r.sourcePage,pagina_anexo:r.appendixPage,nombre_anexo:r.appendixReferenceActive,tabla_online:r.onlineUrl,nodo:r.sourceNode}))),
      censos_origen_json:JSON.stringify(p.sourceRecords||[]),composicion_sfe_json:JSON.stringify(p.composition||[]),
      hrac_codigos_verificados:hracSummary(p).codes.join(' + '),hrac_cobertura:hracSummary(p).coverage,hrac_version:p.hracVersion,
      hrac_componentes_json:JSON.stringify((p.hracReferences||[]).map(r=>({ingrediente_sfe:r.sfeName,activo_referencia:r.referenceActive,codigo_hrac:r.hracCode,letra_historica:r.legacyCode,modo_accion:r.modeOfActionEs,modo_accion_original:r.modeOfAction,familia_quimica:r.chemicalFamily,estado:r.status,nota:r.mappingNote,fuente:r.sourceUrl,hoja:r.sourceSheet,fila:r.sourceRow}))),
      frac_codigos_verificados: chemicalSummary(p).codes.join(' + '), frac_cobertura: chemicalSummary(p).coverage,
      frac_version: p.fracVersion, frac_identidad_componentes_json: JSON.stringify((p.chemicalReferences || []).map(r => ({
        ingrediente_sfe:r.sfeName, nombre_referencia:r.canonicalName, codigo_frac:r.fracCode, estado_frac:r.fracStatus,
        grupo_frac:r.groupName, familia_quimica_biologica:r.chemicalGroup, modo_accion:r.targetSite, sitio_moa:r.moaCode,
        estado_identidad:r.identityStatus, nombre_iupac_referencia:r.iupacName, cas_contrastado:r.cas, pubchem_cid:r.pubchemCid,
        fuente_frac:r.fracSource, fuente_identidad:r.pubchemUrl, nota_frac:r.mappingNote, nota_identidad:r.identityNote
      }))) }); cache.set(p.id,row);return row; };
    if (view === 'inventory') return result.items.map(p => ({ ...common(p), fichas_cultivo_publicadas: p.useIds.length,
      tipo_formulacion: p.formulation, grado_tecnico: p.typeId === '2' ? 'Sí' : 'No' }));
    return result.matchedUses.flatMap(u => u.matchedPests.map(pest => ({ ...common(u.product), cultivo: u.crop.name,
      cultivo_nombre_cientifico: u.crop.scientific, dosis: u.dose, volumen_terrestre: u.volumeGround,
      volumen_aereo: u.volumeAir, intervalo_aplicacion: u.interval, periodo_carencia: u.withdrawal,
      reingreso: u.reentry, plaga_nombre_comun: pest.name, plaga_nombre_cientifico: pest.scientific,
      alcance_dosis: u.scope,plaga_estadio:pest.stage||'' })));
  }
  function csv(rows, fields) {
    const cols = fields || [...new Set(rows.flatMap(r => Object.keys(r)))];
    const cell = value => {
      let s = String(value ?? '');
      // Evitar que Excel interprete datos de texto como fórmulas al abrir el CSV.
      if (/^[\s]*[=+@]/.test(s) || (/^[\s]*-/.test(s) && s.trim() !== '-')) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    return '\uFEFF' + [cols.map(cell).join(','), ...rows.map(row => cols.map(col => cell(row[col])).join(','))].join('\r\n');
  }
  return { norm, missing, compare, pestKey, chemicalReferences, chemicalSummary, hracSummary, iracSummary, createStore, filter, sortItems, paginate, facets, exportRows, csv, CSV_FIELDS };
});
