import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { ESCUELA, VERSION_APP } from './config.js';
import * as S from './store.js';
import { I, logo } from './iconos.js';
import { RUTINAS, TIPS, NOVEDADES_INICIALES, ACTIVIDADES_INICIALES, PERFIL_OPCIONES, ESCALAS, VOCES, VOZ_DE_TESITURA } from './contenido.js';
import * as N from './notif.js';
import * as A from './audio.js';
import { icsMisAvisos, icsActividad, abrirIcs } from './ics.js';

const nativo = Capacitor.isNativePlatform();
const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
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
  ['inicio', 'Inicio'], ['practicar', 'Practicar'], ['cuota', 'Cuota'], ['agenda', 'Agenda'], ['escuela', 'Escuela'],
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
  const vistas = { inicio: vInicio, practicar: vPracticar, cuota: vCuota, agenda: vAgenda, escuela: vEscuela };
  const subvistas = {
    'practicar/rutina': vRutina, 'practicar/respiracion': vRespiracion, 'practicar/teclado': vTeclado,
    'practicar/temas': vTemas, 'practicar/escalas': vEscalas, 'practicar/escala': vEscala, 'practicar/metronomo': vMetronomo, 'practicar/afinador': vAfinador, 'escuela/datos': vDatos, 'escuela/perfil': vPerfil, 'escuela/avisos': vAvisos,
  };
  const fn = sub ? subvistas[`${base}/${sub}`] : vistas[base];
  const html = (fn || vInicio)(arg);
  const conTabs = !sub;
  app.innerHTML = `<main class="vista ${conTabs ? '' : 'sin-tabs'}">${sub ? `<button class="volver" data-volver>${I.volver} Volver</button>` : ''}${html}</main>${conTabs ? barra(base) : ''}`;
  $$('[data-volver]').forEach((b) => b.onclick = () => volver());
  $$('[data-ir]').forEach((b) => b.onclick = () => ir(b.dataset.ir));
  $$('[data-tab]').forEach((b) => b.onclick = () => irTab(b.dataset.tab));
  $$('[data-agenda]').forEach((b) => b.onclick = () => { agendaVista = b.dataset.agenda; irTab('agenda'); });
  $$('[data-abrir]').forEach((b) => b.onclick = (e) => { e.preventDefault(); abrir(b.dataset.abrir); });
  const montar = montajes[sub ? `${base}/${sub}` : base];
  if (montar) limpiar = montar(arg) || null;
}

function barra(activa) {
  const sinLeer = novedadesSinLeer();
  return `<div class="tabs"><nav>${TABS.map(([id, txt]) => `
    <button data-tab="${id}" class="${activa === id ? 'on' : ''}">${I[id]}<span>${txt}</span>${id === 'agenda' && sinLeer ? '<b class="punto"></b>' : ''}</button>`).join('')}</nav></div>`;
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
    if (!b.avisos) b.avisos = { ...S.get().avisos };
    cuerpo = `<h1>Elegí tus avisos</h1><p class="sub">${nativo ? 'Activá solo los que te sirvan. Podés cambiarlos cuando quieras desde Escuela › Avisos.' : 'Elegí cuáles querés. Los vamos a agregar al calendario de tu teléfono, que es el que te avisa.'}</p>
      ${listaAvisos(b.avisos, false)}`;
    acciones = `<button class="btn" id="activar">${nativo ? 'Guardar y activar' : 'Guardar y agregar a mi calendario'}</button><button class="btn sec" id="sin">Ahora no</button>`;
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
  if (onb.paso === 5) $$('[data-av]').forEach((c) => c.onchange = () => { b.avisos[c.dataset.av] = c.checked; });
  const yapago = $('#yapago');
  if (yapago) yapago.onchange = () => { b.yaPago = yapago.checked; };

  const terminar = async (conAvisos) => {
    S.update((s) => {
      s.nombre = b.nombre.trim(); s.docente = b.docente; s.clases = b.clases;
      s.onboarded = true; s.alta = S.ym(new Date());
      if (conAvisos && b.avisos) s.avisos = { ...s.avisos, ...b.avisos };
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
    if (conAvisos && !nativo) abrirIcs(icsMisAvisos());
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
    ${!nativo && esIOS && !instalada ? `<div class="aviso-update"><div class="icono-circ" style="background:none">${I.descarga.replace('<svg', '<svg style="stroke:var(--dorado)"')}</div>
      <div style="flex:1"><b>Instalala en tu iPhone</b><p class="chico">Tocá <b>Compartir</b> (el cuadrado con la flecha) y después <b>"Agregar a inicio"</b>.</p></div></div>` : ''}
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

    ${proximaActividadHtml()}

    ${perfilCompleto() < 60 ? `<button class="card completar" data-ir="escuela/perfil" style="width:100%;text-align:left;margin-top:12px"><div class="fila"><div class="icono-circ">${I.usuario}</div><div style="flex:1"><b>Completá tu perfil</b><p class="chico">Así tu profe te conoce mejor · ${perfilCompleto()}%</p></div><span class="flecha">›</span></div><div class="barra-perfil"><i style="width:${perfilCompleto()}%"></i></div></button>` : ''}

    ${ultima ? `<h3>Última novedad</h3><button class="card nov" data-agenda="novedades" style="width:100%;text-align:left">
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

    <button class="card destacada escalas-cta" data-ir="practicar/escalas" style="width:100%;text-align:left;margin-top:12px">
      <div class="fila"><div class="icono-circ" style="background:rgba(243,238,228,.14)">${I.piano}</div>
      <div style="flex:1"><b>Escalas con piano</b><p class="chico">${ESCALAS.length} ejercicios que suben de a medio tono según tu voz</p></div><span class="flecha" style="color:var(--crema)">›</span></div>
    </button>

    <div class="fila entre" style="margin:26px 0 10px"><h3 style="margin:0">Mis temas</h3><button class="link" data-ir="practicar/temas">${S.get().temas.length ? 'Ver todos' : ''}</button></div>
    ${bloqueTemas()}

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
  montarTemas();
};

// ---------- Escalas con piano ----------
const vozActual = () => VOCES.find((v) => v.id === (S.get().vozEscalas || VOZ_DE_TESITURA[(S.get().perfil || {}).tesitura] || 'mezzo')) || VOCES[1];

function vEscalas() {
  const v = vozActual();
  const grupos = [...new Set(ESCALAS.map((e) => e.grupo))];
  return `<h1>Escalas con piano</h1><p class="sub" style="margin-bottom:16px">El piano toca el acorde, vos cantás la escala y sube medio tono cada vez, dentro del rango de tu voz.</p>
    <label class="campo"><span>Tu voz</span><select id="esc-voz">${VOCES.map((x) => `<option value="${x.id}" ${x.id === v.id ? 'selected' : ''}>${x.nombre} · ${x.detalle}</option>`).join('')}</select></label>
    ${grupos.map((g) => `<h3>${g}</h3><div class="lista">${ESCALAS.filter((e) => e.grupo === g).map((e) => `
      <button class="item" data-ir="practicar/escala/${e.id}"><div class="icono-circ">${I.piano}</div>
      <div class="txt"><div class="tit">${esc(e.nombre)}</div><div class="chico">${new Set(e.silabas).size === 1 ? `"${esc(e.silabas[0])}"` : esc(e.silabas.slice(0, 5).join('-') + (e.silabas.length > 5 ? '…' : ''))} · ${e.patron.length} notas · ${e.bpm} bpm</div></div><span class="flecha">›</span></button>`).join('')}</div>`).join('')}
    <p class="chico" style="margin-top:18px">Si no sabés tu tipo de voz, preguntale a tu profe. Mientras tanto elegí la que te quede cómoda: si te cuesta llegar arriba, probá una más grave.</p>`;
}
montajes['practicar/escalas'] = () => {
  A.cargarPiano();
  $('#esc-voz').onchange = (e) => { S.update((s) => { s.vozEscalas = e.target.value; }); };
};

function vEscala(id) {
  const e = ESCALAS.find((x) => x.id === id) || ESCALAS[0];
  const v = vozActual();
  const max = Math.max(...e.patron);
  const inicios = []; for (let m = v.desde - 5; m + max <= v.techo; m++) if (m >= 36) inicios.push(m);
  return `<div class="fila entre"><span class="chip oro">${esc(e.grupo)}</span><span class="chico">${esc(v.nombre)}</span></div>
    <h1 style="margin-top:8px">${esc(e.nombre)}</h1>
    <p class="sub">${esc(e.indicacion)}</p>
    <div class="card escala-visor">
      <div class="fila entre"><div><div class="etiqueta">Tono</div><div class="tono-actual" id="esc-tono">${A.nombreNota(v.desde)}</div></div>
        <div style="text-align:right"><div class="etiqueta" id="esc-dir">Listo para empezar</div><div class="chico" id="esc-cont"></div></div></div>
      <div class="silabas" id="esc-silabas">${e.silabas.map((s, i) => `<span data-i="${i}">${esc(s)}</span>`).join('')}</div>
      <div class="progreso" style="margin:14px 0 0"><i id="esc-prog" style="width:0"></i></div>
    </div>
    <div class="controles">
      <button class="redondo" id="esc-ant" aria-label="Tono anterior">${I.ant}</button>
      <button class="redondo prim" id="esc-pp" aria-label="Reproducir">${I.play}</button>
      <button class="redondo" id="esc-sig" aria-label="Tono siguiente">${I.sig}</button>
    </div>
    <h3>Ajustes</h3>
    <div class="card">
      <label class="campo"><span>Velocidad: <b id="esc-bpm-v">${e.bpm}</b> bpm</span><input type="range" id="esc-bpm" min="50" max="200" value="${e.bpm}"></label>
      <label class="campo"><span>Empezar desde</span><select id="esc-desde">${inicios.map((m) => `<option value="${m}" ${m === v.desde ? 'selected' : ''}>${A.nombreNota(m)}</option>`).join('')}</select></label>
      <label class="item aviso-item" style="padding:4px 0"><div class="txt"><div class="tit">Solo subir</div><div class="chico">Sin la vuelta bajando</div></div><span class="switch"><input type="checkbox" id="esc-subir"><i></i></span></label>
    </div>
    <p class="chico" style="margin-top:12px">Usá auriculares o el parlante a volumen medio. Si una nota te raspa o duele, pará y bajá unos tonos.</p>`;
}
montajes['practicar/escala'] = (id) => {
  const e = ESCALAS.find((x) => x.id === id) || ESCALAS[0];
  const v = vozActual();
  const max = Math.max(...e.patron);
  let bpm = e.bpm, desde = v.desde, soloSubir = false;
  let tonos = [], idx = 0, corriendo = false, timers = [], inicio = 0, acumulado = 0;

  const armarTonos = () => {
    const sube = []; for (let m = desde; m + max <= v.techo; m++) sube.push(m);
    if (!sube.length) sube.push(desde);
    tonos = soloSubir ? sube : [...sube, ...sube.slice(0, -1).reverse()];
    const cumbre = sube.length - 1;
    tonos.dir = (i) => (i < cumbre ? 'Subiendo' : i === cumbre ? 'Arriba de todo' : 'Bajando');
  };
  const pintar = () => {
    const raiz = tonos[idx] ?? desde;
    $('#esc-tono').textContent = A.nombreNota(raiz);
    $('#esc-dir').textContent = corriendo ? tonos.dir(idx) : (idx ? 'En pausa' : 'Listo para empezar');
    $('#esc-cont').textContent = `Tono ${Math.min(idx + 1, tonos.length)} de ${tonos.length}`;
    $('#esc-prog').style.width = `${(idx / Math.max(1, tonos.length - 1)) * 100}%`;
    $('#esc-pp').innerHTML = corriendo ? I.pausa : I.play;
  };
  const marcar = (i) => $$('#esc-silabas span').forEach((s) => s.classList.toggle('on', Number(s.dataset.i) === i));
  const limpiar = () => { timers.forEach(clearTimeout); timers = []; marcar(-1); };
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  // Un tono: acorde de referencia (2 pulsos) + el ejercicio + 1 pulso de respiración
  const tocarTono = () => {
    if (!corriendo) return;
    const raiz = tonos[idx];
    const p = 60 / bpm;
    pintar();
    [raiz - 12, raiz - 8, raiz - 5].forEach((n) => A.tocar(n, p * 1.8, 0, 0.16));
    A.tocar(raiz, p * 1.8, 0, 0.12);
    e.patron.forEach((iv, k) => {
      const t = (2 + k) * p;
      const dur = e.corto ? Math.min(0.3, p * 0.5) : e.largo ? p * e.largo : p * 0.95;
      A.tocar(raiz + iv, dur, t, 0.3);
      if (k === 0 || e.largo) A.tocar(raiz - 12, dur, t, 0.1);
      later(() => marcar(k), t * 1000);
    });
    const total = (2 + e.patron.length + 1) * p * 1000;
    later(() => {
      marcar(-1);
      if (idx < tonos.length - 1) { idx++; tocarTono(); }
      else terminar();
    }, total);
  };
  const registrar = () => {
    if (inicio) { acumulado += Date.now() - inicio; inicio = 0; }
    if (acumulado >= 60000) { S.registrarPractica(acumulado / 60000); acumulado = 0; }
  };
  const terminar = () => {
    corriendo = false; limpiar(); registrar();
    $('#esc-dir').textContent = '¡Terminaste!';
    $('#esc-prog').style.width = '100%';
    $('#esc-pp').innerHTML = I.play;
    toast('¡Muy bien! Ejercicio completo');
    idx = 0;
  };
  const reproducir = async () => {
    A.audio();
    await A.cargarPiano();
    corriendo = true; inicio = Date.now(); tocarTono();
  };
  const pausar = () => { corriendo = false; limpiar(); registrar(); pintar(); };

  $('#esc-pp').onclick = () => (corriendo ? pausar() : reproducir());
  $('#esc-sig').onclick = () => { const r = corriendo; pausar(); idx = Math.min(idx + 1, tonos.length - 1); pintar(); if (r) reproducir(); };
  $('#esc-ant').onclick = () => { const r = corriendo; pausar(); idx = Math.max(idx - 1, 0); pintar(); if (r) reproducir(); };
  $('#esc-bpm').oninput = (ev) => { bpm = Number(ev.target.value); $('#esc-bpm-v').textContent = bpm; };
  $('#esc-desde').onchange = (ev) => { pausar(); desde = Number(ev.target.value); idx = 0; armarTonos(); pintar(); };
  $('#esc-subir').onchange = (ev) => { pausar(); soloSubir = ev.target.checked; idx = Math.min(idx, 0); armarTonos(); pintar(); };

  A.cargarPiano();
  armarTonos(); pintar();
  return () => { corriendo = false; limpiar(); registrar(); };
};

// ---------- Mis temas (repertorio que el alumno está trabajando) ----------
const esLink = (t) => /^(https?:\/\/|www\.)\S+$/i.test(String(t).trim());
const normalizarLink = (t) => { t = String(t || '').trim(); if (!t) return ''; return /^https?:\/\//i.test(t) ? t : `https://${t}`; };
function fuente(link) {
  if (!link) return { nombre: '', icono: I.nota };
  if (/youtu\.?be/i.test(link)) return { nombre: 'YouTube', icono: I.youtube };
  if (/spotify\.com/i.test(link)) return { nombre: 'Spotify', icono: I.spotify };
  try { return { nombre: new URL(link).hostname.replace(/^www\./, ''), icono: I.enlace }; } catch { return { nombre: 'Link', icono: I.enlace }; }
}
// Busca el nombre real del tema a partir del link (YouTube y Spotify). Si no hay internet, queda el genérico.
async function tituloDesdeLink(link) {
  const api = /youtu\.?be/i.test(link) ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`
    : /spotify\.com/i.test(link) ? `https://open.spotify.com/oembed?url=${encodeURIComponent(link)}` : '';
  if (!api) return '';
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(api, { signal: ctl.signal }); clearTimeout(t);
    if (!r.ok) return '';
    const d = await r.json();
    return d.title ? (d.author_name && !/ - /.test(d.title) ? `${d.title} · ${d.author_name}` : d.title) : '';
  } catch { return ''; }
}

function filaTema(t, completa) {
  const f = fuente(t.link);
  const listo = t.estado === 'listo';
  return `<div class="item tema ${listo ? 'listo' : ''}">
    <button class="icono-circ" ${t.link ? `data-abrir="${esc(t.link)}" aria-label="Abrir link"` : 'tabindex="-1"'}>${f.icono}</button>
    <button class="txt" ${t.link ? `data-abrir="${esc(t.link)}"` : ''} style="text-align:left">
      <div class="tit">${esc(t.titulo)}</div>
      <div class="chico">${f.nombre ? `${esc(f.nombre)} · ` : ''}${listo ? 'Listo' : 'Trabajando'}</div>
    </button>
    ${completa ? `<button class="accion-tema ${listo ? 'on' : ''}" data-listo="${t.id}" aria-label="${listo ? 'Volver a trabajando' : 'Marcar como listo'}">${I.check}</button>
      <button class="accion-tema" data-borrar="${t.id}" aria-label="Borrar">${I.basura}</button>` : ''}
  </div>`;
}

function formTema() {
  return `<div class="card form-tema">
    <label class="campo"><span>Tema (nombre o link)</span><input type="text" id="tema-txt" placeholder="Ej: Fly me to the moon · Sinatra" autocomplete="off"></label>
    <label class="campo"><span>Link de YouTube o Spotify (opcional)</span><input type="text" id="tema-link" inputmode="url" placeholder="Pegá el link acá" autocomplete="off"></label>
    <button class="btn borde" id="tema-agregar" disabled>${I.mas.replace('<svg', '<svg stroke="currentColor"')} Agregar tema</button>
  </div>`;
}

function bloqueTemas() {
  const temas = S.get().temas.filter((t) => t.estado !== 'listo').slice(0, 3);
  if (!S.get().temas.length) return `${formTema()}<p class="chico" style="margin-top:8px">Anotá las canciones que estás preparando con tu profe, con el link para escucharlas.</p>`;
  return `${temas.length ? `<div class="lista">${temas.map((t) => filaTema(t, false)).join('')}</div>` : '<p class="chico">No tenés temas en proceso.</p>'}
    <div class="botones"><button class="btn sec" data-ir="practicar/temas">${I.mas.replace('<svg', '<svg stroke="currentColor"')} Agregar o editar temas</button></div>`;
}

function vTemas() {
  const temas = S.get().temas;
  const trabajando = temas.filter((t) => t.estado !== 'listo');
  const listos = temas.filter((t) => t.estado === 'listo');
  return `<h1>Mis temas</h1><p class="sub" style="margin-bottom:18px">Las canciones que estás trabajando, con su link para escucharlas cuando practicás.</p>
    ${formTema()}
    ${trabajando.length ? `<h3>Trabajando</h3><div class="lista">${trabajando.map((t) => filaTema(t, true)).join('')}</div>` : ''}
    ${listos.length ? `<h3>Listos</h3><div class="lista">${listos.map((t) => filaTema(t, true)).join('')}</div>` : ''}
    ${temas.length ? `<div class="botones"><button class="btn sec" id="tema-enviar">${I.whatsapp.replace('<svg', '<svg stroke="currentColor"')} Mandarle mi lista a mi profe</button></div>` : ''}
    ${temas.length ? '' : '<div class="vacio">Todavía no agregaste temas.</div>'}`;
}

function montarTemas() {
  const txt = $('#tema-txt'), lnk = $('#tema-link'), btn = $('#tema-agregar');
  if (txt) {
    const actualizar = () => { btn.disabled = !(txt.value.trim() || lnk.value.trim()); };
    txt.oninput = actualizar; lnk.oninput = actualizar;
    const enviar = (e) => { if (e.key === 'Enter' && !btn.disabled) btn.click(); };
    txt.onkeydown = enviar; lnk.onkeydown = enviar;
    btn.onclick = async () => {
      let titulo = txt.value.trim(), link = lnk.value.trim();
      if (!link && esLink(titulo)) { link = titulo; titulo = ''; }
      link = normalizarLink(link);
      btn.disabled = true;
      if (!titulo && link) { btn.textContent = 'Buscando el nombre…'; titulo = await tituloDesdeLink(link); }
      if (!titulo) titulo = link ? `Tema de ${fuente(link).nombre}` : 'Tema sin nombre';
      S.update((s) => { s.temas.unshift({ id: Date.now().toString(36), titulo, link, estado: 'trabajando', creado: S.ymd(new Date()) }); });
      toast('Tema agregado');
      render();
    };
  }
  $$('[data-listo]').forEach((b) => b.onclick = () => {
    S.update((s) => { const t = s.temas.find((x) => x.id === b.dataset.listo); if (t) t.estado = t.estado === 'listo' ? 'trabajando' : 'listo'; });
    render();
  });
  $$('[data-borrar]').forEach((b) => b.onclick = () => {
    if (b.dataset.confirmar !== '1') { b.dataset.confirmar = '1'; b.classList.add('confirmar'); b.setAttribute('aria-label', 'Tocá de nuevo para borrar'); toast('Tocá de nuevo para borrar'); setTimeout(() => { b.dataset.confirmar = ''; b.classList.remove('confirmar'); }, 3000); return; }
    S.update((s) => { s.temas = s.temas.filter((x) => x.id !== b.dataset.borrar); });
    render();
  });
  const env = $('#tema-enviar');
  if (env) env.onclick = () => {
    const s = S.get();
    const linea = (t) => `• ${t.titulo}${t.link ? `\n  ${t.link}` : ''}`;
    const tr = s.temas.filter((t) => t.estado !== 'listo'), li = s.temas.filter((t) => t.estado === 'listo');
    const msg = `Hola${s.docente ? ` ${s.docente.replace(/ \(online\)/, '')}` : ''}! Soy ${s.nombre}. Estos son mis temas:\n\n${tr.length ? `Trabajando:\n${tr.map(linea).join('\n')}` : ''}${li.length ? `${tr.length ? '\n\n' : ''}Listos:\n${li.map(linea).join('\n')}` : ''}`;
    abrir(waLink(msg));
  };
}
montajes['practicar/temas'] = () => montarTemas();

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
  A.cargarPiano();
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
  A.cargarPiano();
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
  if (!nativo || !v || !ESCUELA.descargaUrl || !esMayor(v, VERSION_APP)) return '';
  return `<div class="aviso-update"><div class="icono-circ" style="background:none">${I.descarga.replace('<svg', '<svg style="stroke:var(--dorado)"')}</div>
    <div style="flex:1"><b>Hay una versión nueva</b><p class="chico">Descargala e instalala encima de esta. No perdés tus datos.</p></div>
    <button class="btn peq borde" data-abrir="${esc(ESCUELA.descargaUrl)}">Bajar</button></div>`;
}
const esMayor = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
const fechaCorta = (f) => { if (!f) return ''; const [y, m, d] = f.split('-').map(Number); return `${d} de ${S.MESES[m - 1]}`; };
const recortar = (t, n) => (t && t.length > n ? t.slice(0, n - 1) + '…' : t || '');

function listaNovedades() {
  const { novedades: lista } = novedades();
  const vistas = S.get().novedadesVistas || [];
  return `${lista.length ? lista.map((n) => `<div class="card nov">
      <div class="meta"><span class="chip oro">${esc(n.tipo || 'Escuela')}</span><span class="chico">${fechaCorta(n.fecha)}</span></div>
      <h2 class="${vistas.includes(n.id) ? '' : 'nueva'}">${esc(n.titulo)}</h2>
      <p class="sub" style="white-space:pre-line">${esc(n.texto)}</p>
      ${n.imagen ? `<img src="${esc(n.imagen)}" alt="" loading="lazy">` : ''}
      ${n.link ? `<div class="botones"><button class="btn sec peq" data-abrir="${esc(n.link)}" style="width:100%">${esc(n.boton || 'Ver más')}</button></div>` : ''}
    </div>`).join('') : '<div class="vacio">Todavía no hay novedades.</div>'}`;
}
// ============================================================
//  Agenda: calendario de actividades + novedades
//  Las actividades se editan en actividades.json (GitHub) y llegan solas.
// ============================================================
let agendaVista = 'calendario';
let agendaMes = null; // Date (día 1 del mes que se muestra)
let agendaDia = null; // 'YYYY-MM-DD' seleccionado

const AKEY = 'edc.actividades';
function actividades() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(AKEY)); } catch {}
  const lista = (data && Array.isArray(data.actividades) ? data : ACTIVIDADES_INICIALES).actividades;
  return lista.filter((a) => a && a.fecha && a.titulo).map((a) => ({ ...a, hasta: a.hasta || a.fecha }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
async function actualizarActividades() {
  if (!ESCUELA.actividadesUrl) return;
  try {
    const r = await fetch(`${ESCUELA.actividadesUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    if (!data || !Array.isArray(data.actividades)) return;
    localStorage.setItem(AKEY, JSON.stringify(data));
    N.reprogramar();
    if (!ruta.includes('/')) render();
  } catch {}
}
const enDia = (a, k) => a.fecha <= k && k <= a.hasta;
const fechaD = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
function rangoTexto(a) {
  const d1 = fechaD(a.fecha), d2 = fechaD(a.hasta);
  const mes = (d) => S.MESES[d.getMonth()];
  if (a.fecha === a.hasta) return `${S.DIAS[d1.getDay()]} ${d1.getDate()} de ${mes(d1)}`;
  if (d1.getMonth() === d2.getMonth()) return `${d1.getDate()} y ${d2.getDate()} de ${mes(d1)}`.replace(/^(\d+) y (\d+)/, (m0, x, y) => (y - x > 1 ? `Del ${x} al ${y}` : `${x} y ${y}`));
  return `Del ${d1.getDate()} de ${mes(d1)} al ${d2.getDate()} de ${mes(d2)}`;
}
function proximas(n = 50, desde = S.ymd(new Date())) {
  return actividades().filter((a) => a.hasta >= desde).slice(0, n);
}
function linkGoogleCalendar(a) {
  const f = (k) => k.replace(/-/g, '');
  let dates;
  if (a.hora && /^\d{1,2}:\d{2}$/.test(a.hora)) {
    const [h, m] = a.hora.split(':').map(Number);
    const ini = `${f(a.fecha)}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    const fin = `${f(a.hasta)}T${String(Math.min(h + 2, 23)).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    dates = `${ini}/${fin}`;
  } else {
    const d = fechaD(a.hasta); d.setDate(d.getDate() + 1);
    dates = `${f(a.fecha)}/${S.ymd(d).replace(/-/g, '')}`;
  }
  const q = new URLSearchParams({ action: 'TEMPLATE', text: `${a.titulo} · Escuelas de Canto`, dates, ctz: 'America/Argentina/Buenos_Aires', details: a.texto || '', location: a.lugar || ESCUELA.direccion });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function tarjetaActividad(a, compacta = false) {
  const d = fechaD(a.fecha);
  const avisar = (S.get().actividadesAvisar || []).includes(a.id);
  const pasada = a.hasta < S.ymd(new Date());
  const destacada = /concierto|final|show/i.test(a.tipo || '');
  return `<div class="card actividad ${destacada ? 'destacada-act' : ''} ${pasada ? 'pasada' : ''}">
    <div class="fila" style="align-items:flex-start;gap:14px">
      <div class="fecha-bloque"><b>${d.getDate()}${a.hasta !== a.fecha ? `<small>–${fechaD(a.hasta).getDate()}</small>` : ''}</b><span>${S.MESES[d.getMonth()].slice(0, 3)}</span></div>
      <div style="flex:1;min-width:0">
        <span class="chip ${destacada ? 'oro' : ''}">${esc(a.tipo || 'Actividad')}</span>
        <h2 style="margin-top:6px">${esc(a.titulo)}</h2>
        <p class="chico">${esc(rangoTexto(a))}${a.hora ? ` · ${esc(a.hora)} h` : ''}${a.lugar ? ` · ${esc(a.lugar)}` : ''}</p>
        ${!compacta && a.texto ? `<p class="sub" style="margin-top:8px;white-space:pre-line">${esc(a.texto)}</p>` : ''}
      </div>
    </div>
    ${!compacta && !pasada ? `<div class="grilla-2" style="margin-top:14px">
      <button class="btn peq ${avisar ? 'sec' : 'borde'}" data-avisar-act="${esc(a.id)}" style="width:100%">${avisar ? `${I.check.replace('<svg', '<svg stroke="currentColor"')} Te aviso` : `${I.campana.replace('<svg', '<svg stroke="currentColor"')} Avisarme`}</button>
      <button class="btn peq sec" ${esIOS ? `data-ics-act="${esc(a.id)}"` : `data-abrir="${esc(linkGoogleCalendar(a))}"`} style="width:100%">${I.calendario.replace('<svg', '<svg stroke="currentColor"')} Agendar</button>
    </div>
    ${a.link ? `<div class="botones" style="margin-top:10px"><button class="btn peq sec" data-abrir="${esc(a.link)}" style="width:100%">${esc(a.boton || 'Más info')}</button></div>` : ''}` : ''}
  </div>`;
}

function proximaActividadHtml() {
  const a = proximas(1)[0];
  if (!a) return '';
  return `<h3>Próxima actividad</h3><button data-agenda="calendario" style="width:100%;text-align:left;display:block">${tarjetaActividad(a, true)}</button>`;
}

function calendarioMes() {
  const hoy = new Date();
  if (!agendaMes) {
    const prox = proximas(1)[0];
    agendaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    if (prox && !proximas(50).some((a) => a.fecha.startsWith(S.ym(hoy)))) agendaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }
  const y = agendaMes.getFullYear(), m = agendaMes.getMonth();
  const primero = new Date(y, m, 1);
  const offset = (primero.getDay() + 6) % 7;
  const diasMes = new Date(y, m + 1, 0).getDate();
  const acts = actividades();
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push('<div></div>');
  for (let d = 1; d <= diasMes; d++) {
    const k = S.ymd(new Date(y, m, d));
    const del = acts.filter((a) => enDia(a, k));
    const fuerte = del.some((a) => /concierto|final|show/i.test(a.tipo || ''));
    celdas.push(`<button class="dia-cal ${k === S.ymd(hoy) ? 'hoy' : ''} ${k === agendaDia ? 'sel' : ''} ${del.length ? 'con' : ''} ${fuerte ? 'fuerte' : ''}" data-dia-cal="${k}" aria-label="${d} ${S.MESES[m]}${del.length ? `, ${del.length} actividad` : ''}">${d}${del.length ? '<i></i>' : ''}</button>`);
  }
  return `<div class="card cal">
    <div class="fila entre" style="margin-bottom:10px">
      <button class="flecha-mes" data-mes="-1" aria-label="Mes anterior">${I.volver}</button>
      <b style="text-transform:capitalize">${S.MESES[m]} ${y}</b>
      <button class="flecha-mes" data-mes="1" aria-label="Mes siguiente" style="transform:scaleX(-1)">${I.volver}</button>
    </div>
    <div class="cal-grid">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<div class="cab">${d}</div>`).join('')}${celdas.join('')}</div>
  </div>`;
}

function vAgenda() {
  const sinLeer = novedadesSinLeer();
  let cuerpo = '';
  if (agendaVista === 'calendario') {
    const delDia = agendaDia ? actividades().filter((a) => enDia(a, agendaDia)) : null;
    const lista = delDia || proximas(20);
    const titulo = agendaDia ? rangoTexto({ fecha: agendaDia, hasta: agendaDia }) : 'Próximas actividades';
    cuerpo = `${calendarioMes()}
      <div class="fila entre" style="margin:26px 0 10px"><h3 style="margin:0">${titulo}</h3>${agendaDia ? '<button class="link" id="ver-todas">Ver todas</button>' : ''}</div>
      ${lista.length ? lista.map((a) => tarjetaActividad(a)).join('') : `<div class="vacio">${agendaDia ? 'No hay actividades este día.' : 'Todavía no hay actividades cargadas.'}</div>`}`;
  } else {
    cuerpo = listaNovedades();
  }
  return `<h1>Agenda</h1><p class="sub" style="margin-bottom:16px">Conciertos, open mics, close mics y todo lo que pasa en la escuela.</p>
    <div class="segmentado" style="margin-bottom:16px">
      <button data-vista="calendario" class="${agendaVista === 'calendario' ? 'on' : ''}">Calendario</button>
      <button data-vista="novedades" class="${agendaVista === 'novedades' ? 'on' : ''}">Novedades${sinLeer ? ` <b class="dorado">•</b>` : ''}</button>
    </div>
    ${cuerpo}`;
}
montajes.agenda = () => {
  $$('[data-vista]').forEach((b) => b.onclick = () => { agendaVista = b.dataset.vista; render(); });
  $$('[data-mes]').forEach((b) => b.onclick = () => { agendaMes = new Date(agendaMes.getFullYear(), agendaMes.getMonth() + Number(b.dataset.mes), 1); agendaDia = null; render(); });
  $$('[data-dia-cal]').forEach((b) => b.onclick = () => { agendaDia = agendaDia === b.dataset.diaCal ? null : b.dataset.diaCal; render(); });
  const vt = $('#ver-todas'); if (vt) vt.onclick = () => { agendaDia = null; render(); };
  $$('[data-ics-act]').forEach((b) => b.onclick = () => { const a = actividades().find((x) => x.id === b.dataset.icsAct); if (a) abrirIcs(icsActividad(a), `${a.id}.ics`); });
  $$('[data-avisar-act]').forEach((b) => b.onclick = async () => {
    const id = b.dataset.avisarAct;
    const on = !(S.get().actividadesAvisar || []).includes(id);
    if (on && !nativo) { const a = actividades().find((x) => x.id === id); if (a) abrirIcs(icsActividad(a), `${a.id}.ics`); return; }
    if (on) { await N.prepararCanal(); const p = await N.pedirPermiso(); if (p === 'denied') toast('Activá las notificaciones en Ajustes del teléfono'); }
    S.update((s) => { const l = new Set(s.actividadesAvisar || []); on ? l.add(id) : l.delete(id); s.actividadesAvisar = [...l]; });
    await N.reprogramar();
    toast(on ? 'Te avisamos el día anterior' : 'Aviso quitado');
    const y = window.scrollY; render(); window.scrollTo(0, y);
  });
  if (agendaVista === 'novedades') {
    const ids = novedades().novedades.map((n) => n.id);
    // se marcan como leídas al salir, así el "Nuevo" se ve esta vez
    return () => S.update((s) => { s.novedadesVistas = [...new Set([...(s.novedadesVistas || []), ...ids])]; });
  }
};
// ============================================================
//  Mi perfil: datos de contacto y todo lo de sus clases de canto
// ============================================================
function perfilCompleto() {
  const s = S.get(), p = s.perfil || {};
  const campos = [s.nombre, p.celular, p.email, p.nacimiento, s.docente, s.clases.length, p.nivel, p.desde, p.tesitura, (p.estilos || []).length, (p.objetivos || []).length, p.artistas, p.experiencia, p.foto];
  return Math.round((campos.filter(Boolean).length / campos.length) * 100);
}
function iniciales(n) { return (n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase(); }
function avatar(tam = 72) {
  const s = S.get();
  return s.perfil && s.perfil.foto
    ? `<img src="${s.perfil.foto}" alt="" class="avatar" style="width:${tam}px;height:${tam}px">`
    : `<span class="avatar ini" style="width:${tam}px;height:${tam}px;font-size:${Math.round(tam * 0.38)}px">${esc(iniciales(s.nombre))}</span>`;
}
function edad(nac) {
  if (!nac) return '';
  const [y, m, d] = nac.split('-').map(Number); const h = new Date();
  let e = h.getFullYear() - y; if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) e--;
  return e > 0 && e < 110 ? e : '';
}

let borradorPerfil = null;
function vPerfil() {
  const s = S.get();
  if (!borradorPerfil) borradorPerfil = { nombre: s.nombre, ...structuredClone(s.perfil) };
  const b = borradorPerfil;
  const chips = (campo, opciones) => `<div class="chips">${opciones.map((o) => `<button type="button" class="chip-sel ${(b[campo] || []).includes(o) ? 'on' : ''}" data-chip="${campo}" data-valor="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  const opciones = (lista, valor) => `<option value="">Elegí una opción</option>${lista.map((o) => `<option ${o === valor ? 'selected' : ''}>${esc(o)}</option>`).join('')}`;
  const pct = perfilCompleto();
  return `<div class="perfil-cab">
      <button class="foto-btn" id="foto-btn" aria-label="Cambiar foto">${avatar(84)}<span class="foto-edit">${I.mas}</span></button>
      <input type="file" id="foto-input" accept="image/*" hidden>
      <div style="min-width:0"><h1 style="margin:0">${esc(s.nombre || 'Mi perfil')}</h1><p class="chico">${s.docente ? `Alumno/a de ${esc(s.docente)}` : 'Escuelas de Canto'}</p>
      <div class="barra-perfil" style="margin-top:8px"><i style="width:${pct}%"></i></div><p class="chico" style="margin-top:4px">Perfil ${pct}% completo</p></div>
    </div>

    <h3>Datos personales</h3>
    <label class="campo"><span>Nombre y apellido</span><input type="text" id="p-nombre" data-campo="nombre" value="${esc(b.nombre)}" autocomplete="name"></label>
    <label class="campo"><span>Celular</span><input type="tel" id="p-celular" data-campo="celular" value="${esc(b.celular)}" placeholder="11 2345-6789" autocomplete="tel"></label>
    <label class="campo"><span>Mail</span><input type="email" id="p-email" data-campo="email" value="${esc(b.email)}" placeholder="tu@mail.com" autocomplete="email"></label>
    <div class="grilla-2">
      <label class="campo"><span>Fecha de nacimiento</span><input type="date" id="p-nacimiento" data-campo="nacimiento" value="${esc(b.nacimiento)}"></label>
      <label class="campo"><span>Instagram (opcional)</span><input type="text" id="p-instagram" data-campo="instagram" value="${esc(b.instagram)}" placeholder="@usuario"></label>
    </div>

    <h3>Mis clases</h3>
    <div class="lista"><button class="item" data-ir="escuela/datos"><div class="icono-circ">${I.calendario}</div><div class="txt"><div class="tit">Profe y horarios</div><div class="chico">${s.docente ? esc(s.docente) : 'Sin profe'} · ${s.clases.length ? s.clases.map((c) => `${S.DIAS[c.dia].slice(0, 3)} ${c.hora}`).join(' · ') : 'sin horarios'}</div></div><span class="flecha">›</span></button></div>
    <div class="grilla-2" style="margin-top:14px">
      <label class="campo"><span>¿Desde cuándo venís?</span><input type="month" id="p-desde" data-campo="desde" value="${esc(b.desde)}"></label>
      <label class="campo"><span>Tu nivel</span><select id="p-nivel" data-campo="nivel">${opciones(PERFIL_OPCIONES.nivel, b.nivel)}</select></label>
    </div>

    <h3>Mi voz</h3>
    <label class="campo"><span>Tipo de voz (si lo sabés)</span><select id="p-tesitura" data-campo="tesitura">${opciones(PERFIL_OPCIONES.tesitura, b.tesitura)}</select></label>
    <div class="campo"><span>Estilos que te gusta cantar</span>${chips('estilos', PERFIL_OPCIONES.estilos)}</div>
    <label class="campo"><span>Artistas que te inspiran</span><input type="text" id="p-artistas" data-campo="artistas" value="${esc(b.artistas)}" placeholder="Ej: Adele, Sinatra, Mercedes Sosa"></label>

    <h3>Mi recorrido</h3>
    <label class="campo"><span>Experiencia cantando</span><textarea id="p-experiencia" data-campo="experiencia" rows="3" placeholder="Coros, bandas, otras clases, si cantaste en público…">${esc(b.experiencia)}</textarea></label>
    <label class="campo"><span>¿Tocás algún instrumento?</span><input type="text" id="p-instrumento" data-campo="instrumento" value="${esc(b.instrumento)}" placeholder="Ej: guitarra, piano, ninguno"></label>
    <div class="campo"><span>¿Qué querés lograr?</span>${chips('objetivos', PERFIL_OPCIONES.objetivos)}</div>
    <label class="campo"><span>Algo que tu profe deba saber</span><textarea id="p-notas" data-campo="notas" rows="3" placeholder="Lo que quieras contarnos para que tus clases sean a tu medida">${esc(b.notas)}</textarea></label>

    <div class="botones">
      <button class="btn" id="p-guardar">Guardar perfil</button>
      <button class="btn sec" id="p-enviar">${I.whatsapp.replace('<svg', '<svg stroke="currentColor"')} Mandar mi ficha a la escuela</button>
    </div>
    <p class="chico" style="text-align:center;margin-top:10px">Tus datos quedan guardados en tu celular. La escuela los recibe solo si mandás tu ficha.</p>`;
}
function fichaTexto() {
  const s = S.get(), p = s.perfil;
  const l = (k, v) => (v && (!Array.isArray(v) || v.length) ? `*${k}:* ${Array.isArray(v) ? v.join(', ') : v}` : '');
  const desde = p.desde ? (() => { const [y, m] = p.desde.split('-').map(Number); return `${S.MESES[m - 1]} ${y}`; })() : '';
  return ['🎤 *Ficha de alumno · Escuelas de Canto*', '',
    l('Nombre', s.nombre), l('Celular', p.celular), l('Mail', p.email),
    l('Edad', edad(p.nacimiento) ? `${edad(p.nacimiento)} años` : ''), l('Instagram', p.instagram), '',
    l('Profe', s.docente), l('Clases', s.clases.map((c) => `${S.DIAS[c.dia]} ${c.hora} (${c.modalidad})`).join(', ')),
    l('En la escuela desde', desde), l('Nivel', p.nivel), '',
    l('Tipo de voz', p.tesitura), l('Estilos', p.estilos), l('Artistas', p.artistas),
    l('Experiencia', p.experiencia), l('Instrumento', p.instrumento), l('Objetivos', p.objetivos), l('Para el profe', p.notas),
  ].filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function guardarPerfil() {
  const b = borradorPerfil;
  S.update((s) => {
    s.nombre = (b.nombre || '').trim() || s.nombre;
    const { nombre, ...resto } = b;
    s.perfil = { ...s.perfil, ...resto };
  });
}
function reducirFoto(file) {
  return new Promise((ok, mal) => {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const T = 320, c = document.createElement('canvas'); c.width = T; c.height = T;
        const lado = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, T, T);
        ok(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = mal; img.src = lector.result;
    };
    lector.onerror = mal; lector.readAsDataURL(file);
  });
}
montajes['escuela/perfil'] = () => {
  const b = borradorPerfil;
  $$('[data-campo]').forEach((el) => { el.oninput = el.onchange = () => { b[el.dataset.campo] = el.value; }; });
  $$('[data-chip]').forEach((el) => el.onclick = () => {
    const c = el.dataset.chip, v = el.dataset.valor;
    const set = new Set(b[c] || []); set.has(v) ? set.delete(v) : set.add(v); b[c] = [...set];
    el.classList.toggle('on', set.has(v));
  });
  $('#foto-btn').onclick = () => $('#foto-input').click();
  $('#foto-input').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try { b.foto = await reducirFoto(f); guardarPerfil(); const y = window.scrollY; render(); window.scrollTo(0, y); toast('Foto actualizada'); }
    catch { toast('No se pudo cargar la foto'); }
  };
  $('#p-guardar').onclick = () => { guardarPerfil(); borradorPerfil = null; toast('Perfil guardado'); volver(); };
  $('#p-enviar').onclick = () => { guardarPerfil(); abrir(waLink(fichaTexto())); };
  return () => { if (ruta !== 'escuela/perfil' && !ruta.startsWith('escuela/datos')) borradorPerfil = null; };
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
      <button class="item" data-ir="escuela/perfil"><div class="icono-circ avatar-mini">${avatar(30)}</div><div class="txt"><div class="tit">Mi perfil</div><div class="chico">${esc(s.nombre)} · ${perfilCompleto()}% completo</div></div><span class="flecha">›</span></button>
      <button class="item" data-ir="escuela/datos"><div class="icono-circ">${I.calendario}</div><div class="txt"><div class="tit">Mis horarios de clase</div><div class="chico">${s.clases.length ? s.clases.map((c) => `${S.DIAS[c.dia].slice(0, 3)} ${c.hora}`).join(' · ') : 'Sin cargar'}${s.docente ? ` · ${esc(s.docente)}` : ''}</div></div><span class="flecha">›</span></button>
      <button class="item" data-ir="escuela/avisos"><div class="icono-circ">${I.campana}</div><div class="txt"><div class="tit">Avisos</div><div class="chico">${Object.entries(s.avisos).filter(([k, v]) => k !== 'practicaHora' && v === true).length} activos · elegí cada uno</div></div><span class="flecha">›</span></button>
    </div>
    <div class="manifiesto"><div class="linea-oro"></div><p>${esc(ESCUELA.slogan)}</p><p class="chico" style="margin-top:10px;font-style:normal">Versión ${VERSION_APP}</p><p class="chico" style="margin-top:6px;font-style:normal;font-size:11px;opacity:.7">Sonido de piano: Salamander Grand Piano, de Alexander Holm (CC BY 3.0)</p></div>`;
}

let borradorDatos = null;
function vDatos() {
  const s = S.get();
  if (!borradorDatos) borradorDatos = { nombre: s.nombre, docente: s.docente, clases: structuredClone(s.clases) };
  const b = borradorDatos;
  return `<h1>Mis horarios</h1><p class="sub" style="margin-bottom:18px">Si cambia tu horario, actualizalo acá y los avisos se reprograman solos.</p>
    <label class="campo"><span>Profe</span><select id="docente"><option value="">—</option>${ESCUELA.docentes.map((d) => `<option ${d === b.docente ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label>
    <h3>Mis clases</h3>
    ${editorClases(b.clases)}
    <div class="botones"><button class="btn" id="guardar">Guardar</button></div>`;
}
montajes['escuela/datos'] = () => {
  const b = borradorDatos;
  $('#docente').onchange = (e) => { b.docente = e.target.value; };
  montarEditorClases(b.clases, () => { const y = window.scrollY; render(); window.scrollTo(0, y); });
  $('#guardar').onclick = async () => {
    S.update((s) => { s.docente = b.docente; s.clases = b.clases; });
    borradorDatos = null;
    await N.reprogramar();
    toast('Guardado');
    volver();
  };
  return () => { if (ruta !== 'escuela/datos') borradorDatos = null; };
};

// ---------- Lista de avisos: cada uno se activa por separado ----------
const GRUPOS_AVISOS = () => [
  ['Clases', [
    ['claseDiaAntes', 'El día anterior', nativo ? 'A las 20 h, con el horario y tu profe' : '24 horas antes de la clase'],
    ['claseHoraAntes', 'Una hora antes', 'Con sugerencia de calentamiento'],
  ]],
  ['Cuota', [
    ['cuotaApertura', `Día ${ESCUELA.pagoDesde}: se abre el pago`, 'Ya podés abonar la cuota del mes'],
    ['cuotaPrevia', `Día ${ESCUELA.pagoHasta - 3}: faltan 3 días`, 'Se acerca el vencimiento'],
    ['cuotaVence', `Día ${ESCUELA.pagoHasta}: vence hoy`, 'Último día para pagar'],
    ...(nativo ? [['cuotaPendiente', `Día ${ESCUELA.pagoHasta + 5}: si quedó pendiente`, 'Solo si no marcaste que pagaste']] : []),
  ]],
  ...(nativo ? [['Agenda', [
    ['agenda', 'Actividades', 'El día anterior a las 19 h, de las que marcaste "Avisarme"'],
  ]]] : []),
  ['Práctica', [
    ['practica', 'Recordatorio diario', 'Para no cortar tu racha'],
  ]],
];
function listaAvisos(a, conHora = true) {
  return GRUPOS_AVISOS().map(([grupo, items]) => `<h3>${grupo}</h3><div class="lista">${items.map(([k, tit, sub]) => `
    <label class="item aviso-item"><div class="txt"><div class="tit">${tit}</div><div class="chico">${sub}</div></div>
      <span class="switch"><input type="checkbox" data-av="${k}" ${a[k] ? 'checked' : ''}><i></i></span></label>`).join('')}
    ${grupo === 'Práctica' && conHora ? `<div class="item"><div class="txt"><div class="tit">Hora del recordatorio</div></div><input type="time" id="phora" value="${a.practicaHora}" style="width:auto;min-height:44px" ${a.practica ? '' : 'disabled'}></div>` : ''}
  </div>`).join('');
}

function vAvisos() {
  const a = S.get().avisos;
  const activos = Object.entries(a).filter(([k, v]) => k !== 'practicaHora' && v === true).length;
  if (!nativo) return `<h1>Avisos</h1><p class="sub">${esIOS ? 'En iPhone' : 'En la versión web'} los recordatorios te los da el calendario de tu teléfono. Elegí cuáles querés y agregalos.</p>
    ${listaAvisos(a)}
    <div class="botones"><button class="btn" id="ics">${I.calendario.replace('<svg', '<svg stroke="currentColor"')} Agregar a mi calendario</button></div>
    <p class="chico" style="margin-top:10px">Se crean tus clases de todas las semanas y las fechas de la cuota, con alarma. Si cambiás tus horarios, volvé a tocar este botón (y borrá los eventos viejos del calendario).</p>`;
  return `<h1>Avisos</h1><p class="sub">Activá o desactivá cada recordatorio por separado.</p>
    <p class="chico" style="margin-top:6px">${activos} aviso${activos === 1 ? '' : 's'} activo${activos === 1 ? '' : 's'}</p>
    ${listaAvisos(a)}
    <div class="botones"><button class="btn sec" id="probar">Probar un aviso</button></div>`;
}
montajes['escuela/avisos'] = () => {
  const ics = $('#ics'); if (ics) ics.onclick = () => abrirIcs(icsMisAvisos());
  $$('[data-av]').forEach((c) => c.onchange = async () => {
    if (c.checked && nativo) { await N.prepararCanal(); const p = await N.pedirPermiso(); if (p === 'denied') { toast('Activá las notificaciones en Ajustes del teléfono'); } }
    S.update((s) => { s.avisos[c.dataset.av] = c.checked; });
    await N.reprogramar();
    toast(nativo ? (c.checked ? 'Aviso activado' : 'Aviso desactivado') : 'Guardado. Tocá "Agregar a mi calendario" para aplicarlo');
    const y = window.scrollY; render(); window.scrollTo(0, y);
  });
  const ph = $('#phora'); if (ph) ph.onchange = async (e) => { S.update((s) => { s.avisos.practicaHora = e.target.value; }); await N.reprogramar(); };
  const pr = $('#probar'); if (pr) pr.onclick = async () => { await N.prepararCanal(); await N.pedirPermiso(); await N.probar(); };
};

// ============================================================
//  Arranque
// ============================================================
async function iniciar() {
  N.usarActividades(() => actividades());
  render();
  if (nativo) {
    CapApp.addListener('backButton', () => { if (!volver()) CapApp.minimizeApp(); });
    CapApp.addListener('resume', () => { actualizarNovedades(); actualizarActividades(); N.reprogramar(); if (!ruta.includes('/')) render(); });
    await N.prepararCanal();
    if (S.get().onboarded) N.reprogramar();
  }
  actualizarNovedades();
  actualizarActividades();
}
iniciar();
