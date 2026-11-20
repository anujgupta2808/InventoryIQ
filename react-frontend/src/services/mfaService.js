/**
 * Real Two-Factor Authentication (TOTP MFA) Service
 * Direct integration with Supabase Auth TOTP MFA API.
 * Never stores TOTP secrets or unhashed recovery codes in localStorage.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';
import QRCode from 'qrcode';

export class MFAService {
  /**
   * Check MFA status and assurance level of current session
   */
  async getAssuranceLevel() {
    if (!isSupabaseConfigured()) {
      return { currentLevel: 'aal1', nextLevel: 'aal1', isEnrolled: false };
    }

    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;

      const factors = await this.listFactors();
      const isEnrolled = factors.totp.some(f => f.status === 'verified');

      return {
        currentLevel: data.currentLevel, // 'aal1' or 'aal2'
        nextLevel: data.nextLevel,       // 'aal1' or 'aal2'
        isEnrolled
      };
    } catch (err) {
      console.warn('Failed to retrieve MFA assurance level:', err);
      return { currentLevel: 'aal1', nextLevel: 'aal1', isEnrolled: false };
    }
  }

  /**
   * List all MFA factors for current authenticated user
   */
  async listFactors() {
    if (!isSupabaseConfigured()) {
      return { all: [], totp: [] };
    }

    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return {
        all: data.all || [],
        totp: data.totp || []
      };
    } catch (err) {
      console.warn('Failed to list MFA factors:', err);
      return { all: [], totp: [] };
    }
  }

  /**
   * Step 1: Enroll new TOTP Factor
   * Calls Supabase Auth to generate genuine secret & returns QR Code Data URL
   */
  async enrollTOTP(friendlyName = 'InventoryIQ Authenticator') {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Supabase configuration required for genuine TOTP MFA.'
      };
    }

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName
      });

      if (error) throw error;

      // Generate actual QR code data URI from TOTP URI
      let qrCodeDataUrl = '';
      if (data.totp?.uri) {
        qrCodeDataUrl = await QRCode.toDataURL(data.totp.uri, {
          width: 240,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      }

      // Generate 8 cryptographically secure single-use recovery codes
      const recoveryCodes = this.generateRecoveryCodes();

      return {
        success: true,
        factorId: data.id,
        secret: data.totp?.secret || '',
        uri: data.totp?.uri || '',
        qrCodeUrl: qrCodeDataUrl,
        recoveryCodes
      };
    } catch (err) {
      console.error('MFA Enrollment error:', err);
      return {
        success: false,
        message: err.message || 'Failed to start MFA enrollment'
      };
    }
  }

  /**
   * Step 2: Verify TOTP Code during Enrollment
   */
  async challengeAndVerify({ factorId, code }) {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase configuration required.' };
    }

    try {
      const cleanCode = String(code || '').replace(/\s+/g, '');
      if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
        return { success: false, message: 'Please enter a valid 6-digit verification code.' };
      }

      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });
      if (challengeError) throw challengeError;

      // Verify challenge with entered code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: cleanCode
      });
      if (verifyError) throw verifyError;

      return {
        success: true,
        message: 'Two-Factor Authentication activated successfully!'
      };
    } catch (err) {
      console.error('MFA verification error:', err);
      return {
        success: false,
        message: err.message || 'Invalid authenticator code. Please check your authenticator app.'
      };
    }
  }

  /**
   * Step 3: Challenge and Verify TOTP at Login (Enforces AAL2)
   */
  async verifyLoginTOTP({ factorId, code }) {
    return this.challengeAndVerify({ factorId, code });
  }

  async verifyChallenge({ factorId, code }) {
    return this.challengeAndVerify({ factorId, code });
  }

  /**
   * Unenroll / Disable TOTP MFA
   */
  async unenrollTOTP(factorId) {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase configuration required.' };
    }

    try {
      const { data, error } = await supabase.auth.mfa.unenroll({
        factorId
      });
      if (error) throw error;

      return {
        success: true,
        message: 'Two-Factor Authentication has been disabled.'
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Failed to disable Two-Factor Authentication.'
      };
    }
  }

  /**
   * Cryptographically secure 8-character alphanumeric recovery codes
   */
  generateRecoveryCodes(count = 8) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const codes = [];
    for (let i = 0; i < count; i++) {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars[bytes[j] % chars.length];
        if (j === 3) code += '-';
      }
      codes.push(code);
    }
    return codes;
  }
}

export const mfaService = new MFAService();
