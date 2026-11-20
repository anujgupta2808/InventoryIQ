import { describe, it, expect, beforeEach } from 'vitest';
import {
  roundTo,
  toPaise,
  fromPaise,
  calculateItemTotal,
  calculateSaleTotals,
  calculatePurchaseTotals,
  calculateGrossProfit,
  calculateCustomerBalances
} from '../../../src/utils/calculations';
import { validateSale, validatePayment } from '../../../src/utils/validators';
import { storageService } from '../../../src/services/storageService';
import { salesService } from '../../../src/services/salesService';
import { paymentService } from '../../../src/services/paymentService';
import { customerService } from '../../../src/services/customerService';
import { analyticsService } from '../../../src/services/analyticsService';
import { MOCK_PRODUCTS, MOCK_CUSTOMERS } from '../../fixtures/mockData';

describe('InventoryIQ — Complete Financial & Billing Engine Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    paymentService.processedKeys.clear();
    storageService.setCollection('PRODUCTS', JSON.parse(JSON.stringify(MOCK_PRODUCTS)));
    storageService.setCollection('SALES', []);
    storageService.setCollection('PURCHASES', []);
    storageService.setCollection('CUSTOMERS', JSON.parse(JSON.stringify(MOCK_CUSTOMERS)));
    storageService.setCollection('SUPPLIERS', []);
    storageService.setCollection('PAYMENTS', []);
  });

  // --------------------------------------------------------------------------
  // TASK 1: GST AUDIT & PRECISION
  // --------------------------------------------------------------------------
  describe('Task 1: GST Calculation Engine (Standard, Product-Specific, Mixed & Rounding)', () => {
    it('1. Calculates 0% GST (Tax Exempt)', () => {
      const items = [{ price: 1000, qty: 1, gstRate: 0 }];
      const res = calculateSaleTotals(items, 0, 0);
      expect(res.subtotal).toBe(1000);
      expect(res.taxableAmount).toBe(1000);
      expect(res.tax).toBe(0);
      expect(res.amount).toBe(1000);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });

    it('2. Calculates 5% GST', () => {
      const items = [{ price: 1000, qty: 2, gstRate: 5 }];
      const res = calculateSaleTotals(items, 0, 5);
      expect(res.subtotal).toBe(2000);
      expect(res.tax).toBe(100);
      expect(res.amount).toBe(2100);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });

    it('3. Calculates 12% GST', () => {
      const items = [{ price: 500, qty: 2, gstRate: 12 }];
      const res = calculateSaleTotals(items, 0, 12);
      expect(res.subtotal).toBe(1000);
      expect(res.tax).toBe(120);
      expect(res.amount).toBe(1120);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });

    it('4. Calculates 18% GST', () => {
      const items = [{ price: 1500, qty: 1, gstRate: 18 }];
      const res = calculateSaleTotals(items, 0, 18);
      expect(res.subtotal).toBe(1500);
      expect(res.tax).toBe(270);
      expect(res.amount).toBe(1770);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });

    it('5. Calculates 28% GST', () => {
      const items = [{ price: 2000, qty: 1, gstRate: 28 }];
      const res = calculateSaleTotals(items, 0, 28);
      expect(res.subtotal).toBe(2000);
      expect(res.tax).toBe(560);
      expect(res.amount).toBe(2560);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });

    it('6. Mixed GST Rates on multi-product invoice', () => {
      const items = [
        { price: 1000, qty: 1, gstRate: 0 },   // Tax: 0
        { price: 500, qty: 2, gstRate: 5 },    // Tax: 50
        { price: 400, qty: 1, gstRate: 12 },   // Tax: 48
        { price: 1000, qty: 1, gstRate: 18 },  // Tax: 180
        { price: 500, qty: 1, gstRate: 28 }    // Tax: 140
      ];
      // Subtotal = 1000 + 1000 + 400 + 1000 + 500 = 3900
      // Total Tax = 0 + 50 + 48 + 180 + 140 = 418
      // Grand Total = 3900 + 418 = 4318
      const res = calculateSaleTotals(items, 0, 0);
      expect(res.subtotal).toBe(3900);
      expect(res.taxableAmount).toBe(3900);
      expect(res.tax).toBe(418);
      expect(res.amount).toBe(4318);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });

    it('7. Intra-state transaction splits GST into CGST (50%) + SGST (50%)', () => {
      const items = [{ price: 1000, qty: 1, gstRate: 18 }];
      const res = calculateSaleTotals(items, 0, 18, { isInterState: false });
      expect(res.tax).toBe(180);
      expect(res.cgst).toBe(90);
      expect(res.sgst).toBe(90);
      expect(res.igst).toBe(0);
      expect(res.cgst + res.sgst).toBe(res.tax);
    });

    it('8. Inter-state transaction applies 100% IGST with zero CGST/SGST', () => {
      const items = [{ price: 1000, qty: 1, gstRate: 18 }];
      const res = calculateSaleTotals(items, 0, 18, { isInterState: true });
      expect(res.tax).toBe(180);
      expect(res.cgst).toBe(0);
      expect(res.sgst).toBe(0);
      expect(res.igst).toBe(180);
    });

    it('9. Precise tax rounding on fractional paise line items', () => {
      // 1 item @ ₹33.33 with 18% GST -> subtotal 33.33, tax = 6.00, total = 39.33
      const items = [{ price: 33.33, qty: 1, gstRate: 18 }];
      const res = calculateSaleTotals(items, 0, 18);
      expect(res.subtotal).toBe(33.33);
      expect(res.tax).toBe(6);
      expect(res.amount).toBe(39.33);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });
  });

  // --------------------------------------------------------------------------
  // TASK 2: DISCOUNTS & GST INTERACTION
  // --------------------------------------------------------------------------
  describe('Task 2: Discount Engine (Line, Invoice, Percentage, Fixed & Edge Cases)', () => {
    it('10. Calculates percentage invoice discount and reduces taxable GST base', () => {
      // Subtotal = 1000, 10% discount = 100. Taxable = 900. 18% GST on 900 = 162. Total = 1062.
      const items = [{ price: 1000, qty: 1, gstRate: 18 }];
      const res = calculateSaleTotals(items, 10, 18, { discountType: 'percentage' });
      expect(res.subtotal).toBe(1000);
      expect(res.discount).toBe(100);
      expect(res.taxableAmount).toBe(900);
      expect(res.tax).toBe(162);
      expect(res.amount).toBe(1062);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });

    it('11. Calculates fixed invoice discount and apportions across items', () => {
      // Subtotal = 2000, discount = 500 -> Taxable = 1500. 10% GST on 1500 = 150. Total = 1650.
      const items = [{ price: 1000, qty: 2, gstRate: 10 }];
      const res = calculateSaleTotals(items, 500, 10, { discountType: 'fixed' });
      expect(res.subtotal).toBe(2000);
      expect(res.discount).toBe(500);
      expect(res.taxableAmount).toBe(1500);
      expect(res.tax).toBe(150);
      expect(res.amount).toBe(1650);
      expect(res.taxableAmount + res.tax).toBe(res.amount);
    });

    it('12. Computes product-level line discounts before tax', () => {
      // Line: price 100, qty 2 = 200. 20% line disc = 40. Taxable = 160. 18% GST = 28.80 -> 29.
      const res = calculateItemTotal(100, 2, 18, 20);
      expect(res.rawSubtotal).toBe(200);
      expect(res.discountAmount).toBe(40);
      expect(res.taxableAmount).toBe(160);
      expect(res.gstAmount).toBe(28.8);
      expect(res.total).toBe(188.8);
    });

    it('13. Discount equal to subtotal produces 0 taxable amount, 0 GST, and 0 invoice total', () => {
      const items = [{ price: 500, qty: 2, gstRate: 18 }];
      const res = calculateSaleTotals(items, 1000, 18, { discountType: 'fixed' });
      expect(res.subtotal).toBe(1000);
      expect(res.discount).toBe(1000);
      expect(res.taxableAmount).toBe(0);
      expect(res.tax).toBe(0);
      expect(res.amount).toBe(0);
    });

    it('14. Discount greater than subtotal is rejected by validators', () => {
      const sale = {
        customerName: 'Test Buyer',
        items: [{ productId: 1, name: 'Item', qty: 1, price: 100 }],
        subtotal: 100,
        discount: 150,
        amount: 0,
        paidAmount: 0
      };
      const validation = validateSale(sale, MOCK_PRODUCTS);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('greater than subtotal'))).toBe(true);
    });

    it('15. Negative discount, NaN and Infinity are strictly rejected', () => {
      const saleNegative = {
        customerName: 'Test Buyer',
        items: [{ productId: 1, name: 'Item', qty: 1, price: 100 }],
        subtotal: 100,
        discount: -25
      };
      expect(validateSale(saleNegative, MOCK_PRODUCTS).isValid).toBe(false);

      const saleNaN = {
        customerName: 'Test Buyer',
        items: [{ productId: 1, name: 'Item', qty: 1, price: 100 }],
        subtotal: 100,
        discount: NaN
      };
      expect(validateSale(saleNaN, MOCK_PRODUCTS).isValid).toBe(false);

      const saleInf = {
        customerName: 'Test Buyer',
        items: [{ productId: 1, name: 'Item', qty: 1, price: 100 }],
        subtotal: 100,
        discount: Infinity
      };
      expect(validateSale(saleInf, MOCK_PRODUCTS).isValid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TASK 3: SALES VALIDATION & DEFENSIVE CHECKS
  // --------------------------------------------------------------------------
  describe('Task 3: Strict Sales Validation', () => {
    it('16. Rejects quantity = 0, negative quantity, NaN, and Infinity', () => {
      expect(validateSale({ items: [{ productId: 1, qty: 0, price: 100 }] }, MOCK_PRODUCTS).isValid).toBe(false);
      expect(validateSale({ items: [{ productId: 1, qty: -2, price: 100 }] }, MOCK_PRODUCTS).isValid).toBe(false);
      expect(validateSale({ items: [{ productId: 1, qty: NaN, price: 100 }] }, MOCK_PRODUCTS).isValid).toBe(false);
      expect(validateSale({ items: [{ productId: 1, qty: Infinity, price: 100 }] }, MOCK_PRODUCTS).isValid).toBe(false);
    });

    it('17. Rejects negative price, NaN price, and Infinity price', () => {
      expect(validateSale({ items: [{ productId: 1, qty: 1, price: -50 }] }, MOCK_PRODUCTS).isValid).toBe(false);
      expect(validateSale({ items: [{ productId: 1, qty: 1, price: NaN }] }, MOCK_PRODUCTS).isValid).toBe(false);
      expect(validateSale({ items: [{ productId: 1, qty: 1, price: Infinity }] }, MOCK_PRODUCTS).isValid).toBe(false);
    });

    it('18. Rejects missing products or unlisted product IDs in catalog', () => {
      const sale = {
        customerName: 'Test Buyer',
        items: [{ productId: 999999, name: 'Phantom Item', qty: 1, price: 100 }]
      };
      const res = validateSale(sale, MOCK_PRODUCTS);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('does not exist in product catalog'))).toBe(true);
    });

    it('19. Rejects insufficient stock', () => {
      // MOCK_PRODUCTS[0] has stock = 25
      const sale = {
        customerName: 'Test Buyer',
        items: [{ productId: 1, name: 'Item', qty: 100, price: 100 }]
      };
      const res = validateSale(sale, MOCK_PRODUCTS);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('exceeds available inventory'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TASK 4: PAYMENT ENGINE & RECONCILIATION
  // --------------------------------------------------------------------------
  describe('Task 4: Payment Engine (Full, Partial, Overpayment, Idempotency & Refunds)', () => {
    it('20. Full payment clears invoice due balance to 0 and marks status "Paid"', () => {
      const saleRes = salesService.createSale({
        customerName: 'Rohan Sharma',
        items: [{ productId: 1, price: 1200, gstRate: 12, qty: 1 }], // price 1200, 12% GST = 144 -> 1344
        paidAmount: 1344,
        paymentMethod: 'UPI'
      });
      expect(saleRes.success).toBe(true);
      expect(saleRes.sale.amount).toBe(1344);
      expect(saleRes.sale.paidAmount).toBe(1344);
      expect(saleRes.sale.dueAmount).toBe(0);
      expect(saleRes.sale.status).toBe('Paid');
    });

    it('21. Partial payment tracks exact dueAmount and marks status "Partial"', () => {
      const saleRes = salesService.createSale({
        customerName: 'Pooja Verma',
        items: [{ productId: 1, price: 1200, gstRate: 12, qty: 1 }],
        paidAmount: 500,
        paymentMethod: 'Cash'
      });
      expect(saleRes.success).toBe(true);
      expect(saleRes.sale.paidAmount).toBe(500);
      expect(saleRes.sale.dueAmount).toBe(844);
      expect(saleRes.sale.status).toBe('Partial');
    });

    it('22. Subsequent payment collection reduces due balance and updates ledger', () => {
      const saleRes = salesService.createSale({
        customerId: 1,
        customerName: 'Rajesh Kumar',
        items: [{ productId: 1, price: 1200, gstRate: 12, qty: 1 }],
        paidAmount: 500
      });
      const saleId = saleRes.sale.id;

      // Collect second installment of ₹500
      const payRes = paymentService.recordPayment({
        saleId,
        customerId: 1,
        customerName: 'Rajesh Kumar',
        amount: 500,
        paymentMethod: 'UPI'
      });
      expect(payRes.success).toBe(true);

      const updatedSale = salesService.getById(saleId);
      expect(updatedSale.paidAmount).toBe(1000);
      expect(updatedSale.dueAmount).toBe(344);
      expect(updatedSale.status).toBe('Partial');
      expect(updatedSale.paymentHistory).toHaveLength(2);
    });

    it('23. Enforces payment idempotency using unique idempotencyKey', () => {
      const key = 'idem_req_12345';
      const saleRes = salesService.createSale({
        customerId: 1,
        customerName: 'Rajesh Kumar',
        items: [{ productId: 1, qty: 1 }],
        paidAmount: 0
      });
      const saleId = saleRes.sale.id;

      const firstCall = paymentService.recordPayment({
        saleId,
        amount: 300,
        paymentMethod: 'UPI',
        idempotencyKey: key
      });
      expect(firstCall.success).toBe(true);

      // Repeat request with exact same idempotencyKey
      const secondCall = paymentService.recordPayment({
        saleId,
        amount: 300,
        paymentMethod: 'UPI',
        idempotencyKey: key
      });
      expect(secondCall.success).toBe(true);
      expect(secondCall.idempotentReplay).toBe(true);

      // Verify payment was recorded once only
      const updatedSale = salesService.getById(saleId);
      expect(updatedSale.paidAmount).toBe(300);
    });

    it('24. Handles overpayment gracefully by capping at due amount or crediting ledger', () => {
      const saleRes = salesService.createSale({
        customerId: 1,
        customerName: 'Rajesh Kumar',
        items: [{ productId: 1, price: 1200, gstRate: 12, qty: 1 }],
        paidAmount: 1000
      });
      const saleId = saleRes.sale.id;
      const remainingDue = saleRes.sale.dueAmount; // 344

      // Attempt payment of ₹500 against remaining due of 344
      const payRes = paymentService.recordPayment({
        saleId,
        customerId: 1,
        amount: 500
      });
      expect(payRes.success).toBe(true);

      const updatedSale = salesService.getById(saleId);
      expect(updatedSale.paidAmount).toBe(saleRes.sale.amount);
      expect(updatedSale.dueAmount).toBe(0);
      expect(updatedSale.status).toBe('Paid');
    });

    it('25. Partial refund correctly reduces paidAmount and restores dueAmount', () => {
      const saleRes = salesService.createSale({
        customerId: 1,
        customerName: 'Rajesh Kumar',
        items: [{ productId: 1, price: 1200, gstRate: 12, qty: 1 }],
        paidAmount: 1344
      });
      const saleId = saleRes.sale.id;

      const refundRes = paymentService.refundPayment({
        saleId,
        amount: 400,
        reason: 'Customer returned damaged accessory'
      });
      expect(refundRes.success).toBe(true);

      const updatedSale = salesService.getById(saleId);
      expect(updatedSale.paidAmount).toBe(944);
      expect(updatedSale.dueAmount).toBe(400);
      expect(updatedSale.status).toBe('Partial');
    });

    it('26. Full refund restores full dueAmount and marks status "Unpaid"', () => {
      const saleRes = salesService.createSale({
        customerId: 1,
        customerName: 'Rajesh Kumar',
        items: [{ productId: 1, price: 1200, gstRate: 12, qty: 1 }],
        paidAmount: 1344
      });
      const saleId = saleRes.sale.id;

      const refundRes = paymentService.refundPayment({
        saleId,
        amount: 1344,
        reason: 'Full order refund'
      });
      expect(refundRes.success).toBe(true);

      const updatedSale = salesService.getById(saleId);
      expect(updatedSale.paidAmount).toBe(0);
      expect(updatedSale.dueAmount).toBe(1344);
      expect(updatedSale.status).toBe('Unpaid');
    });

    it('27. Rejects refund exceeding current paid amount', () => {
      const saleRes = salesService.createSale({
        items: [{ productId: 1, qty: 1 }],
        paidAmount: 500
      });
      const refundRes = paymentService.refundPayment({
        saleId: saleRes.sale.id,
        amount: 800
      });
      expect(refundRes.success).toBe(false);
      expect(refundRes.message).toMatch(/cannot exceed total paid amount/i);
    });
  });

  // --------------------------------------------------------------------------
  // TASK 5: INVOICE CANCELLATION & PROFIT/ANALYTICS EXCLUSION
  // --------------------------------------------------------------------------
  describe('Task 5 & 6: Invoice Cancellation, Stock Restoral & Analytics Exclusion', () => {
    it('28. Cancelling an invoice restores inventory stock and reconciles customer ledger', () => {
      const initialStock = storageService.getItemById('PRODUCTS', 1).stock; // 25
      const saleRes = salesService.createSale({
        customerId: 1,
        customerName: 'Rajesh Kumar',
        items: [{ productId: 1, qty: 5 }], // Stock decreases to 20
        paidAmount: 500
      });
      expect(saleRes.success).toBe(true);
      expect(storageService.getItemById('PRODUCTS', 1).stock).toBe(20);

      const cancelRes = salesService.cancelSale(saleRes.sale.id, 'Customer cancellation request');
      expect(cancelRes.success).toBe(true);

      // Stock is restored
      expect(storageService.getItemById('PRODUCTS', 1).stock).toBe(initialStock);

      // Sale status is cancelled
      const cancelledSale = salesService.getById(saleRes.sale.id);
      expect(cancelledSale.status).toBe('Cancelled');
    });

    it('29. Cancelled sales are completely excluded from gross revenue, COGS, and profit analytics', () => {
      // 1. Create completed sale
      salesService.createSale({
        items: [{ productId: 1, price: 1200, cost: 750, gstRate: 12, qty: 1 }], // Price: 1200, Cost: 750
        paidAmount: 1344
      });

      // 2. Create sale that gets cancelled
      const saleToCancel = salesService.createSale({
        items: [{ productId: 2, price: 450, cost: 280, gstRate: 0, qty: 2 }], // Price: 450 each, Cost: 280 each
        paidAmount: 900
      });
      salesService.cancelSale(saleToCancel.sale.id);

      const kpis = analyticsService.getKPIs();
      // Total sales must include only the 1 active sale (1344), not the cancelled one
      expect(kpis.totalSales).toBe(1344);
      expect(kpis.totalReceived).toBe(1344);

      // Gross profit must exclude cancelled sale
      const profitReport = calculateGrossProfit(storageService.getCollection('SALES'), []);
      expect(profitReport.revenue).toBe(1344);
      expect(profitReport.cogs).toBe(400); // only productId 1's cost basis (400)
      expect(profitReport.profit).toBe(1344 - 400);
    });

    it('30. Customer ledger excludes cancelled sales from current due and billed balances', () => {
      const saleRes = salesService.createSale({
        customerId: 1,
        customerName: 'Rajesh Kumar',
        items: [{ productId: 1, qty: 2 }],
        paidAmount: 0
      });
      salesService.cancelSale(saleRes.sale.id);

      const ledger = customerService.getCustomerLedger(1);
      // Cancelled sale is filtered from ledger sales list
      expect(ledger.sales).toHaveLength(0);
      expect(ledger.balances.totalBilled).toBe(0);
      expect(ledger.balances.currentDue).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // TASK 7: PREVIEW VS SAVED INVOICE MATHEMATICAL IDENTITY
  // --------------------------------------------------------------------------
  describe('Task 7: Mathematical Identity (Preview vs Saved Invoice)', () => {
    it('31. Invoice preview and saved invoice generate 100% mathematically identical totals', () => {
      const lineItems = [
        { productId: 1, name: 'Prod 1', price: 1200, qty: 2, gstRate: 18, discount: 5 },
        { productId: 2, name: 'Prod 2', price: 450, qty: 3, gstRate: 12, discount: 0 }
      ];
      const overallDiscount = 100;
      const taxRate = 18;
      const options = { isInterState: false, discountType: 'fixed' };

      // 1. Preview calculation
      const preview = calculateSaleTotals(lineItems, overallDiscount, taxRate, options);

      // 2. Saved invoice creation via salesService
      const savedRes = salesService.createSale({
        customerName: 'Preview Test Customer',
        items: lineItems,
        discount: overallDiscount,
        taxRate,
        isInterState: options.isInterState,
        paidAmount: preview.amount
      });

      expect(savedRes.success).toBe(true);
      const saved = savedRes.sale;

      // Mathematical Identity Assertions
      expect(saved.subtotal).toBe(preview.subtotal);
      expect(saved.taxableAmount).toBe(preview.taxableAmount);
      expect(saved.tax).toBe(preview.tax);
      expect(saved.cgst).toBe(preview.cgst);
      expect(saved.sgst).toBe(preview.sgst);
      expect(saved.igst).toBe(preview.igst);
      expect(saved.discount).toBe(preview.discount);
      expect(saved.amount).toBe(preview.amount);
      expect(saved.paidAmount).toBe(preview.amount);
      expect(saved.dueAmount).toBe(0);
    });
  });
});
