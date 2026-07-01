/* ===================== Utilidades ===================== */
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
const uid = () => crypto.randomUUID();
const todayStr = () => new Date().toISOString().slice(0,10);

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(dateStr){
  if(!dateStr) return '—';
  const parts = dateStr.split('-').map(Number);
  if(parts.length<3 || parts.some(isNaN)) return dateStr;
  const [y,m,d] = parts;
  return new Date(Date.UTC(y,m-1,d)).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
}
function daysFromToday(dateStr){
  if(!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if(parts.length<3 || parts.some(isNaN)) return null;
  const [y,m,d] = parts;
  const target = Date.UTC(y,m-1,d);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - todayUTC) / 86400000);
}
function csvEscape(v){
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
function toCSV(rows, headers){
  const head = headers.map(h=>csvEscape(h.label)).join(',');
  const body = rows.map(r => headers.map(h => csvEscape(typeof h.value==='function' ? h.value(r) : r[h.value])).join(',')).join('\n');
  return head + '\n' + body;
}
function downloadFile(filename, content, mime='text/plain'){
  const blob = new Blob([content], {type: mime+';charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ===================== Catálogo de Registros Sanitarios POR CLIENTE =====================
   No hay datos precargados. Cada cliente trae su propia base de RS desde un Google Sheet
   publicado en CSV (ver state.droguerias[].rsCsvUrl y state.registrosPorCliente[clienteId]). */
function catalogDisplay(e){ return e.modelo ? `${e.producto} — ${e.modelo}` : (e.producto||''); }
function getClienteRS(clienteId){
  if(!clienteId) return [];
  return state.registrosPorCliente?.[clienteId] || [];
}
function clienteRsMap(clienteId){
  const list = getClienteRS(clienteId);
  return new Map(list.map(e => [catalogDisplay({producto:e.producto, modelo:e.modelo}).toUpperCase(), e]));
}
function clienteSelectorHtml(name, selectedId){
  const opts = state.droguerias.map(c=>`<option value="${c.id}" ${c.id===selectedId?'selected':''}>${escapeHtml(c.nombre||'')}</option>`).join('');
  return `<select name="${name}" class="cliente-rs-select" onchange="App.onClienteRsChange(this)" required>
    <option value="">— Selecciona un cliente —</option>${opts}
  </select>`;
}
function clienteLockedHtml(name){
  const ca = drogueriaActiva();
  return `<input type="hidden" name="${name}" value="${ca?.id||''}">
    <input type="text" value="${escapeHtml(ca?.nombre||'')}" disabled style="opacity:.75;">`;
}
function onClienteRsChange(sel){
  // Vuelve a renderizar los ítems con el catálogo del cliente recién elegido
  const form = sel.closest('form');
  if(!form) return;
  form.dataset.clienteId = sel.value;
}
function onProductoAutofill(el){
  const row = el.closest('.item-row');
  const form = el.closest('form');
  const clienteId = form?.dataset.clienteId || '';
  const entry = clienteRsMap(clienteId).get(el.value.trim().toUpperCase());
  if(!entry) return;
  const scope = row || form;
  if(!scope) return;
  const rsField = scope.querySelector('[name="rs[]"], [name="registroSanitario"]');
  if(rsField) rsField.value = entry.numero || '';
}
function toggleCatalogo(cb){
  const row = cb.closest('.item-row');
  if(!row) return;
  const selWrap = row.querySelector('.catalog-sel-wrap');
  const prodInput = row.querySelector('.producto-manual');
  if(!selWrap || !prodInput) return;
  if(cb.checked){
    selWrap.hidden = false;
    prodInput.style.display = 'none';
    prodInput.removeAttribute('required');
    const searchIn = selWrap.querySelector('.catalog-search-input');
    if(searchIn) searchIn.focus();
  } else {
    selWrap.hidden = true;
    const dd = selWrap.querySelector('.catalog-dropdown');
    if(dd) dd.classList.remove('open');
    prodInput.style.display = '';
    prodInput.setAttribute('required','');
    prodInput.value = '';
    const rsField = row.querySelector('[name="rs[]"]');
    if(rsField) rsField.value = '';
  }
}
function filterCatalog(input){
  const q = input.value.trim().toLowerCase();
  const dd = input.nextElementSibling;
  if(!dd) return;
  const form = input.closest('form');
  const clienteId = form?.dataset.clienteId || '';
  const catalog = getClienteRS(clienteId);
  if(!clienteId){
    dd.innerHTML = '<div class="catalog-no-results">Selecciona primero un cliente para buscar en su Registro Sanitario</div>';
    dd.classList.add('open'); return;
  }
  if(q.length < 2){ dd.classList.remove('open'); dd.innerHTML=''; return; }
  const matches = catalog.filter(e =>
    (e.producto||'').toLowerCase().includes(q) || (e.modelo||'').toLowerCase().includes(q) || (e.titular||'').toLowerCase().includes(q)
  ).slice(0,18);
  if(!matches.length){
    dd.innerHTML = '<div class="catalog-no-results">Sin coincidencias en el RS de este cliente</div>';
    dd.classList.add('open'); return;
  }
  dd.innerHTML = matches.map(e => {
    const display = escapeHtml(catalogDisplay({producto:e.producto, modelo:e.modelo}));
    const rs = escapeHtml(e.numero||'');
    return `<div class="catalog-option" tabindex="0"
      onmousedown="App.selectCatalogItem(this,'${display.replace(/'/g,"\'")}','${rs}')"
      onkeydown="if(event.key==='Enter')App.selectCatalogItem(this,'${display.replace(/'/g,"\'")}','${rs}')">
      <span class="catalog-option-name">${display}</span>
      <span class="catalog-option-rs">${rs}</span>
    </div>`;
  }).join('');
  dd.classList.add('open');
}
function selectCatalogItem(el, displayName, rs){
  const dd = el.closest('.catalog-dropdown');
  const wrap = el.closest('.catalog-search-wrap');
  if(!wrap) return;
  const searchInput = wrap.querySelector('.catalog-search-input');
  if(searchInput) searchInput.value = displayName;
  if(dd){ dd.classList.remove('open'); dd.innerHTML=''; }
  const row = wrap.closest('.item-row');
  if(!row) return;
  const prodInput = row.querySelector('.producto-manual');
  const rsField = row.querySelector('[name="rs[]"]');
  if(prodInput) prodInput.value = displayName;
  if(rsField) rsField.value = rs;
}
function toggleStockSel(cb){
  const row = cb.closest('.item-row');
  if(!row) return;
  const stockWrap = row.querySelector('.stock-sel-wrap');
  const catalogWrap = row.querySelector('.catalog-sel-wrap');
  const prodInput = row.querySelector('.producto-manual');
  if(cb.checked){
    if(stockWrap) stockWrap.hidden = false;
    if(catalogWrap) catalogWrap.hidden = true;
    if(prodInput){ prodInput.style.display='none'; prodInput.removeAttribute('required'); }
  } else {
    if(stockWrap) stockWrap.hidden = true;
    if(catalogWrap) catalogWrap.hidden = false;
    if(prodInput){ prodInput.style.display=''; prodInput.setAttribute('required',''); prodInput.value=''; }
  }
}
function onStockSelect(sel){
  const row = sel.closest('.item-row');
  if(!row || !sel.value) return;
  const opt = sel.options[sel.selectedIndex];
  const loteKey = sel.value;
  // find most recent ingreso for this lot to get RS + proveedor
  const ref = state.movimientos.filter(m => m.tipo==='ingreso' && (m.loteSerie||m.producto||'(sin identificar)')===loteKey);
  const lastIn = ref.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''))[0] || {};
  const prodInput = row.querySelector('.producto-manual');
  const loteField = row.querySelector('[name="lote[]"]');
  const rsField = row.querySelector('[name="rs[]"]');
  const cantField = row.querySelector('[name="cantidad[]"]');
  if(prodInput) prodInput.value = opt.dataset.p || lastIn.producto || '';
  if(loteField) loteField.value = opt.dataset.l || lastIn.loteSerie || '';
  if(rsField) rsField.value = lastIn.registroSanitario || '';
  // pre-fill proveedor in the parent form
  const form = row.closest('form');
  if(form){
    const provField = form.querySelector('[name="proveedor"]');
    if(provField && !provField.value) provField.value = lastIn.proveedor || '';
  }
  const saldo = Number(opt.dataset.s)||0;
  if(cantField){ cantField.placeholder = `Máx. ${saldo}`; cantField.max = saldo; }
}
function onCatalogoSelect(sel){ /* legacy — no longer used in new item rows */ }


/* ===================== Estado ===================== */
let state = { movimientos: [], registrosPorCliente: {}, config: {}, proveedores: [], droguerias: [], contactos: [], view: 'dashboard', filtro: '', filtroClienteRS: '', drogueriaActivaId: localStorage.getItem('dm_bpa_drogueria_activa') || '' };

/* ===================== Cliente activo (dashboard de selección) ===================== */
function drogueriaActiva(){ return state.droguerias.find(c=>c.id===state.drogueriaActivaId) || null; }
function movsCliente(){
  if(!state.drogueriaActivaId) return state.movimientos;
  return state.movimientos.filter(m=>m.clienteId===state.drogueriaActivaId);
}
function setDrogueriaActiva(id){
  if(!id || !state.droguerias.find(c=>c.id===id)){ showToast('Cliente no encontrado.', 'bad'); return; }
  state.drogueriaActivaId = id;
  localStorage.setItem('dm_bpa_drogueria_activa', id);
  state.filtroClienteRS = id;
  state.filtro = '';
  state.view = 'dashboard';
  render();
}
function cambiarDrogueria(){
  state.drogueriaActivaId = '';
  localStorage.removeItem('dm_bpa_drogueria_activa');
  state.filtro = '';
  state.view = 'dashboard';
  render();
}
function renderSelectorDroguerias(){
  const q = (state.filtro||'').toLowerCase();
  let rows = [...state.droguerias];
  if(q) rows = rows.filter(c=>[c.nombre,c.razonSocial].join(' ').toLowerCase().includes(q));
  rows.sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  return `
    <div class="client-gate">
      <div class="view-head">
        <div class="vhl"><h1>Selecciona un cliente</h1><span class="subtitle">Elige el cliente con el que vas a trabajar. Sus ingresos, salidas y registros sanitarios se guardan por separado.</span></div>
        <div class="vha">
          <input class="search" placeholder="Buscar cliente..." value="${escapeHtml(state.filtro||'')}" oninput="App.setFiltro(this.value)">
          <button class="btn btn-primary" onclick="App.openDrogueriaModal()">+ Nuevo cliente</button>
        </div>
      </div>
      ${rows.length===0
        ? '<p class="empty">Aún no tienes clientes registrados. Crea el primero para empezar a registrar ingresos, salidas y sus registros sanitarios.</p>'
        : `<div class="client-grid">${rows.map(c=>{
            const rsCount = getClienteRS(c.id).length;
            const movCount = state.movimientos.filter(m=>m.clienteId===c.id).length;
            return `<div class="client-card" onclick="App.setDrogueriaActiva('${c.id}')">
              <h3>${escapeHtml(c.nombre||'')}</h3>
              ${c.razonSocial?`<p class="client-card-sub">${escapeHtml(c.razonSocial)}</p>`:''}
              <p class="client-card-meta">${rsCount} RS &middot; ${movCount} movimiento(s)</p>
              <div class="client-card-actions">
                <button class="btn btn-primary" onclick="event.stopPropagation();App.setDrogueriaActiva('${c.id}')">Seleccionar</button>
                <button class="link" onclick="event.stopPropagation();App.openDrogueriaModal('${c.id}')">Editar</button>
              </div>
            </div>`;
          }).join('')}</div>`}
    </div>`;
}

async function loadState(){
  // Firebase-only: state is populated via Firestore listeners (setupFsListeners)
  // This function is now a no-op; left for compatibility with exportBackup etc.
}
async function saveMovimiento(m){
  m.actualizadoEn = new Date().toISOString();
  const i = state.movimientos.findIndex(x => x.id===m.id);
  if(i>-1) state.movimientos[i]=m; else state.movimientos.push(m);
  if(currentFbUser){ fsPut('movimientos', m).catch(e=>handleFsError(e)); }
}
async function deleteMovimiento(id){
  state.movimientos = state.movimientos.filter(x => x.id!==id);
  if(currentFbUser){ fsDelete('movimientos', id).catch(e=>handleFsError(e)); }
}

/* ===================== Cálculos ===================== */
function groupStock(movs){
  const map = {};
  movs.forEach(m => {
    const key = m.loteSerie || m.producto || '(sin identificar)';
    if(!map[key]) map[key] = {producto:m.producto, loteSerie:m.loteSerie, ingresado:0, despachado:0};
    if(m.tipo==='ingreso') map[key].ingresado += Number(m.cantidad)||0;
    else map[key].despachado += Number(m.cantidad)||0;
  });
  Object.values(map).forEach(s => s.saldo = s.ingresado - s.despachado);
  return map;
}
function calcKPIs(movs){
  const ingresos = movs.filter(m => m.tipo==='ingreso');
  const salidas = movs.filter(m => m.tipo==='salida');
  const totalIngresos = ingresos.reduce((a,m)=>a+(Number(m.cantidad)||0), 0);
  const totalSalidas = salidas.reduce((a,m)=>a+(Number(m.cantidad)||0), 0);
  const stock = groupStock(movs);
  const pendientes = Object.values(stock).reduce((a,s)=>a+Math.max(s.saldo,0), 0);
  const faltantesStock = Object.values(stock).filter(s=>s.saldo<0).length;
  const faltantesManual = movs.filter(m=>m.faltante).length;
  const cuarentena = ingresos.filter(m=>m.estadoLote==='Cuarentena').length;
  return { totalIngresos, totalSalidas, pendientes, faltantes: faltantesStock + faltantesManual, cuarentena };
}
function computeAlerts(){
  if(!state.drogueriaActivaId) return [];
  const alerts = [];
  const threshold = state.config.alertaDiasRS ?? 90;
  (state.registrosPorCliente?.[state.drogueriaActivaId]||[]).forEach(r => {
    const dd = daysFromToday(r.fechaVencimiento);
    if(dd===null) return;
    if(dd<0) alerts.push({msg:`RS ${r.numero} (${r.producto}) venció hace ${Math.abs(dd)} días`, sev:'bad'});
    else if(dd<=threshold) alerts.push({msg:`RS ${r.numero} (${r.producto}) vence en ${dd} días`, sev:'warn'});
  });
  const movs = movsCliente();
  // ponytail: 3 días de cuarentena como umbral mínimo de alerta
  movs.filter(m=>m.tipo==='ingreso' && m.estadoLote==='Cuarentena').forEach(m => {
    const dd = daysFromToday(m.fecha);
    if(dd!==null && dd<=-3) alerts.push({msg:`Lote ${m.loteSerie||'s/n'} (${m.producto}) en cuarentena hace ${Math.abs(dd)} días`, sev:'warn'});
  });
  Object.values(groupStock(movs)).forEach(s => {
    if(s.saldo<0) alerts.push({msg:`Lote ${s.loteSerie||'s/n'} (${s.producto}): salida supera ingreso por ${Math.abs(s.saldo)}`, sev:'bad'});
  });
  movs.filter(m=>m.faltante).forEach(m => {
    alerts.push({msg:`Discrepancia reportada: ${m.producto} (lote ${m.loteSerie||'s/n'})`, sev:'bad'});
  });
  return alerts;
}

/* ===================== UI helpers ===================== */
function showToast(msg, type='ok'){
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $('#toast-root').appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 300); }, 4500);
}
function openModal(title, bodyHtml){
  $('#modal-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) App.closeModal()">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="modal-head"><h2>${escapeHtml(title)}</h2><button class="icon-btn" onclick="App.closeModal()" aria-label="Cerrar">✕</button></header>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    </div>`;
}
function closeModal(){ $('#modal-root').innerHTML = ''; }
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

function stampHtml(estado){
  if(!estado) return '';
  const map = {Cuarentena:'cuarentena', Liberado:'liberado', Rechazado:'rechazado'};
  return `<span class="stamp stamp--${map[estado]||'cuarentena'}">${escapeHtml(estado)}</span>`;
}
function rsEstadoBadge(r){
  const dd = daysFromToday(r.fechaVencimiento);
  if(dd===null) return '<span class="badge">Sin fecha</span>';
  if(dd<0) return '<span class="badge badge-bad">Vencido</span>';
  const threshold = state.config.alertaDiasRS ?? 90;
  if(dd<=threshold) return `<span class="badge badge-warn">Por vencer (${dd} d)</span>`;
  return '<span class="badge badge-ok">Vigente</span>';
}

/* ===================== Vistas ===================== */
function setView(v){ state.view=v; state.filtro=''; render(); }
function setFiltro(v){
  const hadFocus = document.activeElement?.classList?.contains('search');
  state.filtro = v;
  render();
  if(hadFocus){
    const el = $('#view-root .search');
    if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
}

function renderDashboard(){
  const movs = movsCliente();
  const ca = drogueriaActiva();
  const k = calcKPIs(movs);
  const alerts = computeAlerts();
  const recent = [...movs].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).slice(0,8);
  return `
    <div class="view-head">
      <div class="vhl">
        <h1>Panel</h1>
        <span class="subtitle">${ca?escapeHtml(ca.nombre)+' · ':''}BPA · Control de importación de dispositivos médicos</span>
      </div>
    </div>
    <div class="kpi-strip">
      <div class="kpi-item"><span class="kpi-label">Total ingresado</span><span class="kpi-value">${k.totalIngresos}</span></div>
      <div class="kpi-item"><span class="kpi-label">Total despachado</span><span class="kpi-value">${k.totalSalidas}</span></div>
      <div class="kpi-item"><span class="kpi-label">Stock pendiente</span><span class="kpi-value">${k.pendientes}</span></div>
      <div class="kpi-item"><span class="kpi-label">En cuarentena</span><span class="kpi-value">${k.cuarentena}</span></div>
      <div class="kpi-item ${k.faltantes>0?'kpi-bad':''}"><span class="kpi-label">Discrepancias</span><span class="kpi-value">${k.faltantes}</span></div>
    </div>
    <div class="dash-grid">
      <div>
        <span class="dash-col-title">Alertas (${alerts.length})</span>
        ${alerts.length===0
          ? '<p style="font-size:.8rem;color:var(--ink-2);opacity:.6;padding:.5rem 0;">Sin alertas activas.</p>'
          : `<ul class="alert-list">${alerts.map(a=>`<li class="alert alert-${a.sev}"><span class="alert-dot"></span><span>${escapeHtml(a.msg)}</span></li>`).join('')}</ul>`}
      </div>
      <div>
        <span class="dash-col-title">Movimientos recientes</span>
        ${recent.length===0
          ? '<p style="font-size:.8rem;color:var(--ink-2);opacity:.6;padding:.5rem 0;">Sin movimientos.</p>'
          : `<div class="table-scroll"><table class="data-table compact"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Lote</th><th>Cant.</th></tr></thead>
             <tbody>${recent.map(m=>`<tr><td data-label="Fecha">${fmtDate(m.fecha)}</td><td data-label="Tipo">${m.tipo==='ingreso'?'Ingreso':'Salida'}</td><td data-label="Producto">${escapeHtml(m.producto||'')}</td><td class="mono" data-label="Lote">${escapeHtml(m.loteSerie||'—')}</td><td data-label="Cant.">${m.cantidad}</td></tr>`).join('')}</tbody></table></div>`}
      </div>
    </div>`;
}

function renderIngresos(){
  const q = (state.filtro||'').toLowerCase();
  let rows = movsCliente().filter(m=>m.tipo==='ingreso');
  if(q) rows = rows.filter(m => [m.producto,m.proveedor,m.loteSerie,m.registroSanitario,m.dua].join(' ').toLowerCase().includes(q));
  rows = [...rows].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  return `
    <div class="view-head">
      <div class="vhl"><h1>Ingresos</h1><span class="subtitle">Recepción de dispositivos médicos</span></div>
      <div class="vha">
        <input class="search" placeholder="Buscar producto, proveedor, lote, RS, DUA..." value="${escapeHtml(state.filtro||'')}" oninput="App.setFiltro(this.value)">
        <button class="btn btn-primary" onclick="App.openIngresoModal()">+ Nuevo ingreso</button>
      </div>
    </div>
    ${rows.length===0
      ? '<p class="empty">No hay ingresos registrados para este cliente. Cada ítem recibido entra primero a Cuarentena hasta la validación del Director Técnico.</p>'
      : `<div class="table-scroll"><table class="data-table">
          <thead><tr><th>Fecha</th><th>DUA</th><th>Proveedor</th><th>Producto</th><th>RS</th><th>Lote/Serie</th><th>Cant.</th><th>Inspección</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows.map(m=>`<tr>
            <td data-label="Fecha">${fmtDate(m.fecha)}</td><td class="mono" data-label="DUA">${escapeHtml(m.dua||'—')} ${m.driveFolderId?`<a href="https://drive.google.com/drive/folders/${m.driveFolderId}" target="_blank" rel="noopener" title="Carpeta de Drive de este ingreso">📁</a>`:''}${m.duaFileId||m.guiaFileId||m.invoiceFileId?' 📎':''}</td><td data-label="Proveedor">${escapeHtml(m.proveedor||'')}</td>
            <td data-label="Producto">${escapeHtml(m.producto||'')}</td><td class="mono" data-label="RS">${escapeHtml(m.registroSanitario||'—')}</td>
            <td class="mono" data-label="Lote/Serie">${escapeHtml(m.loteSerie||'—')}</td><td data-label="Cant.">${m.cantidad} ${escapeHtml(m.unidad||'')}</td>
            <td data-label="Inspección">${escapeHtml(m.estadoInspeccion||'Pendiente')}</td><td data-label="Estado">${stampHtml(m.estadoLote)}</td>
            <td class="row-actions">
              ${m.estadoLote==='Cuarentena'?`<button class="link" onclick="App.openLiberarModal('${m.id}','Liberado')">Liberar</button><button class="link bad" onclick="App.openLiberarModal('${m.id}','Rechazado')">Rechazar</button>`:''}
              <button class="link" onclick="App.openEditMovModal('${m.id}')">Editar</button>
              <button class="link bad" onclick="App.removeMov('${m.id}')">Eliminar</button>
            </td>
          </tr>`).join('')}</tbody>
        </table>`}`;
}

function renderSalidas(){
  const q = (state.filtro||'').toLowerCase();
  let rows = movsCliente().filter(m=>m.tipo==='salida');
  if(q) rows = rows.filter(m => [m.producto,m.proveedor,m.loteSerie,m.registroSanitario,m.oc,m.po].join(' ').toLowerCase().includes(q));
  rows = [...rows].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  return `
    <div class="view-head">
      <div class="vhl"><h1>Salidas</h1><span class="subtitle">Despacho de dispositivos médicos</span></div>
      <div class="vha">
        <input class="search" placeholder="Buscar producto, proveedor, lote, RS, OC/PO..." value="${escapeHtml(state.filtro||'')}" oninput="App.setFiltro(this.value)">
        <button class="btn btn-primary" onclick="App.openSalidaModal()">+ Nueva salida</button>
      </div>
    </div>
    ${rows.length===0
      ? '<p class="empty">No hay salidas registradas.</p>'
      : `<div class="table-scroll"><table class="data-table">
          <thead><tr><th>Fecha</th><th>OC/PO</th><th>Proveedor</th><th>Producto</th><th>RS</th><th>Lote/Serie</th><th>Cant.</th><th>Destino</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows.map(m=>`<tr>
            <td data-label="Fecha">${fmtDate(m.fecha)}</td><td class="mono" data-label="OC/PO">${escapeHtml([m.oc,m.po].filter(Boolean).join(' / ')||'—')}</td>
            <td data-label="Proveedor">${escapeHtml(m.proveedor||'')}</td><td data-label="Producto">${escapeHtml(m.producto||'')}</td>
            <td class="mono" data-label="RS">${escapeHtml(m.registroSanitario||'—')}</td><td class="mono" data-label="Lote/Serie">${escapeHtml(m.loteSerie||'—')}</td>
            <td data-label="Cant.">${m.cantidad} ${escapeHtml(m.unidad||'')}</td><td data-label="Destino">${escapeHtml(m.destinoFinal||'—')}</td>
            <td data-label="Estado">${m.faltante?'<span class="badge badge-bad">Discrepancia</span>':'<span class="badge badge-ok">OK</span>'}</td>
            <td class="row-actions"><button class="link" onclick="App.openEditMovModal('${m.id}')">Editar</button><button class="link bad" onclick="App.removeMov('${m.id}')">Eliminar</button></td>
          </tr>`).join('')}</tbody>
        </table>`}`;
}


/* ── Clientes / Proveedores (contactos de la droguería activa) ── */
function contactosActivos(tipo){
  let rows = state.contactos.filter(c=>c.drogueriaId===state.drogueriaActivaId);
  if(tipo) rows = rows.filter(c=>c.tipo===tipo);
  return rows;
}
function renderContactos(){
  const q=(state.filtro||'').toLowerCase();
  let rows=contactosActivos();
  if(q) rows=rows.filter(c=>[c.nombre,c.razonSocial,c.ruc,c.direccion].join(' ').toLowerCase().includes(q));
  rows.sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  return `
    <div class="view-head">
      <div class="vhl"><h1>Clientes/Proveedores</h1><span class="subtitle">Instituciones destino (clientes) y proveedores de equipos de esta droguería</span></div>
      <div class="vha">
        <input class="search" placeholder="Buscar..." value="${escapeHtml(state.filtro||'')}" oninput="App.setFiltro(this.value)">
        <button class="btn btn-primary" onclick="App.openContactoTipoModal()">+ Nuevo C/P</button>
      </div>
    </div>
    ${rows.length===0?'<p class="empty">Sin clientes ni proveedores registrados todavía. Agrega uno para usarlo al autocompletar ingresos y salidas.</p>':`
    <table class="data-table"><thead><tr><th>Tipo</th><th>Nombre / Alias</th><th>Razón social</th><th>RUC</th><th>Dirección</th><th></th></tr></thead>
    <tbody>${rows.map(c=>`<tr>
      <td data-label="Tipo">${c.tipo==='cliente'?'<span class="badge badge-ok">Cliente</span>':'<span class="badge">Proveedor</span>'}</td>
      <td data-label="Nombre / Alias"><strong>${escapeHtml(c.nombre||'')}</strong></td>
      <td data-label="Razón social">${escapeHtml(c.razonSocial||'')}</td>
      <td class="mono" data-label="RUC">${escapeHtml(c.ruc||'')}</td>
      <td data-label="Dirección">${escapeHtml(c.direccion||'')}</td>
      <td class="row-actions">
        <button class="link" onclick="App.openContactoModal('${c.tipo}','${c.id}')">Editar</button>
        <button class="link bad" onclick="App.deleteContacto('${c.id}')">Eliminar</button>
      </td>
    </tr>`).join('')}</tbody></table>`}`;
}
function openContactoTipoModal(){
  openModal('Nuevo Cliente / Proveedor', `
    <p class="hint">¿Qué deseas registrar?</p>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="App.openContactoModal('cliente')">Cliente (institución destino)</button>
      <button class="btn btn-primary" onclick="App.openContactoModal('proveedor')">Proveedor (origen del equipo)</button>
    </div>`);
}
function openContactoModal(tipo, id){
  const c = id ? state.contactos.find(x=>x.id===id) : {};
  const titulo = (id?'Editar ':'Nuevo ') + (tipo==='cliente'?'cliente':'proveedor');
  openModal(titulo, `
    <form onsubmit="App.submitContacto(event,'${tipo}','${id||''}')">
      <label>Nombre / Alias corto (aparece en las listas)<input name="nombre" value="${escapeHtml(c.nombre||'')}" required></label>
      <label>Razón social<input name="razonSocial" value="${escapeHtml(c.razonSocial||'')}"></label>
      <label>RUC<input name="ruc" class="mono" value="${escapeHtml(c.ruc||'')}"></label>
      <label>Dirección<textarea name="direccion" rows="2">${escapeHtml(c.direccion||'')}</textarea></label>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>`);
}
async function submitContacto(e, tipo, id){
  e.preventDefault();
  const fd = new FormData(e.target);
  const existing = id ? state.contactos.find(x=>x.id===id) : null;
  const c = {
    id: id || uid(), drogueriaId: state.drogueriaActivaId, tipo: existing?.tipo || tipo,
    nombre: fd.get('nombre'), razonSocial: fd.get('razonSocial'), ruc: fd.get('ruc'), direccion: fd.get('direccion')
  };
  const i = state.contactos.findIndex(x=>x.id===c.id);
  if(i>-1) state.contactos[i]=c; else state.contactos.push(c);
  if(currentFbUser) fsPut('contactos', c).catch(handleFsError);
  closeModal(); render(); showToast((c.tipo==='cliente'?'Cliente':'Proveedor')+' guardado.', 'ok');
}
async function deleteContacto(id){
  if(!confirm('¿Eliminar este registro?')) return;
  state.contactos = state.contactos.filter(x=>x.id!==id);
  if(currentFbUser) fsDelete('contactos', id).catch(handleFsError);
  render(); showToast('Registro eliminado.', 'warn');
}
function contactoDatalistHtml(inputId, tipo){
  const opts = contactosActivos(tipo).map(c=>`<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.razonSocial?c.nombre+' — '+c.razonSocial:c.nombre)}</option>`).join('');
  return `<datalist id="${inputId}">${opts}</datalist>`;
}
function openDrogueriaModal(id){
  const c=id?state.droguerias.find(x=>x.id===id):{};
  openModal(id?'Editar droguería':'Nueva droguería',`
    <form onsubmit="App.submitDrogueria(event,'${id||''}')">
      <label>Nombre / Alias corto (aparece en las listas)<input name="nombre" value="${escapeHtml(c.nombre||'')}" required></label>
      <label>Razón social completa<input name="razonSocial" value="${escapeHtml(c.razonSocial||'')}"></label>
      <label>Dirección<textarea name="direccion" rows="2">${escapeHtml(c.direccion||'')}</textarea></label>
      <p class="hint">Luego de guardar, podrás vincular su Google Sheet de Registros Sanitarios desde la sección "Registros Sanitarios".</p>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>`);
}
async function submitDrogueria(e,id){
  e.preventDefault();
  const fd=new FormData(e.target);
  const existing = id ? state.droguerias.find(x=>x.id===id) : null;
  const c={id:id||uid(),nombre:fd.get('nombre'),razonSocial:fd.get('razonSocial'),direccion:fd.get('direccion'),rsCsvUrl:existing?.rsCsvUrl||''};
  const i=state.droguerias.findIndex(x=>x.id===c.id);
  if(i>-1) state.droguerias[i]=c; else { state.droguerias.push(c); if(!state.registrosPorCliente[c.id]) state.registrosPorCliente[c.id]=[]; setupClienteRegistrosListener(c.id); }
  if(currentFbUser) fsPut('clientes',c).catch(handleFsError);
  closeModal(); render(); showToast('Droguería guardada.','ok');
}
async function deleteDrogueria(id){
  if(!confirm('¿Eliminar esta droguería? También se eliminará su historial de Registros Sanitarios vinculado.')) return;
  state.droguerias=state.droguerias.filter(x=>x.id!==id);
  delete state.registrosPorCliente[id];
  if(state.drogueriaActivaId===id){ state.drogueriaActivaId=''; localStorage.removeItem('dm_bpa_drogueria_activa'); }
  if(currentFbUser){
    fsDelete('clientes',id).catch(handleFsError);
    if(fbDb && currentFbUser){
      fbDb.collection('users').doc(currentFbUser.uid).collection('clientes').doc(id).collection('registros').get()
        .then(snap => { const batch = fbDb.batch(); snap.docs.forEach(d=>batch.delete(d.ref)); return batch.commit(); })
        .catch(e=>console.error('delete cliente registros', e));
    }
  }
  render(); showToast('Droguería eliminada.','warn');
}
function drogueriaDatalistHtml(inputId){
  const opts=state.droguerias.map(c=>`<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.razonSocial?c.nombre+' — '+c.razonSocial:c.nombre)}</option>`).join('');
  return `<datalist id="${inputId}">${opts}</datalist>`;
}

function renderCuarentena(){
  const rows = movsCliente().filter(m=>m.tipo==='ingreso' && m.estadoLote==='Cuarentena').sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  return `
    <div class="view-head">
      <div class="vhl"><h1>Cuarentena</h1><span class="subtitle">Pendiente de validación del Director Técnico</span></div>
    </div>
    ${rows.length===0
      ? '<p class="empty">No hay lotes en cuarentena.</p>'
      : `<div class="table-scroll"><table class="data-table">
          <thead><tr><th>Fecha ingreso</th><th>Producto</th><th>RS</th><th>Lote/Serie</th><th>Cant.</th><th>Días en cuarentena</th><th></th></tr></thead>
          <tbody>${rows.map(m=>{
            const dd = daysFromToday(m.fecha);
            return `<tr>
              <td data-label="Fecha ingreso">${fmtDate(m.fecha)}</td><td data-label="Producto">${escapeHtml(m.producto||'')}</td>
              <td class="mono" data-label="RS">${escapeHtml(m.registroSanitario||'—')}</td>
              <td class="mono" data-label="Lote/Serie">${escapeHtml(m.loteSerie||'—')}</td><td data-label="Cant.">${m.cantidad}</td>
              <td data-label="Días en cuarentena">${dd!==null?Math.abs(dd):'—'}</td>
              <td class="row-actions"><button class="link" onclick="App.openLiberarModal('${m.id}','Liberado')">Liberar</button><button class="link bad" onclick="App.openLiberarModal('${m.id}','Rechazado')">Rechazar</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>`}`;
}

function renderKardex(){
  const q = (state.filtro||'').toLowerCase();
  const movs = movsCliente();
  const stock = groupStock(movs);
  let keys = Object.keys(stock);
  if(q) keys = keys.filter(k => (stock[k].producto||'').toLowerCase().includes(q) || k.toLowerCase().includes(q));
  keys.sort((a,b)=>(stock[a].producto||'').localeCompare(stock[b].producto||''));
  return `
    <div class="view-head">
      <div class="vhl"><h1>Kardex / Trazabilidad</h1><span class="subtitle">Por lote o número de serie</span></div>
      <input class="search" placeholder="Buscar por producto o lote/serie..." value="${escapeHtml(state.filtro||'')}" oninput="App.setFiltro(this.value)">
    </div>
    ${keys.length===0?'<p class="empty">Sin movimientos registrados todavía.</p>':''}
    ${keys.map(k=>{
      const s = stock[k];
      const movsK = movs.filter(m => (m.loteSerie||m.producto||'(sin identificar)')===k).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
      let saldo = 0;
      const rows = movsK.map(m=>{
        saldo += m.tipo==='ingreso' ? (Number(m.cantidad)||0) : -(Number(m.cantidad)||0);
        return `<tr class="${m.tipo}">
          <td data-label="Fecha">${fmtDate(m.fecha)}</td><td data-label="Tipo">${m.tipo==='ingreso'?'Ingreso':'Salida'}</td>
          <td data-label="Proveedor/Ref.">${escapeHtml(m.proveedor||'')}</td><td data-label="Cant.">${m.tipo==='ingreso'?'+':'-'}${m.cantidad}</td><td data-label="Saldo">${saldo}</td>
          <td data-label="Estado">${m.tipo==='ingreso'?stampHtml(m.estadoLote):(m.faltante?'<span class="badge badge-bad">Discrepancia</span>':'')}</td>
        </tr>`;
      }).join('');
      return `<section class="kardex-card">
        <header>
          <h3>${escapeHtml(s.producto||'(sin nombre)')} <span class="mono" style="font-weight:400;opacity:.65;">${escapeHtml(k)}</span></h3>
          <div class="kardex-saldo ${s.saldo<0?'bad':''}">Saldo: ${s.saldo}</div>
        </header>
        <table class="data-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Proveedor/Ref.</th><th>Cant.</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>
      </section>`;
    }).join('')}
    ${keys.length>0?'<button class="btn" onclick="window.print()">Imprimir trazabilidad</button>':''}`;
}

function renderRegistros(){
  const selectedId = state.drogueriaActivaId;
  const cliente = state.droguerias.find(c=>c.id===selectedId);
  const q = (state.filtro||'').toLowerCase();
  let rows = getClienteRS(selectedId);
  if(q) rows = rows.filter(r => [r.numero,r.producto,r.titular].join(' ').toLowerCase().includes(q));
  rows = [...rows].sort((a,b)=>(a.fechaVencimiento||'').localeCompare(b.fechaVencimiento||''));
  const csvUrl = cliente?.rsCsvUrl || '';
  if(!cliente){
    return `
    <div class="view-head">
      <div class="vhl"><h1>Registros Sanitarios</h1><span class="subtitle">Trazabilidad por cliente</span></div>
    </div>
    <p class="empty">Selecciona un cliente para ver o cargar sus Registros Sanitarios.</p>`;
  }
  return `
    <div class="view-head">
      <div class="vhl"><h1>Registros Sanitarios</h1><span class="subtitle">${escapeHtml(cliente.nombre||'')} · sube los archivos del RS o vincula un Google Sheet</span></div>
      <div class="vha">
        <input class="search" placeholder="Buscar RS, producto, titular..." value="${escapeHtml(state.filtro||'')}" oninput="App.setFiltro(this.value)">
        <button class="btn btn-ghost" onclick="App.openRegistroModal('${selectedId}')">+ Agregar RS</button>
        <button class="btn btn-primary" onclick="App.openRsConfigModal('${selectedId}')">Vincular Sheet</button>
      </div>
    </div>
    <div style="padding:.6rem 0;border-bottom:1px solid var(--line);margin-bottom:1rem;font-size:.78rem;color:var(--ink-2);">
      ${csvUrl
        ? `Fuente Sheet: <span class="mono" style="font-size:.71rem;">${escapeHtml(csvUrl.slice(0,55))}...</span>`
        : `<span style="color:var(--warn);">Sin Google Sheet vinculado. Puedes agregar registros manualmente con su archivo adjunto.</span>`}
    </div>
    ${rows.length===0
      ? '<p class="empty">Sin registros sanitarios para este cliente todavía. Agrega uno manualmente (con su archivo PDF/imagen) o vincula su Google Sheet.</p>'
      : `<div class="table-scroll"><table class="data-table">
          <thead><tr><th>Número RS</th><th>Producto</th><th>Titular</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th>Archivo</th><th></th></tr></thead>
          <tbody>${rows.map(r=>`<tr>
            <td class="mono" data-label="Número RS">${escapeHtml(r.numero||'')}</td><td data-label="Producto">${escapeHtml(r.producto||'')}</td>
            <td data-label="Titular">${escapeHtml(r.titular||'')}</td>
            <td data-label="Emisión">${fmtDate(r.fechaEmision)}</td><td data-label="Vencimiento">${fmtDate(r.fechaVencimiento)}</td><td data-label="Estado">${rsEstadoBadge(r)}</td>
            <td data-label="Archivo">${r.archivoBase64?`<a class="link" download="${escapeHtml(r.archivoNombre||'archivo')}" href="${r.archivoBase64}">${escapeHtml(r.archivoNombre||'Ver archivo')}</a>`:'—'}</td>
            <td class="row-actions">
              <button class="link" onclick="App.openRegistroModal('${selectedId}','${r.id}')">Editar</button>
              <button class="link bad" onclick="App.removeRegistro('${selectedId}','${r.id}')">Eliminar</button>
            </td>
          </tr>`).join('')}</tbody></table></div>`}`;
}
function setFiltroClienteRS(clienteId){
  state.filtroClienteRS = clienteId;
  state.filtro = '';
  render();
}

function openRsConfigModal(clienteId){
  const cliente = state.droguerias.find(c=>c.id===clienteId);
  if(!cliente){ showToast('Selecciona un cliente primero.', 'bad'); return; }
  const url = cliente.rsCsvUrl || '';
  openModal(`Actualizar Registros Sanitarios — ${escapeHtml(cliente.nombre||'')}`,`
    <div style="margin-bottom:.75rem;">
      <p style="font-size:.82rem;font-weight:600;margin-bottom:.5rem;">¿Cómo vincular el Google Sheet de este cliente?</p>
      <ol style="font-size:.79rem;color:var(--ink-2);line-height:1.9;padding-left:1.1rem;margin:0;">
        <li>Abre el Google Sheet con la base de RS de <strong>${escapeHtml(cliente.nombre||'este cliente')}</strong>.</li>
        <li><strong>Archivo → Compartir → Publicar en la web</strong>.</li>
        <li>Selecciona la hoja → formato <strong>CSV</strong> → Publicar → Copiar URL.</li>
        <li>La primera fila debe tener: <span class="mono">numero, producto, titular, fechaEmision, fechaVencimiento</span></li>
      </ol>
    </div>
    <form onsubmit="App.fetchRsCsv(event,'${clienteId}')">
      <label>URL del CSV publicado de Google Sheets
        <input name="url" value="${escapeHtml(url)}" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" required>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Descargar y actualizar</button>
      </div>
    </form>
  `);
}

/* Parser CSV robusto: respeta comillas (incluye comas y saltos de línea dentro de campos),
   quita BOM y normaliza separadores de línea. */
function parseCsvRobust(text){
  if(text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM
  text = text.replace(/\r\n?/g, '\n');
  const rows = [];
  let row = [], cur = '', inQ = false, i = 0;
  while(i < text.length){
    const c = text[i];
    if(inQ){
      if(c === '"'){
        if(text[i+1] === '"'){ cur += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      cur += c; i++; continue;
    }
    if(c === '"'){ inQ = true; i++; continue; }
    if(c === ','){ row.push(cur); cur = ''; i++; continue; }
    if(c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
    cur += c; i++;
  }
  row.push(cur); rows.push(row);
  // descarta filas vacías al final
  while(rows.length && rows[rows.length-1].length === 1 && rows[rows.length-1][0].trim() === '') rows.pop();
  return rows;
}
/* Normaliza encabezados: minúsculas, sin tildes/diacríticos, sin espacios ni símbolos */
function normalizeHeaderKey(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]/g,''); // deja solo letras/números
}
const RS_FIELD_ALIASES = {
  numero: ['numero','nrregistro','noregistro','numeroregistro','numeroderegistro','numerorsanitario','numeroregistrosanitario','registrosanitario','rs','codigo','codigoregistro','nro','n','nderegistro','nroregistro','numerors','nrs','rsdigemid','regsan','numregsan','codrs','numrs','nroregsanitario','codregistro','id'],
  producto: ['producto','nombreproducto','descripcion','dispositivomedico','nombredelproducto','articulo','item','equipo','nombreequipo'],
  modelo: ['modelo','presentacion','version'],
  titular: ['titular','titulardelregistro','titularderegistro','empresa','razonsocial','fabricante','importador'],
  fechaEmision: ['fechaemision','emision','fechadeemision','fechaderegistro','fecharegistro','fechadeexpedicion','fechaexpedicion','fechaotorgamiento','fechadeotorgamiento','fechaderesolucion','fechainicio','fechadeinicio'],
  fechaVencimiento: ['fechavencimiento','vencimiento','fechadevencimiento','vigenciahasta','vigencia','fechacaducidad','fechadecaducidad','fechalimite','fechadelimite','fechaexpiracion','fechadeexpiracion','fechafin','fechadefin','validohasta']
};
/* Palabras clave para reconocer encabezados que no calzan exacto con ningún alias
   (ej. "Fecha de Emisión del Registro" o "N° Registro Sanitario DIGEMID") */
const RS_FIELD_FUZZY = {
  numero: ['numero','codigo','registro','rsanitario','nrs'],
  producto: ['producto','dispositivo','equipo','articulo','descripcion'],
  modelo: ['modelo','presentacion'],
  titular: ['titular','empresa','razonsocial','fabricante','importador'],
  fechaEmision: ['emision','expedicion','otorgamiento','resolucion'],
  fechaVencimiento: ['vencimiento','caducidad','vigencia','expira']
};
/* Convierte fechas en distintos formatos comunes de Sheets/Excel a ISO (YYYY-MM-DD).
   Soporta: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, "15 de marzo de 2025", "15-mar-2025"
   y número de serie de Excel/Sheets (días desde 1899-12-30). Si no reconoce el
   formato devuelve '' en vez de guardar texto no-fecha (evita romper el badge de estado). */
function normalizeFechaToISO(raw){
  const s = String(raw ?? '').trim();
  if(!s) return '';
  let m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if(m){
    const [,y,mo,d] = m;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if(m){
    let [,d,mo,y] = m;
    if(y.length===2) y = (Number(y)<50?'20':'19')+y;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const MESES = {enero:1,ene:1,febrero:2,feb:2,marzo:3,mar:3,abril:4,abr:4,mayo:5,may:5,junio:6,jun:6,julio:7,jul:7,agosto:8,ago:8,setiembre:9,septiembre:9,sep:9,sept:9,octubre:10,oct:10,noviembre:11,nov:11,diciembre:12,dic:12};
  const sNorm = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  m = sNorm.match(/(\d{1,2})\s*(?:de|-)?\s*([a-z]+)\s*(?:de|-)?\s*(\d{2,4})/);
  if(m){
    const [,d,moTxt,y] = m;
    const mo = MESES[moTxt] || MESES[moTxt.slice(0,4)] || MESES[moTxt.slice(0,3)];
    if(mo) return `${(y.length===2?('20'+y):y)}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  if(/^\d{4,6}(\.\d+)?$/.test(s)){
    const serial = Number(s);
    const base = Date.UTC(1899,11,30);
    const dt = new Date(base + Math.round(serial)*86400000);
    if(!isNaN(dt.getTime())) return dt.toISOString().slice(0,10);
  }
  const dNative = new Date(s);
  if(!isNaN(dNative.getTime())) return dNative.toISOString().slice(0,10);
  return '';
}
function buildRsColumnMap(headerRow){
  const normalized = headerRow.map(normalizeHeaderKey);
  const map = {};
  const used = new Set();
  // 1) coincidencia exacta por alias conocido
  for(const field in RS_FIELD_ALIASES){
    let idx = -1;
    for(const alias of RS_FIELD_ALIASES[field]){
      idx = normalized.indexOf(alias);
      if(idx >= 0) break;
    }
    map[field] = idx;
    if(idx >= 0) used.add(idx);
  }
  // 2) si un campo quedó sin encabezado, busca por palabra clave contenida (encabezados con texto extra)
  for(const field in RS_FIELD_FUZZY){
    if(map[field] >= 0) continue;
    let found = -1;
    for(let i=0;i<normalized.length;i++){
      if(used.has(i)) continue;
      if(RS_FIELD_FUZZY[field].some(kw => normalized[i].includes(kw))){ found = i; break; }
    }
    if(found >= 0){ map[field] = found; used.add(found); }
  }
  return map;
}

async function fetchRsCsv(e, clienteId){
  e.preventDefault();
  const cliente = state.droguerias.find(c=>c.id===clienteId);
  if(!cliente){ showToast('Cliente no encontrado.', 'bad'); return; }
  const url = new FormData(e.target).get('url').trim();
  showToast('Descargando registros...','ok');
  try{
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const text = await res.text();
    // Si Google devolvió HTML (login/permiso) en vez de CSV, avisa claro en vez de "0 filas".
    if(/^\s*<(!doctype|html)/i.test(text)){
      throw new Error('La URL no devolvió un CSV. Verifica que el Sheet esté publicado (Archivo → Compartir → Publicar en la web → CSV) y no solo compartido de forma privada.');
    }
    const rows = parseCsvRobust(text)
      .filter(parts => parts.some(v => String(v||'').trim() !== '')); // descarta filas totalmente vacías, incluida la última
    if(rows.length < 2) throw new Error('El archivo parece vacío o solo tiene encabezados.');
    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const colMap = buildRsColumnMap(headerRow);
    window.__rsImportRows = dataRows; // filas crudas, se usan al confirmar el mapeo
    openRsColumnMapModal(clienteId, url, headerRow, dataRows, colMap);
  }catch(err){
    console.error('fetchRsCsv',err);
    showToast('No se pudo descargar: '+err.message,'bad');
  }
}

/* Muestra un paso de verificación de columnas antes de importar: así el usuario ve
   exactamente qué columna del Sheet se usará para cada campo (numero, producto, titular,
   fechas) y puede corregirlo si el encabezado real no coincidió con los alias automáticos.
   Esto evita que filas o campos "desaparezcan" silenciosamente al importar. */
function openRsColumnMapModal(clienteId, url, headerRow, dataRows, autoMap){
  const cliente = state.droguerias.find(c=>c.id===clienteId);
  const fields = [
    {key:'numero', label:'Número RS', required:true},
    {key:'producto', label:'Producto', required:true},
    {key:'modelo', label:'Modelo / Presentación', required:false},
    {key:'titular', label:'Titular', required:true},
    {key:'fechaEmision', label:'Fecha de emisión', required:false},
    {key:'fechaVencimiento', label:'Fecha de vencimiento', required:false},
  ];
  const colLabel = (h,i) => escapeHtml((String(h||'').trim() || ('Columna '+(i+1))) + '  ·  ej: "'+String((dataRows[0]||[])[i]||'').slice(0,24)+'"');
  const options = (selectedIdx) => `<option value="-1"${selectedIdx==null||selectedIdx<0?' selected':''}>(no usar)</option>` +
    headerRow.map((h,i)=>`<option value="${i}"${i===selectedIdx?' selected':''}>${colLabel(h,i)}</option>`).join('');
  const missing = fields.filter(f=>f.required && (autoMap[f.key]==null || autoMap[f.key]<0));
  openModal(`Verificar columnas — ${escapeHtml(cliente?.nombre||'')}`, `
    ${missing.length
      ? `<p style="color:var(--warn);font-size:.8rem;margin-bottom:.7rem;">No se detectó automáticamente: <strong>${missing.map(m=>m.label).join(', ')}</strong>. Selecciona la columna correcta abajo antes de importar.</p>`
      : `<p style="font-size:.8rem;color:var(--ink-2);margin-bottom:.7rem;">Se encontraron ${dataRows.length} filas de datos en el Sheet. Confirma que cada campo apunta a la columna correcta.</p>`}
    <form id="rs-colmap-form" onsubmit="App.confirmRsColumnMap(event,'${clienteId}','${escapeHtml(url)}')">
      <div style="max-height:52vh;overflow:auto;">
        ${fields.map(f=>`
          <label style="display:block;margin-bottom:.6rem;">${f.label}${f.required?' *':''}
            <select name="${f.key}">${options(autoMap[f.key])}</select>
          </label>`).join('')}
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Importar ${dataRows.length} filas</button>
      </div>
    </form>
  `);
}

async function confirmRsColumnMap(e, clienteId, url){
  e.preventDefault();
  const cliente = state.droguerias.find(c=>c.id===clienteId);
  if(!cliente){ showToast('Cliente no encontrado.', 'bad'); return; }
  const dataRows = window.__rsImportRows || [];
  if(dataRows.length === 0){ showToast('Los datos descargados ya no están disponibles, vuelve a intentarlo.', 'bad'); return; }
  const fd = new FormData(e.target);
  const colMap = {};
  ['numero','producto','modelo','titular','fechaEmision','fechaVencimiento'].forEach(k=>{
    colMap[k] = Number(fd.get(k));
  });
  const get = (parts, field) => {
    const idx = colMap[field];
    return idx >= 0 ? String(parts[idx]||'').trim() : '';
  };
  const parsed = dataRows
    .map(parts => ({
      id: uid(),
      clienteId,
      numero: get(parts,'numero'),
      producto: get(parts,'producto'),
      modelo: get(parts,'modelo'),
      titular: get(parts,'titular'),
      fechaEmision: normalizeFechaToISO(get(parts,'fechaEmision')),
      fechaVencimiento: normalizeFechaToISO(get(parts,'fechaVencimiento')),
      creadoEn: new Date().toISOString()
    }))
    .filter(r => r.numero || r.producto || r.titular);
  if(parsed.length === 0){
    showToast('0 filas reconocidas con las columnas seleccionadas. Revisa el mapeo e inténtalo de nuevo.', 'bad');
    return;
  }
  cliente.rsCsvUrl = url;
  if(currentFbUser) fsPut('clientes', cliente).catch(handleFsError);
  state.registrosPorCliente[clienteId] = parsed;
  if(currentFbUser){
    const uid2 = currentFbUser.uid;
    const col2 = fbDb.collection('users').doc(uid2).collection('clientes').doc(clienteId).collection('registros');
    const snap = await col2.get();
    const batch = fbDb.batch();
    snap.docs.forEach(d=>batch.delete(d.ref));
    parsed.forEach(r=>batch.set(col2.doc(r.id),r));
    await batch.commit();
  }
  window.__rsImportRows = null;
  const totalSheet = dataRows.length;
  closeModal(); render();
  showToast(parsed.length+' de '+totalSheet+' filas importadas para '+(cliente.nombre||'el cliente')+(parsed.length<totalSheet?' (algunas filas no tenían número, producto ni titular).':'.'),'ok');
}

function renderExportar(){
  return `
    <div class="view-head"><div class="vhl"><h1>Exportar / Respaldo</h1></div></div>
    <div class="section-stack">
      <div class="section-block">
        <h2>Reportes para inspección DIGEMID</h2>
        <p>Exporta los movimientos y registros sanitarios en formato CSV para adjuntarlos a actas de inspección o cargos.</p>
        <div class="section-actions">
          <button class="btn" onclick="App.exportMovimientosCSV()">Movimientos (CSV)</button>
          <button class="btn" onclick="App.exportRegistrosCSV()">Registros sanitarios (CSV)</button>
        </div>
      </div>
      <div class="section-block">
        <h2>Respaldo manual</h2>
        <p class="hint">Descarga un respaldo de tanto en tanto y guárdalo tú mismo en un lugar seguro.</p>
        <div class="section-actions">
          <button class="btn" onclick="App.exportBackup()">Descargar respaldo (JSON)</button>
          <label class="btn btn-ghost file-btn">Importar respaldo<input type="file" accept=".json" hidden onchange="App.importBackup(this)"></label>
        </div>
      </div>
      <div class="section-block">
        <h2>Director Técnico</h2>
        <p>${escapeHtml(state.config.dt?.nombre || 'No configurado')}${state.config.dt?.colegiatura ? ' · Colegiatura ' + escapeHtml(state.config.dt.colegiatura) : ''}</p>
        <div class="section-actions"><button class="btn" onclick="App.openDTSetupModal()">Editar datos del DT</button></div>
        <p class="hint" style="margin-top:.65rem;">Esta herramienta apoya el control interno BPA; no reemplaza los procedimientos, registros físicos ni obligaciones documentarias exigidas por DIGEMID.</p>
      </div>
    </div>`;
}

/* ===================== Render dispatcher ===================== */
function render(){
  const appEl = $('#app');
  if(appEl) appEl.classList.toggle('app--no-client', !state.drogueriaActivaId);
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view===state.view));
  let html;
  if(!state.drogueriaActivaId){
    html = renderSelectorDroguerias();
  } else {
    switch(state.view){
      case 'ingresos': html = renderIngresos(); break;
      case 'salidas': html = renderSalidas(); break;
      case 'clientes': html = renderContactos(); break;
      case 'cuarentena': html = renderCuarentena(); break;
      case 'kardex': html = renderKardex(); break;
      case 'registros': html = renderRegistros(); break;
      case 'exportar': html = renderExportar(); break;
      default: html = renderDashboard();
    }
  }
  $('#view-root').innerHTML = html;
  const alerts = computeAlerts();
  const ac = alerts.length;
  $('#alert-count').textContent = ac;
  const bell = $('#alert-bell-btn');
  if(bell) bell.classList.toggle('has-alerts', ac > 0);
  const sfdt = $('#sf-dt');
  if(sfdt) sfdt.textContent = state.config.dt?.nombre || 'DT sin configurar';
  const labels = {dashboard:'Panel',ingresos:'Ingresos',salidas:'Salidas',clientes:'Clientes/Proveedores',cuarentena:'Cuarentena',kardex:'Kardex',registros:'Registros Sanitarios',exportar:'Exportar'};
  const bc = $('#view-bc');
  if(bc) bc.textContent = state.drogueriaActivaId ? (labels[state.view] || '') : 'Selecciona un cliente';
  const ca = drogueriaActiva();
  const activeBadge = $('#cliente-activo-badge');
  if(activeBadge) activeBadge.textContent = ca ? ca.nombre : '';
  const switchBtn = $('#cliente-activo-switch');
  if(switchBtn) switchBtn.hidden = !ca;
}

/* ===================== Google Drive (adjuntos DUA / Guía / Invoice) ===================== */
const DRIVE_CLIENT_ID = '270114483470-mo9q7kleiv625ajsu5vianf9p8thpoun.apps.googleusercontent.com';
const DRIVE_ROOT_FOLDER_ID = '1Nw2lTqLRJrxy-8uen0XkrdNZSwNY84dp';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
let _driveTokenClient = null;
let _driveAccessToken = null;
let _driveTokenExpiry = 0;

function driveTokenClient(){
  if(_driveTokenClient) return _driveTokenClient;
  if(!window.google || !google.accounts || !google.accounts.oauth2) return null;
  _driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: DRIVE_CLIENT_ID, scope: DRIVE_SCOPE, callback: () => {}
  });
  return _driveTokenClient;
}
function ensureDriveToken(){
  return new Promise((resolve, reject) => {
    if(_driveAccessToken && Date.now() < _driveTokenExpiry - 30000){ resolve(_driveAccessToken); return; }
    const tc = driveTokenClient();
    if(!tc){ reject(new Error('Google Identity Services no cargó (revisa tu conexión) o falta autorizar el dominio en Google Cloud.')); return; }
    tc.callback = (resp) => {
      if(resp.error){ reject(new Error(resp.error)); return; }
      _driveAccessToken = resp.access_token;
      _driveTokenExpiry = Date.now() + (Number(resp.expires_in)||3300)*1000;
      resolve(_driveAccessToken);
    };
    tc.error_callback = (err) => reject(new Error(err?.type || 'No se pudo autorizar Google Drive.'));
    tc.requestAccessToken({ prompt: _driveAccessToken ? '' : 'consent' });
  });
}
async function driveFetch(url, opts={}){
  const token = await ensureDriveToken();
  const headers = Object.assign({}, opts.headers||{}, {Authorization:'Bearer '+token});
  const res = await fetch(url, Object.assign({}, opts, {headers}));
  if(!res.ok){
    let msg = res.status+' '+res.statusText;
    try{ const j = await res.json(); msg = (j.error && j.error.message) || msg; }catch(_){}
    throw new Error(msg);
  }
  return res;
}
async function driveCreateFolder(name){
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name, mimeType:'application/vnd.google-apps.folder', parents:[DRIVE_ROOT_FOLDER_ID] })
  });
  const j = await res.json();
  return j.id;
}
async function driveListFolderFiles(folderId){
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&orderBy=modifiedTime desc&pageSize=100`);
  const j = await res.json();
  return j.files||[];
}
async function driveUploadFile(file, folderId){
  const metadata = { name: file.name, parents:[folderId] };
  const boundary = 'ctrldm_'+uid();
  const encoder = new TextEncoder();
  const head = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${file.type||'application/octet-stream'}\r\n\r\n`);
  const tail = encoder.encode(`\r\n--${boundary}--`);
  const fileBuf = await file.arrayBuffer();
  const body = new Blob([head, fileBuf, tail]);
  const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method:'POST', headers:{'Content-Type':'multipart/related; boundary='+boundary}, body
  });
  return res.json();
}
async function driveDeleteFolder(folderId){
  if(!folderId) return;
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, { method:'DELETE' });
}

let _ingresoDrive = { eventoId:null, folderId:null, files:{ dua:null, guia:null, invoice:null } };

async function ensureIngresoFolder(){
  if(_ingresoDrive.folderId) return _ingresoDrive.folderId;
  const cliente = state.droguerias.find(c=>c.id===state.drogueriaActivaId);
  const name = `Ingreso ${todayStr()} - ${cliente?.nombre||'s-c'} - ${_ingresoDrive.eventoId}`;
  const statusEl = document.getElementById('drive-folder-status');
  if(statusEl) statusEl.textContent = 'Creando carpeta en Drive para este ingreso...';
  try{
    _ingresoDrive.folderId = await driveCreateFolder(name);
    if(statusEl) statusEl.innerHTML = `Carpeta en Drive lista. <a href="https://drive.google.com/drive/folders/${_ingresoDrive.folderId}" target="_blank" rel="noopener">Abrir carpeta</a>`;
    return _ingresoDrive.folderId;
  }catch(err){
    if(statusEl) statusEl.textContent = 'No se pudo crear la carpeta en Drive: '+err.message;
    throw err;
  }
}
function attachFieldHtml(key, label, current){
  return `<label>${label}
      <input name="${key}" value="${escapeHtml(current||'')}">
      <div class="attach-row" data-key="${key}">
        <button type="button" class="btn btn-ghost btn-sm" onclick="App.attachUpload('${key}')">📤 Subir archivo</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="App.attachScan('${key}')">📁 Escanear (Drive)</button>
        <span class="attach-status" id="attach-status-${key}">Sin archivo adjunto</span>
      </div>
      <input type="hidden" name="${key}FileId"><input type="hidden" name="${key}FileName"><input type="hidden" name="${key}FileUrl">
    </label>`;
}
function setAttachStatus(key, file){
  _ingresoDrive.files[key] = file || null;
  const form = document.querySelector('form[data-cliente-id]');
  if(form){
    const idEl = form.querySelector(`[name="${key}FileId"]`), nameEl = form.querySelector(`[name="${key}FileName"]`), urlEl = form.querySelector(`[name="${key}FileUrl"]`);
    if(idEl) idEl.value = file?.id || '';
    if(nameEl) nameEl.value = file?.name || '';
    if(urlEl) urlEl.value = file?.webViewLink || '';
  }
  const statusEl = document.getElementById('attach-status-'+key);
  if(statusEl){
    statusEl.innerHTML = file
      ? `📎 <a href="${escapeHtml(file.webViewLink||'#')}" target="_blank" rel="noopener">${escapeHtml(file.name||'archivo')}</a> <button type="button" class="link bad" onclick="App.attachClear('${key}')">Quitar</button>`
      : 'Sin archivo adjunto';
  }
}
function attachClear(key){ setAttachStatus(key, null); }
async function attachUpload(key){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.pdf,image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if(!file) return;
    const statusEl = document.getElementById('attach-status-'+key);
    if(statusEl) statusEl.textContent = 'Subiendo a Drive...';
    try{
      const folderId = await ensureIngresoFolder();
      const f = await driveUploadFile(file, folderId);
      setAttachStatus(key, f);
      showToast('Archivo subido a Drive.', 'ok');
    }catch(err){
      console.error(err);
      if(statusEl) statusEl.textContent = 'Sin archivo adjunto';
      showToast('No se pudo subir el archivo: '+err.message, 'bad');
    }
  };
  input.click();
}
async function attachScan(key){
  const statusEl = document.getElementById('attach-status-'+key);
  try{
    const folderId = await ensureIngresoFolder();
    if(statusEl) statusEl.textContent = 'Buscando archivos en la carpeta...';
    const files = await driveListFolderFiles(folderId);
    openAttachPicker(key, files);
  }catch(err){
    console.error(err);
    setAttachStatus(key, _ingresoDrive.files[key]);
    showToast('No se pudo leer la carpeta de Drive: '+err.message, 'bad');
  }
}
let _attachPickerFiles = [];
function openAttachPicker(key, files){
  _attachPickerFiles = files;
  document.getElementById('attach-picker-root').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this) App.closeAttachPicker()">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Elegir archivo de Drive">
        <header class="modal-head"><h2>Elegir archivo de la carpeta</h2><button class="icon-btn" onclick="App.closeAttachPicker()" aria-label="Cerrar">✕</button></header>
        <div class="modal-body">
          ${files.length===0
            ? '<p class="empty">La carpeta aún no tiene archivos. Escanea el documento hacia esta misma carpeta desde la app de Drive (o Google Lens/Escáner) y vuelve a intentar.</p>'
            : `<ul class="attach-file-list">${files.map((f,i)=>`<li><button type="button" class="link" onclick="App.attachPickIdx('${key}', ${i})">${escapeHtml(f.name)}</button></li>`).join('')}</ul>`}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="App.attachScan('${key}')">↻ Actualizar lista</button></div>
        </div>
      </div>
    </div>`;
}
function closeAttachPicker(){ const el=document.getElementById('attach-picker-root'); if(el) el.innerHTML=''; }
function attachPickIdx(key, idx){
  const file = _attachPickerFiles[idx];
  if(!file) return;
  setAttachStatus(key, file);
  closeAttachPicker();
  showToast('Archivo vinculado desde Drive.', 'ok');
}

/* ===================== Formularios: Ingreso ===================== */
function itemRowIngresoHtml(){
  return `<div class="item-row">
    <div class="item-row-head">
      <label class="item-catalog-check">
        <input type="checkbox" onchange="App.toggleCatalogo(this)">
        <span>Buscar en catálogo RS</span>
      </label>
      <button type="button" class="icon-btn" onclick="this.closest('.item-row').remove()" aria-label="Quitar ítem">✕</button>
    </div>
    <div class="catalog-sel-wrap" hidden>
      <div class="catalog-search-wrap">
        <input type="text" class="catalog-search-input" placeholder="Escribe nombre, modelo o fabricante..." oninput="App.filterCatalog(this)" autocomplete="off">
        <div class="catalog-dropdown"></div>
      </div>
    </div>
    <input class="producto-manual" name="producto[]" placeholder="Nombre del producto (genérico, marca, modelo)" required>
    <div class="item-fields-grid">
      <input name="rs[]" placeholder="N° RS" class="mono">
      <input name="lote[]" placeholder="Lote / Serie" class="mono">
      <input name="cantidad[]" type="number" step="any" min="0" placeholder="Cantidad" required>
      <input name="unidad[]" placeholder="Unidad" value="unidad">
      <select name="condicion[]"><option>Ambiente</option><option>Refrigerado (2-8°C)</option><option>Congelado (-20°C)</option></select>
      <select name="inspeccion[]"><option>Pendiente</option><option>Conforme</option><option>No conforme</option></select>
    </div>
  </div>`;
}
function itemRowSalidaHtml(){
  const stock = groupStock(state.movimientos);
  const disponible = Object.values(stock).filter(s=>s.saldo>0).sort((a,b)=>(a.producto||'').localeCompare(b.producto||''));
  const stockOpts = disponible.length>0
    ? disponible.map(s=>`<option value="${escapeHtml(s.loteSerie||s.producto)}" data-p="${escapeHtml(s.producto)}" data-l="${escapeHtml(s.loteSerie||'')}" data-s="${s.saldo}">${escapeHtml(s.producto)} — Lote: ${escapeHtml(s.loteSerie||'s/n')} (Disp: ${s.saldo})</option>`).join('')
    : '<option value="" disabled>Sin stock disponible en Kardex</option>';
  return `<div class="item-row">
    <div class="item-row-head">
      <label class="item-catalog-check">
        <input type="checkbox" onchange="App.toggleStockSel(this)" checked>
        <span>Desde el Kardex / stock disponible</span>
      </label>
      <button type="button" class="icon-btn" onclick="this.closest('.item-row').remove()" aria-label="Quitar ítem">✕</button>
    </div>
    <div class="stock-sel-wrap">
      <select onchange="App.onStockSelect(this)">
        <option value="">— Seleccionar del Kardex —</option>
        ${stockOpts}
      </select>
    </div>
    <div class="catalog-sel-wrap" hidden>
      <div class="catalog-search-wrap">
        <input type="text" class="catalog-search-input" placeholder="Buscar en catálogo RS..." oninput="App.filterCatalog(this)" autocomplete="off">
        <div class="catalog-dropdown"></div>
      </div>
    </div>
    <input class="producto-manual" name="producto[]" placeholder="Nombre del producto" style="display:none" required>
    <div class="item-fields-grid">
      <input name="rs[]" placeholder="N° RS" class="mono">
      <input name="lote[]" placeholder="Lote / Serie" class="mono">
      <input name="cantidad[]" type="number" step="any" min="0" placeholder="Cantidad" required>
      <input name="unidad[]" placeholder="Unidad" value="unidad">
    </div>
  </div>`;
}
function addItemRow(containerId, templateFn){
  $('#'+containerId).insertAdjacentHTML('beforeend', templateFn());
}

function openIngresoModal(){
  _ingresoDrive = { eventoId: uid(), folderId:null, files:{ dua:null, guia:null, invoice:null } };
  openModal('Nuevo ingreso', `
    <form onsubmit="App.submitIngreso(event)" data-cliente-id="${state.drogueriaActivaId||''}">
      <div class="grid2">
        <label>Fecha de ingreso<input type="date" name="fecha" value="${todayStr()}" required></label>
        <label>Fecha de llegada (aduana)<input type="date" name="fechaLlegada"></label>
        <label>Proveedor
          ${contactoDatalistHtml('prov-dl','proveedor')}
          <input name="proveedor" list="prov-dl" required autocomplete="off">
        </label>
        <label>Responsable de recepción<input name="responsable" value="${escapeHtml(state.config.dt?.nombre||'')}"></label>
      </div>
      <div class="grid2">
        <label>Partida (origen)<textarea name="partida" rows="2"></textarea></label>
        <label>Llegada (almacén destino)<textarea name="llegada" rows="2"></textarea></label>
      </div>
      <h3>Documentos de la carga</h3>
      <p class="hint" id="drive-folder-status">Preparando carpeta en Drive para este ingreso...</p>
      <div class="grid3">
        ${attachFieldHtml('dua','DUA')}
        ${attachFieldHtml('guia','Guía')}
        ${attachFieldHtml('invoice','Invoice')}
      </div>
      <h3>Ítems recibidos</h3>
      <p class="hint">Escribe para buscar en el Registro Sanitario de la droguería o ingresa un producto nuevo libremente.</p>
      <div id="items-ingreso">${itemRowIngresoHtml()}</div>
      <button type="button" class="btn btn-ghost" onclick="App.addItemRow('items-ingreso', App.itemRowIngresoHtml)">+ Agregar ítem</button>
      <p class="hint">Cada ítem ingresará en estado <strong>Cuarentena</strong> hasta que el Director Técnico lo libere.</p>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Registrar ingreso</button></div>
    </form>`);
  ensureIngresoFolder().catch(err => console.warn('Drive folder', err.message));
}
async function submitIngreso(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const clienteId = state.drogueriaActivaId;
  const productos = fd.getAll('producto[]'), rss = fd.getAll('rs[]'), lotes = fd.getAll('lote[]'),
        cantidades = fd.getAll('cantidad[]'), unidades = fd.getAll('unidad[]'),
        condiciones = fd.getAll('condicion[]'), inspecciones = fd.getAll('inspeccion[]');
  if(productos.length===0){ showToast('Agrega al menos un producto.', 'bad'); return; }
  const eventoId = _ingresoDrive.eventoId || uid();
  const header = {
    clienteId, fecha: fd.get('fecha'), fechaLlegada: fd.get('fechaLlegada'), dua: fd.get('dua'),
    guia: fd.get('guia'), invoice: fd.get('invoice'), proveedor: fd.get('proveedor'), partida: fd.get('partida'),
    llegada: fd.get('llegada'), responsable: fd.get('responsable'),
    driveFolderId: _ingresoDrive.folderId || '',
    duaFileId: fd.get('duaFileId')||'', duaFileName: fd.get('duaFileName')||'', duaFileUrl: fd.get('duaFileUrl')||'',
    guiaFileId: fd.get('guiaFileId')||'', guiaFileName: fd.get('guiaFileName')||'', guiaFileUrl: fd.get('guiaFileUrl')||'',
    invoiceFileId: fd.get('invoiceFileId')||'', invoiceFileName: fd.get('invoiceFileName')||'', invoiceFileUrl: fd.get('invoiceFileUrl')||''
  };
  let guardados = 0;
  for(let i=0; i<productos.length; i++){
    if(!productos[i] || !cantidades[i]) continue;
    await saveMovimiento({
      id: uid(), eventoId, tipo:'ingreso', ...header,
      producto: productos[i], registroSanitario: rss[i]||'', loteSerie: lotes[i]||'',
      cantidad: Number(cantidades[i])||0, unidad: unidades[i]||'unidad',
      condicionAlmacenamiento: condiciones[i]||'Ambiente', estadoInspeccion: inspecciones[i]||'Pendiente',
      estadoLote:'Cuarentena', validadoDT:false, directorTecnico:'', fechaValidacionDT:'',
      observaciones:'', faltante:false, creadoEn:new Date().toISOString()
    });
    guardados++;
  }
  if(guardados===0){ showToast('No se guardó ningún ítem válido (revisa cantidades).', 'bad'); return; }
  closeModal(); setView('ingresos'); showToast('Ingreso registrado. Lote(s) en cuarentena hasta validación del DT.', 'ok');
}

/* ===================== Formularios: Salida ===================== */
function openSalidaModal(){
  openModal('Nueva salida', `
    <form onsubmit="App.submitSalida(event)" data-cliente-id="${state.drogueriaActivaId||''}">
      <div class="grid2">
        <label>Cliente / Destino final
          ${contactoDatalistHtml('cli-dl','cliente')}
          <input name="clienteDestino" list="cli-dl" required autocomplete="off">
        </label>
        <label>Fecha de salida<input type="date" name="fecha" value="${todayStr()}" required></label>
        <label>OC<input name="oc"></label>
        <label>PO<input name="po"></label>
        <label>Guía de salida<input name="guia"></label>
        <label>Proveedor (referencia)<input name="proveedor"></label>
        <label>Responsable de despacho<input name="responsable" value="${escapeHtml(state.config.dt?.nombre||'')}"></label>
      </div>
      <div class="grid2">
        <label>Partida (almacén origen)<textarea name="partida" rows="2"></textarea></label>
        <label>Llegada / Destino final<textarea name="llegada" rows="2"></textarea></label>
      </div>
      <h3>Ítems despachados</h3>
      <p class="hint">Escribe para buscar en el Registro Sanitario de la droguería o ingresa un producto nuevo libremente.</p>
      <div id="items-salida">${itemRowSalidaHtml()}</div>
      <button type="button" class="btn btn-ghost" onclick="App.addItemRow('items-salida', App.itemRowSalidaHtml)">+ Agregar ítem</button>
      <label>Observaciones<textarea name="observaciones" rows="2"></textarea></label>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Registrar salida</button></div>
    </form>`);
}
async function submitSalida(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const clienteId = state.drogueriaActivaId;
  const clienteNombre = fd.get('clienteDestino') || '';
  const productos = fd.getAll('producto[]'), rss = fd.getAll('rs[]'), lotes = fd.getAll('lote[]'),
        cantidades = fd.getAll('cantidad[]'), unidades = fd.getAll('unidad[]');
  if(productos.length===0){ showToast('Agrega al menos un producto.', 'bad'); return; }
  const stock = groupStock(movsCliente());
  const header = {
    clienteId, fecha: fd.get('fecha'), oc: fd.get('oc'), po: fd.get('po'), proveedor: fd.get('proveedor'),
    guia: fd.get('guia'), partida: fd.get('partida'), llegada: fd.get('llegada'),
    destinoFinal: clienteNombre, responsable: fd.get('responsable'), observaciones: fd.get('observaciones')
  };
  const items = []; let faltanteWarn = false;
  for(let i=0; i<productos.length; i++){
    if(!productos[i] || !cantidades[i]) continue;
    const key = lotes[i] || productos[i];
    const saldo = stock[key]?.saldo ?? 0;
    const cant = Number(cantidades[i])||0;
    const esFaltante = cant > saldo;
    if(esFaltante) faltanteWarn = true;
    items.push({producto:productos[i], registroSanitario:rss[i]||'', loteSerie:lotes[i]||'', cantidad:cant, unidad:unidades[i]||'unidad', faltante:esFaltante});
  }
  if(items.length===0){ showToast('No se guardó ningún ítem válido (revisa cantidades).', 'bad'); return; }
  if(faltanteWarn && !confirm('El saldo disponible es menor a la cantidad despachada en uno o más ítems. ¿Registrar de todas formas? Se marcarán como discrepancia.')) return;
  const eventoId = uid();
  for(const it of items){
    await saveMovimiento({ id:uid(), eventoId, tipo:'salida', ...header, ...it, estadoLote:'', validadoDT:false, directorTecnico:'', fechaValidacionDT:'', creadoEn:new Date().toISOString() });
  }
  closeModal(); setView('salidas'); showToast('Salida registrada.', 'ok');
}

/* ===================== Editar movimiento ===================== */
function openEditMovModal(id){
  const m = state.movimientos.find(x=>x.id===id);
  if(!m) return;
  const isIngreso = m.tipo==='ingreso';
  if(isIngreso){
    _ingresoDrive = {
      eventoId: m.eventoId, folderId: m.driveFolderId || null,
      files: {
        dua: m.duaFileId ? {id:m.duaFileId, name:m.duaFileName, webViewLink:m.duaFileUrl} : null,
        guia: m.guiaFileId ? {id:m.guiaFileId, name:m.guiaFileName, webViewLink:m.guiaFileUrl} : null,
        invoice: m.invoiceFileId ? {id:m.invoiceFileId, name:m.invoiceFileName, webViewLink:m.invoiceFileUrl} : null
      }
    };
  }
  const clienteRs = getClienteRS(m.clienteId);
  const editDatalistHtml = `<datalist id="pdm-catalog-edit">${clienteRs.map(e=>`<option value="${escapeHtml(catalogDisplay({producto:e.producto,modelo:e.modelo}))}">`).join('')}</datalist>`;
  openModal(isIngreso?'Editar ingreso':'Editar salida', `
    <form onsubmit="App.submitEditMov(event,'${id}')" data-cliente-id="${escapeHtml(m.clienteId||'')}">
      <div class="grid2">
        <label>Fecha<input type="date" name="fecha" value="${m.fecha||''}" required></label>
        <label>Proveedor<input name="proveedor" value="${escapeHtml(m.proveedor||'')}" ${isIngreso?'required':''}></label>
        ${isIngreso
          ? `<label>Fecha de llegada<input type="date" name="fechaLlegada" value="${m.fechaLlegada||''}"></label>`
          : `<label>OC<input name="oc" value="${escapeHtml(m.oc||'')}"></label><label>PO<input name="po" value="${escapeHtml(m.po||'')}"></label><label>Guía<input name="guia" value="${escapeHtml(m.guia||'')}"></label>`}
        <label>Responsable<input name="responsable" value="${escapeHtml(m.responsable||'')}"></label>
      </div>
      ${isIngreso ? `
      <p class="hint" id="drive-folder-status">${m.driveFolderId ? `Carpeta en Drive: <a href="https://drive.google.com/drive/folders/${m.driveFolderId}" target="_blank" rel="noopener">Abrir carpeta</a>` : 'Este ingreso aún no tiene carpeta en Drive; se creará al subir o escanear un documento.'}</p>
      <div class="grid3">
        ${attachFieldHtml('dua','DUA', m.dua)}
        ${attachFieldHtml('guia','Guía', m.guia)}
        ${attachFieldHtml('invoice','Invoice', m.invoice)}
      </div>` : ''}
      <label>Producto<input name="producto" value="${escapeHtml(m.producto||'')}" list="pdm-catalog-edit" oninput="App.onProductoAutofill(this)" required></label>
      ${editDatalistHtml}
      <div class="grid3">
        <label>Registro Sanitario<input name="registroSanitario" value="${escapeHtml(m.registroSanitario||'')}"></label>
        <label>Lote/Serie<input name="loteSerie" value="${escapeHtml(m.loteSerie||'')}"></label>
        <label>Cantidad<input type="number" step="any" min="0" name="cantidad" value="${m.cantidad}" required></label>
      </div>
      <div class="grid2">
        <label>Partida (origen)<textarea name="partida" rows="2">${escapeHtml(m.partida||'')}</textarea></label>
        <label>Llegada (destino)<textarea name="llegada" rows="2">${escapeHtml(m.llegada||'')}</textarea></label>
      </div>
      ${isIngreso ? `
      <div class="grid2">
        <label>Condición de almacenamiento<select name="condicionAlmacenamiento">
          ${['Ambiente','Refrigerado (2-8°C)','Congelado (-20°C)'].map(o=>`<option ${m.condicionAlmacenamiento===o?'selected':''}>${o}</option>`).join('')}
        </select></label>
        <label>Estado de inspección<select name="estadoInspeccion">
          ${['Conforme','No conforme','Pendiente'].map(o=>`<option ${m.estadoInspeccion===o?'selected':''}>${o}</option>`).join('')}
        </select></label>
      </div>
      <p class="hint">Estado del lote: ${stampHtml(m.estadoLote)} (cámbialo desde Ingresos o Cuarentena)</p>`
      : `<label>Destino final<input name="destinoFinal" value="${escapeHtml(m.destinoFinal||'')}"></label>`}
      <label>Observaciones<textarea name="observaciones" rows="2">${escapeHtml(m.observaciones||'')}</textarea></label>
      <label class="checkbox"><input type="checkbox" name="faltante" ${m.faltante?'checked':''}> Marcar como discrepancia/faltante</label>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar cambios</button></div>
    </form>`);
  if(isIngreso){
    setAttachStatus('dua', _ingresoDrive.files.dua);
    setAttachStatus('guia', _ingresoDrive.files.guia);
    setAttachStatus('invoice', _ingresoDrive.files.invoice);
  }
}
async function submitEditMov(e, id){
  e.preventDefault();
  const fd = new FormData(e.target);
  const m = state.movimientos.find(x=>x.id===id);
  if(!m) return;
  ['fecha','fechaLlegada','dua','oc','po','guia','invoice','proveedor','partida','llegada','responsable','producto','registroSanitario','loteSerie','condicionAlmacenamiento','estadoInspeccion','destinoFinal','observaciones',
   'duaFileId','duaFileName','duaFileUrl','guiaFileId','guiaFileName','guiaFileUrl','invoiceFileId','invoiceFileName','invoiceFileUrl'].forEach(f => {
    if(fd.has(f)) m[f] = fd.get(f);
  });
  if(m.tipo==='ingreso' && _ingresoDrive.folderId) m.driveFolderId = _ingresoDrive.folderId;
  m.cantidad = Number(fd.get('cantidad'))||0;
  m.faltante = fd.get('faltante')==='on';
  await saveMovimiento(m);
  closeModal(); render(); showToast('Cambios guardados.', 'ok');
}
async function removeMov(id){
  if(!confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;
  const m = state.movimientos.find(x=>x.id===id);
  await deleteMovimiento(id);
  if(m?.driveFolderId && !state.movimientos.some(x=>x.eventoId===m.eventoId)){
    try{
      await driveDeleteFolder(m.driveFolderId);
      render(); showToast('Movimiento y carpeta de Drive eliminados.', 'warn'); return;
    }catch(err){
      console.error(err);
      render(); showToast('Movimiento eliminado. No se pudo borrar la carpeta de Drive: '+err.message, 'warn'); return;
    }
  }
  render(); showToast('Movimiento eliminado.', 'warn');
}

/* ===================== Cuarentena / Liberación ===================== */
function openLiberarModal(id, accion){
  const m = state.movimientos.find(x=>x.id===id);
  if(!m) return;
  openModal(accion==='Liberado' ? 'Liberar lote' : 'Rechazar lote', `
    <form onsubmit="App.confirmEstadoLote(event,'${id}','${accion}')">
      <p>${escapeHtml(m.producto||'')} — Lote/Serie: <strong class="mono">${escapeHtml(m.loteSerie||'s/n')}</strong></p>
      <label>Director Técnico<input name="dt" value="${escapeHtml(state.config.dt?.nombre||'')}" required></label>
      <label>Observación<textarea name="obs" rows="2" ${accion==='Rechazado'?'required':''}></textarea></label>
      <div class="modal-actions"><button type="submit" class="btn ${accion==='Liberado'?'btn-ok':'btn-bad'}">Confirmar ${accion.toLowerCase()}</button></div>
    </form>`);
}
async function confirmEstadoLote(e, id, accion){
  e.preventDefault();
  const fd = new FormData(e.target);
  const m = state.movimientos.find(x=>x.id===id);
  if(!m) return;
  m.estadoLote = accion;
  m.directorTecnico = fd.get('dt');
  m.validadoDT = true;
  m.fechaValidacionDT = new Date().toISOString();
  const obs = fd.get('obs');
  if(obs) m.observaciones = (m.observaciones ? m.observaciones+' | ' : '') + obs;
  await saveMovimiento(m);
  closeModal(); render(); showToast(`Lote marcado como ${accion}.`, accion==='Rechazado'?'bad':'ok');
}

/* ===================== Registros Sanitarios ===================== */
function openRegistroModal(clienteId, id){
  const cliente = state.droguerias.find(c=>c.id===clienteId);
  if(!cliente){ showToast('Selecciona un cliente primero.', 'bad'); return; }
  const r = id ? getClienteRS(clienteId).find(x=>x.id===id) : {};
  const editId = id || '';
  openModal(id?'Editar registro sanitario':`Nuevo registro sanitario — ${escapeHtml(cliente.nombre||'')}`, `
    <form onsubmit="App.submitRegistro(event,'${clienteId}','${editId}')">
      <label>Número de RS<input name="numero" value="${escapeHtml(r.numero||'')}" required></label>
      <label>Producto (denominación común)<input name="producto" value="${escapeHtml(r.producto||'')}" required></label>
      <label>Modelo<input name="modelo" value="${escapeHtml(r.modelo||'')}"></label>
      <label>Titular del registro<input name="titular" value="${escapeHtml(r.titular||'')}"></label>
      <div class="grid2">
        <label>Fecha de emisión<input type="date" name="fechaEmision" value="${r.fechaEmision||''}"></label>
        <label>Fecha de vencimiento<input type="date" name="fechaVencimiento" value="${r.fechaVencimiento||''}" required></label>
      </div>
      <label>Archivo del Registro Sanitario (PDF o imagen)
        <input type="file" name="archivo" accept=".pdf,image/*">
        ${r.archivoNombre?`<span class="hint">Archivo actual: ${escapeHtml(r.archivoNombre)} (se reemplaza si subes uno nuevo)</span>`:''}
      </label>
      <label>Observaciones<textarea name="observaciones" rows="2">${escapeHtml(r.observaciones||'')}</textarea></label>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>`);
}
function readFileAsDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function submitRegistro(e, clienteId, id){
  e.preventDefault();
  const fd = new FormData(e.target);
  const existing = id ? getClienteRS(clienteId).find(x=>x.id===id) : null;
  const r = {
    id: id || uid(), clienteId, numero: fd.get('numero'), producto: fd.get('producto'), modelo: fd.get('modelo'), titular: fd.get('titular'),
    fechaEmision: fd.get('fechaEmision'), fechaVencimiento: fd.get('fechaVencimiento'),
    observaciones: fd.get('observaciones'), creadoEn: existing?.creadoEn || new Date().toISOString(),
    archivoNombre: existing?.archivoNombre || '', archivoTipo: existing?.archivoTipo || '', archivoBase64: existing?.archivoBase64 || ''
  };
  const file = fd.get('archivo');
  if(file && file.size > 0){
    if(file.size > 700*1024){ showToast('El archivo supera 700 KB (límite de guardado en la nube). Usa uno más liviano o comprímelo.', 'bad'); return; }
    try{
      r.archivoBase64 = await readFileAsDataUrl(file);
      r.archivoNombre = file.name;
      r.archivoTipo = file.type;
    }catch(err){ console.error('lectura archivo RS', err); showToast('No se pudo leer el archivo.', 'bad'); return; }
  }
  if(!state.registrosPorCliente[clienteId]) state.registrosPorCliente[clienteId] = [];
  const list = state.registrosPorCliente[clienteId];
  const i = list.findIndex(x=>x.id===r.id);
  if(i>-1) list[i]=r; else list.push(r);
  if(currentFbUser){ fsPutClienteRegistro(clienteId, r).catch(e=>handleFsError(e)); }
  closeModal(); setView('registros'); showToast('Registro sanitario guardado.', 'ok');
}
async function removeRegistro(clienteId, id){
  if(!confirm('¿Eliminar este registro sanitario? Esta acción no se puede deshacer.')) return;
  if(state.registrosPorCliente[clienteId]){
    state.registrosPorCliente[clienteId] = state.registrosPorCliente[clienteId].filter(x=>x.id!==id);
  }
  if(currentFbUser){ fsDeleteClienteRegistro(clienteId, id).catch(e=>handleFsError(e)); }
  render(); showToast('Registro sanitario eliminado.', 'warn');
}


/* ===================== Director Técnico ===================== */
function openDTSetupModal(first){
  const dt = state.config.dt || {};
  openModal('Configurar Director Técnico', `
    <form onsubmit="App.submitDT(event)">
      ${first?'<p class="hint">Registra al Director Técnico responsable de validar los lotes. BPA exige su autorización para liberar mercancía de cuarentena.</p>':''}
      <label>Nombre completo<input name="nombre" value="${escapeHtml(dt.nombre||'')}" required></label>
      <label>Nº de colegiatura<input name="colegiatura" value="${escapeHtml(dt.colegiatura||'')}"></label>
      <label>Días de aviso antes de vencimiento de RS<input type="number" name="alertaDias" min="1" value="${state.config.alertaDiasRS ?? 90}"></label>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>`);
}
async function submitDT(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const dt = {nombre: fd.get('nombre'), colegiatura: fd.get('colegiatura')};
  const alertaDias = Number(fd.get('alertaDias'))||90;
  state.config.dt = dt; state.config.alertaDiasRS = alertaDias;
  // Aplica y cierra siempre de inmediato; el guardado en la nube sigue en segundo plano
  // con un tope de tiempo para que nunca deje la ventana colgada si Firestore no responde.
  closeModal(); render(); showToast('Director Técnico guardado.', 'ok');
  if(currentFbUser){
    const withTimeout = (p, ms=10000) => Promise.race([p, new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
    try{
      await Promise.all([
        withTimeout(fsPut('config', {key:'dt', value:dt})),
        withTimeout(fsPut('config', {key:'alertaDiasRS', value:alertaDias}))
      ]);
    }catch(err){
      handleFsError(err);
      showToast('Se guardó localmente; no se pudo confirmar el guardado en la nube.', 'warn');
    }
  }
}

/* ===================== Exportar / Respaldo ===================== */
function exportMovimientosCSV(){
  const headers = [
    {label:'Tipo', value:'tipo'}, {label:'Fecha', value:'fecha'}, {label:'Proveedor', value:'proveedor'},
    {label:'Producto', value:'producto'}, {label:'Registro Sanitario', value:'registroSanitario'},
    {label:'Lote/Serie', value:'loteSerie'}, {label:'Cantidad', value:'cantidad'}, {label:'Unidad', value:'unidad'},
    {label:'DUA', value:'dua'}, {label:'Guía', value:'guia'}, {label:'OC', value:'oc'}, {label:'PO', value:'po'},
    {label:'Partida', value:'partida'}, {label:'Llegada', value:'llegada'}, {label:'Destino final', value:'destinoFinal'},
    {label:'Estado lote', value:'estadoLote'}, {label:'Estado inspección', value:'estadoInspeccion'},
    {label:'Condición almacenamiento', value:'condicionAlmacenamiento'}, {label:'Director Técnico', value:'directorTecnico'},
    {label:'Faltante', value: r => r.faltante?'SI':'NO'}, {label:'Observaciones', value:'observaciones'}
  ];
  downloadFile(`movimientos_${todayStr()}.csv`, toCSV(state.movimientos, headers), 'text/csv');
}
function exportRegistrosCSV(){
  const headers = [
    {label:'Cliente', value: r => state.droguerias.find(c=>c.id===r.clienteId)?.nombre || ''},
    {label:'Número RS', value:'numero'}, {label:'Producto', value:'producto'}, {label:'Titular', value:'titular'},
    {label:'Emisión', value:'fechaEmision'}, {label:'Vencimiento', value:'fechaVencimiento'}, {label:'Observaciones', value:'observaciones'}
  ];
  const flat = Object.values(state.registrosPorCliente||{}).flat();
  downloadFile(`registros_sanitarios_${todayStr()}.csv`, toCSV(flat, headers), 'text/csv');
}
function exportBackup(){
  const data = {movimientos: state.movimientos, proveedores: state.proveedores, clientes: state.droguerias, contactos: state.contactos, registrosPorCliente: state.registrosPorCliente, config: state.config, exportadoEn: new Date().toISOString()};
  downloadFile(`respaldo_bpa_${todayStr()}.json`, JSON.stringify(data, null, 2), 'application/json');
}
function importBackup(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try{
      const data = JSON.parse(reader.result);
      if(!confirm('Esto reemplazará todos los datos actuales por los del respaldo. ¿Continuar?')) return;
      state.movimientos = data.movimientos || [];
      state.droguerias = data.clientes || state.droguerias;
      state.proveedores = data.proveedores || state.proveedores;
      state.contactos = data.contactos || state.contactos;
      state.registrosPorCliente = data.registrosPorCliente || {};
      if(!data.registrosPorCliente && (data.registros||[]).length){
        (data.registros||[]).forEach(r => {
          if(!r.clienteId) return;
          if(!state.registrosPorCliente[r.clienteId]) state.registrosPorCliente[r.clienteId] = [];
          state.registrosPorCliente[r.clienteId].push(r);
        });
      }
      if(data.config?.dt) state.config.dt = data.config.dt;
      if(data.config?.alertaDiasRS) state.config.alertaDiasRS = data.config.alertaDiasRS;
      if(currentFbUser && fbDb){
        try{ await fsUploadAll(); }catch(e){ handleFsError(e); }
      }
      render();
      showToast('Respaldo importado correctamente.', 'ok');
    }catch(err){
      console.error(err);
      showToast('No se pudo leer el archivo de respaldo.', 'bad');
    }
  };
  reader.readAsText(file);
}


/* ===================== Firebase + Firestore ===================== */
// Firestore es la única fuente de verdad. App 100% online — sin almacenamiento local.
// El listener onSnapshot mantiene sincronizados todos los dispositivos en tiempo real.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAf7PUoJ8BzTM_8zljoalqrjANp0rZWx4w",
  authDomain: "impo-db.firebaseapp.com",
  projectId: "impo-db",
  storageBucket: "impo-db.firebasestorage.app",
  messagingSenderId: "1072294346879",
  appId: "1:1072294346879:web:fd2985f4995f1ff763ff4a"
};

let fbAuth = null, fbDb = null;
let currentFbUser = null;
let _fsListeners = [];

const LS_USER_KEY='dm_bpa_user_cache';
function cacheUser(user){
  if(user) localStorage.setItem(LS_USER_KEY,JSON.stringify({uid:user.uid,displayName:user.displayName,email:user.email}));
  else localStorage.removeItem(LS_USER_KEY);
}
function getCachedUser(){ try{ const s=localStorage.getItem(LS_USER_KEY); return s?JSON.parse(s):null; }catch(e){return null;} }

let _fbInitDone = false;
function initFirebase(){
  if(typeof firebase === 'undefined'){ console.warn('Firebase SDK no disponible'); return; }
  if(_fbInitDone && firebase.apps.length){ return; }
  try{
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _fbInitDone = true;
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    // If we have a cached user, show the app shell immediately while Firebase verifies
    const cached=getCachedUser();
    if(cached){
      currentFbUser={uid:cached.uid,displayName:cached.displayName,email:cached.email};
      showAppScreen();
      render();
    }
    const _loadEls = ['login-loading','login-loading-d'].map(id=>document.getElementById(id)).filter(Boolean);
    _loadEls.forEach(el=>{ el.hidden=false; });
    fbAuth.onAuthStateChanged(user=>{
      _loadEls.forEach(el=>{ el.hidden=true; });
      cacheUser(user);
      handleAuthChange(user);
    });
  }catch(e){ console.error('Firebase init failed', e); }
}

function fsUserCol(col){
  if(!fbDb || !currentFbUser) return null;
  return fbDb.collection('users').doc(currentFbUser.uid).collection(col);
}
function handleFsError(e){
  console.error('Firestore error:', e);
  if(e && (e.code==='permission-denied' || e.message?.includes('permission'))){
    showToast('PERMISO DENEGADO: Ve a Firebase Console → Firestore → Reglas y pega las reglas del README.', 'bad');
  } else if(e && e.code==='unavailable'){
    // offline — Firestore will retry automatically, no toast needed
  } else {
    showToast('Error al sincronizar con Firestore. Revisa la conexión.', 'warn');
  }
}
async function fsPut(col, obj){
  const ref = fsUserCol(col);
  if(!ref) return;
  try{ await ref.doc(String(obj.id||obj.key)).set(obj); }
  catch(e){ console.error('fsPut', col, e); }
}
async function fsDelete(col, id){
  const ref = fsUserCol(col);
  if(!ref) return;
  try{ await ref.doc(String(id)).delete(); }
  catch(e){ console.error('fsDelete', col, e); }
}
async function fsGetAll(col){
  const ref = fsUserCol(col);
  if(!ref) return [];
  try{ const snap = await ref.get(); return snap.docs.map(d => d.data()); }
  catch(e){ console.error('fsGetAll', col, e); return []; }
}
function fsClienteRegistrosCol(clienteId){
  if(!fbDb || !currentFbUser) return null;
  return fbDb.collection('users').doc(currentFbUser.uid).collection('clientes').doc(clienteId).collection('registros');
}
async function fsPutClienteRegistro(clienteId, obj){
  const ref = fsClienteRegistrosCol(clienteId);
  if(!ref) return;
  try{ await ref.doc(String(obj.id)).set(obj); }
  catch(e){ console.error('fsPutClienteRegistro', clienteId, e); }
}
async function fsDeleteClienteRegistro(clienteId, id){
  const ref = fsClienteRegistrosCol(clienteId);
  if(!ref) return;
  try{ await ref.doc(String(id)).delete(); }
  catch(e){ console.error('fsDeleteClienteRegistro', clienteId, e); }
}
async function fsGetAllClienteRegistros(clienteId){
  const ref = fsClienteRegistrosCol(clienteId);
  if(!ref) return [];
  try{ const snap = await ref.get(); return snap.docs.map(d => d.data()); }
  catch(e){ console.error('fsGetAllClienteRegistros', clienteId, e); return []; }
}
async function fsUploadAll(){
  if(!fbDb || !currentFbUser) return;
  const uid = currentFbUser.uid;
  const batch = fbDb.batch();
  state.movimientos.forEach(m => batch.set(fbDb.collection('users').doc(uid).collection('movimientos').doc(m.id), m));
  state.proveedores.forEach(p => batch.set(fbDb.collection('users').doc(uid).collection('proveedores').doc(p.id), p));
  state.droguerias.forEach(c => batch.set(fbDb.collection('users').doc(uid).collection('clientes').doc(c.id), c));
  state.contactos.forEach(c => batch.set(fbDb.collection('users').doc(uid).collection('contactos').doc(c.id), c));
  Object.entries(state.registrosPorCliente||{}).forEach(([clienteId, regs]) => {
    (regs||[]).forEach(r => batch.set(fbDb.collection('users').doc(uid).collection('clientes').doc(clienteId).collection('registros').doc(r.id), r));
  });
  if(state.config.dt) batch.set(fbDb.collection('users').doc(uid).collection('config').doc('dt'), {key:'dt', value:state.config.dt});
  if(state.config.alertaDiasRS !== undefined) batch.set(fbDb.collection('users').doc(uid).collection('config').doc('alertaDiasRS'), {key:'alertaDiasRS', value:state.config.alertaDiasRS});
  await batch.commit();
}

function setupFsListeners(){
  _fsListeners.forEach(u => u()); _fsListeners = [];
  if(!fbDb || !currentFbUser) return;
  const uid = currentFbUser.uid;
  let initialLoadDone = false;
  setTimeout(() => { initialLoadDone = true; }, 2000);

  _fsListeners.push(
    fbDb.collection('users').doc(uid).collection('movimientos').onSnapshot(snap => {
      snap.docChanges().forEach(ch => {
        if(ch.type === 'added' || ch.type === 'modified'){
          const d = ch.doc.data();
          const i = state.movimientos.findIndex(x => x.id === d.id);
          if(i > -1) state.movimientos[i] = d; else state.movimientos.push(d);
        } else if(ch.type === 'removed'){
          state.movimientos = state.movimientos.filter(x => x.id !== ch.doc.id);
        }
      });
      if(initialLoadDone) render();
    }, e => console.error('fs:movimientos', e))
  );
  _fsListeners.push(
    fbDb.collection('users').doc(uid).collection('proveedores').onSnapshot(snap => {
      snap.docChanges().forEach(ch => {
        if(ch.type==='added'||ch.type==='modified'){
          const d=ch.doc.data(); const i=state.proveedores.findIndex(x=>x.id===d.id);
          if(i>-1) state.proveedores[i]=d; else state.proveedores.push(d);
        } else if(ch.type==='removed'){ state.proveedores=state.proveedores.filter(x=>x.id!==ch.doc.id); }
      });
      if(initialLoadDone) render();
    }, e=>console.error('fs:proveedores',e))
  );
  _fsListeners.push(
    fbDb.collection('users').doc(uid).collection('contactos').onSnapshot(snap => {
      snap.docChanges().forEach(ch => {
        if(ch.type==='added'||ch.type==='modified'){
          const d=ch.doc.data(); const i=state.contactos.findIndex(x=>x.id===d.id);
          if(i>-1) state.contactos[i]=d; else state.contactos.push(d);
        } else if(ch.type==='removed'){ state.contactos=state.contactos.filter(x=>x.id!==ch.doc.id); }
      });
      if(initialLoadDone) render();
    }, e=>console.error('fs:contactos',e))
  );
  _fsListeners.push(
    fbDb.collection('users').doc(uid).collection('clientes').onSnapshot(snap => {
      snap.docChanges().forEach(ch => {
        if(ch.type==='added'||ch.type==='modified'){
          const d=ch.doc.data(); const i=state.droguerias.findIndex(x=>x.id===d.id);
          if(i>-1) state.droguerias[i]=d; else state.droguerias.push(d);
          if(ch.type==='added') setupClienteRegistrosListener(d.id);
        } else if(ch.type==='removed'){
          state.droguerias=state.droguerias.filter(x=>x.id!==ch.doc.id);
          delete state.registrosPorCliente[ch.doc.id];
        }
      });
      if(initialLoadDone) render();
    }, e=>console.error('fs:clientes',e))
  );
  // Listener de registros sanitarios por cada cliente existente
  state.droguerias.forEach(c => setupClienteRegistrosListener(c.id));
}
function setupClienteRegistrosListener(clienteId){
  if(!fbDb || !currentFbUser) return;
  const uid = currentFbUser.uid;
  const unsub = fbDb.collection('users').doc(uid).collection('clientes').doc(clienteId).collection('registros').onSnapshot(snap => {
    if(!state.registrosPorCliente[clienteId]) state.registrosPorCliente[clienteId] = [];
    const list = state.registrosPorCliente[clienteId];
    snap.docChanges().forEach(ch => {
      if(ch.type === 'added' || ch.type === 'modified'){
        const d = ch.doc.data();
        const i = list.findIndex(x => x.id === d.id);
        if(i > -1) list[i] = d; else list.push(d);
      } else if(ch.type === 'removed'){
        state.registrosPorCliente[clienteId] = list.filter(x => x.id !== ch.doc.id);
      }
    });
    render();
  }, e => console.error('fs:registros:'+clienteId, e));
  _fsListeners.push(unsub);
}

async function handleAuthChange(user){
  if(!user){
    currentFbUser = null;
    _fsListeners.forEach(u => u()); _fsListeners = [];
    state.movimientos = []; state.registrosPorCliente = {}; state.config = {};
    showLoginScreen();
    return;
  }
  currentFbUser = user;
  // Show app immediately — don't block on Firestore (mirrors reference index)
  showAppScreen();
  render();
  // Load Firestore in background with timeout guard. Each collection is independent:
  // if one is slow or empty it falls back to [] instead of failing the whole load.
  const withTimeout = (p, ms=12000) => Promise.race([p, new Promise((_,r) => setTimeout(()=>r(new Error('timeout')),ms))]);
  let hadTimeout = false;
  const safeFetch = (p) => withTimeout(p).catch(e => { if(String(e.message||'')==='timeout') hadTimeout = true; return []; });
  try{
    const [movs, cfgs, provs, clis, contacts] = await Promise.all([
      safeFetch(fsGetAll('movimientos')),
      safeFetch(fsGetAll('config')),
      safeFetch(fsGetAll('proveedores')),
      safeFetch(fsGetAll('clientes')),
      safeFetch(fsGetAll('contactos'))
    ]);
    state.movimientos = movs;
    state.proveedores = provs || [];
    state.droguerias = clis || [];
    state.contactos = contacts || [];
    // Cargar registros sanitarios de cada cliente en paralelo
    const regsArrays = await Promise.all(state.droguerias.map(c => safeFetch(fsGetAllClienteRegistros(c.id))));
    state.registrosPorCliente = {};
    state.droguerias.forEach((c,i) => { state.registrosPorCliente[c.id] = regsArrays[i] || []; });
    const cfgMap = Object.fromEntries(cfgs.map(c => [c.key, c.value]));
    state.config = {...state.config, ...cfgMap};
    setupFsListeners();
    if(!state.config.dt) openDTSetupModal(true);
    render();
    showToast('Bienvenido, ' + (user.displayName||user.email), 'ok');
    if(hadTimeout) showToast('Algunos datos tardaron en cargar; se completarán automáticamente al sincronizar.', 'warn');
  }catch(e){
    const msg = String(e.message||'');
    console.error('handleAuthChange', e);
    setupFsListeners();
    render();
    if(msg.includes('not found') || String(e.code||'').includes('not-found')){
      showToast('Firestore: crea la base de datos en Firebase Console → Firestore Database.', 'warn');
    } else {
      showToast('No se pudo cargar todo desde Firestore. Verifica tu conexión o las reglas de Firestore.', 'warn');
    }
  }
}

function openFirebaseConflictModal(){
  openModal('Datos locales existentes', `
    <p>Iniciaste sesión como <strong>${escapeHtml(currentFbUser.displayName||currentFbUser.email)}</strong>. Tienes ${state.movimientos.length} movimiento(s) guardados localmente en este dispositivo.</p>
    <p class="hint">¿Qué quieres hacer con ellos?</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="App.resolveFirebaseConflict('discard')">Descartar datos locales</button>
      <button class="btn btn-primary" onclick="App.resolveFirebaseConflict('upload')">Subir a la nube</button>
    </div>
  `);
}
async function resolveFirebaseConflict(action){
  closeModal();
  if(action === 'upload'){
    try{ await fsUploadAll(); showToast('Datos subidos correctamente.', 'ok'); }
    catch(e){ console.error(e); showToast('No se pudieron subir los datos.', 'bad'); }
  } else {
    state.movimientos = []; state.registrosPorCliente = {};
  }
  render();
}

function toggleEmailForm(){
  // Toggle both mobile and desktop forms
  const forms = [document.getElementById('login-email-form'), document.getElementById('login-email-form-desktop')];
  const btns = [document.getElementById('toggle-email-btn'), document.getElementById('toggle-email-btn-d')];
  const form = forms.find(f => f);
  if(!form) return;
  const shown = form.style.display === 'flex';
  forms.forEach(f => { if(f) f.style.display = shown ? 'none' : 'flex'; });
  btns.forEach(b => { if(b) b.textContent = shown ? 'Usar correo y contraseña' : 'Cancelar'; });
}
async function signInWithEmail(){
  const emailEl = document.getElementById('li-email') || document.getElementById('li-email');
  const passEl = document.getElementById('li-pass');
  const email = (emailEl||{}).value?.trim();
  const pass = (passEl||{}).value;
  const errEl=document.getElementById('li-err');
  if(!email||!pass){ if(errEl){errEl.style.display='block';errEl.textContent='Ingresa correo y contraseña.';} return; }
  if(!fbAuth){ showToast('Firebase no disponible.','bad'); return; }
  try{
    if(errEl) errEl.style.display='none';
    await fbAuth.signInWithEmailAndPassword(email,pass);
  }catch(e){
    console.error(e);
    const msgs={'auth/user-not-found':'Usuario no encontrado. ¿Quieres registrarte?','auth/wrong-password':'Contraseña incorrecta.','auth/invalid-email':'Correo inválido.','auth/too-many-requests':'Demasiados intentos. Intenta más tarde.'};
    const msg=msgs[e.code]||e.message;
    if(errEl){ errEl.style.display='block'; errEl.textContent=msg; }
    // offer to create account if not found
    if(e.code==='auth/user-not-found'){
      if(confirm('No existe cuenta con ese correo. ¿Crear cuenta nueva?')){
        try{ await fbAuth.createUserWithEmailAndPassword(email,pass); }
        catch(e2){ if(errEl){ errEl.style.display='block'; errEl.textContent=e2.message; } }
      }
    }
  }
}
async function forgotPassword(){
  const email=(document.getElementById('li-email')||{}).value?.trim();
  if(!email){ alert('Ingresa tu correo primero.'); return; }
  if(!fbAuth) return;
  try{ await fbAuth.sendPasswordResetEmail(email); alert('Correo de recuperación enviado a '+email); }
  catch(e){ alert('Error: '+e.message); }
}
function togglePassVis(){
  const f=document.getElementById('li-pass');
  if(f) f.type=f.type==='password'?'text':'password';
}
async function signInWithGoogle(){
  if(!fbAuth){ showToast('Firebase no disponible. Recarga la página con conexión a internet.', 'bad'); return; }
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    await fbAuth.signInWithPopup(provider);
  }catch(e){
    if(e.code !== 'auth/popup-closed-by-user'){
      console.error(e);
      showToast('No se pudo iniciar sesión: ' + (e.message||e.code), 'bad');
    }
  }
}
async function fbSignOut(){
  if(!confirm('¿Cerrar sesión?')) return;
  _fsListeners.forEach(u => u()); _fsListeners = [];
  cacheUser(null);
  await fbAuth.signOut();
  currentFbUser = null;
  showLoginScreen();
  showToast('Sesión cerrada.', 'ok');
}

function renderAuthFooter(){
  const el = document.getElementById('sf-auth');
  const meta = document.getElementById('sf-meta');
  const signoutBtn = document.getElementById('sf-signout-btn');
  const topBtn = document.getElementById('topbar-auth-btn');
  if(currentFbUser){
    const name = escapeHtml(currentFbUser.displayName||currentFbUser.email);
    if(el) el.innerHTML = `<button class="sf-auth-btn" style="cursor:default;opacity:.9;font-size:.71rem;">${name}</button>`;
    if(meta) meta.textContent = 'Sincronizado con Firestore';
    if(signoutBtn) signoutBtn.hidden = false;
    if(topBtn){
      topBtn.hidden = false;
      topBtn.textContent = '👤 ' + (currentFbUser.displayName||currentFbUser.email||'Cuenta').split(' ')[0];
    }
  } else {
    if(el) el.innerHTML = '';
    if(meta) meta.textContent = '';
    if(signoutBtn) signoutBtn.hidden = true;
    if(topBtn){ topBtn.hidden = true; }
  }
}
function openAccountMenu(){
  if(!currentFbUser) return;
  openModal('Cuenta', `
    <p style="font-size:.85rem;color:var(--ink-2);line-height:1.5;">
      Sesión iniciada como<br><strong>${escapeHtml(currentFbUser.displayName||currentFbUser.email)}</strong>
    </p>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cerrar</button>
      <button type="button" class="btn btn-bad" onclick="App.closeModal();App.fbSignOut();">Cerrar sesión</button>
    </div>
  `);
}
function showLoginScreen(){
  const ls=document.getElementById('login-screen');
  const app=document.getElementById('app');
  if(ls){ ls.hidden=false; ls.style.display='flex'; }
  if(app){ app.hidden=true; app.style.display='none'; }
  renderAuthFooter();
}
function showAppScreen(){
  const ls=document.getElementById('login-screen');
  const app=document.getElementById('app');
  if(ls){ ls.hidden=true; ls.style.display='none'; }
  if(app){ app.hidden=false; app.style.removeProperty('display'); }
  renderAuthFooter();
}

/* ===================== Autotest ===================== */
function __selfTest(){
  const sample = [
    {id:'1',tipo:'ingreso',producto:'Equipo X',loteSerie:'L1',cantidad:10},
    {id:'2',tipo:'salida',producto:'Equipo X',loteSerie:'L1',cantidad:4},
    {id:'3',tipo:'ingreso',producto:'Equipo Y',loteSerie:'L2',cantidad:5},
    {id:'4',tipo:'salida',producto:'Equipo Y',loteSerie:'L2',cantidad:7}
  ];
  const stock = groupStock(sample);
  console.assert(stock['L1'].saldo===6, 'L1 saldo debería ser 6');
  console.assert(stock['L2'].saldo===-2, 'L2 saldo debería ser -2');
  const k = calcKPIs(sample);
  console.assert(k.totalIngresos===15, 'totalIngresos 15');
  console.assert(k.totalSalidas===11, 'totalSalidas 11');
  console.assert(k.pendientes===6, 'pendientes 6');
  console.assert(k.faltantes>=1, 'faltantes >= 1');
  console.log('Autotest BPA: OK');
}

/* ===================== Arranque ===================== */
window.addEventListener('unhandledrejection', e => {
  const msg = String(e.reason?.message || e.reason || '');
  // Ignore Firebase internals, Google auth noise, and network errors we can't control
  if(msg.includes('firebase') || msg.includes('gsi') || msg.includes('Failed to fetch')
     || msg.includes('NetworkError') || msg.includes('permission-denied')) return;
  console.error('Unhandled rejection:', e.reason);
});

/* ===================== Tema claro / oscuro ===================== */
const THEME_KEY = 'controldm_theme';
function getTheme(){
  try{ return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; }catch(e){ return 'dark'; }
}
function applyTheme(theme){
  const root = document.documentElement;
  if(theme === 'light') root.setAttribute('data-theme','light');
  else root.removeAttribute('data-theme');
  const metaColor = document.getElementById('meta-theme-color');
  if(metaColor) metaColor.setAttribute('content', theme === 'light' ? '#F4F8FC' : '#0B1A33');
  const icon = document.getElementById('theme-toggle-icon');
  if(icon) icon.innerHTML = theme === 'light' ? '&#9728;' : '&#9789;';
  const btn = document.getElementById('theme-toggle-btn');
  if(btn) btn.setAttribute('title', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
}
function toggleTheme(){
  const next = getTheme() === 'light' ? 'dark' : 'light';
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
  applyTheme(next);
}
function initTheme(){
  applyTheme(getTheme());
}

async function init(){
  initTheme();
  initFirebase();
  // Login screen is shown by default (hidden=false); Firebase will call handleAuthChange
  // which calls showAppScreen() if user is already authenticated.
}
document.addEventListener('DOMContentLoaded', init);

window.App = {
  toggleTheme,
  setView, setFiltro, setFiltroClienteRS, openModal, closeModal,
  openIngresoModal, openSalidaModal, openRegistroModal, openEditMovModal, openLiberarModal, openDTSetupModal,
  addItemRow, itemRowIngresoHtml, itemRowSalidaHtml, onProductoAutofill, onClienteRsChange, toggleCatalogo, onCatalogoSelect,
  filterCatalog, selectCatalogItem, toggleStockSel, onStockSelect,
  submitIngreso, submitSalida, submitRegistro, submitEditMov, confirmEstadoLote, submitDT,
  removeMov, removeRegistro,
  exportMovimientosCSV, exportRegistrosCSV, exportBackup, importBackup,
  signInWithGoogle, fbSignOut, resolveFirebaseConflict, openAccountMenu,
  toggleEmailForm, signInWithEmail, forgotPassword, togglePassVis,
  openContactoTipoModal, openContactoModal, submitContacto, deleteContacto,
  openDrogueriaModal, submitDrogueria, deleteDrogueria,
  setDrogueriaActiva, cambiarDrogueria,
  openRsConfigModal, fetchRsCsv, openRsColumnMapModal, confirmRsColumnMap,
  attachUpload, attachScan, attachClear, attachPickIdx, closeAttachPicker,
  __selfTest
};
