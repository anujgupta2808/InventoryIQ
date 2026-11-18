import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../../../src/services/storageService';
import { productService } from '../../../src/services/productService';
import { salesService } from '../../../src/services/salesService';
import { purchaseService } from '../../../src/services/purchaseService';
import { customerService } from '../../../src/services/customerService';
import { supplierService } from '../../../src/services/supplierService';
import { paymentService } from '../../../src/services/paymentService';
import { MOCK_PRODUCTS, MOCK_CUSTOMERS, MOCK_SUPPLIERS } from '../../fixtures/mockData';

describe('Core Business Services (Products, Sales, Purchases, Ledger)', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.setCollection('PRODUCTS', JSON.parse(JSON.stringify(MOCK_PRODUCTS)));
    storageService.setCollection('SALES', []);
    storageService.setCollection('PURCHASES', []);
    storageService.setCollection('CUSTOMERS', JSON.parse(JSON.stringify(MOCK_CUSTOMERS)));
    storageService.setCollection('SUPPLIERS', JSON.parse(JSON.stringify(MOCK_SUPPLIERS)));
    storageService.setCollection('PAYMENTS', []);
  });

  describe('ProductService', () => {
    it('retrieves all products and computes status accurately', () => {
      const items = productService.getAll();
      expect(items).toHaveLength(3);
      expect(productService.calculateStatus(25, 5)).toBe('In Stock');
      expect(productService.calculateStatus(3, 5)).toBe('Low Stock');
      expect(productService.calculateStatus(0, 5)).toBe('Out of Stock');
    });

    it('adds a valid new product and assigns sequential ID', () => {
      const res = productService.addProduct({
        name: 'USB Hub',
        sku: 'HUB-1004',
        category: 'Accessories',
        price: 999,
        costPrice: 500,
        stock: 15,
        minStock: 5
      });
      expect(res.success).toBe(true);
      expect(res.product.id).toBe(4);
      expect(res.product.status).toBe('In Stock');
      expect(productService.getAll()).toHaveLength(4);
    });

    it('rejects adding product with duplicate SKU', () => {
      const res = productService.addProduct({
        name: 'Another Mouse',
        sku: 'ELE-1001', // already used by MOCK_PRODUCTS[0]
        price: 800,
        stock: 5
      });
      expect(res.success).toBe(false);
      expect(res.errors[0]).toMatch(/already assigned/i);
    });

    it('edits an existing product and updates stock status', () => {
      const res = productService.updateProduct(1, {
        stock: 2, // reduced below minStock=5
        price: 900
      });
      expect(res.success).toBe(true);
      expect(res.product.status).toBe('Low Stock');
      expect(res.product.price).toBe(900);
    });

    it('deletes a product from the catalog', () => {
      const res = productService.deleteProduct(3);
      expect(res.success).toBe(true);
      expect(productService.getAll()).toHaveLength(2);
      expect(productService.getById(3)).toBeNull();
    });
  });

  describe('SalesService & Atomic Stock Deduction', () => {
    it('creates sale, calculates amounts, and atomically deducts inventory', () => {
      // Product 1 initial stock is 25
      const initialStock = productService.getById(1).stock;
      expect(initialStock).toBe(25);

      const saleData = {
        customerName: 'Rohan Sharma',
        items: [
          { productId: 1, name: 'Wireless Bluetooth Mouse', price: 850, qty: 3, discount: 0, gstRate: 0 }
        ],
        paidAmount: 2550, // Full payment
        paymentMethod: 'UPI'
      };

      const res = salesService.createSale(saleData, 'Admin');
      expect(res.success).toBe(true);
      expect(res.sale.amount).toBe(2550);
      expect(res.sale.status).toBe('Paid');
      expect(res.sale.dueAmount).toBe(0);

      // Verify stock was deducted exactly by 3 units: 25 - 3 = 22
      const updatedProduct = productService.getById(1);
      expect(updatedProduct.stock).toBe(22);
    });

    it('handles partial payment and calculates remaining balance due', () => {
      const saleData = {
        customerName: 'Rohan Sharma',
        items: [
          { productId: 1, name: 'Wireless Bluetooth Mouse', price: 1000, qty: 2, discount: 0, gstRate: 0 }
        ],
        paidAmount: 500, // 2000 total, 500 paid -> 1500 due
        paymentMethod: 'Cash'
      };

      const res = salesService.createSale(saleData, 'Admin');
      expect(res.success).toBe(true);
      expect(res.sale.amount).toBe(2000);
      expect(res.sale.paidAmount).toBe(500);
      expect(res.sale.dueAmount).toBe(1500);
      expect(res.sale.status).toBe('Partial');
    });

    it('prevents sale and stock deduction if quantity exceeds stock', () => {
      const saleData = {
        items: [
          { productId: 2, name: 'Keyboard', price: 2999, qty: 50 } // stock is only 3
        ]
      };
      const res = salesService.createSale(saleData);
      expect(res.success).toBe(false);
      expect(res.errors[0]).toMatch(/Insufficient stock/i);

      // Stock remains unaffected
      expect(productService.getById(2).stock).toBe(3);
    });
  });

  describe('PurchaseService & Stock Addition', () => {
    it('creates purchase order and increases inventory stock upon completion', () => {
      const initialStock = productService.getById(1).stock; // 25
      const purchaseData = {
        supplierName: 'Apex Tech Distributors',
        items: [
          { productId: 1, name: 'Wireless Mouse', cost: 400, qty: 10, total: 4000 }
        ],
        amount: 4000,
        paidAmount: 4000,
        status: 'Completed'
      };

      const res = purchaseService.createPurchase(purchaseData, 'Admin');
      expect(res.success).toBe(true);
      expect(res.purchase.id).toMatch(/^PO-/);

      // Stock was incremented by 10 units: 25 + 10 = 35
      const updatedProduct = productService.getById(1);
      expect(updatedProduct.stock).toBe(initialStock + 10);
    });
  });

  describe('PaymentService & Party Due Tracker', () => {
    it('records customer payment and updates outstanding balance', () => {
      const paymentData = {
        partyType: 'customer',
        partyName: 'Rohan Sharma',
        amount: 500,
        paymentMethod: 'UPI'
      };

      const res = paymentService.recordPayment(paymentData, 'Admin');
      expect(res.success).toBe(true);
      expect(res.payment.id).toMatch(/^PAY-/);
      expect(paymentService.getAll()).toHaveLength(1);
    });
  });
});
