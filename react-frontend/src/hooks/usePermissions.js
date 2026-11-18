import { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { permissionService } from '../services/permissionService';

/**
 * Custom hook to verify role-based permissions throughout the application.
 */
export function usePermissions() {
  const { user } = useInventory();
  
  const userRole = useMemo(() => {
    return permissionService.normalizeRole(user?.role || user?.organization_role || 'owner');
  }, [user]);

  const hasPermission = useMemo(() => {
    return (perm) => permissionService.hasPermission(userRole, perm);
  }, [userRole]);

  return {
    role: userRole,
    hasPermission,
    can: hasPermission,
    isOwner: userRole === 'owner',
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isStaff: userRole === 'staff',
    canManageMembers: permissionService.canManageMembers(userRole),
    canManageSecurity: permissionService.canManageSecurity(userRole),
    canDeleteCatalogItems: permissionService.canDeleteCatalogItems(userRole),
    roleBadgeColor: permissionService.getRoleBadgeColor(userRole)
  };
}
