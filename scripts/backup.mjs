import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== INICIANDO BACKUP INTEGRAL DE LA APLICACIÓN ===');

// 1. Exportar datos de Firestore
console.log('1. Exportando base de datos Firestore...');
execSync('node scripts/export-firestore-backup.mjs', { stdio: 'inherit' });

// 2. Comprimir código fuente y datos
console.log('2. Generando archivo comprimido ZIP...');
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const zipName = `backup_planificador_obras_${timestamp}.zip`;
const destPath = path.join('backups', zipName);
const latestPath = path.join('backups', 'backup_planificador_obras_latest.zip');

const psScript = `
$items = @('src', 'public', 'scripts', 'db', 'api', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'firebase.json', 'firestore.rules', 'vercel.json', 'README.md', '.env.example', '.gitignore', 'backups\\firestore_backup_latest.json')
Compress-Archive -Path $items -DestinationPath '${destPath}' -Force
Copy-Item -Path '${destPath}' -Destination '${latestPath}' -Force
`;

execSync(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, '; ')}"`, { stdio: 'inherit' });

console.log(`\n✅ Backup completado con éxito:`);
console.log(`- Archivo histórico: ${destPath}`);
console.log(`- Archivo más reciente: ${latestPath}`);
console.log(`- Snapshot Firestore: backups/firestore_backup_latest.json`);
