/**
 * InventoryIQ - Demo Authentication Cryptography Utilities
 * 
 * IMPORTANT DEMO NOTICE:
 * This module derives client-side password hashes using the browser's Web Crypto
 * API (PBKDF2 with SHA-256 and unique per-account salt). This is implemented
 * solely for a high-fidelity frontend demonstration to avoid storing plaintext
 * passwords in localStorage. It is NOT equivalent to server-side authentication
 * and MUST NOT be represented or used as production security.
 */

// Convert ArrayBuffer to Hex String
const bufferToHex = (buffer) => {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert Hex String to Uint8Array
const hexToBuffer = (hexString) => {
  const cleanHex = String(hexString || '').trim();
  const matches = cleanHex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
};

// Generate random salt (16 bytes = 128 bits)
export const generateSalt = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    return bufferToHex(salt);
  }
  // Fallback for non-browser or test environments
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
};

/**
 * Derives a PBKDF2 hash from a password and salt using Web Crypto.
 * @param {string} password 
 * @param {string} [existingSalt] 
 * @param {number} [iterations=100000]
 * @returns {Promise<{ hash: string, salt: string, iterations: number }>}
 */
export const derivePasswordHash = async (password, existingSalt = null, iterations = 100000) => {
  const saltHex = existingSalt || generateSalt();
  const saltBuffer = hexToBuffer(saltHex);
  const enc = new TextEncoder();
  const passBuffer = enc.encode(String(password || ''));

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        256 // 256 bits = 32 bytes
      );

      return {
        hash: bufferToHex(derivedBits),
        salt: saltHex,
        iterations
      };
    } catch (err) {
      console.warn('Web Crypto PBKDF2 failed, using fallback derivation:', err);
    }
  }

  // Graceful fallback if subtle crypto is unavailable
  let hashVal = 0;
  const combined = `${password}:${saltHex}`;
  for (let i = 0; i < combined.length; i++) {
    hashVal = ((hashVal << 5) - hashVal) + combined.charCodeAt(i);
    hashVal |= 0;
  }
  return {
    hash: `fallback_${Math.abs(hashVal).toString(16)}`,
    salt: saltHex,
    iterations
  };
};

/**
 * Verifies a candidate password against a stored user credential record.
 * Handles:
 * 1. PBKDF2 hashed password records (`passwordHash` + `salt`).
 * 2. Demo seed legacy record (`password: 'admin'`).
 * 
 * @param {string} candidatePassword 
 * @param {object} userRecord 
 * @returns {Promise<boolean>}
 */
export const verifyPassword = async (candidatePassword, userRecord) => {
  if (!userRecord || candidatePassword === undefined || candidatePassword === null) {
    return false;
  }

  const candidate = String(candidatePassword);

  // 1. If stored with PBKDF2 hash & salt
  if (userRecord.passwordHash && userRecord.salt) {
    const derived = await derivePasswordHash(candidate, userRecord.salt, userRecord.iterations || 100000);
    return derived.hash === userRecord.passwordHash;
  }

  // 2. Fallback / legacy demo credentials (e.g. admin@inventoryiq.com with password: 'admin')
  if (userRecord.password) {
    return userRecord.password === candidate;
  }

  return false;
};

/**
 * Generate a demo session token.
 */
export const generateDemoToken = () => {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `iq_demo_token_${time}_${rand}`;
};

/**
 * Checks whether a demo session has expired (e.g., 30 days inactivity limit).
 */
export const isSessionExpired = (sessionData, maxAgeDays = 30) => {
  if (!sessionData || !sessionData.loginTime) return true;
  const loginTime = new Date(sessionData.loginTime).getTime();
  if (isNaN(loginTime)) return true;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return (Date.now() - loginTime) > maxAgeMs;
};
