/**
 * Sales & Invoicing Service
 * Handles order creation, multi-item invoicing, atomic stock deduction,
 * inventory rollback on failure, and customer ledger sync.
 */

import { storageService } from './storageService.js';
import { generateInvoiceNumber } from '../utils/invoiceGenerator.js';
import { validateSale } from '../utils/validators.js';
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

  createSale(saleData, user = 'Admin', organizationId = null) {
    const products = storageService.getCollection('PRODUCTS');
    const existingSales = this.getAll();

    // 1. Normalize duplicate product lines to prevent stock deduction glitches
    const rawItems = Array.isArray(saleData.items) ? saleData.items : [];
    const normalizedItems = aggregateSaleItems(rawItems);

    // 2. Server-authoritative totals (never trust client total)
    const totals = calculateSaleTotals(
      normalizedItems,
      saleData.discount || 0,
      saleData.taxRate || 0
    );
    const saleAmount = totals.amount;

    const saleToValidate = {
      ...saleData,
      items: normalizedItems,
      amount: saleAmount,
      subtotal: totals.subtotal,
      tax: totals.tax,
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

    const newSaleId = generateInvoiceNumber('S', existingSales);
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
        tax: totals.tax,
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
          type: 'RETURN',
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
}

export const salesService = new SalesService();
