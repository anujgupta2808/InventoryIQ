/**
 * Centralized Client-Side Storage Service (IndexedDB Backed)
 * Serves as an in-memory cache and IndexedDB synchronization layer.
 * Strictly eliminates localStorage as a source of truth for business data.
 */

import { openShopDatabase, getAllRecords, putRecord, deleteRecord, clearStore } from '../database/db.js';
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

    // Asynchronously synchronize with IndexedDB (No localStorage!)
    const storeName = this.getStoreName(name);
    if (this.activeShopId) {
      clearStore(this.activeShopId, storeName)
        .then(async () => {
          for (const item of arrayData) {
            if (item && item.id !== undefined && item.id !== null) {
              await putRecord(this.activeShopId, storeName, { ...item, id: String(item.id) });
            }
          }
        })
        .catch(err => {
          console.warn(`[StorageService] Background sync error for ${storeName}:`, err);
        });
    }

    return true;
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
}

export const storageService = new StorageService();
