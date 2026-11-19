/**
 * Audit Log Repository
 * Records system security, inventory, and transaction events in local IndexedDB.
 */

import { getAllRecords, addRecord, countRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class AuditRepository {
  async getAll(shopId) {
    const list = await getAllRecords(shopId, STORES.AUDIT_LOGS);
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async recordLog(shopId, logEntry) {
    const id = logEntry.id || crypto.randomUUID();
    const entry = {
      ...logEntry,
      id,
      timestamp: logEntry.timestamp || new Date().toISOString()
    };
    return addRecord(shopId, STORES.AUDIT_LOGS, entry);
  }

  async count(shopId) {
    return countRecords(shopId, STORES.AUDIT_LOGS);
  }
}

export const auditRepository = new AuditRepository();
