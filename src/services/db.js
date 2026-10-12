import { initializeApp, getApps } from 'firebase/app';
import initSqlJs from 'sql.js';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDnWxSuYvFZUpNclff6fXzx45hltAL5i3I",
  authDomain: "planificador-semanal-enue.firebaseapp.com",
  projectId: "planificador-semanal-enue",
  storageBucket: "planificador-semanal-enue.firebasestorage.app",
  messagingSenderId: "283726110291",
  appId: "1:283726110291:web:aa11836d1a3b90da22f0a6"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firestore = getFirestore(app);

// Estado de usuario y sincronización privada
let currentUserId = null;
let unsubObras = null;
let unsubTareas = null;

// Caché en memoria para las obras y tareas de la sesión activa del usuario
let obrasMap = new Map();
let tareasMap = new Map();
let isInitialized = false;
let initPromise = null;

let pending = 0;
let listeners = [];

function notify(hasPending) {
  listeners.slice().forEach((fn) => {
    try {
      fn(hasPending);
    } catch (e) {
      console.error(e);
    }
  });
}

const DEFAULT_STARTER_OBRAS = [
  { id: '1', nombre: 'Residencial Las Palmeras (Fase 2)', activo: 1 },
  { id: '2', nombre: 'Reforma Integral Oficinas Centrales', activo: 1 },
  { id: '3', nombre: 'Vivienda Unifamiliar La Cañada', activo: 1 },
  { id: '4', nombre: 'Edificio Residencial Gran Vía', activo: 1 }
];

/**
 * Si es el primer acceso de un usuario corporativo y no tiene obras privadas creadas:
 * 1) Intenta migrar las obras y tareas que existieran previamente en la raíz de Firestore
 * 2) Si no hay obras en la raíz, crea las obras iniciales de plantilla para empezar a planificar
 */
async function seedUserInitialData(userId) {
  try {
    // 1. Intentar volcar datos existentes de la raíz si los hubiera
    const rootObrasSnap = await getDocs(collection(firestore, 'obras'));
    if (!rootObrasSnap.empty) {
      const batch = writeBatch(firestore);
      let count = 0;

      rootObrasSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const obraDoc = {
          id: docSnap.id,
          nombre: data.nombre || '',
          activo: data.activo !== undefined ? Number(data.activo) : 1
        };
        batch.set(doc(firestore, 'users', userId, 'obras', docSnap.id), obraDoc);
        obrasMap.set(docSnap.id, obraDoc);
        count++;
      });

      try {
        const rootTareasSnap = await getDocs(collection(firestore, 'tareas'));
        rootTareasSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const tareaDoc = {
            id: docSnap.id,
            obra_id: String(data.obra_id || ''),
            fecha_semana: String(data.fecha_semana || ''),
            dia_semana: String(data.dia_semana || ''),
            actividad: String(data.actividad || ''),
            gremio: String(data.gremio || 'Otros'),
            completada: data.completada !== undefined ? Number(data.completada) : 0,
            notas: String(data.notas || ''),
            fecha_creado: String(data.fecha_creado || new Date().toISOString())
          };
          batch.set(doc(firestore, 'users', userId, 'tareas', docSnap.id), tareaDoc);
          tareasMap.set(docSnap.id, tareaDoc);
          count++;
        });
      } catch (err) {
        console.warn('Tareas raíz no legibles o no disponibles:', err);
      }

      if (count > 0) {
        await batch.commit();
        return;
      }
    }
  } catch (err) {
    console.log('Lectura de obras raíz omitida o restringida por reglas:', err?.message);
  }

  // 2. Sembrar obras base iniciales si el usuario no tiene ninguna
  try {
    const batch = writeBatch(firestore);
    for (const obra of DEFAULT_STARTER_OBRAS) {
      batch.set(doc(firestore, 'users', userId, 'obras', obra.id), obra);
      obrasMap.set(obra.id, obra);
    }
    await batch.commit();
  } catch (err) {
    console.error('Error al sembrar obras iniciales del usuario:', err);
  }
}

/**
 * Conecta la base de datos a la sesión del usuario autenticado.
 * Aísla 100% las obras y tareas bajo /users/{uid}/obras y /users/{uid}/tareas
 */
export function setUserContext(user) {
  const newUserId = user ? user.uid : null;

  if (currentUserId === newUserId && isInitialized) {
    return initPromise || Promise.resolve();
  }

  // Desconectar oyentes previos si cambia de usuario o cierra sesión
  if (unsubObras) {
    unsubObras();
    unsubObras = null;
  }
  if (unsubTareas) {
    unsubTareas();
    unsubTareas = null;
  }

  obrasMap.clear();
  tareasMap.clear();
  currentUserId = newUserId;
  isInitialized = false;

  if (!currentUserId) {
    initPromise = Promise.resolve();
    notify(false);
    return initPromise;
  }

  initPromise = new Promise((resolve) => {
    let obrasReady = false;
    let tareasReady = false;

    async function checkReady() {
      if (obrasReady && tareasReady && !isInitialized) {
        if (obrasMap.size === 0) {
          await seedUserInitialData(currentUserId);
        }
        isInitialized = true;
        resolve();
        notify(false);
      }
    }

    // Escucha en tiempo real de 'obras' para el usuario actual
    const obrasCol = collection(firestore, 'users', currentUserId, 'obras');
    unsubObras = onSnapshot(obrasCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (change.type === 'removed') {
          obrasMap.delete(change.doc.id);
        } else {
          obrasMap.set(change.doc.id, {
            id: change.doc.id,
            nombre: data.nombre || '',
            activo: data.activo !== undefined ? Number(data.activo) : 1
          });
        }
      });
      obrasReady = true;
      checkReady();
      if (isInitialized) notify(false);
    }, (error) => {
      console.error('Firestore obras usuario error:', error);
      obrasReady = true;
      checkReady();
    });

    // Escucha en tiempo real de 'tareas' para el usuario actual
    const tareasCol = collection(firestore, 'users', currentUserId, 'tareas');
    unsubTareas = onSnapshot(tareasCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (change.type === 'removed') {
          tareasMap.delete(change.doc.id);
        } else {
          tareasMap.set(change.doc.id, {
            id: change.doc.id,
            obra_id: String(data.obra_id || ''),
            fecha_semana: String(data.fecha_semana || ''),
            dia_semana: String(data.dia_semana || ''),
            actividad: String(data.actividad || ''),
            gremio: String(data.gremio || 'Otros'),
            completada: data.completada !== undefined ? Number(data.completada) : 0,
            notas: String(data.notas || ''),
            fecha_creado: String(data.fecha_creado || new Date().toISOString())
          });
        }
      });
      tareasReady = true;
      checkReady();
      if (isInitialized) notify(false);
    }, (error) => {
      console.error('Firestore tareas usuario error:', error);
      tareasReady = true;
      checkReady();
    });
  });

  return initPromise;
}

export function getCurrentUserId() {
  return currentUserId;
}

export const db = {
  permission: 'write',
  get hasPending() { return pending > 0; },
  get pendingCount() { return pending; },

  async query(sql, params) {
    if (initPromise) {
      await initPromise;
    }
    const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    // Query 1: SELECT * FROM obras ORDER BY nombre ASC
    if (normalized.includes('from obras')) {
      const obrasList = Array.from(obrasMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      );
      const rows = obrasList.map((o) => [o.id, o.nombre, o.activo]);
      return { columns: ['id', 'nombre', 'activo'], rows, rowCount: rows.length };
    }

    // Query 2: SELECT t.id, t.obra_id ... FROM tareas t LEFT JOIN obras o ...
    if (normalized.includes('from tareas')) {
      const tareasList = Array.from(tareasMap.values()).sort((a, b) => {
        const weekCompare = a.fecha_semana.localeCompare(b.fecha_semana);
        if (weekCompare !== 0) return weekCompare;
        return a.fecha_creado.localeCompare(b.fecha_creado);
      });

      const rows = tareasList.map((t) => {
        const obra = obrasMap.get(t.obra_id);
        const obraNombre = obra ? obra.nombre : 'Obra Desconocida';
        return [
          t.id,
          t.obra_id,
          t.fecha_semana,
          t.dia_semana,
          t.actividad,
          t.gremio,
          t.completada,
          t.notas,
          obraNombre
        ];
      });

      return {
        columns: [
          'id',
          'obra_id',
          'fecha_semana',
          'dia_semana',
          'actividad',
          'gremio',
          'completada',
          'notas',
          'obra_nombre'
        ],
        rows,
        rowCount: rows.length
      };
    }

    return { columns: [], rows: [], rowCount: 0 };
  },

  async exec(sql, params = []) {
    if (!currentUserId) {
      throw new Error('Debes iniciar sesión con tu cuenta corporativa para guardar información.');
    }

    pending++;
    notify(true);

    try {
      const trimmed = sql.replace(/\s+/g, ' ').trim();
      const lower = trimmed.toLowerCase();

      // INSERT OR REPLACE INTO obras (id, nombre, activo) VALUES (?, ?, ?)
      if (lower.startsWith('insert or replace into obras') || lower.startsWith('insert into obras')) {
        const [id, nombre, activo] = params;
        const obraDoc = {
          id: String(id),
          nombre: String(nombre),
          activo: Number(activo) || 1
        };
        await setDoc(doc(firestore, 'users', currentUserId, 'obras', String(id)), obraDoc);
        obrasMap.set(String(id), obraDoc);
        return { changes: 1 };
      }

      // UPDATE obras SET nombre = ? WHERE id = ?
      if (lower.startsWith('update obras set nombre = ? where id = ?')) {
        const [nombre, id] = params;
        await updateDoc(doc(firestore, 'users', currentUserId, 'obras', String(id)), { nombre: String(nombre) });
        if (obrasMap.has(String(id))) {
          obrasMap.get(String(id)).nombre = String(nombre);
        }
        return { changes: 1 };
      }

      // DELETE FROM tareas WHERE obra_id = ?
      if (lower.startsWith('delete from tareas where obra_id = ?')) {
        const [obraId] = params;
        const q = query(
          collection(firestore, 'users', currentUserId, 'tareas'),
          where('obra_id', '==', String(obraId))
        );
        const snap = await getDocs(q);
        const batch = writeBatch(firestore);
        snap.forEach((d) => {
          batch.delete(d.ref);
          tareasMap.delete(d.id);
        });
        await batch.commit();
        return { changes: snap.size };
      }

      // DELETE FROM obras WHERE id = ?
      if (lower.startsWith('delete from obras where id = ?')) {
        const [id] = params;
        await deleteDoc(doc(firestore, 'users', currentUserId, 'obras', String(id)));
        obrasMap.delete(String(id));
        return { changes: 1 };
      }

      // INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES (...)
      if (lower.startsWith('insert or replace into tareas') || lower.startsWith('insert into tareas')) {
        const [id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado] = params;
        const tareaDoc = {
          id: String(id),
          obra_id: String(obra_id),
          fecha_semana: String(fecha_semana),
          dia_semana: String(dia_semana),
          actividad: String(actividad),
          gremio: String(gremio || 'Otros'),
          completada: Number(completada) || 0,
          notas: String(notas || ''),
          fecha_creado: String(fecha_creado || new Date().toISOString())
        };
        await setDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)), tareaDoc);
        tareasMap.set(String(id), tareaDoc);
        return { changes: 1 };
      }

      // UPDATE tareas SET obra_id = ?, dia_semana = ?, actividad = ?, gremio = ?, notas = ? WHERE id = ?
      if (lower.startsWith('update tareas set obra_id = ?, dia_semana = ?, actividad = ?, gremio = ?, notas = ? where id = ?')) {
        const [obra_id, dia_semana, actividad, gremio, notas, id] = params;
        const updateData = {
          obra_id: String(obra_id),
          dia_semana: String(dia_semana),
          actividad: String(actividad),
          gremio: String(gremio),
          notas: String(notas || '')
        };
        await updateDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)), updateData);
        if (tareasMap.has(String(id))) {
          Object.assign(tareasMap.get(String(id)), updateData);
        }
        return { changes: 1 };
      }

      // UPDATE tareas SET obra_id = ?, fecha_semana = ?, dia_semana = ?, notas = ? WHERE id = ?
      if (lower.startsWith('update tareas set obra_id = ?, fecha_semana = ?, dia_semana = ?, notas = ? where id = ?')) {
        const [obra_id, fecha_semana, dia_semana, notas, id] = params;
        const updateData = {
          obra_id: String(obra_id),
          fecha_semana: String(fecha_semana),
          dia_semana: String(dia_semana),
          notas: String(notas || '')
        };
        await updateDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)), updateData);
        if (tareasMap.has(String(id))) {
          Object.assign(tareasMap.get(String(id)), updateData);
        }
        return { changes: 1 };
      }

      // UPDATE tareas SET fecha_semana = ?, dia_semana = ?, notas = ? WHERE id = ?
      if (lower.startsWith('update tareas set fecha_semana = ?, dia_semana = ?, notas = ? where id = ?')) {
        const [fecha_semana, dia_semana, notas, id] = params;
        const updateData = {
          fecha_semana: String(fecha_semana),
          dia_semana: String(dia_semana),
          notas: String(notas || '')
        };
        await updateDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)), updateData);
        if (tareasMap.has(String(id))) {
          Object.assign(tareasMap.get(String(id)), updateData);
        }
        return { changes: 1 };
      }

      // UPDATE tareas SET notas = ? WHERE id = ?
      if (lower.startsWith('update tareas set notas = ? where id = ?')) {
        const [notas, id] = params;
        const updateData = {
          notas: String(notas || '')
        };
        await updateDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)), updateData);
        if (tareasMap.has(String(id))) {
          Object.assign(tareasMap.get(String(id)), updateData);
        }
        return { changes: 1 };
      }

      // UPDATE tareas SET fecha_semana = ?, dia_semana = ? WHERE id = ?
      if (lower.startsWith('update tareas set fecha_semana = ?, dia_semana = ? where id = ?')) {
        const [fecha_semana, dia_semana, id] = params;
        const updateData = {
          fecha_semana: String(fecha_semana),
          dia_semana: String(dia_semana)
        };
        await updateDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)), updateData);
        if (tareasMap.has(String(id))) {
          Object.assign(tareasMap.get(String(id)), updateData);
        }
        return { changes: 1 };
      }

      // UPDATE tareas SET completada = ? WHERE id = ?
      if (lower.startsWith('update tareas set completada = ? where id = ?')) {
        const [completada, id] = params;
        const updateData = { completada: Number(completada) || 0 };
        await updateDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)), updateData);
        if (tareasMap.has(String(id))) {
          Object.assign(tareasMap.get(String(id)), updateData);
        }
        return { changes: 1 };
      }

      // DELETE FROM tareas WHERE id = ?
      if (lower.startsWith('delete from tareas where id = ?')) {
        const [id] = params;
        await deleteDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)));
        tareasMap.delete(String(id));
        return { changes: 1 };
      }

      console.warn('Unhandled SQL query in Firestore db adapter:', sql);
      return { changes: 0 };
    } finally {
      pending--;
      notify(false);
    }
  },

  execute(sql, params) {
    return this.exec(sql, params);
  },

  refresh() {
    return Promise.resolve();
  },

  stopLive() {},

  onPendingChange(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((f) => f !== fn);
    };
  }
};

export function createAiClient(endpoint = '/api/dictado') {
  return {
    chat: {
      completions: {
        create: async (params) => {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: params.messages })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
          return json;
        }
      }
    }
  };
}

// Compatibilidad con window.AiKit
if (typeof window !== 'undefined') {
  window.AiKit = {
    db: () => db,
    createClient: () => createAiClient(),
    fetch: (...args) => window.fetch(...args)
  };
}

/**
 * Vuelca los datos guardados en SQLite / IndexedDB local de este navegador hacia Firestore (espacio privado del usuario).
 */
export async function migrateLocalDataToFirestore() {
  if (!currentUserId) {
    return { success: false, countObras: 0, countTareas: 0, message: 'Usuario no autenticado.' };
  }

  if (typeof window === 'undefined' || !window.indexedDB) {
    return { success: false, countObras: 0, countTareas: 0, message: 'IndexedDB no está disponible en este entorno.' };
  }

  // 1. Leer el buffer SQLite de IndexedDB 'planificador-obras' -> 'kv' -> 'sqlite'
  const saved = await new Promise((resolve) => {
    try {
      const req = window.indexedDB.open('planificador-obras', 1);
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => resolve(null);
      req.onsuccess = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains('kv')) {
          idb.close();
          return resolve(null);
        }
        const tx = idb.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        const getReq = store.get('sqlite');
        getReq.onsuccess = () => {
          idb.close();
          resolve(getReq.result);
        };
        getReq.onerror = () => {
          idb.close();
          resolve(null);
        };
      };
    } catch (_) {
      resolve(null);
    }
  });

  if (!saved || !saved.byteLength) {
    return {
      success: false,
      countObras: 0,
      countTareas: 0,
      message: 'No se encontraron datos locales previos guardados en este navegador.'
    };
  }

  try {
    const SQL = await initSqlJs({
      locateFile: (file) => (file.endsWith('.wasm') ? '/sql-wasm.wasm' : file)
    });
    const localDb = new SQL.Database(new Uint8Array(saved));

    let localObras = [];
    try {
      const res = localDb.exec('SELECT id, nombre, activo FROM obras');
      if (res.length > 0 && res[0].values) {
        localObras = res[0].values.map(([id, nombre, activo]) => ({
          id: String(id),
          nombre: String(nombre),
          activo: activo !== undefined ? Number(activo) : 1
        }));
      }
    } catch (e) {
      console.warn('Error leyendo obras locales:', e);
    }

    let localTareas = [];
    try {
      const res = localDb.exec('SELECT id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado FROM tareas');
      if (res.length > 0 && res[0].values) {
        localTareas = res[0].values.map(([id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado]) => ({
          id: String(id),
          obra_id: String(obra_id),
          fecha_semana: String(fecha_semana),
          dia_semana: String(dia_semana),
          actividad: String(actividad),
          gremio: String(gremio || 'Otros'),
          completada: Number(completada) || 0,
          notas: String(notas || ''),
          fecha_creado: String(fecha_creado || new Date().toISOString())
        }));
      }
    } catch (e) {
      console.warn('Error leyendo tareas locales:', e);
    }

    if (localObras.length === 0 && localTareas.length === 0) {
      return {
        success: false,
        countObras: 0,
        countTareas: 0,
        message: 'La base de datos local no contiene ninguna obra ni tarea.'
      };
    }

    // Subir a Firestore bajo users/${currentUserId}
    let batch = writeBatch(firestore);
    let opCount = 0;

    for (const obra of localObras) {
      batch.set(doc(firestore, 'users', currentUserId, 'obras', obra.id), obra, { merge: true });
      opCount++;
    }

    for (const tarea of localTareas) {
      batch.set(doc(firestore, 'users', currentUserId, 'tareas', tarea.id), tarea, { merge: true });
      opCount++;
      if (opCount >= 400) {
        await batch.commit();
        batch = writeBatch(firestore);
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    return {
      success: true,
      countObras: localObras.length,
      countTareas: localTareas.length,
      message: `¡Volcado completado con éxito! Se han volcado ${localObras.length} obras y ${localTareas.length} tareas locales a tu espacio privado en Firebase.`
    };
  } catch (err) {
    console.error('Error durante la migración local a Firestore:', err);
    return { success: false, message: 'Error durante la migración: ' + err.message };
  }
}
