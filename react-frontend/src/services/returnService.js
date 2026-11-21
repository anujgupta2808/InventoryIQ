/**
 * Returns & Reversals Management Service
 * Handles Customer Returns and Supplier Returns with full auditable reverse transactions,
 * decimal precision, strict business rule enforcement, atomic rollback, and credit/debit notes.
 */

import { storageService } from './storageService.js';
import { inventoryService } from './inventoryService.js';
import { paymentService } from './paymentService.js';
import { customerService } from './customerService.js';
import { roundTo } from '../utils/calculations.js';
import { isPositiveNumber } from '../utils/validators.js';

export class ReturnService {
  constructor() {
    this.collectionName = 'RETURNS';
    this.salesCollection = 'SALES';
    this.purchasesCollection = 'PURCHASES';
    this.productsCollection = 'PRODUCTS';
    this.movementsCollection = 'STOCK_MOVEMENTS';
    this.processedKeys = new Map();
    this.activeInFlight = new Set();
  }

  reset() {
    this.processedKeys.clear();
    this.activeInFlight.clear();
  }

  getAll() {
    return storageService.getCollection(this.collectionName);
  }

  getById(id) {
    return storageService.getItemById(this.collectionName, id);
  }

  getReturnsByTransaction(transactionId) {
    const returns = this.getAll();
    const target = String(transactionId || '').trim();
    return returns.filter(r => String(r.originalTransactionId) === target);
  }

  getReturns(filters = {}) {
    let returns = this.getAll();
    if (filters.type) {
      const typeUpper = String(filters.type).toUpperCase();
      returns = returns.filter(r => r.type && r.type.toUpperCase() === typeUpper);
    }
    if (filters.productId) {
      const prodTarget = String(filters.productId);
      returns = returns.filter(r => String(r.originalProductId) === prodTarget);
    }
    if (filters.transactionId) {
      const txTarget = String(filters.transactionId);
      returns = returns.filter(r => String(r.originalTransactionId) === txTarget);
    }
    return returns;
  }

  /**
   * Helper to check remaining returnable quantity for a given transaction item
   */
  calculateRemainingReturnable(transactionType, transactionId, productId) {
    const isSale = String(transactionType).toUpperCase() === 'SALE' || String(transactionType).toUpperCase() === 'CUSTOMER';
    const prodTarget = String(productId);

    if (isSale) {
      const sale = storageService.getItemById(this.salesCollection, transactionId);
      if (!sale || sale.status === 'Cancelled') {
        return { success: false, remaining: 0, message: 'Sale not found or is cancelled.' };
      }
      const item = (sale.items || []).find(i => String(i.productId || i.id) === prodTarget);
      if (!item) {
        return { success: false, remaining: 0, message: 'Product not found in sale invoice.' };
      }
      const originalQty = Number(item.qty) || 0;
      const returnedQty = Number(item.returnedQty) || 0;
      const remaining = roundTo(Math.max(0, originalQty - returnedQty), 3);
      return { success: true, originalQty, returnedQty, remaining };
    } else {
      const po = storageService.getItemById(this.purchasesCollection, transactionId);
      if (!po || po.status === 'Cancelled') {
        return { success: false, remaining: 0, message: 'Purchase order not found or is cancelled.' };
      }
      const item = (po.items || []).find(i => 
        (i.productId && String(i.productId) === prodTarget) ||
        (i.id && String(i.id) === prodTarget)
      );
      if (!item) {
        return { success: false, remaining: 0, message: 'Product not found in purchase order.' };
      }
      const receivedQty = Number(item.receivedQty !== undefined ? item.receivedQty : (po.status === 'Completed' ? item.qty : 0));
      const returnedQty = Number(item.returnedQty) || 0;
      const remaining = roundTo(Math.max(0, receivedQty - returnedQty), 3);
      return { success: true, originalQty: receivedQty, returnedQty, remaining };
    }
  }

  /**
   * CUSTOMER RETURN
   * Sale -> Stock decreases
   * Customer Return -> Stock increases
   */
  processCustomerReturn({
    saleId,
    productId,
    quantity,
    reason = 'Customer Return',
    user = 'Admin',
    idempotencyKey = null,
    refundPayment = true
  }) {
    // 1. Idempotency Check
    if (idempotencyKey && this.processedKeys.has(idempotencyKey)) {
      return { ...this.processedKeys.get(idempotencyKey), idempotentReplay: true };
    }

    // 2. In-flight duplicate submission lock
    const inFlightKey = `CUST_${saleId}_${productId}_${quantity}`;
    if (this.activeInFlight.has(inFlightKey)) {
      const msg = 'Duplicate return submission currently processing. Please wait.';
      return { success: false, message: msg, errors: [msg] };
    }

    // 3. Validation: Sale Lookup
    const sale = storageService.getItemById(this.salesCollection, saleId);
    if (!sale) {
      const msg = 'Sale invoice not found.';
      return { success: false, message: msg, errors: [msg] };
    }

    if (sale.status === 'Cancelled') {
      const msg = 'Cannot return items from a cancelled sale invoice.';
      return { success: false, message: msg, errors: [msg] };
    }

    // 4. Validation: Quantity Checks
    const returnQty = Number(quantity);
    if (!isPositiveNumber(returnQty) || !isFinite(returnQty) || returnQty <= 0) {
      const msg = 'Return quantity must be a positive number greater than zero.';
      return { success: false, message: msg, errors: [msg] };
    }

    // 5. Validation: Product Lookup in Sale
    const prodTarget = String(productId);
    const itemIndex = (sale.items || []).findIndex(i => String(i.productId || i.id) === prodTarget);
    if (itemIndex < 0) {
      const msg = 'Product is not part of this sale invoice.';
      return { success: false, message: msg, errors: [msg] };
    }

    const item = sale.items[itemIndex];
    const originalQuantity = Number(item.qty || 0);
    const previouslyReturnedQuantity = Number(item.returnedQty || 0);
    const remainingReturnableQuantity = roundTo(originalQuantity - previouslyReturnedQuantity, 3);

    // 6. Validation: Check Return Limit
    if (remainingReturnableQuantity <= 0) {
      const msg = `All sold units (${originalQuantity}) for this item have already been returned. Duplicate return prohibited.`;
      return { success: false, message: msg, errors: [msg] };
    }

    if (returnQty > remainingReturnableQuantity) {
      const msg = `Cannot return ${returnQty} units. Maximum remaining returnable quantity for this item is ${remainingReturnableQuantity}.`;
      return { success: false, message: msg, errors: [msg] };
    }

    // 7. Validation: Product Catalog Lookup
    const products = storageService.getCollection(this.productsCollection);
    const pIdx = products.findIndex(p => String(p.id) === prodTarget);
    if (pIdx < 0) {
      const msg = 'Product not found in product catalog.';
      return { success: false, message: msg, errors: [msg] };
    }

    this.activeInFlight.add(inFlightKey);

    // Snapshot pre-operation state for ACID atomic rollback
    const productsSnapshot = JSON.parse(JSON.stringify(products));
    const salesSnapshot = JSON.parse(JSON.stringify(storageService.getCollection(this.salesCollection)));
    const returnsSnapshot = JSON.parse(JSON.stringify(storageService.getCollection(this.collectionName)));
    const movementsSnapshot = JSON.parse(JSON.stringify(storageService.getCollection(this.movementsCollection)));
    const paymentsSnapshot = JSON.parse(JSON.stringify(storageService.getCollection('PAYMENTS')));

    try {
      const prod = products[pIdx];
      const previousStock = Number(prod.stock) || 0;
      const newStock = roundTo(previousStock + returnQty, 3);
      const minStock = Number(prod.minStock) || 0;
      const newProductStatus = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

      // 8. Update Inventory Stock (Customer return increases stock)
      const updatedProduct = {
        ...prod,
        stock: newStock,
        status: newProductStatus,
        updatedAt: new Date().toISOString()
      };
      products[pIdx] = updatedProduct;
      storageService.setCollection(this.productsCollection, products);

      // 9. Auditable Stock Movement
      const movement = inventoryService.recordMovement({
        productId: prod.id,
        productName: prod.name,
        type: 'CUSTOMER_RETURN',
        quantity: returnQty, // Positive for customer return
        previousStock,
        newStock,
        referenceId: String(sale.id),
        reason: `Customer return from invoice #${sale.id}: ${reason}`,
        user: user || 'Admin'
      });

      // 10. Financial Calculations & Credit Note
      const unitPrice = Number(item.price || 0);
      const itemDiscountPercent = Number(item.discount || 0);
      const gstRate = Number(item.gstRate !== undefined ? item.gstRate : (sale.taxRate || 0));

      const rawSubtotal = unitPrice * returnQty;
      const discountAmount = rawSubtotal * (itemDiscountPercent / 100);
      const taxableAmount = Math.max(0, rawSubtotal - discountAmount);
      const taxAmount = taxableAmount * (gstRate / 100);
      const refundAmount = roundTo(taxableAmount + taxAmount, 2);

      const creditNoteNumber = `CN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      // 11. Update Sale Invoice Record
      const updatedItems = [...sale.items];
      const newReturnedQty = roundTo(previouslyReturnedQuantity + returnQty, 3);
      updatedItems[itemIndex] = {
        ...item,
        returnedQty: newReturnedQty
      };

      const isEntireSaleReturned = updatedItems.every(i => (Number(i.returnedQty || 0) >= Number(i.qty || 0)));
      const newSaleStatus = isEntireSaleReturned ? 'Returned' : (sale.status === 'Paid' ? 'Paid' : sale.status);

      const totalReturnedAmount = roundTo((Number(sale.returnedAmount) || 0) + refundAmount, 2);
      const currentDue = Number(sale.dueAmount) || 0;
      const newDue = roundTo(Math.max(0, currentDue - refundAmount));

      const returnMetadata = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? `RET_${crypto.randomUUID()}` : `RET_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        creditNoteNumber,
        productId: prod.id,
        productName: prod.name,
        quantity: returnQty,
        refundAmount,
        reason,
        date: new Date().toISOString()
      };

      const updatedSale = storageService.updateItem(this.salesCollection, saleId, {
        items: updatedItems,
        status: newSaleStatus,
        returnedAmount: totalReturnedAmount,
        dueAmount: newDue,
        lastReturnedAt: new Date().toISOString(),
        returns: [...(sale.returns || []), returnMetadata]
      });

      // 12. Payment Ledger Refund (if refund enabled & original invoice was paid/partially paid)
      if (refundPayment && Number(sale.paidAmount || 0) > 0) {
        paymentService.recordPayment({
          saleId: sale.id,
          customerId: sale.customerId || null,
          customerName: sale.customerName || 'Walk-in Customer',
          amount: -refundAmount,
          paymentMethod: sale.paymentMethod || 'Cash',
          note: `Credit Note #${creditNoteNumber} refund for invoice #${sale.id}`,
          user: user || 'Admin'
        });
      }

      // 13. Customer Balance Reconciliation
      if (customerService && typeof customerService.reconcileBalances === 'function') {
        customerService.reconcileBalances();
      }

      // 14. Create Auditable Return Record in RETURNS collection
      const returnRecord = {
        id: returnMetadata.id,
        type: 'CUSTOMER_RETURN',
        transactionType: 'SALE',
        originalTransactionId: String(sale.id),
        originalProductId: String(prod.id),
        productName: prod.name,
        originalQuantity,
        previouslyReturnedQuantity,
        currentReturnQuantity: returnQty,
        remainingReturnableQuantity: roundTo(remainingReturnableQuantity - returnQty, 3),
        returnReason: reason,
        returnDate: new Date().toISOString(),
        user: user || 'Admin',
        stockMovementId: movement.id,
        unitPrice,
        refundAmount,
        creditNoteNumber,
        createdAt: new Date().toISOString()
      };

      storageService.insertItem(this.collectionName, returnRecord);

      const response = {
        success: true,
        returnRecord,
        sale: updatedSale,
        product: updatedProduct,
        movement,
        creditNoteNumber,
        refundAmount
      };

      if (idempotencyKey) {
        this.processedKeys.set(idempotencyKey, response);
      }

      return response;
    } catch (err) {
      // ATOMIC TRANSACTION ROLLBACK
      console.error('[ReturnService] Error during customer return, rolling back all stores:', err);
      storageService.setCollection(this.productsCollection, productsSnapshot);
      storageService.setCollection(this.salesCollection, salesSnapshot);
      storageService.setCollection(this.collectionName, returnsSnapshot);
      storageService.setCollection(this.movementsCollection, movementsSnapshot);
      storageService.setCollection('PAYMENTS', paymentsSnapshot);

      return {
        success: false,
        message: err.message || 'Customer return failed. All changes rolled back.',
        errors: [err.message || 'Transaction aborted.']
      };
    } finally {
      this.activeInFlight.delete(inFlightKey);
    }
  }

  /**
   * SUPPLIER RETURN
   * Purchase Receipt -> Stock increases
   * Supplier Return -> Stock decreases
   */
  processSupplierReturn({
    purchaseId,
    productId,
    quantity,
    reason = 'Supplier Return',
    user = 'Admin',
    idempotencyKey = null
  }) {
    // 1. Idempotency Check
    if (idempotencyKey && this.processedKeys.has(idempotencyKey)) {
      return { ...this.processedKeys.get(idempotencyKey), idempotentReplay: true };
    }

    // 2. In-flight duplicate submission check
    const inFlightKey = `SUPP_${purchaseId}_${productId}_${quantity}`;
    if (this.activeInFlight.has(inFlightKey)) {
      const msg = 'Duplicate return submission currently processing. Please wait.';
      return { success: false, message: msg, errors: [msg] };
    }

    // 3. Validation: Purchase Order Lookup
    const po = storageService.getItemById(this.purchasesCollection, purchaseId);
    if (!po) {
      const msg = 'Purchase order not found.';
      return { success: false, message: msg, errors: [msg] };
    }

    if (po.status === 'Cancelled') {
      const msg = 'Cannot return items from a cancelled purchase order.';
      return { success: false, message: msg, errors: [msg] };
    }

    // 4. Validation: Quantity Checks
    const returnQty = Number(quantity);
    if (!isPositiveNumber(returnQty) || !isFinite(returnQty) || returnQty <= 0) {
      const msg = 'Return quantity must be a positive number greater than zero.';
      return { success: false, message: msg, errors: [msg] };
    }

    // 5. Validation: Product Lookup in Purchase Order
    const prodTarget = String(productId);
    const itemIndex = (po.items || []).findIndex(i => 
      (i.productId && String(i.productId) === prodTarget) ||
      (i.id && String(i.id) === prodTarget)
    );
    if (itemIndex < 0) {
      const msg = 'Product is not part of this purchase order.';
      return { success: false, message: msg, errors: [msg] };
    }

    const item = po.items[itemIndex];
    // Calculate received quantity: only received items can be returned!
    const receivedQty = Number(item.receivedQty !== undefined ? item.receivedQty : (po.status === 'Completed' ? item.qty : 0));
    if (receivedQty <= 0) {
      const msg = 'No received units available to return for this purchase order item.';
      return { success: false, message: msg, errors: [msg] };
    }

    const previouslyReturnedQuantity = Number(item.returnedQty || 0);
    const remainingReturnableQuantity = roundTo(receivedQty - previouslyReturnedQuantity, 3);

    // 6. Validation: Check Return Limit against Received Quantity
    if (remainingReturnableQuantity <= 0) {
      const msg = `All received units (${receivedQty}) for this item have already been returned. Duplicate return prohibited.`;
      return { success: false, message: msg, errors: [msg] };
    }

    if (returnQty > remainingReturnableQuantity) {
      const msg = `Cannot return ${returnQty} units. Maximum remaining returnable quantity for this item is ${remainingReturnableQuantity}.`;
      return { success: false, message: msg, errors: [msg] };
    }

    // 7. Validation: Product Catalog Lookup & Physical Stock Availability
    const products = storageService.getCollection(this.productsCollection);
    const pIdx = products.findIndex(p => String(p.id) === prodTarget);
    if (pIdx < 0) {
      const msg = 'Product not found in product catalog.';
      return { success: false, message: msg, errors: [msg] };
    }

    const prod = products[pIdx];
    const previousStock = Number(prod.stock) || 0;
    if (previousStock < returnQty) {
      const msg = `Insufficient stock on hand to return to supplier. Available: ${previousStock}, Requested: ${returnQty}.`;
      return { success: false, message: msg, errors: [msg] };
    }

    this.activeInFlight.add(inFlightKey);

    // Snapshot pre-operation state for ACID atomic rollback
    const productsSnapshot = JSON.parse(JSON.stringify(products));
    const purchasesSnapshot = JSON.parse(JSON.stringify(storageService.getCollection(this.purchasesCollection)));
    const returnsSnapshot = JSON.parse(JSON.stringify(storageService.getCollection(this.collectionName)));
    const movementsSnapshot = JSON.parse(JSON.stringify(storageService.getCollection(this.movementsCollection)));

    try {
      const newStock = roundTo(previousStock - returnQty, 3);
      const minStock = Number(prod.minStock) || 0;
      const newProductStatus = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

      // 8. Update Inventory Stock (Supplier return decreases stock)
      const updatedProduct = {
        ...prod,
        stock: newStock,
        status: newProductStatus,
        updatedAt: new Date().toISOString()
      };
      products[pIdx] = updatedProduct;
      storageService.setCollection(this.productsCollection, products);

      // 9. Auditable Stock Movement
      const movement = inventoryService.recordMovement({
        productId: prod.id,
        productName: prod.name,
        type: 'SUPPLIER_RETURN',
        quantity: -returnQty, // Negative for supplier return
        previousStock,
        newStock,
        referenceId: String(po.id),
        reason: `Supplier return for PO #${po.id}: ${reason}`,
        user: user || 'Admin'
      });

      // 10. Financial Calculations & Debit Note
      const unitCost = Number(item.cost !== undefined ? item.cost : (item.price || prod.costPrice || 0));
      const gstRate = Number(item.gstRate !== undefined ? item.gstRate : (po.taxRate || 0));
      const debitAmount = roundTo((unitCost * returnQty) * (1 + (gstRate / 100)), 2);
      const debitNoteNumber = `DN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      // 11. Update Purchase Order Record
      const updatedItems = [...po.items];
      const newReturnedQty = roundTo(previouslyReturnedQuantity + returnQty, 3);
      updatedItems[itemIndex] = {
        ...item,
        returnedQty: newReturnedQty
      };

      const isEntirePoReturned = updatedItems.every(i => {
        const itemRec = Number(i.receivedQty !== undefined ? i.receivedQty : (po.status === 'Completed' ? i.qty : 0));
        return (Number(i.returnedQty || 0) >= itemRec);
      });
      const newPoStatus = isEntirePoReturned ? 'Returned' : po.status;
      const totalReturnedAmount = roundTo((Number(po.returnedAmount) || 0) + debitAmount, 2);

      const returnMetadata = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? `RET_${crypto.randomUUID()}` : `RET_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        debitNoteNumber,
        productId: prod.id,
        productName: prod.name,
        quantity: returnQty,
        debitAmount,
        reason,
        date: new Date().toISOString()
      };

      const updatedPo = storageService.updateItem(this.purchasesCollection, purchaseId, {
        items: updatedItems,
        status: newPoStatus,
        returnedAmount: totalReturnedAmount,
        lastReturnedAt: new Date().toISOString(),
        returns: [...(po.returns || []), returnMetadata]
      });

      // 12. Create Auditable Return Record in RETURNS collection
      const returnRecord = {
        id: returnMetadata.id,
        type: 'SUPPLIER_RETURN',
        transactionType: 'PURCHASE',
        originalTransactionId: String(po.id),
        originalProductId: String(prod.id),
        productName: prod.name,
        originalQuantity: receivedQty,
        previouslyReturnedQuantity,
        currentReturnQuantity: returnQty,
        remainingReturnableQuantity: roundTo(remainingReturnableQuantity - returnQty, 3),
        returnReason: reason,
        returnDate: new Date().toISOString(),
        user: user || 'Admin',
        stockMovementId: movement.id,
        unitCost,
        debitAmount,
        debitNoteNumber,
        createdAt: new Date().toISOString()
      };

      storageService.insertItem(this.collectionName, returnRecord);

      const response = {
        success: true,
        returnRecord,
        purchase: updatedPo,
        product: updatedProduct,
        movement,
        debitNoteNumber,
        debitAmount
      };

      if (idempotencyKey) {
        this.processedKeys.set(idempotencyKey, response);
      }

      return response;
    } catch (err) {
      // ATOMIC TRANSACTION ROLLBACK
      console.error('[ReturnService] Error during supplier return, rolling back all stores:', err);
      storageService.setCollection(this.productsCollection, productsSnapshot);
      storageService.setCollection(this.purchasesCollection, purchasesSnapshot);
      storageService.setCollection(this.collectionName, returnsSnapshot);
      storageService.setCollection(this.movementsCollection, movementsSnapshot);

      return {
        success: false,
        message: err.message || 'Supplier return failed. All changes rolled back.',
        errors: [err.message || 'Transaction aborted.']
      };
    } finally {
      this.activeInFlight.delete(inFlightKey);
    }
  }
}

export const returnService = new ReturnService();
