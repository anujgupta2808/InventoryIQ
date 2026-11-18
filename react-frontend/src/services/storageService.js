/**
 * Centralized Client-Side Storage Service
 * Manages versioned local collections, schema migration, corrupted storage fallback,
 * and data integrity without external servers.
 */

import { safeGet, safeSet, safeRemove, isStorageAvailable } from '../utils/storageUtils.js';

export const SCHEMA_VERSION = 4;

export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'iq_schema_version',
  USERS: 'iq_v4_users',
  SESSION: 'iq_v4_session',
  PRODUCTS: 'iq_v4_products',
  CATEGORIES: 'iq_v4_categories',
  SALES: 'iq_v4_sales',
  PURCHASES: 'iq_v4_purchases',
  CUSTOMERS: 'iq_v4_customers',
  SUPPLIERS: 'iq_v4_suppliers',
  PAYMENTS: 'iq_v4_payments',
  STOCK_MOVEMENTS: 'iq_v4_stockMovements',
  SETTINGS: 'iq_v4_settings',
  AUDIT_LOGS: 'iq_v4_auditLogs',
  SESSIONS: 'iq_v4_sessions'
};

// Legacy keys for automatic migration
const LEGACY_V3_KEYS = {
  users: 'iq_v3_users',
  session: 'iq_v3_session',
  products: 'iq_v3_products',
  categories: 'iq_v3_categories',
  sales: 'iq_v3_sales',
  purchases: 'iq_v3_purchases',
  customers: 'iq_v3_customers',
  suppliers: 'iq_v3_suppliers',
  sessions: 'iq_v3_sessions',
  auditLogs: 'iq_v3_auditLogs'
};

class StorageService {
  constructor() {
    this.initialized = false;
    this.checkAndMigrate();
  }

  checkAndMigrate() {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      const currentVer = safeGet(STORAGE_KEYS.SCHEMA_VERSION, 0);

      if (currentVer < SCHEMA_VERSION) {
        // Migrate v3 data if v4 is not populated yet
        Object.keys(LEGACY_V3_KEYS).forEach(key => {
          const v4Key = STORAGE_KEYS[key.toUpperCase()] || STORAGE_KEYS.AUDIT_LOGS;
          const legacyKey = LEGACY_V3_KEYS[key];

          const existingV4 = safeGet(v4Key, null);
          if (existingV4 === null) {
            const legacyData = safeGet(legacyKey, null);
            if (legacyData !== null) {
              safeSet(v4Key, legacyData);
            }
          }
        });

        safeSet(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);
      }
    } catch (e) {
      console.warn('Storage migration failed:', e);
    }

    this.initialized = true;
  }

  getStorageKey(collectionName) {
    const key = STORAGE_KEYS[collectionName.toUpperCase()];
    if (!key) {
      return `iq_v4_${collectionName}`;
    }
    return key;
  }

  getCollection(name, defaultData = []) {
    this.checkAndMigrate();
    const key = this.getStorageKey(name);
    const data = safeGet(key, null);
    if (data === null || !Array.isArray(data)) {
      return defaultData;
    }
    return data;
  }

  setCollection(name, data) {
    this.checkAndMigrate();
    const key = this.getStorageKey(name);
    return safeSet(key, Array.isArray(data) ? data : []);
  }

  getItemById(name, id) {
    const items = this.getCollection(name);
    return items.find(item => String(item.id) === String(id)) || null;
  }

  insertItem(name, item) {
    const items = this.getCollection(name);
    const updated = [item, ...items];
    this.setCollection(name, updated);
    return item;
  }

  updateItem(name, id, updates) {
    const items = this.getCollection(name);
    let matched = false;
    const updated = items.map(item => {
      if (String(item.id) === String(id)) {
        matched = true;
        return { ...item, ...updates, id: item.id };
      }
      return item;
    });

    if (matched) {
      this.setCollection(name, updated);
      return this.getItemById(name, id);
    }
    return null;
  }

  removeItem(name, id) {
    const items = this.getCollection(name);
    const filtered = items.filter(item => String(item.id) !== String(id));
    this.setCollection(name, filtered);
    return filtered.length !== items.length;
  }

  clearCollection(name) {
    const key = this.getStorageKey(name);
    safeSet(key, []);
  }

  resetAll(seedData = {}) {
    const keysToReset = [
      'PRODUCTS', 'CATEGORIES', 'SALES', 'PURCHASES', 
      'CUSTOMERS', 'SUPPLIERS', 'PAYMENTS', 'STOCK_MOVEMENTS', 'AUDIT_LOGS'
    ];

    keysToReset.forEach(col => {
      const key = STORAGE_KEYS[col];
      const initial = seedData[col.toLowerCase()] || seedData[col] || [];
      safeSet(key, initial);
    });

    // Also remove legacy keys to prevent lingering stale data
    Object.values(LEGACY_V3_KEYS).forEach(k => {
      if (k !== 'iq_v3_users' && k !== 'iq_v3_session') {
        safeRemove(k);
      }
    });

    return true;
  }

  exportAllData() {
    this.checkAndMigrate();
    const exportBundle = {
      _meta: {
        appName: 'InventoryIQ',
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        clientStorage: true
      },
      products: this.getCollection('PRODUCTS'),
      categories: this.getCollection('CATEGORIES'),
      sales: this.getCollection('SALES'),
      purchases: this.getCollection('PURCHASES'),
      customers: this.getCollection('CUSTOMERS'),
      suppliers: this.getCollection('SUPPLIERS'),
      payments: this.getCollection('PAYMENTS'),
      stockMovements: this.getCollection('STOCK_MOVEMENTS'),
      auditLogs: this.getCollection('AUDIT_LOGS'),
      settings: safeGet(STORAGE_KEYS.SETTINGS, {})
    };

    return exportBundle;
  }

  importAllData(bundle, options = { merge: false, backup: true }) {
    if (!bundle || typeof bundle !== 'object') {
      throw new Error('Invalid backup file. Must be a JSON object.');
    }

    if (options.backup) {
      // Create backup before overriding
      const current = this.exportAllData();
      safeSet('iq_v4_pre_import_backup', current);
    }

    const collections = [
      'products', 'categories', 'sales', 'purchases', 
      'customers', 'suppliers', 'payments', 'stockMovements', 'auditLogs'
    ];

    collections.forEach(col => {
      const incoming = bundle[col];
      if (Array.isArray(incoming)) {
        if (options.merge) {
          const existing = this.getCollection(col);
          const existingIds = new Set(existing.map(i => String(i.id)));
          const newItems = incoming.filter(i => !existingIds.has(String(i.id)));
          this.setCollection(col, [...existing, ...newItems]);
        } else {
          this.setCollection(col, incoming);
        }
      }
    });

    if (bundle.settings && typeof bundle.settings === 'object') {
      safeSet(STORAGE_KEYS.SETTINGS, bundle.settings);
    }

    return true;
  }
}

export const storageService = new StorageService();
