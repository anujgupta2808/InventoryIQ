/**
 * Centralized Client-Side Storage Service (IndexedDB Backed)
 * Serves as an in-memory cache and IndexedDB synchronization layer.
 * Strictly eliminates localStorage as a source of truth for business data.
 */

import { openShopDatabase, getAllRecords, putRecord, deleteRecord, clearStore, replaceStoreData, atomicMultiStoreWrite } from '../database/db.js';
import { STORES, ALL_STORES } from '../database/schema.js';

export const SCHEMA_VERSION = 4;

export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'iq_schema_version',
  THEME: 'iq_theme',
  SIDEBAR: 'iq_sidebar_collapsed',
  DEVICE_ID: 'iq_device_id'
};

class StorageService {
  constructor() {
    this.activeShopId = 'default_shop';
    // Fast in-memory cache to support synchronous reads from React components
    this.memoryCache = new Map();
    this.initialized = false;
    this._writeLock = Promise.resolve();
    this._lastBackupSnapshot = null;
    this._initEmptyCache();
  }

  _initEmptyCache() {
    const defaultStores = [
      'PRODUCTS', 'CATEGORIES', 'SALES', 'SALE_ITEMS',
      'PURCHASES', 'PURCHASE_ITEMS', 'CUSTOMERS', 'SUPPLIERS',
      'PAYMENTS', 'STOCK_MOVEMENTS', 'AUDIT_LOGS', 'SETTINGS'
    ];
    defaultStores.forEach(name => {
      if (!this.memoryCache.has(name)) {
        this.memoryCache.set(name, []);
      }
    });
  }

  /**
   * Initializes storage for an authenticated shop, hydrating in-memory cache from IndexedDB
   */
  async initShop(shopId) {
    this.activeShopId = shopId || 'default_shop';
    try {
      await openShopDatabase(this.activeShopId);

      // Hydrate all stores from IndexedDB
      const storeMap = {
        PRODUCTS: STORES.PRODUCTS,
        CATEGORIES: STORES.CATEGORIES,
        SALES: STORES.SALES,
        SALE_ITEMS: STORES.SALE_ITEMS,
        PURCHASES: STORES.PURCHASES,
        PURCHASE_ITEMS: STORES.PURCHASE_ITEMS,
        CUSTOMERS: STORES.CUSTOMERS,
        SUPPLIERS: STORES.SUPPLIERS,
        PAYMENTS: STORES.PAYMENTS,
        STOCK_MOVEMENTS: STORES.STOCK_MOVEMENTS,
        AUDIT_LOGS: STORES.AUDIT_LOGS
      };

      for (const [cacheKey, storeName] of Object.entries(storeMap)) {
        try {
          const records = await getAllRecords(this.activeShopId, storeName);
          this.memoryCache.set(cacheKey, Array.isArray(records) ? records : []);
        } catch (storeErr) {
          console.warn(`Could not hydrate store ${storeName}:`, storeErr);
        }
      }

      this.initialized = true;
      return true;
    } catch (err) {
      console.error('[StorageService] Failed to initialize shop database:', err);
      return false;
    }
  }

  getStoreName(name) {
    const upper = String(name).toUpperCase();
    const map = {
      PRODUCTS: STORES.PRODUCTS,
      CATEGORIES: STORES.CATEGORIES,
      SALES: STORES.SALES,
      SALE_ITEMS: STORES.SALE_ITEMS,
      PURCHASES: STORES.PURCHASES,
      PURCHASE_ITEMS: STORES.PURCHASE_ITEMS,
      CUSTOMERS: STORES.CUSTOMERS,
      SUPPLIERS: STORES.SUPPLIERS,
      PAYMENTS: STORES.PAYMENTS,
      STOCK_MOVEMENTS: STORES.STOCK_MOVEMENTS,
      AUDIT_LOGS: STORES.AUDIT_LOGS,
      SETTINGS: STORES.SETTINGS
    };
    return map[upper] || STORES.PRODUCTS;
  }

  getCollection(name, defaultData = []) {
    const key = String(name).toUpperCase();
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    return defaultData;
  }

  setCollection(name, data) {
    const key = String(name).toUpperCase();
    const arrayData = Array.isArray(data) ? data : [];
    this.memoryCache.set(key, arrayData);

    // ATOMIC REPLACEMENT: Synchronize with IndexedDB using a single transaction.
    // Completely eliminates unsafe clear-and-repopulate race conditions.
    const storeName = this.getStoreName(name);
    if (this.activeShopId) {
      return replaceStoreData(this.activeShopId, storeName, arrayData)
        .catch(err => {
          console.warn(`[StorageService] Atomic background sync error for ${storeName}:`, err);
          return false;
        });
    }

    return Promise.resolve(true);
  }

  getItemById(name, id) {
    const items = this.getCollection(name);
    return items.find(item => String(item.id) === String(id)) || null;
  }

  insertItem(name, item) {
    const key = String(name).toUpperCase();
    const items = this.getCollection(name);
    const updated = [item, ...items];
    this.memoryCache.set(key, updated);

    // Asynchronously write to IndexedDB
    const storeName = this.getStoreName(name);
    if (this.activeShopId && item && item.id !== undefined && item.id !== null) {
      putRecord(this.activeShopId, storeName, { ...item, id: String(item.id) })
        .catch(err => console.warn(`[StorageService] Error writing item to ${storeName}:`, err));
    }

    return item;
  }

  updateItem(name, id, updates) {
    const key = String(name).toUpperCase();
    const items = this.getCollection(name);
    let updatedItem = null;

    const updated = items.map(item => {
      if (String(item.id) === String(id)) {
        updatedItem = { ...item, ...updates, id: item.id };
        return updatedItem;
      }
      return item;
    });

    if (updatedItem) {
      this.memoryCache.set(key, updated);

      // Asynchronously update IndexedDB
      const storeName = this.getStoreName(name);
      if (this.activeShopId) {
        putRecord(this.activeShopId, storeName, { ...updatedItem, id: String(updatedItem.id) })
          .catch(err => console.warn(`[StorageService] Error updating item in ${storeName}:`, err));
      }
      return updatedItem;
    }
    return null;
  }

  removeItem(name, id) {
    const key = String(name).toUpperCase();
    const items = this.getCollection(name);
    const filtered = items.filter(item => String(item.id) !== String(id));
    this.memoryCache.set(key, filtered);

    // Asynchronously delete from IndexedDB
    const storeName = this.getStoreName(name);
    if (this.activeShopId) {
      deleteRecord(this.activeShopId, storeName, String(id))
        .catch(err => console.warn(`[StorageService] Error deleting item from ${storeName}:`, err));
    }

    return filtered.length !== items.length;
  }

  clearCollection(name) {
    const key = String(name).toUpperCase();
    this.memoryCache.set(key, []);

    const storeName = this.getStoreName(name);
    if (this.activeShopId) {
      clearStore(this.activeShopId, storeName)
        .catch(err => console.warn(`[StorageService] Error clearing ${storeName}:`, err));
    }
  }

  resetAll(seedData = {}) {
    const collections = [
      'PRODUCTS', 'CATEGORIES', 'SALES', 'PURCHASES', 
      'CUSTOMERS', 'SUPPLIERS', 'PAYMENTS', 'STOCK_MOVEMENTS', 'AUDIT_LOGS'
    ];

    collections.forEach(col => {
      const initial = seedData[col.toLowerCase()] || seedData[col] || [];
      this.setCollection(col, initial);
    });

    return true;
  }

  /**
   * Concurrency lock to serialize asynchronous write batches
   */
  async queueWrite(operation) {
    this._writeLock = this._writeLock.then(async () => {
      try {
        return await operation();
      } catch (err) {
        console.warn('[StorageService] Queued operation failed:', err);
        throw err;
      }
    });
    return this._writeLock;
  }

  /**
   * Generates a full data export bundle from current active memory and IndexedDB state.
   */
  exportAllData() {
    const collections = [
      'PRODUCTS', 'CATEGORIES', 'SALES', 'SALE_ITEMS',
      'PURCHASES', 'PURCHASE_ITEMS', 'CUSTOMERS', 'SUPPLIERS',
      'PAYMENTS', 'STOCK_MOVEMENTS', 'AUDIT_LOGS', 'SETTINGS'
    ];

    const bundle = {
      _meta: {
        schemaVersion: SCHEMA_VERSION,
        applicationVersion: '2.0.0',
        exportedAt: new Date().toISOString(),
        shopId: this.activeShopId
      }
    };

    collections.forEach(col => {
      const storeKey = col.toLowerCase();
      // Use camelCase for saleItems, purchaseItems, stockMovements, auditLogs
      let propName = storeKey;
      if (col === 'SALE_ITEMS') propName = 'saleItems';
      else if (col === 'PURCHASE_ITEMS') propName = 'purchaseItems';
      else if (col === 'STOCK_MOVEMENTS') propName = 'stockMovements';
      else if (col === 'AUDIT_LOGS') propName = 'auditLogs';

      bundle[propName] = this.getCollection(col, []);
    });

    return bundle;
  }

  /**
   * Imports an archive snapshot into memory and IndexedDB atomically.
   * If any store fails or aborts, memory cache and IndexedDB roll back to pre-restore snapshot.
   */
  async importAllData(bundle, options = { merge: false, backup: true }) {
    if (!bundle || typeof bundle !== 'object') {
      throw new Error('Invalid bundle provided to importAllData');
    }

    // 1. Take safety snapshot of current memory cache before writing
    const preSnapshot = new Map();
    this.memoryCache.forEach((val, k) => {
      preSnapshot.set(k, Array.isArray(val) ? [...val] : val);
    });
    this._lastBackupSnapshot = preSnapshot;

    // 2. Extract collections from bundle (handles both root keys and bundle.data / bundle.stores)
    const sourceData = bundle.data || bundle.stores || bundle;

    const storeMapping = [
      { key: 'PRODUCTS', prop: 'products', storeName: STORES.PRODUCTS },
      { key: 'CATEGORIES', prop: 'categories', storeName: STORES.CATEGORIES },
      { key: 'SALES', prop: 'sales', storeName: STORES.SALES },
      { key: 'SALE_ITEMS', prop: 'saleItems', storeName: STORES.SALE_ITEMS },
      { key: 'PURCHASES', prop: 'purchases', storeName: STORES.PURCHASES },
      { key: 'PURCHASE_ITEMS', prop: 'purchaseItems', storeName: STORES.PURCHASE_ITEMS },
      { key: 'CUSTOMERS', prop: 'customers', storeName: STORES.CUSTOMERS },
      { key: 'SUPPLIERS', prop: 'suppliers', storeName: STORES.SUPPLIERS },
      { key: 'PAYMENTS', prop: 'payments', storeName: STORES.PAYMENTS },
      { key: 'STOCK_MOVEMENTS', prop: 'stockMovements', storeName: STORES.STOCK_MOVEMENTS },
      { key: 'AUDIT_LOGS', prop: 'auditLogs', storeName: STORES.AUDIT_LOGS },
      { key: 'SETTINGS', prop: 'settings', storeName: STORES.SETTINGS }
    ];

    const pendingMemoryUpdates = new Map();
    const pendingDbWrites = {};

    for (const mapping of storeMapping) {
      const incomingList = sourceData[mapping.prop] || sourceData[mapping.prop.toLowerCase()] || sourceData[mapping.key];

      if (Array.isArray(incomingList)) {
        let finalItems;
        if (options.merge) {
          const existing = this.getCollection(mapping.key, []);
          const existingMap = new Map(existing.map(item => [String(item.id || item.key), item]));
          incomingList.forEach(item => {
            const id = String(item.id || item.key);
            existingMap.set(id, { ...existingMap.get(id), ...item });
          });
          finalItems = Array.from(existingMap.values());
        } else {
          finalItems = incomingList.map(item => {
            if (item && item.id !== undefined && item.id !== null) {
              return { ...item, id: String(item.id) };
            }
            return item;
          });
        }
        pendingMemoryUpdates.set(mapping.key, finalItems);
        pendingDbWrites[mapping.storeName] = finalItems;
      }
    }

    try {
      // 3. Atomically write to IndexedDB first
      if (this.activeShopId && Object.keys(pendingDbWrites).length > 0) {
        await atomicMultiStoreWrite(this.activeShopId, pendingDbWrites, { clearFirst: !options.merge });
      }

      // 4. Update memory cache only after DB write succeeds
      pendingMemoryUpdates.forEach((val, key) => {
        this.memoryCache.set(key, val);
      });

      return { success: true, count: Object.keys(pendingDbWrites).length };
    } catch (err) {
      // ROLLBACK: Revert memory cache to pre-restore snapshot
      console.error('[StorageService] Import failed, rolling back to pre-restore state:', err);
      this.rollbackToLastSnapshot();
      throw err;
    }
  }

  /**
   * Reverts memory cache to the most recent pre-operation snapshot.
   */
  rollbackToLastSnapshot() {
    if (this._lastBackupSnapshot) {
      this.memoryCache = new Map(this._lastBackupSnapshot);
      this._lastBackupSnapshot = null;
      return true;
    }
    return false;
  }

  /**
   * Complete memory cache cleanup on session termination / logout
   * Prevents memory-resident data leakage across multiple users on same browser
   */
  clearMemoryCache() {
    this.memoryCache.clear();
    this._initEmptyCache();
    this.activeShopId = 'default_shop';
    this.initialized = false;
  }
}

export const storageService = new StorageService();
