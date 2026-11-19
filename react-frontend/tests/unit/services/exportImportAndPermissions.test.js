import { describe, it, expect, vi } from 'vitest';
import { exportService } from '../../../src/services/exportService';
import { importService } from '../../../src/services/importService';
import { backupService } from '../../../src/services/backupService';
import { permissionService, ROLE_PERMISSIONS } from '../../../src/services/permissionService';

describe('Export, Import and Permission Services', () => {
  describe('exportService', () => {
    it('resolves clean top-line titles for reports', () => {
      expect(exportService.resolveReportTitle('analytics_report')).toBe('Analysis');
      expect(exportService.resolveReportTitle('party_due_tracker')).toBe('Party Due Tracker');
      expect(exportService.resolveReportTitle('sales_export')).toBe('Sales');
      expect(exportService.resolveReportTitle('purchases_list')).toBe('Purchase');
      expect(exportService.resolveReportTitle('products_catalog')).toBe('Inventory');
      expect(exportService.resolveReportTitle('suppliers_dir')).toBe('Suppliers');
      expect(exportService.resolveReportTitle('customers_list')).toBe('Customers');
    });

    it('returns error when exporting empty dataset', () => {
      const res = exportService.downloadCSV('test', ['A', 'B'], []);
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/no records/i);
    });

    it('creates formatted CSV text with report header on top row', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const res = exportService.downloadCSV('analysis', ['Metric', 'Value'], [['Sales', '1000']]);
      expect(res.success).toBe(true);
      expect(clickSpy).toHaveBeenCalled();

      clickSpy.mockRestore();
    });
  });

  describe('importService', () => {
    it('validates authentic InventoryIQ backup structure', () => {
      const validBackup = JSON.stringify({
        _meta: { schemaVersion: 4, exportedAt: '2026-11-18' },
        products: [{ id: 1, name: 'Item' }],
        sales: []
      });

      const res = importService.validateFile(validBackup);
      expect(res.isValid).toBe(true);
      expect(res.isCompatible).toBe(true);
    });

    it('rejects invalid or non-InventoryIQ JSON', () => {
      expect(importService.validateFile('{bad json}').isValid).toBe(false);
      expect(importService.validateFile(JSON.stringify({ randomKey: 'val' })).isValid).toBe(false);
    });

    it('generates accurate preview summary of backup records', () => {
      const data = {
        products: [1, 2, 3],
        categories: [1],
        sales: [1, 2],
        purchases: [],
        customers: [1],
        suppliers: [],
        payments: []
      };
      const preview = importService.generatePreview(data);
      expect(preview.productsCount).toBe(3);
      expect(preview.categoriesCount).toBe(1);
      expect(preview.salesCount).toBe(2);
      expect(preview.purchasesCount).toBe(0);
    });
  });

  describe('permissionService (RBAC)', () => {
    it('normalizes role variations cleanly', () => {
      expect(permissionService.normalizeRole('OWNER')).toBe('owner');
      expect(permissionService.normalizeRole('Administrator')).toBe('admin');
      expect(permissionService.normalizeRole('Manager')).toBe('manager');
      expect(permissionService.normalizeRole('unknown')).toBe('staff');
      expect(permissionService.normalizeRole(null)).toBe('staff');
    });

    it('enforces RBAC permissions strictly', () => {
      expect(permissionService.hasPermission('owner', 'organization.delete')).toBe(true);
      expect(permissionService.hasPermission('admin', 'organization.delete')).toBe(false);
      expect(permissionService.hasPermission('admin', 'members.invite')).toBe(true);
      expect(permissionService.hasPermission('manager', 'members.invite')).toBe(false);
      expect(permissionService.hasPermission('staff', 'inventory.update')).toBe(false);
      expect(permissionService.hasPermission('staff', 'sales.create')).toBe(true);
    });

    it('checks administrative capabilities accurately', () => {
      expect(permissionService.canManageMembers('owner')).toBe(true);
      expect(permissionService.canManageMembers('admin')).toBe(true);
      expect(permissionService.canManageMembers('manager')).toBe(false);
      expect(permissionService.canDeleteOrganization('owner')).toBe(true);
      expect(permissionService.canDeleteOrganization('admin')).toBe(false);
    });

    it('returns appropriate badge classes for roles', () => {
      expect(permissionService.getRoleBadgeColor('owner')).toBe('badge-gold');
      expect(permissionService.getRoleBadgeColor('admin')).toBe('badge-info');
      expect(permissionService.getRoleBadgeColor('manager')).toBe('badge-warning');
      expect(permissionService.getRoleBadgeColor('staff')).toBe('badge-secondary');
    });
  });

  describe('backupService (Local-First Verified Archive)', () => {
    const testShopId = 'test_shop_101';

    it('generates a full backup archive with SHA-256 checksum and schema v2.0', async () => {
      const backup = await backupService.generateBackup(testShopId);
      expect(backup.application).toBe('InventoryIQ');
      expect(backup.version).toBe('2.0');
      expect(backup.shopId).toBe(testShopId);
      expect(backup.checksum).toBeDefined();
      expect(typeof backup.checksum).toBe('string');
      expect(backup.checksum.length).toBe(64); // SHA-256 hex string
      expect(backup.metadata).toBeDefined();
      expect(backup.stores).toBeDefined();
    });

    it('validates authentic backup archive matching shop tenant', async () => {
      const backup = await backupService.generateBackup(testShopId);
      const jsonStr = JSON.stringify(backup);
      const res = await backupService.validateBackupFile(jsonStr, testShopId);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.payload.shopId).toBe(testShopId);
    });

    it('rejects backup with tenant shopId mismatch (cross-tenant protection)', async () => {
      const backup = await backupService.generateBackup('shop_A');
      const jsonStr = JSON.stringify(backup);
      const res = await backupService.validateBackupFile(jsonStr, 'shop_B');
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('different shop'))).toBe(true);
    });

    it('rejects backup if SHA-256 checksum is tampered or corrupted', async () => {
      const backup = await backupService.generateBackup(testShopId);
      // Tamper with data without updating checksum
      backup.stores.products = [{ id: 999, name: 'Hacked Item' }];
      const jsonStr = JSON.stringify(backup);
      const res = await backupService.validateBackupFile(jsonStr, testShopId);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('Checksum verification failed'))).toBe(true);
    });

    it('enforces explicit "DELETE" confirmation string when clearing local data', async () => {
      await expect(backupService.clearLocalData(testShopId, 'yes')).rejects.toThrow(/DELETE/i);
      await expect(backupService.clearLocalData(testShopId, 'delete')).rejects.toThrow(/DELETE/i);
      const clearRes = await backupService.clearLocalData(testShopId, 'DELETE');
      expect(clearRes.cleared).toBe(true);
    });
  });
});
