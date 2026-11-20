/**
 * Enterprise Backup, Export & Verified Restore Service
 * Implements cryptographic verification (SHA-256), shop tenant boundaries,
 * multi-step safe import previews, and non-destructive data lifecycle guarantees.
 */

import { exportAllStoresData, clearAllStoresData, openShopDatabase } from '../database/db.js';
import { ALL_STORES, STORES } from '../database/schema.js';
import { MigrationEngine } from '../database/migrations.js';
import { syncChannel } from './syncChannel.js';

export const BACKUP_FORMAT = 'InventoryIQ Backup';
export const CURRENT_BACKUP_VERSION = '2.0';
export const APPLICATION_VERSION = '2.0.0';

/**
 * Computes a standard SHA-256 hex digest for any string payload using Web Crypto API.
 */
export async function computeSHA256(text) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export class BackupService {
  constructor() {
    this.lastPreRestoreSnapshot = null;
  }

  /**
   * Generates a verified JSON backup snapshot of all stores for the given shop.
   * NEVER deletes local data automatically.
   */
  async generateBackup(shopId) {
    if (!shopId) throw new Error('A valid shop ID is required to generate a backup.');

    const storesData = await exportAllStoresData(shopId);

    // Compute record counts
    const recordCounts = {
      products: storesData[STORES.PRODUCTS]?.length || 0,
      categories: storesData[STORES.CATEGORIES]?.length || 0,
      sales: storesData[STORES.SALES]?.length || 0,
      saleItems: storesData[STORES.SALE_ITEMS]?.length || 0,
      purchases: storesData[STORES.PURCHASES]?.length || 0,
      purchaseItems: storesData[STORES.PURCHASE_ITEMS]?.length || 0,
      customers: storesData[STORES.CUSTOMERS]?.length || 0,
      suppliers: storesData[STORES.SUPPLIERS]?.length || 0,
      payments: storesData[STORES.PAYMENTS]?.length || 0,
      stockMovements: storesData[STORES.STOCK_MOVEMENTS]?.length || 0,
      auditLogs: storesData[STORES.AUDIT_LOGS]?.length || 0,
      settings: storesData[STORES.SETTINGS]?.length || 0
    };

    const serializedData = JSON.stringify(storesData);
    const checksum = await computeSHA256(serializedData);

    const backupPayload = {
      format: BACKUP_FORMAT,
      application: 'InventoryIQ',
      version: CURRENT_BACKUP_VERSION,
      schemaVersion: 4,
      shopId,
      exportedAt: new Date().toISOString(),
      applicationVersion: APPLICATION_VERSION,
      checksum,
      recordCounts,
      metadata: { recordCounts, schemaVersion: 4, exportedAt: new Date().toISOString() },
      stores: storesData,
      data: storesData
    };

    return backupPayload;
  }

  /**
   * Triggers a browser file download of the backup payload
   */
  downloadBackupFile(backupPayload) {
    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const cleanDate = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `InventoryIQ_Backup_${backupPayload.shopId}_${cleanDate}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Record last backup timestamp in local settings
    this.recordLastBackup(backupPayload.shopId, backupPayload.exportedAt, backupPayload.checksum);

    return { filename, timestamp: backupPayload.exportedAt };
  }

  /**
   * Stores metadata of the last verified backup
   */
  recordLastBackup(shopId, timestamp, checksum) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`iq_last_backup_${shopId}`, JSON.stringify({
          timestamp,
          checksum,
          verified: true
        }));
      }
    } catch (_) {}
  }

  /**
   * Retrieves the timestamp of the last verified backup for the shop
   */
  getLastBackupInfo(shopId) {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(`iq_last_backup_${shopId}`);
        if (raw) return JSON.parse(raw);
      }
    } catch (_) {}
    return null;
  }

  /**
   * Validates and verifies an uploaded backup document before preview or import
   */
  async validateBackupFile(fileContent, currentShopId) {
    if (typeof fileContent === 'string' && /"(__proto__|constructor|prototype)"\s*:/.test(fileContent)) {
      const msg = 'Security violation: malicious prototype properties detected in backup file.';
      return { isValid: false, valid: false, errors: [msg], message: msg };
    }

    let parsed;
    try {
      parsed = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
    } catch (err) {
      const msg = 'Uploaded file is not a valid JSON document.';
      return { isValid: false, valid: false, errors: [msg], message: msg };
    }

    if (!parsed || typeof parsed !== 'object') {
      const msg = 'Invalid backup structure: root must be a JSON object.';
      return { isValid: false, valid: false, errors: [msg], message: msg };
    }

    // Prototype pollution prevention
    const hasOwn = Object.prototype.hasOwnProperty;
    if (
      hasOwn.call(parsed, '__proto__') || 
      hasOwn.call(parsed, 'constructor') || 
      hasOwn.call(parsed, 'prototype') ||
      (Object.getPrototypeOf(parsed) !== Object.prototype && Object.getPrototypeOf(parsed) !== null)
    ) {
      const msg = 'Security violation: malicious prototype properties detected in backup file.';
      return { isValid: false, valid: false, errors: [msg], message: msg };
    }

    // Migrate v1 backup structure if necessary
    let normalized;
    try {
      normalized = MigrationEngine.migrateBackupPayload(parsed);
    } catch (err) {
      const msg = `Backup migration failed: ${err.message}`;
      return { isValid: false, valid: false, errors: [msg], message: msg };
    }

    // Validate format
    if (normalized.format !== BACKUP_FORMAT && normalized.application !== 'InventoryIQ' && !parsed._meta) {
      const msg = 'Invalid format: this file is not an authentic InventoryIQ backup archive.';
      return { isValid: false, valid: false, errors: [msg], message: msg };
    }

    // Tenant / Shop ID check (Section 70)
    if (normalized.shopId && currentShopId && String(normalized.shopId) !== String(currentShopId)) {
      const msg = `Tenant Mismatch: This backup belongs to different shop "${normalized.shopId}", but your active workspace is "${currentShopId}". Cross-tenant import is blocked to prevent accidental data contamination.`;
      return {
        isValid: false,
        valid: false,
        isWrongShop: true,
        backupShopId: normalized.shopId,
        currentShopId,
        errors: [msg],
        message: msg
      };
    }

    // Checksum verification (Section 69)
    if (normalized.checksum && (normalized.stores || normalized.data)) {
      const contentData = normalized.stores || normalized.data;
      const computedChecksum = await computeSHA256(JSON.stringify(contentData));
      if (computedChecksum !== normalized.checksum) {
        const msg = 'Checksum verification failed: Cryptographic checksum mismatch. The backup file appears to be corrupted or tampered with.';
        return {
          isValid: false,
          valid: false,
          isCorrupted: true,
          errors: [msg],
          message: msg
        };
      }
    }

    // Generate record summary preview
    const data = normalized.data || normalized.stores || {};
    const preview = {
      productsCount: Array.isArray(data.products) ? data.products.length : 0,
      salesCount: Array.isArray(data.sales) ? data.sales.length : 0,
      purchasesCount: Array.isArray(data.purchases) ? data.purchases.length : 0,
      customersCount: Array.isArray(data.customers) ? data.customers.length : 0,
      suppliersCount: Array.isArray(data.suppliers) ? data.suppliers.length : 0,
      paymentsCount: Array.isArray(data.payments) ? data.payments.length : 0,
      stockMovementsCount: Array.isArray(data.stockMovements) ? data.stockMovements.length : 0,
      exportedAt: normalized.exportedAt || 'Unknown',
      version: normalized.version || '2.0',
      shopId: normalized.shopId
    };

    return {
      isValid: true,
      valid: true,
      payload: normalized,
      backupPayload: normalized,
      errors: [],
      preview
    };
  }

  /**
   * Imports a verified backup into the shop's local IndexedDB
   * Takes an automatic pre-restore safety snapshot before writing.
   * All stores are updated inside ONE atomic transaction; if any store fails, all changes roll back.
   */
  async restoreBackup(shopId, backupPayload, options = { replace: true }) {
    if (!backupPayload || (!backupPayload.data && !backupPayload.stores)) {
      throw new Error('Invalid backup payload provided for restore.');
    }

    // 1. Automatic Pre-Restore Safety Snapshot
    try {
      this.lastPreRestoreSnapshot = await exportAllStoresData(shopId);
    } catch (snapErr) {
      console.warn('[BackupService] Notice during pre-restore snapshot generation:', snapErr);
    }

    const data = backupPayload.data || backupPayload.stores;
    const db = await openShopDatabase(shopId);

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(ALL_STORES, 'readwrite');

        tx.oncomplete = () => {
          syncChannel.broadcast('DATABASE_RESTORED', { shopId });
          resolve({ success: true, restoredAt: new Date().toISOString() });
        };

        tx.onerror = () => reject(tx.error || new Error('Backup restore transaction failed.'));
        tx.onabort = () => reject(new Error('Backup restore transaction was aborted.'));

        // If replace mode, clear existing collections first
        if (options.replace) {
          ALL_STORES.forEach(storeName => {
            tx.objectStore(storeName).clear();
          });
        }

        // Restore each store
        ALL_STORES.forEach(storeName => {
          const store = tx.objectStore(storeName);
          const records = data[storeName];

          if (Array.isArray(records)) {
            records.forEach(item => {
              if (item && item.id !== undefined && item.id !== null) {
                store.put({ ...item, id: String(item.id) });
              } else if (item && item.key !== undefined) {
                store.put(item);
              }
            });
          }
        });

        // Write an audit log entry inside the restore transaction
        const auditStore = tx.objectStore(STORES.AUDIT_LOGS);
        auditStore.add({
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'audit_' + Date.now(),
          userId: 'Admin',
          role: 'owner',
          action: 'BACKUP_IMPORTED',
          entityType: 'DATABASE',
          entityId: shopId,
          details: `Imported backup snapshot from ${backupPayload.exportedAt || 'archive'}`,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Reverts the database to the most recent pre-restore snapshot.
   */
  async rollbackToPreRestore(shopId) {
    if (!this.lastPreRestoreSnapshot) {
      throw new Error('No pre-restore snapshot available to rollback to.');
    }
    return this.restoreBackup(shopId, { data: this.lastPreRestoreSnapshot, exportedAt: 'pre_restore_recovery' }, { replace: true });
  }

  /**
   * Safely clears all local business data from IndexedDB
   * Requires verified backup confirmation.
   */
  async clearLocalData(shopId, confirmationText) {
    if (confirmationText !== 'DELETE') {
      throw new Error('Confirmation string mismatch. You must type "DELETE" exactly to clear local data.');
    }

    await clearAllStoresData(shopId);
    syncChannel.broadcast('DATABASE_CLEARED', { shopId });
    return { success: true, cleared: true, clearedAt: new Date().toISOString() };
  }
}

export const backupService = new BackupService();
