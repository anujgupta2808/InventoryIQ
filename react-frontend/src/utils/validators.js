/**
 * Input validators and integrity verification utilities
 */

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
};

export const isValidPhone = (phone) => {
  if (!phone) return true; // Phone is often optional
  const digits = String(phone).replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

export const isValidGSTIN = (gstin) => {
  if (!gstin) return true; // Optional in many flows
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(String(gstin).trim().toUpperCase());
};

export const isValidSKU = (sku) => {
  if (!sku || typeof sku !== 'string') return false;
  const trimmed = sku.trim();
  return trimmed.length >= 2 && trimmed.length <= 40;
};

export const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 8;
};

export const isNonNegativeNumber = (val) => {
  if (val === null || val === undefined || val === '') return false;
  const num = Number(val);
  return !isNaN(num) && isFinite(num) && num >= 0;
};

export const isPositiveNumber = (val) => {
  if (val === null || val === undefined || val === '') return false;
  const num = Number(val);
  return !isNaN(num) && isFinite(num) && num > 0;
};

export const validateProduct = (product, existingProducts = []) => {
  const errors = [];
  if (!product || typeof product !== 'object') {
    return { isValid: false, errors: ['Invalid product record.'] };
  }

  const cleanName = String(product.name || '').trim();
  if (!cleanName) {
    errors.push('Product name is required.');
  }

  const cleanSku = String(product.sku || '').trim();
  if (!cleanSku) {
    errors.push('SKU is required.');
  } else {
    const duplicate = existingProducts.find(
      p => p.sku && String(p.sku).trim().toLowerCase() === cleanSku.toLowerCase() && String(p.id) !== String(product.id)
    );
    if (duplicate) {
      errors.push(`SKU "${cleanSku}" is already assigned to "${duplicate.name}".`);
    }
  }

  if (!isNonNegativeNumber(product.stock)) {
    errors.push('Stock quantity must be a non-negative number.');
  }

  if (product.minStock !== undefined && !isNonNegativeNumber(product.minStock)) {
    errors.push('Minimum stock must be a non-negative number.');
  }

  if (!isNonNegativeNumber(product.price)) {
    errors.push('Selling price must be a non-negative number.');
  }

  if (product.costPrice !== undefined && !isNonNegativeNumber(product.costPrice)) {
    errors.push('Cost price must be a non-negative number.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSale = (sale, existingProducts = []) => {
  const errors = [];
  if (!sale || !sale.items || !Array.isArray(sale.items) || sale.items.length === 0) {
    errors.push('Sale must contain at least one product line item.');
    return { isValid: false, errors };
  }

  // Aggregate quantities by product ID to detect stock exhaustion across duplicate lines
  const aggregatedQuantities = new Map();

  sale.items.forEach((item, index) => {
    const qty = Number(item.qty);
    if (!isPositiveNumber(qty)) {
      errors.push(`Item #${index + 1} (${item.name || 'Unknown'}) has an invalid quantity.`);
    }

    if (item.productId) {
      const pKey = String(item.productId);
      const prev = aggregatedQuantities.get(pKey) || { qty: 0, name: item.name || 'Product' };
      aggregatedQuantities.set(pKey, {
        qty: prev.qty + (Number(item.qty) || 0),
        name: item.name || prev.name
      });
    }
  });

  // Check stock against aggregated quantities
  if (existingProducts.length > 0) {
    for (const [prodId, data] of aggregatedQuantities.entries()) {
      const prod = existingProducts.find(p => String(p.id) === String(prodId));
      if (prod) {
        if (Number(prod.stock) < data.qty) {
          errors.push(`Insufficient stock for "${prod.name}". Available: ${prod.stock}, Total Requested: ${data.qty}.`);
        }
      }
    }
  }

  const amount = Number(sale.amount);
  if (!isNonNegativeNumber(amount)) {
    errors.push('Total sale amount must be non-negative.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePurchase = (purchase) => {
  const errors = [];
  if (!purchase.supplierName && !purchase.supplierId) {
    errors.push('Supplier is required for purchase order.');
  }

  if (!purchase.items || !Array.isArray(purchase.items) || purchase.items.length === 0) {
    errors.push('Purchase order must contain at least one item.');
  }

  const amount = Number(purchase.amount);
  if (!isNonNegativeNumber(amount)) {
    errors.push('Total purchase amount must be non-negative.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCustomer = (customer) => {
  const errors = [];
  if (!customer.name || !String(customer.name).trim()) {
    errors.push('Customer name is required.');
  }
  if (customer.email && !isValidEmail(customer.email)) {
    errors.push('Customer email format is invalid.');
  }
  if (customer.gstin && !isValidGSTIN(customer.gstin)) {
    errors.push('Customer GSTIN format is invalid.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSupplier = (supplier) => {
  const errors = [];
  if (!supplier.name || !String(supplier.name).trim()) {
    errors.push('Supplier name is required.');
  }
  if (supplier.email && !isValidEmail(supplier.email)) {
    errors.push('Supplier email format is invalid.');
  }
  if (supplier.gstin && !isValidGSTIN(supplier.gstin)) {
    errors.push('Supplier GSTIN format is invalid.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePayment = (payment, outstandingDue = null) => {
  const errors = [];
  const amt = Number(payment.amount);
  if (!isPositiveNumber(amt)) {
    errors.push('Payment amount must be greater than zero.');
  }

  if (outstandingDue !== null && outstandingDue !== undefined) {
    const due = Number(outstandingDue);
    if (amt > due + 0.01) { // minor rounding tolerance
      errors.push(`Payment amount (₹${amt}) exceeds outstanding due (₹${due}).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
