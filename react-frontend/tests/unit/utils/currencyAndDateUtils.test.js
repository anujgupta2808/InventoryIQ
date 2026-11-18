import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  parseCurrency,
  formatCompactNumber
} from '../../../src/utils/currencyUtils';
import {
  getCurrentISODate,
  formatDisplayDate,
  formatDisplayDateTime,
  formatDateShort,
  isWithinDateRange
} from '../../../src/utils/dateUtils';

describe('Currency and Date Utilities', () => {
  describe('currencyUtils', () => {
    it('formats Indian Rupee currency correctly', () => {
      const formatted = formatCurrency(125000, 'INR', '₹');
      expect(formatted).toContain('₹');
      expect(formatted).toContain('1,25,000');
    });

    it('formats standard US / International currency', () => {
      const formatted = formatCurrency(125000, 'USD', '$');
      expect(formatted).toBe('$125,000');
    });

    it('parses formatted currency strings back to numeric floats', () => {
      expect(parseCurrency('₹ 1,50,000.50')).toBe(150000.5);
      expect(parseCurrency('$450.00')).toBe(450);
      expect(parseCurrency(120)).toBe(120);
      expect(parseCurrency('')).toBe(0);
    });

    it('formats compact numbers for dashboards (Cr, L, k)', () => {
      expect(formatCompactNumber(15000000)).toBe('1.5 Cr');
      expect(formatCompactNumber(250000)).toBe('2.5 L');
      expect(formatCompactNumber(15000)).toBe('15.0k');
      expect(formatCompactNumber(450)).toBe('450');
    });
  });

  describe('dateUtils', () => {
    it('returns ISO string for current date', () => {
      const iso = getCurrentISODate();
      expect(typeof iso).toBe('string');
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('formats display dates', () => {
      expect(formatDisplayDate('2026-11-18')).toMatch(/Nov 18, 2026/);
      expect(formatDisplayDate('')).toBe('N/A');
    });

    it('formats date and time together', () => {
      const str = formatDisplayDateTime('2026-11-18T10:30:00Z');
      expect(str).toContain('Nov');
      expect(str).toContain('2026');
    });

    it('formats short YYYY-MM-DD date', () => {
      expect(formatDateShort('2026-11-18T12:00:00Z')).toBe('2026-11-18');
      expect(formatDateShort('')).toBe('');
    });

    it('checks whether date falls within a start and end range', () => {
      expect(isWithinDateRange('2026-11-15', '2026-11-01', '2026-11-30')).toBe(true);
      expect(isWithinDateRange('2026-10-15', '2026-11-01', '2026-11-30')).toBe(false);
      expect(isWithinDateRange('2026-12-05', '2026-11-01', '2026-11-30')).toBe(false);
    });
  });
});
