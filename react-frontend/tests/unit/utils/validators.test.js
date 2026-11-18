import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidGSTIN,
  isValidSKU,
  isValidPassword,
  isNonNegativeNumber,
  isPositiveNumber,
  validateProduct,
  validateSale,
  validatePurchase,
  validateCustomer,
  validateSupplier,
  validatePayment
} from '../../../src/utils/validators';

describe('Input Validators & Business Integrity Rules', () => {
  describe('isValidEmail', () => {
    it('accepts valid email addresses', () => {
      expect(isValidEmail('admin@inventoryiq.com')).toBe(true);
      expect(isValidEmail('john.doe+retail@company.co.in')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail('missingatsign.com')).toBe(false);
      expect(isValidEmail('user@nodomain')).toBe(false);
      expect(isValidEmail('user @spaces.com')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('accepts valid 10-digit Indian and international phone numbers', () => {
      expect(isValidPhone('9876543210')).toBe(true);
      expect(isValidPhone('+91 98765 43210')).toBe(true);
      expect(isValidPhone('')).toBe(true); // Optional
    });

    it('rejects numbers with too few digits', () => {
      expect(isValidPhone('123')).toBe(false);
    });
  });

  describe('isValidGSTIN', () => {
    it('accepts standard 15-character Indian GSTIN formats', () => {
      expect(isValidGSTIN('07AAAAA0000A1Z5')).toBe(true);
      expect(isValidGSTIN('24BBBBB1111B2Z3')).toBe(true);
      expect(isValidGSTIN('')).toBe(true); // Optional
    });

    it('rejects invalid or malformed GSTINs', () => {
      expect(isValidGSTIN('INVALIDGST')).toBe(false);
      expect(isValidGSTIN('07AAAAA0000A1Z')).toBe(false); // 14 chars
      expect(isValidGSTIN('07AAAAA0000A1Z55')).toBe(false); // 16 chars
    });
  });

  describe('isValidSKU & isValidPassword', () => {
    it('validates SKU constraints', () => {
      expect(isValidSKU('SKU-1001')).toBe(true);
      expect(isValidSKU('A')).toBe(false); // too short
      expect(isValidSKU('')).toBe(false);
    });

    it('validates password length threshold', () => {
      expect(isValidPassword('password123')).toBe(true);
      expect(isValidPassword('short')).toBe(false);
    });
  });

  describe('Numeric range validators', () => {
    it('isNonNegativeNumber validates non-negative numbers', () => {
      expect(isNonNegativeNumber(0)).toBe(true);
      expect(isNonNegativeNumber(150.5)).toBe(true);
      expect(isNonNegativeNumber('200')).toBe(true);
      expect(isNonNegativeNumber(-1)).toBe(false);
      expect(isNonNegativeNumber('abc')).toBe(false);
      expect(isNonNegativeNumber(NaN)).toBe(false);
    });

    it('isPositiveNumber validates strictly positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-5)).toBe(false);
    });
  });

  describe('validateProduct', () => {
    const existing = [{ id: 1, name: 'Mouse', sku: 'ELE-101', stock: 10, price: 500 }];

    it('passes for a complete, valid product', () => {
      const res = validateProduct({ name: 'Keyboard', sku: 'ELE-102', stock: 20, price: 1500, costPrice: 900 }, existing);
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects product with missing name or SKU', () => {
      const res = validateProduct({ name: '', sku: '', stock: 5, price: 100 }, existing);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Product name is required.');
      expect(res.errors).toContain('SKU is required.');
    });

    it('rejects duplicate SKU assigned to another product', () => {
      const res = validateProduct({ id: 2, name: 'Wireless Mouse', sku: 'ELE-101', stock: 5, price: 600 }, existing);
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toMatch(/already assigned/i);
    });

    it('rejects negative stock and selling price', () => {
      const res = validateProduct({ name: 'Cable', sku: 'CAB-01', stock: -5, price: -50 }, existing);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Stock quantity must be a non-negative number.');
      expect(res.errors).toContain('Selling price must be a non-negative number.');
    });
  });

  describe('validateSale', () => {
    const products = [{ id: 10, name: 'Monitor', stock: 2, price: 8000 }];

    it('passes for valid sale with sufficient stock', () => {
      const res = validateSale({
        items: [{ productId: 10, name: 'Monitor', qty: 1, price: 8000 }],
        amount: 8000
      }, products);
      expect(res.isValid).toBe(true);
    });

    it('rejects sale with no line items', () => {
      const res = validateSale({ items: [], amount: 0 }, products);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Sale must contain at least one product line item.');
    });

    it('rejects sale when requested quantity exceeds available stock', () => {
      const res = validateSale({
        items: [{ productId: 10, name: 'Monitor', qty: 5, price: 8000 }],
        amount: 40000
      }, products);
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toMatch(/Insufficient stock/i);
    });
  });

  describe('validatePayment', () => {
    it('passes for valid payment within outstanding due', () => {
      const res = validatePayment({ amount: 500 }, 1000);
      expect(res.isValid).toBe(true);
    });

    it('rejects non-positive payment amounts', () => {
      expect(validatePayment({ amount: 0 }, 500).isValid).toBe(false);
      expect(validatePayment({ amount: -100 }, 500).isValid).toBe(false);
    });

    it('rejects payment amount exceeding customer/supplier due', () => {
      const res = validatePayment({ amount: 1500 }, 1000);
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toMatch(/exceeds outstanding due/i);
    });
  });

  describe('validateCustomer', () => {
    it('validates correct customer data', () => {
      const res = validateCustomer({ name: 'Alpha Traders', email: 'alpha@trade.com', gstin: '27AAAAA0000A1Z5' });
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('flags missing name or invalid email and GSTIN', () => {
      const res = validateCustomer({ name: '', email: 'notanemail', gstin: 'INVALID' });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Customer name is required.');
      expect(res.errors).toContain('Customer email format is invalid.');
      expect(res.errors).toContain('Customer GSTIN format is invalid.');
    });
  });

  describe('validateSupplier', () => {
    it('validates correct supplier data', () => {
      const res = validateSupplier({ name: 'Beta Suppliers', email: 'beta@supply.com', gstin: '27AAAAA0000A1Z5' });
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('flags missing name or invalid email and GSTIN', () => {
      const res = validateSupplier({ name: '', email: 'notanemail', gstin: 'INVALID' });
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('Supplier name is required.');
      expect(res.errors).toContain('Supplier email format is invalid.');
      expect(res.errors).toContain('Supplier GSTIN format is invalid.');
    });
  });
});
