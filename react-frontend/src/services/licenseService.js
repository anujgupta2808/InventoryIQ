/**
 * Commercial Licensing Service
 * Validates license status without holding customer business data hostage.
 */

export const LICENSE_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED'
};

export class LicenseService {
  constructor() {
    this.cachedStatus = LICENSE_STATUS.ACTIVE;
  }

  getLicenseStatus(user) {
    if (!user) return LICENSE_STATUS.ACTIVE;

    // Check cloud metadata if provided
    const status = user.licenseStatus || user.user_metadata?.license_status || LICENSE_STATUS.ACTIVE;
    this.cachedStatus = status;
    return status;
  }

  isOperationPermitted(operationType, user) {
    const status = this.getLicenseStatus(user);

    // Critical data recovery and export operations are ALWAYS allowed regardless of license state
    if (['database.export', 'export', 'view', 'read'].includes(operationType)) {
      return { permitted: true };
    }

    if (status === LICENSE_STATUS.EXPIRED) {
      return {
        permitted: false,
        message: 'Your commercial license has expired. Please renew your subscription to create new sales and purchases. Your existing business data is safe and remains available for export.',
        canExport: true
      };
    }

    if (status === LICENSE_STATUS.SUSPENDED || status === LICENSE_STATUS.REVOKED) {
      return {
        permitted: false,
        message: 'Your shop license has been suspended. Please contact InventoryIQ support. Your data can be exported at any time.',
        canExport: true
      };
    }

    return { permitted: true };
  }
}

export const licenseService = new LicenseService();
