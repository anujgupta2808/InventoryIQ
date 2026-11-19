/**
 * Product Repository
 * Manages product catalog persistence in the shop's local IndexedDB.
 */

import { getRecord, getAllRecords, putRecord, addRecord, deleteRecord, countRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class ProductRepository {
  async getAll(shopId) {
    return getAllRecords(shopId, STORES.PRODUCTS);
  }

  async getById(shopId, id) {
    return getRecord(shopId, STORES.PRODUCTS, String(id));
  }

  async save(shopId, product) {
    if (!product || !product.id) {
      throw new Error('Product must have a unique ID');
    }
    return putRecord(shopId, STORES.PRODUCTS, { ...product, id: String(product.id) });
  }

  async create(shopId, product) {
    if (!product || !product.id) {
      throw new Error('Product must have a unique ID');
    }
    return addRecord(shopId, STORES.PRODUCTS, { ...product, id: String(product.id) });
  }

  async delete(shopId, id) {
    return deleteRecord(shopId, STORES.PRODUCTS, String(id));
  }

  async count(shopId) {
    return countRecords(shopId, STORES.PRODUCTS);
  }
}

export const productRepository = new ProductRepository();
