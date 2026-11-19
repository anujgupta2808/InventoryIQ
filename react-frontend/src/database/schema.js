/**
 * IndexedDB Schema Definition for InventoryIQ Local-First Architecture
 * Each shop maintains an isolated local database: InventoryIQ_shop_{shopId}
 */

export const DB_NAME_PREFIX = 'InventoryIQ_shop_';
export const CURRENT_DB_VERSION = 1;

export const STORES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  SALES: 'sales',
  SALE_ITEMS: 'saleItems',
  PURCHASES: 'purchases',
  PURCHASE_ITEMS: 'purchaseItems',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  PAYMENTS: 'payments',
  STOCK_MOVEMENTS: 'stockMovements',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings'
};

export const ALL_STORES = Object.values(STORES);

/**
 * Configure object stores and indexes for a database instance during onupgradeneeded.
 */
export function setupDatabaseSchema(db) {
  // 1. Products Store
  if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
    const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
    productStore.createIndex('by_sku', 'sku', { unique: true });
    productStore.createIndex('by_category', 'category', { unique: false });
    productStore.createIndex('by_status', 'status', { unique: false });
    productStore.createIndex('by_updatedAt', 'updatedAt', { unique: false });
  }

  // 2. Categories Store
  if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
    const catStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
    catStore.createIndex('by_name', 'name', { unique: true });
  }

  // 3. Sales Store
  if (!db.objectStoreNames.contains(STORES.SALES)) {
    const saleStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' });
    saleStore.createIndex('by_customerId', 'customerId', { unique: false });
    saleStore.createIndex('by_status', 'status', { unique: false });
    saleStore.createIndex('by_date', 'date', { unique: false });
    saleStore.createIndex('by_createdAt', 'createdAt', { unique: false });
  }

  // 4. Sale Items Store
  if (!db.objectStoreNames.contains(STORES.SALE_ITEMS)) {
    const saleItemStore = db.createObjectStore(STORES.SALE_ITEMS, { keyPath: 'id' });
    saleItemStore.createIndex('by_saleId', 'saleId', { unique: false });
    saleItemStore.createIndex('by_productId', 'productId', { unique: false });
  }

  // 5. Purchases Store
  if (!db.objectStoreNames.contains(STORES.PURCHASES)) {
    const purchaseStore = db.createObjectStore(STORES.PURCHASES, { keyPath: 'id' });
    purchaseStore.createIndex('by_supplierId', 'supplierId', { unique: false });
    purchaseStore.createIndex('by_status', 'status', { unique: false });
    purchaseStore.createIndex('by_date', 'date', { unique: false });
    purchaseStore.createIndex('by_createdAt', 'createdAt', { unique: false });
  }

  // 6. Purchase Items Store
  if (!db.objectStoreNames.contains(STORES.PURCHASE_ITEMS)) {
    const purchaseItemStore = db.createObjectStore(STORES.PURCHASE_ITEMS, { keyPath: 'id' });
    purchaseItemStore.createIndex('by_purchaseId', 'purchaseId', { unique: false });
    purchaseItemStore.createIndex('by_productId', 'productId', { unique: false });
  }

  // 7. Customers Store
  if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
    const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
    customerStore.createIndex('by_name', 'name', { unique: false });
    customerStore.createIndex('by_phone', 'phone', { unique: false });
  }

  // 8. Suppliers Store
  if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
    const supplierStore = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' });
    supplierStore.createIndex('by_name', 'name', { unique: false });
    supplierStore.createIndex('by_phone', 'phone', { unique: false });
  }

  // 9. Payments Store
  if (!db.objectStoreNames.contains(STORES.PAYMENTS)) {
    const paymentStore = db.createObjectStore(STORES.PAYMENTS, { keyPath: 'id' });
    paymentStore.createIndex('by_partyId', 'partyId', { unique: false });
    paymentStore.createIndex('by_partyType', 'partyType', { unique: false });
    paymentStore.createIndex('by_referenceId', 'referenceId', { unique: false });
    paymentStore.createIndex('by_date', 'date', { unique: false });
  }

  // 10. Stock Movements Store
  if (!db.objectStoreNames.contains(STORES.STOCK_MOVEMENTS)) {
    const movementStore = db.createObjectStore(STORES.STOCK_MOVEMENTS, { keyPath: 'id' });
    movementStore.createIndex('by_productId', 'productId', { unique: false });
    movementStore.createIndex('by_type', 'type', { unique: false });
    movementStore.createIndex('by_referenceId', 'referenceId', { unique: false });
    movementStore.createIndex('by_createdAt', 'createdAt', { unique: false });
  }

  // 11. Audit Logs Store
  if (!db.objectStoreNames.contains(STORES.AUDIT_LOGS)) {
    const auditStore = db.createObjectStore(STORES.AUDIT_LOGS, { keyPath: 'id' });
    auditStore.createIndex('by_action', 'action', { unique: false });
    auditStore.createIndex('by_userId', 'userId', { unique: false });
    auditStore.createIndex('by_timestamp', 'timestamp', { unique: false });
  }

  // 12. Settings Store
  if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
  }
}
