/**
 * Import Service
 * Safely parses, validates, previews, and restores JSON backup snapshots.
 */

import { storageService, SCHEMA_VERSION } from './storageService.js';
import { safeJsonParse } from '../utils/storageUtils.js';

export class ImportService {
  validateFile(fileContent) {
    let data = typeof fileContent === 'string' ? safeJsonParse(fileContent) : fileContent;

    if (!data || typeof data !== 'object') {
      return { isValid: false, message: 'File is not a valid JSON document.' };
    }

    if (!data.products && !data.sales && !data.purchases) {
      return {
        isValid: false,
        message: 'JSON structure does not match an InventoryIQ backup archive.'
      };
    }

    const version = data._meta?.schemaVersion || 1;

    return {
      isValid: true,
      data,
      schemaVersion: version,
      isCompatible: version <= SCHEMA_VERSION
    };
  }

  generatePreview(data) {
    return {
      productsCount: Array.isArray(data.products) ? data.products.length : 0,
      categoriesCount: Array.isArray(data.categories) ? data.categories.length : 0,
      salesCount: Array.isArray(data.sales) ? data.sales.length : 0,
      purchasesCount: Array.isArray(data.purchases) ? data.purchases.length : 0,
      customersCount: Array.isArray(data.customers) ? data.customers.length : 0,
      suppliersCount: Array.isArray(data.suppliers) ? data.suppliers.length : 0,
      paymentsCount: Array.isArray(data.payments) ? data.payments.length : 0,
      exportedAt: data._meta?.exportedAt || 'Unknown'
    };
  }

  restoreBackup(data, options = { merge: false, backup: true }) {
    try {
      storageService.importAllData(data, options);
      return {
        success: true,
        summary: this.generatePreview(data)
      };
    } catch (e) {
      console.error('Import failed:', e);
      return {
        success: false,
        message: e.message || 'Import failed unexpectedly.'
      };
    }
  }
}

export const importService = new ImportService();
