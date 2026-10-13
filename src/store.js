// Datos del alumno, guardados en el teléfono.
const KEY = 'edc.alumno.v1';

const DEFAULT = {
  onboarded: false,
  nombre: '',
  docente: '',
  clases: [], // [{ dia: 0-6 (0=domingo), hora: 'HH:MM', modalidad: 'Individual' }]
  cuota: { diaVencimiento: 10, pagos: [] }, // pagos: ['2026-10', ...]
  avisos: { claseDiaAntes: true, claseHoraAntes: true, cuota: true, practica: false, practicaHora: '19:00' },
  practica: { dias: {} }, // { '2026-10-13': minutos }
  novedadesVistas: [],
};

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT),
      ...data,
      cuota: { ...DEFAULT.cuota, ...(data.cuota || {}) },
      avisos: { ...DEFAULT.avisos, ...(data.avisos || {}) },
      practica: { ...DEFAULT.practica, ...(data.practica || {}) },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function get() { return state; }

export function update(fn) {
  fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l(state));
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function reset() {
  state = structuredClone(DEFAULT);
  try { localStorage.removeItem(KEY); } catch {}
  listeners.forEach((l) => l(state));
}

// ---------- utilidades de fecha ----------
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function proximasClases(n = 3, desde = new Date()) {
  const out = [];
  for (const c of state.clases) {
    const [h, m] = c.hora.split(':').map(Number);
    for (let w = 0; w < 3; w++) {
      const d = new Date(desde);
      d.setHours(h, m, 0, 0);
      let diff = (c.dia - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + diff + w * 7);
      if (d > desde) out.push({ fecha: d, clase: c });
    }
  }
  return out.sort((a, b) => a.fecha - b.fecha).slice(0, n);
}

export function estadoCuota(hoy = new Date()) {
  const mes = ym(hoy);
  const pagada = state.cuota.pagos.includes(mes);
  const venc = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(state.cuota.diaVencimiento, 28));
  const dias = Math.round((venc - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000);
  return { mes, pagada, venc, dias, mesNombre: MESES[hoy.getMonth()] };
}

export function racha(hoy = new Date()) {
  const dias = state.practica.dias;
  let n = 0;
  const d = new Date(hoy);
  if (!dias[ymd(d)]) d.setDate(d.getDate() - 1); // si hoy todavía no practicó, cuenta desde ayer
  while (dias[ymd(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function registrarPractica(minutos, fecha = new Date()) {
  update((s) => {
    const k = ymd(fecha);
    s.practica.dias[k] = (s.practica.dias[k] || 0) + Math.max(1, Math.round(minutos));
  });
}

export function cuando(fecha, ahora = new Date()) {
  const a = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const b = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diff = Math.round((b - a) / 86400000);
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  if (diff === 0) return `Hoy · ${hora} h`;
  if (diff === 1) return `Mañana · ${hora} h`;
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} · ${hora} h`;
}
