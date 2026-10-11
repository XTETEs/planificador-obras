import initSqlJs from 'sql.js';

const STORE = 'kv';
const KEY = 'sqlite';
let database = null;
let readyPromise = null;

function openIdb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('planificador-obras', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
    r.onsuccess = () => { resolve(r.result); };
    r.onerror = () => { reject(r.error); };
  });
}

function idbGet() {
  return openIdb().then((d) => {
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readonly');
      const q = tx.objectStore(STORE).get(KEY);
      q.onsuccess = () => { resolve(q.result); };
      q.onerror = () => { reject(q.error); };
    });
  });
}

function idbPut(value) {
  return openIdb().then((d) => {
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => { resolve(); };
      tx.onerror = () => { reject(tx.error); };
    });
  });
}

function persist() {
  return idbPut(database.export());
}

export function initDb(seedUrl = '/db/seed.sql') {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => (file.endsWith('.wasm') ? '/sql-wasm.wasm' : file)
    });
    const saved = await idbGet();
    if (saved) {
      database = new SQL.Database(new Uint8Array(saved));
      return database;
    }
    database = new SQL.Database();
    try {
      const r = await fetch(seedUrl);
      if (r.ok) {
        const sql = await r.text();
        database.exec(sql);
        await persist();
      }
    } catch (e) {
      console.warn('No se pudo cargar la semilla inicial:', e);
    }
    return database;
  })();
  return readyPromise;
}

let queue = Promise.resolve();
function enqueue(task) {
  const p = queue.then(task);
  queue = p.catch(() => {});
  return p;
}

let pending = 0;
let listeners = [];
function notify() {
  const has = pending > 0;
  listeners.slice().forEach((fn) => {
    try { fn(has); } catch (e) { console.error(e); }
  });
}

function runQuery(sql, params) {
  const stmt = database.prepare(sql);
  try {
    if (params && params.length) stmt.bind(params);
    const cols = stmt.getColumnNames();
    const rows = [];
    while (stmt.step()) rows.push(stmt.get());
    return { columns: cols, rows, rowCount: rows.length };
  } finally {
    stmt.free();
  }
}

function runExec(sql, params) {
  pending++;
  notify();
  return enqueue(async () => {
    await initDb();
    database.run(sql, params || []);
    const changes = database.getRowsModified();
    await persist();
    return { changes };
  }).then(
    (r) => { pending--; notify(); return r; },
    (e) => { pending--; notify(); throw e; }
  );
}

export const db = {
  permission: 'write',
  get hasPending() { return pending > 0; },
  get pendingCount() { return pending; },
  query(sql, params) {
    return enqueue(async () => {
      await initDb();
      return runQuery(sql, params);
    });
  },
  exec: runExec,
  execute: runExec,
  refresh: () => Promise.resolve(),
  stopLive: () => {},
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
