const s = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;

export const I = {
  inicio: s('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>'),
  practicar: s('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  cuota: s('<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h4"/>'),
  novedades: s('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  escuela: s('<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/><path d="M8 21h8"/>'),
  volver: s('<path d="M15 18 9 12l6-6"/>'),
  calendario: s('<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
  reloj: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  aire: s('<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>'),
  piano: s('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M13 4v16M18 4v16"/><path d="M6 4v8h4V4M16 4v8h4"/>'),
  metronomo: s('<path d="M8 3h8l4 18H4L8 3z"/><path d="M12 15l5-8"/><path d="M6 15h12"/>'),
  afinador: s('<path d="M4 15a8 8 0 0 1 16 0"/><path d="M12 15l4-5"/><circle cx="12" cy="15" r="1.2"/><path d="M4 19h16"/>'),
  whatsapp: s('<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.2a8.5 8.5 0 1 1 15.4-4.7z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a5 5 0 0 1-2.7-2.7l.8-1-1-2L9 8.5z"/>'),
  mail: s('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>'),
  instagram: s('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>'),
  mapa: s('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  play: s('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>', 'stroke="currentColor"'),
  pausa: s('<path d="M8 5v14M16 5v14" stroke-width="3"/>', 'stroke="currentColor"'),
  sig: s('<path d="M6 5l9 7-9 7z"/><path d="M18 5v14"/>', 'stroke="currentColor"'),
  ant: s('<path d="M18 5l-9 7 9 7z"/><path d="M6 5v14"/>', 'stroke="currentColor"'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  copiar: s('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  campana: s('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  usuario: s('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  fuego: s('<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 1 1.5 2 2 2 2s-1-4 1-7z"/>'),
  nota: s('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  youtube: s('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>'),
  spotify: s('<circle cx="12" cy="12" r="9.5"/><path d="M7 9.5c3.5-1 7.3-.7 10 .9M7.6 12.6c2.9-.8 5.9-.5 8.2.8M8.3 15.5c2.2-.6 4.4-.4 6.2.6"/>'),
  enlace: s('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  basura: s('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  mas: s('<path d="M12 5v14M5 12h14"/>'),
  agenda: s('<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2v4M16 2v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/>'),
  descarga: s('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
};

// Logo oficial del manual de marca (vectorizado). Toma el color del texto (crema).
import LOGO_SVG from './marca/logo.svg';
import MIC_SVG from './marca/mic.svg';

export const MIC = MIC_SVG;

export const logo = (grande = false) => `<div class="logo ${grande ? 'grande' : ''}" role="img" aria-label="Escuelas de Canto de Fran Brunetta">${LOGO_SVG}</div>`;
