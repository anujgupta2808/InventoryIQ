// Zero demo categories, catalog, transaction, contact, or session data
export const INITIAL_CATEGORIES = [];
export const INITIAL_PRODUCTS = [];
export const INITIAL_SALES = [];
export const INITIAL_PURCHASES = [];
export const INITIAL_SUPPLIERS = [];
export const INITIAL_CUSTOMERS = [];
export const INITIAL_SESSIONS = [
  { id: "SES-9821", device: "Chrome / Windows 11", ip: "103.21.244.18", location: "New Delhi, India", lastActive: "Just now", current: true },
  { id: "SES-7412", device: "Safari / iPhone 15 Pro", ip: "157.34.120.45", location: "Mumbai, India", lastActive: "2 hours ago", current: false },
  { id: "SES-5120", device: "Firefox / MacBook Pro", ip: "103.25.18.90", location: "Bengaluru, India", lastActive: "Yesterday", current: false }
];
export const INITIAL_AUDIT_LOGS = [];

export const DEFAULT_USERS = [
  {
    id: 1,
    name: "Anuj Gupta",
    email: "admin@inventoryiq.com",
    password: "admin",
    role: "Admin",
    organizationName: "InventoryIQ Retail & Wholesale",
    businessName: "InventoryIQ Retail & Wholesale",
    organizationType: "Retail Store / Shop",
    gstin: "07AAAAA0000A1Z5",
    phone: "+91 98765 43210"
  }
];

export const INITIAL_USER = DEFAULT_USERS[0];
