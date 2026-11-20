/**
 * Product Management Service
 * Manages product catalog, SKU uniqueness, search, categories, and stock status.
 */

import { storageService } from './storageService.js';
import { validateProduct } from '../utils/validators.js';
import { roundTo } from '../utils/calculations.js';
import { permissionService } from './permissionService.js';
import { productRepository } from '../repositories/productRepository.js';

export class ProductService {
  constructor() {
    this.collectionName = 'PRODUCTS';
  }

  getAll(filters = {}) {
    const products = storageService.getCollection(this.collectionName);
    if (filters && filters.includeArchived) {
      return products;
    }
    return products.filter(p => !p.isArchived && p.status !== 'Archived');
  }

  getById(id) {
    const products = storageService.getCollection(this.collectionName);
    return products.find(p => String(p.id) === String(id)) || null;
  }

  getByBarcode(barcode) {
    if (!barcode) return null;
    const clean = String(barcode).trim().toLowerCase();
    const products = this.getAll();
    return products.find(p => 
      (p.barcode && String(p.barcode).trim().toLowerCase() === clean) ||
      (p.sku && String(p.sku).trim().toLowerCase() === clean) ||
      (String(p.id).trim().toLowerCase() === clean)
    ) || null;
  }

  checkDuplicateSKU(sku, excludeId = null) {
    if (!sku) return false;
    const cleanSku = String(sku).trim().toLowerCase();
    const products = storageService.getCollection(this.collectionName);
    return products.some(p => 
      p.sku && String(p.sku).trim().toLowerCase() === cleanSku && (excludeId === null || String(p.id) !== String(excludeId))
    );
  }

  checkDuplicateBarcode(barcode, excludeId = null) {
    if (!barcode) return false;
    const cleanBarcode = String(barcode).trim().toLowerCase();
    const products = storageService.getCollection(this.collectionName);
    return products.some(p => 
      p.barcode && String(p.barcode).trim().toLowerCase() === cleanBarcode && (excludeId === null || String(p.id) !== String(excludeId))
    );
  }

  generateSKU(prefix = 'INV') {
    const year = new Date().getFullYear();
    const hex = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase()
      : Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
    return `${prefix}-${year}-${hex}`;
  }

  generateId(existingProducts = []) {
    const numericIds = existingProducts
      .map(p => Number(p.id))
      .filter(id => !isNaN(id) && Number.isInteger(id) && id > 0);
    if (numericIds.length > 0 && numericIds.length === existingProducts.length) {
      return Math.max(...numericIds) + 1;
    }
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'PROD-' + Date.now().toString(36);
  }

  calculateStatus(stock, minStock) {
    const s = Math.max(0, Number(stock) || 0);
    const ms = Math.max(0, Number(minStock) || 0);
    if (s <= 0) return 'Out of Stock';
    if (s <= ms) return 'Low Stock';
    return 'In Stock';
  }

  addProduct(productData, userRole = 'owner', shopId = null) {
    permissionService.assertPermission(userRole, 'inventory.create', 'create products');

    const products = this.getAll();
    const validation = validateProduct(productData, products);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // Fractional quantity support (e.g. 1.5 kg, 2.75 meter)
    const stock = Math.max(0, roundTo(Number(productData.stock || 0), 3));
    const minStock = Math.max(0, roundTo(Number(productData.minStock || 0), 3));
    const price = Math.max(0, roundTo(Number(productData.price || 0), 2));
    const costPrice = Math.max(0, roundTo(Number(productData.costPrice || 0), 2));
    const status = this.calculateStatus(stock, minStock);

    const newId = productData.id ? String(productData.id) : this.generateId(products);
    const newSku = String(productData.sku || this.generateSKU()).trim();

    const newProduct = {
      id: newId,
      name: String(productData.name || '').trim(),
      sku: newSku,
      category: String(productData.category || 'General').trim(),
      stock,
      minStock,
      price,
      costPrice,
      unit: productData.unit || 'pcs',
      barcode: productData.barcode || '',
      image: productData.image || '',
      supplierId: productData.supplierId ? String(productData.supplierId) : null,
      supplierName: productData.supplierName || '',
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const inserted = storageService.insertItem(this.collectionName, newProduct);
    if (shopId) {
      productRepository.save(shopId, newProduct).catch(err => console.warn('Async IndexedDB write notice:', err));
    }
    return { success: true, product: inserted };
  }

  updateProduct(id, productData, userRole = 'owner', shopId = null) {
    permissionService.assertPermission(userRole, 'inventory.update', 'modify products');

    const existing = this.getById(id);
    if (!existing) {
      return { success: false, errors: ['Product not found.'] };
    }

    const products = this.getAll();
    const validation = validateProduct({ ...existing, ...productData, id }, products);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const stock = productData.stock !== undefined ? Math.max(0, roundTo(Number(productData.stock), 3)) : existing.stock;
    const minStock = productData.minStock !== undefined ? Math.max(0, roundTo(Number(productData.minStock), 3)) : existing.minStock;
    const price = productData.price !== undefined ? Math.max(0, roundTo(Number(productData.price), 2)) : existing.price;
    const costPrice = productData.costPrice !== undefined ? Math.max(0, roundTo(Number(productData.costPrice), 2)) : existing.costPrice;
    const status = this.calculateStatus(stock, minStock);

    const updates = {
      name: String(productData.name || existing.name).trim(),
      sku: String(productData.sku || existing.sku).trim(),
      category: String(productData.category || existing.category).trim(),
      stock,
      minStock,
      price,
      costPrice,
      unit: productData.unit || existing.unit,
      barcode: productData.barcode !== undefined ? productData.barcode : existing.barcode,
      image: productData.image !== undefined ? productData.image : existing.image,
      supplierId: productData.supplierId !== undefined ? (productData.supplierId ? String(productData.supplierId) : null) : existing.supplierId,
      supplierName: productData.supplierName !== undefined ? productData.supplierName : existing.supplierName,
      status,
      updatedAt: new Date().toISOString()
    };

    const updated = storageService.updateItem(this.collectionName, id, updates);
    if (shopId && updated) {
      productRepository.save(shopId, updated).catch(err => console.warn('Async IndexedDB update notice:', err));
    }
    return { success: true, product: updated };
  }

  hasHistoricalTransactions(id) {
    const idStr = String(id);
    const sales = storageService.getCollection('SALES');
    const hasSales = sales.some(s => (s.items || []).some(item => String(item.productId || item.id) === idStr));
    if (hasSales) return true;

    const purchases = storageService.getCollection('PURCHASES');
    const hasPurchases = purchases.some(po => (po.items || []).some(item => String(item.productId || item.id) === idStr));
    if (hasPurchases) return true;

    const movements = storageService.getCollection('STOCK_MOVEMENTS');
    const hasMovements = movements.some(m => String(m.productId) === idStr);
    return hasMovements;
  }

  deleteProduct(id, userRole = 'owner', shopId = null) {
    permissionService.assertPermission(userRole, 'inventory.delete', 'delete catalog products');

    const existing = this.getById(id);
    if (!existing) {
      return { success: false, message: 'Product not found.' };
    }

    // Task 7: Do NOT allow deletion to destroy historical financial records.
    // If the product has historical transactions, soft delete / archive it!
    if (this.hasHistoricalTransactions(id)) {
      const archived = storageService.updateItem(this.collectionName, id, {
        isArchived: true,
        status: 'Archived',
        stock: 0,
        archivedAt: new Date().toISOString()
      });

      if (shopId && archived) {
        productRepository.save(shopId, archived).catch(err => console.warn('Async IndexedDB archive notice:', err));
      }

      return {
        success: true,
        softDeleted: true,
        archived: true,
        product: archived,
        message: `Product "${existing.name}" has historical transactions and has been safely archived to preserve audit history.`
      };
    }

    const removed = storageService.removeItem(this.collectionName, id);
    if (shopId && removed) {
      productRepository.delete(shopId, id).catch(err => console.warn('Async IndexedDB delete notice:', err));
    }
    return { success: removed, hardDeleted: true, archived: false, softDeleted: false };
  }

  archiveProduct(id, userRole = 'owner', shopId = null) {
    permissionService.assertPermission(userRole, 'inventory.update', 'archive products');
    const updated = storageService.updateItem(this.collectionName, id, {
      isArchived: true,
      status: 'Archived',
      archivedAt: new Date().toISOString()
    });
    if (shopId && updated) {
      productRepository.save(shopId, updated).catch(err => console.warn('Async IndexedDB archive notice:', err));
    }
    return { success: Boolean(updated), product: updated };
  }

  restoreProduct(id, userRole = 'owner', shopId = null) {
    permissionService.assertPermission(userRole, 'inventory.update', 'restore products');
    const existing = this.getById(id);
    if (!existing) return { success: false, message: 'Product not found.' };
    const stock = Number(existing.stock || 0);
    const minStock = Number(existing.minStock || 0);
    const status = this.calculateStatus(stock, minStock);

    const updated = storageService.updateItem(this.collectionName, id, {
      isArchived: false,
      status,
      restoredAt: new Date().toISOString()
    });
    if (shopId && updated) {
      productRepository.save(shopId, updated).catch(err => console.warn('Async IndexedDB restore notice:', err));
    }
    return { success: Boolean(updated), product: updated };
  }

  getLowStockProducts() {
    const products = this.getAll();
    return products.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock');
  }

  filterProducts({ search = '', category = '', status = '', sortBy = 'name', sortOrder = 'asc' }) {
    let list = this.getAll();

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    if (category && category !== 'All') {
      list = list.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
    }

    if (status && status !== 'All') {
      list = list.filter(p => p.status && p.status.toLowerCase() === status.toLowerCase());
    }

    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(String(valB || ''));
        return sortOrder === 'desc' ? -cmp : cmp;
      }
      return sortOrder === 'desc' ? (valB - valA) : (valA - valB);
    });

    return list;
  }
}

export const productService = new ProductService();
