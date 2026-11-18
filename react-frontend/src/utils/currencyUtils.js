/**
 * Currency formatting and parsing utilities
 */

export const formatCurrency = (amount, currency = 'INR', symbol = '₹') => {
  const num = Number(amount) || 0;

  if (currency === 'INR') {
    return `${symbol}${num.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    })}`;
  }

  return `${symbol}${num.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}`;
};

export const parseCurrency = (str) => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCompactNumber = (num) => {
  const n = Number(num) || 0;
  if (n >= 10000000) {
    return (n / 10000000).toFixed(1) + ' Cr';
  }
  if (n >= 100000) {
    return (n / 100000).toFixed(1) + ' L';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'k';
  }
  return n.toLocaleString('en-IN');
};
