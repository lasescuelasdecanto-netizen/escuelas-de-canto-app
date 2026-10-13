import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { ESCUELA, VERSION_APP } from './config.js';
import * as S from './store.js';
import { I, logo } from './iconos.js';
import { RUTINAS, TIPS, NOVEDADES_INICIALES } from './contenido.js';
import * as N from './notif.js';
import * as A from './audio.js';

const nativo = Capacitor.isNativePlatform();
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

let ruta = 'inicio';
let pila = [];
let limpiar = null;

// ============================================================
//  Navegación
// ============================================================
const TABS = [
  ['inicio', 'Inicio'], ['practicar', 'Practicar'], ['cuota', 'Cuota'], ['novedades', 'Novedades'], ['escuela', 'Escuela'],
];

function ir(r, { reemplazar = false } = {}) {
  if (!reemplazar && r !== ruta) pila.push(ruta);
  ruta = r;
  render();
  window.scrollTo(0, 0);
}
function volver() {
  if (pila.length) { ruta = pila.pop(); render(); window.scrollTo(0, 0); return true; }
  return false;
}
function irTab(r) { pila = []; ruta = r; render(); window.scrollTo(0, 0); }

function render() {
  if (limpiar) { try { limpiar(); } catch {} limpiar = null; }
  const s = S.get();
  if (!s.onboarded) { renderOnboarding(); return; }
  const [base, sub, arg] = ruta.split('/');
  const vistas = { inicio: vInicio, practicar: vPracticar, cuota: vCuota, novedades: vNovedades, escuela: vEscuela };
  const subvistas = {
    'practicar/rutina': vRutina, 'practicar/respiracion': vRespiracion, 'practicar/teclado': vTeclado,
    'practicar/metronomo': vMetronomo, 'practicar/afinador': vAfinador, 'escuela/datos': vDatos, 'escuela/avisos': vAvisos,
  };
  const fn = sub ? subvistas[`${base}/${sub}`] : vistas[base];
  const html = (fn || vInicio)(arg);
  const conTabs = !sub;
  app.innerHTML = `<main class="vista ${conTabs ? '' : 'sin-tabs'}">${sub ? `<button class="volver" data-volver>${I.volver} Volver</button>` : ''}${html}</main>${conTabs ? barra(base) : ''}`;
  $$('[data-volver]').forEach((b) => b.onclick = () => volver());
  $$('[data-ir]').forEach((b) => b.onclick = () => ir(b.dataset.ir));
  $$('[data-tab]').forEach((b) => b.onclick = () => irTab(b.dataset.tab));
  $$('[data-abrir]').forEach((b) => b.onclick = (e) => { e.preventDefault(); abrir(b.dataset.abrir); });
  const montar = montajes[sub ? `${base}/${sub}` : base];
  if (montar) limpiar = montar(arg) || null;
}

function barra(activa) {
  const sinLeer = novedadesSinLeer();
  return `<div class="tabs"><nav>${TABS.map(([id, txt]) => `
    <button data-tab="${id}" class="${activa === id ? 'on' : ''}">${I[id]}<span>${txt}</span>${id === 'novedades' && sinLeer ? '<b class="punto"></b>' : ''}</button>`).join('')}</nav></div>`;
}

function abrir(url) {
  if (nativo) { window.location.href = url; return; }
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

function toast(txt) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = txt;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

const waLink = (msg) => `https://wa.me/${ESCUELA.whatsapp}?text=${encodeURIComponent(msg)}`;
const primerNombre = () => (S.get().nombre || '').trim().split(' ')[0];

// ============================================================
//  Onboarding (primera vez)
// ============================================================
let onb = { paso: 0, borrador: null };

function renderOnboarding() {
  if (!onb.borrador) onb.borrador = { nombre: '', docente: '', clases: [] };
  const b = onb.borrador;
  const total = 5;
  const ind = onb.paso > 0 ? `<div class="pasos-ind">${Array.from({ length: total }, (_, i) => `<i class="${i < onb.paso ? 'on' : ''}"></i>`).join('')}</div>` : '';
  let cuerpo = '', acciones = '';

  if (onb.paso === 0) {
    app.innerHTML = `<div class="onb"><div class="bienvenida">
      ${logo(true)}
      <p class="slogan">${esc(ESCUELA.slogan)}</p>
    </div>
    <div class="botones"><button class="btn" id="sig">Empezar</button>
    <p class="chico" style="text-align:center;margin-top:8px">Te lleva un minuto configurarla.</p></div></div>`;
    $('#sig').onclick = () => { onb.paso = 1; renderOnboarding(); };
    return;
  }
  if (onb.paso === 1) {
    cuerpo = `<h1>¿Cómo te llamás?</h1><p class="sub">Así personalizamos tus recordatorios.</p>
      <label class="campo"><span>Nombre</span><input type="text" id="nombre" value="${esc(b.nombre)}" placeholder="Tu nombre" autocomplete="given-name"></label>`;
    acciones = `<button class="btn" id="sig" ${b.nombre.trim() ? '' : 'disabled'}>Continuar</button>`;
  }
  if (onb.paso === 2) {
    cuerpo = `<h1>¿Quién es tu profe?</h1><p class="sub">Si tenés más de uno, elegí el principal.</p>
      <div class="lista">${ESCUELA.docentes.map((d) => `<button class="item" data-doc="${esc(d)}"><div class="txt tit">${esc(d)}</div>${b.docente === d ? `<span class="dorado">${I.check}</span>` : ''}</button>`).join('')}</div>`;
    acciones = `<button class="btn" id="sig" ${b.docente ? '' : 'disabled'}>Continuar</button><button class="btn sec" id="saltar">Todavía no sé</button>`;
  }
  if (onb.paso === 3) {
    cuerpo = `<h1>¿Cuándo es tu clase?</h1><p class="sub">Te avisamos el día anterior y una hora antes.</p>${editorClases(b.clases)}`;
    acciones = `<button class="btn" id="sig" ${b.clases.length ? '' : 'disabled'}>Continuar</button><button class="btn sec" id="saltar">Lo cargo después</button>`;
  }
  if (onb.paso === 4) {
    cuerpo = `<h1>Tu cuota</h1><p class="sub">La cuota se paga del ${ESCUELA.pagoDesde} al ${ESCUELA.pagoHasta} de cada mes. Te avisamos cuando se abre el pago y antes de que venza.</p>
      <div class="lista"><div class="item"><div class="txt"><div class="tit">Ya pagué la de ${S.MESES[new Date().getMonth()]}</div><div class="chico">Así no te avisamos de más</div></div>
      <label class="switch"><input type="checkbox" id="yapago" ${b.yaPago ? 'checked' : ''}><i></i></label></div></div>`;
    acciones = `<button class="btn" id="sig">Continuar</button>`;
  }
  if (onb.paso === 5) {
    cuerpo = `<h1>Activá los avisos</h1><p class="sub">Así no se te pasa ninguna clase ni el vencimiento de la cuota. Te pedimos permiso una sola vez.</p>
      <div class="card"><div class="fila"><div class="icono-circ">${I.campana}</div><div><b>Clases</b><p class="chico">El día anterior a las 20 h y una hora antes</p></div></div></div>
      <div class="card"><div class="fila"><div class="icono-circ">${I.cuota}</div><div><b>Cuota</b><p class="chico">El día ${ESCUELA.pagoDesde}, 3 días antes del ${ESCUELA.pagoHasta}, el día ${ESCUELA.pagoHasta} y un recordatorio si queda pendiente</p></div></div></div>`;
    acciones = `<button class="btn" id="activar">Activar avisos</button><button class="btn sec" id="sin">Ahora no</button>`;
  }

  app.innerHTML = `<div class="onb">${ind}<div class="cuerpo">${cuerpo}</div><div class="botones">${acciones}
    <button class="btn sec" id="atras" style="background:none;color:var(--texto-3)">Atrás</button></div></div>`;

  const sig = $('#sig');
  if (sig) sig.onclick = () => { onb.paso++; renderOnboarding(); };
  $('#atras').onclick = () => { onb.paso--; renderOnboarding(); };
  const saltar = $('#saltar');
  if (saltar) saltar.onclick = () => { onb.paso++; renderOnboarding(); };

  const nombre = $('#nombre');
  if (nombre) {
    nombre.focus();
    nombre.oninput = () => { b.nombre = nombre.value; sig.disabled = !b.nombre.trim(); };
    nombre.onkeydown = (e) => { if (e.key === 'Enter' && b.nombre.trim()) sig.click(); };
  }
  $$('[data-doc]').forEach((el) => el.onclick = () => { b.docente = el.dataset.doc; renderOnboarding(); });
  if (onb.paso === 3) montarEditorClases(b.clases, () => renderOnboarding());
  const yapago = $('#yapago');
  if (yapago) yapago.onchange = () => { b.yaPago = yapago.checked; };

  const terminar = async (conAvisos) => {
    S.update((s) => {
      s.nombre = b.nombre.trim(); s.docente = b.docente; s.clases = b.clases;
      s.onboarded = true; s.alta = S.ym(new Date());
      if (b.yaPago && !s.cuota.pagos.includes(s.alta)) s.cuota.pagos.push(s.alta);
    });
    if (conAvisos) {
      await N.prepararCanal();
      const p = await N.pedirPermiso();
      if (p === 'denied') toast('Podés activarlos después desde Escuela › Avisos');
    }
    await N.reprogramar();
    onb = { paso: 0, borrador: null };
    irTab('inicio');
  };
  const act = $('#activar'); if (act) act.onclick = () => terminar(true);
  const sin = $('#sin'); if (sin) sin.onclick = () => terminar(false);
}

// Editor de días y horarios de clase (lo usan el onboarding y "Mis datos")
function editorClases(clases) {
  const lista = clases.map((c, i) => `<div class="clase-fila"><div class="icono-circ">${I.calendario}</div>
    <div class="txt">${S.DIAS[c.dia]} · ${c.hora} h<div class="chico">${esc(c.modalidad)}</div></div><button class="quitar" data-quitar="${i}">×</button></div>`).join('');
  return `${lista}
    <div class="card" style="margin-top:${clases.length ? 14 : 0}px">
      <label class="campo"><span>Día</span><div class="dias">${[1, 2, 3, 4, 5, 6, 0].map((i) => `<button type="button" data-dia="${i}">${'DLMMJVS'[i]}</button>`).join('')}</div></label>
      <div class="grilla-2">
        <label class="campo"><span>Hora</span><input type="time" id="hora" value="18:00"></label>
        <label class="campo"><span>Modalidad</span><select id="modalidad"><option>Individual</option><option>Grupal</option><option>Dúo</option><option>Ensamble</option><option>Online</option></select></label>
      </div>
      <button class="btn borde" id="agregar" disabled>+ Agregar ${clases.length ? 'otra clase' : 'clase'}</button>
    </div>`;
}
function montarEditorClases(clases, alCambiar) {
  let dia = null;
  const agregar = $('#agregar');
  $$('[data-dia]').forEach((b) => b.onclick = () => {
    dia = Number(b.dataset.dia);
    $$('[data-dia]').forEach((x) => x.classList.toggle('on', x === b));
    agregar.disabled = false;
  });
  agregar.onclick = () => {
    if (dia === null) return;
    clases.push({ dia, hora: $('#hora').value || '18:00', modalidad: $('#modalidad').value });
    clases.sort((a, b) => ((a.dia + 6) % 7) - ((b.dia + 6) % 7) || a.hora.localeCompare(b.hora));
    alCambiar();
  };
  $$('[data-quitar]').forEach((b) => b.onclick = () => { clases.splice(Number(b.dataset.quitar), 1); alCambiar(); });
}

// ============================================================
//  Inicio
// ============================================================
function vInicio() {
  const s = S.get();
  const prox = S.proximasClases(1)[0];
  const cuota = S.estadoCuota();
  const racha = S.racha();
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const ultima = novedades().novedades[0];
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const rutinaDia = RUTINAS[new Date().getDay() % 2];

  const chipCuota = cuota.pagada
    ? `<span class="chip ok">${I.check.replace('<svg', '<svg width="14" height="14"')} Pagada</span>`
    : cuota.dias < 0 ? `<span class="chip alerta">Vencida</span>`
    : cuota.dias <= 3 ? `<span class="chip alerta">Vence ${cuota.dias === 0 ? 'hoy' : `en ${cuota.dias} día${cuota.dias > 1 ? 's' : ''}`}</span>`
    : `<span class="chip">Del ${ESCUELA.pagoDesde} al ${ESCUELA.pagoHasta}</span>`;

  return `
    <div class="encabezado">${logo()}</div>
    ${avisoActualizacion()}
    <div class="saludo"><h1>${saludo}${primerNombre() ? `, <span>${esc(primerNombre())}</span>` : ''}</h1><p class="sub">${esc(tip)}</p></div>

    <div class="card destacada">
      <div class="etiqueta">Próxima clase</div>
      ${prox ? `<div class="grande-num" style="margin-top:6px">${S.cuando(prox.fecha)}</div>
        <p class="chico" style="margin-top:4px">${s.docente ? `Con ${esc(s.docente)} · ` : ''}${esc(prox.clase.modalidad)}</p>
        <div class="botones" style="grid-template-columns:1fr 1fr"><button class="btn claro peq" data-ir="practicar/rutina/express" style="width:100%">Calentar 5 min</button>
        <button class="btn peq" data-aviso-falta style="width:100%;background:rgba(243,238,228,.12)">Aviso que falto</button></div>`
      : `<p style="margin-top:6px">Todavía no cargaste tu horario.</p><div class="botones"><button class="btn claro peq" data-ir="escuela/datos" style="width:100%">Cargar mi clase</button></div>`}
    </div>

    <div class="grilla-2" style="margin-top:12px">
      <button class="card" data-tab="cuota" style="text-align:left">
        <div class="etiqueta">Cuota ${esc(cuota.mesNombre)}</div><div style="margin-top:10px">${chipCuota}</div>
      </button>
      <button class="card" data-tab="practicar" style="text-align:left">
        <div class="etiqueta">Racha</div>
        <div class="fila" style="gap:6px;margin-top:6px"><span class="racha-num">${racha}</span><span class="chico">día${racha === 1 ? '' : 's'}<br>seguido${racha === 1 ? '' : 's'}</span></div>
      </button>
    </div>

    <h3>Práctica de hoy</h3>
    <button class="lista" data-ir="practicar/rutina/${rutinaDia.id}" style="width:100%"><div class="item">
      <div class="icono-circ">${I.practicar}</div><div class="txt"><div class="tit">${rutinaDia.nombre}</div><div class="chico">${rutinaDia.minutos} min · ${rutinaDia.para}</div></div><span class="flecha">›</span>
    </div></button>

    ${ultima ? `<h3>Última novedad</h3><button class="card nov" data-tab="novedades" style="width:100%;text-align:left">
      <div class="meta"><span class="chip oro">${esc(ultima.tipo || 'Escuela')}</span><span class="chico">${fechaCorta(ultima.fecha)}</span></div>
      <h2>${esc(ultima.titulo)}</h2><p class="chico" style="margin-top:4px">${esc(recortar(ultima.texto, 110))}</p></button>` : ''}

    <div class="manifiesto"><div class="linea-oro"></div><p>“${esc(ESCUELA.manifiesto)}”</p></div>`;
}

const montajes = {};
montajes.inicio = () => {
  const b = $('[data-aviso-falta]');
  if (b) b.onclick = () => {
    const prox = S.proximasClases(1)[0];
    const msg = `Hola! Soy ${S.get().nombre}. Te aviso que no voy a poder ir a mi clase del ${S.cuando(prox.fecha).toLowerCase()}${S.get().docente ? ` con ${S.get().docente}` : ''}. ¿Podemos recuperarla?`;
    abrir(waLink(msg));
  };
};

// ============================================================
//  Practicar
// ============================================================
function vPracticar() {
  const dias = S.get().practica.dias;
  const hoy = new Date();
  const min = Object.entries(dias).filter(([k]) => k.startsWith(S.ym(hoy))).reduce((a, [, v]) => a + v, 0);
  // calendario de las últimas 5 semanas (empieza en lunes)
  const inicio = new Date(hoy); inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 28);
  const celdas = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    const futuro = d > hoy;
    celdas.push(`<div class="d ${dias[S.ymd(d)] ? 'si' : ''} ${S.ymd(d) === S.ymd(hoy) ? 'hoy' : ''}" style="${futuro ? 'opacity:.3' : ''}">${d.getDate()}</div>`);
  }
  const hoyMin = dias[S.ymd(hoy)] || 0;

  return `
    <h1>Practicar</h1><p class="sub" style="margin-bottom:18px">Diez minutos por día cambian tu voz.</p>
    <div class="card">
      <div class="fila entre"><div><div class="etiqueta">Racha</div><div class="fila" style="gap:8px"><span class="racha-num">${S.racha()}</span><span class="chico">días</span></div></div>
      <div style="text-align:right"><div class="etiqueta">Este mes</div><div class="grande-num" style="font-size:22px">${min} min</div></div></div>
      <div class="calendario">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<div class="cab">${d}</div>`).join('')}${celdas.join('')}</div>
      <div class="botones">${hoyMin ? `<button class="btn sec" id="sumar">${I.check} Hoy: ${hoyMin} min · sumar 10 más</button>` : `<button class="btn borde" id="sumar">Practiqué hoy (10 min)</button>`}</div>
    </div>

    <h3>Rutinas guiadas</h3>
    <div class="lista">${RUTINAS.map((r) => `<button class="item" data-ir="practicar/rutina/${r.id}"><div class="icono-circ">${I.reloj}</div>
      <div class="txt"><div class="tit">${r.nombre}</div><div class="chico">${r.minutos} min · ${r.para}</div></div><span class="flecha">›</span></button>`).join('')}</div>

    <h3>Herramientas</h3>
    <div class="herramientas">
      <button class="herr" data-ir="practicar/respiracion">${I.aire}<div><div class="tit">Respiración</div><div class="chico">Guía visual de apoyo</div></div></button>
      <button class="herr" data-ir="practicar/teclado">${I.piano}<div><div class="tit">Teclado y escalas</div><div class="chico">Notas de referencia</div></div></button>
      <button class="herr" data-ir="practicar/afinador">${I.afinador}<div><div class="tit">Afinador</div><div class="chico">Mirá qué nota cantás</div></div></button>
      <button class="herr" data-ir="practicar/metronomo">${I.metronomo}<div><div class="tit">Metrónomo</div><div class="chico">Trabajá el tiempo</div></div></button>
    </div>`;
}
montajes.practicar = () => {
  $('#sumar').onclick = () => { S.registrarPractica(10); toast('¡Bien! Sumaste 10 minutos'); render(); };
};

// ---------- Rutina guiada ----------
function vRutina(id) {
  const r = RUTINAS.find((x) => x.id === id) || RUTINAS[0];
  return `<div class="etiqueta">${r.nombre}</div>
    <div class="progreso"><i id="prog" style="width:0"></i></div>
    <div class="reloj"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke="var(--card-2)" stroke-width="5" fill="none"/>
      <circle id="arco" cx="50" cy="50" r="45" stroke="var(--dorado)" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="282.7" stroke-dashoffset="0"/></svg>
      <div class="num" id="num">0:00</div></div>
    <div class="chico" style="text-align:center" id="contador"></div>
    <div class="paso-tit" id="tit"></div>
    <p class="paso-ind" id="ind"></p>
    <div style="text-align:center;margin-top:14px" id="acomp"></div>
    <div class="controles">
      <button class="redondo" id="ant">${I.ant}</button>
      <button class="redondo prim" id="pp">${I.play}</button>
      <button class="redondo" id="sig">${I.sig}</button>
    </div>`;
}
montajes['practicar/rutina'] = (id) => {
  const r = RUTINAS.find((x) => x.id === id) || RUTINAS[0];
  let i = 0, resta = r.pasos[0].seg, corriendo = false, timer = null, acompTimer = null, inicioTotal = Date.now();
  const totalSeg = r.pasos.reduce((a, p) => a + p.seg, 0);

  const pintar = () => {
    const p = r.pasos[i];
    $('#tit').textContent = p.titulo;
    $('#ind').textContent = p.indicacion;
    $('#contador').textContent = `Paso ${i + 1} de ${r.pasos.length}`;
    $('#num').textContent = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}`;
    $('#arco').style.strokeDashoffset = String(282.7 * (1 - resta / p.seg));
    const hecho = r.pasos.slice(0, i).reduce((a, x) => a + x.seg, 0) + (p.seg - resta);
    $('#prog').style.width = `${(hecho / totalSeg) * 100}%`;
    $('#pp').innerHTML = corriendo ? I.pausa : I.play;
    $('#acomp').innerHTML = p.patron ? `<span class="chip oro">${I.piano.replace('<svg', '<svg width="14" height="14" stroke="currentColor"')} El teclado te acompaña · ${A.nombreNota(p.raiz)}</span>` : '';
  };
  const acompanar = () => {
    clearTimeout(acompTimer);
    const p = r.pasos[i];
    if (!corriendo || !p.patron) return;
    let raiz = p.raiz, sube = true;
    const ciclo = () => {
      if (!corriendo || r.pasos[i] !== p) return;
      const ms = A.tocarPatron(raiz, A.PATRONES[p.patron], p.bpm);
      raiz += sube ? 1 : -1;
      if (raiz > p.raiz + 5) sube = false;
      if (raiz < p.raiz) { sube = true; raiz = p.raiz; }
      acompTimer = setTimeout(ciclo, ms + 600);
    };
    ciclo();
  };
  const sonarCambio = () => { A.tocar(84, 0.4, 0, 0.2); A.tocar(91, 0.6, 0.12, 0.2); };
  const terminar = () => {
    corriendo = false; clearInterval(timer); clearTimeout(acompTimer);
    const min = Math.max(1, Math.round((Date.now() - inicioTotal) / 60000)) || r.minutos;
    S.registrarPractica(Math.min(min, r.minutos + 5));
    $('main').innerHTML = `<div style="text-align:center;padding-top:60px">
      <div class="icono-circ" style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;background:var(--dorado-suave)">${I.check.replace('stroke-width="1.7"', 'stroke-width="2.2" style="stroke:var(--dorado);width:34px;height:34px"')}</div>
      <h1>¡Rutina completa!</h1><p class="sub">Racha: ${S.racha()} día${S.racha() === 1 ? '' : 's'} seguidos. Tu voz lo agradece.</p>
      <div class="botones"><button class="btn" id="fin">Listo</button></div></div>`;
    $('#fin').onclick = () => volver();
  };
  const tick = () => {
    resta--;
    if (resta <= 0) {
      if (i < r.pasos.length - 1) { i++; resta = r.pasos[i].seg; sonarCambio(); acompanar(); }
      else { pintar(); terminar(); return; }
    }
    pintar();
  };
  $('#pp').onclick = () => {
    A.audio();
    corriendo = !corriendo;
    clearInterval(timer);
    if (corriendo) { timer = setInterval(tick, 1000); acompanar(); } else clearTimeout(acompTimer);
    pintar();
  };
  $('#sig').onclick = () => { if (i < r.pasos.length - 1) { i++; resta = r.pasos[i].seg; acompanar(); pintar(); } else terminar(); };
  $('#ant').onclick = () => { if (i > 0) i--; resta = r.pasos[i].seg; acompanar(); pintar(); };
  pintar();
  return () => { corriendo = false; clearInterval(timer); clearTimeout(acompTimer); };
};

// ---------- Respiración ----------
const RESP = { '4-4-6': [4, 4, 6], '4-7-8 calma': [4, 7, 8], 'Apoyo 3-0-10': [3, 0, 10] };
function vRespiracion() {
  return `<h1>Respiración</h1><p class="sub" style="margin-bottom:16px">Inflá la panza al inhalar, hombros quietos. Soltá el aire con una "sss" pareja.</p>
    <div class="segmentado">${Object.keys(RESP).map((k, i) => `<button data-resp="${k}" class="${i === 0 ? 'on' : ''}">${k}</button>`).join('')}</div>
    <div class="burbuja-cont"><div class="burbuja" id="burbuja"><span id="cuenta"></span></div></div>
    <div class="fase" id="fase">Tocá empezar</div>
    <p class="chico" style="text-align:center;margin-top:6px" id="ciclos"></p>
    <div class="botones"><button class="btn" id="go">Empezar</button></div>`;
}
montajes['practicar/respiracion'] = () => {
  let patron = RESP['4-4-6'], timer = null, activo = false, ciclos = 0, inicio = 0;
  const bur = $('#burbuja'), fase = $('#fase'), cuenta = $('#cuenta');
  const correrFase = (k) => {
    if (!activo) return;
    const [inh, ret, exh] = patron;
    const fases = [['Inhalá', inh, 1.9], ['Sostené', ret, 1.9], ['Soltá con "sss"', exh, 1]];
    let [nom, seg, escala] = fases[k];
    if (!seg) return correrFase((k + 1) % 3);
    fase.textContent = nom;
    bur.style.transitionDuration = `${seg}s`;
    bur.style.transform = `scale(${escala})`;
    let n = seg; cuenta.textContent = n;
    const int = setInterval(() => { n--; if (n > 0) cuenta.textContent = n; }, 1000);
    timer = setTimeout(() => {
      clearInterval(int);
      if (k === 2) { ciclos++; $('#ciclos').textContent = `${ciclos} ciclo${ciclos > 1 ? 's' : ''}`; }
      correrFase((k + 1) % 3);
    }, seg * 1000);
    timer.int = int;
  };
  const parar = () => {
    activo = false; clearTimeout(timer); if (timer) clearInterval(timer.int);
    bur.style.transitionDuration = '.6s'; bur.style.transform = 'scale(1)'; cuenta.textContent = '';
    fase.textContent = 'Tocá empezar'; $('#go').textContent = 'Empezar';
    const min = (Date.now() - inicio) / 60000;
    if (inicio && min >= 1) S.registrarPractica(min);
    inicio = 0;
  };
  $('#go').onclick = () => {
    if (activo) return parar();
    activo = true; ciclos = 0; inicio = Date.now(); $('#go').textContent = 'Detener'; $('#ciclos').textContent = '';
    correrFase(0);
  };
  $$('[data-resp]').forEach((b) => b.onclick = () => {
    patron = RESP[b.dataset.resp];
    $$('[data-resp]').forEach((x) => x.classList.toggle('on', x === b));
    if (activo) { parar(); }
  });
  return parar;
};

// ---------- Teclado y escalas ----------
function vTeclado() {
  const desde = 48, hasta = 76; // Do3 a Mi5
  let blancas = '', negras = '', x = 0;
  for (let m = desde; m <= hasta; m++) {
    if (A.esNegra(m)) negras += `<button class="tecla negra" data-m="${m}" style="left:${x * 49 - 16}px"></button>`;
    else { blancas += `<button class="tecla" data-m="${m}">${m % 12 === 0 ? A.nombreNota(m) : ''}</button>`; x++; }
  }
  const raices = []; for (let m = 48; m <= 67; m++) raices.push(m);
  return `<h1>Teclado y escalas</h1><p class="sub" style="margin-bottom:12px">Tocá una tecla para tomar la nota, o hacé sonar una escala y cantala.</p>
    <div class="nota-actual" id="nota">—</div>
    <div class="teclado-scroll" id="scroll"><div class="teclado">${blancas}${negras}</div></div>
    <h3>Escalas guiadas</h3>
    <div class="card">
      <div class="grilla-2">
        <label class="campo"><span>Ejercicio</span><select id="patron">${Object.keys(A.PATRONES).map((p) => `<option>${p}</option>`).join('')}</select></label>
        <label class="campo"><span>Desde</span><select id="raiz">${raices.map((m) => `<option value="${m}" ${m === 57 ? 'selected' : ''}>${A.nombreNota(m)}</option>`).join('')}</select></label>
      </div>
      <label class="campo"><span>Velocidad: <b id="vel-v">110</b> bpm</span><input type="range" id="vel" min="60" max="180" value="110"></label>
      <div class="grilla-2"><button class="btn" id="tocar">${I.play.replace('<svg', '<svg stroke="currentColor"')} Tocar</button><button class="btn sec" id="subir">Subir ½ tono</button></div>
      <p class="chico" style="margin-top:12px">Primero suena el acorde de referencia, después el ejercicio. Cada vez que lo repitas, subí medio tono.</p>
    </div>`;
}
montajes['practicar/teclado'] = () => {
  const iluminar = (m, ms = 350) => {
    const t = $(`.tecla[data-m="${m}"]`); if (!t) return;
    t.classList.add('activa'); setTimeout(() => t.classList.remove('activa'), ms);
    $('#nota').textContent = A.nombreNota(m);
  };
  $$('.tecla').forEach((t) => t.addEventListener('pointerdown', (e) => { e.preventDefault(); const m = Number(t.dataset.m); A.tocar(m, 1.2); iluminar(m, 300); }));
  $('#scroll').scrollLeft = 7 * 49 * 0.6;
  const vel = $('#vel');
  vel.oninput = () => { $('#vel-v').textContent = vel.value; };
  let ocupado = false;
  const tocar = () => {
    if (ocupado) return; ocupado = true;
    const raiz = Number($('#raiz').value);
    const ms = A.tocarPatron(raiz, A.PATRONES[$('#patron').value], Number(vel.value), (m) => iluminar(m, 60000 / Number(vel.value) * 0.9));
    setTimeout(() => { ocupado = false; }, ms);
  };
  $('#tocar').onclick = tocar;
  $('#subir').onclick = () => {
    const sel = $('#raiz');
    if (sel.selectedIndex < sel.options.length - 1) sel.selectedIndex++;
    tocar();
  };
};

// ---------- Metrónomo ----------
function vMetronomo() {
  return `<h1>Metrónomo</h1><p class="sub" style="margin-bottom:24px">Ideal para trabajar el ritmo de una canción o los staccatos.</p>
    <div class="bpm" id="bpm">80</div><p class="chico" style="text-align:center">pulsos por minuto</p>
    <div class="pulsos" id="pulsos"></div>
    <input type="range" id="rango" min="40" max="208" value="80">
    <div class="grilla-2" style="margin-top:12px"><button class="btn sec" id="menos">− 5</button><button class="btn sec" id="mas">+ 5</button></div>
    <div class="segmentado" style="margin-top:12px">${[2, 3, 4, 6].map((c) => `<button data-compas="${c}" class="${c === 4 ? 'on' : ''}">${c}/4</button>`).join('')}</div>
    <div class="botones"><button class="btn" id="go">Iniciar</button><button class="btn sec" id="tap">Marcar tempo (tocá al ritmo)</button></div>`;
}
montajes['practicar/metronomo'] = () => {
  let compas = 4;
  const pulsosEl = $('#pulsos');
  const dibujar = () => { pulsosEl.innerHTML = Array.from({ length: compas }, (_, i) => `<i class="${i === 0 ? 'primero' : ''}"></i>`).join(''); };
  dibujar();
  const met = A.crearMetronomo((n) => {
    $$('#pulsos i').forEach((p, i) => p.classList.toggle('on', i === n));
  });
  const setBpm = (v) => { met.setBpm(v); $('#bpm').textContent = met.bpm; $('#rango').value = met.bpm; };
  $('#rango').oninput = (e) => setBpm(Number(e.target.value));
  $('#menos').onclick = () => setBpm(met.bpm - 5);
  $('#mas').onclick = () => setBpm(met.bpm + 5);
  $('#go').onclick = () => { if (met.activo) { met.stop(); $('#go').textContent = 'Iniciar'; } else { met.start(); $('#go').textContent = 'Detener'; } };
  $$('[data-compas]').forEach((b) => b.onclick = () => { compas = Number(b.dataset.compas); met.setCompas(compas); dibujar(); $$('[data-compas]').forEach((x) => x.classList.toggle('on', x === b)); });
  let taps = [];
  $('#tap').onclick = () => {
    const t = performance.now();
    taps = taps.filter((x) => t - x < 3000); taps.push(t);
    if (taps.length >= 2) { const prom = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); setBpm(Math.round(60000 / prom)); }
  };
  return () => met.stop();
};

// ---------- Afinador ----------
function vAfinador() {
  return `<h1>Afinador</h1><p class="sub" style="margin-bottom:24px">Cantá una nota sostenida con "a" o "u" y mirá si estás afinado.</p>
    <div class="nota-actual" id="nota" style="font-size:64px">—</div>
    <p class="chico" style="text-align:center" id="frec">&nbsp;</p>
    <div class="medidor"><div class="eje"></div><div class="centro"></div><div class="aguja" id="aguja"></div></div>
    <div class="fila entre chico"><span>Bajo ♭</span><span id="estado">&nbsp;</span><span>Alto ♯</span></div>
    <div class="botones"><button class="btn" id="go">Escuchar</button><button class="btn sec" id="ref">Tocar La 440 de referencia</button></div>
    <p class="chico" style="margin-top:14px">La app usa el micrófono solo mientras esta pantalla está abierta. No se graba nada.</p>`;
}
montajes['practicar/afinador'] = () => {
  let af = null;
  const leer = (r) => {
    if (!r) { $('#estado').textContent = 'Esperando sonido…'; $('#aguja').classList.remove('afinado'); return; }
    $('#nota').textContent = r.nota;
    $('#frec').textContent = `${r.frec.toFixed(1)} Hz · ${r.cents > 0 ? '+' : ''}${r.cents} cents`;
    $('#aguja').style.left = `${50 + r.cents}%`;
    const ok = Math.abs(r.cents) <= 10;
    $('#aguja').classList.toggle('afinado', ok);
    $('#estado').textContent = ok ? '¡Afinado!' : r.cents < 0 ? 'Subí un poquito' : 'Bajá un poquito';
  };
  $('#go').onclick = async () => {
    if (af) { af.stop(); af = null; $('#go').textContent = 'Escuchar'; return; }
    try { af = await A.crearAfinador(leer); $('#go').textContent = 'Detener'; }
    catch { toast('Necesitamos permiso del micrófono'); }
  };
  $('#ref').onclick = () => A.tocar(69, 2);
  return () => af && af.stop();
};

// ============================================================
//  Cuota
// ============================================================
function vCuota() {
  const s = S.get();
  const c = S.estadoCuota();
  const estado = c.pagada
    ? `<span class="chip ok">${I.check.replace('<svg', '<svg width="14" height="14"')} Pagada</span>`
    : c.dias < 0 ? `<span class="chip alerta">Vencida hace ${-c.dias} día${c.dias === -1 ? '' : 's'}</span>`
    : `<span class="chip ${c.dias <= 3 ? 'alerta' : ''}">${c.dias === 0 ? 'Vence hoy' : `Vence en ${c.dias} día${c.dias > 1 ? 's' : ''}`}</span>`;
  const hoy = new Date();
  const meses = [];
  for (let k = -5; k <= 2; k++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + k, 1);
    const pago = s.cuota.pagos.includes(S.ym(d));
    meses.push(`<button class="mes ${pago ? 'pago' : ''}" data-mes="${S.ym(d)}"><b>${S.MESES[d.getMonth()].slice(0, 3)}</b>${pago ? 'Pagada' : k > 0 || S.ym(d) < (s.alta || '') ? '—' : 'Pendiente'}</button>`);
  }
  return `<h1>Cuota</h1><p class="sub" style="margin-bottom:18px">Se paga del ${ESCUELA.pagoDesde} al ${ESCUELA.pagoHasta} de cada mes.</p>
    <div class="card destacada">
      <div class="fila entre"><div class="etiqueta">Cuota de ${c.mesNombre}</div>${estado}</div>
      ${c.pagada ? `<p style="margin-top:12px">¡Gracias! Este mes ya está al día.</p>` : `
        ${ESCUELA.linkPago ? `<div class="botones"><button class="btn claro" data-abrir="${esc(ESCUELA.linkPago)}">Pagar con Mercado Pago</button></div>` : ''}
        <p class="chico" style="margin-top:14px">Transferencia a nombre de ${esc(ESCUELA.titularPago)}</p>
        <button class="alias" id="alias" style="width:100%;color:var(--crema)"><span>${esc(ESCUELA.aliasPago)}</span>${I.copiar.replace('<svg', '<svg width="20" height="20" stroke="currentColor"')}</button>`}
    </div>
    ${c.pagada ? '' : `<div class="botones"><button class="btn borde" id="pague">${I.whatsapp.replace('<svg', '<svg stroke="currentColor"')} Ya pagué · enviar comprobante</button></div>
      <p class="chico" style="text-align:center;margin-top:8px">Se abre WhatsApp para que adjuntes el comprobante y queda marcada como pagada.</p>`}
    <h3>Historial</h3>
    <div class="meses">${meses.join('')}</div>
    <p class="chico" style="margin-top:10px">Tocá un mes para marcarlo o desmarcarlo como pagado.</p>`;
}
montajes.cuota = () => {
  const alias = $('#alias');
  if (alias) alias.onclick = async () => {
    try { await navigator.clipboard.writeText(ESCUELA.aliasPago); }
    catch { const t = document.createElement('textarea'); t.value = ESCUELA.aliasPago; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    toast('Alias copiado');
  };
  const pague = $('#pague');
  if (pague) pague.onclick = async () => {
    const c = S.estadoCuota();
    S.update((s) => { if (!s.cuota.pagos.includes(c.mes)) s.cuota.pagos.push(c.mes); });
    await N.reprogramar();
    abrir(waLink(`Hola! Soy ${S.get().nombre}${S.get().docente ? ` (alumno/a de ${S.get().docente})` : ''}. Te envío el comprobante de la cuota de ${c.mesNombre}.`));
    render();
  };
  $$('[data-mes]').forEach((b) => b.onclick = async () => {
    const m = b.dataset.mes;
    S.update((s) => { const i = s.cuota.pagos.indexOf(m); if (i >= 0) s.cuota.pagos.splice(i, 1); else s.cuota.pagos.push(m); });
    await N.reprogramar();
    render();
  });
};

// ============================================================
//  Novedades (se actualizan solas desde internet)
// ============================================================
const NKEY = 'edc.novedades';
function novedades() {
  try { const n = JSON.parse(localStorage.getItem(NKEY)); if (n && n.novedades) return n; } catch {}
  return NOVEDADES_INICIALES;
}
function novedadesSinLeer() {
  const vistas = S.get().novedadesVistas || [];
  return novedades().novedades.filter((n) => !vistas.includes(n.id)).length;
}
async function actualizarNovedades() {
  if (!ESCUELA.novedadesUrl) return;
  try {
    const r = await fetch(`${ESCUELA.novedadesUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    if (!data || !Array.isArray(data.novedades)) return;
    data.novedades.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    localStorage.setItem(NKEY, JSON.stringify(data));
    if (!ruta.includes('/')) render();
  } catch {}
}
function avisoActualizacion() {
  const v = novedades().versionApp;
  if (!v || !ESCUELA.descargaUrl || !esMayor(v, VERSION_APP)) return '';
  return `<div class="aviso-update"><div class="icono-circ" style="background:none">${I.descarga.replace('<svg', '<svg style="stroke:var(--dorado)"')}</div>
    <div style="flex:1"><b>Hay una versión nueva</b><p class="chico">Descargala e instalala encima de esta. No perdés tus datos.</p></div>
    <button class="btn peq borde" data-abrir="${esc(ESCUELA.descargaUrl)}">Bajar</button></div>`;
}
const esMayor = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
const fechaCorta = (f) => { if (!f) return ''; const [y, m, d] = f.split('-').map(Number); return `${d} de ${S.MESES[m - 1]}`; };
const recortar = (t, n) => (t && t.length > n ? t.slice(0, n - 1) + '…' : t || '');

function vNovedades() {
  const { novedades: lista } = novedades();
  const vistas = S.get().novedadesVistas || [];
  return `<h1>Novedades</h1><p class="sub" style="margin-bottom:18px">Close mics, muestras, feriados y todo lo que pasa en la escuela.</p>
    ${lista.length ? lista.map((n) => `<div class="card nov">
      <div class="meta"><span class="chip oro">${esc(n.tipo || 'Escuela')}</span><span class="chico">${fechaCorta(n.fecha)}</span></div>
      <h2 class="${vistas.includes(n.id) ? '' : 'nueva'}">${esc(n.titulo)}</h2>
      <p class="sub" style="white-space:pre-line">${esc(n.texto)}</p>
      ${n.imagen ? `<img src="${esc(n.imagen)}" alt="" loading="lazy">` : ''}
      ${n.link ? `<div class="botones"><button class="btn sec peq" data-abrir="${esc(n.link)}" style="width:100%">${esc(n.boton || 'Ver más')}</button></div>` : ''}
    </div>`).join('') : '<div class="vacio">Todavía no hay novedades.</div>'}`;
}
montajes.novedades = () => {
  const ids = novedades().novedades.map((n) => n.id);
  // se marcan como leídas al salir, así el "Nuevo" se ve esta vez
  return () => S.update((s) => { s.novedadesVistas = [...new Set([...(s.novedadesVistas || []), ...ids])]; });
};

// ============================================================
//  Escuela: contacto, mis datos, avisos
// ============================================================
function vEscuela() {
  const s = S.get();
  return `<div style="margin-bottom:22px">${logo()}</div>
    <h3 style="margin-top:0">Contacto</h3>
    <div class="lista">
      <button class="item" data-abrir="${waLink(`Hola! Soy ${s.nombre}. `)}"><div class="icono-circ">${I.whatsapp}</div><div class="txt"><div class="tit">WhatsApp</div><div class="chico">Escribinos por consultas o cambios de horario</div></div><span class="flecha">›</span></button>
      <button class="item" data-abrir="mailto:${ESCUELA.email}"><div class="icono-circ">${I.mail}</div><div class="txt"><div class="tit">Mail</div><div class="chico">${esc(ESCUELA.email)}</div></div><span class="flecha">›</span></button>
      <button class="item" data-abrir="https://instagram.com/${ESCUELA.instagram}"><div class="icono-circ">${I.instagram}</div><div class="txt"><div class="tit">Instagram</div><div class="chico">@${esc(ESCUELA.instagram)}</div></div><span class="flecha">›</span></button>
      <button class="item" data-abrir="${esc(ESCUELA.mapsUrl)}"><div class="icono-circ">${I.mapa}</div><div class="txt"><div class="tit">Cómo llegar</div><div class="chico">${esc(ESCUELA.direccion)}</div></div><span class="flecha">›</span></button>
    </div>
    <h3>Mi cuenta</h3>
    <div class="lista">
      <button class="item" data-ir="escuela/datos"><div class="icono-circ">${I.usuario}</div><div class="txt"><div class="tit">Mis datos y horarios</div><div class="chico">${esc(s.nombre)}${s.docente ? ` · ${esc(s.docente)}` : ''}</div></div><span class="flecha">›</span></button>
      <button class="item" data-ir="escuela/avisos"><div class="icono-circ">${I.campana}</div><div class="txt"><div class="tit">Avisos</div><div class="chico">Clases, cuota y práctica</div></div><span class="flecha">›</span></button>
    </div>
    <div class="manifiesto"><div class="linea-oro"></div><p>${esc(ESCUELA.slogan)}</p><p class="chico" style="margin-top:10px;font-style:normal">Versión ${VERSION_APP}</p></div>`;
}

let borradorDatos = null;
function vDatos() {
  const s = S.get();
  if (!borradorDatos) borradorDatos = { nombre: s.nombre, docente: s.docente, clases: structuredClone(s.clases) };
  const b = borradorDatos;
  return `<h1>Mis datos</h1><p class="sub" style="margin-bottom:18px">Si cambia tu horario, actualizalo acá y los avisos se reprograman solos.</p>
    <label class="campo"><span>Nombre</span><input type="text" id="nombre" value="${esc(b.nombre)}"></label>
    <label class="campo"><span>Profe</span><select id="docente"><option value="">—</option>${ESCUELA.docentes.map((d) => `<option ${d === b.docente ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label>
    <h3>Mis clases</h3>
    ${editorClases(b.clases)}
    <div class="botones"><button class="btn" id="guardar">Guardar</button></div>`;
}
montajes['escuela/datos'] = () => {
  const b = borradorDatos;
  $('#nombre').oninput = (e) => { b.nombre = e.target.value; };
  $('#docente').onchange = (e) => { b.docente = e.target.value; };
  montarEditorClases(b.clases, () => { const y = window.scrollY; render(); window.scrollTo(0, y); });
  $('#guardar').onclick = async () => {
    S.update((s) => { s.nombre = b.nombre.trim() || s.nombre; s.docente = b.docente; s.clases = b.clases; });
    borradorDatos = null;
    await N.reprogramar();
    toast('Guardado');
    volver();
  };
  return () => { if (ruta !== 'escuela/datos') borradorDatos = null; };
};

function vAvisos() {
  const a = S.get().avisos;
  const sw = (k, tit, sub) => `<div class="item"><div class="txt"><div class="tit">${tit}</div><div class="chico">${sub}</div></div>
    <label class="switch"><input type="checkbox" data-av="${k}" ${a[k] ? 'checked' : ''}><i></i></label></div>`;
  return `<h1>Avisos</h1><p class="sub" style="margin-bottom:18px">Elegí qué recordatorios querés recibir.</p>
    <div class="lista">
      ${sw('claseDiaAntes', 'Clase: el día anterior', 'A las 20 h')}
      ${sw('claseHoraAntes', 'Clase: una hora antes', 'Con sugerencia de calentamiento')}
      ${sw('cuota', 'Cuota', `El día ${ESCUELA.pagoDesde}, 3 días antes del ${ESCUELA.pagoHasta}, el ${ESCUELA.pagoHasta} y si queda pendiente`)}
      ${sw('practica', 'Recordatorio de práctica', 'Todos los días')}
    </div>
    <label class="campo" style="margin-top:14px"><span>Hora del recordatorio de práctica</span><input type="time" id="phora" value="${a.practicaHora}"></label>
    <div class="botones"><button class="btn sec" id="probar">Probar un aviso</button></div>`;
}
montajes['escuela/avisos'] = () => {
  $$('[data-av]').forEach((c) => c.onchange = async () => {
    if (c.checked) { await N.prepararCanal(); const p = await N.pedirPermiso(); if (p === 'denied') { toast('Activá las notificaciones en Ajustes del teléfono'); } }
    S.update((s) => { s.avisos[c.dataset.av] = c.checked; });
    await N.reprogramar();
  });
  $('#phora').onchange = async (e) => { S.update((s) => { s.avisos.practicaHora = e.target.value; }); await N.reprogramar(); };
  $('#probar').onclick = async () => { await N.prepararCanal(); await N.pedirPermiso(); await N.probar(); };
};

// ============================================================
//  Arranque
// ============================================================
async function iniciar() {
  render();
  if (nativo) {
    CapApp.addListener('backButton', () => { if (!volver()) CapApp.minimizeApp(); });
    CapApp.addListener('resume', () => { actualizarNovedades(); N.reprogramar(); if (!ruta.includes('/')) render(); });
    await N.prepararCanal();
    if (S.get().onboarded) N.reprogramar();
  }
  actualizarNovedades();
}
iniciar();
