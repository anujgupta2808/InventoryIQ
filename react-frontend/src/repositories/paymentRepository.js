/**
 * Payment Repository
 * Manages central payment cashbook and financial transaction ledger in local IndexedDB.
 */

import { getRecord, getAllRecords, putRecord, addRecord, deleteRecord, countRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class PaymentRepository {
  async getAll(shopId) {
    const list = await getAllRecords(shopId, STORES.PAYMENTS);
    return list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }

  async getById(shopId, id) {
    return getRecord(shopId, STORES.PAYMENTS, String(id));
  }

  async save(shopId, payment) {
    return putRecord(shopId, STORES.PAYMENTS, { ...payment, id: String(payment.id) });
  }

  async create(shopId, payment) {
    return addRecord(shopId, STORES.PAYMENTS, { ...payment, id: String(payment.id) });
  }

  async delete(shopId, id) {
    return deleteRecord(shopId, STORES.PAYMENTS, String(id));
  }

  async count(shopId) {
    return countRecords(shopId, STORES.PAYMENTS);
  }
}

export const paymentRepository = new PaymentRepository();
