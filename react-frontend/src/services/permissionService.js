/**
 * Role-Based Access Control (RBAC) & Permission Service
 * Enforces permissions across Owner, Admin, Manager, and Staff roles.
 */

export const ROLE_PERMISSIONS = {
  owner: [
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'sales.view', 'sales.create', 'sales.update', 'sales.delete',
    'purchases.view', 'purchases.create', 'purchases.update', 'purchases.delete',
    'customers.view', 'customers.manage', 'customers.delete',
    'suppliers.view', 'suppliers.manage', 'suppliers.delete',
    'analytics.view', 'reports.export',
    'members.view', 'members.invite', 'members.manage',
    'organization.settings', 'organization.delete', 'organization.transfer',
    'security.manage', 'sessions.revoke'
  ],
  admin: [
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'sales.view', 'sales.create', 'sales.update',
    'purchases.view', 'purchases.create', 'purchases.update',
    'customers.view', 'customers.manage',
    'suppliers.view', 'suppliers.manage',
    'analytics.view', 'reports.export',
    'members.view', 'members.invite',
    'organization.settings',
    'security.manage', 'sessions.revoke'
  ],
  manager: [
    'inventory.view', 'inventory.create', 'inventory.update',
    'sales.view', 'sales.create',
    'purchases.view', 'purchases.create',
    'customers.view', 'customers.manage',
    'suppliers.view', 'suppliers.manage',
    'analytics.view', 'reports.export',
    'members.view'
  ],
  staff: [
    'inventory.view',
    'sales.view', 'sales.create',
    'customers.view',
    'analytics.view'
  ]
};

export class PermissionService {
  normalizeRole(role) {
    if (!role) return 'staff';
    const clean = String(role).toLowerCase().trim();
    if (clean === 'owner') return 'owner';
    if (clean === 'admin' || clean === 'administrator') return 'admin';
    if (clean === 'manager') return 'manager';
    return 'staff';
  }

  hasPermission(userRole, permission) {
    const role = this.normalizeRole(userRole);
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes(permission);
  }

  canManageMembers(userRole) {
    const role = this.normalizeRole(userRole);
    return role === 'owner' || role === 'admin';
  }

  canDeleteOrganization(userRole) {
    const role = this.normalizeRole(userRole);
    return role === 'owner';
  }

  canManageSecurity(userRole) {
    const role = this.normalizeRole(userRole);
    return role === 'owner' || role === 'admin';
  }

  canDeleteCatalogItems(userRole) {
    const role = this.normalizeRole(userRole);
    return role === 'owner' || role === 'admin';
  }

  getRoleBadgeColor(role) {
    const r = this.normalizeRole(role);
    switch (r) {
      case 'owner':
        return 'badge-gold';
      case 'admin':
        return 'badge-info';
      case 'manager':
        return 'badge-warning';
      case 'staff':
      default:
        return 'badge-secondary';
    }
  }
}

export const permissionService = new PermissionService();
