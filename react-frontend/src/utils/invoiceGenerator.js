/**
 * Serial number and reference generators for Invoices, Purchase Orders, Payments, and SKUs
 */

export const generateInvoiceNumber = (prefix = 'S', existingSales = []) => {
  // Existing system uses S-1001, S-1002 format
  let maxNum = 1000;

  existingSales.forEach(s => {
    if (s && s.id) {
      const match = String(s.id).match(/^S-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  return `${prefix}-${maxNum + 1}`;
};

export const generatePurchaseNumber = (prefix = 'PO', existingPurchases = []) => {
  // Existing system uses PO-2001, PO-2002 format
  let maxNum = 2000;

  existingPurchases.forEach(p => {
    if (p && p.id) {
      const match = String(p.id).match(/^PO-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  return `${prefix}-${maxNum + 1}`;
};

export const generatePaymentId = (prefix = 'PAY') => {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${Date.now()}${rand}`;
};

export const generateSKU = (category = 'GEN', existingProducts = []) => {
  const prefix = String(category || 'GEN')
    .trim()
    .slice(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, 'X') || 'SKU';

  let highest = 0;
  existingProducts.forEach(p => {
    if (p && p.sku) {
      const clean = p.sku.toUpperCase();
      if (clean.startsWith(prefix)) {
        const numPart = clean.replace(prefix, '').replace(/[^0-9]/g, '');
        const n = parseInt(numPart, 10);
        if (!isNaN(n) && n > highest) highest = n;
      }
    }
  });

  const nextNum = String(highest + 1).padStart(3, '0');
  return `${prefix}-${nextNum}`;
};
