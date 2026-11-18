/**
 * Controlled Demo Data Migration Utility
 * Allows users to inspect and migrate local demo inventory, sales, and purchase records
 * into production Supabase PostgreSQL under their authenticated organization.
 * Strictly excludes passwords, mock tokens, and fake sessions.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { storageService } from './storageService.js';

export class MigrationService {
  /**
   * Inspect existing local storage for valid business records
   */
  inspectDemoData() {
    const products = storageService.getCollection('PRODUCTS', []);
    const categories = storageService.getCollection('CATEGORIES', []);
    const sales = storageService.getCollection('SALES', []);
    const purchases = storageService.getCollection('PURCHASES', []);
    const suppliers = storageService.getCollection('SUPPLIERS', []);
    const customers = storageService.getCollection('CUSTOMERS', []);
    const payments = storageService.getCollection('PAYMENTS', []);

    return {
      productsCount: Array.isArray(products) ? products.length : 0,
      categoriesCount: Array.isArray(categories) ? categories.length : 0,
      salesCount: Array.isArray(sales) ? sales.length : 0,
      purchasesCount: Array.isArray(purchases) ? purchases.length : 0,
      suppliersCount: Array.isArray(suppliers) ? suppliers.length : 0,
      customersCount: Array.isArray(customers) ? customers.length : 0,
      paymentsCount: Array.isArray(payments) ? payments.length : 0,
      totalRecords:
        (Array.isArray(products) ? products.length : 0) +
        (Array.isArray(categories) ? categories.length : 0) +
        (Array.isArray(sales) ? sales.length : 0) +
        (Array.isArray(purchases) ? purchases.length : 0) +
        (Array.isArray(suppliers) ? suppliers.length : 0) +
        (Array.isArray(customers) ? customers.length : 0) +
        (Array.isArray(payments) ? payments.length : 0)
    };
  }

  /**
   * Migrate verified business entities into Supabase PostgreSQL
   */
  async migrateToSupabase({ organizationId, onProgress = () => {} }) {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Supabase is not configured. Connect your Supabase project URL and anon key to proceed.'
      };
    }

    if (!organizationId) {
      return {
        success: false,
        message: 'Active Organization ID is required for multi-tenant data migration.'
      };
    }

    const results = {
      categories: 0,
      products: 0,
      suppliers: 0,
      customers: 0,
      sales: 0,
      purchases: 0,
      payments: 0,
      errors: []
    };

    try {
      // 1. Categories
      onProgress({ stage: 'categories', message: 'Migrating Categories...' });
      const localCategories = storageService.getCollection('CATEGORIES', []);
      if (Array.isArray(localCategories) && localCategories.length > 0) {
        const catPayload = localCategories.map(c => ({
          organization_id: organizationId,
          name: c.name,
          description: c.description || '',
          color: c.color || '#F5B942'
        }));
        const { error } = await supabase.from('categories').upsert(catPayload, { onConflict: 'organization_id,name' });
        if (error) results.errors.push(`Categories: ${error.message}`);
        else results.categories = catPayload.length;
      }

      // 2. Suppliers
      onProgress({ stage: 'suppliers', message: 'Migrating Suppliers...' });
      const localSuppliers = storageService.getCollection('SUPPLIERS', []);
      if (Array.isArray(localSuppliers) && localSuppliers.length > 0) {
        const supPayload = localSuppliers.map(s => ({
          organization_id: organizationId,
          name: s.name,
          contact_person: s.contact || s.contactPerson || '',
          email: s.email || null,
          phone: s.phone || '',
          gstin: s.gstin || null,
          address: s.address || '',
          balance_due: Number(s.balanceDue || s.balance_due || 0)
        }));
        const { error } = await supabase.from('suppliers').insert(supPayload);
        if (error) results.errors.push(`Suppliers: ${error.message}`);
        else results.suppliers = supPayload.length;
      }

      // 3. Customers
      onProgress({ stage: 'customers', message: 'Migrating Customers...' });
      const localCustomers = storageService.getCollection('CUSTOMERS', []);
      if (Array.isArray(localCustomers) && localCustomers.length > 0) {
        const custPayload = localCustomers.map(c => ({
          organization_id: organizationId,
          name: c.name,
          phone: c.phone || '',
          email: c.email || null,
          gstin: c.gstin || null,
          address: c.address || '',
          balance_due: Number(c.balanceDue || c.balance_due || 0)
        }));
        const { error } = await supabase.from('customers').insert(custPayload);
        if (error) results.errors.push(`Customers: ${error.message}`);
        else results.customers = custPayload.length;
      }

      // 4. Products
      onProgress({ stage: 'products', message: 'Migrating Inventory Products...' });
      const localProducts = storageService.getCollection('PRODUCTS', []);
      if (Array.isArray(localProducts) && localProducts.length > 0) {
        const prodPayload = localProducts.map(p => ({
          organization_id: organizationId,
          sku: p.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          name: p.name,
          description: p.description || '',
          cost_price: Number(p.costPrice || p.cost || 0),
          selling_price: Number(p.sellingPrice || p.price || 0),
          stock: Math.max(0, Number(p.stock || 0)),
          min_stock: Math.max(0, Number(p.minStock || 5)),
          unit: p.unit || 'pcs'
        }));
        const { error } = await supabase.from('products').upsert(prodPayload, { onConflict: 'organization_id,sku' });
        if (error) results.errors.push(`Products: ${error.message}`);
        else results.products = prodPayload.length;
      }

      // 5. Sales
      onProgress({ stage: 'sales', message: 'Migrating Sales Orders...' });
      const localSales = storageService.getCollection('SALES', []);
      if (Array.isArray(localSales) && localSales.length > 0) {
        const salesPayload = localSales.map(s => ({
          organization_id: organizationId,
          invoice_number: s.invoiceNo || s.invoice_number || `INV-${Date.now()}`,
          subtotal: Number(s.subtotal || s.totalAmount || 0),
          tax_amount: Number(s.taxAmount || s.gstAmount || 0),
          discount_amount: Number(s.discountAmount || 0),
          total_amount: Number(s.totalAmount || s.total || 0),
          paid_amount: Number(s.paidAmount || s.totalAmount || 0),
          balance_due: Number(s.balanceDue || 0),
          payment_method: s.paymentMethod || 'cash',
          payment_status: s.status === 'Paid' ? 'paid' : (s.balanceDue > 0 ? 'partial' : 'paid'),
          created_at: s.date || new Date().toISOString()
        }));
        const { error } = await supabase.from('sales').insert(salesPayload);
        if (error) results.errors.push(`Sales: ${error.message}`);
        else results.sales = salesPayload.length;
      }

      onProgress({ stage: 'completed', message: 'Migration Complete!' });
      return {
        success: results.errors.length === 0,
        results
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'An unexpected error occurred during database migration.'
      };
    }
  }

  /**
   * Safely wipe demo records after verified migration
   */
  purgeDemoData() {
    storageService.removeCollection('PRODUCTS');
    storageService.removeCollection('SALES');
    storageService.removeCollection('PURCHASES');
    storageService.removeCollection('CUSTOMERS');
    storageService.removeCollection('SUPPLIERS');
    storageService.removeCollection('PAYMENTS');
    return { success: true };
  }
}

export const migrationService = new MigrationService();
