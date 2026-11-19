/**
 * Supplier Repository
 * Manages supplier directory and accounts payable ledgers in local IndexedDB.
 */

import { getRecord, getAllRecords, putRecord, addRecord, deleteRecord, countRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class SupplierRepository {
  async getAll(shopId) {
    return getAllRecords(shopId, STORES.SUPPLIERS);
  }

  async getById(shopId, id) {
    return getRecord(shopId, STORES.SUPPLIERS, String(id));
  }

  async save(shopId, supplier) {
    return putRecord(shopId, STORES.SUPPLIERS, { ...supplier, id: String(supplier.id) });
  }

  async create(shopId, supplier) {
    return addRecord(shopId, STORES.SUPPLIERS, { ...supplier, id: String(supplier.id) });
  }

  async delete(shopId, id) {
    return deleteRecord(shopId, STORES.SUPPLIERS, String(id));
  }

  async count(shopId) {
    return countRecords(shopId, STORES.SUPPLIERS);
  }
}

export const supplierRepository = new SupplierRepository();
