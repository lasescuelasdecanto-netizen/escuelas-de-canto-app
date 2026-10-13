// Rutinas de práctica. Cada paso: titulo, indicacion, segundos, y opcionalmente
// un patrón para que el teclado acompañe (patron + raiz + bpm).

export const RUTINAS = [
  {
    id: 'express',
    nombre: 'Calentamiento express',
    minutos: 5,
    para: 'Antes de clase o de cantar',
    pasos: [
      { titulo: 'Postura y respiración', seg: 45, indicacion: 'Pies al ancho de cadera, rodillas sueltas, hombros abajo. Inhalá por la nariz inflando la panza y soltá el aire con una "sss" larga y pareja.' },
      { titulo: 'Vibración de labios', seg: 60, indicacion: 'Labios sueltos haciendo "brrr" (como un motorcito). Hacé sirenas suaves de grave a agudo y volvé. Si cuesta, apoyá los dedos en los cachetes.' },
      { titulo: 'Humming en 5 notas', seg: 75, indicacion: 'Boca cerrada, dientes separados, "mmm" sintiendo vibrar los labios y la nariz. Seguí al teclado.', patron: '5 notas', raiz: 57, bpm: 110 },
      { titulo: 'Mi-ma-mo', seg: 75, indicacion: 'Sobre la escala: "mi-ma-mo-ma-mi". Boca bien abierta en la "a", sin empujar.', patron: '5 notas', raiz: 60, bpm: 120 },
      { titulo: 'Sirena final', seg: 45, indicacion: 'Una "u" suave que sube y baja como una sirena. Cero esfuerzo en el agudo: dejá que suba sola.' },
    ],
  },
  {
    id: 'completo',
    nombre: 'Calentamiento completo',
    minutos: 12,
    para: 'Práctica diaria en casa',
    pasos: [
      { titulo: 'Soltar el cuerpo', seg: 60, indicacion: 'Rotá hombros hacia atrás, girá el cuello despacio a cada lado, masajeá la mandíbula con círculos.' },
      { titulo: 'Respiración 4-4-6', seg: 90, indicacion: 'Inhalá en 4 tiempos, sostené 4 sin cerrar la garganta, soltá en 6 con "sss". Usá la pantalla de Respiración si querés guía.' },
      { titulo: 'Vibración de labios', seg: 75, indicacion: 'Sirenas con "brrr", cada vez un poquito más arriba. Mantené el aire constante.' },
      { titulo: 'Humming', seg: 90, indicacion: '"Mmm" sobre la escala. Buscá que el sonido se sienta adelante, en la máscara.', patron: '5 notas', raiz: 55, bpm: 110 },
      { titulo: 'Arpegios con "nu"', seg: 90, indicacion: 'Arpegio con "nu", liviano y ligado. Que el agudo no sea más fuerte que el grave.', patron: 'Arpegio', raiz: 57, bpm: 100 },
      { titulo: 'Staccato "ja"', seg: 60, indicacion: '"Ja-ja-ja-ja-ja" cortito y con rebote de panza, como una risa. Nada de garganta.', patron: '5 notas', raiz: 60, bpm: 130 },
      { titulo: 'Vocales en escala', seg: 90, indicacion: '"A-E-I-O-U" cambiando de vocal sin mover la mandíbula de más. Mismo color en todas.', patron: 'Escala 9', raiz: 57, bpm: 140 },
      { titulo: 'Enfriar', seg: 45, indicacion: 'Sirenas descendentes con "u" y un bostezo suave para cerrar.' },
    ],
  },
  {
    id: 'vivo',
    nombre: 'Antes de un show',
    minutos: 8,
    para: 'Close mic, muestra o acto',
    pasos: [
      { titulo: 'Bajar los nervios', seg: 90, indicacion: 'Inhalá en 4, soltá en 8. El exhalo largo calma el cuerpo. Mirá un punto fijo y aflojá la mandíbula.' },
      { titulo: 'Vibración de labios', seg: 60, indicacion: 'Sirenas con "brrr" recorriendo todo el registro que vas a usar.' },
      { titulo: 'Humming', seg: 75, indicacion: '"Mmm" sobre la escala, sin volumen. Estás despertando la voz, no gastándola.', patron: '5 notas', raiz: 57, bpm: 110 },
      { titulo: 'Arpegios', seg: 75, indicacion: '"Nu" o "no" en arpegio, apuntando al registro de tus canciones.', patron: 'Arpegio', raiz: 60, bpm: 100 },
      { titulo: 'Repasar la frase difícil', seg: 90, indicacion: 'Cantá a media voz la frase más exigente del repertorio. Primero con "brrr", después con letra.' },
    ],
  },
  {
    id: 'enfriar',
    nombre: 'Enfriamiento vocal',
    minutos: 4,
    para: 'Después de cantar mucho',
    pasos: [
      { titulo: 'Sirenas descendentes', seg: 60, indicacion: '"U" suave del agudo al grave, cada vez más liviana.' },
      { titulo: 'Humming grave', seg: 60, indicacion: '"Mmm" en la zona cómoda de abajo, casi hablado.', patron: '3 notas', raiz: 52, bpm: 90 },
      { titulo: 'Bostezo-suspiro', seg: 60, indicacion: 'Bostezá con la boca cerrada y soltá el aire con un suspiro sonoro.' },
      { titulo: 'Soltar', seg: 60, indicacion: 'Masaje en cuello y mandíbula. Tomá agua a temperatura ambiente.' },
    ],
  },
];

export const TIPS = [
  'Tomá agua durante todo el día, no solo en clase: la hidratación de las cuerdas tarda horas.',
  'Si te duele o raspa al cantar, pará. El canto sano no duele.',
  'Grabate una vez por semana con el celu. Escucharte es la forma más rápida de mejorar.',
  'Diez minutos todos los días rinden más que una hora el domingo.',
  'Dormir bien es parte del entrenamiento vocal.',
  'Evitá carraspear: mejor tragá saliva o tomá un sorbo de agua.',
  'Cantá con el cuerpo suelto: la tensión en hombros y mandíbula se escucha.',
  'Antes de una canción difícil, cantala primero con "brrr" o con "u".',
];

export const NOVEDADES_INICIALES = {
  versionApp: '1.0.0',
  novedades: [
    { id: 'bienvenida', fecha: '2026-10-13', tipo: 'Escuela', titulo: '¡Bienvenidos a la app!', texto: 'Desde acá vas a tener tus recordatorios de clase y cuota, ejercicios para practicar en casa y todas las novedades de la escuela.' },
  ],
};

// Copia de la agenda que viene dentro de la app (se actualiza sola desde actividades.json).
export const ACTIVIDADES_INICIALES = {
  actividades: [
    { id: 'concierto-final-2026', fecha: '2026-12-12', hasta: '2026-12-13', tipo: 'Concierto final', titulo: 'Concierto final 2026', hora: '', lugar: '', texto: 'El cierre del año de la escuela. Horarios y lugar a confirmar.' },
  ],
};

export const PERFIL_OPCIONES = {
  nivel: ['Empezando', 'Principiante', 'Intermedio', 'Avanzado'],
  tesitura: ['No sé', 'Soprano', 'Mezzosoprano', 'Contralto', 'Tenor', 'Barítono', 'Bajo'],
  estilos: ['Pop', 'Rock', 'Jazz', 'Tango', 'Folklore', 'Musical', 'Lírico', 'Soul / R&B', 'Bossa nova', 'Latino', 'Indie', 'Gospel'],
  objetivos: ['Disfrutar cantando', 'Cantar en público', 'Grabar mis canciones', 'Audiciones y castings', 'Mejorar mi voz hablada', 'Ganar confianza', 'Profesionalizarme', 'Componer'],
};

// ============================================================
//  Escalas con piano: cada ejercicio sube de a medio tono dentro del rango de cada voz
//  patron: intervalos en semitonos desde la nota base · silabas: qué se canta en cada nota
// ============================================================
export const VOCES = [
  { id: 'soprano', nombre: 'Soprano', detalle: 'Voz femenina aguda', desde: 60, techo: 81 },
  { id: 'mezzo', nombre: 'Mezzosoprano', detalle: 'Voz femenina media', desde: 57, techo: 77 },
  { id: 'contralto', nombre: 'Contralto', detalle: 'Voz femenina grave', desde: 53, techo: 74 },
  { id: 'tenor', nombre: 'Tenor', detalle: 'Voz masculina aguda', desde: 48, techo: 69 },
  { id: 'baritono', nombre: 'Barítono', detalle: 'Voz masculina media', desde: 45, techo: 65 },
  { id: 'bajo', nombre: 'Bajo', detalle: 'Voz masculina grave', desde: 41, techo: 62 },
];
export const VOZ_DE_TESITURA = { Soprano: 'soprano', Mezzosoprano: 'mezzo', Contralto: 'contralto', Tenor: 'tenor', Barítono: 'baritono', Bajo: 'bajo' };

const rep = (s, n) => Array(n).fill(s);
export const ESCALAS = [
  { id: 'humming', nombre: 'Humming en 5 notas', grupo: 'Calentar', bpm: 116, patron: [0, 2, 4, 5, 7, 5, 4, 2, 0], silabas: rep('mm', 9),
    indicacion: 'Boca cerrada, dientes separados. Sentí cómo vibran los labios y la nariz. Nada de empujar.' },
  { id: 'trino', nombre: 'Vibración de labios', grupo: 'Calentar', bpm: 126, patron: [0, 2, 4, 5, 7, 5, 4, 2, 0], silabas: rep('brr', 9),
    indicacion: 'Labios sueltos haciendo "brrr". El aire tiene que salir parejo de principio a fin.' },
  { id: 'ng', nombre: 'Tres notas con "ng"', grupo: 'Calentar', bpm: 108, patron: [0, 2, 4, 2, 0], silabas: rep('ng', 5),
    indicacion: 'Como el final de "tengo": la lengua apoyada atrás y el sonido en la nariz. Muy liviano.' },
  { id: 'mimemamomu', nombre: 'Mi-me-ma-mo-mu', grupo: 'Articulación', bpm: 120, patron: [0, 2, 4, 5, 7, 5, 4, 2, 0], silabas: ['mi', 'me', 'ma', 'mo', 'mu', 'mo', 'ma', 'me', 'mi'],
    indicacion: 'Cambiá de vocal sin mover de más la mandíbula. Todas con el mismo color y volumen.' },
  { id: 'vocales', nombre: 'Escala de vocales', grupo: 'Articulación', bpm: 116, patron: [0, 2, 4, 5, 7, 5, 4, 2, 0], silabas: ['a', 'e', 'i', 'o', 'u', 'o', 'i', 'e', 'a'],
    indicacion: 'Una vocal por nota. Buscá que la "i" y la "u" suenen tan abiertas como la "a".' },
  { id: 'arpegio', nombre: 'Arpegio con "nu"', grupo: 'Extensión', bpm: 100, patron: [0, 4, 7, 12, 7, 4, 0], silabas: rep('nu', 7),
    indicacion: 'Ligado y liviano. La nota de arriba no tiene que sonar más fuerte que la de abajo.' },
  { id: 'arpegio-largo', nombre: 'Arpegio extendido "ia"', grupo: 'Extensión', bpm: 108, patron: [0, 4, 7, 12, 16, 12, 7, 4, 0], silabas: ['i', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a'],
    indicacion: 'Arrancá con "i" y abrí a "a" sin perder el brillo. Respirá antes de cada tono.' },
  { id: 'octava', nombre: 'Octava ligada con "u"', grupo: 'Extensión', bpm: 66, patron: [0, 12, 0], silabas: ['u', 'u', 'u'], largo: 1.6,
    indicacion: 'Como una sirena suave: subí y bajá deslizando, sin cortes entre las notas.' },
  { id: 'staccato', nombre: 'Staccato "ja"', grupo: 'Agilidad', bpm: 126, patron: [0, 4, 7, 4, 0], silabas: rep('ja', 5), corto: true,
    indicacion: 'Notas cortas, como una risa. El impulso sale de la panza, no de la garganta.' },
  { id: 'escala9', nombre: 'Escala de 9 notas', grupo: 'Agilidad', bpm: 168, patron: [0, 2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 0], silabas: rep('a', 17),
    indicacion: 'Todo de un solo aire, ligado. Si te quedás sin aire, bajá la velocidad.' },
];
