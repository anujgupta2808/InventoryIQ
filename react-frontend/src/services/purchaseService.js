/**
 * Purchase Orders & Vendor Replenishment Service
 * Handles purchase order creation, receiving shipments with duplicate-receipt prevention,
 * and auto-stocking items in inventory.
 */

import { storageService } from './storageService.js';
import { generatePurchaseNumber } from '../utils/invoiceGenerator.js';
import { validatePurchase, isPositiveNumber } from '../utils/validators.js';
import { calculatePurchaseTotals, roundTo } from '../utils/calculations.js';
import { inventoryService } from './inventoryService.js';
import { supplierService } from './supplierService.js';
import { categoryService } from './categoryService.js';
import { productService } from './productService.js';
import { returnService } from './returnService.js';

export class PurchaseService {
  constructor() {
    this.collectionName = 'PURCHASES';
    this.processedKeys = new Map();
  }

  getAll() {
    return storageService.getCollection(this.collectionName);
  }

  getById(id) {
    return storageService.getItemById(this.collectionName, id);
  }

  createPurchase(poData, user = 'Admin') {
    const validation = validatePurchase(poData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const existingPOs = this.getAll();
    const newPoId = poData.id || generatePurchaseNumber('PO', existingPOs);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let finalSupplierId = poData.supplierId;
    let finalSupplierName = poData.supplierName;

    // Auto-save new vendor to directory if created inline
    if (poData.newSupplierData && poData.newSupplierData.name) {
      const added = supplierService.addSupplier({
        name: poData.newSupplierData.name,
        contactPerson: poData.newSupplierData.contactPerson || '',
        email: poData.newSupplierData.email || '',
        phone: poData.newSupplierData.phone || '',
        address: poData.newSupplierData.address || '',
        status: 'Active',
        totalPurchases: `₹${Number(poData.amount).toLocaleString('en-IN')}`
      });
      if (added.success) {
        finalSupplierId = added.supplier.id;
        finalSupplierName = added.supplier.name;
      }
    } else {
      supplierService.syncFromPurchase(poData);
    }

    const isCompleted = poData.status === 'Completed';

    const newPo = {
      id: newPoId,
      supplierId: finalSupplierId,
      supplierName: finalSupplierName,
      date: dateStr,
      amount: roundTo(Number(poData.amount) || 0),
      status: poData.status || 'Completed',
      itemsCount: poData.items ? poData.items.length : 1,
      items: poData.items || [],
      receivedAt: isCompleted ? now.toISOString() : null,
      createdAt: now.toISOString()
    };

    // If status is Completed, immediately replenish or create products in Inventory
    if (isCompleted && poData.items && poData.items.length > 0) {
      this.replenishInventoryFromPO(newPo, user);
    }

    storageService.insertItem(this.collectionName, newPo);

    return {
      success: true,
      purchase: newPo
    };
  }

  receivePurchase(purchaseId, user = 'Admin', options = {}) {
    const idempotencyKey = typeof user === 'object' ? user.idempotencyKey : options.idempotencyKey;
    const actualUser = typeof user === 'string' ? user : (user?.name || 'Admin');
    const partialItems = options.items || (typeof user === 'object' && user.items ? user.items : null);

    if (idempotencyKey && this.processedKeys.has(idempotencyKey)) {
      return { ...this.processedKeys.get(idempotencyKey), idempotentReplay: true, alreadyReceived: true };
    }

    const po = this.getById(purchaseId);
    if (!po) {
      return { success: false, message: 'Purchase order not found.' };
    }

    // Critical Requirement: Prevent accidental duplicate stock additions!
    if (po.status === 'Completed' || po.receivedAt) {
      const res = {
        success: true,
        duplicate: true,
        alreadyReceived: true,
        message: `PO #${purchaseId} has already been received on ${new Date(po.receivedAt || po.date).toLocaleDateString()}. Duplicate stock replenishment prevented.`
      };
      if (idempotencyKey) {
        this.processedKeys.set(idempotencyKey, res);
      }
      return res;
    }

    const now = new Date();
    const products = storageService.getCollection('PRODUCTS');
    const updatedProducts = [...products];

    // Determine items and quantities to receive
    let isFullyReceived = true;
    const updatedPoItems = (po.items || []).map(item => {
      let qtyToReceive = 0;
      if (partialItems && Array.isArray(partialItems)) {
        const match = partialItems.find(p => 
          (p.productId && String(p.productId) === String(item.productId)) ||
          (p.sku && item.sku && String(p.sku).trim().toLowerCase() === String(item.sku).trim().toLowerCase())
        );
        qtyToReceive = match ? Number(match.receivedQty !== undefined ? match.receivedQty : match.qty) || 0 : 0;
      } else {
        const alreadyRec = Number(item.receivedQty || 0);
        qtyToReceive = Math.max(0, Number(item.qty || 0) - alreadyRec);
      }

      const totalReceivedSoFar = roundTo(Number(item.receivedQty || 0) + qtyToReceive, 3);
      if (totalReceivedSoFar < Number(item.qty || 0)) {
        isFullyReceived = false;
      }

      if (qtyToReceive > 0) {
        // Replenish stock for this item
        const pIdx = updatedProducts.findIndex(p => 
          (item.productId && String(p.id) === String(item.productId)) ||
          (item.sku && p.sku && String(p.sku).trim().toLowerCase() === String(item.sku).trim().toLowerCase())
        );

        const cost = Number(item.cost || item.price || 0);

        if (pIdx >= 0) {
          const prod = updatedProducts[pIdx];
          const newStock = roundTo(prod.stock + qtyToReceive, 3);
          const minStock = Number(prod.minStock) || 0;
          const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

          updatedProducts[pIdx] = {
            ...prod,
            stock: newStock,
            costPrice: cost > 0 ? cost : prod.costPrice,
            status,
            updatedAt: now.toISOString()
          };

          inventoryService.recordMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'PURCHASE',
            quantity: qtyToReceive,
            previousStock: prod.stock,
            newStock,
            referenceId: po.id,
            reason: `PO #${po.id} receipt${partialItems ? ' (Partial)' : ''}`,
            user: actualUser
          });
        }
      }

      return {
        ...item,
        receivedQty: totalReceivedSoFar
      };
    });

    storageService.setCollection('PRODUCTS', updatedProducts);

    const newStatus = isFullyReceived ? 'Completed' : 'Partial';
    const updatedPo = storageService.updateItem(this.collectionName, purchaseId, {
      status: newStatus,
      items: updatedPoItems,
      receivedAt: isFullyReceived ? now.toISOString() : null,
      lastReceivedAt: now.toISOString(),
      receivedBy: actualUser
    });

    const res = {
      success: true,
      purchase: updatedPo,
      isFullyReceived,
      status: newStatus
    };

    if (idempotencyKey) {
      this.processedKeys.set(idempotencyKey, res);
    }

    return res;
  }

  cancelPurchase(purchaseId, reason = 'Purchase Order Cancelled', user = 'Admin') {
    const po = this.getById(purchaseId);
    if (!po) {
      return { success: false, message: 'Purchase order not found.' };
    }
    if (po.status === 'Cancelled') {
      return { success: false, message: 'Purchase order is already cancelled.' };
    }

    const wasReceived = po.status === 'Completed' || po.status === 'Partial' || Boolean(po.receivedAt);
    const products = storageService.getCollection('PRODUCTS');
    let updatedProducts = [...products];

    if (wasReceived && Array.isArray(po.items)) {
      po.items.forEach(item => {
        const qtyToDeduct = Number(item.receivedQty !== undefined ? item.receivedQty : item.qty) || 0;
        if (qtyToDeduct <= 0) return;

        const pIdx = updatedProducts.findIndex(p => 
          (item.productId && String(p.id) === String(item.productId)) ||
          (item.sku && p.sku && String(p.sku).trim().toLowerCase() === String(item.sku).trim().toLowerCase())
        );

        if (pIdx >= 0) {
          const prod = updatedProducts[pIdx];
          const newStock = roundTo(Math.max(0, prod.stock - qtyToDeduct), 3);
          const minStock = Number(prod.minStock) || 0;
          const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

          updatedProducts[pIdx] = {
            ...prod,
            stock: newStock,
            status,
            updatedAt: new Date().toISOString()
          };

          inventoryService.recordMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'PURCHASE_CANCEL',
            quantity: -qtyToDeduct,
            previousStock: prod.stock,
            newStock,
            referenceId: po.id,
            reason: `PO #${po.id} cancellation: ${reason}`,
            user
          });
        }
      });

      storageService.setCollection('PRODUCTS', updatedProducts);
    }

    const updatedPo = storageService.updateItem(this.collectionName, purchaseId, {
      status: 'Cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason
    });

    return {
      success: true,
      purchase: updatedPo
    };
  }

  returnToSupplier({ purchaseId, productId, quantity, reason = 'Supplier Return', user = 'Admin', idempotencyKey = null }) {
    const po = purchaseId ? storageService.getItemById(this.collectionName, purchaseId) : null;
    if (po) {
      const res = returnService.processSupplierReturn({
        purchaseId,
        productId,
        quantity,
        reason,
        user,
        idempotencyKey
      });

      if (!res.success) {
        return res;
      }

      return {
        success: true,
        purchase: res.purchase,
        product: res.product,
        returnRecord: res.returnRecord,
        movement: res.movement,
        debitNoteNumber: res.debitNoteNumber,
        debitAmount: res.debitAmount
      };
    }

    // Fallback for ad-hoc returns where purchase record was not persisted
    const qty = Number(quantity);
    if (!isPositiveNumber(qty) || !isFinite(qty)) {
      const msg = 'Return quantity must be a positive number greater than zero.';
      return { success: false, message: msg, errors: [msg] };
    }

    const products = storageService.getCollection('PRODUCTS');
    const pIdx = products.findIndex(p => String(p.id) === String(productId));
    if (pIdx < 0) {
      const msg = 'Product not found in catalog.';
      return { success: false, message: msg, errors: [msg] };
    }

    const prod = products[pIdx];
    if (prod.stock < qty) {
      const msg = `Insufficient stock to return to supplier. Available: ${prod.stock}, Requested: ${qty}.`;
      return {
        success: false,
        message: msg,
        errors: [msg]
      };
    }

    const newStock = roundTo(prod.stock - qty, 3);
    const minStock = Number(prod.minStock) || 0;
    const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

    const updatedProduct = {
      ...prod,
      stock: newStock,
      status,
      updatedAt: new Date().toISOString()
    };
    products[pIdx] = updatedProduct;
    storageService.setCollection('PRODUCTS', products);

    const movement = inventoryService.recordMovement({
      productId: prod.id,
      productName: prod.name,
      type: 'SUPPLIER_RETURN',
      quantity: -qty,
      previousStock: prod.stock,
      newStock,
      referenceId: purchaseId ? String(purchaseId) : '',
      reason: reason || 'Goods returned to supplier',
      user
    });

    return {
      success: true,
      product: updatedProduct,
      movement
    };
  }

  updatePurchase(id, poData, user = 'Admin') {
    const existing = this.getById(id);
    if (!existing) {
      return { success: false, message: 'Purchase order not found.' };
    }
    if (existing.status === 'Completed' || existing.receivedAt) {
      return { success: false, message: 'Cannot edit a purchase order that has already been received.' };
    }
    const validation = validatePurchase({ ...existing, ...poData });
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }
    const updated = storageService.updateItem(this.collectionName, id, {
      ...poData,
      updatedAt: new Date().toISOString()
    });
    return { success: true, purchase: updated };
  }

  replenishInventoryFromPO(po, user = 'Admin') {
    const products = storageService.getCollection('PRODUCTS');
    const updated = [...products];

    (po.items || []).forEach(item => {
      // Primary matching by product_id or SKU to prevent duplicate name collisions
      const existingIdx = updated.findIndex(p => {
        if (item.productId && String(p.id) === String(item.productId)) return true;
        if (item.sku && p.sku && String(p.sku).trim().toLowerCase() === String(item.sku).trim().toLowerCase()) return true;
        return false;
      });

      const qty = Number(item.qty || item.receivedQty || 0);
      const cost = Number(item.cost || item.price || 0);

      if (existingIdx >= 0) {
        const existing = updated[existingIdx];
        const newStock = roundTo(existing.stock + qty, 2);
        const minStock = Number(existing.minStock) || 0;
        const status = newStock <= 0 ? 'Out of Stock' : (newStock <= minStock ? 'Low Stock' : 'In Stock');

        updated[existingIdx] = {
          ...existing,
          stock: newStock,
          costPrice: cost > 0 ? cost : existing.costPrice,
          status,
          updatedAt: new Date().toISOString()
        };

        inventoryService.recordMovement({
          productId: existing.id,
          productName: existing.name,
          type: 'PURCHASE',
          quantity: qty,
          previousStock: existing.stock,
          newStock,
          referenceId: po.id,
          reason: `PO #${po.id} received from ${po.supplierName}`,
          user
        });
      } else {
        // Auto-create new product with unique SKU and UUID/ID
        const newProdId = productService.generateId(updated);
        const price = Number(item.price) || Math.round(cost * 1.35) || (cost + 50);
        const categoryName = item.category ? String(item.category).trim() : 'General';
        const sku = String(item.sku || productService.generateSKU()).trim();
        
        categoryService.addCategory(categoryName);

        const newProd = {
          id: newProdId,
          name: String(item.name || 'New Product').trim(),
          sku,
          category: categoryName,
          stock: qty,
          minStock: 10,
          price,
          costPrice: cost,
          unit: item.unit || 'Piece',
          barcode: item.barcode || '',
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          status: qty > 0 ? (qty <= 10 ? 'Low Stock' : 'In Stock') : 'Out of Stock',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        updated.push(newProd);

        inventoryService.recordMovement({
          productId: newProd.id,
          productName: newProd.name,
          type: 'PURCHASE',
          quantity: qty,
          previousStock: 0,
          newStock: qty,
          referenceId: po.id,
          reason: `Initial stock from PO #${po.id}`,
          user
        });
      }
    });

    storageService.setCollection('PRODUCTS', updated);
    return updated;
  }
}

export const purchaseService = new PurchaseService();
