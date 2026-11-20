/**
 * IndexedDB Core Abstraction Layer for InventoryIQ Local-First Architecture
 * Manages database lifecycle, store access, queries, transactions, and health diagnostics.
 */

import { DB_NAME_PREFIX, CURRENT_DB_VERSION, setupDatabaseSchema, STORES, ALL_STORES } from './schema.js';
import { MigrationEngine } from './migrations.js';

// Cache open database connections per shop
const dbConnections = new Map();

/**
 * Returns the normalized database name for a shop.
 */
export function getShopDbName(shopId) {
  const cleanId = String(shopId || 'default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `${DB_NAME_PREFIX}${cleanId}`;
}

/**
 * Opens or retrieves the cached IndexedDB connection for a shop.
 */
export async function openShopDatabase(shopId) {
  const dbName = getShopDbName(shopId);

  if (dbConnections.has(dbName)) {
    const cachedDb = dbConnections.get(dbName);
    // Ensure the connection is still open
    try {
      if (cachedDb && !cachedDb.closed) {
        return cachedDb;
      }
    } catch (_) {
      // Re-open if stale
    }
  }

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this browser/environment.'));
    }

    const request = indexedDB.open(dbName, CURRENT_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      setupDatabaseSchema(db);
    };

    request.onsuccess = async (event) => {
      const db = event.target.result;

      db.onversionchange = () => {
        db.close();
        dbConnections.delete(dbName);
      };

      db.onerror = (errEvent) => {
        console.error(`[IndexedDB ${dbName}] Unhandled database error:`, errEvent.target?.error);
      };

      dbConnections.set(dbName, db);

      // Perform one-time migration from legacy localStorage if necessary
      try {
        await MigrationEngine.migrateFromLocalStorage(db, shopId);
      } catch (mErr) {
        console.warn(`[IndexedDB ${dbName}] Legacy migration notice:`, mErr);
      }

      resolve(db);
    };

    request.onerror = (event) => {
      console.error(`[IndexedDB ${dbName}] Failed to open database:`, event.target?.error);
      reject(event.target?.error || new Error(`Could not open database "${dbName}"`));
    };

    request.onblocked = () => {
      console.warn(`[IndexedDB ${dbName}] Database upgrade blocked by another open tab.`);
    };
  });
}

/**
 * Closes the database connection for a shop.
 */
export function closeShopDatabase(shopId) {
  const dbName = getShopDbName(shopId);
  if (dbConnections.has(dbName)) {
    try {
      const db = dbConnections.get(dbName);
      db.close();
    } catch (err) {
      console.warn(`Error closing database ${dbName}:`, err);
    }
    dbConnections.delete(dbName);
  }
}

/**
 * Executes a single-operation read against an object store.
 */
export async function getRecord(shopId, storeName, key) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all records from an object store.
 */
export async function getAllRecords(shopId, storeName, query = null, count = undefined) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll(query, count);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Inserts or updates a record in an object store.
 */
export async function putRecord(shopId, storeName, value) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error(`Transaction aborted while writing to ${storeName}`));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Adds a new record to an object store (fails if key exists).
 */
export async function addRecord(shopId, storeName, value) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.add(value);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error(`Transaction aborted while adding to ${storeName}`));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes a record by key from an object store.
 */
export async function deleteRecord(shopId, storeName, key) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Counts records in an object store.
 */
export async function countRecords(shopId, storeName, query = null) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count(query);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Clears all records from an object store.
 */
export async function clearStore(shopId, storeName) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * ATOMIC STORE REPLACEMENT (Prevents clear-and-repopulate race conditions)
 * Clears and repopulates an object store inside a SINGLE atomic transaction.
 * If any record insertion fails or an abort occurs, the clear operation is automatically rolled back!
 */
export async function replaceStoreData(shopId, storeName, records) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();

      if (Array.isArray(records)) {
        for (const item of records) {
          if (item && item.id !== undefined && item.id !== null) {
            store.put({ ...item, id: String(item.id) });
          } else if (item && item.key !== undefined) {
            store.put(item);
          }
        }
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error(`Transaction failed while replacing ${storeName}`));
      tx.onabort = () => reject(new Error(`Transaction aborted while replacing ${storeName}`));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * ATOMIC MULTI-STORE TRANSACTION
 * Executes an arbitrary callback with a multi-store transaction.
 * Rolls back all touched stores if any operation fails or throws.
 */
export async function runTransaction(shopId, storeNames, mode = 'readwrite', operationFn) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeNames, mode);
      let opResult;

      tx.oncomplete = () => resolve(opResult);
      tx.onerror = () => reject(tx.error || new Error('Transaction failed'));
      tx.onabort = () => reject(new Error('Transaction was aborted'));

      try {
        opResult = operationFn(tx);
        // If operationFn returned a promise that rejected, abort transaction
        if (opResult && typeof opResult.then === 'function') {
          opResult.catch(err => {
            try { tx.abort(); } catch (_) {}
            reject(err);
          });
        }
      } catch (err) {
        try { tx.abort(); } catch (_) {}
        reject(err);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * ATOMIC MULTI-STORE BATCH WRITE
 * Writes or replaces records across multiple stores inside a SINGLE transaction.
 * If any store or record fails, all modifications are rolled back.
 */
export async function atomicMultiStoreWrite(shopId, storeDataMap, options = { clearFirst: false }) {
  const db = await openShopDatabase(shopId);
  const storeNames = Object.keys(storeDataMap);
  if (storeNames.length === 0) return true;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeNames, 'readwrite');

      if (options.clearFirst) {
        storeNames.forEach(name => tx.objectStore(name).clear());
      }

      for (const [storeName, records] of Object.entries(storeDataMap)) {
        const store = tx.objectStore(storeName);
        if (Array.isArray(records)) {
          for (const item of records) {
            if (item && item.id !== undefined && item.id !== null) {
              store.put({ ...item, id: String(item.id) });
            } else if (item && item.key !== undefined) {
              store.put(item);
            }
          }
        }
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Atomic multi-store write failed'));
      tx.onabort = () => reject(new Error('Atomic multi-store write aborted'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves a complete multi-store snapshot for backup export or diagnostic analysis.
 */
export async function exportAllStoresData(shopId) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ALL_STORES, 'readonly');
      const snapshot = {};
      let remaining = ALL_STORES.length;

      ALL_STORES.forEach(storeName => {
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => {
          snapshot[storeName] = req.result || [];
          remaining--;
          if (remaining === 0) {
            resolve(snapshot);
          }
        };
        req.onerror = () => reject(req.error);
      });

      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Clears all business data across all object stores in the shop's local database.
 */
export async function clearAllStoresData(shopId) {
  const db = await openShopDatabase(shopId);
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ALL_STORES, 'readwrite');
      ALL_STORES.forEach(storeName => {
        tx.objectStore(storeName).clear();
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Health diagnostic check for the shop's local database.
 */
export async function checkDatabaseHealth(shopId) {
  try {
    const db = await openShopDatabase(shopId);
    const storeCounts = {};
    for (const store of [STORES.PRODUCTS, STORES.SALES, STORES.CUSTOMERS, STORES.PURCHASES]) {
      storeCounts[store] = await countRecords(shopId, store);
    }
    return {
      healthy: true,
      shopId,
      dbName: getShopDbName(shopId),
      version: db.version,
      counts: storeCounts
    };
  } catch (err) {
    return {
      healthy: false,
      shopId,
      error: err.message
    };
  }
}

