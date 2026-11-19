/**
 * Customer Repository
 * Manages customer directory and accounts receivable ledgers in local IndexedDB.
 */

import { getRecord, getAllRecords, putRecord, addRecord, deleteRecord, countRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class CustomerRepository {
  async getAll(shopId) {
    return getAllRecords(shopId, STORES.CUSTOMERS);
  }

  async getById(shopId, id) {
    return getRecord(shopId, STORES.CUSTOMERS, String(id));
  }

  async save(shopId, customer) {
    return putRecord(shopId, STORES.CUSTOMERS, { ...customer, id: String(customer.id) });
  }

  async create(shopId, customer) {
    return addRecord(shopId, STORES.CUSTOMERS, { ...customer, id: String(customer.id) });
  }

  async delete(shopId, id) {
    return deleteRecord(shopId, STORES.CUSTOMERS, String(id));
  }

  async count(shopId) {
    return countRecords(shopId, STORES.CUSTOMERS);
  }
}

export const customerRepository = new CustomerRepository();
