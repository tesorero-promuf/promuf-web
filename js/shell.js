/* ═══════════════════════════════════════════════════════════
   SHELL PROMUF — sistema maestro
   Router por hash, navegación desde modulos.json,
   render del módulo Inicio y carga de módulos en iframe.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const $ = id => document.getElementById(id);
let MODULOS = [];
let CFG = {};
const APP_VER = 'r19';

const AVISO_TIPOS = {
  aviso:      { ico: '📢', clase: 'b-teal' },
  novedad:    { ico: '🆕', clase: 'b-gold' },
  importante: { ico: '⚠️', clase: 'b-red' },
  evento:     { ico: '🗓️', clase: 'b-purple' }
};

const DOCUMENTOS = [
  { nombre: 'Acta Constitutiva',            archivo: 'docs/acta_constitutiva.pdf',              tag: 'Oficial' },
  { nombre: 'Reglamento Comité de Contraloría', archivo: 'docs/reglamento_comite_contraloria.pdf', tag: 'Oficial' },
  { nombre: 'Reglamento Comité Técnico',    archivo: 'docs/reglamento_comite_tecnico.pdf',      tag: 'Oficial' },
  { nombre: 'Reglamento Comité Disciplinario', archivo: 'docs/reglamento_comite_disciplinario.pdf', tag: 'Oficial' },
  { nombre: 'Reglamento Comité Electoral',  archivo: 'docs/reglamento_comite_electoral.pdf',    tag: 'Oficial' }
];

function toast(msg, tipo){
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99;'+
    'background:#0f2244;color:#f1f5f9;border:1px solid #2b4a78;padding:10px 18px;border-radius:10px;'+
    'font-size:.85rem;box-shadow:0 8px 24px rgba(0,0,0,.4)';
  if(tipo==='e') d.style.borderColor = '#e24b4a';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 3200);
}

async function cargarDatos(){
  try{
    const [m, c] = await Promise.all([fetch('modulos.json'), fetch('config.json')]);
    if(m.ok) MODULOS = (await m.json()).modulos || [];
    if(c.ok) CFG = await c.json();
    $('dot').className = 'dot dot-on'; $('stxt').textContent = 'En línea';
  }catch(e){
    $('dot').className = 'dot dot-off'; $('stxt').textContent = 'Sin conexión';
  }
}

function pintarNav(){
  $('shellNav').innerHTML = MODULOS.map(mod=>{
    const dis = mod.estado !== 'listo' ? ' soon' : '';
    const soon = mod.estado !== 'listo' ? ' <span class="soon-tag">pronto</span>' : '';
    return `<button class="shell-tab${dis}" data-id="${mod.id}" onclick="ir('${mod.id}')">${mod.icono} ${mod.nombre}${soon}</button>`;
  }).join('');
  activarTab(actual());
}

function activarTab(id){
  document.querySelectorAll('.shell-tab').forEach(b=>b.classList.toggle('on', b.dataset.id===id));
}

function actual(){
  const h = (location.hash||'').replace(/^#\/?/,'');
  const mod = MODULOS.find(x=>x.id===h);
  if(!mod) return MODULOS[0] ? MODULOS[0].id : 'inicio';
  return mod.id;
}

function ir(id){
  const mod = MODULOS.find(x=>x.id===id);
  if(!mod) return;
  if(mod.estado !== 'listo'){ toast('El módulo '+mod.nombre+' estará disponible pronto','e'); return; }
  location.hash = '#/' + id;
}

function ruteo(){
  const id = actual();
  activarTab(id);
  if(id === 'inicio'){ pintarInicio(); }
  else{ cargarModulo(id); }
}

/* ── Carga de módulos en iframe (mismo origen, auto-alto) ── */
function cargarModulo(id){
  const mod = MODULOS.find(x=>x.id===id);
  const ruta = mod && mod.ruta ? mod.ruta : 'modulos/'+id+'/index.html';
  const sp = new URLSearchParams(location.search);
  const priv = sp.get('priv') === '1';
  sp.delete('priv');
  if(!priv && sp.get('pub') !== '1') sp.set('pub', '1');
  const qs = sp.toString();
  const sep = qs ? '&' : '?';
  $('shellMain').innerHTML = `<iframe class="shell-frame" id="shellFrame" src="${ruta}?${qs}${sep}v=${APP_VER}" loading="eager"></iframe>`;
  const ifr = $('shellFrame');
  ifr.onload = () => {
    try{
      const doc = ifr.contentDocument;
      if(!doc || !doc.body) return;
      const ajustar = () => { ifr.style.height = (doc.body.scrollHeight + 24) + 'px'; };
      ajustar();
      new MutationObserver(ajustar).observe(doc.body, {childList:true, subtree:true, attributes:true});
    }catch(e){}
  };
}

/* ── Módulo Inicio (renderizado por el shell) ── */
function pintarInicio(){
  const mods = MODULOS.filter(x=>x.id!=='inicio');
  const hoy = new Date();
  const avisos = (CFG.avisos||[])
    .filter(a=>!a.hasta || new Date(a.hasta+'T23:59:59') >= hoy)
    .sort((a,b)=>b.fecha.localeCompare(a.fecha))
    .slice(0,5);
  $('shellMain').innerHTML = `
    <section class="hero">
      <span class="hero-eyebrow">🇻🇪 Falcón · Venezuela</span>
      <h1>¡Bienvenido, <span class="teal">gremio PROMUF</span>!</h1>
      <p>Este es el hogar digital de los profesionales de la música del estado Falcón: un solo lugar para consultar la tesorería con transparencia total, tu carnet digital y todo lo que el gremio ofrezca.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#/tesoreria">📊 Ir a Tesorería</a>
        <a class="btn btn-ghost" href="#docs">📄 Documentos oficiales</a>
      </div>
    </section>

    <section class="sec">
      <h2 class="sec-h">Módulos del gremio</h2>
      <div class="grid-mod">${mods.map(m=>cardMod(m)).join('')}</div>
    </section>

    ${avisos.length?`
    <section class="sec">
      <h2 class="sec-h">Avisos y novedades</h2>
      <div class="avisos">${avisos.map(a=>cardAviso(a)).join('')}</div>
    </section>`:''}

    <section class="sec" id="docs">
      <h2 class="sec-h">Documentos oficiales</h2>
      <div class="doc-list">${DOCUMENTOS.map(d=>`
        <a class="doc" href="${d.archivo}" target="_blank" rel="noopener">
          <span class="doc-ico">📄</span>
          <span class="doc-name">${d.nombre}</span>
          <span class="doc-tag">${d.tag}</span>
        </a>`).join('')}
      </div>
    </section>`;
}

function cardMod(m){
  const soon = m.estado !== 'listo';
  return `
    <div class="mod-card${soon?' soon':''}" style="--mc:${m.color||'#3fd0c9'}" onclick="${soon?'':`ir('${m.id}')`}">
      <span class="mc-icon">${m.icono}</span>
      <span class="mc-name">${m.nombre}</span>
      <span class="mc-desc">${m.desc||''}</span>
      <span class="mc-go">${soon?'Próximamente':'Entrar →'}</span>
    </div>`;
}

function cardAviso(a){
  const t = AVISO_TIPOS[a.tipo] || AVISO_TIPOS.aviso;
  const f = new Date(a.fecha+'T00:00:00').toLocaleDateString('es-VE',{day:'numeric',month:'short',year:'numeric'});
  return `
    <div class="aviso">
      <span class="av-ico">${t.ico}</span>
      <div class="av-body">
        <div class="av-text">${a.texto}</div>
        <div class="av-meta"><span class="badge ${t.clase}">${a.tipo}</span><span class="av-fecha">${f}</span></div>
      </div>
    </div>`;
}

/* ── Auto-actualización: si hay una versión nueva, recarga ── */
async function chequeoVersion(){
  try{
    const r = await fetch('version.txt?_='+Date.now(), {cache:'no-store'});
    if(r.ok){
      const v = (await r.text()).trim();
      if(v && v !== APP_VER) location.reload(true);
    }
  }catch(e){}
}
/* ── Arranque ── */
window.addEventListener('hashchange', ruteo);
(async function(){
  await cargarDatos();
  pintarNav();
  ruteo();
  chequeoVersion();
})();
