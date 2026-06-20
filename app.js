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

/* ===================== Catálogo de productos (DIGEMID — TECNASA/ITC) ===================== */
// ponytail: catálogo estático embebido (datos activos: solo registros vigentes, no la hoja
// VENCIDOS) para que el selector funcione 100% offline sin levantar otra base de datos.
// Para actualizarlo más adelante, basta con regenerar este arreglo desde el Excel de origen.
const PRODUCT_CATALOG = [
  {p:'SINGLE-USE HIGH-PRESSURE ANGIOGRAPHIC SYRINGES AND ACCESSORIES',m:'C-200/200-01; C-200-01',f:'SINO MEDICAL-DEVICE TECHNOLOGY CO., LTD. - CHINA',r:'DM20415E'},
  {p:'PENTAX MEDICAL VIDEO UPPER GI SCOPE',m:'EG17-J10',f:'HOYA CORPORATION',r:'DB6397E'},
  {p:'PENTAX MEDICAL VIDEO BRONCHOSCOPE',m:'EB11-J10, EB15-J10, EB19-J10',f:'HOYA CORPORATION',r:'DB6422E'},
  {p:'PENTAX MEDICAL VIDEO COLONOSCOPE',m:'EC38-V10CL',f:'PENTAX-AOHUA MEDICAL TECHNOLOGIES CO., LTD - CHINA',r:'DB6425E'},
  {p:'SERVO-AIR VENTILATOR SYSTEM',m:'SERVO AIR',f:'MAQUET CRITICAL CARE AB',r:'CRS_DB3221E'},
  {p:'PENTAX VIDEO COLONOSCOPE',m:'EC-3890LZi, EC34-I10L, EC38-I10L',f:'HOYA CORPORATION',r:'DB6473E'},
  {p:'PENTAX MEDICAL VIDEO DUODENOSCOPE',m:'ED32-i10',f:'HOYA CORPORATION',r:'DB6491E'},
  {p:'DIGITAL MEDICAL X-RAY RADIOGRAPHIC SYSTEM',m:'DP326B-3',f:'SHENZHEN ANGELL TECHNOLOGY CO., LTD.',r:'DBC0855E'},
  {p:'RADIOGRAPHIC X-RAY SYSTEM',m:'ACCURAY - 525R',f:'DK MEDICAL SYSTEMS CO., LTD.',r:'DBC0857E'},
  {p:'WIRELESS DIGITAL FLAT PANEL DETECTOR, MARCA: UNIVERSAL DR',m:'MARS1417V-TSI & MARS1717V-VSI',f:'IRAY KOREA LIMITED',r:'CRS_DB6529E'},
  {p:'PENTAX VIDEO UPPER G.I.',m:'EG27-i10 & EG29-i10',f:'HOYA CORPORATION',r:'DB6545E'},
  {p:'DIGITAL MEDICAL X-RAY RADIOGRAPHIC SYSTEM',m:'DTP580B-3',f:'SHENZHEN ANGELL TECHNOLOGY CO., LTD.',r:'DBC0869E'},
  {p:'PENTAX VIDEO UPPER G.I.',m:'EG-2990Zi',f:'HOYA CORPORATION',r:'DB6652E'},
  {p:'DIGITAL FLAT PANEL DETECTORS',m:'MARS1417V-TSI',f:'iRay Technology Taicang Ltd. - China',r:'CRS_DB6654E'},
  {p:'PENTAX MEDICAL VIDEO ESOPHAGOSCOPE',m:'EE17-J10',f:'HOYA CORPORATION',r:'DB6657E'},
  {p:'SISTEMA DE RADIOGRAFÍA DIGITAL DE ALTA FRECUENCIA',m:'PLX8500C MARCA: PERLOVE',f:'NANJING PERLOVE MEDICAL EQUIPMENT CO. LTD.',r:'CRS_DB6796E'},
  {p:'PENTAX ULTRASOUND UPPER G.I. VIDEOSCOPE',m:'EG-3270UK',f:'HOYA CORPORATION',r:'DB6824E'},
  {p:'WHOLE BODY X-RAY CT SYSTEM',m:'SUPRIA',f:'FUJIFILM CORPORATION',r:'DBC0904E'},
  {p:'DIGITAL DIAGNOSTIC MOBILE X-RAY SYSTEM',m:'GM85',f:'SAMSUNG ELECTRONICS CO., LTD',r:'DBC0908E'},
  {p:'WHOLE BODY X-RAY CT SYSTEM',m:'SCENARIA VIEW',f:'FUJIFILM CORPORATION',r:'DBC0909E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM',m:'ARIETTA 65',f:'FUJIFILM CORPORATION',r:'DB6959E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM',m:'ALOKA ARIETTA 850 y ALOKA LISENDO 880',f:'FUJIFILM CORPORATION',r:'DB6973E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM',m:'ARIETTA 50',f:'FUJIFILM CORPORATION',r:'DB6976E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM',m:'ARIETTA 750LE, ARIETTA 750 SE, ARIETTA 750VE',f:'FUJIFILM CORPORATION',r:'DB6992E'},
  {p:'ELIAN: DIGITAL DIAGNOSTIC X-RAY SYSTEM',m:'ELIAN',f:'OSKO, INC (USA)',r:'CRS_DBC0918E'},
  {p:'SISTEMA RADIOGRAFICO HORIZONTAL MRH, MARCA: CMR',m:'MRH Alfa, MRH II, MRH II E',f:'COMPAÑÍA MEXICANA DE RADIOLOGIA CGR - CMR',r:'CRS_DBC0926E'},
  {p:'SYMBIOZ CAM S398',m:'S_398_9001; S_398_9003',f:'SOPRO',r:'DB7080E'},
  {p:'ULTRASONIC DIAGNOSTIC EQUIPMENT',m:'F37',f:'FUJIFILM CORPORATION',r:'DB7118E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM',m:'F31',f:'FUJIFILM CORPORATION',r:'DB7116E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM',m:'FUTUS',f:'FUJIFILM CORPORATION',r:'DB7139E'},
  {p:'MR IMAGING SYSTEM',m:'AIRIS VENTO',f:'FUJIFILM CORPORATION',r:'DBC0937E'},
  {p:'RETROFIT KIT',m:'GR40CW',f:'SAMSUNG ELECTRONICS CO., LTD.',r:'DB7161E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM',m:'ARIETTA PRECISION',f:'FUJIFILM CORPORATION',r:'DB7259E'},
  {p:'SISTEMA DE RADIOGRAFIA MEDICA DIGITAL DE RAYOS X',m:'MTP65-D',f:'SHENZHEN ANGELL TECHNOLOGY CO., LTD.',r:'CRS_DBC0955E'},
  {p:'SOPRO 298 LED LIGHT SOURCE',m:'SOPRO 298 LED LIGHT SOURCE',f:'SOPRO',r:'DB7453E'},
  {p:'WIRELESS DIGITAL FLAT PANEL DETECTOR',m:'MARS1717V-VSI',f:'IRAY Technology Co., Ltd. - China',r:'CRS_DB7457E'},
  {p:'MR IMAGING SYSTEM',m:'ECHELON SMART',f:'FUJIFILM CORPORATION',r:'DBC0978E'},
  {p:'PLANMED VERITY',m:'PLANMED VERITY',f:'PLANMED Oy - FINLANDIA',r:'DBC0046E'},
  {p:'MAMMOGRAPHY X-RAY UNIT',m:'PLANMED CLARITY 2D & PLANMED CLARITY 3D',f:'PLANMED Oy - FINLANDIA',r:'DBC0989E'},
  {p:'MR IMAGING SYSTEM',m:'APERTO LUCENT',f:'FUJIFILM CORPORATION',r:'DBC0993E'},
  {p:'REMOTE CONTROLLED RADIOLOGY SYSTEMS',m:'PLATINUM & PLATINUM DRF',f:'APELEM SAS',r:'DBC0995E'},
  {p:'LCD MEDICAL MONITOR MARCA: SONY',m:'LMD-2735MD; LMD-2435MD',f:'SONY GLOBAL MANUFACTURING & OPERATIONS CORP',r:'CRS_DB3907E'},
  {p:'OPTIMA & OPTIMA DRF',m:'OPTIMA & OPTIMA DRF',f:'APELEM SAS',r:'DBC0998E'},
  {p:'SOPRO 698 INSUFFLATOR MARCA: COMEG',m:'S_698_002',f:'SOPRO',r:'DB7664E'},
  {p:'INSUFFLATION TUBING SET SOPRO',m:'607103L',f:'SOPRO',r:'DM25281E'},
  {p:'ULTRASOUND UPPER G.I VIDEOSCOPE',m:'EG-3870UTK, EG-3670URK',f:'HOYA CORPORATION',r:'DM14010E'},
  {p:'INSUFFLATOR',m:'S_640_2004 & S_640_3008',f:'SOPRO A COMPANY OF ACTEON GROUP (FRANCIA)',r:'DB7913E'},
  {p:'UBICAM FULL HD S191',m:'S191',f:'SOPRO A COMPANY OF ACTEON GROUP (FRANCIA)',r:'DB7922E'},
  {p:'SYMBIOZ CAM+ S198',m:'S198',f:'SOPRO A COMPANY OF ACTEON GROUP (FRANCIA)',r:'DB4320E'},
  {p:'VIDEO UPPER G.I. SCOPE',m:'EG-2990i & EG-2990K',f:'HOYA CORPORATION',r:'DM25889E'},
  {p:'PENTAX VIDEO CYSTOSCOPE',m:'ECY-1575K',f:'HOYA CORPORATION',r:'DB7983E'},
  {p:'ENDOSCOPIC IRRIGATION PUMPS MARCA: AOHUA',m:'AOHUA',f:'SHANGHAI AOHUA PHOTOELECTICITY ENDOSCOPE CO., LTD',r:'CRS_DB8059E'},
  {p:'ENDOSCOPIC CO2 INSUFFLATION DEVICE MARCA: AOHUA',m:'AOHUA',f:'SHANGHAI AOHUA PHOTOELECTICITY ENDOSCOPE CO., LTD',r:'CRS_DB8088E'},
  {p:'DIGITAL DIAGNOSTIC MOBILE X-RAY SYSTEM',m:'GM85, MARCA:SAMSUNG',f:'SAMSUNG ELECTRONICS',r:'DBC1051E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM',m:'ALOKA ARIETTA 850 MARCA: FUJIFILM',f:'FUJIFILM CORPORATION',r:'DB8177E'},
  {p:'PENTAX MEDICAL VIDEO PROCESSOR',m:'EPK-i8020c INSPIRA',f:'HOYA CORPORATION',r:'DB8237E'},
  {p:'PLAT PANEL DIGITAL X-RAY DETECTOR',m:'RSM 2430C',f:'DRTECH CORPORATION',r:'DB4694E'},
  {p:'PENTAX MEDICAL VIDEO PROCESSOR',m:'EPK-i7010',f:'HOYA CORPORATION',r:'DB4697E'},
  {p:'DUO FULL HD - S195 - CCU - US',m:'US',f:'SOPRO A COMPANY OF ACTEON GROUP (FRANCIA)',r:'DB8275E'},
  {p:'OMNITOM ELITE MODELO',m:'NL 5000',f:'NEUROLOGICA CORPORATION',r:'DBC1091E'},
  {p:'AQUASONIC® 100 ULTRASOUND TRANSMISSION GEL',m:'GEL',f:'PARKER LABORATORIES, INC',r:'CRS_DM15993E'},
  {p:'MOBILE X-RAY UNIT MODELO: MARCA: APELEM',m:'!M1',f:'SOLUTIONS FOR TOMORROW AB',r:'DBC1099E'},
  {p:'PENTAX MEDICAL VIDEO COLONOSCOPE',m:'EC38-i20cL',f:'HOYA CORPORATION',r:'DB8757E'},
  {p:'PENTAX MEDICAL VIDEO DUODENOSCOPE',m:'ED34-i10cT2',f:'HOYA CORPORATION',r:'DB8782E'},
  {p:'PENTAX PROGRAMA DE INTERPRETACION',m:'SMS-10',f:'HOYA CORPORATION',r:'DB8842E'},
  {p:'PENTAX MEDICAL VIDEO DUODENOSCOPE',m:'ED34-i10cT',f:'HOYA CORPORATION',r:'DB8952E'},
  {p:'PENTAX VIDEO UPPER G.I.',m:'EG29-i20cL',f:'HOYA CORPORATION',r:'DB8964E'},
  {p:'PENTAX MEDICAL VIDEO PROCESSOR',m:'EPK-i5500c',f:'HOYA CORPORATION',r:'DB5447E'},
  {p:'PENTAX MEDICAL VIDEO PROCESSOR',m:'EPK-V1500C',f:'PENTAX-AOHUA MEDICAL TECHNOLOGIES CO., LTD - CHINA',r:'DB5485E'},
  {p:'PENTAX MEDICAL VIDEO PROCESSOR',m:'EPK-3000',f:'HOYA CORPORATION',r:'DB5518E'},
  {p:'PENTAX NASO-PHARYNGO-LARYNGOSCOPE',m:'FNL-7RP3/10RP3; FNL-15RP3; FNL-13RAP/10RAP',f:'HOYA CORPORATION',r:'DB9343E'},
  {p:'PENTAX MEDICAL VIDEO NASO-PHARYNGO-LARYNGOSCOPE',m:'VNL8-J10; VNL15-J10; VNL 11-J10',f:'HOYA CORPORATION',r:'DB9510E'},
  {p:'PENTAX MEDICAL VIDEO COLONOSCOPE',m:'EC-3890i',f:'HOYA CORPORATION',r:'DB9510E'},
  {p:'PENTAX MEDICAL VIDEO COLONOSCOPE',m:'EC34-I10, EC38-I10, EC34-I10TF',f:'HOYA CORPORATION',r:'DM31072E'},
  {p:'PENTAX MEDICAL ULTRASOUND UPPER GI VIDEO SCOPE',m:'EG34-J10U, EG38-J10UT Y EG36-J10UR',f:'HOYA CORPORATION',r:'DB5843E'},
  {p:'PENTAX MEDICAL VIDEO UPPER GI SCOPE',m:'EG34-i10 & EG29-I10c',f:'HOYA CORPORATION',r:'DB6012E'},
  {p:'PENTAX MEDICAL VIDEO BRONCHOSCOPE',m:'EB11-J10, EB15-J10, EB19-J10',f:'HOYA CORPORATION',r:'CRS_DB6422E'},
  {p:'PENTAX VIDEO UPPER G.I.',m:'EG27-i10; EG29-I10; EG-2490K; EG-3490K; EG-3890TK',f:'HOYA CORPORATION',r:'CRS_DB6545E'},
  {p:'MEDICAL MONITOR LG:',m:'27HJ713C 27HJ712C 19HK312C 27HK510S 27HJ710S 32HL512D 32HL710S 32HL714S',f:'LG ELECTRONICS INC.',r:'CRS_DB6823E'},
  {p:'WHOLE BODY X-RAY CT SYSTEM',m:'SUPRIA',f:'FUJIFILM CORPORATION',r:'CRS_DBC0904E'},
  {p:'WHOLE BODY X-RAY CT SYSTEM',m:'SCENARIA VIEW',f:'FUJIFILM CORPORATION',r:'CRS_DBC0909E'},
  {p:'DIGITAL ULTRASOUND SYSTEM',m:'ARIETTA 65',f:'FUJIFILM CORPORATION',r:'CRS_DB6959E'},
  {p:'DIGITAL ULTRASOUND SYSTEM',m:'ARIETTA 750LE, ARIETTA 750 SE, ARIETTA 750VE',f:'FUJIFILM CORPORATION',r:'CRS_DB6992E'},
  {p:'SISTEMA RADIOGRÁFICO HORIZONTAL',m:'SISTEMA RADIOGRÁFICO HORIZONTAL MRH',f:'COMPAÑÍA MEXICANA DE RADIOLOGIA CGR - CMR',r:'CRS_DBC0926E'},
  {p:'SYMBIOZ CAM S398',m:'S_398_9001; S_398_9003',f:'COMEG',r:'CRS_DB7080E'},
  {p:'MRI IMAGIN SYSTEM',m:'AIRIS VENTO',f:'FUJIFILM CORPORATION',r:'CRS_DBC0937E'},
  {p:'ULTRASOUND DIAGNOSTIC SYSTEM',m:'CETUS 40,DANUS 30, FINUS 50, FINUS 70',f:'FOCUS AND FUSION',r:'CRS_DB7420E'},
  {p:'SOPRO 298 LED LIGHT SOURCE',m:'S_700382; S_700384; S_700215; S_700216; 402046',f:'SOPRO',r:'CRS_DB7453E'},
  {p:'MAMMOGRAPHY X-RAY UNIT',m:'PLANMED CLARITY 2D & PLANMED CLARITY 3D',f:'PLANMED Oy - FINLANDIA',r:'CRS_DBC0989E'},
  {p:'REMOTE CONTROLLED RADIOLOGY SYSTEM',m:'PLATINUM, PLATINUM DRF',f:'APELEM SAS',r:'CRS_DBC0995E'},
  {p:'INSUFFLATION TUBING SET SOPRO',m:'607103L',f:'SOPRO COMEG',r:'CRS_DM25281E'},
  {p:'PENTAX MEDICAL VIDEO UPPER GI SCOPE',m:'EG-2990I; EG-2990K',f:'HOYA CORPORATION',r:'CRS_DM25889E'},
  {p:'PENTAX MEDICAL VIDEO PROCESSOR',m:'EPK-I7010',f:'HOYA CORPORATION',r:'CRS_DB4697E'},
  {p:'DENSITOMETRO',m:'STRATOS; STRATOS DR',f:'AEPELM SAS',r:'CRS_DBC1074E'},
  {p:'MOBILE X-RAY UNIT MODELO: MARCA: APELEM',m:'!M1',f:'SOLUTIONS FOR TOMORROW AB',r:'CRS_DBC1099E'},
  {p:'PENTAX MEDICAL VIDEO COLONOSCOPE',m:'EC38-i20cL',f:'HOYA CORPORATION',r:'CRS_DB8757E'},
  {p:'PENTAX VIDEO UPPER G.I.',m:'EG29-i20cL',f:'HOYA CORPORATION',r:'CRS_DB8964E'},
  {p:'MR IMAGING SYSTEM',m:'ECHELON SYNERGY, MARCA: FUJIFILM',f:'FUJIFILM CORPORATION',r:'CRS_DB8651E'},
  {p:'PENTAX MEDICAL VIDEO PROCESSOR',m:'EPK-I550',f:'HOYA CORPORATION',r:'CRS_DB5447E'},
  {p:'EVO R+ FP',m:'FP',f:'TECHNIX SPA',r:'DBC1167E'},
  {p:'PENTAX MEDICAL VIDEO PROCESSOR',m:'EPK-3000',f:'HOYA CORPORATION',r:'CRS_DB5518E'},
  {p:'PERFORM X RADIOGRAPHIC SYSTEM (CAMARGUE)',m:'F-100;F-200;F-300; C-200; C300',f:'CONTROL X',r:'DBC1179E'},
  {p:'ULTRASOUND DIAGNOSTIC SYSTEM',m:'CETUS 40,DANUS 30, FINUS 50, FINUS 70',f:'FOCUS AND FUSION',r:'DB9271E'},
  {p:'PENTAX MEDICAL VIDEO NASO-PHARYNGO-LARYNGOSCOPE,',m:'VNL8-J10; VNL15-J10; VNL 11-J10',f:'HOYA CORPORATION',r:'CRS_DB9510E'},
  {p:'PENTAX MEDICAL VIDEO COLONOSCOPE',m:'EC34-I10, EC38-I10, EC34-I10TF',f:'HOYA CORPORATION',r:'CRS_DM31072E'},
  {p:'HIGH-PRESSURE INJECTOR',m:'SinoPower-S; SinoPower-D',f:'SINO MEDICAL-DEVICE TECHNOLOGY CO., LTD. - CHINA',r:'DM31351E'},
  {p:'SISTEMA RADIOGRÁFICO MÓVIL',m:'RX 320 BD, RX 320 B, RX 320 D, RX 320',f:'COMPAÑÍA MEXICANA DE RADIOLOGIA CGR - CMR',r:'CRS_DBC0778E'},
  {p:'X-RAY COMPUTED TOMOGRAPHY SYSTEM',m:'ANATOM P428',f:'NANJING ANKE MEDICAL TECHNOLOGY CO., LTD',r:'DBC1218E'},
  {p:'BODY TOM 64',m:'NL4100',f:'NEUROLOGICA CORPORATION',r:'DBC1219E'},
  {p:'PENTAX MEDICAL ULTRASOUND UPPER GI VIDEO SCOPE',m:'EG34-J10U, EG38-J10UT Y EG36-J10UR',f:'HOYA CORPORATION',r:'CRS_DB5843E'},
  {p:'DIAGNOSTIC ULTRASOUND SYSTEM ARIETTA 650',m:'ARIETTA 650',f:'FUJIFILM CORPORATION',r:'CRS_DB10113E'}
];
function catalogDisplay(e){ return e.m ? `${e.p} — ${e.m}` : e.p; }
const CATALOG_MAP = new Map(PRODUCT_CATALOG.map(e => [catalogDisplay(e).toUpperCase(), e]));
const CATALOG_DATALIST_HTML = `<datalist id="pdm-catalog">${PRODUCT_CATALOG.map(e=>`<option value="${escapeHtml(catalogDisplay(e))}">`).join('')}</datalist>`;
function onProductoAutofill(el){
  const entry = CATALOG_MAP.get(el.value.trim().toUpperCase());
  if(!entry) return;
  const scope = el.closest('.item-row') || el.form;
  if(!scope) return;
  const rsField = scope.querySelector('[name="rs[]"], [name="registroSanitario"]');
  if(rsField) rsField.value = entry.r;
}

/* ===================== Almacenamiento ===================== */
const DB_NAME = 'dm_control_bpa';
const DB_VERSION = 1;
let db;
function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains('movimientos')) d.createObjectStore('movimientos', {keyPath:'id'});
      if(!d.objectStoreNames.contains('registros')) d.createObjectStore('registros', {keyPath:'id'});
      if(!d.objectStoreNames.contains('config')) d.createObjectStore('config', {keyPath:'key'});
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}
function idbGetAll(store){
  return new Promise((resolve, reject) => {
    try{
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }catch(err){ reject(err); }
  });
}
function idbPut(store, obj){
  return new Promise((resolve, reject) => {
    try{
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(obj);
      tx.oncomplete = () => resolve(obj);
      tx.onerror = () => reject(tx.error);
    }catch(err){ reject(err); }
  });
}
function idbDelete(store, id){
  return new Promise((resolve, reject) => {
    try{
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }catch(err){ reject(err); }
  });
}
function idbClear(store){
  return new Promise((resolve, reject) => {
    try{
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }catch(err){ reject(err); }
  });
}
// ponytail: un solo usuario local, sin backend
const memDB = {movimientos:[], registros:[], config:[]};
const Store = {
  persistent: true,
  async init(){
    try{ await openDB(); }
    catch(err){ console.error('IndexedDB no disponible', err); this.persistent = false; }
  },
  async getAll(name){ return this.persistent ? idbGetAll(name) : (memDB[name] || []); },
  async put(name, obj){
    if(this.persistent) return idbPut(name, obj);
    memDB[name] = memDB[name] || [];
    const key = name==='config' ? 'key' : 'id';
    const i = memDB[name].findIndex(x => x[key]===obj[key]);
    if(i>-1) memDB[name][i]=obj; else memDB[name].push(obj);
    return obj;
  },
  async delete(name, id){
    if(this.persistent) return idbDelete(name, id);
    memDB[name] = (memDB[name]||[]).filter(x => x.id!==id);
  },
  async clear(name){
    if(this.persistent) return idbClear(name);
    memDB[name] = [];
  }
};

/* ===================== Estado ===================== */
let state = { movimientos: [], registros: [], config: {}, view: 'dashboard', filtro: '' };

async function loadState(){
  state.movimientos = await Store.getAll('movimientos');
  state.registros = await Store.getAll('registros');
  const cfg = await Store.getAll('config');
  state.config = Object.fromEntries(cfg.map(c => [c.key, c.value]));
}
async function saveMovimiento(m){
  m.actualizadoEn = new Date().toISOString();
  await Store.put('movimientos', m);
  const i = state.movimientos.findIndex(x => x.id===m.id);
  if(i>-1) state.movimientos[i]=m; else state.movimientos.push(m);
  queueAllSync();
}
async function deleteMovimiento(id){
  await Store.delete('movimientos', id);
  state.movimientos = state.movimientos.filter(x => x.id!==id);
  queueAllSync();
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
  const alerts = [];
  const threshold = state.config.alertaDiasRS ?? 90;
  state.registros.forEach(r => {
    const dd = daysFromToday(r.fechaVencimiento);
    if(dd===null) return;
    if(dd<0) alerts.push({msg:`RS ${r.numero} (${r.producto}) venció hace ${Math.abs(dd)} días`, sev:'bad'});
    else if(dd<=threshold) alerts.push({msg:`RS ${r.numero} (${r.producto}) vence en ${dd} días`, sev:'warn'});
  });
  // ponytail: 3 días de cuarentena como umbral mínimo de alerta
  state.movimientos.filter(m=>m.tipo==='ingreso' && m.estadoLote==='Cuarentena').forEach(m => {
    const dd = daysFromToday(m.fecha);
    if(dd!==null && dd<=-3) alerts.push({msg:`Lote ${m.loteSerie||'s/n'} (${m.producto}) en cuarentena hace ${Math.abs(dd)} días`, sev:'warn'});
  });
  Object.values(groupStock(state.movimientos)).forEach(s => {
    if(s.saldo<0) alerts.push({msg:`Lote ${s.loteSerie||'s/n'} (${s.producto}): salida supera ingreso por ${Math.abs(s.saldo)}`, sev:'bad'});
  });
  state.movimientos.filter(m=>m.faltante).forEach(m => {
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
  const k = calcKPIs(state.movimientos);
  const alerts = computeAlerts();
  const recent = [...state.movimientos].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).slice(0,8);
  return `
    <div class="view-head">
      <div class="vhl">
        <h1>Panel</h1>
        <span class="subtitle">BPA · Control de importación de dispositivos médicos</span>
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
          : `<table class="data-table compact"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Lote</th><th>Cant.</th></tr></thead>
             <tbody>${recent.map(m=>`<tr><td>${fmtDate(m.fecha)}</td><td>${m.tipo==='ingreso'?'Ingreso':'Salida'}</td><td>${escapeHtml(m.producto||'')}</td><td class="mono">${escapeHtml(m.loteSerie||'—')}</td><td>${m.cantidad}</td></tr>`).join('')}</tbody></table>`}
      </div>
    </div>`;
}

function renderIngresos(){
  const q = (state.filtro||'').toLowerCase();
  let rows = state.movimientos.filter(m=>m.tipo==='ingreso');
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
      ? '<p class="empty">No hay ingresos registrados. Cada ítem recibido entra primero a Cuarentena hasta la validación del Director Técnico.</p>'
      : `<table class="data-table">
          <thead><tr><th>Fecha</th><th>DUA</th><th>Proveedor</th><th>Producto</th><th>RS</th><th>Lote/Serie</th><th>Cant.</th><th>Inspección</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows.map(m=>`<tr>
            <td>${fmtDate(m.fecha)}</td><td class="mono">${escapeHtml(m.dua||'—')}</td><td>${escapeHtml(m.proveedor||'')}</td>
            <td>${escapeHtml(m.producto||'')}</td><td class="mono">${escapeHtml(m.registroSanitario||'—')}</td>
            <td class="mono">${escapeHtml(m.loteSerie||'—')}</td><td>${m.cantidad} ${escapeHtml(m.unidad||'')}</td>
            <td>${escapeHtml(m.estadoInspeccion||'Pendiente')}</td><td>${stampHtml(m.estadoLote)}</td>
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
  let rows = state.movimientos.filter(m=>m.tipo==='salida');
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
      : `<table class="data-table">
          <thead><tr><th>Fecha</th><th>OC/PO</th><th>Proveedor</th><th>Producto</th><th>RS</th><th>Lote/Serie</th><th>Cant.</th><th>Destino</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows.map(m=>`<tr>
            <td>${fmtDate(m.fecha)}</td><td class="mono">${escapeHtml([m.oc,m.po].filter(Boolean).join(' / ')||'—')}</td>
            <td>${escapeHtml(m.proveedor||'')}</td><td>${escapeHtml(m.producto||'')}</td>
            <td class="mono">${escapeHtml(m.registroSanitario||'—')}</td><td class="mono">${escapeHtml(m.loteSerie||'—')}</td>
            <td>${m.cantidad} ${escapeHtml(m.unidad||'')}</td><td>${escapeHtml(m.destinoFinal||'—')}</td>
            <td>${m.faltante?'<span class="badge badge-bad">Discrepancia</span>':'<span class="badge badge-ok">OK</span>'}</td>
            <td class="row-actions"><button class="link" onclick="App.openEditMovModal('${m.id}')">Editar</button><button class="link bad" onclick="App.removeMov('${m.id}')">Eliminar</button></td>
          </tr>`).join('')}</tbody>
        </table>`}`;
}

function renderCuarentena(){
  const rows = state.movimientos.filter(m=>m.tipo==='ingreso' && m.estadoLote==='Cuarentena').sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  return `
    <div class="view-head">
      <div class="vhl"><h1>Cuarentena</h1><span class="subtitle">Pendiente de validación del Director Técnico</span></div>
    </div>
    ${rows.length===0
      ? '<p class="empty">No hay lotes en cuarentena.</p>'
      : `<table class="data-table">
          <thead><tr><th>Fecha ingreso</th><th>Producto</th><th>RS</th><th>Lote/Serie</th><th>Cant.</th><th>Días en cuarentena</th><th></th></tr></thead>
          <tbody>${rows.map(m=>{
            const dd = daysFromToday(m.fecha);
            return `<tr>
              <td>${fmtDate(m.fecha)}</td><td>${escapeHtml(m.producto||'')}</td>
              <td class="mono">${escapeHtml(m.registroSanitario||'—')}</td>
              <td class="mono">${escapeHtml(m.loteSerie||'—')}</td><td>${m.cantidad}</td>
              <td>${dd!==null?Math.abs(dd):'—'}</td>
              <td class="row-actions"><button class="link" onclick="App.openLiberarModal('${m.id}','Liberado')">Liberar</button><button class="link bad" onclick="App.openLiberarModal('${m.id}','Rechazado')">Rechazar</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>`}`;
}

function renderKardex(){
  const q = (state.filtro||'').toLowerCase();
  const stock = groupStock(state.movimientos);
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
      const movs = state.movimientos.filter(m => (m.loteSerie||m.producto||'(sin identificar)')===k).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
      let saldo = 0;
      const rows = movs.map(m=>{
        saldo += m.tipo==='ingreso' ? (Number(m.cantidad)||0) : -(Number(m.cantidad)||0);
        return `<tr class="${m.tipo}">
          <td>${fmtDate(m.fecha)}</td><td>${m.tipo==='ingreso'?'Ingreso':'Salida'}</td>
          <td>${escapeHtml(m.proveedor||'')}</td><td>${m.tipo==='ingreso'?'+':'-'}${m.cantidad}</td><td>${saldo}</td>
          <td>${m.tipo==='ingreso'?stampHtml(m.estadoLote):(m.faltante?'<span class="badge badge-bad">Discrepancia</span>':'')}</td>
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
  const q = (state.filtro||'').toLowerCase();
  let rows = state.registros;
  if(q) rows = rows.filter(r => [r.numero,r.producto,r.titular].join(' ').toLowerCase().includes(q));
  rows = [...rows].sort((a,b)=>(a.fechaVencimiento||'').localeCompare(b.fechaVencimiento||''));
  return `
    <div class="view-head">
      <div class="vhl"><h1>Registros Sanitarios</h1></div>
      <div class="vha">
        <input class="search" placeholder="Buscar número RS, producto, titular..." value="${escapeHtml(state.filtro||'')}" oninput="App.setFiltro(this.value)">
        <button class="btn btn-primary" onclick="App.openRegistroModal()">+ Nuevo RS</button>
      </div>
    </div>
    ${rows.length===0
      ? '<p class="empty">Sin registros sanitarios cargados todavía.</p>'
      : `<table class="data-table">
          <thead><tr><th>Número RS</th><th>Producto</th><th>Titular</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
          <tbody>${rows.map(r=>`<tr>
            <td class="mono">${escapeHtml(r.numero||'')}</td><td>${escapeHtml(r.producto||'')}</td><td>${escapeHtml(r.titular||'')}</td>
            <td>${fmtDate(r.fechaEmision)}</td><td>${fmtDate(r.fechaVencimiento)}</td><td>${rsEstadoBadge(r)}</td>
            <td class="row-actions"><button class="link" onclick="App.openRegistroModal('${r.id}')">Editar</button><button class="link bad" onclick="App.removeRegistro('${r.id}')">Eliminar</button></td>
          </tr>`).join('')}</tbody>
        </table>`}`;
}

function renderSyncSection(){
  if(syncStatus==='unsupported'){
    return `
      <div class="section-block">
        <h2>Carpeta local (Drive / OneDrive Desktop)</h2>
        <p>Tu navegador no soporta vincular archivos directamente (esta función requiere Chrome, Edge u otro navegador basado en Chromium). Usa Google Drive de arriba o el respaldo manual de abajo.</p>
      </div>`;
  }
  if(syncStatus==='linked'){
    return `
      <div class="section-block">
        <h2>Carpeta local (Drive / OneDrive Desktop) <span class="badge badge-ok">Vinculado</span></h2>
        <p>Archivo: <strong class="mono">${escapeHtml(syncFileName)}</strong>${lastSyncAt?` · Última sincronización: ${fmtRelative(lastSyncAt)}`:''}</p>
        <p class="hint">Alternativa local a Google Drive: escribe directamente en un archivo de este equipo. Si esa carpeta está sincronizada con Drive, OneDrive o Dropbox Desktop, la nube se actualiza sola.</p>
        <div class="section-actions">
          <button class="btn btn-ghost" onclick="App.syncNow()">Sincronizar ahora</button>
          <button class="btn btn-ghost" onclick="App.unlinkSyncFile()">Desvincular</button>
        </div>
      </div>`;
  }
  if(syncStatus==='reconnect'){
    return `
      <div class="section-block">
        <h2>Carpeta local (Drive / OneDrive Desktop) <span class="badge badge-warn">Reconexión necesaria</span></h2>
        <p>Archivo vinculado: <strong class="mono">${escapeHtml(syncFileName)}</strong>. Tu navegador pide confirmar el permiso de nuevo en esta sesión antes de seguir sincronizando.</p>
        <div class="section-actions">
          <button class="btn btn-primary" onclick="App.reconnectSync()">Reconectar</button>
          <button class="btn btn-ghost" onclick="App.unlinkSyncFile()">Desvincular</button>
        </div>
      </div>`;
  }
  return `
    <div class="section-block">
      <h2>Carpeta local (Drive / OneDrive Desktop)</h2>
      <p>Alternativa a Google Drive: vincula un archivo dentro de una carpeta que ya sincronices en este equipo (Drive, OneDrive o Dropbox Desktop). Útil si prefieres no iniciar sesión con Google en este dispositivo.</p>
      <div class="section-actions"><button class="btn btn-ghost" onclick="App.linkSyncFile()">Vincular carpeta local</button></div>
    </div>`;
}

function renderGoogleDriveSection(){
  if(driveSyncStatus==='linked'){
    return `
      <div class="section-block">
        <h2>Google Drive <span class="badge badge-ok">Conectado</span></h2>
        <p>El respaldo se guarda en la carpeta de Drive del proyecto${driveLastSyncAt?` · Última sincronización: ${fmtRelative(driveLastSyncAt)}`:''}.</p>
        <p class="hint">Funciona desde cualquier dispositivo con tu cuenta de Google — no depende de tener Drive instalado en este equipo.</p>
        <div class="section-actions">
          <button class="btn btn-ghost" onclick="App.driveSyncNow()">Sincronizar ahora</button>
          <a class="btn btn-ghost" href="https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}" target="_blank" rel="noopener">Abrir carpeta en Drive</a>
          <button class="btn btn-ghost" onclick="App.unlinkGoogleDrive()">Desvincular</button>
        </div>
      </div>`;
  }
  return `
    <div class="section-block">
      <h2>Google Drive</h2>
      <p>Conecta tu cuenta de Google para guardar el respaldo directamente en la nube, en la carpeta de Drive de este proyecto. Se actualiza solo con cada ingreso, salida o registro sanitario.</p>
      <p class="hint">La primera vez te pedirá iniciar sesión y autorizar acceso solo a este archivo (no a todo tu Drive). Requiere conexión a internet.</p>
      <div class="section-actions"><button class="btn btn-primary" onclick="App.linkGoogleDrive()">Conectar Google Drive</button></div>
    </div>`;
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
      ${renderGoogleDriveSection()}
      ${renderSyncSection()}
      <div class="section-block">
        <h2>Respaldo manual</h2>
        <p class="hint">Si no usas la sincronización automática de arriba, descarga un respaldo de tanto en tanto y guárdalo tú mismo en un lugar seguro.</p>
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
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view===state.view));
  let html;
  switch(state.view){
    case 'ingresos': html = renderIngresos(); break;
    case 'salidas': html = renderSalidas(); break;
    case 'cuarentena': html = renderCuarentena(); break;
    case 'kardex': html = renderKardex(); break;
    case 'registros': html = renderRegistros(); break;
    case 'exportar': html = renderExportar(); break;
    default: html = renderDashboard();
  }
  $('#view-root').innerHTML = html;
  const alerts = computeAlerts();
  const ac = alerts.length;
  $('#alert-count').textContent = ac;
  const bell = $('#alert-bell-btn');
  if(bell) bell.classList.toggle('has-alerts', ac > 0);
  const sfdt = $('#sf-dt');
  if(sfdt) sfdt.textContent = state.config.dt?.nombre || 'DT sin configurar';
  const labels = {dashboard:'Panel',ingresos:'Ingresos',salidas:'Salidas',cuarentena:'Cuarentena',kardex:'Kardex',registros:'Registros Sanitarios',exportar:'Exportar'};
  const bc = $('#view-bc');
  if(bc) bc.textContent = labels[state.view] || '';
}

/* ===================== Formularios: Ingreso ===================== */
function itemRowIngresoHtml(){
  return `<div class="item-row">
    <input name="producto[]" placeholder="Producto (genérico, marca, modelo)" list="pdm-catalog" oninput="App.onProductoAutofill(this)" required>
    <input name="rs[]" placeholder="RS" class="mono">
    <input name="lote[]" placeholder="Lote/Serie" class="mono">
    <input name="cantidad[]" type="number" step="any" min="0" placeholder="Cant." required>
    <input name="unidad[]" placeholder="Unidad" value="unidad">
    <select name="condicion[]"><option>Ambiente</option><option>Refrigerado (2-8°C)</option><option>Congelado (-20°C)</option></select>
    <select name="inspeccion[]"><option>Pendiente</option><option>Conforme</option><option>No conforme</option></select>
    <button type="button" class="icon-btn" onclick="this.closest('.item-row').remove()" aria-label="Quitar ítem">✕</button>
  </div>`;
}
function itemRowSalidaHtml(){
  return `<div class="item-row">
    <input name="producto[]" placeholder="Producto" list="pdm-catalog" oninput="App.onProductoAutofill(this)" required>
    <input name="rs[]" placeholder="RS" class="mono">
    <input name="lote[]" placeholder="Lote/Serie" class="mono">
    <input name="cantidad[]" type="number" step="any" min="0" placeholder="Cant." required>
    <input name="unidad[]" placeholder="Unidad" value="unidad">
    <button type="button" class="icon-btn" onclick="this.closest('.item-row').remove()" aria-label="Quitar ítem">✕</button>
  </div>`;
}
function addItemRow(containerId, templateFn){
  $('#'+containerId).insertAdjacentHTML('beforeend', templateFn());
}

function openIngresoModal(){
  openModal('Nuevo ingreso', `
    <form onsubmit="App.submitIngreso(event)">
      <div class="grid2">
        <label>Fecha de ingreso<input type="date" name="fecha" value="${todayStr()}" required></label>
        <label>Fecha de llegada (aduana)<input type="date" name="fechaLlegada"></label>
        <label>DUA<input name="dua"></label>
        <label>Guía<input name="guia"></label>
        <label>Proveedor<input name="proveedor" required></label>
        <label>Responsable de recepción<input name="responsable" value="${escapeHtml(state.config.dt?.nombre||'')}"></label>
      </div>
      <div class="grid2">
        <label>Partida (origen)<textarea name="partida" rows="2"></textarea></label>
        <label>Llegada (almacén destino)<textarea name="llegada" rows="2"></textarea></label>
      </div>
      <h3>Ítems recibidos</h3>
      <p class="hint">Escribe para buscar en el catálogo de productos autorizados (DIGEMID) o ingresa uno nuevo libremente.</p>
      ${CATALOG_DATALIST_HTML}
      <div id="items-ingreso">${itemRowIngresoHtml()}</div>
      <button type="button" class="btn btn-ghost" onclick="App.addItemRow('items-ingreso', App.itemRowIngresoHtml)">+ Agregar ítem</button>
      <p class="hint">Cada ítem ingresará en estado <strong>Cuarentena</strong> hasta que el Director Técnico lo libere.</p>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Registrar ingreso</button></div>
    </form>`);
}
async function submitIngreso(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const productos = fd.getAll('producto[]'), rss = fd.getAll('rs[]'), lotes = fd.getAll('lote[]'),
        cantidades = fd.getAll('cantidad[]'), unidades = fd.getAll('unidad[]'),
        condiciones = fd.getAll('condicion[]'), inspecciones = fd.getAll('inspeccion[]');
  if(productos.length===0){ showToast('Agrega al menos un producto.', 'bad'); return; }
  const eventoId = uid();
  const header = {
    fecha: fd.get('fecha'), fechaLlegada: fd.get('fechaLlegada'), dua: fd.get('dua'),
    guia: fd.get('guia'), proveedor: fd.get('proveedor'), partida: fd.get('partida'),
    llegada: fd.get('llegada'), responsable: fd.get('responsable')
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
    <form onsubmit="App.submitSalida(event)">
      <div class="grid2">
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
      <label>Destino final / Cliente<input name="destinoFinal"></label>
      <h3>Ítems despachados</h3>
      <p class="hint">Escribe para buscar en el catálogo de productos autorizados (DIGEMID) o ingresa uno nuevo libremente.</p>
      ${CATALOG_DATALIST_HTML}
      <div id="items-salida">${itemRowSalidaHtml()}</div>
      <button type="button" class="btn btn-ghost" onclick="App.addItemRow('items-salida', App.itemRowSalidaHtml)">+ Agregar ítem</button>
      <label>Observaciones<textarea name="observaciones" rows="2"></textarea></label>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Registrar salida</button></div>
    </form>`);
}
async function submitSalida(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const productos = fd.getAll('producto[]'), rss = fd.getAll('rs[]'), lotes = fd.getAll('lote[]'),
        cantidades = fd.getAll('cantidad[]'), unidades = fd.getAll('unidad[]');
  if(productos.length===0){ showToast('Agrega al menos un producto.', 'bad'); return; }
  const stock = groupStock(state.movimientos);
  const header = {
    fecha: fd.get('fecha'), oc: fd.get('oc'), po: fd.get('po'), proveedor: fd.get('proveedor'),
    guia: fd.get('guia'), partida: fd.get('partida'), llegada: fd.get('llegada'),
    destinoFinal: fd.get('destinoFinal'), responsable: fd.get('responsable'), observaciones: fd.get('observaciones')
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
  openModal(isIngreso?'Editar ingreso':'Editar salida', `
    <form onsubmit="App.submitEditMov(event,'${id}')">
      <div class="grid2">
        <label>Fecha<input type="date" name="fecha" value="${m.fecha||''}" required></label>
        <label>Proveedor<input name="proveedor" value="${escapeHtml(m.proveedor||'')}" ${isIngreso?'required':''}></label>
        ${isIngreso
          ? `<label>Fecha de llegada<input type="date" name="fechaLlegada" value="${m.fechaLlegada||''}"></label><label>DUA<input name="dua" value="${escapeHtml(m.dua||'')}"></label>`
          : `<label>OC<input name="oc" value="${escapeHtml(m.oc||'')}"></label><label>PO<input name="po" value="${escapeHtml(m.po||'')}"></label>`}
        <label>Guía<input name="guia" value="${escapeHtml(m.guia||'')}"></label>
        <label>Responsable<input name="responsable" value="${escapeHtml(m.responsable||'')}"></label>
      </div>
      <label>Producto<input name="producto" value="${escapeHtml(m.producto||'')}" list="pdm-catalog" oninput="App.onProductoAutofill(this)" required></label>
      ${CATALOG_DATALIST_HTML}
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
}
async function submitEditMov(e, id){
  e.preventDefault();
  const fd = new FormData(e.target);
  const m = state.movimientos.find(x=>x.id===id);
  if(!m) return;
  ['fecha','fechaLlegada','dua','oc','po','guia','proveedor','partida','llegada','responsable','producto','registroSanitario','loteSerie','condicionAlmacenamiento','estadoInspeccion','destinoFinal','observaciones'].forEach(f => {
    if(fd.has(f)) m[f] = fd.get(f);
  });
  m.cantidad = Number(fd.get('cantidad'))||0;
  m.faltante = fd.get('faltante')==='on';
  await saveMovimiento(m);
  closeModal(); render(); showToast('Cambios guardados.', 'ok');
}
async function removeMov(id){
  if(!confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;
  await deleteMovimiento(id); render(); showToast('Movimiento eliminado.', 'warn');
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
function openRegistroModal(id){
  const r = id ? state.registros.find(x=>x.id===id) : {};
  const editId = id || '';
  openModal(id?'Editar registro sanitario':'Nuevo registro sanitario', `
    <form onsubmit="App.submitRegistro(event,'${editId}')">
      <label>Número de RS<input name="numero" value="${escapeHtml(r.numero||'')}" required></label>
      <label>Producto (denominación común)<input name="producto" value="${escapeHtml(r.producto||'')}" required></label>
      <label>Titular del registro<input name="titular" value="${escapeHtml(r.titular||'')}"></label>
      <div class="grid2">
        <label>Fecha de emisión<input type="date" name="fechaEmision" value="${r.fechaEmision||''}"></label>
        <label>Fecha de vencimiento<input type="date" name="fechaVencimiento" value="${r.fechaVencimiento||''}" required></label>
      </div>
      <label>Observaciones<textarea name="observaciones" rows="2">${escapeHtml(r.observaciones||'')}</textarea></label>
      <div class="modal-actions"><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>`);
}
async function submitRegistro(e, id){
  e.preventDefault();
  const fd = new FormData(e.target);
  const r = {
    id: id || uid(), numero: fd.get('numero'), producto: fd.get('producto'), titular: fd.get('titular'),
    fechaEmision: fd.get('fechaEmision'), fechaVencimiento: fd.get('fechaVencimiento'),
    observaciones: fd.get('observaciones'), creadoEn: new Date().toISOString()
  };
  await Store.put('registros', r);
  const i = state.registros.findIndex(x=>x.id===r.id);
  if(i>-1) state.registros[i]=r; else state.registros.push(r);
  queueAllSync();
  closeModal(); setView('registros'); showToast('Registro sanitario guardado.', 'ok');
}
async function removeRegistro(id){
  if(!confirm('¿Eliminar este registro sanitario? Esta acción no se puede deshacer.')) return;
  await Store.delete('registros', id);
  state.registros = state.registros.filter(x=>x.id!==id);
  queueAllSync();
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
  await Store.put('config', {key:'dt', value:dt});
  await Store.put('config', {key:'alertaDiasRS', value:alertaDias});
  state.config.dt = dt; state.config.alertaDiasRS = alertaDias;
  closeModal(); render(); showToast('Datos del Director Técnico guardados.', 'ok');
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
    {label:'Número RS', value:'numero'}, {label:'Producto', value:'producto'}, {label:'Titular', value:'titular'},
    {label:'Emisión', value:'fechaEmision'}, {label:'Vencimiento', value:'fechaVencimiento'}, {label:'Observaciones', value:'observaciones'}
  ];
  downloadFile(`registros_sanitarios_${todayStr()}.csv`, toCSV(state.registros, headers), 'text/csv');
}
function exportBackup(){
  const data = {movimientos: state.movimientos, registros: state.registros, config: state.config, exportadoEn: new Date().toISOString()};
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
      await Store.clear('movimientos'); await Store.clear('registros');
      for(const m of data.movimientos||[]) await Store.put('movimientos', m);
      for(const r of data.registros||[]) await Store.put('registros', r);
      if(data.config?.dt) await Store.put('config', {key:'dt', value:data.config.dt});
      if(data.config?.alertaDiasRS) await Store.put('config', {key:'alertaDiasRS', value:data.config.alertaDiasRS});
      await loadState();
      render();
      queueAllSync();
      showToast('Respaldo importado correctamente.', 'ok');
    }catch(err){
      console.error(err);
      showToast('No se pudo leer el archivo de respaldo.', 'bad');
    }
  };
  reader.readAsText(file);
}

/* ===================== Sincronización con Drive / OneDrive ===================== */
// ponytail: esta app no tiene servidor ni credenciales OAuth (sería romper "100% local"),
// así que en vez de simular una integración con la API de Google Drive usamos la File System
// Access API del navegador para escribir directamente en un archivo del disco. Si ese archivo
// vive dentro de la carpeta que ya sincroniza Google Drive/OneDrive/Dropbox en este equipo,
// el propio cliente de escritorio sube la copia a la nube — sin pasos manuales ni backend.
// Solo funciona en navegadores basados en Chromium (Chrome, Edge, Brave, Opera).
const FS_SUPPORTED = 'showSaveFilePicker' in window;
let syncHandle = null;
let syncStatus = 'unlinked'; // 'unsupported' | 'unlinked' | 'linked' | 'reconnect'
let syncFileName = '';
let lastSyncAt = null;
let syncTimer = null;

function fmtRelative(date){
  if(!date) return '';
  const diff = Math.max(0, Math.round((Date.now()-date.getTime())/1000));
  if(diff<5) return 'justo ahora';
  if(diff<60) return `hace ${diff} s`;
  if(diff<3600) return `hace ${Math.round(diff/60)} min`;
  if(diff<86400) return `hace ${Math.round(diff/3600)} h`;
  return `hace ${Math.round(diff/86400)} d`;
}

async function initSyncStatus(){
  if(!FS_SUPPORTED){ syncStatus='unsupported'; return; }
  const handle = state.config.syncHandle;
  if(!handle){ syncStatus='unlinked'; return; }
  syncFileName = handle.name || 'respaldo_bpa.json';
  try{
    const perm = await handle.queryPermission({mode:'readwrite'});
    if(perm==='granted'){ syncHandle = handle; syncStatus='linked'; }
    else { syncStatus='reconnect'; }
  }catch(err){
    console.error('No se pudo verificar el permiso del archivo vinculado', err);
    syncStatus='reconnect';
  }
}

function syncSnapshot(){
  return {
    movimientos: state.movimientos, registros: state.registros,
    config: {dt: state.config.dt, alertaDiasRS: state.config.alertaDiasRS},
    exportadoEn: new Date().toISOString()
  };
}
async function writeSyncFile(){
  if(!syncHandle) return;
  try{
    const perm = await syncHandle.queryPermission({mode:'readwrite'});
    if(perm!=='granted'){ syncStatus='reconnect'; if(state.view==='exportar') render(); return; }
    const writable = await syncHandle.createWritable();
    await writable.write(JSON.stringify(syncSnapshot(), null, 2));
    await writable.close();
    lastSyncAt = new Date();
    if(state.view==='exportar') render();
  }catch(err){
    console.error('Sincronización fallida', err);
    showToast('No se pudo sincronizar con el archivo vinculado.', 'warn');
  }
}
function queueSync(){
  if(!syncHandle) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(writeSyncFile, 700);
}
async function syncNow(){
  if(!syncHandle){ showToast('No hay archivo vinculado todavía.', 'warn'); return; }
  await writeSyncFile();
  showToast('Sincronizado.', 'ok');
  render();
}

async function linkSyncFile(){
  if(!FS_SUPPORTED){ showToast('Tu navegador no soporta esta función. Usa el respaldo manual.', 'warn'); return; }
  let handle;
  try{
    handle = await window.showSaveFilePicker({
      suggestedName: 'respaldo_bpa.json',
      types: [{description:'Respaldo BPA (JSON)', accept:{'application/json':['.json']}}]
    });
  }catch(err){
    if(err.name!=='AbortError'){ console.error(err); showToast('No se pudo vincular el archivo.', 'bad'); }
    return;
  }
  let existing = null, hadContent = false;
  try{
    const file = await handle.getFile();
    if(file.size>0){
      hadContent = true;
      existing = JSON.parse(await file.text());
    }
  }catch(err){ /* archivo nuevo, vacío o no legible como JSON: se trata como vacío */ }

  await Store.put('config', {key:'syncHandle', value:handle});
  state.config.syncHandle = handle;
  syncHandle = handle;
  syncFileName = handle.name;
  syncStatus = 'linked';

  const tieneDatos = existing && Array.isArray(existing.movimientos) && (existing.movimientos.length>0 || (existing.registros||[]).length>0);
  if(tieneDatos){
    openImportChoiceModal(existing);
  } else {
    if(hadContent) showToast('El archivo no parece un respaldo de esta app; se sobrescribirá con tus datos actuales.', 'warn');
    await writeSyncFile();
    showToast('Archivo vinculado. Se actualizará automáticamente con cada ingreso o salida.', 'ok');
    render();
  }
}

function openImportChoiceModal(existing){
  openModal('Ya existe un respaldo en ese archivo', `
    <p>Ese archivo tiene ${existing.movimientos?.length||0} movimiento(s) y ${(existing.registros||[]).length} registro(s) sanitario(s) guardados — probablemente de otro equipo o sesión.</p>
    <p class="hint">¿Qué quieres hacer?</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="App.resolveSyncConflict('overwrite')">Mantener mis datos actuales</button>
      <button class="btn btn-primary" onclick="App.resolveSyncConflict('import')">Importar este respaldo</button>
    </div>
  `);
}
async function resolveSyncConflict(action){
  if(action==='import'){
    try{
      const file = await syncHandle.getFile();
      const data = JSON.parse(await file.text());
      await Store.clear('movimientos'); await Store.clear('registros');
      for(const m of data.movimientos||[]) await Store.put('movimientos', m);
      for(const r of data.registros||[]) await Store.put('registros', r);
      if(data.config?.dt) await Store.put('config', {key:'dt', value:data.config.dt});
      if(data.config?.alertaDiasRS) await Store.put('config', {key:'alertaDiasRS', value:data.config.alertaDiasRS});
      await loadState();
      syncHandle = state.config.syncHandle || syncHandle;
      syncStatus = 'linked';
      showToast('Respaldo importado desde el archivo vinculado.', 'ok');
    }catch(err){ console.error(err); showToast('No se pudo leer el archivo vinculado.', 'bad'); }
  } else {
    await writeSyncFile();
    showToast('Archivo vinculado. Se mantuvieron tus datos actuales.', 'ok');
  }
  closeModal(); render();
}

async function reconnectSync(){
  const handle = state.config.syncHandle;
  if(!handle) return;
  try{
    const perm = await handle.requestPermission({mode:'readwrite'});
    if(perm==='granted'){
      syncHandle = handle; syncStatus='linked';
      await writeSyncFile();
      showToast('Sincronización reconectada.', 'ok');
    } else {
      showToast('Permiso denegado. Vuelve a vincular el archivo si quieres sincronizar.', 'warn');
    }
  }catch(err){ console.error(err); showToast('No se pudo reconectar.', 'bad'); }
  render();
}
async function unlinkSyncFile(){
  if(!confirm('¿Desvincular el archivo de sincronización? El archivo no se borra, pero dejará de actualizarse solo.')) return;
  await Store.delete('config', 'syncHandle');
  delete state.config.syncHandle;
  syncHandle = null; syncStatus='unlinked'; syncFileName=''; lastSyncAt=null;
  render();
  showToast('Sincronización desvinculada.', 'warn');
}

/* ===================== Google Drive (OAuth + Drive API v3) ===================== */
// ponytail: flujo 100% navegador (Google Identity Services), sin backend ni client secret —
// el Client ID de OAuth es público por diseño para apps de una sola página. Se usa el scope
// mínimo 'drive.file': la app solo puede ver/editar el archivo que ella misma crea (o
// encuentra ya creado por ella en sesiones previas), nunca el resto del Drive del usuario.
const GOOGLE_CLIENT_ID = '270114483470-mo9q7kleiv625ajsu5vianf9p8thpoun.apps.googleusercontent.com';
const DRIVE_FOLDER_ID = '11vzDBygg7XxzlxQXv9NBXNafEQSG8U2w';
const DRIVE_FILE_NAME = 'respaldo_bpa.json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let driveSyncStatus = 'unlinked'; // 'unlinked' | 'linked'
let driveFileId = null;
let driveLastSyncAt = null;
let driveSyncTimer = null;
let gisTokenClient = null;
let driveAccessToken = null; // {token, expiresAt}

function initDriveStatus(){
  driveFileId = state.config.driveFileId || null;
  driveSyncStatus = driveFileId ? 'linked' : 'unlinked';
}
function gisReady(){ return typeof google !== 'undefined' && google.accounts && google.accounts.oauth2; }
function ensureTokenClient(){
  if(gisTokenClient) return gisTokenClient;
  gisTokenClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: DRIVE_SCOPE, callback: '' });
  return gisTokenClient;
}
function requestDriveToken(){
  return new Promise((resolve, reject) => {
    if(!gisReady()){ reject(new Error('Google Identity Services no está disponible (sin conexión).')); return; }
    const client = ensureTokenClient();
    client.callback = (resp) => {
      if(resp.error){ reject(resp); return; }
      driveAccessToken = { token: resp.access_token, expiresAt: Date.now() + (resp.expires_in*1000) };
      resolve(driveAccessToken.token);
    };
    client.requestAccessToken({ prompt: driveAccessToken ? '' : 'consent' });
  });
}
async function getValidDriveToken(){
  if(driveAccessToken && Date.now() < driveAccessToken.expiresAt - 60000) return driveAccessToken.token;
  return requestDriveToken();
}

async function driveFindFile(token, folderId, name){
  const q = encodeURIComponent(`'${folderId}' in parents and name='${name}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&pageSize=5`, {
    headers:{ 'Authorization':`Bearer ${token}` }
  });
  if(!res.ok) throw new Error('Búsqueda en Drive falló: '+res.status);
  const data = await res.json();
  return (data.files && data.files[0]) || null;
}
async function driveCreateFile(token, name, folderId, contentObj){
  const metadata = {name, parents:[folderId], mimeType:'application/json'};
  const boundary = 'dmbpa' + Date.now();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`+
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(contentObj)}\r\n`+
    `--${boundary}--`;
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':`multipart/related; boundary=${boundary}` },
    body
  });
  if(!res.ok) throw new Error('No se pudo crear el archivo en Drive: '+res.status);
  return res.json();
}
async function driveUpdateFile(token, fileId, contentObj){
  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method:'PATCH',
    headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' },
    body: JSON.stringify(contentObj)
  });
  if(!res.ok) throw new Error('No se pudo actualizar el archivo en Drive: '+res.status);
  return res.json();
}
async function driveGetFileContent(token, fileId){
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers:{ 'Authorization':`Bearer ${token}` } });
  if(!res.ok) throw new Error('No se pudo leer el archivo de Drive: '+res.status);
  return res.json();
}

async function writeDriveFile(){
  if(!driveFileId) return;
  try{
    const token = await getValidDriveToken();
    await driveUpdateFile(token, driveFileId, syncSnapshot());
    driveLastSyncAt = new Date();
    if(state.view==='exportar') render();
  }catch(err){
    console.error('Sincronización con Drive fallida', err);
  }
}
function queueDriveSync(){
  if(!driveFileId) return;
  clearTimeout(driveSyncTimer);
  driveSyncTimer = setTimeout(writeDriveFile, 900);
}
function queueAllSync(){ queueSync(); queueDriveSync(); }

async function driveSyncNow(){
  if(!driveFileId){ showToast('No hay conexión con Drive todavía.', 'warn'); return; }
  try{ await writeDriveFile(); showToast('Sincronizado con Drive.', 'ok'); }
  catch(err){ showToast('No se pudo sincronizar con Drive.', 'bad'); }
  render();
}

async function linkGoogleDrive(){
  if(!gisReady()){ showToast('No se pudo cargar Google. Revisa tu conexión a internet e inténtalo de nuevo.', 'bad'); return; }
  try{
    const token = await requestDriveToken();
    const found = await driveFindFile(token, DRIVE_FOLDER_ID, DRIVE_FILE_NAME);
    if(found){
      const content = await driveGetFileContent(token, found.id);
      const tieneDatos = content && Array.isArray(content.movimientos) && (content.movimientos.length>0 || (content.registros||[]).length>0);
      if(tieneDatos){ openDriveImportChoiceModal(found.id, content); return; }
      driveFileId = found.id;
    } else {
      const created = await driveCreateFile(token, DRIVE_FILE_NAME, DRIVE_FOLDER_ID, syncSnapshot());
      driveFileId = created.id;
    }
    await Store.put('config', {key:'driveFileId', value: driveFileId});
    state.config.driveFileId = driveFileId;
    driveSyncStatus = 'linked';
    await writeDriveFile();
    showToast('Conectado a Google Drive. Se actualizará automáticamente.', 'ok');
    render();
  }catch(err){
    console.error(err);
    showToast('No se pudo conectar con Google Drive. Verifica el acceso e inténtalo de nuevo.', 'bad');
  }
}
function openDriveImportChoiceModal(fileId, content){
  openModal('Ya existe un respaldo en Drive', `
    <p>El archivo en Drive tiene ${content.movimientos?.length||0} movimiento(s) y ${(content.registros||[]).length} registro(s) sanitario(s) guardados — probablemente de otro equipo.</p>
    <p class="hint">¿Qué quieres hacer?</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="App.resolveDriveConflict('${fileId}','overwrite')">Mantener mis datos actuales</button>
      <button class="btn btn-primary" onclick="App.resolveDriveConflict('${fileId}','import')">Importar desde Drive</button>
    </div>
  `);
}
async function resolveDriveConflict(fileId, action){
  driveFileId = fileId;
  await Store.put('config', {key:'driveFileId', value: fileId});
  state.config.driveFileId = fileId;
  driveSyncStatus = 'linked';
  if(action==='import'){
    try{
      const token = await getValidDriveToken();
      const data = await driveGetFileContent(token, fileId);
      await Store.clear('movimientos'); await Store.clear('registros');
      for(const m of data.movimientos||[]) await Store.put('movimientos', m);
      for(const r of data.registros||[]) await Store.put('registros', r);
      if(data.config?.dt) await Store.put('config', {key:'dt', value:data.config.dt});
      if(data.config?.alertaDiasRS) await Store.put('config', {key:'alertaDiasRS', value:data.config.alertaDiasRS});
      await loadState();
      driveFileId = state.config.driveFileId || fileId;
      showToast('Respaldo importado desde Google Drive.', 'ok');
    }catch(err){ console.error(err); showToast('No se pudo importar desde Drive.', 'bad'); }
  } else {
    await writeDriveFile();
    showToast('Conectado a Google Drive. Se mantuvieron tus datos actuales.', 'ok');
  }
  closeModal(); render();
}
async function unlinkGoogleDrive(){
  if(!confirm('¿Desvincular Google Drive? El archivo en Drive no se borra, pero dejará de actualizarse solo desde este dispositivo.')) return;
  await Store.delete('config', 'driveFileId');
  delete state.config.driveFileId;
  driveFileId = null; driveSyncStatus = 'unlinked'; driveLastSyncAt = null;
  render();
  showToast('Google Drive desvinculado.', 'warn');
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
window.addEventListener('unhandledrejection', e => { console.error(e.reason); showToast('Error inesperado. Revisa la consola.', 'bad'); });

async function init(){
  try{ await Store.init(); await loadState(); }
  catch(err){ console.error(err); showToast('No se pudieron cargar los datos guardados.', 'bad'); }
  if(!Store.persistent){
    showToast('IndexedDB no disponible: los datos no se guardarán entre sesiones. Abre el archivo HTML directamente en tu navegador.', 'warn');
  }
  await initSyncStatus();
  initDriveStatus();
  if(!state.config.dt){ openDTSetupModal(true); }
  render();
}
document.addEventListener('DOMContentLoaded', init);

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error('No se pudo registrar el service worker', err));
  });
}

window.App = {
  setView, setFiltro, openModal, closeModal,
  openIngresoModal, openSalidaModal, openRegistroModal, openEditMovModal, openLiberarModal, openDTSetupModal,
  addItemRow, itemRowIngresoHtml, itemRowSalidaHtml, onProductoAutofill,
  submitIngreso, submitSalida, submitRegistro, submitEditMov, confirmEstadoLote, submitDT,
  removeMov, removeRegistro,
  exportMovimientosCSV, exportRegistrosCSV, exportBackup, importBackup,
  linkSyncFile, syncNow, unlinkSyncFile, reconnectSync, resolveSyncConflict,
  linkGoogleDrive, driveSyncNow, unlinkGoogleDrive, resolveDriveConflict,
  __selfTest
};