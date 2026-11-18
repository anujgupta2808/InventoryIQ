import { describe, it, expect } from 'vitest';
import {
  roundTo,
  toPaise,
  fromPaise,
  calculateItemTotal,
  calculateSaleTotals,
  calculatePurchaseTotals,
  calculateStockValuation,
  calculateGrossProfit,
  calculateCustomerBalances,
  calculateSupplierBalances
} from '../../../src/utils/calculations';

describe('Financial and Inventory Calculations', () => {
  describe('Precision & Minor Unit Utilities', () => {
    it('roundTo accurately rounds floating point decimals', () => {
      expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
      expect(roundTo(10.555, 2)).toBe(10.56);
      expect(roundTo(10.554, 2)).toBe(10.55);
      expect(roundTo(NaN)).toBe(0);
    });

    it('toPaise & fromPaise converts Indian Rupee major/minor units without float drift', () => {
      expect(toPaise(10.50)).toBe(1050);
      expect(fromPaise(1050)).toBe(10.50);
      expect(toPaise(0)).toBe(0);
    });
  });

  describe('calculateItemTotal', () => {
    it('calculates line item without discount and tax', () => {
      const res = calculateItemTotal(100, 2, 0, 0);
      expect(res.rawSubtotal).toBe(200);
      expect(res.discountAmount).toBe(0);
      expect(res.taxableAmount).toBe(200);
      expect(res.gstAmount).toBe(0);
      expect(res.total).toBe(200);
    });

    it('calculates line item with percentage discount and 18% GST', () => {
      // 1000 * 2 = 2000. 10% disc = 200. Taxable = 1800. 18% GST = 324. Total = 2124.
      const res = calculateItemTotal(1000, 2, 18, 10);
      expect(res.rawSubtotal).toBe(2000);
      expect(res.discountAmount).toBe(200);
      expect(res.taxableAmount).toBe(1800);
      expect(res.gstAmount).toBe(324);
      expect(res.total).toBe(2124);
    });
  });

  describe('calculateSaleTotals', () => {
    it('aggregates multiple line items with tax and overall flat discount', () => {
      const items = [
        { price: 500, qty: 2, gstRate: 0, discount: 0 }, // 1000
        { price: 200, qty: 1, gstRate: 18, discount: 0 } // 200 + 36 GST
      ];
      // Subtotal = 1200. Overall discount = 100 -> Final Subtotal = 1100. GST = 36. Grand Total = 1136.
      const totals = calculateSaleTotals(items, 100, 0);
      expect(totals.subtotal).toBe(1200);
      expect(totals.discount).toBe(100);
      expect(totals.tax).toBe(36);
      expect(totals.amount).toBe(1136);
    });

    it('handles empty items array gracefully', () => {
      const totals = calculateSaleTotals([]);
      expect(totals.subtotal).toBe(0);
      expect(totals.amount).toBe(0);
    });
  });

  describe('calculatePurchaseTotals', () => {
    it('aggregates purchase items with GST', () => {
      const items = [
        { cost: 1000, qty: 3, gstRate: 18 } // Subtotal 3000, Tax 540
      ];
      const res = calculatePurchaseTotals(items);
      expect(res.subtotal).toBe(3000);
      expect(res.tax).toBe(540);
      expect(res.amount).toBe(3540);
    });
  });

  describe('calculateStockValuation', () => {
    it('accurately computes cost, retail valuations and low-stock alerts', () => {
      const products = [
        { name: 'P1', stock: 10, minStock: 5, costPrice: 50, price: 100 },
        { name: 'P2', stock: 2, minStock: 5, costPrice: 200, price: 300 }, // Low stock
        { name: 'P3', stock: 0, minStock: 5, costPrice: 10, price: 20 }     // Out of stock
      ];

      const val = calculateStockValuation(products);
      // Cost: (10*50) + (2*200) + (0*10) = 500 + 400 = 900
      expect(val.costValuation).toBe(900);
      // Retail: (10*100) + (2*300) = 1000 + 600 = 1600
      expect(val.sellingValuation).toBe(1600);
      expect(val.potentialProfit).toBe(700);
      expect(val.totalUnits).toBe(12);
      expect(val.lowStockCount).toBe(1);
      expect(val.outOfStockCount).toBe(1);
    });
  });

  describe('calculateCustomerBalances & calculateSupplierBalances', () => {
    it('computes party due tracker metrics correctly', () => {
      const sales = [
        { customerName: 'Rohan', amount: 1000, paidAmount: 400, dueAmount: 600 },
        { customerName: 'Rohan', amount: 500, paidAmount: 500, dueAmount: 0 },
        { customerName: 'Other', amount: 800, paidAmount: 0, dueAmount: 800 }
      ];

      const rohanBalance = calculateCustomerBalances(sales, 'Rohan');
      expect(rohanBalance.totalBilled).toBe(1500);
      expect(rohanBalance.totalReceived).toBe(900);
      expect(rohanBalance.totalDue).toBe(600);

      const allBalances = calculateCustomerBalances(sales);
      expect(allBalances.totalBilled).toBe(2300);
      expect(allBalances.totalReceived).toBe(900);
      expect(allBalances.totalDue).toBe(1400);
    });

    it('computes supplier accounts payable dues correctly', () => {
      const purchases = [
        { supplierName: 'Apex', amount: 5000, paidAmount: 2000, dueAmount: 3000 }
      ];
      const apex = calculateSupplierBalances(purchases, 'Apex');
      expect(apex.totalPurchased).toBe(5000);
      expect(apex.totalPaid).toBe(2000);
      expect(apex.totalDue).toBe(3000);
    });
  });
});
