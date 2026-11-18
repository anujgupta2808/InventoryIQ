/**
 * Supplier Management Service
 * Manages supplier directory, purchase totals, and transaction histories.
 */

import { storageService } from './storageService.js';
import { validateSupplier } from '../utils/validators.js';
import { calculateSupplierBalances } from '../utils/calculations.js';

export class SupplierService {
  constructor() {
    this.collectionName = 'SUPPLIERS';
  }

  getAll() {
    return storageService.getCollection(this.collectionName);
  }

  getById(id) {
    return storageService.getItemById(this.collectionName, id);
  }

  findByName(name) {
    if (!name) return null;
    const clean = String(name).trim().toLowerCase();
    const suppliers = this.getAll();
    return suppliers.find(s => s.name && s.name.trim().toLowerCase() === clean) || null;
  }

  addSupplier(suppData) {
    const validation = validateSupplier(suppData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const suppliers = this.getAll();
    const newId = suppliers.length > 0 ? Math.max(...suppliers.map(s => Number(s.id) || 0)) + 1 : 1;

    const newSupplier = {
      id: newId,
      name: String(suppData.name || '').trim(),
      contactPerson: String(suppData.contactPerson || '').trim() || 'Vendor Rep',
      email: String(suppData.email || '').trim(),
      phone: String(suppData.phone || '').trim(),
      address: String(suppData.address || '').trim(),
      gstin: String(suppData.gstin || '').trim().toUpperCase(),
      status: suppData.status || 'Active',
      totalPurchases: suppData.totalPurchases || '₹0',
      createdAt: new Date().toISOString()
    };

    const inserted = storageService.insertItem(this.collectionName, newSupplier);
    return { success: true, supplier: inserted };
  }

  updateSupplier(id, suppData) {
    const existing = this.getById(id);
    if (!existing) {
      return { success: false, errors: ['Supplier not found.'] };
    }

    const validation = validateSupplier({ ...existing, ...suppData });
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const updates = {
      name: String(suppData.name || existing.name).trim(),
      contactPerson: suppData.contactPerson !== undefined ? String(suppData.contactPerson).trim() : existing.contactPerson,
      email: suppData.email !== undefined ? String(suppData.email).trim() : existing.email,
      phone: suppData.phone !== undefined ? String(suppData.phone).trim() : existing.phone,
      address: suppData.address !== undefined ? String(suppData.address).trim() : existing.address,
      gstin: suppData.gstin !== undefined ? String(suppData.gstin).trim().toUpperCase() : existing.gstin,
      status: suppData.status || existing.status,
      totalPurchases: suppData.totalPurchases || existing.totalPurchases
    };

    const updated = storageService.updateItem(this.collectionName, id, updates);
    return { success: true, supplier: updated };
  }

  deleteSupplier(id) {
    const supplier = this.getById(id);
    if (!supplier) {
      return { success: false, message: 'Supplier not found.' };
    }

    // Check if supplier has pending purchase orders
    const purchases = storageService.getCollection('PURCHASES');
    const linkedPOs = purchases.filter(p => 
      (p.supplierId && Number(p.supplierId) === Number(id)) ||
      (p.supplierName && p.supplierName.trim().toLowerCase() === supplier.name.trim().toLowerCase())
    );

    if (linkedPOs.length > 0) {
      const hasPending = linkedPOs.some(p => p.status === 'Pending');
      if (hasPending) {
        return { 
          success: false, 
          message: `Cannot remove "${supplier.name}". There are pending purchase orders associated with this vendor.` 
        };
      }
    }

    const removed = storageService.removeItem(this.collectionName, id);
    return { success: removed };
  }

  syncFromPurchase(poData) {
    const suppName = (poData.supplierName || '').trim();
    const poAmount = Number(poData.amount) || 0;
    if (!suppName) return null;

    let supplier = this.findByName(suppName);
    if (!supplier && poData.newSupplierData) {
      const added = this.addSupplier({
        name: poData.newSupplierData.name || suppName,
        contactPerson: poData.newSupplierData.contactPerson || 'Vendor Rep',
        email: poData.newSupplierData.email || '',
        phone: poData.newSupplierData.phone || '',
        address: poData.newSupplierData.address || '',
        totalPurchases: `₹${poAmount.toLocaleString('en-IN')}`
      });
      return added.supplier;
    } else if (supplier) {
      const currentPurchases = parseInt(String(supplier.totalPurchases || '0').replace(/[^0-9]/g, ''), 10) || 0;
      const updated = storageService.updateItem(this.collectionName, supplier.id, {
        totalPurchases: `₹${(currentPurchases + poAmount).toLocaleString('en-IN')}`
      });
      return updated;
    }

    return null;
  }

  getSupplierLedger(nameOrId) {
    const purchases = storageService.getCollection('PURCHASES');
    const target = String(nameOrId || '').trim().toLowerCase();

    const supplierPurchases = purchases.filter(p => 
      (p.supplierId && String(p.supplierId) === target) ||
      (p.supplierName && p.supplierName.trim().toLowerCase() === target)
    );

    const balances = calculateSupplierBalances(supplierPurchases, target);

    return {
      purchases: supplierPurchases,
      balances
    };
  }
}

export const supplierService = new SupplierService();
