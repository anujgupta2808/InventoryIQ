/**
 * Purchase Orders & Vendor Replenishment Service
 * Handles purchase order creation, receiving shipments with duplicate-receipt prevention,
 * and auto-stocking items in inventory.
 */

import { storageService } from './storageService.js';
import { generatePurchaseNumber } from '../utils/invoiceGenerator.js';
import { validatePurchase } from '../utils/validators.js';
import { calculatePurchaseTotals, roundTo } from '../utils/calculations.js';
import { inventoryService } from './inventoryService.js';
import { supplierService } from './supplierService.js';
import { categoryService } from './categoryService.js';
import { productService } from './productService.js';

export class PurchaseService {
  constructor() {
    this.collectionName = 'PURCHASES';
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
    const newPoId = generatePurchaseNumber('PO', existingPOs);
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

  receivePurchase(purchaseId, user = 'Admin') {
    const po = this.getById(purchaseId);
    if (!po) {
      return { success: false, message: 'Purchase order not found.' };
    }

    // Critical Requirement: Prevent accidental duplicate stock additions!
    if (po.receivedAt || po.status === 'Completed') {
      return {
        success: false,
        message: `PO #${purchaseId} has already been received on ${new Date(po.receivedAt || po.date).toLocaleDateString()}. Duplicate stock replenishment prevented.`
      };
    }

    const now = new Date();
    this.replenishInventoryFromPO(po, user);

    const updatedPo = storageService.updateItem(this.collectionName, purchaseId, {
      status: 'Completed',
      receivedAt: now.toISOString(),
      receivedBy: user
    });

    return {
      success: true,
      purchase: updatedPo
    };
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
