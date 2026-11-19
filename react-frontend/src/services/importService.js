/**
 * Import Service
 * Safely parses, validates, previews, and restores JSON backup snapshots.
 * Enforces strict schema validation, duplicate detection, and sanitization.
 */

import { storageService, SCHEMA_VERSION } from './storageService.js';
import { safeJsonParse } from '../utils/storageUtils.js';

export class ImportService {
  validateFile(fileContent) {
    let data = typeof fileContent === 'string' ? safeJsonParse(fileContent) : fileContent;

    if (!data || typeof data !== 'object') {
      return { isValid: false, message: 'File is not a valid JSON document.' };
    }

    // Prototype pollution prevention (check own properties only)
    const hasOwn = Object.prototype.hasOwnProperty;
    if (hasOwn.call(data, '__proto__') || hasOwn.call(data, 'constructor') || hasOwn.call(data, 'prototype')) {
      return { isValid: false, message: 'Malicious payload detected: forbidden prototype properties.' };
    }

    if (!data.products && !data.sales && !data.purchases) {
      return {
        isValid: false,
        message: 'JSON structure does not match an InventoryIQ backup archive.'
      };
    }

    const version = data._meta?.schemaVersion || 1;

    // Strict schema & integrity validation
    const validationErrors = this.validateCollections(data);
    if (validationErrors.length > 0) {
      return {
        isValid: false,
        message: `Validation failed: ${validationErrors.slice(0, 3).join('; ')}`,
        errors: validationErrors
      };
    }

    return {
      isValid: true,
      data,
      schemaVersion: version,
      isCompatible: version <= SCHEMA_VERSION
    };
  }

  validateCollections(bundle) {
    const errors = [];

    // 1. Validate Products
    if (Array.isArray(bundle.products)) {
      const seenSkus = new Set();
      const seenIds = new Set();

      bundle.products.forEach((p, idx) => {
        if (!p || typeof p !== 'object') {
          errors.push(`Product #${idx + 1} is malformed`);
          return;
        }

        const name = String(p.name ?? '').trim();
        const rawSku = p.sku !== undefined && p.sku !== null ? String(p.sku).trim().toUpperCase() : '';

        if (rawSku) {
          if (seenSkus.has(rawSku)) {
            errors.push(`Duplicate SKU "${rawSku}" found in import payload`);
          } else {
            seenSkus.add(rawSku);
          }
        }

        if (p.id !== undefined && p.id !== null) {
          const idStr = String(p.id);
          if (seenIds.has(idStr)) {
            errors.push(`Duplicate product ID "${idStr}" in import`);
          } else {
            seenIds.add(idStr);
          }
        }

        if (p.stock !== undefined && (isNaN(Number(p.stock)) || !isFinite(Number(p.stock)) || Number(p.stock) < 0)) {
          errors.push(`Product "${name || rawSku || idx + 1}" has invalid or negative stock (${p.stock})`);
        }
        if (p.price !== undefined && (isNaN(Number(p.price)) || !isFinite(Number(p.price)) || Number(p.price) < 0)) {
          errors.push(`Product "${name || rawSku || idx + 1}" has invalid or negative price (${p.price})`);
        }
        if (p.costPrice !== undefined && (isNaN(Number(p.costPrice)) || !isFinite(Number(p.costPrice)) || Number(p.costPrice) < 0)) {
          errors.push(`Product "${name || rawSku || idx + 1}" has invalid or negative costPrice (${p.costPrice})`);
        }
      });
    }

    // 2. Validate Sales
    if (Array.isArray(bundle.sales)) {
      bundle.sales.forEach((s, idx) => {
        if (!s || typeof s !== 'object') {
          errors.push(`Sale #${idx + 1} is malformed`);
          return;
        }
        const amt = Number(s.amount);
        if (isNaN(amt) || !isFinite(amt) || amt < 0) {
          errors.push(`Sale #${s.id || idx + 1} has invalid or negative amount`);
        }
      });
    }

    // 3. Validate Purchases
    if (Array.isArray(bundle.purchases)) {
      bundle.purchases.forEach((p, idx) => {
        if (!p || typeof p !== 'object') {
          errors.push(`Purchase #${idx + 1} is malformed`);
          return;
        }
        const amt = Number(p.amount);
        if (isNaN(amt) || !isFinite(amt) || amt < 0) {
          errors.push(`Purchase #${p.id || idx + 1} has invalid or negative amount`);
        }
      });
    }

    return errors;
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
      const validation = this.validateFile(data);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

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
