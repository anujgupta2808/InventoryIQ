/**
 * Sales & Invoicing Service
 * Handles order creation, multi-item invoicing, atomic stock deduction,
 * inventory rollback on failure, and customer ledger sync.
 */

import { storageService } from './storageService.js';
import { generateInvoiceNumber } from '../utils/invoiceGenerator.js';
import { validateSale, isPositiveNumber } from '../utils/validators.js';
import { calculateSaleTotals, aggregateSaleItems, roundTo } from '../utils/calculations.js';
import { inventoryService } from './inventoryService.js';
import { customerService } from './customerService.js';
import { paymentService } from './paymentService.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

export class SalesService {
  constructor() {
    this.collectionName = 'SALES';
  }

  getAll() {
    return storageService.getCollection(this.collectionName);
  }

  getById(id) {
    return storageService.getItemById(this.collectionName, id);
  }

  recordSale(saleData, user = 'Admin', organizationId = null) {
    return this.createSale(saleData, user, organizationId);
  }

  createSale(saleData, user = 'Admin', organizationId = null) {
    const products = storageService.getCollection('PRODUCTS');
    const existingSales = this.getAll();

    // 1. Normalize duplicate product lines to prevent stock deduction glitches
    const rawItems = Array.isArray(saleData.items) ? saleData.items : [];
    const enrichedRawItems = rawItems.map(item => {
      const p = products.find(prod => String(prod.id) === String(item.productId));
      return {
        ...item,
        name: item.name || p?.name || 'Product',
        price: item.price !== undefined ? Number(item.price) : (p ? Number(p.price) : 0),
        gstRate: item.gstRate !== undefined ? Number(item.gstRate) : (p?.gstRate !== undefined ? Number(p.gstRate) : Number(saleData.taxRate || 0))
      };
    });
    const normalizedItems = aggregateSaleItems(enrichedRawItems);

    // 2. Server-authoritative totals (never trust client total)
    const isInterState = Boolean(saleData.isInterState);
    const totals = calculateSaleTotals(
      normalizedItems,
      saleData.discount || 0,
      saleData.taxRate || 0,
      {
        isInterState,
        discountType: saleData.discountType || 'fixed'
      }
    );
    const saleAmount = totals.amount;

    const saleToValidate = {
      ...saleData,
      items: normalizedItems,
      amount: saleAmount,
      subtotal: totals.subtotal,
      taxableAmount: totals.taxableAmount,
      tax: totals.tax,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      isInterState,
      discount: totals.discount
    };

    // 3. Strict Validation
    const validation = validateSale(saleToValidate, products);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const paidAmount = saleData.paidAmount !== undefined
      ? Math.max(0, Math.min(saleAmount, roundTo(Number(saleData.paidAmount) || 0)))
      : saleAmount;
    const dueAmount = roundTo(Math.max(0, saleAmount - paidAmount));
    const paymentStatus = dueAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid');

    const newSaleId = saleData.id || generateInvoiceNumber('S', existingSales);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Snapshot of previous product stock for safe atomic rollback
    const previousProductSnapshot = JSON.parse(JSON.stringify(products));

    try {
      let totalCogs = 0;

      // 4. Atomic Stock Deduction using aggregated quantities
      const updatedProducts = products.map(p => {
        const line = normalizedItems.find(i => String(i.productId) === String(p.id));
        if (line) {
          const qty = Number(line.qty) || 0;
          const newStock = roundTo(p.stock - qty, 2);
          if (newStock < 0) {
            throw new Error(`Negative stock prohibited for product "${p.name}". Required: ${qty}, Available: ${p.stock}`);
          }
          const minStock = Number(p.minStock) || 0;
          const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

          // Track COGS: quantity * cost_at_sale
          const unitCost = Number(p.costPrice || 0);
          totalCogs += unitCost * qty;

          // Record immutable stock movement
          inventoryService.recordMovement({
            productId: p.id,
            productName: p.name,
            type: 'SALE',
            quantity: -qty,
            previousStock: p.stock,
            newStock,
            referenceId: newSaleId,
            reason: `Sale Invoice #${newSaleId}`,
            user
          });

          return { ...p, stock: newStock, status, updatedAt: now.toISOString() };
        }
        return p;
      });

      // Save updated products atomically
      storageService.setCollection('PRODUCTS', updatedProducts);

      // 5. Enrich line items with cost_at_sale for COGS accounting
      const enrichedItems = normalizedItems.map(item => {
        const matchedProd = products.find(p => String(p.id) === String(item.productId));
        const unitCost = matchedProd ? Number(matchedProd.costPrice || 0) : Number(item.cost || item.costPrice || 0);
        return {
          ...item,
          cost: unitCost,
          costPrice: unitCost,
          cost_at_sale: unitCost
        };
      });

      // 6. Payment history
      const paymentHistory = [];
      if (paidAmount > 0) {
        const paymentRecordId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? `PAY_${crypto.randomUUID()}`
          : `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        paymentHistory.push({
          id: paymentRecordId,
          date: dateStr,
          amount: paidAmount,
          method: saleData.paymentMethod || 'UPI',
          note: 'Initial payment at invoice creation'
        });

        // Record in central payments ledger
        paymentService.recordPayment({
          saleId: newSaleId,
          customerId: saleData.customerId || null,
          customerName: saleData.customerName || 'Walk-in Customer',
          amount: paidAmount,
          paymentMethod: saleData.paymentMethod || 'UPI',
          note: `Initial invoice payment #${newSaleId}`,
          user
        });
      }

      // 7. Assemble Complete Sale Invoice
      const newSale = {
        id: newSaleId,
        date: dateStr,
        customerId: saleData.customerId || null,
        customerName: (saleData.customerName || '').trim() || 'Walk-in Customer',
        customerPhone: (saleData.customerPhone || '').trim(),
        customerEmail: (saleData.customerEmail || '').trim(),
        customerAddress: (saleData.customerAddress || '').trim(),
        items: enrichedItems,
        subtotal: totals.subtotal,
        taxableAmount: totals.taxableAmount,
        tax: totals.tax,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        isInterState,
        discount: totals.discount,
        amount: saleAmount,
        paidAmount,
        dueAmount,
        status: paymentStatus,
        paymentMethod: saleData.paymentMethod || 'UPI',
        cogs: roundTo(totalCogs),
        paymentHistory,
        createdAt: now.toISOString()
      };

      // 8. Save sale in storage
      storageService.insertItem(this.collectionName, newSale);

      // 9. Sync Customer ledger
      customerService.syncFromSale(newSale);

      return {
        success: true,
        sale: newSale
      };
    } catch (err) {
      // Atomic Rollback on any failure
      storageService.setCollection('PRODUCTS', previousProductSnapshot);
      console.error('Sale transaction rolled back:', err);
      return {
        success: false,
        errors: [err.message || 'Sale transaction failed. All changes rolled back.']
      };
    }
  }

  cancelSale(saleId, reason = 'Invoice Cancelled', user = 'Admin') {
    const sale = this.getById(saleId);
    if (!sale) {
      return { success: false, message: 'Sale not found.' };
    }

    if (sale.status === 'Cancelled') {
      return { success: false, message: 'Sale is already cancelled.' };
    }

    // Restore stock - aggregate duplicate product lines to prevent single-match under-restoration bug
    const qtyByProduct = new Map();
    (sale.items || []).forEach(i => {
      const pId = String(i.productId || i.id);
      const q = Number(i.qty) || 0;
      qtyByProduct.set(pId, (qtyByProduct.get(pId) || 0) + q);
    });

    const products = storageService.getCollection('PRODUCTS');
    const updatedProducts = products.map(p => {
      const pIdStr = String(p.id);
      if (qtyByProduct.has(pIdStr)) {
        const qtyToRestore = qtyByProduct.get(pIdStr);
        const newStock = roundTo(p.stock + qtyToRestore, 3);
        const minStock = Number(p.minStock) || 0;
        const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

        inventoryService.recordMovement({
          productId: p.id,
          productName: p.name,
          type: 'SALE_CANCEL',
          quantity: qtyToRestore,
          previousStock: p.stock,
          newStock,
          referenceId: saleId,
          reason,
          user
        });

        return { ...p, stock: newStock, status };
      }
      return p;
    });

    storageService.setCollection('PRODUCTS', updatedProducts);

    // If sale had any payment recorded, record a refund payment to ledger
    if (Number(sale.paidAmount) > 0) {
      paymentService.recordPayment({
        saleId: sale.id,
        customerId: sale.customerId || null,
        customerName: sale.customerName || 'Walk-in Customer',
        amount: -Number(sale.paidAmount),
        paymentMethod: sale.paymentMethod || 'UPI',
        note: `Refund on invoice cancellation #${sale.id}`,
        user
      });
    }

    // Sync Customer ledger & reconcile balances
    customerService.syncFromSaleCancellation(sale);
    customerService.reconcileBalances();

    const updatedSale = storageService.updateItem(this.collectionName, saleId, {
      status: 'Cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason
    });

    return {
      success: true,
      sale: updatedSale,
      products: updatedProducts
    };
  }

  returnSaleItem({ saleId, productId, quantity, reason = 'Customer Return', user = 'Admin' }) {
    const sale = this.getById(saleId);
    if (!sale) {
      const msg = 'Sale invoice not found.';
      return { success: false, message: msg, errors: [msg] };
    }
    if (sale.status === 'Cancelled') {
      const msg = 'Cannot return items from a cancelled sale.';
      return { success: false, message: msg, errors: [msg] };
    }

    const qtyToReturn = Number(quantity);
    if (!isPositiveNumber(qtyToReturn) || !isFinite(qtyToReturn)) {
      const msg = 'Return quantity must be a positive number.';
      return { success: false, message: msg, errors: [msg] };
    }

    const prodIdStr = String(productId);
    const itemIndex = (sale.items || []).findIndex(i => String(i.productId || i.id) === prodIdStr);
    if (itemIndex < 0) {
      const msg = 'Product not found in this sale invoice.';
      return { success: false, message: msg, errors: [msg] };
    }

    const item = sale.items[itemIndex];
    const alreadyReturned = Number(item.returnedQty || 0);
    const maxReturnable = roundTo(Number(item.qty || 0) - alreadyReturned, 3);

    if (qtyToReturn > maxReturnable) {
      const msg = `Cannot return ${qtyToReturn} units. Maximum returnable quantity for this item is ${maxReturnable}.`;
      return {
        success: false,
        message: msg,
        errors: [msg]
      };
    }

    // 1. Restore product stock
    const products = storageService.getCollection('PRODUCTS');
    const pIdx = products.findIndex(p => String(p.id) === prodIdStr);
    let updatedProduct = null;

    if (pIdx >= 0) {
      const prod = products[pIdx];
      const newStock = roundTo(prod.stock + qtyToReturn, 3);
      const minStock = Number(prod.minStock) || 0;
      const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

      updatedProduct = {
        ...prod,
        stock: newStock,
        status,
        updatedAt: new Date().toISOString()
      };
      products[pIdx] = updatedProduct;
      storageService.setCollection('PRODUCTS', products);

      // Record immutable stock movement
      inventoryService.recordMovement({
        productId: prod.id,
        productName: prod.name,
        type: 'RETURN',
        quantity: qtyToReturn,
        previousStock: prod.stock,
        newStock,
        referenceId: saleId,
        reason: `Customer return from invoice #${saleId}: ${reason}`,
        user
      });
    }

    // 2. Update sale item return tracking
    const updatedItems = [...sale.items];
    updatedItems[itemIndex] = {
      ...item,
      returnedQty: roundTo(alreadyReturned + qtyToReturn, 3)
    };

    const isEntireSaleReturned = updatedItems.every(i => (Number(i.returnedQty || 0) >= Number(i.qty || 0)));
    const newStatus = isEntireSaleReturned ? 'Returned' : (sale.status === 'Paid' ? 'Paid' : sale.status);

    const updatedSale = storageService.updateItem(this.collectionName, saleId, {
      items: updatedItems,
      status: newStatus,
      lastReturnedAt: new Date().toISOString()
    });

    return {
      success: true,
      sale: updatedSale,
      product: updatedProduct
    };
  }
}

export const salesService = new SalesService();
