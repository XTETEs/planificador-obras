import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
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

async function exportBackup() {
  const backup = {
    exportedAt: new Date().toISOString(),
    collections: {}
  };

  // 1. Gremios
  try {
    const gremiosSnap = await getDocs(collection(db, 'gremios'));
    backup.collections.gremios = gremiosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Exported ${backup.collections.gremios.length} gremios.`);
  } catch (e) {
    console.warn('Error reading gremios:', e.message);
  }

  // 2. Root Obras (Legacy/Initial)
  try {
    const obrasSnap = await getDocs(collection(db, 'obras'));
    backup.collections.root_obras = obrasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Exported ${backup.collections.root_obras.length} root obras.`);
  } catch (e) {
    console.warn('Error reading root obras:', e.message);
  }

  // 3. Root Tareas (Legacy/Initial)
  try {
    const tareasSnap = await getDocs(collection(db, 'tareas'));
    backup.collections.root_tareas = tareasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Exported ${backup.collections.root_tareas.length} root tareas.`);
  } catch (e) {
    console.warn('Error reading root tareas:', e.message);
  }

  // 4. Users collection
  backup.collections.users = {};
  const candidateUserIds = ['u_jtejuelo_enue_es', 'u_ximo_enue_es', 'u_admin_enue_es'];

  // Try listing /users if allowed
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.docs.forEach(d => {
      if (!candidateUserIds.includes(d.id)) candidateUserIds.push(d.id);
    });
  } catch (e) {
    console.log('Listing /users collection directly not allowed or empty, checking candidate users.');
  }

  for (const uid of candidateUserIds) {
    try {
      const userDocSnap = await getDoc(doc(db, 'users', uid));
      const obrasSnap = await getDocs(collection(db, 'users', uid, 'obras'));
      const tareasSnap = await getDocs(collection(db, 'users', uid, 'tareas'));

      if (userDocSnap.exists() || !obrasSnap.empty || !tareasSnap.empty) {
        backup.collections.users[uid] = {
          profile: userDocSnap.exists() ? userDocSnap.data() : null,
          obras: obrasSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          tareas: tareasSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        };
        console.log(`User ${uid}: profile=${userDocSnap.exists()}, obras=${obrasSnap.size}, tareas=${tareasSnap.size}`);
      }
    } catch (err) {
      console.warn(`Could not read user ${uid}:`, err.message);
    }
  }

  if (!fs.existsSync('./backups')) {
    fs.mkdirSync('./backups', { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `./backups/firestore_backup_${dateStr}.json`;
  const latestFilename = `./backups/firestore_backup_latest.json`;

  fs.writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf8');
  fs.writeFileSync(latestFilename, JSON.stringify(backup, null, 2), 'utf8');

  console.log(`Backup saved to ${filename} and ${latestFilename}`);
  process.exit(0);
}

exportBackup().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});
