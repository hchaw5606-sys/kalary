/* Kalary IndexedDB — stores transactions + photo blobs on device (offline) */
const DB_NAME = 'kalary-db', STORE = 'transactions', VER = 1;

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('date', 'date', { unique: false });
        s.createIndex('type', 'type', { unique: false });
        s.createIndex('category', 'category', { unique: false });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
    if (out && out.onsuccess) out.onsuccess = () => res(out.result);
    if (out && out.onerror) out.onerror = () => rej(out.error);
  });
}
export const DB = {
  async all() {
    const db = await openDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  },
  async get(id) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE).objectStore(STORE).get(id);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  },
  async put(item) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(item);
      req.onsuccess = () => res(item.id);
      req.onerror = () => rej(req.error);
    });
  },
  async del(id) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  },
  async clear() {
    const db = await openDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  }
};
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
