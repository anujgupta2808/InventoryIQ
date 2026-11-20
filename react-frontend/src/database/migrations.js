/**
 * Database and Backup Migration Engine for InventoryIQ Local-First Architecture
 * Handles IndexedDB schema evolution and legacy localStorage-to-IndexedDB migration.
 */

import { STORES, ALL_STORES } from './schema.js';

export class MigrationEngine {
  /**
   * Migrate legacy localStorage collections into IndexedDB for a given shop
   * Executed once on initial startup if the shop's IndexedDB is fresh.
   */
  static async migrateFromLocalStorage(db, shopId) {
    if (!db || typeof window === 'undefined') return { migrated: false };

    try {
      // Check if products store already has data
      const count = await new Promise((resolve, reject) => {
        const tx = db.transaction([STORES.PRODUCTS], 'readonly');
        const store = tx.objectStore(STORES.PRODUCTS);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (count > 0) {
        // Already populated, skip migration
        return { migrated: false, count };
      }

      // Check legacy localStorage keys
      const legacyKeyMap = {
        [STORES.PRODUCTS]: ['iq_v4_products', 'iq_v3_products'],
        [STORES.CATEGORIES]: ['iq_v4_categories', 'iq_v3_categories'],
        [STORES.SALES]: ['iq_v4_sales', 'iq_v3_sales'],
        [STORES.PURCHASES]: ['iq_v4_purchases', 'iq_v3_purchases'],
        [STORES.CUSTOMERS]: ['iq_v4_customers', 'iq_v3_customers'],
        [STORES.SUPPLIERS]: ['iq_v4_suppliers', 'iq_v3_suppliers'],
        [STORES.PAYMENTS]: ['iq_v4_payments'],
        [STORES.STOCK_MOVEMENTS]: ['iq_v4_stockMovements'],
        [STORES.AUDIT_LOGS]: ['iq_v4_auditLogs', 'iq_v3_auditLogs']
      };

      const extractedData = {};
      let totalRecords = 0;

      for (const [storeName, keys] of Object.entries(legacyKeyMap)) {
        for (const key of keys) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                extractedData[storeName] = parsed;
                totalRecords += parsed.length;
                break;
              }
            } catch (err) {
              console.warn(`Could not parse legacy key ${key}:`, err);
            }
          }
        }
      }

      if (totalRecords === 0) {
        return { migrated: false, totalRecords: 0 };
      }

      // Write extracted records into IndexedDB transactionally
      const storesToOpen = Object.keys(extractedData);
      if (storesToOpen.length === 0) return { migrated: false };

      await new Promise((resolve, reject) => {
        const tx = db.transaction(storesToOpen, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Migration transaction aborted'));

        for (const [storeName, records] of Object.entries(extractedData)) {
          const store = tx.objectStore(storeName);
          for (const item of records) {
            if (item && item.id !== undefined && item.id !== null) {
              // Ensure id is string or preserved
              const cleanItem = { ...item, id: String(item.id) };
              store.put(cleanItem);
            }
          }
        }
      });

      console.info(`[InventoryIQ] Successfully migrated ${totalRecords} legacy records into IndexedDB for shop "${shopId}".`);
      return { migrated: true, totalRecords };
    } catch (err) {
      console.error('[InventoryIQ] Migration from localStorage failed:', err);
      return { migrated: false, error: err.message };
    }
  }

  /**
   * Migrate backup archive to current schema version
   */
  static migrateBackupPayload(backupPayload) {
    if (!backupPayload || typeof backupPayload !== 'object') {
      throw new Error('Invalid backup payload');
    }

    const version = String(backupPayload.version || '1.0');

    // If already version 2.0+, validate and return
    if (version.startsWith('2.')) {
      return backupPayload;
    }

    // Upgrade legacy backup payload to v2 standard
    const data = backupPayload.data || backupPayload.stores || backupPayload;
    const upgraded = {
      format: 'InventoryIQ Backup',
      version: '2.0',
      shopId: backupPayload.shopId || data._meta?.organizationId || data._meta?.shopId || 'default_shop',
      exportedAt: backupPayload.exportedAt || data._meta?.exportedAt || new Date().toISOString(),
      applicationVersion: '2.0.0',
      data: {
        products: Array.isArray(data.products) ? data.products : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
        sales: Array.isArray(data.sales) ? data.sales : [],
        saleItems: Array.isArray(data.saleItems) ? data.saleItems : [],
        purchases: Array.isArray(data.purchases) ? data.purchases : [],
        purchaseItems: Array.isArray(data.purchaseItems) ? data.purchaseItems : [],
        customers: Array.isArray(data.customers) ? data.customers : [],
        suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
        payments: Array.isArray(data.payments) ? data.payments : [],
        stockMovements: Array.isArray(data.stockMovements) ? data.stockMovements : [],
        auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : [],
        settings: Array.isArray(data.settings) ? data.settings : []
      }
    };

    return upgraded;
  }
}
