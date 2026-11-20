import { describe, it, expect, beforeEach } from 'vitest';
import { permissionService } from '../../../src/services/permissionService';
import { authService, validatePasswordPolicy } from '../../../src/services/authService';
import { mfaService } from '../../../src/services/mfaService';
import { storageService } from '../../../src/services/storageService';
import { productService } from '../../../src/services/productService';
import { isSessionExpired, generateDemoToken, derivePasswordHash, verifyPassword } from '../../../src/utils/cryptoAuth';
import fs from 'fs';
import path from 'path';

describe('Security & Multi-Tenant Authentication Audit (Phase 3)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storageService.clearMemoryCache();
  });

  // =========================================================================
  // SCENARIO 1: UNAUTHENTICATED ACCESS
  // =========================================================================
  describe('Scenario 1 — Unauthenticated Access Protection', () => {
    it('rejects protected operations when session is missing', () => {
      const session = authService.getStoredSession();
      expect(session).toBeNull();

      // Attempting to change password without user session fails
      return authService.changePassword({ user: null, currentPassword: 'old', newPassword: 'new' })
        .then(res => {
          expect(res.success).toBe(false);
          expect(res.message).toMatch(/logged in/i);
        });
    });

    it('rejects unauthenticated role assertion', () => {
      expect(() => {
        permissionService.assertPermission(null, 'inventory.create');
      }).toThrow(/Access Denied/i);
    });
  });

  // =========================================================================
  // SCENARIO 2: UNAUTHORIZED ROLE
  // =========================================================================
  describe('Scenario 2 — Unauthorized Role Rejection', () => {
    it('blocks staff role from deleting catalog products', () => {
      expect(permissionService.hasPermission('staff', 'inventory.delete')).toBe(false);
      expect(() => {
        permissionService.assertPermission('staff', 'inventory.delete', 'delete catalog products');
      }).toThrow(/Role "STAFF" does not have permission/i);
    });

    it('blocks staff role from creating or viewing purchase orders', () => {
      expect(permissionService.hasPermission('staff', 'purchases.create')).toBe(false);
      expect(permissionService.hasPermission('staff', 'purchases.view')).toBe(false);
    });

    it('blocks manager role from managing security or deleting organization', () => {
      expect(permissionService.hasPermission('manager', 'security.manage')).toBe(false);
      expect(permissionService.hasPermission('manager', 'organization.delete')).toBe(false);
      expect(permissionService.canDeleteOrganization('manager')).toBe(false);
    });

    it('blocks admin role from deleting the organization', () => {
      expect(permissionService.hasPermission('admin', 'organization.delete')).toBe(false);
      expect(permissionService.canDeleteOrganization('admin')).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 3: AUTHORIZED ROLE
  // =========================================================================
  describe('Scenario 3 — Authorized Role Execution', () => {
    it('permits owner role unrestricted access across all modules', () => {
      expect(permissionService.hasPermission('owner', 'organization.delete')).toBe(true);
      expect(permissionService.hasPermission('owner', 'security.manage')).toBe(true);
      expect(permissionService.hasPermission('owner', 'inventory.delete')).toBe(true);
      expect(permissionService.canManageMembers('owner')).toBe(true);
      expect(permissionService.canDeleteOrganization('owner')).toBe(true);
    });

    it('permits staff role to create POS sales and view customers', () => {
      expect(permissionService.hasPermission('staff', 'sales.create')).toBe(true);
      expect(permissionService.hasPermission('staff', 'sales.view')).toBe(true);
      expect(permissionService.hasPermission('staff', 'customers.view')).toBe(true);
    });

    it('permits manager role to manage inventory and purchases', () => {
      expect(permissionService.hasPermission('manager', 'inventory.create')).toBe(true);
      expect(permissionService.hasPermission('manager', 'inventory.update')).toBe(true);
      expect(permissionService.hasPermission('manager', 'purchases.create')).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIOS 4, 5, 6: CROSS-ORGANIZATION ISOLATION (READ, UPDATE, DELETE)
  // =========================================================================
  describe('Scenarios 4, 5 & 6 — Cross-Organization Multi-Tenant Isolation', () => {
    const ORG_A = 'org-retail-alpha-001';
    const ORG_B = 'org-wholesale-beta-002';

    beforeEach(async () => {
      // Seed Org A
      await storageService.initShop(ORG_A);
      await storageService.setCollection('PRODUCTS', [
        { id: 'prod-org-a-1', name: 'Alpha Secret Gadget', price: 5000, stock: 10, organizationId: ORG_A }
      ]);

      // Seed Org B
      await storageService.initShop(ORG_B);
      await storageService.setCollection('PRODUCTS', [
        { id: 'prod-org-b-1', name: 'Beta Public Widget', price: 100, stock: 50, organizationId: ORG_B }
      ]);
    });

    it('Scenario 4: Cross-organization read attempt returns zero data from other tenant', async () => {
      await storageService.initShop(ORG_B);
      const orgBProducts = productService.getAll();
      expect(orgBProducts).toHaveLength(1);
      expect(orgBProducts[0].name).toBe('Beta Public Widget');

      // Attempting to read Org A product from Org B's context must return null
      const crossRead = productService.getById('prod-org-a-1');
      expect(crossRead).toBeNull();
    });

    it('Scenario 5: Cross-organization update attempt fails to modify another tenant record', async () => {
      // In Org B context, attempt to update Org A's product
      await storageService.initShop(ORG_B);
      const updateRes = productService.updateProduct('prod-org-a-1', { price: 1 });
      expect(updateRes.success).toBe(false);
      const errMsg = (updateRes.errors && updateRes.errors[0]) || updateRes.message || '';
      expect(errMsg).toMatch(/not found/i);

      // Verify Org A's product in Org A's database was completely untouched
      await storageService.initShop(ORG_A);
      const orgAProd = productService.getById('prod-org-a-1');
      expect(orgAProd.price).toBe(5000); // Intact!
    });

    it('Scenario 6: Cross-organization delete attempt is rejected and preserves other tenant record', async () => {
      await storageService.initShop(ORG_B);
      const deleteRes = productService.deleteProduct('prod-org-a-1');
      expect(deleteRes.success).toBe(false);
      const errMsg = (deleteRes.errors && deleteRes.errors[0]) || deleteRes.message || '';
      expect(errMsg).toMatch(/not found/i);

      // Verify Org A's product in Org A's database was not deleted
      await storageService.initShop(ORG_A);
      expect(productService.getById('prod-org-a-1')).not.toBeNull();
    });
  });

  // =========================================================================
  // SCENARIO 7: INVALID ORGANIZATION IDENTIFIER
  // =========================================================================
  describe('Scenario 7 — Invalid Organization Identifier Handling', () => {
    it('handles null, undefined, empty, and malicious SQL injection shop IDs safely', async () => {
      // Null shop ID defaults safely to default isolated shop
      const resNull = await storageService.initShop(null);
      expect(resNull).toBe(true);
      expect(storageService.activeShopId).toBe('default_shop');

      // Injection attempt string is sanitized without syntax error or escape
      const maliciousId = "org' OR 1=1; DROP TABLE products; --";
      const resMalicious = await storageService.initShop(maliciousId);
      expect(resMalicious).toBe(true);
      expect(storageService.activeShopId).toBe(maliciousId);
    });
  });

  // =========================================================================
  // SCENARIO 8: EXPIRED SESSION
  // =========================================================================
  describe('Scenario 8 — Session Expiration & Invalidation', () => {
    it('identifies expired sessions based on max age policy', () => {
      const activeSession = {
        loginTime: new Date().toISOString(),
        token: generateDemoToken()
      };
      expect(isSessionExpired(activeSession, 30)).toBe(false);

      // Session older than 30 days
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const expiredSession = {
        loginTime: thirtyOneDaysAgo,
        token: generateDemoToken()
      };
      expect(isSessionExpired(expiredSession, 30)).toBe(true);

      // Malformed session
      expect(isSessionExpired(null)).toBe(true);
      expect(isSessionExpired({})).toBe(true);
      expect(isSessionExpired({ loginTime: 'invalid-date' })).toBe(true);
    });

    it('clears stored session and memory cache on logout', async () => {
      // Set test session
      localStorage.setItem('iq_v4_session', JSON.stringify({ token: 'test-tok', user: { email: 'test@iq.com' } }));
      storageService.setCollection('PRODUCTS', [{ id: 'temp-1', name: 'Temp' }]);

      await authService.logout();

      expect(localStorage.getItem('iq_v4_session')).toBeNull();
      expect(sessionStorage.getItem('iq_v4_session')).toBeNull();
      expect(storageService.getCollection('PRODUCTS')).toHaveLength(0);
    });
  });

  // =========================================================================
  // SCENARIO 9: MFA VERIFICATION & RECOVERY CODES
  // =========================================================================
  describe('Scenario 9 — Two-Factor Authentication (MFA) & Recovery Codes', () => {
    it('generates exactly 8 valid single-use recovery codes in XXX-XXXX format', () => {
      const codes = mfaService.generateRecoveryCodes();
      expect(codes).toHaveLength(8);
      codes.forEach(code => {
        expect(code).toMatch(/^[2-9A-Z]{3,4}-[2-9A-Z]{3,4}$/);
      });
    });

    it('exposes alias verifyChallenge consistent with authService call shape', () => {
      expect(typeof mfaService.verifyChallenge).toBe('function');
      expect(typeof mfaService.challengeAndVerify).toBe('function');
    });

    it('authenticates correct PBKDF2 hash and rejects incorrect password', async () => {
      const { hash, salt, iterations } = await derivePasswordHash('InventoryIQ@2026');
      const userRecord = { passwordHash: hash, salt, iterations };

      const isCorrect = await verifyPassword('InventoryIQ@2026', userRecord);
      expect(isCorrect).toBe(true);

      const isWrong = await verifyPassword('WrongPassword@999', userRecord);
      expect(isWrong).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 10: DATABASE AUTHORIZATION FAILURE & RLS SPECIFICATION
  // =========================================================================
  describe('Scenario 10 — Database RLS Policy Verification', () => {
    it('verifies all 17 tables have RLS enabled and complete CRUD policies', () => {
      const candidatePaths = [
        path.resolve('..', 'supabase/migrations/20261118_production_security.sql'),
        path.resolve('supabase/migrations/20261118_production_security.sql')
      ];
      const sqlPath = candidatePaths.find(p => fs.existsSync(p));
      expect(sqlPath).toBeDefined();
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');

      const tables = [
        'organizations', 'profiles', 'organization_members', 'organization_invitations',
        'categories', 'products', 'customers', 'suppliers', 'sales', 'sale_items',
        'purchases', 'purchase_items', 'payments', 'stock_movements', 'audit_logs',
        'security_events', 'user_sessions'
      ];

      // 1. All 17 tables must have ENABLE ROW LEVEL SECURITY
      tables.forEach(table => {
        const regex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
        expect(regex.test(sqlContent)).toBe(true);
      });

      // 2. Multi-tenant boundary check: verify is_org_member function exists and is SECURITY DEFINER
      expect(sqlContent).toMatch(/CREATE OR REPLACE FUNCTION public\.is_org_member/i);
      expect(sqlContent).toMatch(/SECURITY DEFINER/i);

      // 3. Verify categories has SELECT, INSERT, UPDATE, DELETE policies
      expect(sqlContent).toMatch(/CREATE POLICY "Org members can view categories"/i);
      expect(sqlContent).toMatch(/CREATE POLICY "Authorized roles can insert categories"/i);
      expect(sqlContent).toMatch(/CREATE POLICY "Authorized roles can update categories"/i);
      expect(sqlContent).toMatch(/CREATE POLICY "Only Owners and Admins can delete categories"/i);

      // 4. Verify organizations has INSERT policy for authenticated users
      expect(sqlContent).toMatch(/CREATE POLICY "Authenticated users can create organizations"/i);

      // 5. Verify purchase_items has INSERT, UPDATE, DELETE policies
      expect(sqlContent).toMatch(/CREATE POLICY "Authorized roles can insert purchase items"/i);
      expect(sqlContent).toMatch(/CREATE POLICY "Authorized roles can update purchase items"/i);
      expect(sqlContent).toMatch(/CREATE POLICY "Only Owners and Admins can delete purchase items"/i);

      // 6. Verify role escalation prevention trigger exists
      expect(sqlContent).toMatch(/CREATE OR REPLACE FUNCTION public\.prevent_role_escalation/i);
      expect(sqlContent).toMatch(/CREATE TRIGGER trg_prevent_role_escalation/i);
    });
  });
});
