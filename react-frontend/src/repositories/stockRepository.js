/**
 * Stock Movement Repository
 * Manages immutable inventory movements in local IndexedDB.
 */

import { getAllRecords, addRecord, countRecords } from '../database/db.js';
import { STORES } from '../database/schema.js';

export class StockRepository {
  async getAll(shopId) {
    const list = await getAllRecords(shopId, STORES.STOCK_MOVEMENTS);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async recordMovement(shopId, movement) {
    const id = movement.id || crypto.randomUUID();
    const entry = {
      ...movement,
      id,
      createdAt: movement.createdAt || new Date().toISOString()
    };
    return addRecord(shopId, STORES.STOCK_MOVEMENTS, entry);
  }

  async count(shopId) {
    return countRecords(shopId, STORES.STOCK_MOVEMENTS);
  }
}

export const stockRepository = new StockRepository();
