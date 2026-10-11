/*
 * aikit-shim.js
 * Reemplazo de window.AiKit para ejecutar la app FUERA de AiKit.
 *  - AiKit.db(): SQLite (sql.js / WebAssembly) guardado en IndexedDB del navegador.
 *  - AiKit.createClient(): reenvia el dictado con IA a window.APP_CONFIG.aiEndpoint.
 * Para varios usuarios con datos compartidos hay que sustituir AiKit.db() por una API
 * propia con el mismo contrato (ver README).
 */
(function () {
  var cfg = window.APP_CONFIG || {};
  var SQLJS = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/';
  var STORE = 'kv', KEY = 'sqlite';
  var database = null, readyPromise = null;

  function openIdb() {
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open('planificador-obras', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }
  function idbGet() {
    return openIdb().then(function (d) {
      return new Promise(function (resolve, reject) {
        var q = d.transaction(STORE).objectStore(STORE).get(KEY);
        q.onsuccess = function () { resolve(q.result); };
        q.onerror = function () { reject(q.error); };
      });
    });
  }
  function idbPut(value) {
    return openIdb().then(function (d) {
      return new Promise(function (resolve, reject) {
        var tx = d.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  function persist() { return idbPut(database.export()); }

  function init() {
    if (readyPromise) return readyPromise;
    readyPromise = loadScript(SQLJS + 'sql-wasm.js')
      .then(function () { return window.initSqlJs({ locateFile: function (f) { return SQLJS + f; } }); })
      .then(function (SQL) {
        return idbGet().then(function (saved) {
          if (saved) { database = new SQL.Database(new Uint8Array(saved)); return; }
          database = new SQL.Database();
          return fetch(cfg.seedUrl || 'db/seed.sql')
            .then(function (r) { if (!r.ok) throw new Error('No se encuentra ' + (cfg.seedUrl || 'db/seed.sql')); return r.text(); })
            .then(function (sql) { database.exec(sql); return persist(); });
        });
      });
    return readyPromise;
  }

  var queue = Promise.resolve();
  function enqueue(task) {
    var p = queue.then(task);
    queue = p.catch(function () {});
    return p;
  }

  var pending = 0, listeners = [];
  function notify() {
    var has = pending > 0;
    listeners.slice().forEach(function (fn) { try { fn(has); } catch (e) { console.error(e); } });
  }

  function runQuery(sql, params) {
    var stmt = database.prepare(sql);
    try {
      if (params && params.length) stmt.bind(params);
      var cols = stmt.getColumnNames(), rows = [];
      while (stmt.step()) rows.push(stmt.get());
      return { columns: cols, rows: rows, rowCount: rows.length };
    } finally { stmt.free(); }
  }

  function runExec(sql, params) {
    pending++; notify();
    return enqueue(function () {
      return init().then(function () {
        database.run(sql, params || []);
        var changes = database.getRowsModified();
        return persist().then(function () { return { changes: changes }; });
      });
    }).then(function (r) { pending--; notify(); return r; },
            function (e) { pending--; notify(); throw e; });
  }

  var api = {
    permission: 'write',
    get hasPending() { return pending > 0; },
    get pendingCount() { return pending; },
    query: function (sql, params) {
      return enqueue(function () { return init().then(function () { return runQuery(sql, params); }); });
    },
    exec: runExec,
    execute: runExec,
    refresh: function () { return Promise.resolve(); },
    stopLive: function () {},
    onPendingChange: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    }
  };

  function createClient() {
    return {
      chat: { completions: { create: function (params) {
        if (!cfg.aiEndpoint) {
          return Promise.reject(new Error('Dictado con IA no configurado: define aiEndpoint en config.js'));
        }
        return fetch(cfg.aiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: params.messages })
        }).then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) throw new Error(j.error || ('Error ' + r.status));
            return j;
          });
        });
      } } }
    };
  }

  window.AiKit = {
    db: function () { return api; },
    createClient: createClient,
    fetch: function () { return window.fetch.apply(window, arguments); }
  };
})();
