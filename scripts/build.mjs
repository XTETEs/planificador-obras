// Uso: node scripts/build.mjs [app-source.html]
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] || 'app-source.html';
if (!fs.existsSync(input)) {
  console.error('Falta ' + input + '. Copia el codigo de la app desde AiKit (pestana codigo) a ese fichero.');
  process.exit(1);
}
let html = fs.readFileSync(input, 'utf8');
const inject = '    <script src="config.js"></script>\n    <script src="aikit-shim.js"></script>\n';
const marker = '<script type="importmap">';
if (!html.includes(marker)) {
  console.error('No se encontro el marcador importmap en ' + input);
  process.exit(1);
}
html = html.replace(marker, inject + '    ' + marker);

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist/db', { recursive: true });
fs.writeFileSync('dist/index.html', html);
fs.copyFileSync('src/aikit-shim.js', 'dist/aikit-shim.js');
fs.copyFileSync('src/config.js', 'dist/config.js');
fs.copyFileSync('db/seed.sql', 'dist/db/seed.sql');
console.log('OK -> dist/index.html');
