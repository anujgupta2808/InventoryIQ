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

export const calculateSaleTotals = (items = [], overallDiscount = 0, taxRate = 0, options = {}) => {
  const isInterState = Boolean(options.isInterState);
  let rawSubtotalPaise = 0;
  let lineDiscountPaiseTotal = 0;
  let subtotalPaise = 0;

  // First pass: compute line subtotal and line discounts
  const preliminaryLines = items.map(item => {
    const p = Math.max(0, Number(item.price) || 0);
    const q = Math.max(0, Number(item.qty) || 0);
    const gstRate = Number(item.gstRate !== undefined ? item.gstRate : (taxRate || 0));
    const lineDiscount = Number(item.discount || 0);

    const pricePaise = toPaise(p);
    const lineRawPaise = Math.round(pricePaise * q);
    const lineDiscPaise = Math.round(lineRawPaise * (Math.max(0, Math.min(100, lineDiscount)) / 100));
    const lineTaxableBeforeOverallPaise = Math.max(0, lineRawPaise - lineDiscPaise);

    rawSubtotalPaise += lineRawPaise;
    lineDiscountPaiseTotal += lineDiscPaise;
    subtotalPaise += lineTaxableBeforeOverallPaise;

    return {
      item,
      p,
      q,
      gstRate,
      lineDiscount,
      lineRawPaise,
      lineDiscPaise,
      lineTaxableBeforeOverallPaise
    };
  });

  // Invoice-level discount (percentage or fixed amount)
  let discPaise = 0;
  if (options.discountType === 'percentage') {
    const pct = Math.max(0, Math.min(100, Number(overallDiscount) || 0));
    discPaise = Math.round(subtotalPaise * (pct / 100));
  } else {
    discPaise = Math.min(subtotalPaise, Math.max(0, toPaise(overallDiscount || 0)));
  }

  // Apportion overall discount proportionally across line items to compute taxable amount before GST
  let allocatedDiscPaiseSum = 0;
  let totalTaxablePaise = 0;
  let totalGstPaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;

  const calculatedLines = preliminaryLines.map((pl, idx) => {
    let lineOverallDiscPaise = 0;
    if (subtotalPaise > 0 && discPaise > 0) {
      if (idx === preliminaryLines.length - 1) {
        lineOverallDiscPaise = Math.max(0, discPaise - allocatedDiscPaiseSum);
      } else {
        lineOverallDiscPaise = Math.round(discPaise * (pl.lineTaxableBeforeOverallPaise / subtotalPaise));
        allocatedDiscPaiseSum += lineOverallDiscPaise;
      }
    }

    const effectiveTaxablePaise = Math.max(0, pl.lineTaxableBeforeOverallPaise - lineOverallDiscPaise);
    const lineTaxPaise = Math.round(effectiveTaxablePaise * (Math.max(0, pl.gstRate) / 100));
    const lineTotalPaise = effectiveTaxablePaise + lineTaxPaise;

    const lineCgstPaise = isInterState ? 0 : Math.round(lineTaxPaise / 2);
    const lineSgstPaise = isInterState ? 0 : (lineTaxPaise - lineCgstPaise);
    const lineIgstPaise = isInterState ? lineTaxPaise : 0;

    totalTaxablePaise += effectiveTaxablePaise;
    totalGstPaise += lineTaxPaise;
    totalCgstPaise += lineCgstPaise;
    totalSgstPaise += lineSgstPaise;
    totalIgstPaise += lineIgstPaise;

    return {
      ...pl.item,
      price: pl.p,
      qty: pl.q,
      gstRate: pl.gstRate,
      discount: pl.lineDiscount,
      rawSubtotal: fromPaise(pl.lineRawPaise),
      discountAmount: fromPaise(pl.lineDiscPaise + lineOverallDiscPaise),
      taxableAmount: fromPaise(effectiveTaxablePaise),
      tax: fromPaise(lineTaxPaise),
      cgst: fromPaise(lineCgstPaise),
      sgst: fromPaise(lineSgstPaise),
      igst: fromPaise(lineIgstPaise),
      total: fromPaise(lineTotalPaise),
      totalPaise: lineTotalPaise
    };
  });

  const grandTotalPaise = totalTaxablePaise + totalGstPaise;

  return {
    rawSubtotal: fromPaise(rawSubtotalPaise),
    subtotal: fromPaise(subtotalPaise),
    lineDiscounts: fromPaise(lineDiscountPaiseTotal),
    discount: fromPaise(discPaise),
    overallDiscount: fromPaise(discPaise),
    totalDiscount: fromPaise(lineDiscountPaiseTotal + discPaise),
    taxableAmount: fromPaise(totalTaxablePaise),
    tax: fromPaise(totalGstPaise),
    cgst: fromPaise(totalCgstPaise),
    sgst: fromPaise(totalSgstPaise),
    igst: fromPaise(totalIgstPaise),
    isInterState,
    amount: fromPaise(grandTotalPaise),
    amountPaise: grandTotalPaise,
    items: calculatedLines
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
 * Tracks actual cost_at_sale for historical accuracy, with reverse COGS on customer returns.
 */
export const calculateGrossProfit = (sales = [], purchases = [], returns = []) => {
  // Cancelled sales must not be counted as completed sales (Task 6)
  const activeSales = sales.filter(s => s && s.status !== 'Cancelled');
  const rawRevenue = activeSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalExpenditure = purchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Calculate customer returns deduction
  let customerReturnsTotal = 0;
  if (Array.isArray(returns) && returns.length > 0) {
    customerReturnsTotal = returns
      .filter(r => r && (r.type === 'CUSTOMER_RETURN' || r.type === 'RETURN'))
      .reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);
  } else {
    // Fall back to line-item returned quantities or sale.returnedAmount
    activeSales.forEach(s => {
      if (s.returnedAmount) {
        customerReturnsTotal += Number(s.returnedAmount) || 0;
      } else if (Array.isArray(s.items)) {
        s.items.forEach(item => {
          if (Number(item.returnedQty) > 0) {
            const price = Number(item.price) || 0;
            customerReturnsTotal += price * Number(item.returnedQty);
          }
        });
      }
    });
  }

  const totalRevenue = Math.max(0, rawRevenue - customerReturnsTotal);

  // Compute COGS: Sum of (effectiveNetQty * cost_at_sale) across all active sold items
  let totalCOGS = 0;
  let hasItemCosts = false;

  activeSales.forEach(s => {
    if (Array.isArray(s.items) && s.items.length > 0) {
      s.items.forEach(item => {
        const cost = Number(item.cost !== undefined ? item.cost : (item.costPrice || 0));
        const soldQty = Number(item.qty) || 0;
        const retQty = Number(item.returnedQty) || 0;
        const netQty = Math.max(0, soldQty - retQty);
        if (cost > 0) hasItemCosts = true;
        totalCOGS += cost * netQty;
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
    // Exclude cancelled invoices from active debtor balances
    if (s && s.status === 'Cancelled') return;

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
    totalDue: roundTo(totalDue),
    currentDue: roundTo(totalDue)
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
