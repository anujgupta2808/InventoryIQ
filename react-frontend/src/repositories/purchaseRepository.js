/**
 * Purchase Repository
 * Handles purchase orders and PO item lines in local IndexedDB.
 */

import { getRecord, getAllRecords, putRecord, deleteRecord, countRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class PurchaseRepository {
  async getAll(shopId) {
    const pos = await getAllRecords(shopId, STORES.PURCHASES);
    return pos.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }

  async getById(shopId, id) {
    return getRecord(shopId, STORES.PURCHASES, String(id));
  }

  async save(shopId, purchase) {
    return putRecord(shopId, STORES.PURCHASES, { ...purchase, id: String(purchase.id) });
  }

  async delete(shopId, id) {
    return deleteRecord(shopId, STORES.PURCHASES, String(id));
  }

  async count(shopId) {
    return countRecords(shopId, STORES.PURCHASES);
  }
}

export const purchaseRepository = new PurchaseRepository();
