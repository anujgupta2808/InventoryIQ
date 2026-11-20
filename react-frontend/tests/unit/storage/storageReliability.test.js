/**
 * Phase 4 — Data Protection, Storage & Reliability Test Suite
 * Covers 12 Mission-Critical Reliability Scenarios:
 * 1. Failed database transaction rollback
 * 2. Interrupted write / atomic replacement guarantee
 * 3. Corrupted backup detection & checksum verification
 * 4. Invalid import rejection & security validation
 * 5. Duplicate ID & SKU constraint enforcement
 * 6. Large import scaling (1000+ records)
 * 7. Concurrent write serialization & lock safety
 * 8. Offline queueing and online synchronization replay
 * 9. Legacy schema migration (localStorage & v1 backups)
 * 10. Restore failure rollback guarantee
 * 11. Multi-store transaction rollback on constraint violation
 * 12. Multi-tab synchronization deduplication & echo suppression
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  openShopDatabase,
  replaceStoreData,
  runTransaction,
  atomicMultiStoreWrite,
  getAllRecords,
  putRecord,
  clearStore
} from '../../../src/database/db.js';
import { STORES, ALL_STORES } from '../../../src/database/schema.js';
import { storageService, SCHEMA_VERSION } from '../../../src/services/storageService.js';
import { backupService } from '../../../src/services/backupService.js';
import { importService } from '../../../src/services/importService.js';
import { syncChannel } from '../../../src/services/syncChannel.js';
import { MigrationEngine } from '../../../src/database/migrations.js';

describe('Phase 4 — Data Protection, Storage & Reliability Suite', () => {
  const shopId = 'reliability_test_shop';

  beforeEach(async () => {
    await storageService.initShop(shopId);
  });

  afterEach(() => {
    storageService.clearMemoryCache();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Failed Database Transaction Rollback
  // --------------------------------------------------------------------------
  it('Scenario 1: rolls back transaction cleanly if operationFn fails or aborts', async () => {
    // Seed initial product
    await putRecord(shopId, STORES.PRODUCTS, { id: 'p_init_1', name: 'Initial Item', sku: 'SKU-INIT-1', stock: 10 });

    const initial = await getAllRecords(shopId, STORES.PRODUCTS);
    expect(initial).toHaveLength(1);

    // Attempt a transaction that writes and then throws an error
    await expect(
      runTransaction(shopId, [STORES.PRODUCTS], 'readwrite', (tx) => {
        const store = tx.objectStore(STORES.PRODUCTS);
        store.put({ id: 'p_bad_1', name: 'Should Not Persist', sku: 'SKU-FAIL-1', stock: 5 });
        throw new Error('Simulated transaction failure');
      })
    ).rejects.toThrow('Simulated transaction failure');

    // Confirm initial state was preserved and uncommitted write was rolled back
    const after = await getAllRecords(shopId, STORES.PRODUCTS);
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe('p_init_1');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Atomic Store Replacement (No Clear-and-Repopulate Race)
  // --------------------------------------------------------------------------
  it('Scenario 2: replaceStoreData guarantees atomic replacement without partial loss', async () => {
    await replaceStoreData(shopId, STORES.PRODUCTS, [
      { id: 'p1', name: 'Product 1', sku: 'SKU-A', stock: 10 },
      { id: 'p2', name: 'Product 2', sku: 'SKU-B', stock: 20 }
    ]);

    const records = await getAllRecords(shopId, STORES.PRODUCTS);
    expect(records).toHaveLength(2);

    // Now atomically replace with 3 new items
    await replaceStoreData(shopId, STORES.PRODUCTS, [
      { id: 'p3', name: 'Product 3', sku: 'SKU-C', stock: 30 },
      { id: 'p4', name: 'Product 4', sku: 'SKU-D', stock: 40 },
      { id: 'p5', name: 'Product 5', sku: 'SKU-E', stock: 50 }
    ]);

    const updated = await getAllRecords(shopId, STORES.PRODUCTS);
    expect(updated).toHaveLength(3);
    expect(updated.map(u => u.id).sort()).toEqual(['p3', 'p4', 'p5']);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Corrupted Backup Detection & SHA-256 Checksum Verification
  // --------------------------------------------------------------------------
  it('Scenario 3: detects and rejects corrupted or tampered backup files', async () => {
    const backup = await backupService.generateBackup(shopId);
    expect(backup.checksum).toBeDefined();

    // 1. Valid backup passes
    const validRes = await backupService.validateBackupFile(JSON.stringify(backup), shopId);
    expect(validRes.valid).toBe(true);

    // 2. Tampered data fails checksum
    const tampered = JSON.parse(JSON.stringify(backup));
    const target = tampered.stores || tampered.data;
    target.products.push({ id: 'hacked_1', name: 'Injected Record', sku: 'SKU-HACK' });
    if (tampered.data) tampered.data = target;
    if (tampered.stores) tampered.stores = target;
    const tamperedRes = await backupService.validateBackupFile(JSON.stringify(tampered), shopId);
    expect(tamperedRes.valid).toBe(false);
    expect(tamperedRes.isCorrupted).toBe(true);
    expect(tamperedRes.message).toMatch(/checksum/i);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Invalid Import Rejection & Malicious Payload Defense
  // --------------------------------------------------------------------------
  it('Scenario 4: rejects malformed JSON, malicious prototypes, and non-backup structures', () => {
    // Malformed JSON
    expect(importService.validateFile('{ invalid json ').isValid).toBe(false);

    // Prototype pollution
    const malicious = '{"__proto__": {"admin": true}, "products": []}';
    const protoRes = importService.validateFile(malicious);
    expect(protoRes.isValid).toBe(false);
    expect(protoRes.message).toMatch(/forbidden prototype/i);

    // Completely unrelated JSON
    const unrelated = JSON.stringify({ weather: 'sunny', temp: 25 });
    const unrelatedRes = importService.validateFile(unrelated);
    expect(unrelatedRes.isValid).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Duplicate ID & Duplicate SKU Constraint Enforcement
  // --------------------------------------------------------------------------
  it('Scenario 5: detects and flags duplicate IDs and duplicate SKUs in import payload', () => {
    const duplicateSkuPayload = {
      _meta: { schemaVersion: 4 },
      products: [
        { id: '1', name: 'Item A', sku: 'SKU-DUP', stock: 5, price: 100 },
        { id: '2', name: 'Item B', sku: 'SKU-DUP', stock: 10, price: 200 }
      ]
    };
    const skuRes = importService.validateFile(duplicateSkuPayload);
    expect(skuRes.isValid).toBe(false);
    expect(skuRes.message).toMatch(/duplicate sku/i);

    const duplicateIdPayload = {
      _meta: { schemaVersion: 4 },
      products: [
        { id: '100', name: 'Item A', sku: 'SKU-1', stock: 5, price: 100 },
        { id: '100', name: 'Item B', sku: 'SKU-2', stock: 10, price: 200 }
      ]
    };
    const idRes = importService.validateFile(duplicateIdPayload);
    expect(idRes.isValid).toBe(false);
    expect(idRes.message).toMatch(/duplicate product id/i);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Large Import Handling (1000+ Records)
  // --------------------------------------------------------------------------
  it('Scenario 6: safely parses and previews large dataset imports without truncation', () => {
    const largeProducts = Array.from({ length: 1200 }, (_, i) => ({
      id: `p_large_${i}`,
      name: `Bulk Product ${i}`,
      sku: `SKU-BULK-${i}`,
      stock: 50,
      price: 199.99
    }));

    const preview = importService.generatePreview({ products: largeProducts });
    expect(preview.productsCount).toBe(1200);

    const validation = importService.validateFile({
      _meta: { schemaVersion: 4 },
      products: largeProducts
    });
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Concurrent Write Serialization & Lock Safety
  // --------------------------------------------------------------------------
  it('Scenario 7: queueWrite serializes concurrent operations in predictable order', async () => {
    const sequence = [];

    const op1 = storageService.queueWrite(async () => {
      await new Promise(r => setTimeout(r, 20));
      sequence.push('op1');
      return 'res1';
    });

    const op2 = storageService.queueWrite(async () => {
      await new Promise(r => setTimeout(r, 5));
      sequence.push('op2');
      return 'res2';
    });

    const op3 = storageService.queueWrite(async () => {
      sequence.push('op3');
      return 'res3';
    });

    const results = await Promise.all([op1, op2, op3]);
    expect(results).toEqual(['res1', 'res2', 'res3']);
    expect(sequence).toEqual(['op1', 'op2', 'op3']);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Offline Queueing & Online Synchronization Replay
  // --------------------------------------------------------------------------
  it('Scenario 8: queues broadcast events when offline and replays them when back online', () => {
    const originalNavigator = global.navigator;
    
    // Simulate offline state
    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true
    });

    const msg = syncChannel.broadcast('INVENTORY_ADJUSTED', { productId: 'p123', newStock: 15 });
    expect(msg).toBeDefined();
    expect(syncChannel.offlineQueue).toHaveLength(1);
    expect(syncChannel.offlineQueue[0].type).toBe('INVENTORY_ADJUSTED');

    // Simulate coming back online
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true
    });

    const postSpy = vi.fn();
    syncChannel.channel = { postMessage: postSpy };

    syncChannel.flushOfflineQueue();
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(syncChannel.offlineQueue).toHaveLength(0);

    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Legacy Schema Migration (localStorage & v1 Backups)
  // --------------------------------------------------------------------------
  it('Scenario 9: migrates legacy v1 backup payload to v2 standard structure', () => {
    const legacyV1Payload = {
      _meta: { schemaVersion: 1, exportedAt: '2025-01-01T00:00:00Z', organizationId: 'shop_legacy' },
      products: [{ id: 10, name: 'Old Product', price: 99 }],
      sales: [{ id: 1, amount: 99 }]
    };

    const migrated = MigrationEngine.migrateBackupPayload(legacyV1Payload);
    expect(migrated.format).toBe('InventoryIQ Backup');
    expect(migrated.version).toBe('2.0');
    expect(migrated.shopId).toBe('shop_legacy');
    expect(migrated.data.products).toHaveLength(1);
    expect(migrated.data.products[0].name).toBe('Old Product');
    expect(Array.isArray(migrated.data.categories)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Restore Failure Rollback Guarantee
  // --------------------------------------------------------------------------
  it('Scenario 10: rolls back memory cache to pre-restore snapshot if import throws', async () => {
    // Setup known pre-restore state in memory
    storageService.memoryCache.set('PRODUCTS', [{ id: 'pre_1', name: 'Safe Pre-Restore Item' }]);

    // Attempt an import that triggers an error
    const faultyBundle = {
      data: {
        products: 'NOT_AN_ARRAY' // will cause failure during DB write or processing
      }
    };

    // Even if bad structure is passed, memory cache should revert to pre-restore snapshot
    try {
      await storageService.importAllData(faultyBundle);
    } catch (_) {}

    const safeProducts = storageService.getCollection('PRODUCTS');
    expect(safeProducts).toHaveLength(1);
    expect(safeProducts[0].name).toBe('Safe Pre-Restore Item');
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Multi-Store Transaction Rollback on Constraint Violation
  // --------------------------------------------------------------------------
  it('Scenario 11: atomicMultiStoreWrite rolls back all stores if any store fails', async () => {
    // Put valid customer in CUSTOMERS store
    await replaceStoreData(shopId, STORES.CUSTOMERS, [
      { id: 'c_orig_1', name: 'Original Customer', phone: '9999999999' }
    ]);

    // Attempt atomic multi-store write where products fails unique SKU index
    const writeAttempt = atomicMultiStoreWrite(shopId, {
      [STORES.CUSTOMERS]: [{ id: 'c_new_1', name: 'New Customer' }],
      [STORES.PRODUCTS]: [
        { id: 'p_dup_1', name: 'Item 1', sku: 'SAME_SKU' },
        { id: 'p_dup_2', name: 'Item 2', sku: 'SAME_SKU' } // ConstraintError: by_sku is unique!
      ]
    }, { clearFirst: true });

    await expect(writeAttempt).rejects.toThrow();

    // Verify CUSTOMERS was NOT cleared and left intact
    const customersAfter = await getAllRecords(shopId, STORES.CUSTOMERS);
    expect(customersAfter).toHaveLength(1);
    expect(customersAfter[0].id).toBe('c_orig_1');
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Multi-Tab Synchronization Deduplication & Echo Suppression
  // --------------------------------------------------------------------------
  it('Scenario 12: suppresses echo from own tab and deduplicates repeat event IDs', () => {
    const listener = vi.fn();
    const unsubscribe = syncChannel.subscribe(listener);

    // 1. Echo suppression: Event with sourceTabId === syncChannel.tabId is dropped
    syncChannel._handleIncomingMessage({
      eventId: 'evt_echo_test',
      sourceTabId: syncChannel.tabId,
      type: 'TEST_ECHO',
      payload: {}
    });
    expect(listener).not.toHaveBeenCalled();

    // 2. Foreign tab message is accepted
    syncChannel._handleIncomingMessage({
      eventId: 'evt_foreign_1',
      sourceTabId: 'foreign_tab_999',
      type: 'EXTERNAL_UPDATE',
      payload: { changed: true }
    });
    expect(listener).toHaveBeenCalledTimes(1);

    // 3. Duplicate event with same eventId is dropped
    syncChannel._handleIncomingMessage({
      eventId: 'evt_foreign_1',
      sourceTabId: 'foreign_tab_999',
      type: 'EXTERNAL_UPDATE',
      payload: { changed: true }
    });
    expect(listener).toHaveBeenCalledTimes(1); // Still 1! Not duplicated!

    unsubscribe();
  });
});
