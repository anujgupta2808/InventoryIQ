/**
 * Safe LocalStorage & SessionStorage utilities
 * Provides error handling, quota detection, and safe JSON serialization.
 */

export const isStorageAvailable = (type = 'localStorage') => {
  try {
    const storage = window[type];
    const testKey = '__iq_storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export const safeJsonParse = (str, fallback = null) => {
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('safeJsonParse failed:', e);
    return fallback;
  }
};

export const safeJsonStringify = (data, fallback = '') => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    console.error('safeJsonStringify failed:', e);
    return fallback;
  }
};

export const safeGet = (key, fallback = null, storage = localStorage) => {
  try {
    const item = storage.getItem(key);
    if (item === null) return fallback;
    return safeJsonParse(item, fallback);
  } catch (e) {
    console.warn(`safeGet failed for key "${key}":`, e);
    return fallback;
  }
};

export const safeSet = (key, value, storage = localStorage) => {
  try {
    const serialized = typeof value === 'string' ? value : safeJsonStringify(value);
    storage.setItem(key, serialized);
    return true;
  } catch (e) {
    console.error(`safeSet failed for key "${key}":`, e);
    return false;
  }
};

export const safeRemove = (key, storage = localStorage) => {
  try {
    storage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`safeRemove failed for key "${key}":`, e);
    return false;
  }
};

export const getStorageUsage = () => {
  let totalBytes = 0;
  try {
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (localStorage[key].length + key.length) * 2;
      }
    }
  } catch (e) {
    // ignore
  }
  return {
    bytes: totalBytes,
    kb: (totalBytes / 1024).toFixed(2),
    mb: (totalBytes / (1024 * 1024)).toFixed(2)
  };
};
