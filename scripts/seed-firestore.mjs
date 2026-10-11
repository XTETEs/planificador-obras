import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

async function seed() {
  console.log('Seeding obras...');
  const obras = JSON.parse(fs.readFileSync('./db/obras.json', 'utf8'));
  for (const o of obras) {
    await setDoc(doc(db, 'obras', o.id), {
      id: String(o.id),
      nombre: String(o.nombre),
      activo: Number(o.activo)
    });
  }
  console.log(`Seeded ${obras.length} obras.`);

  console.log('Seeding tareas...');
  const tareas = JSON.parse(fs.readFileSync('./db/tareas.json', 'utf8'));
  for (const t of tareas) {
    await setDoc(doc(db, 'tareas', t.id), {
      id: String(t.id),
      obra_id: String(t.obra_id),
      fecha_semana: String(t.fecha_semana),
      dia_semana: String(t.dia_semana),
      actividad: String(t.actividad),
      gremio: String(t.gremio),
      completada: Number(t.completada),
      notas: String(t.notas || ''),
      fecha_creado: String(t.fecha_creado)
    });
  }
  console.log(`Seeded ${tareas.length} tareas.`);
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Error seeding Firestore:', err);
  process.exit(1);
});
