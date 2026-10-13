// Arma la carpeta www/ que Capacitor mete dentro del APK.
import { build } from 'esbuild';
import { mkdirSync, copyFileSync, rmSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const repo = process.env.GITHUB_REPOSITORY || process.env.APP_REPO || '';

rmSync('www', { recursive: true, force: true });
mkdirSync('www/fonts', { recursive: true });

await build({
  entryPoints: ['src/app.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome90'],
  outfile: 'www/app.js',
  define: { __VERSION__: JSON.stringify(pkg.version), __REPO__: JSON.stringify(repo) },
});

copyFileSync('src/index.html', 'www/index.html');
copyFileSync('src/styles.css', 'www/styles.css');
for (const w of [400, 500, 600, 700]) {
  copyFileSync(`node_modules/@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`, `www/fonts/poppins-${w}.woff2`);
}
copyFileSync('node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2', 'www/fonts/firma.woff2');
console.log('www/ listo');
