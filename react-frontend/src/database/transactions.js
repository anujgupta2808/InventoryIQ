/**
 * Atomic Business Transaction Engine for InventoryIQ Local-First Architecture
 * Enforces atomic multi-store IndexedDB operations with automatic rollback on error.
 */

import { openShopDatabase } from './db.js';
import { STORES } from './schema.js';
import { roundTo, toPaise, fromPaise, aggregateSaleItems } from '../utils/calculations.js';

// In-flight transaction locks to prevent double-click / concurrent double-sales
const inFlightOperations = new Set();

/**
 * Runs an atomic IndexedDB transaction across multiple object stores.
 * If any error occurs inside transactionFn or within IndexedDB, the transaction
 * is aborted immediately, guaranteeing zero partial or corrupt states.
 */
export async function runTransaction(shopId, storeNames, mode, transactionFn) {
  const db = await openShopDatabase(shopId);

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeNames, mode);
      let result = null;

      tx.oncomplete = () => {
        resolve(result);
      };

      tx.onerror = (event) => {
        const error = tx.error || event.target?.error || new Error('Transaction failed');
        reject(error);
      };

      tx.onabort = (event) => {
        const error = tx.error || event.target?.error || new Error('Transaction aborted');
        reject(error);
      };

      // Execute caller's transactional logic
      Promise.resolve()
        .then(() => transactionFn(tx))
        .then((res) => {
          result = res;
        })
        .catch((err) => {
          try {
            tx.abort();
          } catch (_) {
            // Already aborted or completed
          }
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * ATOMIC SALE TRANSACTION
 * 1. Checks idempotency lock
 * 2. Normalizes & aggregates duplicate sale lines
 * 3. Enforces fractional quantities (no integer truncation)
 * 4. Validates stock inside transaction
 * 5. Deducts stock & updates product status
 * 6. Generates immutable stock movements
 * 7. Records COGS basis (costAtSale)
 * 8. Records sale and line items
 * 9. Records payment & customer ledger updates
 * 10. Records audit log
 */
export async function executeSaleAtomic(shopId, saleData, user = { name: 'Admin', role: 'owner' }) {
  if (!saleData || !Array.isArray(saleData.items) || saleData.items.length === 0) {
    throw new Error('Sale must contain at least one line item.');
  }

  // Idempotency token to prevent double-submission
  const idempotencyKey = saleData.idempotencyKey || `TX_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  if (inFlightOperations.has(idempotencyKey)) {
    throw new Error('This sale transaction is currently processing. Please wait.');
  }
  inFlightOperations.add(idempotencyKey);

  const requiredStores = [
    STORES.SALES,
    STORES.SALE_ITEMS,
    STORES.PRODUCTS,
    STORES.CUSTOMERS,
    STORES.PAYMENTS,
    STORES.STOCK_MOVEMENTS,
    STORES.AUDIT_LOGS
  ];

  try {
    const result = await runTransaction(shopId, requiredStores, 'readwrite', async (tx) => {
      const saleStore = tx.objectStore(STORES.SALES);
      const saleItemStore = tx.objectStore(STORES.SALE_ITEMS);
      const productStore = tx.objectStore(STORES.PRODUCTS);
      const customerStore = tx.objectStore(STORES.CUSTOMERS);
      const paymentStore = tx.objectStore(STORES.PAYMENTS);
      const movementStore = tx.objectStore(STORES.STOCK_MOVEMENTS);
      const auditStore = tx.objectStore(STORES.AUDIT_LOGS);

      const now = new Date();
      const dateStr = saleData.date || now.toISOString().split('T')[0];
      const saleId = saleData.id || `INV-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Consolidate duplicate product lines
      const consolidatedLines = aggregateSaleItems(saleData.items);

      // 2. Fetch all products involved and validate stock
      let totalCalculatedSubtotalPaise = 0;
      let totalTaxPaise = 0;
      let totalCogsPaise = 0;
      const enrichedItems = [];
      const updatedProducts = [];

      for (const line of consolidatedLines) {
        const prodId = String(line.productId || line.id);
        const reqQty = Number(line.qty);

        if (isNaN(reqQty) || reqQty <= 0) {
          throw new Error(`Invalid quantity (${line.qty}) for product "${line.name || prodId}".`);
        }

        // Fetch current product state inside the transaction
        const product = await new Promise((res, rej) => {
          const req = productStore.get(prodId);
          req.onsuccess = () => res(req.result || null);
          req.onerror = () => rej(req.error);
        });

        if (!product) {
          throw new Error(`Product "${line.name || prodId}" not found in local catalog.`);
        }

        const currentStock = Number(product.stock || 0);
        if (currentStock < reqQty) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${currentStock}, Requested: ${reqQty}.`
          );
        }

        // Fractional-safe stock deduction
        const newStock = roundTo(currentStock - reqQty, 3);
        const minStock = Number(product.minStock || 0);
        const newStatus = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

        const updatedProd = {
          ...product,
          stock: newStock,
          status: newStatus,
          updatedAt: now.toISOString()
        };
        productStore.put(updatedProd);
        updatedProducts.push(updatedProd);

        // Calculate line financial totals in integer paise
        const unitPricePaise = toPaise(line.price !== undefined ? line.price : product.price);
        const lineDiscountPct = Math.max(0, Math.min(100, Number(line.discount || 0)));
        const lineGstPct = Math.max(0, Number(line.gstRate || 0));

        const rawLineSubtotalPaise = Math.round(unitPricePaise * reqQty);
        const lineDiscountPaise = Math.round(rawLineSubtotalPaise * (lineDiscountPct / 100));
        const lineTaxablePaise = Math.max(0, rawLineSubtotalPaise - lineDiscountPaise);
        const lineTaxPaise = Math.round(lineTaxablePaise * (lineGstPct / 100));
        const lineTotalPaise = lineTaxablePaise + lineTaxPaise;

        totalCalculatedSubtotalPaise += rawLineSubtotalPaise;
        totalTaxPaise += lineTaxPaise;

        // Cost basis (costAtSale)
        const unitCost = Number(product.costPrice || line.cost || 0);
        const lineCogsPaise = Math.round(toPaise(unitCost) * reqQty);
        totalCogsPaise += lineCogsPaise;

        const saleItemId = crypto.randomUUID();
        const saleItemRecord = {
          id: saleItemId,
          saleId,
          productId: prodId,
          name: product.name,
          sku: product.sku,
          unit: product.unit || 'pcs',
          qty: reqQty,
          price: fromPaise(unitPricePaise),
          cost: unitCost,
          costPrice: unitCost,
          costAtSale: unitCost,
          discount: lineDiscountPct,
          gstRate: lineGstPct,
          taxableAmount: fromPaise(lineTaxablePaise),
          taxAmount: fromPaise(lineTaxPaise),
          total: fromPaise(lineTotalPaise)
        };
        saleItemStore.add(saleItemRecord);
        enrichedItems.push(saleItemRecord);

        // Record immutable stock movement
        const movementId = crypto.randomUUID();
        movementStore.add({
          id: movementId,
          productId: prodId,
          productName: product.name,
          type: 'SALE',
          quantity: -reqQty,
          previousStock: currentStock,
          newStock,
          referenceType: 'SALE',
          referenceId: saleId,
          reason: `Sale Invoice #${saleId}`,
          userId: user.id || user.name || 'Admin',
          createdAt: now.toISOString()
        });
      }

      // Calculate invoice totals
      const overallDiscountPaise = Math.min(
        totalCalculatedSubtotalPaise,
        toPaise(saleData.discount || 0)
      );
      const grandTotalPaise = Math.max(0, totalCalculatedSubtotalPaise - overallDiscountPaise + totalTaxPaise);
      const grandTotal = fromPaise(grandTotalPaise);

      const requestedPaidPaise = toPaise(saleData.paidAmount || 0);
      const actualPaidPaise = Math.min(grandTotalPaise, Math.max(0, requestedPaidPaise));
      const dueAmountPaise = Math.max(0, grandTotalPaise - actualPaidPaise);

      const paidAmount = fromPaise(actualPaidPaise);
      const dueAmount = fromPaise(dueAmountPaise);
      const paymentStatus = dueAmountPaise === 0 ? 'Paid' : (actualPaidPaise > 0 ? 'Partial' : 'Pending');

      // Assemble master sale record
      const saleRecord = {
        id: saleId,
        date: dateStr,
        customerId: saleData.customerId || null,
        customerName: String(saleData.customerName || 'Walk-in Customer').trim(),
        customerPhone: String(saleData.customerPhone || '').trim(),
        customerEmail: String(saleData.customerEmail || '').trim(),
        customerAddress: String(saleData.customerAddress || '').trim(),
        items: enrichedItems,
        subtotal: fromPaise(totalCalculatedSubtotalPaise),
        discount: fromPaise(overallDiscountPaise),
        tax: fromPaise(totalTaxPaise),
        amount: grandTotal,
        paidAmount,
        dueAmount,
        status: paymentStatus,
        paymentMethod: saleData.paymentMethod || 'UPI',
        cogs: fromPaise(totalCogsPaise),
        grossProfit: roundTo(grandTotal - fromPaise(totalCogsPaise), 2),
        paymentHistory: [],
        createdAt: now.toISOString()
      };

      // Record payment & update customer balance if payment made
      if (paidAmount > 0) {
        const paymentId = `PAY-${Date.now().toString().slice(-6)}`;
        const paymentRecord = {
          id: paymentId,
          partyId: saleData.customerId || null,
          partyType: 'CUSTOMER',
          partyName: saleRecord.customerName,
          referenceType: 'SALE',
          referenceId: saleId,
          amount: paidAmount,
          paymentMethod: saleData.paymentMethod || 'UPI',
          transactionRef: saleData.transactionRef || '',
          note: `Invoice creation payment #${saleId}`,
          user: user.name || 'Admin',
          date: dateStr,
          createdAt: now.toISOString()
        };
        paymentStore.add(paymentRecord);
        saleRecord.paymentHistory.push({
          id: paymentId,
          date: dateStr,
          amount: paidAmount,
          method: saleRecord.paymentMethod,
          note: 'Initial payment at invoice creation'
        });
      }

      // Update customer ledger if linked customer
      if (saleData.customerId) {
        const customer = await new Promise((res, rej) => {
          const req = customerStore.get(String(saleData.customerId));
          req.onsuccess = () => res(req.result || null);
          req.onerror = () => rej(req.error);
        });

        if (customer) {
          const newBilled = roundTo((Number(customer.totalBilled) || 0) + grandTotal, 2);
          const newReceived = roundTo((Number(customer.totalReceived) || 0) + paidAmount, 2);
          const newDue = Math.max(0, roundTo(newBilled - newReceived, 2));

          customerStore.put({
            ...customer,
            totalBilled: newBilled,
            totalReceived: newReceived,
            currentDue: newDue,
            updatedAt: now.toISOString()
          });
        }
      }

      // Save sale invoice
      saleStore.add(saleRecord);

      // Record audit log
      auditStore.add({
        id: crypto.randomUUID(),
        userId: user.id || user.name || 'Admin',
        role: user.role || 'owner',
        action: 'SALE_CREATED',
        entityType: 'SALE',
        entityId: saleId,
        details: `Created sale invoice #${saleId} for ₹${grandTotal} (${saleRecord.status})`,
        timestamp: now.toISOString()
      });

      return {
        success: true,
        sale: saleRecord,
        updatedProducts
      };
    });

    return result;
  } finally {
    inFlightOperations.delete(idempotencyKey);
  }
}

/**
 * ATOMIC SALE CANCELLATION TRANSACTION
 * 1. Restores stock by aggregating quantities per productId
 * 2. Reverses customer balance
 * 3. Updates sale status to 'Cancelled'
 * 4. Records stock movements and audit log
 */
export async function executeSaleCancellationAtomic(shopId, saleId, reason = 'Invoice Cancelled', user = { name: 'Admin', role: 'owner' }) {
  const requiredStores = [
    STORES.SALES,
    STORES.PRODUCTS,
    STORES.CUSTOMERS,
    STORES.STOCK_MOVEMENTS,
    STORES.AUDIT_LOGS
  ];

  return runTransaction(shopId, requiredStores, 'readwrite', async (tx) => {
    const saleStore = tx.objectStore(STORES.SALES);
    const productStore = tx.objectStore(STORES.PRODUCTS);
    const customerStore = tx.objectStore(STORES.CUSTOMERS);
    const movementStore = tx.objectStore(STORES.STOCK_MOVEMENTS);
    const auditStore = tx.objectStore(STORES.AUDIT_LOGS);

    const now = new Date();

    const sale = await new Promise((res, rej) => {
      const req = saleStore.get(saleId);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });

    if (!sale) {
      throw new Error(`Sale #${saleId} not found.`);
    }

    if (sale.status === 'Cancelled') {
      throw new Error(`Sale #${saleId} is already cancelled.`);
    }

    // Aggregate quantities by product ID to prevent single-match restoration bug
    const qtyByProduct = new Map();
    if (Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        const pId = String(item.productId || item.id);
        const q = Number(item.qty) || 0;
        qtyByProduct.set(pId, (qtyByProduct.get(pId) || 0) + q);
      });
    }

    // Restore stock for all products
    for (const [pId, qtyToRestore] of qtyByProduct.entries()) {
      const product = await new Promise((res, rej) => {
        const req = productStore.get(pId);
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
      });

      if (product) {
        const currentStock = Number(product.stock || 0);
        const restoredStock = roundTo(currentStock + qtyToRestore, 3);
        const minStock = Number(product.minStock || 0);
        const newStatus = restoredStock <= 0 ? 'Out of Stock' : (restoredStock <= minStock ? 'Low Stock' : 'In Stock');

        productStore.put({
          ...product,
          stock: restoredStock,
          status: newStatus,
          updatedAt: now.toISOString()
        });

        // Record reversal movement
        movementStore.add({
          id: crypto.randomUUID(),
          productId: pId,
          productName: product.name,
          type: 'SALE_CANCEL',
          quantity: qtyToRestore,
          previousStock: currentStock,
          newStock: restoredStock,
          referenceType: 'SALE_CANCEL',
          referenceId: saleId,
          reason: `Reversal: ${reason}`,
          userId: user.id || user.name || 'Admin',
          createdAt: now.toISOString()
        });
      }
    }

    // Reconcile customer balance if linked
    if (sale.customerId) {
      const customer = await new Promise((res, rej) => {
        const req = customerStore.get(String(sale.customerId));
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
      });

      if (customer) {
        const billed = roundTo((Number(customer.totalBilled) || 0) - (Number(sale.amount) || 0), 2);
        const received = roundTo((Number(customer.totalReceived) || 0) - (Number(sale.paidAmount) || 0), 2);
        customerStore.put({
          ...customer,
          totalBilled: Math.max(0, billed),
          totalReceived: Math.max(0, received),
          currentDue: Math.max(0, roundTo(billed - received, 2)),
          updatedAt: now.toISOString()
        });
      }
    }

    // Update sale status
    const cancelledSale = {
      ...sale,
      status: 'Cancelled',
      cancellationReason: reason,
      cancelledAt: now.toISOString(),
      cancelledBy: user.name || 'Admin'
    };
    saleStore.put(cancelledSale);

    // Audit log
    auditStore.add({
      id: crypto.randomUUID(),
      userId: user.id || user.name || 'Admin',
      role: user.role || 'owner',
      action: 'SALE_CANCELLED',
      entityType: 'SALE',
      entityId: saleId,
      details: `Cancelled invoice #${saleId} (Reason: ${reason})`,
      timestamp: now.toISOString()
    });

    return { success: true, sale: cancelledSale };
  });
}

/**
 * ATOMIC PURCHASE ORDER TRANSACTION
 * 1. Matches products strictly by productId or exact SKU (never by name!)
 * 2. Removes fake supplier auto-generation
 * 3. Atomically increases inventory stock
 * 4. Records stock movements, supplier ledger, and audit log
 */
export async function executePurchaseAtomic(shopId, purchaseData, user = { name: 'Admin', role: 'owner' }) {
  if (!purchaseData || !Array.isArray(purchaseData.items) || purchaseData.items.length === 0) {
    throw new Error('Purchase must contain at least one line item.');
  }

  const requiredStores = [
    STORES.PURCHASES,
    STORES.PURCHASE_ITEMS,
    STORES.PRODUCTS,
    STORES.SUPPLIERS,
    STORES.PAYMENTS,
    STORES.STOCK_MOVEMENTS,
    STORES.AUDIT_LOGS
  ];

  return runTransaction(shopId, requiredStores, 'readwrite', async (tx) => {
    const purchaseStore = tx.objectStore(STORES.PURCHASES);
    const purchaseItemStore = tx.objectStore(STORES.PURCHASE_ITEMS);
    const productStore = tx.objectStore(STORES.PRODUCTS);
    const supplierStore = tx.objectStore(STORES.SUPPLIERS);
    const paymentStore = tx.objectStore(STORES.PAYMENTS);
    const movementStore = tx.objectStore(STORES.STOCK_MOVEMENTS);
    const auditStore = tx.objectStore(STORES.AUDIT_LOGS);

    const now = new Date();
    const dateStr = purchaseData.date || now.toISOString().split('T')[0];
    const poId = purchaseData.id || `PO-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    let totalSubtotalPaise = 0;
    let totalTaxPaise = 0;
    const enrichedItems = [];
    const updatedProducts = [];

    for (const item of purchaseData.items) {
      const prodId = item.productId ? String(item.productId) : null;
      const sku = item.sku ? String(item.sku).trim().toUpperCase() : null;
      const qty = Number(item.qty);
      const cost = Number(item.cost !== undefined ? item.cost : (item.costPrice || 0));

      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid purchase quantity (${item.qty}) for item "${item.name || 'Unknown'}".`);
      }
      if (isNaN(cost) || cost < 0) {
        throw new Error(`Invalid purchase cost (₹${cost}) for item "${item.name || 'Unknown'}".`);
      }

      // Match product strictly by productId or SKU index
      let product = null;
      if (prodId) {
        product = await new Promise((res, rej) => {
          const req = productStore.get(prodId);
          req.onsuccess = () => res(req.result || null);
          req.onerror = () => rej(req.error);
        });
      } else if (sku) {
        const skuIdx = productStore.index('by_sku');
        product = await new Promise((res, rej) => {
          const req = skuIdx.get(sku);
          req.onsuccess = () => res(req.result || null);
          req.onerror = () => rej(req.error);
        });
      }

      const itemCostPaise = toPaise(cost);
      const itemGstPct = Math.max(0, Number(item.gstRate || 0));
      const lineSubtotalPaise = Math.round(itemCostPaise * qty);
      const lineTaxPaise = Math.round(lineSubtotalPaise * (itemGstPct / 100));
      const lineTotalPaise = lineSubtotalPaise + lineTaxPaise;

      totalSubtotalPaise += lineSubtotalPaise;
      totalTaxPaise += lineTaxPaise;

      let finalProdId = prodId;

      if (product) {
        // Increment stock
        const currentStock = Number(product.stock || 0);
        const newStock = roundTo(currentStock + qty, 3);
        const newCost = cost > 0 ? cost : product.costPrice;
        const newStatus = newStock <= 0 ? 'Out of Stock' : (newStock <= (product.minStock || 0) ? 'Low Stock' : 'In Stock');

        const updatedProd = {
          ...product,
          stock: newStock,
          costPrice: newCost,
          status: newStatus,
          updatedAt: now.toISOString()
        };
        productStore.put(updatedProd);
        updatedProducts.push(updatedProd);
        finalProdId = product.id;

        // Record movement
        movementStore.add({
          id: crypto.randomUUID(),
          productId: finalProdId,
          productName: product.name,
          type: 'PURCHASE',
          quantity: qty,
          previousStock: currentStock,
          newStock,
          referenceType: 'PURCHASE',
          referenceId: poId,
          reason: `PO #${poId} received`,
          userId: user.id || user.name || 'Admin',
          createdAt: now.toISOString()
        });
      } else {
        // Auto-create new product with unique ID and SKU
        finalProdId = crypto.randomUUID();
        const newProdSku = sku || `SKU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        const initialPrice = Number(item.price) || roundTo(cost * 1.35, 2) || (cost + 50);

        const newProd = {
          id: finalProdId,
          name: String(item.name || 'New Purchased Item').trim(),
          sku: newProdSku,
          category: item.category || 'General',
          stock: qty,
          minStock: 10,
          costPrice: cost,
          price: initialPrice,
          unit: item.unit || 'pcs',
          status: qty > 10 ? 'In Stock' : 'Low Stock',
          supplierId: purchaseData.supplierId || null,
          supplierName: purchaseData.supplierName || '',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        productStore.add(newProd);
        updatedProducts.push(newProd);

        // Record movement
        movementStore.add({
          id: crypto.randomUUID(),
          productId: finalProdId,
          productName: newProd.name,
          type: 'PURCHASE',
          quantity: qty,
          previousStock: 0,
          newStock: qty,
          referenceType: 'PURCHASE',
          referenceId: poId,
          reason: `Initial stock from PO #${poId}`,
          userId: user.id || user.name || 'Admin',
          createdAt: now.toISOString()
        });
      }

      const pItemRecord = {
        id: crypto.randomUUID(),
        purchaseId: poId,
        productId: finalProdId,
        name: item.name,
        sku: item.sku || '',
        qty,
        cost,
        gstRate: itemGstPct,
        taxAmount: fromPaise(lineTaxPaise),
        total: fromPaise(lineTotalPaise)
      };
      purchaseItemStore.add(pItemRecord);
      enrichedItems.push(pItemRecord);
    }

    const grandTotalPaise = totalSubtotalPaise + totalTaxPaise;
    const grandTotal = fromPaise(grandTotalPaise);
    const paidPaise = Math.min(grandTotalPaise, Math.max(0, toPaise(purchaseData.paidAmount || 0)));
    const duePaise = Math.max(0, grandTotalPaise - paidPaise);

    const paidAmount = fromPaise(paidPaise);
    const dueAmount = fromPaise(duePaise);
    const status = duePaise === 0 ? 'Completed' : (paidPaise > 0 ? 'Partial' : 'Ordered');

    // Assemble purchase order record
    const purchaseRecord = {
      id: poId,
      date: dateStr,
      supplierId: purchaseData.supplierId || null,
      supplierName: String(purchaseData.supplierName || 'Vendor').trim(),
      items: enrichedItems,
      subtotal: fromPaise(totalSubtotalPaise),
      tax: fromPaise(totalTaxPaise),
      amount: grandTotal,
      paidAmount,
      dueAmount,
      status,
      paymentMethod: purchaseData.paymentMethod || 'Bank Transfer',
      createdAt: now.toISOString()
    };

    // Record payment if paid
    if (paidAmount > 0) {
      paymentStore.add({
        id: `PAY-SUP-${Date.now().toString().slice(-6)}`,
        partyId: purchaseData.supplierId || null,
        partyType: 'SUPPLIER',
        partyName: purchaseRecord.supplierName,
        referenceType: 'PURCHASE',
        referenceId: poId,
        amount: paidAmount,
        paymentMethod: purchaseRecord.paymentMethod,
        transactionRef: purchaseData.transactionRef || '',
        note: `Payment for PO #${poId}`,
        user: user.name || 'Admin',
        date: dateStr,
        createdAt: now.toISOString()
      });
    }

    // Update supplier balance if linked
    if (purchaseData.supplierId) {
      const supplier = await new Promise((res, rej) => {
        const req = supplierStore.get(String(purchaseData.supplierId));
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
      });

      if (supplier) {
        const newBilled = roundTo((Number(supplier.totalPurchased) || 0) + grandTotal, 2);
        const newPaid = roundTo((Number(supplier.totalPaid) || 0) + paidAmount, 2);
        const newDue = Math.max(0, roundTo(newBilled - newPaid, 2));

        supplierStore.put({
          ...supplier,
          totalPurchased: newBilled,
          totalPaid: newPaid,
          currentDue: newDue,
          updatedAt: now.toISOString()
        });
      }
    }

    purchaseStore.add(purchaseRecord);

    // Audit log
    auditStore.add({
      id: crypto.randomUUID(),
      userId: user.id || user.name || 'Admin',
      role: user.role || 'owner',
      action: 'PURCHASE_CREATED',
      entityType: 'PURCHASE',
      entityId: poId,
      details: `Created PO #${poId} for ₹${grandTotal} from ${purchaseRecord.supplierName}`,
      timestamp: now.toISOString()
    });

    return {
      success: true,
      purchase: purchaseRecord,
      updatedProducts
    };
  });
}
