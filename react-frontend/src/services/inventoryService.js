/**
 * Inventory Service
 * Manages physical stock adjustments, stock movement audit trail,
 * and inventory valuation metrics.
 */

import { storageService } from './storageService.js';
import { calculateStockValuation } from '../utils/calculations.js';

export class InventoryService {
  constructor() {
    this.movementsCollection = 'STOCK_MOVEMENTS';
    this.productsCollection = 'PRODUCTS';
  }

  getStockMovements(filters = {}) {
    let movements = storageService.getCollection(this.movementsCollection);

    if (filters.productId) {
      movements = movements.filter(m => Number(m.productId) === Number(filters.productId));
    }
    if (filters.type) {
      movements = movements.filter(m => m.type && m.type.toUpperCase() === filters.type.toUpperCase());
    }

    return movements;
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
    const movement = {
      id: `MOV-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`,
      productId: Number(productId),
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

  adjustStock({ productId, adjustmentQty, reason = 'Manual Adjustment', user = 'Admin' }) {
    const product = storageService.getItemById(this.productsCollection, productId);
    if (!product) {
      return { success: false, message: 'Product not found.' };
    }

    const currentStock = Number(product.stock) || 0;
    const delta = Number(adjustmentQty) || 0;
    const newStock = Math.max(0, currentStock + delta);
    const minStock = Number(product.minStock) || 0;

    const newStatus = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

    const updatedProduct = storageService.updateItem(this.productsCollection, productId, {
      stock: newStock,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    const movement = this.recordMovement({
      productId,
      productName: product.name,
      type: 'ADJUSTMENT',
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
