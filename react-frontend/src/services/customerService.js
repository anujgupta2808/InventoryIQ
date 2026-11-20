/**
 * Customer & Client Ledger Service
 * Manages customer directory, financial dues, and transaction histories.
 */

import { storageService } from './storageService.js';
import { validateCustomer } from '../utils/validators.js';
import { calculateCustomerBalances } from '../utils/calculations.js';

export class CustomerService {
  constructor() {
    this.collectionName = 'CUSTOMERS';
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
    const customers = this.getAll();
    return customers.find(c => c.name && c.name.trim().toLowerCase() === clean) || null;
  }

  addCustomer(customerData) {
    const validation = validateCustomer(customerData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const newId = customerData.id ? String(customerData.id) : ((typeof crypto !== 'undefined' && crypto.randomUUID) ? `cust_${crypto.randomUUID()}` : `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`);

    const newCustomer = {
      id: String(newId),
      name: String(customerData.name || '').trim(),
      email: String(customerData.email || '').trim(),
      phone: String(customerData.phone || '').trim(),
      address: String(customerData.address || '').trim(),
      gstin: String(customerData.gstin || '').trim().toUpperCase(),
      totalBilled: Number(customerData.totalBilled) || 0,
      totalReceived: Number(customerData.totalReceived) || 0,
      currentDue: Number(customerData.currentDue) || 0,
      status: customerData.status || 'Active',
      createdAt: new Date().toISOString()
    };

    const inserted = storageService.insertItem(this.collectionName, newCustomer);
    return { success: true, customer: inserted };
  }

  updateCustomer(id, customerData) {
    const existing = this.getById(id);
    if (!existing) {
      return { success: false, errors: ['Customer not found.'] };
    }

    const validation = validateCustomer({ ...existing, ...customerData });
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const updates = {
      name: String(customerData.name || existing.name).trim(),
      email: customerData.email !== undefined ? String(customerData.email).trim() : existing.email,
      phone: customerData.phone !== undefined ? String(customerData.phone).trim() : existing.phone,
      address: customerData.address !== undefined ? String(customerData.address).trim() : existing.address,
      gstin: customerData.gstin !== undefined ? String(customerData.gstin).trim().toUpperCase() : existing.gstin,
      status: customerData.status || existing.status
    };

    const updated = storageService.updateItem(this.collectionName, id, updates);
    return { success: true, customer: updated };
  }

  deleteCustomer(id) {
    const customer = this.getById(id);
    if (!customer) {
      return { success: false, message: 'Customer not found.' };
    }

    // Check if customer has outstanding dues or recorded sales
    const sales = storageService.getCollection('SALES');
    const linkedSales = sales.filter(s => 
      (s.customerId && String(s.customerId) === String(id)) ||
      (s.customerName && customer.name && s.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase())
    );

    if (linkedSales.length > 0) {
      const hasDues = linkedSales.some(s => Number(s.dueAmount) > 0);
      if (hasDues) {
        return { 
          success: false, 
          message: `Cannot delete "${customer.name}". This client has outstanding dues on ${linkedSales.length} invoice(s).` 
        };
      }
    }

    const removed = storageService.removeItem(this.collectionName, id);
    return { success: removed };
  }

  syncFromSale(saleData) {
    const custId = saleData.customerId ? String(saleData.customerId) : null;
    const custName = (saleData.customerName || '').trim();
    if (!custName || custName.toLowerCase() === 'walk-in customer') return null;

    let existing = custId ? this.getById(custId) : null;
    if (!existing) {
      existing = this.findByName(custName);
    }
    const saleAmount = Number(saleData.amount) || 0;
    const paidAmount = Number(saleData.paidAmount) || 0;
    const dueAmount = Number(saleData.dueAmount) || 0;

    if (existing) {
      const updated = storageService.updateItem(this.collectionName, existing.id, {
        totalBilled: (Number(existing.totalBilled) || 0) + saleAmount,
        totalReceived: (Number(existing.totalReceived) || 0) + paidAmount,
        currentDue: (Number(existing.currentDue) || 0) + dueAmount,
        phone: existing.phone || saleData.customerPhone || '',
        email: existing.email || saleData.customerEmail || '',
        address: existing.address || saleData.customerAddress || ''
      });
      return updated;
    } else {
      const result = this.addCustomer({
        name: custName,
        phone: saleData.customerPhone || '',
        email: saleData.customerEmail || '',
        address: saleData.customerAddress || '',
        totalBilled: saleAmount,
        totalReceived: paidAmount,
        currentDue: dueAmount
      });
      return result.customer;
    }
  }

  syncFromSaleCancellation(saleData) {
    const custId = saleData.customerId ? String(saleData.customerId) : null;
    const custName = (saleData.customerName || '').trim();
    if (!custName || custName.toLowerCase() === 'walk-in customer') return null;

    let existing = custId ? this.getById(custId) : null;
    if (!existing) {
      existing = this.findByName(custName);
    }
    if (!existing) return null;

    const saleAmount = Number(saleData.amount) || 0;
    const dueAmount = Number(saleData.dueAmount) || 0;

    const updated = storageService.updateItem(this.collectionName, existing.id, {
      totalBilled: Math.max(0, Number(((Number(existing.totalBilled) || 0) - saleAmount).toFixed(2))),
      currentDue: Math.max(0, Number(((Number(existing.currentDue) || 0) - dueAmount).toFixed(2)))
    });
    return updated;
  }

  getCustomerLedger(nameOrId) {
    const sales = storageService.getCollection('SALES');
    const payments = storageService.getCollection('PAYMENTS');
    const target = String(nameOrId || '').trim().toLowerCase();

    const customerSales = sales.filter(s => 
      s.status !== 'Cancelled' && (
        (s.customerId && String(s.customerId) === target) ||
        (s.customerName && s.customerName.trim().toLowerCase() === target)
      )
    );

    const balances = calculateCustomerBalances(customerSales, target);

    return {
      sales: customerSales,
      payments: payments.filter(p => 
        p.partyType === 'CUSTOMER' && 
        (String(p.partyName || '').trim().toLowerCase() === target || String(p.customerId) === target)
      ),
      balances
    };
  }

  reconcileBalances() {
    const sales = storageService.getCollection('SALES');
    const payments = storageService.getCollection('PAYMENTS');
    const customers = this.getAll();

    const reconciled = customers.map(c => {
      const matchSales = sales.filter(s =>
        s.status !== 'Cancelled' && (
          (s.customerId && String(s.customerId) === String(c.id)) ||
          (s.customerName && String(s.customerName).trim().toLowerCase() === String(c.name).trim().toLowerCase())
        )
      );
      const matchPayments = payments.filter(p =>
        p.partyType === 'CUSTOMER' && (
          (p.customerId && String(p.customerId) === String(c.id)) ||
          (p.partyName && String(p.partyName).trim().toLowerCase() === String(c.name).trim().toLowerCase())
        )
      );

      const totalBilled = matchSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const totalReceived = matchPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const currentDue = Math.max(0, totalBilled - totalReceived);

      return {
        ...c,
        totalBilled: Number(totalBilled.toFixed(2)),
        totalReceived: Number(totalReceived.toFixed(2)),
        currentDue: Number(currentDue.toFixed(2))
      };
    });

    storageService.setCollection(this.collectionName, reconciled);
    return reconciled;
  }
}

export const customerService = new CustomerService();
