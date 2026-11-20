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

  // Prevent duplicate barcode across distinct products
  if (product.barcode && String(product.barcode).trim()) {
    const cleanBarcode = String(product.barcode).trim().toLowerCase();
    const duplicateBarcode = existingProducts.find(
      p => p.barcode && String(p.barcode).trim().toLowerCase() === cleanBarcode && String(p.id) !== String(product.id)
    );
    if (duplicateBarcode) {
      errors.push(`Barcode "${cleanBarcode}" is already assigned to "${duplicateBarcode.name}".`);
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

  // Validate invoice-level discount (Task 2)
  if (sale.discount !== undefined && sale.discount !== null && sale.discount !== '') {
    const discNum = Number(sale.discount);
    if (isNaN(discNum) || !isFinite(discNum)) {
      errors.push('Discount must be a valid number.');
    } else if (discNum < 0) {
      errors.push('Discount cannot be negative.');
    } else if (sale.subtotal !== undefined && discNum > Number(sale.subtotal)) {
      errors.push(`Discount (₹${discNum}) cannot exceed invoice subtotal (₹${sale.subtotal}); discount cannot be greater than subtotal.`);
    }
  }

  // Validate tax rate
  if (sale.taxRate !== undefined && sale.taxRate !== null && sale.taxRate !== '') {
    const taxNum = Number(sale.taxRate);
    if (isNaN(taxNum) || !isFinite(taxNum) || taxNum < 0 || taxNum > 100) {
      errors.push('Tax rate must be a valid percentage between 0% and 100%.');
    }
  }

  // Aggregate quantities by product ID to detect stock exhaustion across duplicate lines
  const aggregatedQuantities = new Map();

  sale.items.forEach((item, index) => {
    const itemLabel = item.name || `Item #${index + 1}`;
    const qty = Number(item.qty);
    if (!isPositiveNumber(qty) || !isFinite(qty)) {
      errors.push(`Item #${index + 1} (${itemLabel}) has an invalid quantity.`);
    }

    const price = Number(item.price);
    if (isNaN(price) || !isFinite(price) || price < 0) {
      errors.push(`Item #${index + 1} (${itemLabel}) has an invalid price.`);
    }

    if (item.discount !== undefined && item.discount !== null && item.discount !== '') {
      const lineDisc = Number(item.discount);
      if (isNaN(lineDisc) || !isFinite(lineDisc) || lineDisc < 0 || lineDisc > 100) {
        errors.push(`Item #${index + 1} (${itemLabel}) discount must be between 0% and 100%.`);
      }
    }

    if (item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== '') {
      const lineGst = Number(item.gstRate);
      if (isNaN(lineGst) || !isFinite(lineGst) || lineGst < 0 || lineGst > 100) {
        errors.push(`Item #${index + 1} (${itemLabel}) GST rate must be between 0% and 100%.`);
      }
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
      if (!prod) {
        errors.push(`Product #${prodId} (${data.name}) was not found in catalog; does not exist in product catalog.`);
      } else if (Number(prod.stock) < data.qty) {
        errors.push(`Insufficient stock for "${prod.name}". Available: ${prod.stock}, Total Requested: ${data.qty}. Requested quantity exceeds available inventory.`);
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
  if (!purchase || typeof purchase !== 'object') {
    return { isValid: false, errors: ['Invalid purchase order record.'] };
  }

  if (!purchase.supplierName && !purchase.supplierId) {
    errors.push('Supplier is required for purchase order.');
  }

  if (!purchase.items || !Array.isArray(purchase.items) || purchase.items.length === 0) {
    errors.push('Purchase order must contain at least one item.');
    return { isValid: false, errors };
  }

  purchase.items.forEach((item, index) => {
    const itemLabel = item.name || `Item #${index + 1}`;
    const qty = Number(item.qty);
    if (!isPositiveNumber(qty) || !isFinite(qty)) {
      errors.push(`Item #${index + 1} (${itemLabel}) quantity must be a positive number greater than zero.`);
    }

    const cost = Number(item.cost !== undefined ? item.cost : (item.costPrice !== undefined ? item.costPrice : item.price));
    if (isNaN(cost) || !isFinite(cost) || cost < 0) {
      errors.push(`Item #${index + 1} (${itemLabel}) unit cost cannot be negative and must be a valid number.`);
    }
  });

  if (purchase.amount !== undefined && purchase.amount !== null) {
    const amount = Number(purchase.amount);
    if (!isNonNegativeNumber(amount)) {
      errors.push('Total purchase amount must be non-negative.');
    }
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
