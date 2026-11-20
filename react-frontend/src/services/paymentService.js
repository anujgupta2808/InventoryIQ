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
    this.processedKeys = new Map();
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
    customerId = null,
    customerName = null,
    supplierName = null,
    partyType = null,
    partyName = null,
    amount,
    paymentMethod = 'UPI',
    transactionRef = '',
    note = '',
    user = 'Admin',
    idempotencyKey = null
  }) {
    if (idempotencyKey && this.processedKeys.has(idempotencyKey)) {
      return { ...this.processedKeys.get(idempotencyKey), idempotentReplay: true };
    }
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

      // Over-allocation handling: allocate up to currentDue to invoice; allocate remainder to customer advance
      const invoicePayment = roundTo(Math.min(payAmt, currentDue));
      const advanceAmount = roundTo(Math.max(0, payAmt - invoicePayment));

      const newPaid = roundTo(currentPaid + invoicePayment);
      const newDue = roundTo(Math.max(0, totalAmt - newPaid));
      const newStatus = newDue <= 0 ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');

      const historyEntry = {
        id: paymentId,
        date: dateStr,
        amount: invoicePayment,
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
        customerId: sale.customerId || null,
        referenceType: 'SALE',
        referenceId: saleId,
        amount: invoicePayment,
        paymentMethod,
        transactionRef,
        note: note || `Payment for invoice #${saleId}`,
        user,
        date: dateStr,
        createdAt: new Date().toISOString()
      };
      storageService.insertItem(this.collectionName, paymentRecord);

      // Record excess explicitly as customer advance/credit in ledger
      let advanceRecord = null;
      if (advanceAmount > 0) {
        advanceRecord = {
          id: `${paymentId}-ADV`,
          partyType: 'CUSTOMER',
          partyName: sale.customerName || 'Customer',
          customerId: sale.customerId || null,
          referenceType: 'ADVANCE',
          referenceId: `ADV-${saleId}`,
          amount: advanceAmount,
          paymentMethod,
          transactionRef,
          note: `Customer advance/credit balance from overpayment on invoice #${saleId}`,
          user,
          date: dateStr,
          createdAt: new Date().toISOString()
        };
        storageService.insertItem(this.collectionName, advanceRecord);
      }

      const res = {
        success: true,
        paymentId,
        affectedSales: [saleId],
        sale: { ...sale, paidAmount: newPaid, dueAmount: newDue, status: newStatus },
        advance: advanceRecord
      };
      if (idempotencyKey) {
        this.processedKeys.set(idempotencyKey, res);
      }
      return res;
    }

    // Case 2: FIFO Settlement across customer's overdue sales
    if (resolvedCustomer || customerId) {
      const cleanTarget = resolvedCustomer ? resolvedCustomer.trim().toLowerCase() : '';
      const targetCustId = customerId ? String(customerId) : null;
      const sales = storageService.getCollection('SALES');
      let remainingToAllocate = payAmt;
      const affectedSales = [];
      const updatedSales = [...sales];

      // Oldest to newest (excluding cancelled sales)
      for (let i = updatedSales.length - 1; i >= 0 && remainingToAllocate > 0; i--) {
        const s = updatedSales[i];
        if (s.status === 'Cancelled') continue;

        const matchesCust = (targetCustId && String(s.customerId) === targetCustId) ||
          (cleanTarget && (s.customerName || '').trim().toLowerCase() === cleanTarget);

        if (matchesCust) {
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

      const allocatedToInvoices = roundTo(payAmt - remainingToAllocate);

      const paymentRecord = {
        id: paymentId,
        partyType: 'CUSTOMER',
        partyName: resolvedCustomer || 'Customer',
        customerId: targetCustId,
        referenceType: remainingToAllocate > 0 && affectedSales.length === 0 ? 'ADVANCE' : 'CUSTOMER_LEDGER',
        referenceId: affectedSales.join(', ') || `ADV-${dateStr.replace(/[^0-9a-zA-Z]/g, '')}`,
        amount: payAmt,
        allocatedAmount: allocatedToInvoices,
        advanceAmount: remainingToAllocate,
        paymentMethod,
        transactionRef,
        note: note || (remainingToAllocate > 0 && affectedSales.length > 0
          ? `₹${allocatedToInvoices} applied to ${affectedSales.length} invoice(s), ₹${remainingToAllocate} recorded as customer advance`
          : (remainingToAllocate > 0 ? `Customer advance payment: ₹${remainingToAllocate}` : `Payment applied to ${affectedSales.length} invoice(s)`)),
        user,
        date: dateStr,
        createdAt: new Date().toISOString()
      };
      storageService.insertItem(this.collectionName, paymentRecord);

      const res = {
        success: true,
        paymentId,
        payment: paymentRecord,
        allocatedAmount: allocatedToInvoices,
        advanceAmount: remainingToAllocate,
        affectedSales
      };

      if (idempotencyKey) {
        this.processedKeys.set(idempotencyKey, res);
      }
      return res;
    }

    return { success: false, message: 'Either saleId, purchaseId, customerName, or partyName is required.' };
  }

  refundPayment({
    saleId,
    amount,
    reason = 'Customer Refund',
    user = 'Admin',
    idempotencyKey = null
  }) {
    if (idempotencyKey && this.processedKeys.has(idempotencyKey)) {
      return { ...this.processedKeys.get(idempotencyKey), idempotentReplay: true };
    }

    if (!saleId) {
      return { success: false, message: 'Sale ID is required for refund processing.' };
    }

    const refundAmt = roundTo(Number(amount) || 0);
    if (refundAmt <= 0 || isNaN(refundAmt) || !isFinite(refundAmt)) {
      return { success: false, message: 'Refund amount must be a positive number.' };
    }

    const sales = storageService.getCollection('SALES');
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) {
      return { success: false, message: `Invoice #${saleId} not found.` };
    }

    if (sale.status === 'Cancelled') {
      return { success: false, message: `Invoice #${saleId} is already cancelled.` };
    }

    const currentPaid = roundTo(Number(sale.paidAmount || 0));
    if (currentPaid <= 0) {
      return { success: false, message: `Invoice #${saleId} has no collected payments to refund.` };
    }

    if (refundAmt > currentPaid) {
      return {
        success: false,
        message: `Refund amount (₹${refundAmt}) cannot exceed total paid amount (₹${currentPaid}).`
      };
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const refundId = `REF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newPaid = roundTo(currentPaid - refundAmt);
    const totalAmt = roundTo(Number(sale.amount || 0));
    const newDue = roundTo(Math.max(0, totalAmt - newPaid));
    const newStatus = newPaid <= 0 ? (totalAmt === 0 ? 'Paid' : 'Unpaid') : (newDue > 0 ? 'Partial' : 'Paid');

    const refundHistoryEntry = {
      id: refundId,
      date: dateStr,
      amount: -refundAmt,
      method: 'REFUND',
      note: reason || 'Customer refund'
    };

    const updatedSale = storageService.updateItem('SALES', saleId, {
      paidAmount: newPaid,
      dueAmount: newDue,
      status: newStatus,
      paymentHistory: [...(sale.paymentHistory || []), refundHistoryEntry]
    });

    const paymentRecord = {
      id: refundId,
      partyType: 'CUSTOMER',
      partyName: sale.customerName || 'Customer',
      customerId: sale.customerId || null,
      referenceType: 'REFUND',
      referenceId: String(saleId),
      amount: -refundAmt,
      paymentMethod: 'REFUND',
      note: reason || `Refund issued for invoice #${saleId}`,
      user,
      date: dateStr,
      createdAt: now.toISOString()
    };
    storageService.insertItem(this.collectionName, paymentRecord);

    // Reconcile customer ledger balance if customer exists
    if (sale.customerId || sale.customerName) {
      const customers = storageService.getCollection('CUSTOMERS');
      const cust = customers.find(c => 
        (sale.customerId && String(c.id) === String(sale.customerId)) ||
        (sale.customerName && c.name && c.name.trim().toLowerCase() === sale.customerName.trim().toLowerCase())
      );
      if (cust) {
        const curReceived = Number(cust.totalReceived || 0);
        const curDue = Number(cust.currentDue || 0);
        storageService.updateItem('CUSTOMERS', cust.id, {
          totalReceived: roundTo(Math.max(0, curReceived - refundAmt)),
          currentDue: roundTo(curDue + refundAmt)
        });
      }
    }

    const res = {
      success: true,
      refundId,
      refundAmount: refundAmt,
      newPaidAmount: newPaid,
      newDueAmount: newDue,
      sale: updatedSale,
      payment: paymentRecord
    };

    if (idempotencyKey) {
      this.processedKeys.set(idempotencyKey, res);
    }
    return res;
  }

  reversePayment(paymentId, reason = 'Payment Reversal', user = 'Admin') {
    const payment = storageService.getItemById(this.collectionName, paymentId);
    if (!payment) {
      return { success: false, message: `Payment record #${paymentId} not found.` };
    }
    if (payment.referenceType === 'REFUND' || Number(payment.amount) < 0) {
      return { success: false, message: 'Cannot reverse a refund voucher.' };
    }

    if (payment.referenceType === 'SALE' && payment.referenceId) {
      return this.refundPayment({
        saleId: payment.referenceId,
        amount: Math.abs(Number(payment.amount)),
        reason: reason || `Reversal of payment #${paymentId}`,
        user
      });
    }

    // General ledger payment reversal
    const revId = `REV-${Date.now()}`;
    const revRecord = {
      id: revId,
      partyType: payment.partyType,
      partyName: payment.partyName,
      referenceType: 'REVERSAL',
      referenceId: paymentId,
      amount: -Math.abs(Number(payment.amount)),
      paymentMethod: payment.paymentMethod || 'Adjustment',
      note: reason,
      user,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString()
    };
    storageService.insertItem(this.collectionName, revRecord);
    return { success: true, reversal: revRecord };
  }
}

export const paymentService = new PaymentService();
