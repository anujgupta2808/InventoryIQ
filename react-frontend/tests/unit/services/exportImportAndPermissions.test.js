import { describe, it, expect, vi } from 'vitest';
import { exportService } from '../../../src/services/exportService';
import { importService } from '../../../src/services/importService';
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
});
