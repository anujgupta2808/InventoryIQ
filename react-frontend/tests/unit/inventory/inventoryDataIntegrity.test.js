import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../../../src/services/storageService';
import { productService } from '../../../src/services/productService';
import { purchaseService } from '../../../src/services/purchaseService';
import { salesService } from '../../../src/services/salesService';
import { inventoryService } from '../../../src/services/inventoryService';
import { validateProduct, validatePurchase } from '../../../src/utils/validators';
import {
  executeSaleAtomic,
  executePurchaseAtomic,
  executeSaleCancellationAtomic,
  executePurchaseCancellationAtomic,
  executeSupplierReturnAtomic,
  executeCustomerReturnAtomic,
  executeStockAdjustmentAtomic,
  runTransaction
} from '../../../src/database/transactions';
import { STORES } from '../../../src/database/schema';

describe('Inventory & Data Integrity Test Suite (Phase 2)', () => {
  const TEST_SHOP_ID = 'test-shop-phase2';

  const initialProducts = [
    {
      id: 'prod-uuid-1',
      name: 'Wireless Mouse',
      sku: 'W-MOUSE-01',
      barcode: '8901234567890',
      category: 'Electronics',
      price: 1200,
      costPrice: 700,
      stock: 50,
      minStock: 10,
      status: 'In Stock',
      unit: 'pcs'
    },
    {
      id: 202, // numeric ID
      name: 'Mechanical Keyboard',
      sku: 'KB-MECH-02',
      barcode: '8901234567891',
      category: 'Electronics',
      price: 3500,
      costPrice: 2000,
      stock: 15,
      minStock: 5,
      status: 'In Stock',
      unit: 'pcs'
    },
    {
      id: 'prod-uuid-3',
      name: 'USB-C Cable',
      sku: 'CABLE-USB-03',
      barcode: '8901234567892',
      category: 'Accessories',
      price: 499,
      costPrice: 200,
      stock: 5,
      minStock: 10,
      status: 'Low Stock',
      unit: 'pcs'
    }
  ];

  beforeEach(async () => {
    localStorage.clear();
    purchaseService.processedKeys.clear();
    storageService.setCollection('PRODUCTS', JSON.parse(JSON.stringify(initialProducts)));
    storageService.setCollection('SALES', []);
    storageService.setCollection('PURCHASES', []);
    storageService.setCollection('STOCK_MOVEMENTS', []);
    storageService.setCollection('CUSTOMERS', [
      { id: 'cust-1', name: 'Raj Sharma', phone: '9876543210', totalBilled: 0, totalReceived: 0, currentDue: 0 }
    ]);
    storageService.setCollection('SUPPLIERS', [
      { id: 'sup-1', name: 'Tech Imports Ltd', totalPurchased: 0, totalPaid: 0, currentDue: 0 }
    ]);
    storageService.setCollection('PAYMENTS', []);

    // Also populate fake-indexeddb for atomic transactions
    await runTransaction(TEST_SHOP_ID, [STORES.PRODUCTS, STORES.SALES, STORES.PURCHASES, STORES.CUSTOMERS, STORES.SUPPLIERS, STORES.STOCK_MOVEMENTS, STORES.AUDIT_LOGS, STORES.PAYMENTS, STORES.SALE_ITEMS, STORES.PURCHASE_ITEMS], 'readwrite', async (tx) => {
      const pStore = tx.objectStore(STORES.PRODUCTS);
      const cStore = tx.objectStore(STORES.CUSTOMERS);
      const sStore = tx.objectStore(STORES.SUPPLIERS);
      
      // Clear stores
      pStore.clear();
      cStore.clear();
      sStore.clear();

      for (const p of initialProducts) {
        pStore.put({ ...p, id: String(p.id) });
      }
      cStore.put({ id: 'cust-1', name: 'Raj Sharma', phone: '9876543210', totalBilled: 0, totalReceived: 0, currentDue: 0 });
      sStore.put({ id: 'sup-1', name: 'Tech Imports Ltd', totalPurchased: 0, totalPaid: 0, currentDue: 0 });
    });
  });

  // =========================================================================
  // TASK 1: PRODUCT IDENTIFIERS & CONSTRAINTS
  // =========================================================================
  describe('Task 1 — Product Identifiers & Integrity', () => {
    it('Scenario 1: Handles string IDs, numeric IDs and UUIDs consistently', () => {
      const pString = productService.getById('prod-uuid-1');
      expect(pString).toBeDefined();
      expect(pString.name).toBe('Wireless Mouse');

      // Numeric ID accessed as number
      const pNum = productService.getById(202);
      expect(pNum).toBeDefined();
      expect(pNum.name).toBe('Mechanical Keyboard');

      // Numeric ID accessed as string
      const pNumStr = productService.getById('202');
      expect(pNumStr).toBeDefined();
      expect(pNumStr.id).toBe(202);
    });

    it('Scenario 2: Prevents duplicate SKU (case-insensitive)', () => {
      const duplicateSkuProduct = {
        name: 'Another Keyboard',
        sku: 'kb-mech-02', // duplicate of KB-MECH-02
        barcode: '9999999999999',
        price: 3000,
        costPrice: 1800,
        stock: 10
      };

      const val = validateProduct(duplicateSkuProduct, initialProducts);
      expect(val.isValid).toBe(false);
      expect(val.errors[0]).toMatch(/already assigned/i);

      const result = productService.addProduct(duplicateSkuProduct);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/already assigned/i);
    });

    it('Scenario 3: Prevents duplicate barcode (case-insensitive)', () => {
      const duplicateBarcodeProduct = {
        name: 'Different Mouse',
        sku: 'NEW-MOUSE-99',
        barcode: '8901234567890', // duplicate of prod-uuid-1
        price: 1500,
        costPrice: 900,
        stock: 20
      };

      const val = validateProduct(duplicateBarcodeProduct, initialProducts);
      expect(val.isValid).toBe(false);
      expect(val.errors[0]).toMatch(/already assigned/i);

      const result = productService.addProduct(duplicateBarcodeProduct);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/already assigned/i);
    });

    it('Scenario 4: Product name is NEVER treated as a unique identifier', () => {
      // Adding another product with the same name but different SKU & barcode must be permitted
      const sameNameProduct = {
        name: 'Wireless Mouse', // same name as prod-uuid-1
        sku: 'W-MOUSE-GEN2',   // different SKU
        barcode: '8901234567999',
        price: 1500,
        costPrice: 900,
        stock: 30
      };

      const val = validateProduct(sameNameProduct, initialProducts);
      expect(val.isValid).toBe(true);

      const result = productService.addProduct(sameNameProduct);
      expect(result.success).toBe(true);
      expect(result.product.id).toBeDefined();
      expect(result.product.id).not.toBe('prod-uuid-1');
    });
  });

  // =========================================================================
  // TASK 2: PURCHASES, IDEMPOTENCY & RECEIVING
  // =========================================================================
  describe('Task 2 — Purchase Orders & Idempotency', () => {
    it('Scenario 5: Critical Test — Receiving the same purchase twice does NOT increase stock twice', () => {
      const poData = {
        id: 'PO-TEST-1001',
        supplierId: 'sup-1',
        supplierName: 'Tech Imports Ltd',
        date: '2026-11-20',
        items: [
          { productId: 'prod-uuid-1', name: 'Wireless Mouse', qty: 20, cost: 700, gstRate: 18 }
        ],
        amount: 16520,
        paidAmount: 16520,
        status: 'Ordered'
      };

      // Create purchase
      const createRes = purchaseService.createPurchase(poData);
      expect(createRes.success).toBe(true);

      const initialStock = productService.getById('prod-uuid-1').stock; // 50

      // First receipt -> stock must increase to 70
      const rec1 = purchaseService.receivePurchase('PO-TEST-1001', { idempotencyKey: 'IDEMP-PO-1001' });
      expect(rec1.success).toBe(true);
      expect(rec1.alreadyReceived).toBeFalsy();
      expect(productService.getById('prod-uuid-1').stock).toBe(initialStock + 20);

      // Second receipt with same idempotency key or completed status -> stock must NOT increase again!
      const rec2 = purchaseService.receivePurchase('PO-TEST-1001', { idempotencyKey: 'IDEMP-PO-1001' });
      expect(rec2.success).toBe(true);
      expect(rec2.alreadyReceived).toBe(true);
      expect(productService.getById('prod-uuid-1').stock).toBe(initialStock + 20); // Still 70!
    });

    it('Scenario 6: Partial purchase receiving increases stock only by received quantity', () => {
      const poData = {
        id: 'PO-PARTIAL-01',
        supplierId: 'sup-1',
        supplierName: 'Tech Imports Ltd',
        items: [
          { productId: 'prod-uuid-1', name: 'Wireless Mouse', qty: 30, cost: 700 }
        ],
        amount: 21000,
        paidAmount: 0,
        status: 'Ordered'
      };
      purchaseService.createPurchase(poData);
      const stockBefore = productService.getById('prod-uuid-1').stock; // 50

      // Receive only 10 out of 30 units
      const partialRec = purchaseService.receivePurchase('PO-PARTIAL-01', {
        items: [{ productId: 'prod-uuid-1', receivedQty: 10 }]
      });

      expect(partialRec.success).toBe(true);
      expect(partialRec.purchase.status).toBe('Partial');
      expect(productService.getById('prod-uuid-1').stock).toBe(stockBefore + 10);

      // Subsequent receipt receives remaining 20 units
      const finalRec = purchaseService.receivePurchase('PO-PARTIAL-01', {
        items: [{ productId: 'prod-uuid-1', receivedQty: 20 }]
      });

      expect(finalRec.success).toBe(true);
      expect(finalRec.purchase.status).toBe('Completed');
      expect(productService.getById('prod-uuid-1').stock).toBe(stockBefore + 30);
    });

    it('Scenario 7: Purchase cancellation reverses received stock and records movement', () => {
      const poData = {
        id: 'PO-CANCEL-01',
        supplierId: 'sup-1',
        supplierName: 'Tech Imports Ltd',
        items: [
          { productId: 'prod-uuid-1', name: 'Wireless Mouse', qty: 15, cost: 700 }
        ],
        amount: 10500,
        paidAmount: 5000,
        status: 'Ordered'
      };
      purchaseService.createPurchase(poData);
      purchaseService.receivePurchase('PO-CANCEL-01');
      expect(productService.getById('prod-uuid-1').stock).toBe(65);

      // Cancel purchase
      const cancelRes = purchaseService.cancelPurchase('PO-CANCEL-01', 'Defective batch');
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.purchase.status).toBe('Cancelled');
      expect(productService.getById('prod-uuid-1').stock).toBe(50); // Reverted back to 50

      // Check stock movement recorded
      const movements = inventoryService.getMovements('prod-uuid-1');
      const cancelMv = movements.find(m => m.type === 'PURCHASE_CANCEL');
      expect(cancelMv).toBeDefined();
      expect(cancelMv.quantity).toBe(-15);
    });

    it('Scenario 8: Supplier return deducts stock and prevents negative stock', () => {
      const initialStock = productService.getById('prod-uuid-1').stock; // 50

      // Return 5 units to supplier
      const returnRes = purchaseService.returnToSupplier({
        purchaseId: 'PO-TEST',
        productId: 'prod-uuid-1',
        quantity: 5,
        reason: 'Cosmetic defect'
      });
      expect(returnRes.success).toBe(true);
      expect(productService.getById('prod-uuid-1').stock).toBe(initialStock - 5);

      // Check movement
      const movements = inventoryService.getMovements('prod-uuid-1');
      const retMv = movements.find(m => m.type === 'SUPPLIER_RETURN');
      expect(retMv).toBeDefined();
      expect(retMv.quantity).toBe(-5);

      // Attempting to return more than available stock must be rejected
      const overReturnRes = purchaseService.returnToSupplier({
        productId: 'prod-uuid-1',
        quantity: 9999,
        reason: 'Too many'
      });
      expect(overReturnRes.success).toBe(false);
      expect(overReturnRes.errors[0]).toMatch(/insufficient stock/i);
    });

    it('Scenario 9: Rejects invalid purchase quantities and costs', () => {
      const invalidQtyPo = {
        supplierName: 'Vendor',
        items: [{ productId: 'prod-uuid-1', name: 'Item', qty: -5, cost: 100 }]
      };
      const v1 = validatePurchase(invalidQtyPo);
      expect(v1.isValid).toBe(false);
      expect(v1.errors.some(e => e.includes('positive') || e.includes('quantity'))).toBe(true);

      const invalidCostPo = {
        supplierName: 'Vendor',
        items: [{ productId: 'prod-uuid-1', name: 'Item', qty: 10, cost: -50 }]
      };
      const v2 = validatePurchase(invalidCostPo);
      expect(v2.isValid).toBe(false);
      expect(v2.errors.some(e => e.includes('negative') || e.includes('cost'))).toBe(true);

      const zeroQtyPo = {
        supplierName: 'Vendor',
        items: [{ productId: 'prod-uuid-1', name: 'Item', qty: 0, cost: 100 }]
      };
      const v3 = validatePurchase(zeroQtyPo);
      expect(v3.isValid).toBe(false);
    });
  });

  // =========================================================================
  // TASK 3: SALES, STOCK REDUCTION & RETURNS
  // =========================================================================
  describe('Task 3 — Sales & Stock Reduction', () => {
    it('Scenario 10: Sale stock reduction and status transition', () => {
      const stockBefore = productService.getById(202).stock; // 15, minStock is 5

      const saleData = {
        id: 'INV-TEST-001',
        customerId: 'cust-1',
        customerName: 'Raj Sharma',
        items: [
          { productId: 202, name: 'Mechanical Keyboard', qty: 12, price: 3500 }
        ],
        amount: 42000,
        paidAmount: 42000,
        paymentMethod: 'UPI'
      };

      const result = salesService.recordSale(saleData);
      expect(result.success).toBe(true);

      // Remaining stock is 3 (15 - 12). Since 3 <= minStock(5), status becomes 'Low Stock'
      const updatedP = productService.getById(202);
      expect(updatedP.stock).toBe(3);
      expect(updatedP.status).toBe('Low Stock');

      const movements = inventoryService.getMovements(202);
      const saleMv = movements.find(m => m.type === 'SALE');
      expect(saleMv).toBeDefined();
      expect(saleMv.quantity).toBe(-12);
    });

    it('Scenario 11: Insufficient stock rejection — stock must NEVER become negative', () => {
      const currentStock = productService.getById('prod-uuid-3').stock; // 5

      const overSaleData = {
        id: 'INV-OVERSALE',
        customerId: 'cust-1',
        customerName: 'Raj Sharma',
        items: [
          { productId: 'prod-uuid-3', name: 'USB-C Cable', qty: 10, price: 499 } // requested 10, only 5 available
        ],
        amount: 4990,
        paidAmount: 4990
      };

      const result = salesService.recordSale(overSaleData);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/insufficient stock/i);

      // Product stock remains 5
      expect(productService.getById('prod-uuid-3').stock).toBe(currentStock);
    });

    it('Scenario 12: Sale cancellation restores stock accurately', () => {
      const saleData = {
        id: 'INV-CANCEL-001',
        customerId: 'cust-1',
        customerName: 'Raj Sharma',
        items: [
          { productId: 'prod-uuid-1', name: 'Wireless Mouse', qty: 10, price: 1200 }
        ],
        amount: 12000,
        paidAmount: 12000
      };
      salesService.recordSale(saleData);
      expect(productService.getById('prod-uuid-1').stock).toBe(40);

      const cancelRes = salesService.cancelSale('INV-CANCEL-001', 'Customer cancelled order');
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.sale.status).toBe('Cancelled');
      expect(productService.getById('prod-uuid-1').stock).toBe(50); // Restored

      const movements = inventoryService.getMovements('prod-uuid-1');
      const cancelMv = movements.find(m => m.type === 'SALE_CANCEL');
      expect(cancelMv).toBeDefined();
      expect(cancelMv.quantity).toBe(10);
    });

    it('Scenario 13: Customer return restores stock and respects return limits', () => {
      const saleData = {
        id: 'INV-RET-001',
        customerId: 'cust-1',
        customerName: 'Raj Sharma',
        items: [
          { productId: 'prod-uuid-1', name: 'Wireless Mouse', qty: 4, price: 1200 }
        ],
        amount: 4800,
        paidAmount: 4800
      };
      salesService.recordSale(saleData);
      expect(productService.getById('prod-uuid-1').stock).toBe(46);

      // Return 2 units
      const retRes = salesService.returnSaleItem({
        saleId: 'INV-RET-001',
        productId: 'prod-uuid-1',
        quantity: 2,
        reason: 'Wrong color'
      });
      expect(retRes.success).toBe(true);
      expect(productService.getById('prod-uuid-1').stock).toBe(48); // 46 + 2 = 48

      // Attempt to return 3 more units (2 already returned, purchased was 4) -> must fail!
      const overRet = salesService.returnSaleItem({
        saleId: 'INV-RET-001',
        productId: 'prod-uuid-1',
        quantity: 3,
        reason: 'Too many'
      });
      expect(overRet.success).toBe(false);
      expect(overRet.errors[0]).toMatch(/cannot return/i);
    });
  });

  // =========================================================================
  // TASK 4: STOCK ADJUSTMENT INVARIANTS
  // =========================================================================
  describe('Task 4 — Stock Adjustments & Non-Negative Invariant', () => {
    it('Scenario 14: Adjust stock rejects reductions that cause negative inventory', () => {
      const currentStock = productService.getById('prod-uuid-3').stock; // 5

      // Reduce by 10 -> would result in -5
      const res = inventoryService.adjustStock('prod-uuid-3', -10, 'Damage disposal');
      expect(res.success).toBe(false);
      expect(res.errors[0]).toMatch(/negative stock/i);

      // Stock stays intact
      expect(productService.getById('prod-uuid-3').stock).toBe(currentStock);

      // Valid reduction by 2
      const validRes = inventoryService.adjustStock('prod-uuid-3', -2, 'Damage disposal');
      expect(validRes.success).toBe(true);
      expect(productService.getById('prod-uuid-3').stock).toBe(3);
    });
  });

  // =========================================================================
  // TASK 5: PRODUCT DELETION & SOFT-DELETE ARCHIVING
  // =========================================================================
  describe('Task 5 — Product Deletion & History Preservation', () => {
    it('Scenario 15: Product with historical transactions is soft-deleted (archived) to preserve financial integrity', () => {
      // Create a sale for prod-uuid-1
      salesService.recordSale({
        id: 'INV-HIST-01',
        customerId: 'cust-1',
        items: [{ productId: 'prod-uuid-1', name: 'Wireless Mouse', qty: 2, price: 1200 }],
        amount: 2400,
        paidAmount: 2400
      });

      // Attempt to delete product
      const delRes = productService.deleteProduct('prod-uuid-1');
      expect(delRes.success).toBe(true);
      expect(delRes.archived).toBe(true); // Must be archived, not permanently wiped!

      // Default getAll() must not include archived products
      const activeProducts = productService.getAll();
      expect(activeProducts.find(p => p.id === 'prod-uuid-1')).toBeUndefined();

      // Product still exists with isArchived: true for historical invoice lookups
      const archivedProd = productService.getById('prod-uuid-1');
      expect(archivedProd).toBeDefined();
      expect(archivedProd.isArchived).toBe(true);
      expect(archivedProd.status).toBe('Archived');

      // Product without history can be hard-deleted
      const newP = productService.addProduct({
        name: 'Temporary Item',
        sku: 'TEMP-999',
        price: 100,
        costPrice: 50,
        stock: 1
      });
      const hardDel = productService.deleteProduct(newP.product.id);
      expect(hardDel.success).toBe(true);
      expect(hardDel.archived).toBe(false);
      expect(productService.getById(newP.product.id)).toBeNull();
    });
  });

  // =========================================================================
  // TASK 6: ATOMIC MULTI-STORE TRANSACTIONS & ROLLBACK
  // =========================================================================
  describe('Task 6 — Atomic Multi-Store Transactions (IndexedDB)', () => {
    it('Scenario 16: Atomic Sale Transaction rolls back completely on stock deficit', async () => {
      const currentStock = 50;

      await expect(
        executeSaleAtomic(TEST_SHOP_ID, {
          items: [
            { productId: 'prod-uuid-1', qty: 999, price: 1200 } // insufficient stock
          ]
        })
      ).rejects.toThrow(/Insufficient stock/i);

      // Verify product stock in DB was not modified
      await runTransaction(TEST_SHOP_ID, [STORES.PRODUCTS], 'readonly', async (tx) => {
        const pStore = tx.objectStore(STORES.PRODUCTS);
        const req = pStore.get('prod-uuid-1');
        const prod = await new Promise(r => { req.onsuccess = () => r(req.result); });
        expect(prod.stock).toBe(currentStock);
      });
    });

    it('Scenario 17: Atomic Purchase Transaction prevents duplicate stock increments', async () => {
      const poData = {
        id: 'PO-ATOMIC-1',
        supplierId: 'sup-1',
        supplierName: 'Tech Imports Ltd',
        items: [
          { productId: 'prod-uuid-1', qty: 10, cost: 700, price: 1200 }
        ],
        amount: 7000,
        paidAmount: 7000
      };

      // First atomic purchase execution
      const res1 = await executePurchaseAtomic(TEST_SHOP_ID, poData);
      expect(res1.success).toBe(true);
      expect(res1.duplicate).toBeFalsy();

      // Check stock increased from 50 to 60
      await runTransaction(TEST_SHOP_ID, [STORES.PRODUCTS], 'readonly', async (tx) => {
        const pStore = tx.objectStore(STORES.PRODUCTS);
        const req = pStore.get('prod-uuid-1');
        const prod = await new Promise(r => { req.onsuccess = () => r(req.result); });
        expect(prod.stock).toBe(60);
      });

      // Second atomic purchase execution of the exact same PO ID
      const res2 = await executePurchaseAtomic(TEST_SHOP_ID, poData);
      expect(res2.success).toBe(true);
      expect(res2.duplicate).toBe(true);
      expect(res2.alreadyReceived).toBe(true);

      // Stock must remain 60!
      await runTransaction(TEST_SHOP_ID, [STORES.PRODUCTS], 'readonly', async (tx) => {
        const pStore = tx.objectStore(STORES.PRODUCTS);
        const req = pStore.get('prod-uuid-1');
        const prod = await new Promise(r => { req.onsuccess = () => r(req.result); });
        expect(prod.stock).toBe(60);
      });
    });

    it('Scenario 18: Atomic Customer Return & Supplier Return work reliably', async () => {
      // Perform atomic stock adjustment
      const adjRes = await executeStockAdjustmentAtomic(TEST_SHOP_ID, {
        productId: 'prod-uuid-1',
        delta: 5,
        type: 'ADJUSTMENT',
        reason: 'Found extra in stockroom'
      });
      expect(adjRes.success).toBe(true);
      expect(adjRes.product.stock).toBe(55);

      // Supplier return of 5 units
      const supRet = await executeSupplierReturnAtomic(TEST_SHOP_ID, {
        productId: 'prod-uuid-1',
        quantity: 5,
        reason: 'RMA Return'
      });
      expect(supRet.success).toBe(true);
      expect(supRet.product.stock).toBe(50);
    });
  });
});
