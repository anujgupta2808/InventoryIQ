/**
 * Financial and inventory calculations with decimal/cent precision.
 * Avoids common JavaScript IEEE-754 floating point precision quirks.
 */

export const roundTo = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((n + Number.EPSILON) * factor) / factor;
};

// Integer paise/cent converters
export const toPaise = (amount) => Math.round(Number(amount || 0) * 100);
export const fromPaise = (paise) => Math.round(Number(paise || 0)) / 100;

export const calculateItemTotal = (price, qty, gstRate = 0, discountPercent = 0) => {
  const p = Number(price) || 0;
  const q = Number(qty) || 0;
  const rawSubtotal = p * q;
  const discountAmount = rawSubtotal * (Number(discountPercent) / 100);
  const taxableAmount = Math.max(0, rawSubtotal - discountAmount);
  const gstAmount = taxableAmount * (Number(gstRate) / 100);
  const total = taxableAmount + gstAmount;

  return {
    rawSubtotal: roundTo(rawSubtotal),
    discountAmount: roundTo(discountAmount),
    taxableAmount: roundTo(taxableAmount),
    gstAmount: roundTo(gstAmount),
    total: roundTo(total)
  };
};

export const calculateSaleTotals = (items = [], overallDiscount = 0, taxRate = 0) => {
  let subtotal = 0;
  let totalGst = 0;

  items.forEach(item => {
    const p = Number(item.price) || 0;
    const q = Number(item.qty) || 0;
    const gst = Number(item.gstRate || taxRate || 0);
    const itemCalc = calculateItemTotal(p, q, gst, item.discount || 0);
    subtotal += itemCalc.taxableAmount;
    totalGst += itemCalc.gstAmount;
  });

  const disc = Number(overallDiscount) || 0;
  const finalSubtotal = Math.max(0, subtotal - disc);
  const grandTotal = roundTo(finalSubtotal + totalGst);

  return {
    subtotal: roundTo(subtotal),
    discount: roundTo(disc),
    tax: roundTo(totalGst),
    amount: grandTotal
  };
};

export const calculatePurchaseTotals = (items = [], taxRate = 0) => {
  let subtotal = 0;
  let tax = 0;

  items.forEach(item => {
    const cost = Number(item.cost || item.price) || 0;
    const qty = Number(item.qty) || 0;
    const rate = Number(item.gstRate || taxRate || 0);
    const itemTotal = cost * qty;
    const itemTax = itemTotal * (rate / 100);
    subtotal += itemTotal;
    tax += itemTax;
  });

  return {
    subtotal: roundTo(subtotal),
    tax: roundTo(tax),
    amount: roundTo(subtotal + tax)
  };
};

export const calculateStockValuation = (products = []) => {
  let costValuation = 0;
  let sellingValuation = 0;
  let totalUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach(p => {
    const stock = Number(p.stock) || 0;
    const minStock = Number(p.minStock) || 0;
    const cost = Number(p.costPrice) || 0;
    const price = Number(p.price) || 0;

    totalUnits += stock;
    costValuation += stock * cost;
    sellingValuation += stock * price;

    if (stock <= 0) {
      outOfStockCount++;
    } else if (stock <= minStock) {
      lowStockCount++;
    }
  });

  const potentialProfit = Math.max(0, sellingValuation - costValuation);

  return {
    costValuation: roundTo(costValuation),
    sellingValuation: roundTo(sellingValuation),
    potentialProfit: roundTo(potentialProfit),
    totalUnits,
    lowStockCount,
    outOfStockCount
  };
};

export const calculateGrossProfit = (sales = [], purchases = []) => {
  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalExpenditure = purchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const estimatedProfit = Math.max(0, totalRevenue - totalExpenditure);

  return {
    revenue: roundTo(totalRevenue),
    expenditure: roundTo(totalExpenditure),
    profit: roundTo(estimatedProfit)
  };
};

export const calculateCustomerBalances = (sales = [], customerName = '') => {
  const target = String(customerName || '').trim().toLowerCase();
  let totalBilled = 0;
  let totalReceived = 0;
  let totalDue = 0;

  sales.forEach(s => {
    if (!target || (s.customerName && s.customerName.trim().toLowerCase() === target)) {
      const amt = Number(s.amount) || 0;
      const paid = s.paidAmount !== undefined
        ? Number(s.paidAmount) || 0
        : (s.status === 'Completed' || s.status === 'Paid' ? amt : 0);
      const due = s.dueAmount !== undefined
        ? Number(s.dueAmount) || 0
        : Math.max(0, amt - paid);

      totalBilled += amt;
      totalReceived += paid;
      totalDue += due;
    }
  });

  return {
    totalBilled: roundTo(totalBilled),
    totalReceived: roundTo(totalReceived),
    totalDue: roundTo(totalDue)
  };
};

export const calculateSupplierBalances = (purchases = [], supplierNameOrId = '') => {
  const target = String(supplierNameOrId || '').trim().toLowerCase();
  let totalPurchased = 0;
  let totalPaid = 0;
  let totalDue = 0;

  purchases.forEach(p => {
    const match = !target || 
      (p.supplierName && p.supplierName.trim().toLowerCase() === target) ||
      (p.supplierId && String(p.supplierId) === target);

    if (match) {
      const amt = Number(p.amount) || 0;
      const paid = p.paidAmount !== undefined
        ? Number(p.paidAmount) || 0
        : (p.status === 'Completed' ? amt : 0);
      const due = p.dueAmount !== undefined
        ? Number(p.dueAmount) || 0
        : Math.max(0, amt - paid);

      totalPurchased += amt;
      totalPaid += paid;
      totalDue += due;
    }
  });

  return {
    totalPurchased: roundTo(totalPurchased),
    totalPaid: roundTo(totalPaid),
    totalDue: roundTo(totalDue)
  };
};
