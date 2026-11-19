/**
 * Sale Repository
 * Handles sales invoices and item lines in local IndexedDB.
 */

import { getRecord, getAllRecords, putRecord, deleteRecord, countRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class SaleRepository {
  async getAll(shopId) {
    const sales = await getAllRecords(shopId, STORES.SALES);
    return sales.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }

  async getById(shopId, id) {
    return getRecord(shopId, STORES.SALES, String(id));
  }

  async save(shopId, sale) {
    return putRecord(shopId, STORES.SALES, { ...sale, id: String(sale.id) });
  }

  async delete(shopId, id) {
    return deleteRecord(shopId, STORES.SALES, String(id));
  }

  async count(shopId) {
    return countRecords(shopId, STORES.SALES);
  }
}

export const saleRepository = new SaleRepository();
