/**
 * Sales & Invoicing Service
 * Handles order creation, multi-item invoicing, atomic stock deduction,
 * inventory rollback on failure, and customer ledger sync.
 */

import { storageService } from './storageService.js';
import { generateInvoiceNumber } from '../utils/invoiceGenerator.js';
import { validateSale } from '../utils/validators.js';
import { calculateSaleTotals, roundTo } from '../utils/calculations.js';
import { inventoryService } from './inventoryService.js';
import { customerService } from './customerService.js';
import { paymentService } from './paymentService.js';

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

  createSale(saleData, user = 'Admin') {
    const products = storageService.getCollection('PRODUCTS');
    const existingSales = this.getAll();

    const totals = calculateSaleTotals(
      saleData.items || [],
      saleData.discount || 0,
      saleData.taxRate || 0
    );

    const saleAmount = saleData.amount !== undefined ? Number(saleData.amount) : totals.amount;
    const saleToValidate = {
      ...saleData,
      amount: saleAmount,
      subtotal: saleData.subtotal !== undefined ? Number(saleData.subtotal) : totals.subtotal,
      tax: saleData.tax !== undefined ? Number(saleData.tax) : totals.tax,
      discount: saleData.discount !== undefined ? Number(saleData.discount) : totals.discount
    };

    // 1. Validation
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

    // Snapshot of previous product stock for safe rollback
    const previousProductSnapshot = JSON.parse(JSON.stringify(products));

    try {
      // 2. Atomic Stock Deduction
      const updatedProducts = products.map(p => {
        const line = saleData.items.find(i => Number(i.productId) === p.id);
        if (line) {
          const qty = Number(line.qty) || 0;
          const newStock = p.stock - qty;
          if (newStock < 0) {
            throw new Error(`Negative stock prohibited for product "${p.name}".`);
          }
          const minStock = Number(p.minStock) || 0;
          const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

          // Record stock movement
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

      // Save updated products
      storageService.setCollection('PRODUCTS', updatedProducts);

      // 3. Payment history
      const paymentHistory = [];
      if (paidAmount > 0) {
        paymentHistory.push({
          id: `PAY-${Date.now().toString().slice(-6)}`,
          date: dateStr,
          amount: paidAmount,
          method: saleData.paymentMethod || 'UPI',
          note: 'Initial payment at invoice creation'
        });

        // Record in central payments
        paymentService.recordPayment({
          saleId: newSaleId,
          amount: paidAmount,
          paymentMethod: saleData.paymentMethod || 'UPI',
          note: `Initial invoice payment #${newSaleId}`,
          user
        });
      }

      // 4. Assemble Sale Invoice
      const newSale = {
        id: newSaleId,
        date: dateStr,
        customerId: saleData.customerId || null,
        customerName: (saleData.customerName || '').trim() || 'Walk-in Customer',
        customerPhone: (saleData.customerPhone || '').trim(),
        customerEmail: (saleData.customerEmail || '').trim(),
        customerAddress: (saleData.customerAddress || '').trim(),
        items: saleData.items || [],
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        amount: saleAmount,
        paidAmount,
        dueAmount,
        status: paymentStatus,
        paymentMethod: saleData.paymentMethod || 'UPI',
        paymentHistory,
        createdAt: now.toISOString()
      };

      // 5. Save sale
      storageService.insertItem(this.collectionName, newSale);

      // 6. Sync Customer ledger
      customerService.syncFromSale(newSale);

      return {
        success: true,
        sale: newSale,
        products: updatedProducts
      };
    } catch (err) {
      // Rollback to previous product state
      storageService.setCollection('PRODUCTS', previousProductSnapshot);
      console.error('Sale transaction failed, rolled back:', err);
      return {
        success: false,
        errors: [err.message || 'Transaction failed. Stock changes rolled back.']
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

    // Restore stock
    const products = storageService.getCollection('PRODUCTS');
    const updatedProducts = products.map(p => {
      const line = (sale.items || []).find(i => Number(i.productId) === p.id);
      if (line) {
        const qty = Number(line.qty) || 0;
        const newStock = p.stock + qty;
        const minStock = Number(p.minStock) || 0;
        const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

        inventoryService.recordMovement({
          productId: p.id,
          productName: p.name,
          type: 'RETURN',
          quantity: qty,
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
