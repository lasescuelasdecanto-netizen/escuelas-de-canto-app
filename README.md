# App de Escuelas de Canto

App para alumnos: recordatorios de clase y cuota, rutinas de calentamiento guiadas, respiración, teclado y escalas, afinador, metrónomo, registro de práctica, novedades y contacto directo con la escuela.

## Cómo se baja la app

Cada vez que hay un cambio, GitHub compila el APK solo (tarda unos 6 minutos) y lo publica en **Releases**. El link para pasarle a los alumnos es siempre el mismo:

```
https://github.com/USUARIO/REPO/releases/latest/download/EscuelasDeCanto.apk
```

El alumno lo abre desde el celular, toca **Descargar** y después **Instalar**. La primera vez Android pide permitir "instalar apps de esta fuente": se acepta una sola vez.

## Lo que podés cambiar sin saber programar

Todo se edita desde la web de GitHub (también desde el celular): abrís el archivo, tocás el lápiz, cambiás y tocás **Commit changes**.

### Novedades (close mics, muestras, feriados)
Archivo `novedades.json`. Les aparece a todos los alumnos la próxima vez que abren la app, **sin reinstalar nada**. Copiá un bloque y cambiale los datos:

```json
{
  "id": "close-mic-noviembre",
  "fecha": "2026-11-08",
  "tipo": "Close mic",
  "titulo": "Close mic de noviembre",
  "texto": "Sábado 8 a las 20 h. Cupos limitados, anotate con tu profe.",
  "link": "https://wa.me/549...",
  "boton": "Quiero participar"
}
```

- `id` tiene que ser distinto en cada novedad (es lo que marca "Nuevo").
- `link`, `boton` e `imagen` (link a una foto) son opcionales.
- Separá cada bloque con una coma.

### Agenda (conciertos, open mics, close mics, muestras)
Archivo `actividades.json`. Igual que las novedades: les aparece a todos sin reinstalar. Cada actividad:

```json
{
  "id": "close-mic-noviembre",
  "fecha": "2026-11-21",
  "hasta": "2026-11-21",
  "tipo": "Close mic",
  "titulo": "Close mic de noviembre",
  "hora": "21:00",
  "lugar": "Av. Hipólito Yrigoyen 848",
  "texto": "Cupos limitados, anotate con tu profe.",
  "link": "https://wa.me/5491166281958",
  "boton": "Quiero participar"
}
```

- `hasta` solo hace falta si dura más de un día (por ejemplo el concierto final del 12 al 13).
- `hora`, `lugar`, `texto`, `link` y `boton` son opcionales. Si `hora` va vacía, el evento se agenda como "todo el día".
- Si el `tipo` dice Concierto, Final o Show, la actividad se destaca en dorado.
- Los alumnos pueden tocar "Avisarme" y les llega un recordatorio el día anterior a las 19 h.

### Datos de la escuela
Archivo `src/config.js`: WhatsApp, mail, Instagram, dirección, alias o link de Mercado Pago, día de vencimiento por defecto y lista de profes. Al guardar, GitHub genera un APK nuevo.

### Avisar a los alumnos que hay versión nueva
1. Subí el número de `version` en `package.json` (por ejemplo de `1.0.0` a `1.1.0`).
2. Cuando el APK nuevo esté listo, poné el mismo número en `"versionApp"` de `novedades.json`.

A los alumnos les aparece un cartel "Hay una versión nueva" con el botón para bajarla. Se instala encima y no pierden sus datos.

## Detalles técnicos

- Capacitor 8 + JavaScript sin framework (`src/`), empaquetado con esbuild (`npm run build`).
- Recordatorios con notificaciones locales: funcionan sin internet y sin servidor; se reprograman cada vez que el alumno abre la app o cambia sus datos.
- Los datos del alumno quedan solo en su teléfono.
- El APK se firma siempre con la misma llave (`android/app/escuelas.keystore`) para que las actualizaciones se instalen encima. Si en algún momento la app pasa a Google Play, conviene mover la llave a los *Secrets* del repositorio (el compilador ya lee `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` y `KEYSTORE_FILE` si existen).
- Compilación local (con Android Studio instalado): `npm ci && npm run sync`, después abrir la carpeta `android/`.
