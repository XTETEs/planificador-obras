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
let unsubNotas = null;

// Caché en memoria para las obras, tareas y notas de la sesión activa del usuario
let obrasMap = new Map();
let tareasMap = new Map();
let notasMap = new Map();
let isInitialized = false;
let initPromise = null;

let pending = 0;
let listeners = [];
let offlineStatusListeners = [];
let isFlushingQueue = false;

function notify(hasPending) {
  listeners.slice().forEach((fn) => {
    try {
      fn(hasPending);
    } catch (e) {
      console.error(e);
    }
  });
}

function getOfflineQueueKey(uid = currentUserId) {
  return uid ? `enue_offline_queue_${uid}` : null;
}

export function getOfflineQueue(uid = currentUserId) {
  const key = getOfflineQueueKey(uid);
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveOfflineQueue(queue, uid = currentUserId, extraEvent = null) {
  const key = getOfflineQueueKey(uid);
  if (!key || typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (e) {
    console.warn('Error guardando cola offline:', e);
  }
  notifyOfflineStatus(extraEvent);
}

function enqueueOfflineOperation(type, docId, data = null) {
  if (!currentUserId || typeof window === 'undefined') return;
  const queue = getOfflineQueue(currentUserId);
  const category = type.includes('obra') ? 'obra' : (type.includes('nota') ? 'nota' : 'tarea');
  // Si ya había una operación pendiente sobre el mismo documento, actualizarla con el último estado
  const filtered = queue.filter(item => !(item.category === category && String(item.docId) === String(docId)));
  filtered.push({
    opId: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category,
    type,
    docId: String(docId),
    data,
    timestamp: new Date().toISOString()
  });
  saveOfflineQueue(filtered, currentUserId);
}

/**
 * Aplica las operaciones locales pendientes encima de cualquier instantánea recibida de la nube
 * para garantizar que ningún dato anotado sin cobertura desaparezca antes de sincronizarse.
 */
function applyOfflineQueueOverlay(targetObrasMap, targetTareasMap, targetNotasMap = null) {
  const queue = getOfflineQueue(currentUserId);
  if (!queue.length) return;
  for (const op of queue) {
    if (op.type === 'set_obra' && op.data) {
      targetObrasMap.set(String(op.docId), op.data);
    } else if (op.type === 'delete_obra') {
      targetObrasMap.delete(String(op.docId));
    } else if (op.type === 'set_tarea' && op.data) {
      targetTareasMap.set(String(op.docId), op.data);
    } else if (op.type === 'delete_tarea') {
      targetTareasMap.delete(String(op.docId));
    } else if (op.type === 'set_nota' && op.data && targetNotasMap) {
      targetNotasMap.set(String(op.docId), op.data);
    } else if (op.type === 'delete_nota' && targetNotasMap) {
      targetNotasMap.delete(String(op.docId));
    }
  }
}

function notifyOfflineStatus(extraEvent = null) {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const queue = getOfflineQueue(currentUserId);
  const status = {
    isOnline,
    pendingOfflineCount: queue.length,
    isFlushing: isFlushingQueue,
    queue,
    ...extraEvent
  };
  offlineStatusListeners.slice().forEach(fn => {
    try {
      fn(status);
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeToOfflineStatus(fn) {
  offlineStatusListeners.push(fn);
  try {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const queue = getOfflineQueue(currentUserId);
    fn({
      isOnline,
      pendingOfflineCount: queue.length,
      isFlushing: isFlushingQueue,
      queue
    });
  } catch (e) {}
  return () => {
    offlineStatusListeners = offlineStatusListeners.filter(f => f !== fn);
  };
}

/**
 * Envía a Firestore un cambio individual con límite de tiempo para evitar bloqueos por mala cobertura 3G/4G en obra
 */
function withNetworkTimeout(promise, ms = 4500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Tiempo de espera agotado por baja cobertura móvil'));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Vacía la cola de cambios acumulados en obra cuando vuelve la cobertura móvil o Wi-Fi
 */
export async function flushOfflineQueue() {
  if (!currentUserId || isFlushingQueue) return { syncedCount: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notifyOfflineStatus();
    return { syncedCount: 0 };
  }

  const initialQueue = getOfflineQueue(currentUserId);
  if (initialQueue.length === 0) {
    notifyOfflineStatus();
    return { syncedCount: 0 };
  }

  isFlushingQueue = true;
  notifyOfflineStatus();

  let syncedCount = 0;
  const uidAtStart = currentUserId;

  try {
    for (const op of initialQueue) {
      if (currentUserId !== uidAtStart) break;
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;

      try {
        if (op.type === 'set_obra' && op.data) {
          await withNetworkTimeout(
            setDoc(doc(firestore, 'users', uidAtStart, 'obras', String(op.docId)), op.data, { merge: true })
          );
        } else if (op.type === 'delete_obra') {
          await withNetworkTimeout(
            deleteDoc(doc(firestore, 'users', uidAtStart, 'obras', String(op.docId)))
          );
        } else if (op.type === 'set_tarea' && op.data) {
          await withNetworkTimeout(
            setDoc(doc(firestore, 'users', uidAtStart, 'tareas', String(op.docId)), op.data, { merge: true })
          );
        } else if (op.type === 'delete_tarea') {
          await withNetworkTimeout(
            deleteDoc(doc(firestore, 'users', uidAtStart, 'tareas', String(op.docId)))
          );
        } else if (op.type === 'set_nota' && op.data) {
          await withNetworkTimeout(
            setDoc(doc(firestore, 'users', uidAtStart, 'notas', String(op.docId)), op.data, { merge: true })
          );
        } else if (op.type === 'delete_nota') {
          await withNetworkTimeout(
            deleteDoc(doc(firestore, 'users', uidAtStart, 'notas', String(op.docId)))
          );
        }

        // Operación confirmada en la nube: eliminarla de la cola local
        const currentQ = getOfflineQueue(uidAtStart).filter(item => item.opId !== op.opId);
        saveOfflineQueue(currentQ, uidAtStart);
        syncedCount++;
      } catch (err) {
        // Si falla por microcorte o falta de cobertura en la obra, se mantiene en la cola para el siguiente intento automático
        console.warn('Operación retenida en cola local por baja cobertura:', op.type, op.docId, err?.message);
        break;
      }
    }
  } finally {
    isFlushingQueue = false;
    const remaining = getOfflineQueue(uidAtStart);
    notifyOfflineStatus(
      syncedCount > 0 && remaining.length === 0
        ? { justSyncedCount: syncedCount }
        : null
    );
    if (syncedCount > 0) {
      notify(false);
    }
  }

  return { syncedCount };
}

/**
 * Guarda una instantánea de seguridad en localStorage para renderizado en 0ms y respaldo continuo
 */
function saveLocalSnapshot() {
  if (!currentUserId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`enue_cache_${currentUserId}_obras`, JSON.stringify(Array.from(obrasMap.values())));
    localStorage.setItem(`enue_cache_${currentUserId}_tareas`, JSON.stringify(Array.from(tareasMap.values())));
    localStorage.setItem(`enue_cache_${currentUserId}_notas`, JSON.stringify(Array.from(notasMap.values())));
  } catch (e) {}
}

/**
 * Conecta la base de datos a la sesión del usuario corporativo autenticado.
 * Aísla 100% las obras, tareas y notas bajo /users/{uid}/obras, /users/{uid}/tareas y /users/{uid}/notas
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
  if (unsubNotas) {
    unsubNotas();
    unsubNotas = null;
  }

  obrasMap.clear();
  tareasMap.clear();
  notasMap.clear();
  currentUserId = newUserId;
  isInitialized = false;

  if (!currentUserId) {
    initPromise = Promise.resolve();
    notify(false);
    notifyOfflineStatus();
    return initPromise;
  }

  // 1. Cargar instantáneamente la caché local del usuario si existe (render en 0ms incluso sin cobertura en obra)
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
      const rawNotas = localStorage.getItem(`enue_cache_${currentUserId}_notas`);
      if (rawNotas) {
        const parsedNotas = JSON.parse(rawNotas);
        if (Array.isArray(parsedNotas)) {
          parsedNotas.forEach((n) => {
            if (n && n.id) notasMap.set(String(n.id), n);
          });
        }
      }
      // Superponer cualquier operación guardada sin cobertura en el dispositivo
      applyOfflineQueueOverlay(obrasMap, tareasMap, notasMap);
    } catch (e) {
      console.warn('Error leyendo caché local instantánea:', e);
    }
  }

  notifyOfflineStatus();

  initPromise = new Promise((resolve) => {
    let obrasReady = false;
    let tareasReady = false;
    let notasReady = false;

    // Si estamos sin cobertura y ya tenemos datos en caché local, resolver de inmediato sin bloquear la pantalla
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      isInitialized = true;
      resolve();
      notify(false);
    }

    async function checkReady() {
      if (obrasReady && tareasReady && notasReady && !isInitialized) {
        isInitialized = true;
        saveLocalSnapshot();
        resolve();
        notify(false);

        // Si había cambios pendientes en la cola offline, sincronizarlos ahora
        flushOfflineQueue();

        // Comprobar si es el primer acceso histórico de este usuario en Firestore
        try {
          if (typeof navigator === 'undefined' || navigator.onLine) {
            const userDocRef = doc(firestore, 'users', currentUserId);
            const userSnap = await getDoc(userDocRef);
            if (!userSnap.exists()) {
              await setDoc(userDocRef, {
                email: user.email || '',
                displayName: user.displayName || '',
                initialized: true,
                fecha_creado: new Date().toISOString()
              });
            }
          }
        } catch (err) {
          console.warn('Verificación de perfil de usuario en Firestore:', err?.message);
        }
      }
    }

    // Escucha en tiempo real de 'obras' para el usuario actual (reconstrucción completa + protección de cola offline)
    const obrasCol = collection(firestore, 'users', currentUserId, 'obras');
    unsubObras = onSnapshot(obrasCol, { includeMetadataChanges: true }, (snapshot) => {
      // No sobrescribir con una caché vacía si no hay conexión y ya tenemos datos locales
      if (snapshot.empty && snapshot.metadata.fromCache && obrasMap.size > 0) {
        obrasReady = true;
        checkReady();
        return;
      }
      const nextObrasMap = new Map();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        nextObrasMap.set(docSnap.id, {
          id: docSnap.id,
          nombre: data.nombre || '',
          activo: data.activo !== undefined ? Number(data.activo) : 1
        });
      });
      applyOfflineQueueOverlay(nextObrasMap, tareasMap, notasMap);
      obrasMap = nextObrasMap;
      obrasReady = true;
      saveLocalSnapshot();
      checkReady();
      if (isInitialized) notify(false);
    }, (error) => {
      console.error('Firestore obras usuario error:', error);
      obrasReady = true;
      checkReady();
    });

    // Escucha en tiempo real de 'tareas' para el usuario actual (reconstrucción completa + protección de cola offline)
    const tareasCol = collection(firestore, 'users', currentUserId, 'tareas');
    unsubTareas = onSnapshot(tareasCol, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.empty && snapshot.metadata.fromCache && tareasMap.size > 0) {
        tareasReady = true;
        checkReady();
        return;
      }
      const nextTareasMap = new Map();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        nextTareasMap.set(docSnap.id, {
          id: docSnap.id,
          obra_id: String(data.obra_id || ''),
          fecha_semana: String(data.fecha_semana || ''),
          dia_semana: String(data.dia_semana || ''),
          actividad: String(data.actividad || ''),
          gremio: String(data.gremio || 'Otros'),
          completada: data.completada !== undefined ? Number(data.completada) : 0,
          notas: String(data.notas || ''),
          trazo_data: data.trazo_data ? String(data.trazo_data) : null,
          fecha_creado: String(data.fecha_creado || new Date().toISOString())
        });
      });
      applyOfflineQueueOverlay(obrasMap, nextTareasMap, notasMap);
      tareasMap = nextTareasMap;
      tareasReady = true;
      saveLocalSnapshot();
      checkReady();
      if (isInitialized) notify(false);
    }, (error) => {
      console.error('Firestore tareas usuario error:', error);
      tareasReady = true;
      checkReady();
    });

    // Escucha en tiempo real de 'notas' para el usuario actual (reconstrucción completa + protección de cola offline)
    const notasCol = collection(firestore, 'users', currentUserId, 'notas');
    unsubNotas = onSnapshot(notasCol, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.empty && snapshot.metadata.fromCache && notasMap.size > 0) {
        notasReady = true;
        checkReady();
        return;
      }
      const nextNotasMap = new Map();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        nextNotasMap.set(docSnap.id, {
          id: docSnap.id,
          tipo: data.tipo === 'trazo' ? 'trazo' : 'texto',
          completada: data.completada !== undefined ? (Number(data.completada) || 0) : 0,
          fecha_creacion: String(data.fecha_creacion || new Date().toISOString()),
          fecha_completada: data.fecha_completada ? String(data.fecha_completada) : null,
          texto: data.texto !== undefined && data.texto !== null ? String(data.texto) : '',
          trazo_data: data.trazo_data ? String(data.trazo_data) : null,
          prioridad: data.prioridad || 'normal',
          obra_id: data.obra_id ? String(data.obra_id) : null
        });
      });
      applyOfflineQueueOverlay(obrasMap, tareasMap, nextNotasMap);
      notasMap = nextNotasMap;
      notasReady = true;
      saveLocalSnapshot();
      checkReady();
      if (isInitialized) notify(false);
    }, (error) => {
      console.error('Firestore notas usuario error:', error);
      notasReady = true;
      checkReady();
    });
  });

  return initPromise;
}

export function getCurrentUserId() {
  return currentUserId;
}

/**
 * Fuerza una sincronización activa con Firestore vaciando primero cualquier cambio anotado sin cobertura en obra
 */
export async function forceCloudSync() {
  if (!currentUserId) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notifyOfflineStatus();
    return;
  }
  try {
    // 1. Primero subir cualquier cambio pendiente en la cola local del dispositivo
    await flushOfflineQueue();

    // 2. Descargar estado actualizado desde Firestore
    const [obrasSnap, tareasSnap, notasSnap] = await Promise.all([
      withNetworkTimeout(getDocs(collection(firestore, 'users', currentUserId, 'obras')), 5000),
      withNetworkTimeout(getDocs(collection(firestore, 'users', currentUserId, 'tareas')), 5000),
      withNetworkTimeout(getDocs(collection(firestore, 'users', currentUserId, 'notas')), 5000)
    ]);

    const nextObrasMap = new Map();
    obrasSnap.forEach((docSnap) => {
      const data = docSnap.data();
      nextObrasMap.set(docSnap.id, {
        id: docSnap.id,
        nombre: data.nombre || '',
        activo: data.activo !== undefined ? Number(data.activo) : 1
      });
    });

    const nextTareasMap = new Map();
    tareasSnap.forEach((docSnap) => {
      const data = docSnap.data();
      nextTareasMap.set(docSnap.id, {
        id: docSnap.id,
        obra_id: String(data.obra_id || ''),
        fecha_semana: String(data.fecha_semana || ''),
        dia_semana: String(data.dia_semana || ''),
        actividad: String(data.actividad || ''),
        gremio: String(data.gremio || 'Otros'),
        completada: data.completada !== undefined ? Number(data.completada) : 0,
        notas: String(data.notas || ''),
        trazo_data: data.trazo_data ? String(data.trazo_data) : null,
        fecha_creado: String(data.fecha_creado || new Date().toISOString())
      });
    });

    const nextNotasMap = new Map();
    notasSnap.forEach((docSnap) => {
      const data = docSnap.data();
      nextNotasMap.set(docSnap.id, {
        id: docSnap.id,
        tipo: data.tipo === 'trazo' ? 'trazo' : 'texto',
        completada: data.completada !== undefined ? (Number(data.completada) || 0) : 0,
        fecha_creacion: String(data.fecha_creacion || new Date().toISOString()),
        fecha_completada: data.fecha_completada ? String(data.fecha_completada) : null,
        texto: data.texto !== undefined && data.texto !== null ? String(data.texto) : '',
        trazo_data: data.trazo_data ? String(data.trazo_data) : null,
        prioridad: data.prioridad || 'normal',
        obra_id: data.obra_id ? String(data.obra_id) : null
      });
    });

    // Preservar cualquier operación que aún siga en la cola local
    applyOfflineQueueOverlay(nextObrasMap, nextTareasMap, nextNotasMap);
    obrasMap = nextObrasMap;
    tareasMap = nextTareasMap;
    notasMap = nextNotasMap;

    saveLocalSnapshot();
    notify(false);
    notifyOfflineStatus();
  } catch (e) {
    console.warn('Error en sincronización activa con la nube (modo sin cobertura activo):', e?.message);
    notifyOfflineStatus();
  }
}

// Auto-sincronizar cuando el dispositivo móvil/tablet recupera cobertura o foco
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyOfflineStatus();
    flushOfflineQueue().then(() => forceCloudSync());
  });
  window.addEventListener('offline', () => {
    notifyOfflineStatus();
  });
  window.addEventListener('focus', () => {
    if (navigator.onLine) {
      flushOfflineQueue().then(() => forceCloudSync());
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      flushOfflineQueue().then(() => forceCloudSync());
    }
  });
  // Reintento periódico automático cada 12 segundos si hay cambios anotados en obra pendientes de cobertura
  setInterval(() => {
    if (navigator.onLine && currentUserId && getOfflineQueue(currentUserId).length > 0) {
      flushOfflineQueue();
    }
  }, 12000);
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
          obraNombre,
          t.trazo_data || null
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
          'obra_nombre',
          'trazo_data'
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
        // 1. Guardado local instantáneo (0ms) + Cola Offline persistente
        obrasMap.set(String(id), obraDoc);
        saveLocalSnapshot();
        enqueueOfflineOperation('set_obra', String(id), obraDoc);
        // 2. Sincronizar en segundo plano sin bloquear si no hay cobertura en obra
        flushOfflineQueue();
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
        obrasMap.set(id, obraDoc);
        saveLocalSnapshot();
        enqueueOfflineOperation('set_obra', id, obraDoc);
        flushOfflineQueue();
        return { changes: 1 };
      }

      // DELETE FROM tareas WHERE obra_id = ?
      if (lower.startsWith('delete from tareas where obra_id = ?')) {
        const [obraId] = params;
        const targetObraId = String(obraId);
        const toDelete = Array.from(tareasMap.values()).filter((t) => t.obra_id === targetObraId);
        toDelete.forEach((t) => {
          tareasMap.delete(t.id);
          enqueueOfflineOperation('delete_tarea', t.id);
        });
        saveLocalSnapshot();
        flushOfflineQueue();
        return { changes: toDelete.length };
      }

      // DELETE FROM obras WHERE id = ?
      if (lower.startsWith('delete from obras where id = ?')) {
        const [id] = params;
        obrasMap.delete(String(id));
        saveLocalSnapshot();
        enqueueOfflineOperation('delete_obra', String(id));
        flushOfflineQueue();
        return { changes: 1 };
      }

      // INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado, trazo_data) VALUES (...)
      if (lower.startsWith('insert or replace into tareas') || lower.startsWith('insert into tareas')) {
        const [id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado, trazo_data] = params;
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
        if (trazo_data) {
          tareaDoc.trazo_data = String(trazo_data);
        }
        // Guardado local instantáneo (0ms) + Cola Offline persistente para trabajo en obra sin cobertura
        tareasMap.set(String(id), tareaDoc);
        saveLocalSnapshot();
        enqueueOfflineOperation('set_tarea', String(id), tareaDoc);
        flushOfflineQueue();
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
        if (updateData.trazo_data !== undefined) {
          if (updateData.trazo_data) tareaDoc.trazo_data = String(updateData.trazo_data);
        } else if (existing.trazo_data) {
          tareaDoc.trazo_data = existing.trazo_data;
        }

        tareasMap.set(id, tareaDoc);
        saveLocalSnapshot();
        enqueueOfflineOperation('set_tarea', id, tareaDoc);
        flushOfflineQueue();
        return { changes: 1 };
      }

      // DELETE FROM tareas WHERE id = ?
      if (lower.startsWith('delete from tareas where id = ?')) {
        const [id] = params;
        tareasMap.delete(String(id));
        saveLocalSnapshot();
        enqueueOfflineOperation('delete_tarea', String(id));
        flushOfflineQueue();
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
    return forceCloudSync();
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

let gremiosListeners = [];

function notifyGremiosListeners(list) {
  gremiosListeners.slice().forEach((cb) => {
    try { cb(list); } catch (e) {}
  });
}

/**
 * Suscribe a los gremios/subcontratistas compartidos en Firestore en tiempo real (con soporte sin cobertura).
 */
export function subscribeToSharedGremios(callback) {
  gremiosListeners.push(callback);
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
    if (snap.empty && snap.metadata.fromCache && initial.length > 0) return;
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
    notifyGremiosListeners(list);
  }, (err) => {
    console.warn('Error escuchando gremios compartidos:', err);
  });

  return () => {
    gremiosListeners = gremiosListeners.filter((cb) => cb !== callback);
    unsub();
  };
}

/**
 * Añade un nuevo gremio / subcontratista compartido (instantáneo sin cobertura y sincronizado con la nube).
 */
export async function createSharedGremio(nombre, createdBy = '') {
  const cleanNombre = (nombre || '').trim();
  if (!cleanNombre) {
    throw new Error('El nombre del gremio o subcontratista no puede estar vacío.');
  }
  const id = 'g_' + cleanNombre.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50) + '_' + Date.now().toString(36);
  const data = {
    id,
    nombre: cleanNombre,
    creado_por: createdBy || 'Usuario Corporativo',
    fecha_creado: new Date().toISOString()
  };

  // Guardado local instantáneo (0ms) por si no hay cobertura en obra
  try {
    const raw = localStorage.getItem(STORAGE_SHARED_GREMIOS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const nextList = [...list.filter(g => g.nombre.toLowerCase() !== cleanNombre.toLowerCase()), data];
    nextList.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    localStorage.setItem(STORAGE_SHARED_GREMIOS_KEY, JSON.stringify(nextList));
    notifyGremiosListeners(nextList);
  } catch (e) {}

  // Sincronización en segundo plano con Firestore (cuando haya cobertura)
  setDoc(doc(firestore, 'gremios', id), data).catch((err) => {
    console.warn('Gremio guardado localmente; se sincronizará al recuperar cobertura:', err?.message);
  });

  return data;
}

/**
 * Elimina un gremio compartido de Firestore (con soporte offline).
 */
export async function deleteSharedGremio(id) {
  if (!id) return;
  try {
    const raw = localStorage.getItem(STORAGE_SHARED_GREMIOS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const nextList = list.filter(g => String(g.id) !== String(id));
    localStorage.setItem(STORAGE_SHARED_GREMIOS_KEY, JSON.stringify(nextList));
    notifyGremiosListeners(nextList);
  } catch (e) {}

  deleteDoc(doc(firestore, 'gremios', String(id))).catch((err) => {
    console.warn('Eliminación de gremio pendiente de cobertura:', err?.message);
  });
}

/**
 * ===============================================================
 * GESTIÓN DE BLOC DE NOTAS & CHECKLIST (OFFLINE + FIRESTORE SYNC)
 * ===============================================================
 */

export function getNotas() {
  return Array.from(notasMap.values()).sort((a, b) => {
    return (b.fecha_creacion || '').localeCompare(a.fecha_creacion || '');
  });
}

export async function saveNota(nota) {
  if (!currentUserId) {
    throw new Error('Debes iniciar sesión con tu cuenta corporativa para guardar notas.');
  }

  const id = String(nota.id || `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  
  // Limpiar y conformar estrictamente al esquema validado por Firestore Rules
  const cleanDoc = {
    id,
    tipo: nota.tipo === 'trazo' ? 'trazo' : 'texto',
    completada: nota.completada ? 1 : 0,
    fecha_creacion: String(nota.fecha_creacion || new Date().toISOString())
  };

  if (nota.texto !== undefined && nota.texto !== null) {
    cleanDoc.texto = String(nota.texto).slice(0, 5000);
  }
  if (nota.fecha_completada) {
    cleanDoc.fecha_completada = String(nota.fecha_completada);
  }
  if (nota.trazo_data) {
    cleanDoc.trazo_data = String(nota.trazo_data).slice(0, 600000);
  }
  if (nota.prioridad && ['normal', 'urgente', 'repaso'].includes(nota.prioridad)) {
    cleanDoc.prioridad = nota.prioridad;
  }
  if (nota.obra_id) {
    cleanDoc.obra_id = String(nota.obra_id).slice(0, 100);
  }

  // 1. Guardado local instantáneo (0ms)
  notasMap.set(id, cleanDoc);
  saveLocalSnapshot();
  enqueueOfflineOperation('set_nota', id, cleanDoc);

  // 2. Sincronización en la nube en segundo plano
  flushOfflineQueue();
  notify(false);

  return cleanDoc;
}

export async function updateNota(id, updates) {
  if (!currentUserId) {
    throw new Error('Debes iniciar sesión para actualizar notas.');
  }
  const strId = String(id);
  const existing = notasMap.get(strId) || {};
  const merged = { ...existing, ...updates, id: strId };
  // Preservar fecha de creación original obligatoriamente
  if (existing.fecha_creacion) {
    merged.fecha_creacion = existing.fecha_creacion;
  }
  return saveNota(merged);
}

export async function deleteNota(id) {
  if (!currentUserId) {
    throw new Error('Debes iniciar sesión para eliminar notas.');
  }
  const strId = String(id);
  notasMap.delete(strId);
  saveLocalSnapshot();
  enqueueOfflineOperation('delete_nota', strId);
  flushOfflineQueue();
  notify(false);
  return { changes: 1 };
}


