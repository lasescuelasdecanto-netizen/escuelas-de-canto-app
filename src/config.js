// ============================================================
//  CONFIGURACIÓN DE LA ESCUELA
//  Todo lo que la escuela puede cambiar está acá.
//  Después de editar, GitHub vuelve a generar el APK solo.
// ============================================================

export const ESCUELA = {
  nombre: 'Escuelas de Canto',
  firma: 'de Fran Brunetta',
  slogan: 'La pasión que nos une',
  manifiesto: 'No existe la voz fea, existe la voz sin dirección.',

  // WhatsApp: código de país + área + número, sin espacios ni "+" (ej: 5491112345678)
  whatsapp: '5491166281958',
  email: 'info@escuelasdecanto.com',
  instagram: 'escuelasdecanto', // usuario, sin @

  direccion: 'Av. Hipólito Yrigoyen 848, Vicente López',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Av.+Hip%C3%B3lito+Yrigoyen+848,+Vicente+L%C3%B3pez,+Buenos+Aires',

  // Pago de cuota
  linkPago: '', // link de Mercado Pago (si queda vacío, se muestra solo el alias)
  aliasPago: 'escuela.de.canto.mp', // alias / CBU para transferencia
  titularPago: 'Escuelas de Canto',
  diaVencimientoPorDefecto: 10,

  docentes: [
    'Noelia', 'Eugenia', 'Agus A', 'Kiefa', 'Nury', 'Andrea',
    'Merison', 'Giu', 'Cata', 'Leti', 'Fran (online)', 'Josefina',
  ],

  // Novedades y aviso de versión nueva: se leen de este archivo online.
  // Se completan solos cuando GitHub compila la app (ver README).
  novedadesUrl: __REPO__ ? `https://raw.githubusercontent.com/${__REPO__}/main/novedades.json` : '',
  // Link fijo para descargar siempre la última versión del APK.
  descargaUrl: __REPO__ ? `https://github.com/${__REPO__}/releases/latest/download/EscuelasDeCanto.apk` : '',
};

// La versión se toma de package.json al compilar.
export const VERSION_APP = __VERSION__;
