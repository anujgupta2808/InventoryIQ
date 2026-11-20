/**
 * Production Authentication & Identity Service
 * Integrates Supabase Auth with PostgreSQL Row-Level Security, TOTP MFA,
 * and remote session lifecycle management.
 * Provides client-side PBKDF2 Web Crypto fallback for zero-dependency demo operation.
 * NEVER stores plaintext passwords.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import { mfaService } from './mfaService.js';
import { sessionService } from './sessionService.js';
import {
  derivePasswordHash,
  verifyPassword,
  generateDemoToken,
  isSessionExpired
} from '../utils/cryptoAuth.js';
import { safeGet, safeSet } from '../utils/storageUtils.js';
import { STORAGE_KEYS, storageService } from './storageService.js';
import { DEFAULT_USERS } from '../data/seedData.js';
import { isValidEmail, isValidGSTIN } from '../utils/validators.js';

export function validatePasswordPolicy(password) {
  const str = String(password || '');
  if (str.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(str)) {
    return { valid: false, message: 'Password must include at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(str)) {
    return { valid: false, message: 'Password must include at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(str) && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(str)) {
    return { valid: false, message: 'Password must include at least one number or special character.' };
  }
  return { valid: true };
}

export class AuthService {
  constructor() {
    this.sessionStorageKey = 'iq_v4_session';
    this.legacySessionKey = 'iq_v3_session';
  }

  getStoredUsers() {
    try {
      const users = safeGet(STORAGE_KEYS.USERS, null) || safeGet('iq_v3_users', null);
      if (Array.isArray(users) && users.length > 0) {
        // Sanitize: remove any legacy plaintext password properties from memory/storage
        const sanitized = users.map(u => {
          if (u.password) {
            const { password, ...clean } = u;
            return clean;
          }
          return u;
        });
        const hasAdmin = sanitized.some(u => u.email && u.email.toLowerCase() === 'admin@inventoryiq.com');
        if (!hasAdmin) {
          const merged = [...DEFAULT_USERS, ...sanitized];
          safeSet(STORAGE_KEYS.USERS, merged);
          return merged;
        }
        return sanitized;
      }
      safeSet(STORAGE_KEYS.USERS, DEFAULT_USERS);
      return DEFAULT_USERS;
    } catch (e) {
      console.warn('Failed to retrieve stored users:', e);
      return DEFAULT_USERS;
    }
  }

  setStoredUsers(users) {
    // Ensure plaintext passwords are never persisted
    const sanitized = (users || []).map(u => {
      const { password, ...clean } = u;
      return clean;
    });
    safeSet(STORAGE_KEYS.USERS, sanitized);
    safeSet('iq_v3_users', sanitized);
  }

  getStoredSession() {
    try {
      let sessionStr = localStorage.getItem(this.sessionStorageKey) || 
                       sessionStorage.getItem(this.sessionStorageKey) ||
                       localStorage.getItem(this.legacySessionKey) ||
                       sessionStorage.getItem(this.legacySessionKey);

      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed && (parsed.token || parsed.access_token) && parsed.user && parsed.user.email) {
          if (isSessionExpired(parsed, 30)) {
            this.logout();
            return null;
          }
          return parsed;
        }
      }
      return null;
    } catch (e) {
      console.warn('Failed to read session:', e);
      return null;
    }
  }

  /**
   * Main Login Handler: Supabase Auth with TOTP MFA check & Demo Fallback
   */
  async login({ email, password, rememberMe = true }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    if (!cleanEmail) {
      return { success: false, message: 'Email address is required.' };
    }
    if (!cleanPass) {
      return { success: false, message: 'Password is required.' };
    }

    // 1. SUPABASE AUTH (Production Mode)
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass
        });

        if (error) {
          return { success: false, message: error.message };
        }

        const supabaseUser = data.user;
        if (!supabaseUser) {
          return { success: false, message: 'Authentication failed. Please verify your credentials.' };
        }

        // Check if MFA is enforced for this user
        const assurance = await mfaService.getAssuranceLevel();
        if (assurance.isEnrolled && assurance.nextLevel === 'aal2' && assurance.currentLevel === 'aal1') {
          const factors = await mfaService.listFactors();
          const verifiedTotp = factors.totp.find(f => f.status === 'verified');
          if (verifiedTotp) {
            return {
              success: true,
              requiresMFA: true,
              factorId: verifiedTotp.id,
              user: {
                id: supabaseUser.id,
                email: supabaseUser.email,
                name: supabaseUser.user_metadata?.full_name || cleanEmail
              }
            };
          }
        }

        // Fetch user profile and organization membership
        let userProfile = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.full_name || 'Admin',
          email: supabaseUser.email,
          role: 'owner',
          organizationName: supabaseUser.user_metadata?.organization_name || 'InventoryIQ Store',
          organizationType: supabaseUser.user_metadata?.organization_type || 'Retail Store / Shop',
          gstin: supabaseUser.user_metadata?.gstin || '',
          currency: 'INR',
          currencySymbol: '₹'
        };

        try {
          const { data: memberData } = await supabase
            .from('organization_members')
            .select('role, organization_id, organizations(name, organization_type, gstin)')
            .eq('user_id', supabaseUser.id)
            .maybeSingle();

          if (memberData) {
            userProfile.role = memberData.role || 'owner';
            userProfile.organizationId = memberData.organization_id;
            if (memberData.organizations) {
              userProfile.organizationName = memberData.organizations.name;
              userProfile.organizationType = memberData.organizations.organization_type;
              userProfile.gstin = memberData.organizations.gstin || '';
            }
          }
        } catch (dbErr) {
          console.warn('Profile/Org load notice:', dbErr.message);
        }

        // Register session in backend
        await sessionService.registerCurrentSession(supabaseUser);

        const sessionData = {
          user: userProfile,
          access_token: data.session.access_token,
          token: data.session.access_token,
          rememberMe: Boolean(rememberMe),
          loginTime: new Date().toISOString(),
          isSupabaseSession: true
        };

        this._persistSession(sessionData, rememberMe);
        return { success: true, session: sessionData, user: userProfile };
      } catch (err) {
        return { success: false, message: err.message || 'An error occurred during authentication.' };
      }
    }

    // 2. DEMO CLIENT-SIDE MODE (Only allowed in Development / Unit Testing)
    if (import.meta.env.PROD) {
      return {
        success: false,
        message: 'Authentication service unavailable: Production Supabase database connection is not configured.'
      };
    }

    const allUsers = this.getStoredUsers();
    const matchedUser = allUsers.find(u => u.email && u.email.toLowerCase() === cleanEmail);

    if (!matchedUser) {
      return { success: false, message: 'No registered account found with this email in demo store.' };
    }

    const isMatch = await verifyPassword(cleanPass, matchedUser);
    if (!isMatch) {
      return { success: false, message: 'Incorrect password. Please verify your credentials and try again.' };
    }

    const cleanUser = {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role || 'owner',
      organizationName: matchedUser.organizationName || matchedUser.businessName || 'InventoryIQ Store',
      businessName: matchedUser.businessName || matchedUser.organizationName || 'InventoryIQ Store',
      organizationType: matchedUser.organizationType || 'Retail Store / Shop',
      gstin: matchedUser.gstin || '',
      phone: matchedUser.phone || '',
      currency: matchedUser.currency || 'INR',
      currencySymbol: matchedUser.currencySymbol || '₹'
    };

    const sessionData = {
      user: cleanUser,
      token: generateDemoToken(),
      rememberMe: Boolean(rememberMe),
      loginTime: new Date().toISOString(),
      isDemoSession: true
    };

    this._persistSession(sessionData, rememberMe);
    return { success: true, session: sessionData, user: cleanUser };
  }

  _persistSession(sessionData, rememberMe) {
    try {
      const sessStr = JSON.stringify(sessionData);
      if (rememberMe) {
        localStorage.setItem(this.sessionStorageKey, sessStr);
        localStorage.setItem(this.legacySessionKey, sessStr);
        sessionStorage.removeItem(this.sessionStorageKey);
        sessionStorage.removeItem(this.legacySessionKey);
      } else {
        sessionStorage.setItem(this.sessionStorageKey, sessStr);
        sessionStorage.setItem(this.legacySessionKey, sessStr);
        localStorage.removeItem(this.sessionStorageKey);
        localStorage.removeItem(this.legacySessionKey);
      }
    } catch (e) {
      console.warn('Unable to persist session storage:', e);
    }
  }

  /**
   * Complete MFA step during sign in
   */
  async verifyLoginMFA({ factorId, code }) {
    const result = await mfaService.verifyChallenge({ factorId, code });
    if (!result.success) {
      return result;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      return { success: false, message: 'Session restoration failed following MFA verification.' };
    }

    const user = sessionData.session.user;
    await sessionService.registerCurrentSession(user);

    const userProfile = {
      id: user.id,
      name: user.user_metadata?.full_name || 'Admin',
      email: user.email,
      role: 'owner',
      organizationName: user.user_metadata?.organization_name || 'InventoryIQ Store',
      organizationType: user.user_metadata?.organization_type || 'Retail Store / Shop',
      gstin: user.user_metadata?.gstin || '',
      currency: 'INR',
      currencySymbol: '₹'
    };

    const newSession = {
      user: userProfile,
      access_token: sessionData.session.access_token,
      token: sessionData.session.access_token,
      rememberMe: true,
      loginTime: new Date().toISOString(),
      isSupabaseSession: true,
      mfaVerified: true
    };

    this._persistSession(newSession, true);
    return { success: true, user: userProfile, session: newSession };
  }

  /**
   * Registration Handler
   */
  async register({
    fullName,
    email,
    password,
    organizationName,
    organizationType = 'Retail Store / Shop',
    gstin = ''
  }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(fullName || '').trim();
    const cleanPass = String(password || '');
    const cleanOrgName = String(organizationName || '').trim();
    const cleanOrgType = String(organizationType || '').trim() || 'Retail Store / Shop';
    const cleanGstin = String(gstin || '').trim().toUpperCase();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: 'Full Name must be at least 2 characters long.' };
    }
    if (!isValidEmail(cleanEmail)) {
      return { success: false, message: 'Please enter a valid email address (e.g. name@company.com).' };
    }
    if (!cleanOrgName || cleanOrgName.length < 2) {
      return { success: false, message: 'Please enter your Organization or Business Name.' };
    }
    if (cleanGstin && !isValidGSTIN(cleanGstin)) {
      return { success: false, message: 'GSTIN must follow the standard 15-character format (e.g. 07AAAAA0000A1Z5).' };
    }

    const passCheck = validatePasswordPolicy(cleanPass);
    if (!passCheck.valid) {
      return { success: false, message: passCheck.message };
    }

    // 1. SUPABASE REGISTRATION
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: {
            data: {
              full_name: cleanName,
              organization_name: cleanOrgName,
              organization_type: cleanOrgType,
              gstin: cleanGstin
            }
          }
        });

        if (error) {
          return { success: false, message: error.message };
        }

        return {
          success: true,
          user: {
            id: data.user?.id,
            email: cleanEmail,
            name: cleanName,
            role: 'owner',
            organizationName: cleanOrgName
          },
          requiresEmailConfirmation: !data.session
        };
      } catch (err) {
        return { success: false, message: err.message || 'Registration failed.' };
      }
    }

    // 2. DEMO REGISTRATION (Only allowed in Development / Unit Testing)
    if (import.meta.env.PROD) {
      return {
        success: false,
        message: 'Registration service unavailable: Production Supabase database connection is not configured.'
      };
    }

    const allUsers = this.getStoredUsers();
    const exists = allUsers.some(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { success: false, message: 'An account with this email already exists in demo records. Please sign in.' };
    }

    const { hash, salt, iterations } = await derivePasswordHash(cleanPass);

    const newUser = {
      id: Date.now(),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hash,
      salt,
      iterations,
      role: 'owner',
      organizationName: cleanOrgName,
      businessName: cleanOrgName,
      organizationType: cleanOrgType,
      gstin: cleanGstin,
      phone: '',
      currency: 'INR',
      currencySymbol: '₹',
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...allUsers, newUser];
    this.setStoredUsers(updatedUsers);

    const { passwordHash, salt: _s, iterations: _it, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  }

  /**
   * Secure Password Reset Request (Supabase Auth / Non-Enumerating Generic Response)
   */
  async requestPasswordReset(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return { success: false, message: 'Please enter a valid registered email address.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const redirectUrl = typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}#/reset-password`
          : undefined;

        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl
        });
      } catch (err) {
        // Suppress backend error to prevent email enumeration attacks
      }

      // Always return uniform generic response (OWASP Anti-Enumeration Principle)
      return {
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.'
      };
    }

    if (import.meta.env.PROD) {
      return {
        success: false,
        message: 'Password recovery unavailable: Production database connection is not configured.'
      };
    }

    // Development/Test mock flow: Generic non-enumerating response
    return {
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.'
    };
  }

  /**
   * Password Reset Completion
   */
  async resetPassword({ newPassword, confirmPassword, demoResetSession }) {
    const cleanPass = String(newPassword || '');
    const cleanConfirm = String(confirmPassword || '');

    const passCheck = validatePasswordPolicy(cleanPass);
    if (!passCheck.valid) {
      return { success: false, message: passCheck.message };
    }

    if (cleanPass !== cleanConfirm) {
      return { success: false, message: 'Passwords do not match. Please re-enter identical passwords.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.updateUser({ password: cleanPass });
        if (error) throw error;
        return { success: true, message: 'Password has been updated successfully.' };
      } catch (err) {
        return { success: false, message: err.message || 'Failed to update password.' };
      }
    }

    if (!demoResetSession || !demoResetSession.email) {
      return { success: false, message: 'No active recovery request found. Please initiate password recovery.' };
    }

    if (Date.now() > demoResetSession.expiresAt) {
      return { success: false, message: 'This recovery session has expired. Please request a new recovery link.' };
    }

    const targetEmail = demoResetSession.email.toLowerCase();
    const allUsers = this.getStoredUsers();
    const userIndex = allUsers.findIndex(u => u.email && u.email.toLowerCase() === targetEmail);
    if (userIndex === -1) {
      return { success: false, message: `Target account "${targetEmail}" was not found.` };
    }

    const { hash, salt, iterations } = await derivePasswordHash(cleanPass);

    const updatedUsers = allUsers.map((u, i) => {
      if (i === userIndex) {
        const { password: _legacyPass, ...rest } = u;
        return {
          ...rest,
          passwordHash: hash,
          salt,
          iterations,
          passwordUpdatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    this.setStoredUsers(updatedUsers);
    return { success: true, targetEmail };
  }

  /**
   * In-App Password Change
   */
  async changePassword({ user, currentPassword, newPassword }) {
    if (!user || !user.email) {
      return { success: false, message: 'You must be logged in to change your password.' };
    }

    const cleanCurrent = String(currentPassword || '');
    const cleanNew = String(newPassword || '');

    const passCheck = validatePasswordPolicy(cleanNew);
    if (!passCheck.valid) {
      return { success: false, message: passCheck.message };
    }

    if (isSupabaseConfigured()) {
      try {
        // Re-authenticate user before allowing password change
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: cleanCurrent
        });
        if (signInErr) {
          return { success: false, message: 'Current password is incorrect.' };
        }

        const { error: updateErr } = await supabase.auth.updateUser({ password: cleanNew });
        if (updateErr) throw updateErr;

        return { success: true, message: 'Master password changed successfully.' };
      } catch (err) {
        return { success: false, message: err.message || 'Password update failed.' };
      }
    }

    const allUsers = this.getStoredUsers();
    const currentUserRecord = allUsers.find(u => u.email && u.email.toLowerCase() === user.email.toLowerCase());

    if (!currentUserRecord) {
      return { success: false, message: 'Account not found in demo records.' };
    }

    const isMatch = await verifyPassword(cleanCurrent, currentUserRecord);
    if (!isMatch) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    const { hash, salt, iterations } = await derivePasswordHash(cleanNew);

    const updatedUsers = allUsers.map(u => {
      if (u.email && u.email.toLowerCase() === user.email.toLowerCase()) {
        const { password: _legacyPass, ...rest } = u;
        return {
          ...rest,
          passwordHash: hash,
          salt,
          iterations,
          passwordUpdatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    this.setStoredUsers(updatedUsers);
    return { success: true };
  }

  updateUserProfile(currentUser, profileData) {
    if (!currentUser || !currentUser.email) return currentUser;

    const updated = {
      ...currentUser,
      ...profileData
    };

    const allUsers = this.getStoredUsers();
    const updatedUsers = allUsers.map(u =>
      u.email.toLowerCase() === currentUser.email.toLowerCase() ? { ...u, ...profileData } : u
    );
    this.setStoredUsers(updatedUsers);

    const sess = this.getStoredSession();
    if (sess) {
      sess.user = updated;
      this._persistSession(sess, sess.rememberMe !== false);
    }

    return updated;
  }

  async logout() {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase sign-out error:', e);
    }

    try {
      localStorage.removeItem(this.sessionStorageKey);
      localStorage.removeItem(this.legacySessionKey);
      sessionStorage.removeItem(this.sessionStorageKey);
      sessionStorage.removeItem(this.legacySessionKey);
      storageService.clearMemoryCache();
    } catch (e) {
      console.warn('Logout cleanup error:', e);
    }
  }

  // Session Management Delegators
  async getSessions(user) {
    return await sessionService.getActiveSessions(user);
  }

  async revokeSession(id) {
    return await sessionService.revokeSession(id);
  }

  async revokeAllOtherSessions(currentId) {
    return await sessionService.revokeAllOtherSessions(currentId);
  }
}

export const authService = new AuthService();
