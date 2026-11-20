/**
 * Inventory Service
 * Manages physical stock adjustments, stock movement audit trail,
 * and inventory valuation metrics.
 */

import { storageService } from './storageService.js';
import { calculateStockValuation, roundTo } from '../utils/calculations.js';

export class InventoryService {
  constructor() {
    this.movementsCollection = 'STOCK_MOVEMENTS';
    this.productsCollection = 'PRODUCTS';
  }

  getStockMovements(filters = {}) {
    let movements = storageService.getCollection(this.movementsCollection);

    if (filters.productId) {
      movements = movements.filter(m => String(m.productId) === String(filters.productId));
    }
    if (filters.type) {
      movements = movements.filter(m => m.type && m.type.toUpperCase() === filters.type.toUpperCase());
    }

    return movements;
  }

  getMovements(productId) {
    return this.getStockMovements({ productId });
  }

  recordMovement({
    productId,
    productName,
    type, // 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN'
    quantity,
    previousStock,
    newStock,
    referenceId = '',
    reason = '',
    user = 'Admin'
  }) {
    const movementId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? `MOV_${crypto.randomUUID()}`
      : `MOV_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const movement = {
      id: movementId,
      productId: String(productId),
      productName: productName || 'Product',
      type: type.toUpperCase(),
      quantity: Number(quantity),
      previousStock: Number(previousStock),
      newStock: Number(newStock),
      referenceId: String(referenceId),
      reason: reason || `Inventory ${type.toLowerCase()}`,
      user: user || 'Admin',
      createdAt: new Date().toISOString()
    };

    storageService.insertItem(this.movementsCollection, movement);
    return movement;
  }

  adjustStock(arg1, arg2, arg3, arg4) {
    let productId, adjustmentQty, type, reason, user;
    if (typeof arg1 === 'object' && arg1 !== null) {
      ({ productId, adjustmentQty, type = 'ADJUSTMENT', reason = 'Manual Adjustment', user = 'Admin' } = arg1);
    } else {
      productId = arg1;
      adjustmentQty = arg2;
      reason = arg3 || 'Manual Adjustment';
      user = arg4 || 'Admin';
      type = 'ADJUSTMENT';
    }

    const product = storageService.getItemById(this.productsCollection, productId);
    if (!product) {
      const msg = 'Product not found.';
      return { success: false, message: msg, errors: [msg] };
    }

    const currentStock = Number(product.stock) || 0;
    const delta = Number(adjustmentQty);

    if (isNaN(delta) || !isFinite(delta) || delta === 0) {
      const msg = 'Adjustment quantity must be a non-zero valid number.';
      return { success: false, message: msg, errors: [msg] };
    }

    // Business Rule Invariant: Stock must never become negative
    if (currentStock + delta < 0) {
      const msg = `Adjustment rejected: negative stock prohibited. Available: ${currentStock}, Requested change: ${delta}.`;
      return {
        success: false,
        message: msg,
        errors: [msg]
      };
    }

    const newStock = roundTo(currentStock + delta, 3);
    const minStock = Number(product.minStock) || 0;
    const newStatus = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

    const updatedProduct = storageService.updateItem(this.productsCollection, productId, {
      stock: newStock,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    const normalizedType = String(type || 'ADJUSTMENT').toUpperCase();
    const movement = this.recordMovement({
      productId,
      productName: product.name,
      type: normalizedType,
      quantity: delta,
      previousStock: currentStock,
      newStock,
      reason,
      user
    });

    return {
      success: true,
      product: updatedProduct,
      movement
    };
  }

  getValuation() {
    const products = storageService.getCollection(this.productsCollection);
    return calculateStockValuation(products);
  }
}

export const inventoryService = new InventoryService();
