// Zero demo categories, catalog, transaction, contact, or session data
export const INITIAL_CATEGORIES = [];
export const INITIAL_PRODUCTS = [];
export const INITIAL_SALES = [];
export const INITIAL_PURCHASES = [];
export const INITIAL_SUPPLIERS = [];
export const INITIAL_CUSTOMERS = [];
export const INITIAL_SESSIONS = [];
export const INITIAL_AUDIT_LOGS = [];

export const DEFAULT_USERS = [
  {
    id: 1,
    name: "Anuj Gupta",
    email: "admin@inventoryiq.com",
    passwordHash: "4736c19222f48ea84855633fa2edd0df59a4aa4c7436111d9dff0fbec473dd03",
    salt: "b23ee94a89f69afd73b44295b5934a7b",
    iterations: 100000,
    role: "owner",
    organizationName: "InventoryIQ Retail & Wholesale",
    businessName: "InventoryIQ Retail & Wholesale",
    organizationType: "Retail Store / Shop",
    gstin: "07AAAAA0000A1Z5",
    phone: "+91 98765 43210"
  }
];

export const INITIAL_USER = DEFAULT_USERS[0];
