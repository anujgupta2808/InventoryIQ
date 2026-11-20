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

/**
 * Normalizes sale line items by consolidating duplicate product lines
 * to prevent stock deduction glitches and concurrency bugs.
 */
export const aggregateSaleItems = (items = []) => {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  items.forEach(item => {
    const key = item.productId 
      ? String(item.productId) 
      : `item_${String(item.name || '').trim().toLowerCase()}`;
    const qty = Number(item.qty) || 0;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.qty = roundTo(existing.qty + qty, 2);
    } else {
      map.set(key, { ...item, qty });
    }
  });
  return Array.from(map.values());
};

export const calculateItemTotal = (price, qty, gstRate = 0, discountPercent = 0) => {
  const pricePaise = toPaise(price);
  const q = Number(qty) || 0;
  const rawSubtotalPaise = Math.round(pricePaise * q);
  const discountPaise = Math.round(rawSubtotalPaise * (Number(discountPercent || 0) / 100));
  const taxablePaise = Math.max(0, rawSubtotalPaise - discountPaise);
  const gstPaise = Math.round(taxablePaise * (Number(gstRate || 0) / 100));
  const totalPaise = taxablePaise + gstPaise;

  return {
    rawSubtotal: fromPaise(rawSubtotalPaise),
    discountAmount: fromPaise(discountPaise),
    taxableAmount: fromPaise(taxablePaise),
    gstAmount: fromPaise(gstPaise),
    total: fromPaise(totalPaise),
    totalPaise
  };
};

export const calculateSaleTotals = (items = [], overallDiscount = 0, taxRate = 0) => {
  let subtotalPaise = 0;
  let totalGstPaise = 0;

  items.forEach(item => {
    const p = Number(item.price) || 0;
    const q = Number(item.qty) || 0;
    const gst = Number(item.gstRate !== undefined ? item.gstRate : (taxRate || 0));
    const itemCalc = calculateItemTotal(p, q, gst, item.discount || 0);
    subtotalPaise += toPaise(itemCalc.taxableAmount);
    totalGstPaise += toPaise(itemCalc.gstAmount);
  });

  const discPaise = toPaise(overallDiscount);
  const finalSubtotalPaise = Math.max(0, subtotalPaise - discPaise);
  const grandTotalPaise = finalSubtotalPaise + totalGstPaise;

  return {
    subtotal: fromPaise(subtotalPaise),
    discount: fromPaise(discPaise),
    tax: fromPaise(totalGstPaise),
    amount: fromPaise(grandTotalPaise),
    amountPaise: grandTotalPaise
  };
};

export const calculatePurchaseTotals = (items = [], taxRate = 0) => {
  let subtotalPaise = 0;
  let taxPaise = 0;

  items.forEach(item => {
    const cost = Number(item.cost !== undefined ? item.cost : item.price) || 0;
    const qty = Number(item.qty) || 0;
    const rate = Number(item.gstRate !== undefined ? item.gstRate : (taxRate || 0));
    const itemTotalPaise = Math.round(toPaise(cost) * qty);
    const itemTaxPaise = Math.round(itemTotalPaise * (rate / 100));
    subtotalPaise += itemTotalPaise;
    taxPaise += itemTaxPaise;
  });

  const grandTotalPaise = subtotalPaise + taxPaise;

  return {
    subtotal: fromPaise(subtotalPaise),
    tax: fromPaise(taxPaise),
    amount: fromPaise(grandTotalPaise),
    amountPaise: grandTotalPaise
  };
};

export const calculateStockValuation = (products = []) => {
  let costValuationPaise = 0;
  let sellingValuationPaise = 0;
  let totalUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach(p => {
    const stock = Number(p.stock) || 0;
    const minStock = Number(p.minStock) || 0;
    const costPaise = toPaise(p.costPrice);
    const pricePaise = toPaise(p.price);

    totalUnits += stock;
    costValuationPaise += Math.round(stock * costPaise);
    sellingValuationPaise += Math.round(stock * pricePaise);

    if (stock <= 0) {
      outOfStockCount++;
    } else if (stock <= minStock) {
      lowStockCount++;
    }
  });

  const potentialProfitPaise = Math.max(0, sellingValuationPaise - costValuationPaise);

  return {
    costValuation: fromPaise(costValuationPaise),
    sellingValuation: fromPaise(sellingValuationPaise),
    potentialProfit: fromPaise(potentialProfitPaise),
    totalUnits,
    lowStockCount,
    outOfStockCount
  };
};

/**
 * Calculates Gross Profit using GAAP/IFRS standard:
 * Gross Profit = Revenue - COGS (Cost of Goods Sold)
 * Tracks actual cost_at_sale for historical accuracy.
 */
export const calculateGrossProfit = (sales = [], purchases = []) => {
  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalExpenditure = purchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Compute COGS: Sum of (item.qty * cost_at_sale) across all sold items
  let totalCOGS = 0;
  let hasItemCosts = false;

  sales.forEach(s => {
    if (Array.isArray(s.items) && s.items.length > 0) {
      s.items.forEach(item => {
        const cost = Number(item.cost !== undefined ? item.cost : (item.costPrice || 0));
        const qty = Number(item.qty) || 0;
        if (cost > 0) hasItemCosts = true;
        totalCOGS += cost * qty;
      });
    }
  });

  // If sale line items had cost details, use COGS; otherwise fall back to purchases expenditure
  const effectiveCost = hasItemCosts ? totalCOGS : totalExpenditure;
  const grossProfit = Math.max(0, totalRevenue - effectiveCost);

  return {
    revenue: roundTo(totalRevenue),
    cogs: roundTo(totalCOGS),
    expenditure: roundTo(totalExpenditure),
    profit: roundTo(grossProfit)
  };
};

export const calculateCustomerBalances = (sales = [], customerNameOrId = '') => {
  const target = String(customerNameOrId || '').trim().toLowerCase();
  let totalBilled = 0;
  let totalReceived = 0;
  let totalDue = 0;

  sales.forEach(s => {
    const match = !target ||
      (s.customerId && String(s.customerId).toLowerCase() === target) ||
      (s.customerName && s.customerName.trim().toLowerCase() === target);

    if (match) {
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
