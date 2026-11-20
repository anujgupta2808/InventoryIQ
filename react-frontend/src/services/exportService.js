/**
 * Export Service
 * Generates CSV files with top-line report type identification and complete JSON backup archives.
 */

import { storageService } from './storageService.js';

export class ExportService {
  resolveReportTitle(filename, customTitle = null) {
    if (customTitle && typeof customTitle === 'string' && customTitle.trim()) {
      const trimmed = customTitle.trim();
      const lower = trimmed.toLowerCase();
      if (lower.includes('analytic') || lower.includes('anlys')) return 'Analysis';
      if (lower.includes('party') || lower.includes('due') || lower.includes('ledger') || lower.includes('tracker')) return 'Party Due Tracker';
      if (lower.includes('sale') || lower.includes('invoice')) return 'Sales';
      if (lower.includes('purchase') || lower.includes('order')) return 'Purchase';
      if (lower.includes('inventory') || lower.includes('product')) return 'Inventory';
      if (lower.includes('supplier')) return 'Suppliers';
      if (lower.includes('customer')) return 'Customers';
      return trimmed;
    }

    const clean = String(filename || '').toLowerCase();

    if (clean.includes('party') || clean.includes('due') || clean.includes('tracker') || clean.includes('ledger')) {
      return 'Party Due Tracker';
    }
    if (clean.includes('sale') || clean.includes('invoice')) {
      return 'Sales';
    }
    if (clean.includes('purchase') || clean.includes('order')) {
      return 'Purchase';
    }
    if (clean.includes('inventory') || clean.includes('product')) {
      return 'Inventory';
    }
    if (clean.includes('supplier')) {
      return 'Suppliers';
    }
    if (clean.includes('customer')) {
      return 'Customers';
    }
    if (clean.includes('analytic') || clean.includes('anlys')) {
      return 'Analysis';
    }

    return String(filename || 'Report')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');
  }

  downloadCSV(filename, headerNames, dataRows, customTitle = null) {
    if (!dataRows || !dataRows.length) {
      return { success: false, message: 'No records available to export.' };
    }

    const reportKind = this.resolveReportTitle(filename, customTitle);

    // Row 1: Clean report name on top, with empty cells matching column width
    const emptyCols = new Array(Math.max(0, headerNames.length - 1)).fill('""');
    const titleRow = [`"${reportKind.replace(/"/g, '""')}"`, ...emptyCols].join(',');

    const headers = headerNames.map(h => `"${String(h ?? '').replace(/"/g, '""')}"`).join(',');
    const rows = dataRows.map(row =>
      row.map(val => {
        const str = String(val ?? '').replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [titleRow, headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true, count: dataRows.length, title: reportKind };
  }

  exportProductsCSV(products = null) {
    const list = products || storageService.getCollection('PRODUCTS');
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Stock', 'Min Stock', 'Price (INR)', 'Cost (INR)', 'Unit', 'Status', 'Supplier'];
    const rows = list.map(p => [
      p.id,
      p.name,
      p.sku,
      p.category,
      p.stock,
      p.minStock,
      p.price,
      p.costPrice || 0,
      p.unit,
      p.status,
      p.supplierName || ''
    ]);
    return this.downloadCSV('inventory_products', headers, rows, 'Inventory');
  }

  exportSalesCSV(sales = null) {
    const list = sales || storageService.getCollection('SALES');
    const headers = ['Invoice No', 'Date', 'Customer Name', 'Phone', 'Items Count', 'Subtotal', 'Tax', 'Discount', 'Total Billed', 'Amount Received', 'Due Amount', 'Payment Status', 'Method'];
    const rows = list.map(s => [
      s.id,
      s.date,
      s.customerName,
      s.customerPhone || '',
      s.items ? s.items.length : 0,
      s.subtotal || s.amount,
      s.tax || 0,
      s.discount || 0,
      s.amount,
      s.paidAmount !== undefined ? s.paidAmount : (s.status === 'Completed' || s.status === 'Paid' ? s.amount : 0),
      s.dueAmount || 0,
      s.status,
      s.paymentMethod || 'UPI'
    ]);
    return this.downloadCSV('sales_invoices', headers, rows, 'Sales');
  }

  exportPurchasesCSV(purchases = null) {
    const list = purchases || storageService.getCollection('PURCHASES');
    const headers = ['PO Number', 'Date', 'Supplier Name', 'Items Count', 'Total Amount', 'Status', 'Received Date'];
    const rows = list.map(p => [
      p.id,
      p.date,
      p.supplierName,
      p.itemsCount || (p.items ? p.items.length : 0),
      p.amount,
      p.status,
      p.receivedAt ? new Date(p.receivedAt).toLocaleDateString() : 'N/A'
    ]);
    return this.downloadCSV('purchase_orders', headers, rows, 'Purchase');
  }

  exportSuppliersCSV(suppliers = null) {
    const list = suppliers || storageService.getCollection('SUPPLIERS');
    const headers = ['ID', 'Supplier Name', 'Contact Person', 'Email', 'Phone', 'Address', 'Status', 'Total Purchases'];
    const rows = list.map(s => [
      s.id,
      s.name,
      s.contactPerson,
      s.email,
      s.phone,
      s.address,
      s.status,
      s.totalPurchases
    ]);
    return this.downloadCSV('suppliers_directory', headers, rows, 'Suppliers');
  }

  exportFullJSON() {
    const data = storageService.exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    if (typeof document !== 'undefined' && document.body) {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventoryiq_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    return { success: true, data };
  }
}

export const exportService = new ExportService();
