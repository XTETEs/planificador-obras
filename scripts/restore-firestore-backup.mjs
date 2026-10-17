import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import fs from 'node:fs';

const firebaseConfig = {
  apiKey: "AIzaSyDnWxSuYvFZUpNclff6fXzx45hltAL5i3I",
  authDomain: "planificador-semanal-enue.firebaseapp.com",
  projectId: "planificador-semanal-enue",
  storageBucket: "planificador-semanal-enue.firebasestorage.app",
  messagingSenderId: "283726110291",
  appId: "1:283726110291:web:aa11836d1a3b90da22f0a6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function restoreBackup() {
  const backupFile = process.argv[2] || './backups/firestore_backup_latest.json';
  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`Loading backup from: ${backupFile}`);
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  // 1. Restore gremios
  if (backup.collections?.gremios?.length > 0) {
    console.log(`Restoring ${backup.collections.gremios.length} gremios...`);
    for (const g of backup.collections.gremios) {
      await setDoc(doc(db, 'gremios', g.id), { nombre: g.nombre });
    }
  }

  // 2. Restore users data
  if (backup.collections?.users) {
    for (const [uid, userData] of Object.entries(backup.collections.users)) {
      console.log(`Restoring data for user: ${uid}...`);
      if (userData.profile) {
        await setDoc(doc(db, 'users', uid), userData.profile, { merge: true });
      }

      if (userData.obras?.length > 0) {
        console.log(`  Restoring ${userData.obras.length} obras...`);
        for (const o of userData.obras) {
          await setDoc(doc(db, 'users', uid, 'obras', o.id), {
            id: String(o.id),
            nombre: String(o.nombre),
            activo: Number(o.activo !== undefined ? o.activo : 1)
          });
        }
      }

      if (userData.tareas?.length > 0) {
        console.log(`  Restoring ${userData.tareas.length} tareas...`);
        // Batch in chunks of 400
        const chunkSize = 400;
        for (let i = 0; i < userData.tareas.length; i += chunkSize) {
          const chunk = userData.tareas.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          for (const t of chunk) {
            batch.set(doc(db, 'users', uid, 'tareas', t.id), {
              id: String(t.id),
              obra_id: String(t.obra_id),
              fecha_semana: String(t.fecha_semana),
              dia_semana: String(t.dia_semana),
              actividad: String(t.actividad),
              gremio: String(t.gremio || 'Otros'),
              completada: Number(t.completada || 0),
              notas: String(t.notas || ''),
              fecha_creado: String(t.fecha_creado || new Date().toISOString())
            });
          }
          await batch.commit();
        }
      }
    }
  }

  console.log('Restoration completed successfully!');
  process.exit(0);
}

restoreBackup().catch(err => {
  console.error('Fatal restore error:', err);
  process.exit(1);
});
