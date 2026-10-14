// Archivos de calendario (.ics): en iPhone es la forma de tener recordatorios,
// porque una app web no puede programar avisos. El Calendario del teléfono los dispara.
import { ESCUELA } from './config.js';
import { get, DIAS } from './store.js';

const TZ = 'America/Argentina/Buenos_Aires';
const VTIMEZONE = ['BEGIN:VTIMEZONE', `TZID:${TZ}`, 'BEGIN:STANDARD', 'DTSTART:19700101T000000',
  'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE'];

const p2 = (n) => String(n).padStart(2, '0');
const fechaLocal = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
const soloFecha = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
const sello = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const texto = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const alarma = (trigger, desc) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${texto(desc)}`, `TRIGGER:${trigger}`, 'END:VALARM'];

function evento({ uid, inicio, todoElDia = false, duracion = 'PT1H', rrule, titulo, desc, lugar, alarmas = [] }) {
  return ['BEGIN:VEVENT', `UID:${uid}@escuelasdecanto`, `DTSTAMP:${sello()}`,
    todoElDia ? `DTSTART;VALUE=DATE:${soloFecha(inicio)}` : `DTSTART;TZID=${TZ}:${fechaLocal(inicio)}`,
    todoElDia ? 'DURATION:P1D' : `DURATION:${duracion}`,
    ...(rrule ? [`RRULE:${rrule}`] : []),
    `SUMMARY:${texto(titulo)}`, ...(desc ? [`DESCRIPTION:${texto(desc)}`] : []), ...(lugar ? [`LOCATION:${texto(lugar)}`] : []),
    ...alarmas.flat(), 'END:VEVENT'];
}
const envolver = (eventos) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Escuelas de Canto//App//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  'X-WR-CALNAME:Escuelas de Canto', `X-WR-TIMEZONE:${TZ}`, ...VTIMEZONE, ...eventos.flat(), 'END:VCALENDAR'].join('\r\n');

// Clases semanales + cuota + práctica, según los avisos que eligió el alumno
export function icsMisAvisos(ahora = new Date()) {
  const s = get(), a = s.avisos, ev = [];
  s.clases.forEach((c, i) => {
    const [h, m] = c.hora.split(':').map(Number);
    const d = new Date(ahora); d.setHours(h, m, 0, 0);
    d.setDate(d.getDate() + ((c.dia - d.getDay() + 7) % 7));
    const al = [];
    if (a.claseDiaAntes) al.push(alarma('-P1D', `Mañana tenés clase de canto a las ${c.hora} h`));
    if (a.claseHoraAntes) al.push(alarma('-PT1H', 'Tu clase es en una hora. Calentá 5 minutos con la app.'));
    ev.push(evento({ uid: `clase-${i}-${c.dia}-${c.hora.replace(':', '')}`, inicio: d, rrule: 'FREQ=WEEKLY',
      titulo: `Clase de canto${s.docente ? ` con ${s.docente}` : ''}`, desc: `${DIAS[c.dia]} ${c.hora} h · ${c.modalidad}`, lugar: ESCUELA.direccion, alarmas: al }));
  });
  const mes1 = (dia) => { const d = new Date(ahora.getFullYear(), ahora.getMonth(), dia); if (d < new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())) d.setMonth(d.getMonth() + 1); return d; };
  if (a.cuotaApertura) ev.push(evento({ uid: 'cuota-apertura', inicio: mes1(ESCUELA.pagoDesde), todoElDia: true, rrule: `FREQ=MONTHLY;BYMONTHDAY=${ESCUELA.pagoDesde}`,
    titulo: 'Se abre el pago de la cuota', desc: `La cuota se paga del ${ESCUELA.pagoDesde} al ${ESCUELA.pagoHasta}. Alias: ${ESCUELA.aliasPago}`, alarmas: [alarma('PT10H', 'Ya podés abonar la cuota de canto')] }));
  if (a.cuotaPrevia || a.cuotaVence) {
    const al = [];
    if (a.cuotaPrevia) al.push(alarma('-P2DT14H', `Faltan 3 días: la cuota vence el ${ESCUELA.pagoHasta}`));
    if (a.cuotaVence) al.push(alarma('PT10H', 'Hoy vence la cuota de canto'));
    ev.push(evento({ uid: 'cuota-vence', inicio: mes1(ESCUELA.pagoHasta), todoElDia: true, rrule: `FREQ=MONTHLY;BYMONTHDAY=${ESCUELA.pagoHasta}`,
      titulo: 'Vence la cuota de canto', desc: `Alias: ${ESCUELA.aliasPago} · A nombre de ${ESCUELA.titularPago}`, alarmas: al }));
  }
  if (a.practica) {
    const [h, m] = (a.practicaHora || '19:00').split(':').map(Number);
    const d = new Date(ahora); d.setHours(h, m, 0, 0); if (d < ahora) d.setDate(d.getDate() + 1);
    ev.push(evento({ uid: 'practica', inicio: d, duracion: 'PT10M', rrule: 'FREQ=DAILY', titulo: 'Práctica de canto (10 min)',
      desc: 'Abrí la app y hacé el calentamiento del día.', alarmas: [alarma('PT0M', 'Tu voz te espera: 10 minutos de práctica')] }));
  }
  return envolver(ev);
}

export function icsActividad(act) {
  const [y, m, d] = act.fecha.split('-').map(Number);
  let inicio, todoElDia = true;
  if (act.hora && /^\d{1,2}:\d{2}$/.test(act.hora)) { const [h, mi] = act.hora.split(':').map(Number); inicio = new Date(y, m - 1, d, h, mi); todoElDia = false; }
  else inicio = new Date(y, m - 1, d);
  const dias = Math.round((new Date(...act.hasta.split('-').map((x, i) => (i === 1 ? x - 1 : +x))) - new Date(y, m - 1, d)) / 86400000) + 1;
  const ev = evento({ uid: `act-${act.id}`, inicio, todoElDia, duracion: 'PT2H', titulo: `${act.titulo} · Escuelas de Canto`, desc: act.texto,
    lugar: act.lugar || ESCUELA.direccion, alarmas: [alarma(todoElDia ? '-PT5H' : '-P1D', `Mañana: ${act.titulo}`)] });
  if (todoElDia && dias > 1) ev[ev.findIndex((l) => l === 'DURATION:P1D')] = `DURATION:P${dias}D`;
  return envolver([ev]);
}

// Abre el archivo: en iPhone, Safari ofrece "Agregar todo" al Calendario
export function abrirIcs(contenido, nombre = 'escuelas-de-canto.ics') {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) { window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(contenido)}`; return; }
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
