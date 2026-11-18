/**
 * Date manipulation, formatting, and filtering utilities
 */

export const getCurrentISODate = () => new Date().toISOString();

export const formatDisplayDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateVal);
  }
};

export const formatDisplayDateTime = (dateVal) => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const dateStr = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateStr} at ${timeStr}`;
  } catch (e) {
    return String(dateVal);
  }
};

export const formatDateShort = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return '';
  }
};

export const isWithinDateRange = (dateVal, startDate, endDate) => {
  if (!dateVal) return false;
  try {
    const d = new Date(dateVal).getTime();
    if (isNaN(d)) return true;
    if (startDate) {
      const s = new Date(startDate).getTime();
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate).getTime();
      if (d > e) return false;
    }
    return true;
  } catch {
    return true;
  }
};

export const getDateFilterRange = (period = 'all') => {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start: start.toISOString(), end: now.toISOString() };
    case 'this_week':
      start.setDate(now.getDate() - 7);
      return { start: start.toISOString(), end: now.toISOString() };
    case 'this_month':
      start.setMonth(now.getMonth() - 1);
      return { start: start.toISOString(), end: now.toISOString() };
    case 'this_year':
      start.setFullYear(now.getFullYear() - 1);
      return { start: start.toISOString(), end: now.toISOString() };
    case 'all':
    default:
      return { start: null, end: null };
  }
};

export const relativeTime = (dateVal) => {
  if (!dateVal) return 'Just now';
  try {
    const d = new Date(dateVal).getTime();
    if (isNaN(d)) return String(dateVal);
    const diffSec = Math.floor((Date.now() - d) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return formatDisplayDate(dateVal);
  } catch {
    return String(dateVal);
  }
};
