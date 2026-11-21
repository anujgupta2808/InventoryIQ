/**
 * Return & Reversal Inventory Rules Unit & Integration Test Suite
 *
 * Verifies all 14 required commercial return scenarios:
 * 1. Full customer return
 * 2. Partial customer return
 * 3. Decimal customer return
 * 4. Duplicate customer return
 * 5. Excess customer return
 * 6. Full supplier return
 * 7. Partial supplier return
 * 8. Decimal supplier return
 * 9. Duplicate supplier return
 * 10. Excess supplier return
 * 11. Return after cancellation
 * 12. Failed transaction rollback
 * 13. Stock verification after return
 * 14. Analytics verification after return
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../../../src/services/storageService.js';
import { returnService } from '../../../src/services/returnService.js';
import { salesService } from '../../../src/services/salesService.js';
import { purchaseService } from '../../../src/services/purchaseService.js';
import { productService } from '../../../src/services/productService.js';
import { inventoryService } from '../../../src/services/inventoryService.js';
import { analyticsService } from '../../../src/services/analyticsService.js';

describe('Return & Reversal Inventory Rules (Customer & Supplier Reverse Transactions)', () => {
  const testShopId = 'test_returns_shop';

  beforeEach(() => {
    storageService.clearMemoryCache();
    returnService.reset();

    // Seed test products
    // Product 1: Standard unit-based item
    // Product 2: Decimal/KG weight-based item (e.g. 10.5 KG test case)
    const initialProducts = [
      {
        id: 'PROD_001',
        name: 'Wireless Barcode Scanner',
        sku: 'WBS-1001',
        category: 'Electronics',
        price: 2500,
        costPrice: 1500,
        stock: 50,
        minStock: 10,
        status: 'In Stock',
        gstRate: 18,
        unit: 'Piece'
      },
      {
        id: 'PROD_002',
        name: 'Bulk Basmati Rice Grade A',
        sku: 'RICE-2002',
        category: 'Groceries',
        price: 120,
        costPrice: 80,
        stock: 100, // 100 KG
        minStock: 20,
        status: 'In Stock',
        gstRate: 5,
        unit: 'KG'
      }
    ];

    storageService.setCollection('PRODUCTS', initialProducts);
    storageService.setCollection('SALES', []);
    storageService.setCollection('PURCHASES', []);
    storageService.setCollection('STOCK_MOVEMENTS', []);
    storageService.setCollection('RETURNS', []);
    storageService.setCollection('PAYMENTS', []);
    storageService.setCollection('CUSTOMERS', []);
    storageService.setCollection('SUPPLIERS', []);
  });

  // ==========================================================================
  // Test 1: Full Customer Return
  // ==========================================================================
  it('1. processes a full customer return, restores 100% stock, updates invoice status to Returned, and creates credit note', () => {
    // Sell 4 units of PROD_001 (initial stock 50 -> 46)
    const saleRes = salesService.createSale({
      customerName: 'Anil Kumar',
      items: [{ productId: 'PROD_001', qty: 4, price: 2500, gstRate: 18 }],
      paidAmount: 11800,
      paymentMethod: 'UPI'
    });
    expect(saleRes.success).toBe(true);
    expect(productService.getById('PROD_001').stock).toBe(46);

    const saleId = saleRes.sale.id;

    // Process Full Return (all 4 units)
    const returnRes = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 4,
      reason: 'Customer cancelled project',
      user: 'Cashier_1'
    });

    expect(returnRes.success).toBe(true);
    expect(returnRes.creditNoteNumber).toMatch(/^CN-/);
    expect(returnRes.returnRecord).toBeDefined();

    // Verify tracked fields
    const record = returnRes.returnRecord;
    expect(record.originalTransactionId).toBe(saleId);
    expect(record.originalProductId).toBe('PROD_001');
    expect(record.originalQuantity).toBe(4);
    expect(record.previouslyReturnedQuantity).toBe(0);
    expect(record.currentReturnQuantity).toBe(4);
    expect(record.remainingReturnableQuantity).toBe(0);
    expect(record.returnReason).toBe('Customer cancelled project');
    expect(record.user).toBe('Cashier_1');
    expect(record.stockMovementId).toBeDefined();

    // Verify stock is restored to original 50
    const prodAfter = productService.getById('PROD_001');
    expect(prodAfter.stock).toBe(50);
    expect(prodAfter.status).toBe('In Stock');

    // Verify sale invoice status updated to 'Returned'
    const updatedSale = salesService.getById(saleId);
    expect(updatedSale.status).toBe('Returned');
    expect(updatedSale.items[0].returnedQty).toBe(4);

    // Verify traceable inventory movement
    const movements = inventoryService.getMovements('PROD_001');
    const returnMov = movements.find(m => m.type === 'CUSTOMER_RETURN');
    expect(returnMov).toBeDefined();
    expect(returnMov.quantity).toBe(4); // Positive stock addition
    expect(returnMov.previousStock).toBe(46);
    expect(returnMov.newStock).toBe(50);
    expect(returnMov.referenceId).toBe(saleId);
  });

  // ==========================================================================
  // Test 2: Partial Customer Return
  // ==========================================================================
  it('2. processes a partial customer return, updates remaining returnable quantity, and leaves sale active', () => {
    // Sell 10 units (stock 50 -> 40)
    const saleRes = salesService.createSale({
      customerName: 'Pooja Sharma',
      items: [{ productId: 'PROD_001', qty: 10, price: 2500, gstRate: 0 }],
      paidAmount: 25000,
      paymentMethod: 'Card'
    });
    const saleId = saleRes.sale.id;
    expect(productService.getById('PROD_001').stock).toBe(40);

    // First partial return: 3 units
    const ret1 = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 3,
      reason: 'Ordered too many',
      user: 'Supervisor'
    });

    expect(ret1.success).toBe(true);
    expect(ret1.returnRecord.previouslyReturnedQuantity).toBe(0);
    expect(ret1.returnRecord.currentReturnQuantity).toBe(3);
    expect(ret1.returnRecord.remainingReturnableQuantity).toBe(7);
    expect(productService.getById('PROD_001').stock).toBe(43); // 40 + 3

    // Second partial return: 2 more units
    const ret2 = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 2,
      reason: 'Slight cosmetic scuff',
      user: 'Supervisor'
    });

    expect(ret2.success).toBe(true);
    expect(ret2.returnRecord.previouslyReturnedQuantity).toBe(3);
    expect(ret2.returnRecord.currentReturnQuantity).toBe(2);
    expect(ret2.returnRecord.remainingReturnableQuantity).toBe(5); // 10 - 3 - 2 = 5
    expect(productService.getById('PROD_001').stock).toBe(45); // 43 + 2

    // Sale remains active since 5 units are still retained by customer
    const updatedSale = salesService.getById(saleId);
    expect(updatedSale.status).not.toBe('Returned');
    expect(updatedSale.items[0].returnedQty).toBe(5);
  });

  // ==========================================================================
  // Test 3: Decimal Customer Return (Exact specification from prompt)
  // ==========================================================================
  it('3. handles decimal customer returns accurately (Sale: 10.5 KG, Return: 2.5 KG, Remaining: 8 KG, Return: 2 KG -> Stock += 2 KG)', () => {
    // Initial stock of PROD_002 is 100 KG
    // Sell 10.5 KG -> Stock becomes 89.5 KG
    const saleRes = salesService.createSale({
      customerName: 'Catering Services Ltd',
      items: [{ productId: 'PROD_002', qty: 10.5, price: 120, gstRate: 5 }],
      paidAmount: 1323,
      paymentMethod: 'Cash'
    });
    expect(saleRes.success).toBe(true);
    const saleId = saleRes.sale.id;
    expect(productService.getById('PROD_002').stock).toBe(89.5);

    // First Return: 2.5 KG -> Stock increases from 89.5 to 92 KG
    const ret1 = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_002',
      quantity: 2.5,
      reason: 'Excess grain bag unopened'
    });
    expect(ret1.success).toBe(true);
    expect(ret1.returnRecord.originalQuantity).toBe(10.5);
    expect(ret1.returnRecord.previouslyReturnedQuantity).toBe(0);
    expect(ret1.returnRecord.currentReturnQuantity).toBe(2.5);
    expect(ret1.returnRecord.remainingReturnableQuantity).toBe(8); // 10.5 - 2.5 = 8 KG
    expect(productService.getById('PROD_002').stock).toBe(92);

    // Second Return: 2 KG -> Stock increases from 92 to 94 KG
    const ret2 = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_002',
      quantity: 2,
      reason: 'Client reduced menu count'
    });
    expect(ret2.success).toBe(true);
    expect(ret2.returnRecord.previouslyReturnedQuantity).toBe(2.5);
    expect(ret2.returnRecord.currentReturnQuantity).toBe(2);
    expect(ret2.returnRecord.remainingReturnableQuantity).toBe(6); // 8 - 2 = 6 KG
    expect(productService.getById('PROD_002').stock).toBe(94); // Stock += 2 KG
  });

  // ==========================================================================
  // Test 4: Duplicate Customer Return Protection
  // ==========================================================================
  it('4. prevents duplicate customer returns and duplicate rapid submissions', () => {
    const saleRes = salesService.createSale({
      customerName: 'Rapid Shopper',
      items: [{ productId: 'PROD_001', qty: 5, price: 2500 }],
      paidAmount: 12500
    });
    const saleId = saleRes.sale.id;

    // Idempotent submission 1
    const res1 = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 2,
      idempotencyKey: 'IDEMP_KEY_CUST_999'
    });
    expect(res1.success).toBe(true);

    // Idempotent submission 2 (replay)
    const res2 = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 2,
      idempotencyKey: 'IDEMP_KEY_CUST_999'
    });
    expect(res2.success).toBe(true);
    expect(res2.idempotentReplay).toBe(true);

    // Stock must not have been double incremented
    expect(productService.getById('PROD_001').stock).toBe(47); // 50 - 5 + 2 = 47

    // Return the remaining 3 units
    const res3 = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 3
    });
    expect(res3.success).toBe(true);

    // Attempt to return again when remaining is 0 (Duplicate return prevention)
    const duplicateReturnAttempt = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 1
    });
    expect(duplicateReturnAttempt.success).toBe(false);
    expect(duplicateReturnAttempt.message).toMatch(/already been returned. Duplicate return prohibited/i);
  });

  // ==========================================================================
  // Test 5: Excess Customer Return Prevention
  // ==========================================================================
  it('5. prevents returning more than the sold quantity or remaining returnable quantity', () => {
    const saleRes = salesService.createSale({
      customerName: 'Rohit Verma',
      items: [{ productId: 'PROD_001', qty: 3, price: 2500 }],
      paidAmount: 7500
    });
    const saleId = saleRes.sale.id;

    // Attempt to return 5 units when only 3 were sold
    const excessRes = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 5,
      reason: 'Want extra refund'
    });

    expect(excessRes.success).toBe(false);
    expect(excessRes.message).toMatch(/maximum remaining returnable quantity/i);

    // Return 2 units successfully
    const validRes = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 2
    });
    expect(validRes.success).toBe(true);

    // Attempt to return 2 more units when only 1 is remaining
    const excessSecond = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 2
    });
    expect(excessSecond.success).toBe(false);
    expect(excessSecond.message).toMatch(/maximum remaining returnable quantity for this item is 1/i);
  });

  // ==========================================================================
  // Test 6: Full Supplier Return
  // ==========================================================================
  it('6. processes a full supplier return, decreases inventory stock, and generates debit note', () => {
    // Initial stock is 50. Receive PO of 20 units -> stock becomes 70
    const poRes = purchaseService.createPurchase({
      supplierName: 'National Electronics Wholesaler',
      amount: 30000,
      status: 'Completed',
      items: [{ productId: 'PROD_001', qty: 20, cost: 1500, receivedQty: 20 }]
    });
    expect(poRes.success).toBe(true);
    const poId = poRes.purchase.id;
    expect(productService.getById('PROD_001').stock).toBe(70);

    // Return all 20 units to supplier -> stock decreases from 70 to 50
    const retRes = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_001',
      quantity: 20,
      reason: 'Batch failed quality inspection',
      user: 'Warehouse_Manager'
    });

    expect(retRes.success).toBe(true);
    expect(retRes.debitNoteNumber).toMatch(/^DN-/);
    expect(retRes.returnRecord).toBeDefined();

    // Verify tracked fields
    const record = retRes.returnRecord;
    expect(record.type).toBe('SUPPLIER_RETURN');
    expect(record.originalTransactionId).toBe(poId);
    expect(record.originalProductId).toBe('PROD_001');
    expect(record.originalQuantity).toBe(20);
    expect(record.previouslyReturnedQuantity).toBe(0);
    expect(record.currentReturnQuantity).toBe(20);
    expect(record.remainingReturnableQuantity).toBe(0);
    expect(record.returnReason).toBe('Batch failed quality inspection');
    expect(record.user).toBe('Warehouse_Manager');
    expect(record.stockMovementId).toBeDefined();

    // Verify stock decreased back to 50
    const prodAfter = productService.getById('PROD_001');
    expect(prodAfter.stock).toBe(50);

    // Verify PO status updated to 'Returned'
    const updatedPo = purchaseService.getById(poId);
    expect(updatedPo.status).toBe('Returned');

    // Verify traceable inventory movement
    const movements = inventoryService.getMovements('PROD_001');
    const suppMov = movements.find(m => m.type === 'SUPPLIER_RETURN');
    expect(suppMov).toBeDefined();
    expect(suppMov.quantity).toBe(-20); // Negative stock movement
    expect(suppMov.previousStock).toBe(70);
    expect(suppMov.newStock).toBe(50);
  });

  // ==========================================================================
  // Test 7: Partial Supplier Return
  // ==========================================================================
  it('7. processes partial supplier returns, tracks accumulated returned quantities, and checks physical stock', () => {
    // Receive 15 units of PROD_001 (50 -> 65)
    const poRes = purchaseService.createPurchase({
      supplierName: 'Global Microchips Corp',
      amount: 22500,
      status: 'Completed',
      items: [{ productId: 'PROD_001', qty: 15, cost: 1500, receivedQty: 15 }]
    });
    const poId = poRes.purchase.id;
    expect(productService.getById('PROD_001').stock).toBe(65);

    // Return 5 units to supplier (65 -> 60)
    const ret1 = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_001',
      quantity: 5,
      reason: 'Damaged packaging'
    });
    expect(ret1.success).toBe(true);
    expect(ret1.returnRecord.previouslyReturnedQuantity).toBe(0);
    expect(ret1.returnRecord.currentReturnQuantity).toBe(5);
    expect(ret1.returnRecord.remainingReturnableQuantity).toBe(10);
    expect(productService.getById('PROD_001').stock).toBe(60);

    // Return 4 more units to supplier (60 -> 56)
    const ret2 = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_001',
      quantity: 4,
      reason: 'Specification mismatch'
    });
    expect(ret2.success).toBe(true);
    expect(ret2.returnRecord.previouslyReturnedQuantity).toBe(5);
    expect(ret2.returnRecord.currentReturnQuantity).toBe(4);
    expect(ret2.returnRecord.remainingReturnableQuantity).toBe(6); // 15 - 5 - 4 = 6
    expect(productService.getById('PROD_001').stock).toBe(56);
  });

  // ==========================================================================
  // Test 8: Decimal Supplier Return (Exact specification from prompt)
  // ==========================================================================
  it('8. handles decimal supplier return accurately (Supplier return = 5.5 KG -> Stock -= 5.5 KG)', () => {
    // Receive PO for 20 KG of PROD_002 (100 -> 120 KG)
    const poRes = purchaseService.createPurchase({
      supplierName: 'Punjab Grain Exporters',
      amount: 1600,
      status: 'Completed',
      items: [{ productId: 'PROD_002', qty: 20, cost: 80, receivedQty: 20 }]
    });
    const poId = poRes.purchase.id;
    expect(productService.getById('PROD_002').stock).toBe(120);

    // Return 5.5 KG to supplier -> Stock -= 5.5 KG (120 -> 114.5 KG)
    const retRes = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_002',
      quantity: 5.5,
      reason: 'Moisture content above threshold'
    });

    expect(retRes.success).toBe(true);
    expect(retRes.returnRecord.originalQuantity).toBe(20);
    expect(retRes.returnRecord.currentReturnQuantity).toBe(5.5);
    expect(retRes.returnRecord.remainingReturnableQuantity).toBe(14.5);
    expect(productService.getById('PROD_002').stock).toBe(114.5); // 120 - 5.5 = 114.5 KG
  });

  // ==========================================================================
  // Test 9: Duplicate Supplier Return Protection
  // ==========================================================================
  it('9. prevents duplicate supplier returns and duplicate idempotency submissions', () => {
    const poRes = purchaseService.createPurchase({
      supplierName: 'Vendor Fast',
      amount: 15000,
      status: 'Completed',
      items: [{ productId: 'PROD_001', qty: 10, cost: 1500, receivedQty: 10 }]
    });
    const poId = poRes.purchase.id;

    // Idempotent submission 1
    const res1 = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_001',
      quantity: 3,
      idempotencyKey: 'IDEMP_KEY_SUPP_888'
    });
    expect(res1.success).toBe(true);

    // Idempotent submission 2 (replay)
    const res2 = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_001',
      quantity: 3,
      idempotencyKey: 'IDEMP_KEY_SUPP_888'
    });
    expect(res2.success).toBe(true);
    expect(res2.idempotentReplay).toBe(true);

    // Stock must not have been double deducted (50 + 10 - 3 = 57)
    expect(productService.getById('PROD_001').stock).toBe(57);
  });

  // ==========================================================================
  // Test 10: Excess Supplier Return Prevention
  // ==========================================================================
  it('10. prevents returning more than the received quantity to supplier or more than physical stock', () => {
    const poRes = purchaseService.createPurchase({
      supplierName: 'Vendor Precise',
      amount: 7500,
      status: 'Completed',
      items: [{ productId: 'PROD_001', qty: 5, cost: 1500, receivedQty: 5 }]
    });
    const poId = poRes.purchase.id;

    // Attempt to return 6 units when only 5 were received
    const excessRes = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_001',
      quantity: 6,
      reason: 'Try to return excess'
    });

    expect(excessRes.success).toBe(false);
    expect(excessRes.message).toMatch(/cannot return 6 units. maximum remaining returnable quantity for this item is 5/i);

    // Attempt to return when physical stock is artificially lower than return request
    // Set stock of PROD_001 to 2
    productService.updateProduct('PROD_001', { stock: 2 });
    const stockShortageRes = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_001',
      quantity: 4
    });
    expect(stockShortageRes.success).toBe(false);
    expect(stockShortageRes.message).toMatch(/insufficient stock on hand/i);
  });

  // ==========================================================================
  // Test 11: Return After Cancellation Prevention
  // ==========================================================================
  it('11. prevents returns on cancelled sales invoices or cancelled purchase orders', () => {
    // 1. Cancelled Sale
    const saleRes = salesService.createSale({
      customerName: 'Cancelled Client',
      items: [{ productId: 'PROD_001', qty: 2, price: 2500 }],
      paidAmount: 5000
    });
    const saleId = saleRes.sale.id;
    salesService.cancelSale(saleId, 'Mistake Order');

    const saleReturnAttempt = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 1
    });
    expect(saleReturnAttempt.success).toBe(false);
    expect(saleReturnAttempt.message).toMatch(/cannot return items from a cancelled sale/i);

    // 2. Cancelled PO
    const poRes = purchaseService.createPurchase({
      supplierName: 'Cancelled Vendor',
      amount: 15000,
      status: 'Completed',
      items: [{ productId: 'PROD_001', qty: 10, cost: 1500, receivedQty: 10 }]
    });
    const poId = poRes.purchase.id;
    purchaseService.cancelPurchase(poId, 'Vendor revoked order');

    const poReturnAttempt = returnService.processSupplierReturn({
      purchaseId: poId,
      productId: 'PROD_001',
      quantity: 5
    });
    expect(poReturnAttempt.success).toBe(false);
    expect(poReturnAttempt.message).toMatch(/cannot return items from a cancelled purchase order/i);
  });

  // ==========================================================================
  // Test 12: Failed Transaction Rollback (ACID Guarantee)
  // ==========================================================================
  it('12. rolls back all modifications atomically if any step in the return fails', () => {
    const saleRes = salesService.createSale({
      customerName: 'Rollback Client',
      items: [{ productId: 'PROD_001', qty: 5, price: 2500 }],
      paidAmount: 12500
    });
    const saleId = saleRes.sale.id;
    const stockBefore = productService.getById('PROD_001').stock; // 45
    const movementsBeforeCount = storageService.getCollection('STOCK_MOVEMENTS').length;
    const returnsBeforeCount = storageService.getCollection('RETURNS').length;

    // Simulate an unexpected internal error during stock movement recording
    const origRecordMovement = inventoryService.recordMovement.bind(inventoryService);
    inventoryService.recordMovement = () => {
      throw new Error('Simulated atomic persistence failure');
    };

    const failedReturn = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 2
    });

    // Restore original method
    inventoryService.recordMovement = origRecordMovement;

    expect(failedReturn.success).toBe(false);
    expect(failedReturn.errors[0]).toMatch(/simulated atomic persistence failure/i);

    // Stock must have rolled back to exact pre-operation state
    expect(productService.getById('PROD_001').stock).toBe(stockBefore);
    // Movements count must not have orphaned entries
    expect(storageService.getCollection('STOCK_MOVEMENTS').length).toBe(movementsBeforeCount);
    // Returns count must not have incomplete records
    expect(storageService.getCollection('RETURNS').length).toBe(returnsBeforeCount);
  });

  // ==========================================================================
  // Test 13: Stock Verification After Return
  // ==========================================================================
  it('13. verifies stock values and status indicators accurately reflect returned quantities', () => {
    // Bring product stock to 0 (Out of Stock)
    productService.updateProduct('PROD_001', { stock: 0, status: 'Out of Stock' });

    // Customer returns 12 units -> stock becomes 12 (minStock is 10, so status becomes 'In Stock')
    // First create a historical sale record with 12 units
    const saleRecord = {
      id: 'S_HIST_101',
      date: 'Nov 20, 2026',
      items: [{ productId: 'PROD_001', name: 'Wireless Barcode Scanner', qty: 12, price: 2500 }],
      amount: 30000,
      paidAmount: 30000,
      status: 'Paid'
    };
    storageService.insertItem('SALES', saleRecord);

    const retRes = returnService.processCustomerReturn({
      saleId: 'S_HIST_101',
      productId: 'PROD_001',
      quantity: 12,
      reason: 'Batch recall replacement'
    });

    expect(retRes.success).toBe(true);
    const updatedProd = productService.getById('PROD_001');
    expect(updatedProd.stock).toBe(12);
    expect(updatedProd.status).toBe('In Stock');
  });

  // ==========================================================================
  // Test 14: Analytics Verification After Return
  // ==========================================================================
  it('14. verifies KPIs, net sales revenue, and gross profit accurately reflect returns', () => {
    // 1. Sell 2 units of PROD_001 for 2500 each (Revenue = 5000, COGS = 2 * 1500 = 3000, Gross Profit = 2000)
    const saleRes = salesService.createSale({
      customerName: 'Analytics Client',
      items: [{ productId: 'PROD_001', qty: 2, price: 2500, cost: 1500, gstRate: 0 }],
      paidAmount: 5000
    });
    const saleId = saleRes.sale.id;

    const initialKPIs = analyticsService.getKPIs();
    expect(initialKPIs.totalSales).toBe(5000);
    expect(initialKPIs.profit).toBe(2000); // 5000 - 3000
    expect(initialKPIs.totalCOGS).toBe(3000);

    // 2. Customer returns 1 unit
    // Net sales should become 2500, Net COGS should become 1500, Net Profit should become 1000
    const retRes = returnService.processCustomerReturn({
      saleId,
      productId: 'PROD_001',
      quantity: 1,
      reason: 'Returned 1 unit'
    });
    expect(retRes.success).toBe(true);

    const postReturnKPIs = analyticsService.getKPIs();
    expect(postReturnKPIs.totalSales).toBe(2500);
    expect(postReturnKPIs.totalCOGS).toBe(1500);
    expect(postReturnKPIs.profit).toBe(1000); // 2500 - 1500
  });
});
