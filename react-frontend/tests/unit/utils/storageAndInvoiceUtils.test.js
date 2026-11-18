import { describe, it, expect, beforeEach } from 'vitest';
import {
  isStorageAvailable,
  safeJsonParse,
  safeJsonStringify,
  safeGet,
  safeSet,
  safeRemove
} from '../../../src/utils/storageUtils';
import {
  generateInvoiceNumber,
  generatePurchaseNumber,
  generatePaymentId,
  generateSKU
} from '../../../src/utils/invoiceGenerator';

describe('Storage & Serial Number Generators', () => {
  describe('storageUtils', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('detects storage availability', () => {
      expect(isStorageAvailable('localStorage')).toBe(true);
    });

    it('safeJsonParse returns parsed object on valid JSON', () => {
      expect(safeJsonParse('{"name":"Product"}')).toEqual({ name: 'Product' });
    });

    it('safeJsonParse returns fallback on corrupted/invalid JSON', () => {
      expect(safeJsonParse('{invalid-json}', { fallback: true })).toEqual({ fallback: true });
      expect(safeJsonParse(null, [])).toEqual([]);
    });

    it('safeGet and safeSet safely stores and retrieves complex data', () => {
      const data = { id: 101, items: ['A', 'B'] };
      safeSet('test_key', data);
      const retrieved = safeGet('test_key');
      expect(retrieved).toEqual(data);
    });

    it('safeRemove deletes stored keys', () => {
      safeSet('to_delete', { value: 123 });
      expect(safeGet('to_delete')).toBeTruthy();
      safeRemove('to_delete');
      expect(safeGet('to_delete')).toBeNull();
    });
  });

  describe('invoiceGenerator', () => {
    it('generates sequential invoice numbers with S- prefix', () => {
      const existing = [
        { id: 'S-1001' },
        { id: 'S-1002' },
        { id: 'S-1005' }
      ];
      expect(generateInvoiceNumber('S', existing)).toBe('S-1006');
    });

    it('defaults to S-1001 when no existing sales exist', () => {
      expect(generateInvoiceNumber('S', [])).toBe('S-1001');
    });

    it('generates sequential purchase order numbers with PO- prefix', () => {
      const existing = [
        { id: 'PO-2001' },
        { id: 'PO-2003' }
      ];
      expect(generatePurchaseNumber('PO', existing)).toBe('PO-2004');
    });

    it('generates payment reference IDs starting with PAY-', () => {
      const payId = generatePaymentId();
      expect(payId).toMatch(/^PAY-\d+$/);
    });

    it('generates auto-incrementing SKUs based on category prefix', () => {
      const existing = [
        { sku: 'ELE-1001' },
        { sku: 'ELE-1002' }
      ];
      const nextSku = generateSKU('Electronics', existing);
      expect(nextSku).toBe('ELE-1003');
    });
  });
});
