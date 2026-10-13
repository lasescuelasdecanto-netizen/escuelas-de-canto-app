// Recordatorios locales: funcionan sin internet y sin servidor.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { get, MESES, ym } from './store.js';
import { ESCUELA } from './config.js';

const nativo = () => Capacitor.isNativePlatform();
const CANAL = 'recordatorios';

export async function pedirPermiso() {
  if (!nativo()) return 'web';
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display !== 'granted') p = await LocalNotifications.requestPermissions();
    return p.display;
  } catch { return 'denied'; }
}

export async function prepararCanal() {
  if (!nativo()) return;
  try {
    await LocalNotifications.createChannel({
      id: CANAL, name: 'Recordatorios', description: 'Clases, cuota y práctica',
      importance: 4, visibility: 1, vibration: true,
    });
  } catch {}
}

function pad(n) { return String(n).padStart(2, '0'); }

export function armarRecordatorios(ahora = new Date()) {
  const s = get();
  const lista = [];
  const base = { channelId: CANAL, smallIcon: 'ic_stat_edc', iconColor: '#BF9000' };
  const primerNombre = (s.nombre || '').split(' ')[0];

  s.clases.forEach((c, i) => {
    const [h, m] = c.hora.split(':').map(Number);
    const profe = s.docente ? ` con ${s.docente}` : '';
    if (s.avisos.claseDiaAntes) {
      const prev = (c.dia + 6) % 7; // día anterior
      lista.push({
        ...base, id: 1000 + i,
        title: 'Mañana tenés clase 🎤',
        body: `${primerNombre ? primerNombre + ', ' : ''}te esperamos a las ${pad(h)}:${pad(m)} h${profe}. Hidratate bien hoy.`,
        schedule: { on: { weekday: prev + 1, hour: 20, minute: 0 }, allowWhileIdle: true },
      });
    }
    if (s.avisos.claseHoraAntes && h >= 1) {
      lista.push({
        ...base, id: 1100 + i,
        title: 'Tu clase es en una hora',
        body: `A las ${pad(h)}:${pad(m)} h${profe}. Un calentamiento express de 5 minutos y llegás en tu mejor voz.`,
        schedule: { on: { weekday: c.dia + 1, hour: h - 1, minute: m }, allowWhileIdle: true },
      });
    }
  });

  if (s.avisos.cuota) {
    const dv = ESCUELA.pagoHasta, desde = ESCUELA.pagoDesde;
    for (let k = 0; k < 6; k++) {
      const mes = new Date(ahora.getFullYear(), ahora.getMonth() + k, 1);
      if (s.cuota.pagos.includes(ym(mes))) continue;
      const nombreMes = MESES[mes.getMonth()];
      const avisos = [
        { d: desde, t: `Ya podés abonar la cuota de ${nombreMes}`, b: `Se paga del ${desde} al ${dv}. Tenés el alias a mano en la app.` },
        { d: dv - 3, t: 'Se acerca el vencimiento de la cuota', b: `La cuota de ${nombreMes} vence el día ${dv}. Podés pagarla desde la app.` },
        { d: dv, t: 'Hoy vence la cuota', b: `Hoy es el último día para abonar ${nombreMes}. Si ya pagaste, tocá "Ya pagué" en la app.` },
        { d: dv + 5, t: '¿Ya abonaste la cuota?', b: `Todavía figura pendiente la cuota de ${nombreMes}. Si ya la pagaste, avisanos desde la app.` },
      ];
      avisos.forEach((a, j) => {
        const at = new Date(mes.getFullYear(), mes.getMonth(), a.d, 10, 0, 0);
        if (at > ahora) lista.push({ ...base, id: 2000 + k * 10 + j, title: a.t, body: a.b, schedule: { at, allowWhileIdle: true } });
      });
    }
  }

  if (s.avisos.practica) {
    const [h, m] = (s.avisos.practicaHora || '19:00').split(':').map(Number);
    lista.push({
      ...base, id: 3000,
      title: 'Tu voz te espera 🎶',
      body: 'Diez minutos de práctica hoy valen más que dos horas el fin de semana.',
      schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
    });
  }
  return lista;
}

export async function reprogramar() {
  if (!nativo()) return;
  try {
    const pend = await LocalNotifications.getPending();
    if (pend.notifications.length) {
      await LocalNotifications.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
    }
    const lista = armarRecordatorios();
    if (lista.length) await LocalNotifications.schedule({ notifications: lista });
  } catch (e) {
    console.warn('No se pudieron programar los recordatorios', e);
  }
}

export async function probar() {
  if (!nativo()) { alert('Los avisos se prueban desde la app instalada en el celular.'); return; }
  await LocalNotifications.schedule({ notifications: [{
    id: 9999, channelId: CANAL, smallIcon: 'ic_stat_edc', iconColor: '#BF9000',
    title: 'Avisos activados ✓', body: 'Así te vamos a recordar tus clases y la cuota.',
    schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
  }] });
}
