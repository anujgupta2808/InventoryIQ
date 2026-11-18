/**
 * Payment and Due Management Service
 * Centralizes Accounts Receivable & Accounts Payable payments with atomic allocation.
 */

import { storageService } from './storageService.js';
import { generatePaymentId } from '../utils/invoiceGenerator.js';
import { roundTo } from '../utils/calculations.js';
import { validatePayment } from '../utils/validators.js';

export class PaymentService {
  constructor() {
    this.collectionName = 'PAYMENTS';
  }

  getAll() {
    return storageService.getCollection(this.collectionName);
  }

  getPayments(filters = {}) {
    let payments = this.getAll();

    if (filters.partyType) {
      payments = payments.filter(p => p.partyType && p.partyType.toUpperCase() === filters.partyType.toUpperCase());
    }
    if (filters.referenceId) {
      payments = payments.filter(p => p.referenceId === filters.referenceId);
    }
    if (filters.partyName) {
      const target = filters.partyName.trim().toLowerCase();
      payments = payments.filter(p => p.partyName && p.partyName.trim().toLowerCase() === target);
    }

    return payments;
  }

  recordPayment({
    saleId = null,
    purchaseId = null,
    customerName = null,
    supplierName = null,
    partyType = null,
    partyName = null,
    amount,
    paymentMethod = 'UPI',
    transactionRef = '',
    note = '',
    user = 'Admin'
  }) {
    let resolvedCustomer = customerName || (partyType && String(partyType).toLowerCase() === 'customer' ? partyName : null);
    let resolvedSupplier = supplierName || (partyType && String(partyType).toLowerCase() === 'supplier' ? partyName : null);

    const payAmt = roundTo(Number(amount) || 0);
    const validation = validatePayment({ amount: payAmt });
    if (!validation.isValid) {
      return { success: false, message: validation.errors[0] };
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const paymentId = generatePaymentId('PAY');

    // Case 1: Payment against a specific Sales Invoice
    if (saleId) {
      const sales = storageService.getCollection('SALES');
      const sale = sales.find(s => s.id === saleId);
      if (!sale) {
        return { success: false, message: `Invoice #${saleId} not found.` };
      }

      const totalAmt = roundTo(Number(sale.amount) || 0);
      const currentPaid = roundTo(Number(sale.paidAmount !== undefined ? sale.paidAmount : (sale.status === 'Completed' || sale.status === 'Paid' ? sale.amount : 0)));
      const currentDue = roundTo(Math.max(0, totalAmt - currentPaid));

      if (payAmt > currentDue + 0.01) {
        return { success: false, message: `Payment ₹${payAmt} exceeds invoice due amount ₹${currentDue}.` };
      }

      const newPaid = roundTo(Math.min(totalAmt, currentPaid + payAmt));
      const newDue = roundTo(Math.max(0, totalAmt - newPaid));
      const newStatus = newDue <= 0 ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');

      const historyEntry = {
        id: paymentId,
        date: dateStr,
        amount: payAmt,
        method: paymentMethod,
        transactionRef,
        note: note || 'Payment received'
      };

      storageService.updateItem('SALES', saleId, {
        paidAmount: newPaid,
        dueAmount: newDue,
        status: newStatus,
        paymentHistory: [...(sale.paymentHistory || []), historyEntry]
      });

      // Record in centralized payments ledger
      const paymentRecord = {
        id: paymentId,
        partyType: 'CUSTOMER',
        partyName: sale.customerName || 'Customer',
        referenceType: 'SALE',
        referenceId: saleId,
        amount: payAmt,
        paymentMethod,
        transactionRef,
        note: note || `Payment for invoice #${saleId}`,
        user,
        date: dateStr,
        createdAt: new Date().toISOString()
      };
      storageService.insertItem(this.collectionName, paymentRecord);

      return {
        success: true,
        paymentId,
        affectedSales: [saleId],
        sale: { ...sale, paidAmount: newPaid, dueAmount: newDue, status: newStatus }
      };
    }

    // Case 2: FIFO Settlement across customer's overdue sales
    if (resolvedCustomer) {
      const cleanTarget = resolvedCustomer.trim().toLowerCase();
      const sales = storageService.getCollection('SALES');
      let remainingToAllocate = payAmt;
      const affectedSales = [];
      const updatedSales = [...sales];

      // Oldest to newest
      for (let i = updatedSales.length - 1; i >= 0 && remainingToAllocate > 0; i--) {
        const s = updatedSales[i];
        if ((s.customerName || '').trim().toLowerCase() === cleanTarget) {
          const totalAmt = roundTo(Number(s.amount) || 0);
          const currentPaid = roundTo(Number(s.paidAmount !== undefined ? s.paidAmount : (s.status === 'Completed' || s.status === 'Paid' ? s.amount : 0)));
          const currentDue = roundTo(Math.max(0, totalAmt - currentPaid));

          if (currentDue > 0) {
            const alloc = roundTo(Math.min(currentDue, remainingToAllocate));
            const newPaid = roundTo(currentPaid + alloc);
            const newDue = roundTo(Math.max(0, totalAmt - newPaid));
            const newStatus = newDue <= 0 ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');

            const historyEntry = {
              id: `${paymentId}-${s.id}`,
              date: dateStr,
              amount: alloc,
              method: paymentMethod,
              transactionRef,
              note: note || `Allocated installment for #${s.id}`
            };

            remainingToAllocate = roundTo(remainingToAllocate - alloc);
            affectedSales.push(s.id);

            updatedSales[i] = {
              ...s,
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newStatus,
              paymentHistory: [...(s.paymentHistory || []), historyEntry]
            };
          }
        }
      }

      storageService.setCollection('SALES', updatedSales);

      const paymentRecord = {
        id: paymentId,
        partyType: 'CUSTOMER',
        partyName: resolvedCustomer,
        referenceType: 'CUSTOMER_LEDGER',
        referenceId: affectedSales.join(', '),
        amount: payAmt,
        paymentMethod,
        transactionRef,
        note: note || `Ledger payment allocated to ${affectedSales.length} invoice(s)`,
        user,
        date: dateStr,
        createdAt: new Date().toISOString()
      };
      storageService.insertItem(this.collectionName, paymentRecord);

      return {
        success: true,
        paymentId,
        payment: paymentRecord,
        affectedSales
      };
    }

    return { success: false, message: 'Either saleId, purchaseId, customerName, or partyName is required.' };
  }
}

export const paymentService = new PaymentService();
