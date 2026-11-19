/**
 * Settings Repository
 * Manages shop settings and metadata in local IndexedDB.
 */

import { getRecord, putRecord, getAllRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class SettingsRepository {
  async get(shopId, key) {
    const entry = await getRecord(shopId, STORES.SETTINGS, key);
    return entry ? entry.value : null;
  }

  async set(shopId, key, value) {
    return putRecord(shopId, STORES.SETTINGS, { key, value, updatedAt: new Date().toISOString() });
  }

  async getAll(shopId) {
    return getAllRecords(shopId, STORES.SETTINGS);
  }
}

export const settingsRepository = new SettingsRepository();
