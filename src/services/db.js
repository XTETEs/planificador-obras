import { initializeApp, getApps } from 'firebase/app';
import initSqlJs from 'sql.js';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
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

// Habilitar persistencia de caché local en el navegador con soporte para múltiples pestañas
export const firestore = (() => {
  if (typeof window !== 'undefined') {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (e) {
      return getFirestore(app);
    }
  }
  return getFirestore(app);
})();

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

/**
 * Guarda una instantánea de seguridad en localStorage para renderizado en 0ms y respaldo continuo
 */
function saveLocalSnapshot() {
  if (!currentUserId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`enue_cache_${currentUserId}_obras`, JSON.stringify(Array.from(obrasMap.values())));
    localStorage.setItem(`enue_cache_${currentUserId}_tareas`, JSON.stringify(Array.from(tareasMap.values())));
  } catch (e) {}
}

/**
 * Conecta la base de datos a la sesión del usuario corporativo autenticado.
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

  // 1. Cargar instantáneamente la caché local del usuario si existe (render en 0ms)
  if (typeof window !== 'undefined') {
    try {
      const rawObras = localStorage.getItem(`enue_cache_${currentUserId}_obras`);
      if (rawObras) {
        const parsedObras = JSON.parse(rawObras);
        if (Array.isArray(parsedObras)) {
          parsedObras.forEach((o) => {
            if (o && o.id) obrasMap.set(String(o.id), o);
          });
        }
      }
      const rawTareas = localStorage.getItem(`enue_cache_${currentUserId}_tareas`);
      if (rawTareas) {
        const parsedTareas = JSON.parse(rawTareas);
        if (Array.isArray(parsedTareas)) {
          parsedTareas.forEach((t) => {
            if (t && t.id) tareasMap.set(String(t.id), t);
          });
        }
      }
    } catch (e) {
      console.warn('Error leyendo caché local instantánea:', e);
    }
  }

  initPromise = new Promise((resolve) => {
    let obrasReady = false;
    let tareasReady = false;

    async function checkReady() {
      if (obrasReady && tareasReady && !isInitialized) {
        isInitialized = true;
        saveLocalSnapshot();
        resolve();
        notify(false);

        // Comprobar si es el primer acceso histórico de este usuario en Firestore
        try {
          const userDocRef = doc(firestore, 'users', currentUserId);
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            // Primer acceso del usuario corporativo: registrar perfil
            await setDoc(userDocRef, {
              email: user.email || '',
              displayName: user.displayName || '',
              initialized: true,
              fecha_creado: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn('Verificación de perfil de usuario en Firestore:', err?.message);
        }
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
      saveLocalSnapshot();
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
      saveLocalSnapshot();
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

    // Query 0: SELECT COUNT(*) FROM tareas WHERE obra_id = ?
    if (normalized.includes('count(*)')) {
      const obraId = params && params[0] ? String(params[0]) : null;
      let count = 0;
      if (obraId) {
        count = Array.from(tareasMap.values()).filter((t) => t.obra_id === obraId).length;
      } else {
        count = tareasMap.size;
      }
      return { columns: ['COUNT(*)'], rows: [[count]], rowCount: 1 };
    }

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
        return (a.fecha_creado || '').localeCompare(b.fecha_creado || '');
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
          activo: activo !== undefined ? Number(activo) : 1
        };
        await setDoc(doc(firestore, 'users', currentUserId, 'obras', String(id)), obraDoc, { merge: true });
        obrasMap.set(String(id), obraDoc);
        saveLocalSnapshot();
        return { changes: 1 };
      }

      // UPDATE obras SET ... WHERE id = ?
      if (lower.startsWith('update obras set')) {
        const setMatch = trimmed.match(/set\s+(.*?)\s+where\s+id\s*=\s*\?/i);
        const id = String(params[params.length - 1]);
        const existing = obrasMap.get(id) || {};
        let nuevoNombre = existing.nombre || '';
        let nuevoActivo = existing.activo !== undefined ? Number(existing.activo) : 1;
        if (setMatch) {
          const cols = setMatch[1].split(',').map((c) => c.split('=')[0].trim().toLowerCase());
          cols.forEach((col, idx) => {
            if (col === 'nombre') nuevoNombre = String(params[idx]);
            if (col === 'activo') nuevoActivo = Number(params[idx]);
          });
        } else if (params.length === 2) {
          nuevoNombre = String(params[0]);
        }
        const obraDoc = {
          id,
          nombre: nuevoNombre,
          activo: nuevoActivo
        };
        await setDoc(doc(firestore, 'users', currentUserId, 'obras', id), obraDoc, { merge: true });
        obrasMap.set(id, obraDoc);
        saveLocalSnapshot();
        return { changes: 1 };
      }

      // DELETE FROM tareas WHERE obra_id = ?
      if (lower.startsWith('delete from tareas where obra_id = ?')) {
        const [obraId] = params;
        const targetObraId = String(obraId);
        const toDelete = Array.from(tareasMap.values()).filter((t) => t.obra_id === targetObraId);
        if (toDelete.length > 0) {
          const batch = writeBatch(firestore);
          toDelete.forEach((t) => {
            batch.delete(doc(firestore, 'users', currentUserId, 'tareas', t.id));
            tareasMap.delete(t.id);
          });
          await batch.commit();
        }
        try {
          const q = query(
            collection(firestore, 'users', currentUserId, 'tareas'),
            where('obra_id', '==', targetObraId)
          );
          const snap = await getDocs(q);
          if (snap.size > 0) {
            const batch = writeBatch(firestore);
            snap.forEach((d) => {
              batch.delete(d.ref);
              tareasMap.delete(d.id);
            });
            await batch.commit();
          }
        } catch (_) {}
        saveLocalSnapshot();
        return { changes: toDelete.length };
      }

      // DELETE FROM obras WHERE id = ?
      if (lower.startsWith('delete from obras where id = ?')) {
        const [id] = params;
        await deleteDoc(doc(firestore, 'users', currentUserId, 'obras', String(id)));
        obrasMap.delete(String(id));
        saveLocalSnapshot();
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
        await setDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)), tareaDoc, { merge: true });
        tareasMap.set(String(id), tareaDoc);
        saveLocalSnapshot();
        return { changes: 1 };
      }

      // UPDATE tareas SET ... WHERE id = ?
      if (lower.startsWith('update tareas set')) {
        const setMatch = trimmed.match(/set\s+(.*?)\s+where\s+id\s*=\s*\?/i);
        const id = String(params[params.length - 1]);
        const existing = tareasMap.get(id) || {};

        const updateData = {};
        if (setMatch) {
          const cols = setMatch[1].split(',').map((c) => c.split('=')[0].trim().toLowerCase());
          cols.forEach((col, idx) => {
            updateData[col] = params[idx];
          });
        }

        const tareaDoc = {
          id,
          obra_id: updateData.obra_id !== undefined ? String(updateData.obra_id) : String(existing.obra_id || ''),
          fecha_semana: updateData.fecha_semana !== undefined ? String(updateData.fecha_semana) : String(existing.fecha_semana || ''),
          dia_semana: updateData.dia_semana !== undefined ? String(updateData.dia_semana) : String(existing.dia_semana || 'Lunes'),
          actividad: updateData.actividad !== undefined ? String(updateData.actividad) : String(existing.actividad || ''),
          gremio: updateData.gremio !== undefined ? String(updateData.gremio) : String(existing.gremio || 'Otros'),
          completada: updateData.completada !== undefined ? Number(updateData.completada) : (existing.completada !== undefined ? Number(existing.completada) : 0),
          notas: updateData.notas !== undefined ? String(updateData.notas || '') : String(existing.notas || ''),
          fecha_creado: String(existing.fecha_creado || new Date().toISOString())
        };

        await setDoc(doc(firestore, 'users', currentUserId, 'tareas', id), tareaDoc, { merge: true });
        tareasMap.set(id, tareaDoc);
        saveLocalSnapshot();
        return { changes: 1 };
      }

      // DELETE FROM tareas WHERE id = ?
      if (lower.startsWith('delete from tareas where id = ?')) {
        const [id] = params;
        await deleteDoc(doc(firestore, 'users', currentUserId, 'tareas', String(id)));
        tareasMap.delete(String(id));
        saveLocalSnapshot();
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

const STORAGE_SHARED_GREMIOS_KEY = 'enue_shared_gremios';

/**
 * Suscribe a los gremios/subcontratistas compartidos en Firestore en tiempo real.
 */
export function subscribeToSharedGremios(callback) {
  let initial = [];
  try {
    const raw = localStorage.getItem(STORAGE_SHARED_GREMIOS_KEY);
    if (raw) initial = JSON.parse(raw);
  } catch (e) {}

  if (initial.length > 0) {
    try { callback(initial); } catch (e) {}
  }

  const gremiosCol = collection(firestore, 'gremios');
  const unsub = onSnapshot(gremiosCol, (snap) => {
    const list = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        nombre: d.nombre || docSnap.id,
        creado_por: d.creado_por || '',
        fecha_creado: d.fecha_creado || ''
      });
    });
    list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    try {
      localStorage.setItem(STORAGE_SHARED_GREMIOS_KEY, JSON.stringify(list));
    } catch (e) {}
    callback(list);
  }, (err) => {
    console.warn('Error escuchando gremios compartidos:', err);
  });

  return unsub;
}

/**
 * Añade un nuevo gremio / subcontratista compartido para todos los usuarios.
 */
export async function createSharedGremio(nombre, createdBy = '') {
  const cleanNombre = (nombre || '').trim();
  if (!cleanNombre) {
    throw new Error('El nombre del gremio o subcontratista no puede estar vacío.');
  }
  // Generar ID seguro
  const id = 'g_' + cleanNombre.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50) + '_' + Date.now().toString(36);
  const data = {
    id,
    nombre: cleanNombre,
    creado_por: createdBy || 'Usuario Corporativo',
    fecha_creado: new Date().toISOString()
  };
  await setDoc(doc(firestore, 'gremios', id), data);
  return data;
}

/**
 * Elimina un gremio compartido de Firestore.
 */
export async function deleteSharedGremio(id) {
  if (!id) return;
  await deleteDoc(doc(firestore, 'gremios', String(id)));
}

