/* Vista simple: dos entradas principales; resto de controles y datos bajo demanda. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const C = window.FitoCore;
const h = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const fmt = n => new Intl.NumberFormat('es-CR').format(n);
const date = value => value ? new Intl.DateTimeFormat('es-CR',{day:'2-digit',month:'short',year:'numeric',timeZone:'America/Costa_Rica'}).format(new Date(value)) : 'No informada';
if (!C || !window.SFE_DATA) { const el=document.createElement('p');el.className='fatal-error';el.textContent='No se pudo cargar la base local. Conserva todos los archivos de la app juntos y vuelve a abrir index.html.';document.body.append(el);return; }
const data=window.SFE_DATA, store=C.createStore(data);
const state={view:'uses',moleculeText:'',commercial:'',crop:'',pestKey:'',type:'',status:'',category:'',browse:false,page:1};
const allPests=new Map();
for (const u of store.uses) for(const p of u.pests) if (!C.missing(p.name)||!C.missing(p.scientific)) allPests.set(C.pestKey(p),p);
let result, selectedProduct, selectedUseId, detailPestKey='', opener, timer, toastTimer;
const sourceUrl=url=>/^https:\/\/app\.sfe\.go\.cr\//.test(url||'') ? url : data.meta.source;
const valueHtml=value=>C.missing(value)?'<span class="missing">Sin dato publicado</span>':h(value);
const pestLabel=p=>`${C.missing(p.name)?'Nombre común no informado':p.name} · ${C.missing(p.scientific)?'Nombre científico no informado':p.scientific}`;
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function selectOptions(select,options,current,placeholder){
 const items=[...options];
 if(current&&!items.some(o=>o.value===current)){
  const label=select.id==='crop-filter'?(()=>{const c=store.crops.get(current);return c?`${c.name} · ${c.scientific}`:current;})():allPests.has(current)?pestLabel(allPests.get(current)):current;
  items.push({value:current,label:`${label} (sin coincidencias)`});
 }
 select.innerHTML=`<option value="">${h(placeholder)}</option>`+items.map(o=>`<option value="${h(o.value)}">${h(o.label)}</option>`).join('');select.value=current;
}
const autocompletes=new Map(),SUGGESTION_LIMIT=6;
const uniqueSuggestionNames=names=>[...new Map([...names].map(name=>[C.norm(name),name])).values()];
function closeSuggestions(a){a.open=false;a.active=-1;a.expanded=false;a.popup.hidden=true;a.input.setAttribute('aria-expanded','false');a.input.removeAttribute('aria-activedescendant');a.field.classList.remove('is-open');}
function closeAllSuggestions(){for(const a of autocompletes.values())closeSuggestions(a);}
function highlightSuggestion(name,query){
 const start=C.norm(name).indexOf(C.norm(query)),end=start+query.length;
 return start>=0&&C.norm(name.slice(start,end))===C.norm(query)?h(name.slice(0,start))+'<mark>'+h(name.slice(start,end))+'</mark>'+h(name.slice(end)):h(name);
}
function updateActiveSuggestion(a){
 const options=[...a.list.children];
 options.forEach((el,i)=>el.setAttribute('aria-selected',String(i===a.active)));
 const selected=options[a.active];
 if(!selected){a.input.removeAttribute('aria-activedescendant');return;}
 a.input.setAttribute('aria-activedescendant',selected.id);
 const top=selected.offsetTop-a.list.offsetTop,bottom=top+selected.offsetHeight;
 if(top<a.list.scrollTop)a.list.scrollTop=top;
 else if(bottom>a.list.scrollTop+a.list.clientHeight)a.list.scrollTop=bottom-a.list.clientHeight;
}
function updateSuggestions(a){
 const query=a.input.value.trim(),q=C.norm(query);
 if(!a.open||!q){closeSuggestions(a);return;}
 const previous=a.items?.[a.active];
 const matches=a.candidates.filter(name=>C.norm(name).includes(q)).sort((x,y)=>Number(C.norm(y).startsWith(q))-Number(C.norm(x).startsWith(q))||C.compare(x,y));
 a.items=a.expanded?matches:matches.slice(0,SUGGESTION_LIMIT);
 a.active=previous?a.items.indexOf(previous):-1;
 a.popup.hidden=false;a.field.classList.add('is-open');a.input.setAttribute('aria-expanded','true');
 a.popup.querySelector('.suggestions-count').textContent=matches.length?`${fmt(a.items.length)} de ${fmt(matches.length)} ${matches.length===1?'coincidencia':'coincidencias'}`:'Sin coincidencias. Prueba otro nombre.';
 a.list.innerHTML=a.items.map((name,i)=>`<div class="suggestion-option" role="option" aria-selected="false" id="${a.list.id}-${i}" data-suggestion="${i}" title="${h(name)}"><span>${highlightSuggestion(name,query)}</span>${svg('arrow')}</div>`).join('');
 a.more.hidden=matches.length<=SUGGESTION_LIMIT;
 a.more.textContent=a.expanded?'Mostrar solo 6 coincidencias':`Mostrar el resto de los resultados (${fmt(matches.length-SUGGESTION_LIMIT)})`;
 updateActiveSuggestion(a);
}
function initAutocomplete(){
 for(const [prefix,key] of [['molecule','moleculeText'],['commercial','commercial']]){
  const input=$(prefix+'-input'),popup=$(prefix+'-suggestions'),list=$(prefix+'-options');
  const a={input,popup,list,field:input.closest('.autocomplete'),more:popup.querySelector('.suggestions-more'),key,candidates:[],items:[],open:false,expanded:false,active:-1};autocompletes.set(prefix,a);
  input.addEventListener('focus',()=>{for(const other of autocompletes.values())if(other!==a)closeSuggestions(other);a.open=!!input.value.trim();updateSuggestions(a);});
  input.addEventListener('input',()=>{clearTimeout(timer);state[key]=input.value.trim();a.expanded=false;a.active=-1;a.open=!!state[key];a.list.scrollTop=0;updateSuggestions(a);timer=setTimeout(()=>{state.page=1;render();},130);});
  input.addEventListener('keydown',e=>{
   if(e.isComposing)return;
   if(e.key==='Escape'){e.preventDefault();closeAllSuggestions();}
   else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    if(!input.value.trim())return;e.preventDefault();if(!a.open){a.open=true;updateSuggestions(a);}
    if(!a.items.length)return;a.active=e.key==='ArrowDown'?(a.active+1)%a.items.length:(a.active<=0?a.items.length-1:a.active-1);updateActiveSuggestion(a);
   }else if(e.key==='Enter'&&a.open&&a.active>=0){e.preventDefault();chooseSuggestion(a,a.items[a.active]);}
  });
  list.addEventListener('pointerdown',e=>{if(e.target.closest('[data-suggestion]'))e.preventDefault();});
  list.addEventListener('click',e=>{const option=e.target.closest('[data-suggestion]');if(option)chooseSuggestion(a,a.items[Number(option.dataset.suggestion)]);});
  a.more.addEventListener('click',()=>{a.expanded=!a.expanded;a.active=-1;a.list.scrollTop=0;input.focus({preventScroll:true});updateSuggestions(a);});
  a.field.addEventListener('focusout',e=>{if(!a.field.contains(e.relatedTarget))closeSuggestions(a);});
 }
 document.addEventListener('pointerdown',e=>{for(const a of autocompletes.values())if(!a.field.contains(e.target))closeSuggestions(a);});
}
function chooseSuggestion(a,value){
 if(!value)return;clearTimeout(timer);a.input.value=value;state[a.key]=value;state.page=1;closeAllSuggestions();render();a.input.focus({preventScroll:true});closeAllSuggestions();
}
function refreshOptions(){
 const moleculeProducts=C.filter(store,{...state,moleculeText:''}).productIds;
 const moleculeIds=new Set([...moleculeProducts].flatMap(id=>store.products.get(id).molecules));
 const moleculeAutocomplete=autocompletes.get('molecule');moleculeAutocomplete.candidates=uniqueSuggestionNames([...moleculeIds].map(id=>store.molecules.get(id).name));updateSuggestions(moleculeAutocomplete);
 const commercialProducts=C.filter(store,{...state,commercial:''}).productIds;
 const commercialAutocomplete=autocompletes.get('commercial');commercialAutocomplete.candidates=uniqueSuggestionNames([...commercialProducts].map(id=>store.products.get(id).name));updateSuggestions(commercialAutocomplete);
 const crops=C.facets(store,state,'crop').map(c=>({value:c.id,label:`${c.label} · ${c.sublabel}`}));
 selectOptions($('crop-filter'),crops,state.crop,'Todos los cultivos con usos publicados');
 const pests=new Map();
 for(const u of C.filter(store,{...state,pestKey:''}).matchedUses)for(const p of u.pests)if(!C.missing(p.name)||!C.missing(p.scientific))pests.set(C.pestKey(p),p);
 const pestOptions=[...pests].map(([value,p])=>({value,label:pestLabel(p)})).sort((a,b)=>C.compare(a.label,b.label));
 selectOptions($('pest-filter'),pestOptions,state.pestKey,'Todas las plagas o malezas publicadas');
}
function syncUrl(){
 const params=new URLSearchParams();
 for(const key of ['moleculeText','commercial','crop','pestKey','type','status','category'])if(state[key])params.set(key,state[key]);
 if(state.view==='inventory')params.set('view','inventory');
 if(state.browse)params.set('browse','1');
 try{history.replaceState(null,'',`${location.pathname}${location.search}${params.size?'#'+params.toString():''}`);}catch{/* Apertura directa desde archivo. */}
}
function setExtraOpen(open){$('extra-filters').hidden=!open;$('filters-toggle').setAttribute('aria-expanded',String(open));}
function resistanceBadges(p,mid){
 const systems=[];if(p.categories?.includes('fungicida'))systems.push('FRAC');if(p.categories?.includes('herbicida'))systems.push('HRAC');if(p.categories?.includes('insecticida'))systems.push('IRAC');if(!systems.length)systems.push('FRAC');
 return `<span class="resistance-badges">${systems.map(system=>{
  let scoped=p;
  if(mid){const key={FRAC:'chemistry',HRAC:'hrac',IRAC:'irac'}[system],field={FRAC:'chemicalReferences',HRAC:'hracReferences',IRAC:'iracReferences'}[system];scoped={...p,molecules:[mid],[field]:C.chemicalReferences({molecules:[mid]},data[key]?.ingredients)};}
  const summary=system==='HRAC'?C.hracSummary(scoped):system==='IRAC'?C.iracSummary(scoped):C.chemicalSummary(scoped);
  const chips=summary.codes.map(code=>{
   let tone=0;for(const c of `${system}:${code}`)tone=(tone*31+c.charCodeAt(0))>>>0;
   const note=system==='IRAC'&&code.startsWith('UN')?'Grupo IRAC oficial explícito; no es un dato pendiente':code==='0'&&system==='HRAC'?'Modo de acción desconocido explícito; no es un dato pendiente':code.includes('/')?'Clasificación dual de un ingrediente; no representa dos componentes de mezcla':'Código del activo de referencia; no implica intercambiabilidad de productos';
   return `<span class="resistance-code code-tone-${tone%8}" data-system="${system}" data-code="${h(code)}" title="${h(note)}">${system} ${h(code)}</span>`;
  });
  if(!summary.codes.length||summary.coverage.startsWith('Parcial'))chips.push(`<span class="resistance-code code-pending" data-system="${system}" title="${h(summary.coverage)}">${system} ${summary.coverage.startsWith('Fuera del alcance')?'no aplica':summary.codes.length?'parcial':'sin código'}</span>`);
  return chips.join(' ');
 }).join(' ')}</span>`;
}
function ingredientLabels(p){
 if(!p.molecules.length)return h(p.ingredients||'Ingrediente no informado');
 return p.molecules.map(mid=>{
  const molecule=store.molecules.get(mid),published=p.composition.find(c=>C.norm(c[0])===C.norm(molecule.name));
  const name=published?.[0]||(p.molecules.length===1?p.ingredients:molecule.name);
  return `<span class="ingredient-item" data-molecule="${h(mid)}"><span class="ingredient-name">${h(name)}</span>${resistanceBadges(p,mid)}</span>`;
 }).join('');
}
function render(){
 result=C.filter(store,state);
 const started=!!(state.browse||state.moleculeText||state.commercial||state.crop||state.pestKey||state.type||state.status||state.category||state.view==='inventory');
 $('results-section').hidden=!started;$('start-hint').hidden=started;
 const products=C.sortItems([...result.productIds].map(id=>store.products.get(id)),'name','inventory');
 const page=C.paginate(products,state.page,12);state.page=page.page;
 $('results-title').textContent=`${fmt(products.length)} ${products.length===1?'producto':'productos'}`;
 const extra=[state.crop,state.pestKey,state.type,state.status,state.category,state.view==='inventory'].filter(Boolean).length;
 $('extra-count').hidden=!extra;$('extra-count').textContent=extra;
 $('filter-description').textContent=extra?`${extra} ${extra===1?'filtro adicional activo':'filtros adicionales activos'}`:'';
 $('product-list').innerHTML=page.items.map(p=>`<article class="product-card"><div class="product-copy"><div class="product-title-line"><h3>${h(p.name)}</h3>${resistanceBadges(p)}</div><div class="ingredients">${ingredientLabels(p)}</div>${p.restricted?'<span class="badge restricted">Uso restringido</span>':''}</div><button class="open-product" data-product="${h(p.id)}" aria-label="Ver ficha de ${h(p.name)}">Ver ficha ${svg('arrow')}</button></article>`).join('');
 $('empty-state').hidden=!!products.length;
 $('page-info').textContent=`${fmt(page.start)}–${fmt(page.end)} de ${fmt(products.length)}`;
 $('page-current').textContent=`${page.page} / ${fmt(page.pages)}`;
 $('page-prev').disabled=page.page===1;$('page-next').disabled=page.page===page.pages;
 $('export-csv').disabled=!products.length;
 $('export-csv').textContent=state.view==='inventory'?'Descargar inventario filtrado (CSV)':'Descargar usos filtrados (CSV)';
 refreshOptions();syncUrl();
}
function reset(){closeAllSuggestions();clearTimeout(timer);Object.assign(state,{view:'uses',moleculeText:'',commercial:'',crop:'',pestKey:'',type:'',status:'',category:'',browse:false,page:1});$('molecule-input').value='';$('commercial-input').value='';$('type-filter').value='';$('status-filter').value='';$('category-filter').value='';$('include-inventory').checked=false;setExtraOpen(false);document.querySelector('.more-options').open=false;render();}
function card(label,value,cls=''){return `<div class="application-card ${cls}"><span>${h(label)}</span><p>${valueHtml(value)}</p></div>`;}
function renderApplication(){
 const u=store.byId.get(selectedUseId);if(!u||u.productId!==selectedProduct.id)return;
 const pestOptions=u.pests.filter(p=>!C.missing(p.name)||!C.missing(p.scientific));
 if(detailPestKey&&!pestOptions.some(p=>C.pestKey(p)===detailPestKey))detailPestKey='';
 const uniquePests=[...new Map(pestOptions.map(p=>[C.pestKey(p),p])).values()];
 $('dialog-pest').innerHTML='<option value="">Todas las plagas de esta ficha</option>'+uniquePests.map(p=>`<option value="${h(C.pestKey(p))}">${h(pestLabel(p))}</option>`).join('');$('dialog-pest').value=detailPestKey;
 const pests=detailPestKey?u.pests.filter(p=>C.pestKey(p)===detailPestKey):u.pests;
 $('application-content').innerHTML=`<p class="dose-note">Dosis del <strong>${selectedProduct.typeId==='8'?'agente biológico registrado':'producto formulado'}</strong> para el cultivo seleccionado. La selección de plaga o maleza solo filtra la lista. El texto de dosis se conserva íntegro: revisa sus rangos, condiciones y especificaciones en la etiqueta.</p><div class="application-grid">${card('Dosis publicada',u.dose,'dose')}${card('Intervalo de aplicación',u.interval)}${card('Volumen terrestre',u.volumeGround)}${card('Volumen aéreo',u.volumeAir)}${card('Periodo de carencia',u.withdrawal)}${card('Reingreso al área',u.reentry)}</div><section class="pest-list" aria-label="Plagas publicadas"><h3>${detailPestKey?'Plaga seleccionada':'Plagas publicadas en esta ficha'}</h3>${pests.map(p=>`<div class="pest-row"><span>${valueHtml(p.name)}</span><em>${valueHtml(p.scientific)}${p.stage?`<br>Estadío publicado: ${h(p.stage)}`:''}</em></div>`).join('')}</section><p class="citation">Detalle consultado: ${h(date(selectedProduct.detailDate))}<br>Evidencia local: ${h(u.evidence)}</p>`;
}
function renderHrac(p){
 const summary=C.hracSummary(p),meta=data.hrac?.meta;
 const link=(url,label)=>/^https:\/\/hracglobal\.com\//.test(url||'')?`<a href="${h(url)}" target="_blank" rel="noopener noreferrer">${h(label)} ↗</a>`:'';
 return `<details class="record-details chemistry-details hrac-details"><summary>Grupo HRAC por ingrediente activo</summary><p class="chemistry-note"><strong>HRAC ${h(meta?.version||'sin edición verificada')} · ${h(summary.codes.join(' + ')||'Sin código verificado')}</strong><br>${h(summary.coverage)}. Es una clasificación del modo de acción del activo de referencia, no una autorización de uso ni una equivalencia entre formulaciones.</p>${summary.refs.map(r=>`<section class="chemical-entry hrac-entry"><h3>${h(r.sfeName)} ${resistanceBadges(p,r.id)}</h3><p class="chemical-status">${h(r.status)}</p><dl class="record-grid"><div><dt>Grupo HRAC numérico</dt><dd>${r.hracCode?`<strong class="hrac-code">${h(r.hracCode)}</strong>${r.hracCode==='0'?' · modo de acción desconocido':''}`:'Pendiente de verificar; no se asigna 0 por ausencia'}</dd></div><div><dt>Activo de referencia en HRAC</dt><dd>${h(r.referenceActive||'Sin correspondencia inequívoca')}</dd></div><div><dt>Código histórico (letra)</dt><dd>${h(r.legacyCode||'No asignado')} · solo referencia histórica</dd></div><div><dt>Familia química de referencia</dt><dd>${h(r.chemicalFamily||'Sin asignación verificada')}</dd></div><div class="wide"><dt>Modo de acción</dt><dd>${h(r.modeOfActionEs||'Sin correspondencia verificada')}<br>${h(r.modeOfAction)}</dd></div><div class="wide"><dt>Alcance de la correspondencia</dt><dd>${h(r.mappingNote)}</dd></div></dl><p class="chemical-sources">${link(r.landingUrl,'Lista oficial HRAC 2026')} · ${link(r.sourceUrl,r.sourceRow?`Excel, ${r.sourceSheet}, fila ${r.sourceRow}`:'Excel consultado')}</p></section>`).join('')||'<p class="hint">No existe todavía una correspondencia HRAC verificada para este ingrediente.</p>'}<p class="hint">Se conserva cada ingrediente de las mezclas. El código 4/29 identifica la clasificación dual de una sola sustancia; el signo + reúne códigos de componentes de una mezcla. El grupo 0 significa modo de acción desconocido en la lista oficial, no un dato pendiente. Las sales, ésteres y formas estereoisoméricas conservan su nombre SFE; el grupo del activo de referencia no confirma una identidad IUPAC/CAS ni la composición del formulado.</p></details>`;
}
function renderIrac(p){
 const summary=C.iracSummary(p),meta=data.irac?.meta;
 const link=(url,label)=>/^https:\/\/irac-online\.org\//.test(url||'')?`<a href="${h(url)}" target="_blank" rel="noopener noreferrer">${h(label)} ↗</a>`:'';
 return `<details class="record-details chemistry-details irac-details"><summary>Grupo IRAC por ingrediente activo</summary><p class="chemistry-note"><strong>IRAC ${h(meta?.version||'sin edición verificada')} · ${h(summary.codes.join(' + ')||'Sin código verificado')}</strong><br>${h(summary.coverage)}. Clasificación del activo de referencia: no autoriza cultivos ni plagas, no fija dosis y no demuestra equivalencia entre formulados.</p>${summary.refs.map(r=>`<section class="chemical-entry irac-entry"><h3>${h(r.sfeName)} ${resistanceBadges(p,r.id)}</h3><p class="chemical-status">${h(r.status)}</p><dl class="record-grid"><div><dt>Código IRAC completo</dt><dd>${r.iracCode?`<strong class="irac-code">${h(r.iracCode)}</strong>${r.iracCode.startsWith('UN')?' · grupo oficial explícito, no pendiente':''}`:h(r.status==='Fuera de alcance IRAC'?'No aplica: enemigo natural fuera del alcance de la clasificación':'Sin correspondencia verificada; no se asigna UN por ausencia')}</dd></div><div><dt>Activo de referencia en IRAC</dt><dd>${h(r.referenceActive||'Sin correspondencia inequívoca')}</dd></div><div><dt>Grupo principal y subgrupo</dt><dd>${h(r.mainGroup||'No asignado')}${r.subgroup?` · subgrupo ${h(r.subgroup)}`:''}</dd></div><div><dt>Familia / clase de referencia</dt><dd>${h(r.chemicalFamily||'Sin asignación verificada')}</dd></div><div class="wide"><dt>Modo de acción</dt><dd>${h(r.modeOfActionEs||'Sin correspondencia verificada')}<br>${h(r.modeOfAction)}</dd></div><div class="wide"><dt>Alcance de la correspondencia</dt><dd>${h(r.mappingNote)}</dd></div></dl><p class="chemical-sources">${link(r.sourceUrl,r.sourcePage?`IRAC ${r.version}, página ${r.sourcePage}`:'Esquema oficial IRAC')} · ${link(r.onlineUrl,'Fila de la clasificación oficial en línea')}${r.appendixPage?' · '+link(meta.sourceUrl+'#page='+r.appendixPage,`Anexo 5, página ${r.appendixPage}`):''}</p></section>`).join('')||'<p class="hint">No existe una correspondencia IRAC verificada para el ingrediente.</p>'}<p class="hint">Se conserva la letra del subgrupo: 1A no es 1B, y 4A no es 4C. Subgrupos distintos de un mismo grupo principal no implican una rotación recomendada: consulta la guía IRAC y la etiqueta. El signo + reúne códigos de componentes de una mezcla. UN y sus variantes son grupos oficiales explícitos; los ingredientes no localizados permanecen sin código. Los depredadores y parasitoides no se convierten automáticamente en UN. No se completan cepas, sales o formas estereoisoméricas por analogía. Los colores no son oficiales.</p></details>`;
}
function renderChemistry(p){
 return ((!p.categories||p.categories.includes('fungicida'))?renderFrac(p):'')+(p.categories?.includes('herbicida')?renderHrac(p):'')+(p.categories?.includes('insecticida')?renderIrac(p):'');
}
function renderFrac(p){
 const summary=C.chemicalSummary(p),meta=data.chemistry?.meta;
 if(!meta)return '';
 const link=(url,label)=>/^https:\/\/(www\.frac\.info|pubchem\.ncbi\.nlm\.nih\.gov)\//.test(url||'')?`<a href="${h(url)}" target="_blank" rel="noopener noreferrer">${h(label)} ↗</a>`:'';
 return `<details class="record-details chemistry-details"><summary>Grupo FRAC e identidad química</summary><p class="chemistry-note"><strong>FRAC ${h(meta.fracVersion)} · ${h(summary.codes.join(' + ')||'Sin código verificado')}</strong><br>${h(summary.coverage)}. El código orienta el manejo de la resistencia; no autoriza usos ni significa que dos productos sean intercambiables.</p>${summary.refs.length?summary.refs.map(r=>`<section class="chemical-entry"><h3>${h(r.sfeName)} ${resistanceBadges(p,r.id)}</h3><p class="chemical-status">${h(r.fracStatus)}</p><dl class="record-grid"><div><dt>Código FRAC verificado</dt><dd>${r.fracCode?`<strong class="frac-code">${h(r.fracCode)}</strong>`:'No asignado; no equivale a NC'}</dd></div><div><dt>Nombre común de referencia</dt><dd>${h(r.canonicalName||'Sin equivalencia suficiente')}</dd></div><div><dt>Grupo de acción FRAC</dt><dd>${h(r.groupName||'Sin asignación verificada')}</dd></div><div><dt>Familia química / biológica (FRAC)</dt><dd>${h(r.chemicalGroup||'Sin asignación verificada')}</dd></div><div class="wide"><dt>Sitio / proceso de acción</dt><dd>${h(r.targetSite||'Sin asignación verificada')}${r.moaCode?` · sitio ${h(r.moaCode)}`:''}</dd></div><div class="wide"><dt>Nombre químico IUPAC · referencia PubChem</dt><dd>${r.iupacName?h(r.iupacName):'<span class="missing">No asignado, no único o no aplicable; ver estado de identidad.</span>'}</dd></div><div><dt>CAS contrastado</dt><dd>${h(r.cas||'No asignado de forma unívoca')}</dd></div><div><dt>Estado de identidad</dt><dd>${h(r.identityStatus)}</dd></div><div class="wide"><dt>Notas de correspondencia</dt><dd>${h([r.mappingNote,r.identityNote].filter(Boolean).join('\n'))}</dd></div></dl><p class="chemical-sources">${link(r.fracSource,r.fracPage?`FRAC 2026, página ${r.fracPage}`:'Lista FRAC consultada')}${r.pubchemUrl?' · '+link(r.pubchemUrl,`PubChem CID ${r.pubchemCid}`):''}</p></section>`).join(''):'<p class="hint">El SFE no informa un ingrediente que permita establecer esta correspondencia.</p>'}<p class="hint">FRAC y PubChem son referencias externas, no una certificación de la composición del formulado. No se deducen CAS/IUPAC de extractos o cepas. Los campos pendientes se conservan sin completar por analogía. ${h(meta.licenseNote)}</p></details>`;
}
function openProduct(id,trigger){
 const p=store.products.get(id);if(!p)return;
 opener=trigger;selectedProduct=p;
 const uses=p.useIds.map(uid=>store.byId.get(uid)).sort((a,b)=>C.compare(a.crop.name,b.crop.name)||C.compare(a.crop.scientific,b.crop.scientific));
 const preferred=result.matchedUses.find(u=>u.productId===id)||uses[0];selectedUseId=preferred?.id||'';detailPestKey=state.pestKey;
 $('product-content').innerHTML=`<header class="modal-header"><div><p class="eyebrow">FICHA DEL PRODUCTO · REGISTRO ${h(p.id)}</p><h2 id="product-title">${h(p.name)}</h2><div class="modal-resistance">${resistanceBadges(p)}</div>${p.restricted?'<span class="badge restricted">Activo · uso restringido</span>':''}</div><button id="product-close" class="icon-button" aria-label="Cerrar ficha">${svg('close')}</button></header><div class="detail-body">${uses.length?`<div class="detail-selects"><div class="field"><label for="dialog-crop">Cultivo · nombre común y científico</label><select id="dialog-crop">${uses.map((u,i)=>`<option value="${h(u.id)}">${h(u.crop.name)} · ${h(u.crop.scientific)}${uses.filter(v=>v.cropId===u.cropId).length>1?` · ficha ${i+1}`:''}</option>`).join('')}</select></div><div class="field"><label for="dialog-pest">Plaga o maleza · nombre común y científico</label><select id="dialog-pest"></select></div></div><div id="application-content"></div>`:`<div class="no-uses"><h3>Sin fichas de cultivo publicadas</h3><p>${p.typeId==='2'?'Este registro es de ingrediente activo grado técnico (IAGT), no un producto listo para aplicar. No se le atribuyen cultivos, dosis ni plagas.':'La consulta no expone fichas de cultivo para este registro. No se completan dosis o plagas de otros productos. Revisa la etiqueta o consulta al SFE.'}</p></div>`}<details class="record-details"><summary>Ver datos de registro y composición</summary><dl class="record-grid"><div><dt>Ingrediente / mezcla</dt><dd>${h(p.ingredients||'No informado')}</dd></div><div><dt>Estado en el censo</dt><dd>${h(p.status)}</dd></div><div><dt>Tipo de producto</dt><dd>${h(p.type)}</dd></div><div><dt>Tipo de formulación</dt><dd>${h(p.formulation||'No informado')}</dd></div><div><dt>Composición publicada</dt><dd>${p.composition.length?`<ul class="composition">${p.composition.map(c=>`<li>${h(c[0])}${(()=>{const mid=p.molecules.find(id=>C.norm(store.molecules.get(id).name)===C.norm(c[0]));return mid?' '+resistanceBadges(p,mid):'';})()}: ${h((p.typeId==='8'?c[4]:c[2])||'Concentración no informada')}${c[1]?` (${h(c[1])})`:''}${p.typeId==='8'?` · Orden: ${h(c[2]||'No informado')} · Familia: ${h(c[3]||'No informada')}`:''}</li>`).join('')}</ul>`:'Sin composición en el detalle de esta base.'}</dd></div><div><dt>Registrante</dt><dd>${h(p.registrant)}</dd></div><div class="wide"><dt>Clase(s) consultada(s)</dt><dd>${h(p.classes)}</dd></div><div class="wide"><dt>Observaciones del registro</dt><dd>${h(p.observations||'No informadas')}</dd></div><div class="wide"><dt>Recomendaciones transcritas de la fuente</dt><dd>${h(p.recommendations||'No recuperadas en esta base')}</dd></div></dl></details>${renderChemistry(p)}<div class="detail-actions"><a class="button secondary" href="${h(sourceUrl(p.source))}" target="_blank" rel="noopener noreferrer">Consultar fuente SFE ↗</a><button class="button secondary" id="print-product">Imprimir ficha</button></div><p class="citation">Censo: ${p.sourceRecords?.length>1?h(p.sourceRecords.map(r=>`${r.category}: ${date(r.censusDate)}`).join(' · ')):h(date(p.censusDate))}. Estado según esos cortes; no se verifica en tiempo real.<br>Datos transcritos de la consulta pública del SFE. Comprueba siempre la etiqueta vigente. Las grafías, unidades y posibles errores de origen se conservan.</p></div>`;
 $('product-close').addEventListener('click',()=>$('product-dialog').close());$('print-product').addEventListener('click',()=>window.print());
 if(uses.length){$('dialog-crop').value=selectedUseId;renderApplication();$('dialog-crop').addEventListener('change',e=>{selectedUseId=e.target.value;renderApplication();});$('dialog-pest').addEventListener('change',e=>{detailPestKey=e.target.value;renderApplication();});}
 $('product-dialog').showModal();$('product-dialog').scrollTop=0;$('product-close').focus();
}
function exportCsv(){
 const rows=C.exportRows(result,state.view),blob=new Blob([C.csv(rows,state.view==='uses'?C.CSV_FIELDS:undefined)],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`sfe_${state.view==='uses'?'usos':'inventario'}_filtrados_${data.meta.censusDate.slice(0,10)}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
 notify(`${fmt(rows.length)} ${state.view==='uses'?'filas producto–cultivo–plaga':'registros'} exportados. Incluye todos los resultados filtrados, no solo esta página.`);
}
function initMethod(){
 const m=data.meta;
 $('method-content').innerHTML=`<h3>Base documental del ${h(date(m.censusDate))}</h3><p>${h(m.scope)} La app conserva ${fmt(m.totals.inventory)} registros que figuraban activos y ${fmt(m.totals.productsWithUses)} con fichas de cultivo: ${fmt(m.totals.uses)} fichas y ${fmt(m.totals.rows)} filas producto–cultivo–plaga.</p><p><a href="${h(sourceUrl(m.source))}" target="_blank" rel="noopener noreferrer">Consulta oficial del SFE ↗</a></p><h3>Cómo usar esta pantalla</h3><p>Las únicas entradas principales son Molécula y Nombre comercial. Puedes escribir parte del nombre o elegir una sugerencia. Los filtros se combinan. Cultivo y Plaga son listas desplegables dentro de la sección cerrada «Cultivo y plaga».</p><p>Cada producto aparece una sola vez. «Ver ficha» muestra los cultivos, plagas y datos de aplicación de ese registro. Elegir una plaga no modifica la dosis del cultivo. Los datos de registro y composición quedan en otra sección desplegable.</p><h3>Cobertura y restricciones</h3><p>El catálogo de cultivo usa pares de nombre común + científico, incluidas categorías generales y «NO APLICA» cuando así figura. No se normalizan sinónimos químicos ni se deducen componentes no documentados.</p><p>Por defecto se muestran los ${fmt(m.totals.productsWithUses)} productos con usos. En Más opciones puedes elegir Fungicidas, Herbicidas o Insecticidas e incluir el inventario: ${fmt(m.totals.inventory-m.totals.productsWithUses)} activos no tienen fichas de cultivo. No se les atribuyen dosis ni cultivos. Se excluyen los registros cancelados y suspendidos. Cada ficha conserva la fecha de su propio censo.</p><p>Hay ${fmt([...store.products.values()].filter(p=>p.restricted&&p.useIds.length).length)} registros de uso restringido con usos publicados y ${fmt([...store.products.values()].filter(p=>p.restricted).length)} en el inventario. Se identifican con una advertencia. Sin marca de uso restringido no equivale a ausencia de otras limitaciones; consulta las observaciones y la etiqueta.</p><h3>Interpretación de los datos</h3><ul><li>La dosis es del producto formulado y del cultivo, no del ingrediente puro.</li><li>Las plagas se publican en una lista separada; no se infiere una dosis diferencial para cada una.</li><li>«Sin dato publicado» significa vacío, ausente o guion en la fuente; no significa cero ni autorizado. N/A y expresiones semejantes se transcriben sin reinterpretación.</li><li>Hay ${fmt(store.uses.filter(u=>C.missing(u.dose)).length)} fichas sin dosis, ${fmt(store.uses.filter(u=>C.missing(u.volumeGround)).length)} sin volumen terrestre y ${fmt(store.uses.filter(u=>C.missing(u.interval)).length)} sin intervalo informado.</li><li>Se conservan nombres, concentraciones y unidades, incluso si parecen incorrectos.</li></ul><h3>Herbicidas y asociación con el cultivo</h3><p>Cuando la fuente herbicida está completa y validada se integra en esta misma base. Cada ficha conserva el producto, cultivo común/científico, malezas publicadas y dosis de ese registro. Los herbicidas sin ficha de cultivo quedan separados; no se inventan asociaciones. La clasificación HRAC se conserva por ingrediente, sin sustituirla por FRAC. La lista maestra HRAC 2026 aporta el código numérico, la letra histórica, el modo de acción, la familia y la fila de fuente; las correspondencias no confirmadas quedan pendientes. El código 0 es una clasificación explícita de modo de acción desconocido y 4/29 es una clasificación dual de una sustancia, no dos ingredientes.</p><h3>Insecticidas e IRAC</h3><p>Los insecticidas se consultaron sin filtro de cultivo o tipo, incluidas las clases combinadas que contienen insecticida. Cada registro conserva los cultivos, plagas y dosis publicados. IRAC se muestra por ingrediente con el código completo y su subgrupo, separado de FRAC y HRAC. Se usa el esquema oficial IRAC 11.5, febrero de 2026, con página de fuente y fila de la tabla en línea. UN y sus variantes son clasificaciones explícitas, no una sustitución de datos pendientes. Las cepas no verificadas y los compuestos no localizados quedan sin código; los depredadores y parasitoides se identifican fuera del alcance IRAC. Un registro compartido entre censos aparece una sola vez y conserva las categorías y fechas de sus consultas.</p><h3>Grupo FRAC e identidad química · fungicidas</h3><p>Dentro de la ficha hay una sección cerrada con el código FRAC 2026, el grupo de acción, la familia química/biológica y las referencias IUPAC/CAS de PubChem. Se conservan por ingrediente y por componente de mezcla. Una identidad de referencia no demuestra la composición, pureza o forma química exacta del formulado.</p><p>Las equivalencias se revisaron contra la tabla oficial de FRAC actualizada en mayo de 2026. Un compuesto no localizado no recibe automáticamente el código NC. Las cepas no verificadas no heredan BM02 por pertenecer al mismo género. Cobre genérico, sales no especificadas, extractos y materiales complejos pueden tener FRAC confirmado sin un IUPAC o CAS único.</p><p>El CSV incluye códigos verificados, cobertura y un campo JSON con el detalle por ingrediente, estados y fuentes. Si una mezcla tiene componentes pendientes, su cobertura se marca parcial.</p><h3>Sin actualización automática</h3><p>La base es una fotografía documental, no una certificación de exhaustividad nacional ni una recomendación de aplicación. Se cotejaron los campos con sus HTML y se conciliaron los registros; esto no verifica su vigencia jurídica actual. Revisa siempre el registro y la etiqueta autorizada.</p><h3>Privacidad y exportación</h3><p>La búsqueda se procesa en tu navegador, sin cuentas, analítica o consultas externas. Los filtros se pueden compartir en el fragmento # de la dirección. El CSV descarga todos los resultados filtrados y protege frente a fórmulas de hoja de cálculo. Si incluyes el inventario, exporta una fila por registro; en otro caso, una fila por producto–cultivo–plaga.</p><details><summary>Integridad de los CSV de origen (SHA-256)</summary><pre>${h(Object.entries(m.sourceHashes).map(([name,hash])=>`${name}\n${hash}`).join('\n\n'))}</pre></details>`;
 $('method-open').addEventListener('click',()=>$('method-dialog').showModal());$('method-close').addEventListener('click',()=>$('method-dialog').close());
}
function restore(){
 const params=new URLSearchParams(location.hash.slice(1));
 for(const k of ['moleculeText','commercial'])if(params.get(k))state[k]=params.get(k).slice(0,300);
 // Compatibilidad con enlaces de la interfaz anterior.
 if(!state.moleculeText&&store.molecules.has(params.get('molecule')))state.moleculeText=store.molecules.get(params.get('molecule')).name;
 if(store.crops.has(params.get('crop')))state.crop=params.get('crop');
 if(allPests.has(params.get('pestKey')))state.pestKey=params.get('pestKey');
 if(['1','2','3','4','8'].includes(params.get('type')))state.type=params.get('type');
 if(['regular','restricted'].includes(params.get('status')))state.status=params.get('status');
 if(['fungicida','herbicida','insecticida'].includes(params.get('category')))state.category=params.get('category');
 if(params.get('view')==='inventory')state.view='inventory';
 state.browse=params.get('browse')==='1';
 $('molecule-input').value=state.moleculeText;$('commercial-input').value=state.commercial;$('type-filter').value=state.type;$('status-filter').value=state.status;$('category-filter').value=state.category;$('include-inventory').checked=state.view==='inventory';
 if(state.crop||state.pestKey||state.type||state.status||state.category||state.view==='inventory')setExtraOpen(true);
 if(state.type||state.status||state.category||state.view==='inventory')document.querySelector('.more-options').open=true;
}
// El diseño se adapta solo mediante CSS, sin leer preferencias guardadas.
// Retirar también el selector si llega una copia anterior del HTML en caché.
document.querySelector('.layout-toolbar')?.remove();
initAutocomplete();
for(const [id,key]of [['crop-filter','crop'],['pest-filter','pestKey'],['type-filter','type'],['status-filter','status'],['category-filter','category']])$(id).addEventListener('change',e=>{clearTimeout(timer);state[key]=e.target.value;state.page=1;render();});
$('include-inventory').addEventListener('change',e=>{clearTimeout(timer);state.view=e.target.checked?'inventory':'uses';state.page=1;render();});
$('filters-toggle').addEventListener('click',()=>setExtraOpen($('extra-filters').hidden));
$('browse-all').addEventListener('click',()=>{state.browse=true;state.page=1;render();});
for(const id of ['clear-filters','empty-reset'])$(id).addEventListener('click',reset);
$('page-prev').addEventListener('click',()=>{state.page--;render();});$('page-next').addEventListener('click',()=>{state.page++;render();});
$('product-list').addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b)openProduct(b.dataset.product,b);});
$('export-csv').addEventListener('click',()=>{clearTimeout(timer);render();exportCsv();});
$('product-dialog').addEventListener('close',()=>{selectedProduct=null;if(opener?.isConnected)opener.focus({preventScroll:true});});
for(const id of ['product-dialog','method-dialog'])$(id).addEventListener('click',e=>{if(e.target!==$(id))return;const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();});
$('cutoff-date').textContent=[...new Set((data.meta.censusDates||[data.meta.censusDate]).map(date))].join(' / ');restore();initMethod();render();
window.FitoConsulta=Object.freeze({getState:()=>({...state}),totals:Object.freeze({...data.meta.totals})});
})();
