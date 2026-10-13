// Sonido: teclado de referencia, escalas guiadas, metrónomo y afinador.
let ctx;
export function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const NOMBRES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const midiAFrec = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const nombreNota = (m) => `${NOMBRES[m % 12]}${Math.floor(m / 12) - 1}`;
export const esNegra = (m) => [1, 3, 6, 8, 10].includes(m % 12);

// ---------- Piano de cola real (muestras Salamander Grand Piano, CC BY 3.0, Alexander Holm) ----------
const MUESTRAS = { A1: 33, C2: 36, Ds2: 39, Fs2: 42, A2: 45, C3: 48, Ds3: 51, Fs3: 54, A3: 57, C4: 60, Ds4: 63, Fs4: 66, A4: 69, C5: 72, Ds5: 75, Fs5: 78, A5: 81, C6: 84 };
const buffers = {}; // midi -> AudioBuffer
let cargaPiano = null;
export function cargarPiano() {
  if (cargaPiano) return cargaPiano;
  const c = audio();
  cargaPiano = Promise.all(Object.entries(MUESTRAS).map(async ([n, m]) => {
    try {
      const r = await fetch(`piano/${n}.mp3`);
      const ab = await r.arrayBuffer();
      buffers[m] = await new Promise((ok, mal) => c.decodeAudioData(ab, ok, mal));
    } catch {}
  })).then(() => Object.keys(buffers).length > 0);
  return cargaPiano;
}
function muestraCercana(midi) {
  let mejor = null;
  for (const m of Object.keys(buffers).map(Number)) if (mejor === null || Math.abs(m - midi) < Math.abs(mejor - midi)) mejor = m;
  return mejor;
}

// Toca una nota con el piano real (o con el sonido sintetizado si las muestras todavía no cargaron)
export function tocar(midi, dur = 0.9, cuando = 0, vol = 0.35) {
  const c = audio();
  const t = c.currentTime + cuando;
  const base = muestraCercana(midi);
  if (base !== null) {
    const src = c.createBufferSource();
    src.buffer = buffers[base];
    src.playbackRate.value = Math.pow(2, (midi - base) / 12);
    const g = c.createGain();
    const largo = Math.max(0.35, dur + 0.25);
    g.gain.setValueAtTime(Math.min(1, vol * 2.4), t);
    g.gain.setValueAtTime(Math.min(1, vol * 2.4), t + largo - 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + largo);
    src.connect(g).connect(c.destination);
    src.start(t); src.stop(t + largo + 0.05);
    return;
  }
  cargarPiano();
  const f = midiAFrec(midi);
  const salida = c.createGain();
  salida.gain.setValueAtTime(0.0001, t);
  salida.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  salida.gain.exponentialRampToValueAtTime(vol * 0.45, t + 0.25);
  salida.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(Math.min(8000, f * 8), t);
  filtro.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + dur);
  filtro.connect(salida).connect(c.destination);
  [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([mult, tipo, g]) => {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = tipo; o.frequency.value = f * mult; og.gain.value = g;
    o.connect(og).connect(filtro);
    o.start(t); o.stop(t + dur + 0.05);
  });
}

export const PATRONES = {
  '5 notas': [0, 2, 4, 5, 7, 5, 4, 2, 0],
  'Arpegio': [0, 4, 7, 12, 7, 4, 0],
  '3 notas': [0, 2, 4, 2, 0],
  'Octava': [0, 12, 0],
  'Escala 9': [0, 2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 0],
};

// Toca un patrón: acorde de referencia + notas. Devuelve duración total en ms.
export function tocarPatron(raiz, patron, bpm, alNota) {
  const paso = 60 / bpm;
  [0, 4, 7].forEach((i) => tocar(raiz + i - 12, 1.2, 0, 0.18));
  const inicio = paso * 2;
  patron.forEach((iv, k) => {
    const cuando = inicio + k * paso;
    tocar(raiz + iv, paso * 1.6, cuando);
    if (alNota) setTimeout(() => alNota(raiz + iv, k), cuando * 1000);
  });
  return (inicio + patron.length * paso) * 1000;
}

// ---------- Metrónomo ----------
export function crearMetronomo(alPulso) {
  let bpm = 80, compas = 4, timer = null, prox = 0, pulso = 0;
  const click = (t, fuerte) => {
    const c = audio();
    const o = c.createOscillator(); const g = c.createGain();
    o.frequency.value = fuerte ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(fuerte ? 0.5 : 0.3, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.07);
  };
  const tick = () => {
    const c = audio();
    while (prox < c.currentTime + 0.12) {
      const n = pulso;
      click(prox, n % compas === 0);
      const demora = Math.max(0, (prox - c.currentTime) * 1000);
      setTimeout(() => alPulso && alPulso(n % compas), demora);
      prox += 60 / bpm; pulso++;
    }
  };
  return {
    start() { if (timer) return; const c = audio(); prox = c.currentTime + 0.05; pulso = 0; timer = setInterval(tick, 25); tick(); },
    stop() { clearInterval(timer); timer = null; },
    get activo() { return !!timer; },
    setBpm(v) { bpm = Math.max(30, Math.min(240, v)); },
    get bpm() { return bpm; },
    setCompas(v) { compas = v; },
  };
}

// ---------- Afinador (detección de altura por autocorrelación) ----------
function detectarFrecuencia(buf, sr) {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.012) return -1;
  let r1 = 0, r2 = buf.length - 1;
  const umbral = 0.2;
  for (let i = 0; i < buf.length / 2; i++) if (Math.abs(buf[i]) < umbral) { r1 = i; break; }
  for (let i = 1; i < buf.length / 2; i++) if (Math.abs(buf[buf.length - i]) < umbral) { r2 = buf.length - i; break; }
  const b = buf.slice(r1, r2);
  const n = b.length;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];
  let d = 0; while (d < n - 1 && c[d] > c[d + 1]) d++;
  let max = -1, pos = -1;
  for (let i = d; i < n; i++) if (c[i] > max) { max = c[i]; pos = i; }
  if (pos <= 0) return -1;
  const x1 = c[pos - 1], x2 = c[pos], x3 = c[pos + 1] ?? x2;
  const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
  const T0 = a ? pos - bb / (2 * a) : pos;
  const f = sr / T0;
  return f > 60 && f < 1400 ? f : -1;
}

export async function crearAfinador(alLeer) {
  const c = audio();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const src = c.createMediaStreamSource(stream);
  const an = c.createAnalyser();
  an.fftSize = 2048;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  let raf, suave = -1;
  const loop = () => {
    an.getFloatTimeDomainData(buf);
    const f = detectarFrecuencia(buf, c.sampleRate);
    if (f > 0) {
      suave = suave > 0 && Math.abs(f - suave) / suave < 0.06 ? suave * 0.6 + f * 0.4 : f;
      const m = 69 + 12 * Math.log2(suave / 440);
      const midi = Math.round(m);
      alLeer({ frec: suave, midi, nota: nombreNota(midi), cents: Math.round((m - midi) * 100) });
    } else alLeer(null);
    raf = setTimeout(loop, 70);
  };
  loop();
  return { stop() { clearTimeout(raf); stream.getTracks().forEach((t) => t.stop()); src.disconnect(); } };
}
