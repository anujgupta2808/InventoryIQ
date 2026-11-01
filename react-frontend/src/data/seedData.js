export const INITIAL_CATEGORIES = [
  "Hardware / General Items",
  "Fasteners / Accessories",
  "Electrical Items",
  "Stationery / Paper",
  "Puja",
  "General / Herbal"
];

export const INITIAL_PRODUCTS = [
  { id: 1, name: "Screw Pack (100 Pcs)", sku: "FST-101", category: "Fasteners / Accessories", stock: 120, minStock: 30, price: 50, costPrice: 32, status: "In Stock", unit: "Pack", supplierId: 1, supplierName: "ABC Traders" },
  { id: 2, name: "Electric Wire 1.5mm (90m)", sku: "ELE-202", category: "Electrical Items", stock: 45, minStock: 20, price: 120, costPrice: 85, status: "In Stock", unit: "Roll", supplierId: 2, supplierName: "Tech Suppliers" },
  { id: 3, name: "A4 Paper Rim (500 Sheets)", sku: "STA-303", category: "Stationery / Paper", stock: 200, minStock: 50, price: 30, costPrice: 18, status: "In Stock", unit: "Rim", supplierId: 3, supplierName: "Global Supplies" },
  { id: 4, name: "Pooja Kit Complete Set", sku: "PUJ-404", category: "Puja", stock: 60, minStock: 25, price: 250, costPrice: 160, status: "In Stock", unit: "Kit", supplierId: 4, supplierName: "Quality Traders" },
  { id: 5, name: "Herbal Green Tea Pack", sku: "HRB-505", category: "General / Herbal", stock: 35, minStock: 40, price: 180, costPrice: 110, status: "Low Stock", unit: "Box", supplierId: 5, supplierName: "Metro Suppliers" },
  { id: 6, name: "Brass Diya Premium", sku: "PUJ-405", category: "Puja", stock: 18, minStock: 20, price: 340, costPrice: 220, status: "Low Stock", unit: "Piece", supplierId: 4, supplierName: "Quality Traders" },
  { id: 7, name: "Copper Wire 2.5mm Heavy", sku: "ELE-205", category: "Electrical Items", stock: 85, minStock: 30, price: 450, costPrice: 310, status: "In Stock", unit: "Roll", supplierId: 2, supplierName: "Tech Suppliers" },
  { id: 8, name: "Stapler HD-45 Heavy Duty", sku: "STA-308", category: "Stationery / Paper", stock: 55, minStock: 15, price: 220, costPrice: 140, status: "In Stock", unit: "Piece", supplierId: 3, supplierName: "Global Supplies" },
  { id: 9, name: "Neem Herbal Cleanser", sku: "HRB-510", category: "General / Herbal", stock: 0, minStock: 20, price: 150, costPrice: 95, status: "Out of Stock", unit: "Bottle", supplierId: 5, supplierName: "Metro Suppliers" },
  { id: 10, name: "Claw Hammer 500g", sku: "HDW-011", category: "Hardware / General Items", stock: 40, minStock: 15, price: 380, costPrice: 240, status: "In Stock", unit: "Piece", supplierId: 1, supplierName: "ABC Traders" },
  { id: 11, name: "Adjustable Wrench 10-inch", sku: "HDW-012", category: "Hardware / General Items", stock: 25, minStock: 10, price: 420, costPrice: 290, status: "In Stock", unit: "Piece", supplierId: 1, supplierName: "ABC Traders" },
  { id: 12, name: "Insulation PVC Tape (10-pk)", sku: "ELE-208", category: "Electrical Items", stock: 150, minStock: 40, price: 80, costPrice: 48, status: "In Stock", unit: "Pack", supplierId: 2, supplierName: "Tech Suppliers" }
];

export const INITIAL_SALES = [
  { id: "S-1045", date: "Oct 30, 2025", customerId: 1, customerName: "Rahul Sharma", amount: 2450, subtotal: 2200, tax: 250, discount: 0, paymentMethod: "UPI", status: "Completed", items: [{ productId: 1, name: "Screw Pack (100 Pcs)", qty: 5, price: 50 }, { productId: 2, name: "Electric Wire 1.5mm (90m)", qty: 2, price: 120 }, { productId: 4, name: "Pooja Kit Complete Set", qty: 7, price: 250 }] },
  { id: "S-1044", date: "Oct 29, 2025", customerId: 2, customerName: "Priya Patel", amount: 1250, subtotal: 1150, tax: 100, discount: 0, paymentMethod: "Card", status: "Completed", items: [{ productId: 3, name: "A4 Paper Rim (500 Sheets)", qty: 10, price: 30 }, { productId: 6, name: "Brass Diya Premium", qty: 2, price: 340 }] },
  { id: "S-1043", date: "Oct 28, 2025", customerId: 3, customerName: "Amit Singh", amount: 980, subtotal: 900, tax: 80, discount: 0, paymentMethod: "Cash", status: "Completed", items: [{ productId: 5, name: "Herbal Green Tea Pack", qty: 4, price: 180 }, { productId: 8, name: "Stapler HD-45 Heavy Duty", qty: 1, price: 220 }] },
  { id: "S-1042", date: "Oct 27, 2025", customerId: 4, customerName: "Neha Gupta", amount: 2100, subtotal: 1950, tax: 150, discount: 0, paymentMethod: "UPI", status: "Completed", items: [{ productId: 7, name: "Copper Wire 2.5mm Heavy", qty: 4, price: 450 }, { productId: 1, name: "Screw Pack (100 Pcs)", qty: 6, price: 50 }] },
  { id: "S-1041", date: "Oct 26, 2025", customerId: 5, customerName: "Rohan Mehta", amount: 1750, subtotal: 1600, tax: 150, discount: 0, paymentMethod: "Cash", status: "Completed", items: [{ productId: 4, name: "Pooja Kit Complete Set", qty: 5, price: 250 }, { productId: 10, name: "Claw Hammer 500g", qty: 1, price: 380 }] },
  { id: "S-1040", date: "Oct 25, 2025", customerId: 6, customerName: "Vikram Malhotra", amount: 4320, subtotal: 4000, tax: 320, discount: 0, paymentMethod: "Card", status: "Completed", items: [{ productId: 2, name: "Electric Wire 1.5mm (90m)", qty: 8, price: 120 }, { productId: 7, name: "Copper Wire 2.5mm Heavy", qty: 6, price: 450 }] }
];

export const INITIAL_PURCHASES = [
  { id: "P-2045", date: "Oct 30, 2025", supplierId: 1, supplierName: "ABC Traders", amount: 5200, status: "Completed", items: [{ productId: 1, name: "Screw Pack (100 Pcs)", qty: 100, cost: 32 }, { productId: 10, name: "Claw Hammer 500g", qty: 8, cost: 240 }] },
  { id: "P-2044", date: "Oct 29, 2025", supplierId: 2, supplierName: "Tech Suppliers", amount: 3750, status: "Completed", items: [{ productId: 2, name: "Electric Wire 1.5mm", qty: 30, cost: 85 }, { productId: 12, name: "Insulation PVC Tape", qty: 25, cost: 48 }] },
  { id: "P-2043", date: "Oct 28, 2025", supplierId: 3, supplierName: "Global Supplies", amount: 4580, status: "Pending", items: [{ productId: 3, name: "A4 Paper Rim", qty: 150, cost: 18 }, { productId: 8, name: "Stapler HD-45", qty: 13, cost: 140 }] },
  { id: "P-2042", date: "Oct 27, 2025", supplierId: 4, supplierName: "Quality Traders", amount: 2900, status: "Completed", items: [{ productId: 4, name: "Pooja Kit Complete Set", qty: 15, cost: 160 }, { productId: 6, name: "Brass Diya Premium", qty: 5, cost: 220 }] },
  { id: "P-2041", date: "Oct 26, 2025", supplierId: 5, supplierName: "Metro Suppliers", amount: 3300, status: "Completed", items: [{ productId: 5, name: "Herbal Green Tea Pack", qty: 30, cost: 110 }] }
];

export const INITIAL_SUPPLIERS = [
  { id: 1, name: "ABC Traders", contactPerson: "Ramesh Sharma", email: "abc@traders.com", phone: "+91 98765 43210", address: "12, Chandni Chowk, New Delhi", status: "Active", totalPurchases: "₹48,500" },
  { id: 2, name: "Tech Suppliers", contactPerson: "Suresh Patil", email: "tech@suppliers.com", phone: "+91 87654 32109", address: "404, Lamington Road, Mumbai", status: "Active", totalPurchases: "₹38,200" },
  { id: 3, name: "Global Supplies", contactPerson: "Anita Rao", email: "global@supplies.com", phone: "+91 76543 21098", address: "88, Electronic City, Bengaluru", status: "Active", totalPurchases: "₹24,580" },
  { id: 4, name: "Quality Traders", contactPerson: "Pravin Shah", email: "orders@qualitytraders.in", phone: "+91 99887 76655", address: "55, Gandhi Road, Ahmedabad", status: "Active", totalPurchases: "₹18,900" },
  { id: 5, name: "Metro Suppliers", contactPerson: "Arun Sen", email: "support@metrosuppliers.com", phone: "+91 91234 56789", address: "21, Park Street, Kolkata", status: "Active", totalPurchases: "₹14,300" }
];

export const INITIAL_CUSTOMERS = [
  { id: 1, name: "Rahul Sharma", email: "rahul.sharma@example.com", phone: "+91 98111 22334", address: "A-42, Vasant Kunj, New Delhi", totalSpending: 18450, totalOrders: 8, status: "Active" },
  { id: 2, name: "Priya Patel", email: "priya.p@example.com", phone: "+91 98222 33445", address: "B-102, Bandra West, Mumbai", totalSpending: 12900, totalOrders: 5, status: "Active" },
  { id: 3, name: "Amit Singh", email: "amit.singh@example.com", phone: "+91 98333 44556", address: "14, Gomti Nagar, Lucknow", totalSpending: 8750, totalOrders: 4, status: "Active" },
  { id: 4, name: "Neha Gupta", email: "neha.g@example.com", phone: "+91 98444 55667", address: "77, Kothrud, Pune", totalSpending: 24120, totalOrders: 11, status: "Active" },
  { id: 5, name: "Rohan Mehta", email: "rohan.m@example.com", phone: "+91 98555 66778", address: "C-9, C-Scheme, Jaipur", totalSpending: 9650, totalOrders: 6, status: "Active" },
  { id: 6, name: "Vikram Malhotra", email: "vikram.m@example.com", phone: "+91 98666 77889", address: "Sector 17, Chandigarh", totalSpending: 31200, totalOrders: 14, status: "Active" }
];

export const INITIAL_SESSIONS = [
  { id: "SES-9821", device: "Chrome / Windows 11", ip: "103.21.244.18", location: "New Delhi, India", lastActive: "Just now", current: true },
  { id: "SES-7412", device: "Safari / iPhone 15 Pro", ip: "157.34.120.45", location: "Mumbai, India", lastActive: "2 hours ago", current: false },
  { id: "SES-5120", device: "Firefox / MacBook Pro", ip: "103.25.18.90", location: "Bengaluru, India", lastActive: "Yesterday", current: false }
];

export const INITIAL_AUDIT_LOGS = [
  { id: 1, action: "User Login", user: "Anuj Gupta", role: "Admin", timestamp: "Today, 10:14 AM", ip: "103.21.244.18", status: "Success" },
  { id: 2, action: "Stock Adjustment", user: "Anuj Gupta", role: "Admin", timestamp: "Today, 11:30 AM", ip: "103.21.244.18", details: "Added 50 units to A4 Paper", status: "Success" },
  { id: 3, action: "Sale Created", user: "Cashier Terminal 1", role: "Staff", timestamp: "Today, 01:45 PM", ip: "192.168.1.102", details: "Sale #S-1045 ₹2,450", status: "Success" },
  { id: 4, action: "Price Updated", user: "Anuj Gupta", role: "Admin", timestamp: "Yesterday, 04:20 PM", ip: "103.21.244.18", details: "Updated Brass Diya to ₹340", status: "Success" },
  { id: 5, action: "Supplier Created", user: "Anuj Gupta", role: "Admin", timestamp: "Oct 28, 2025", ip: "103.21.244.18", details: "Added Quality Traders", status: "Success" }
];

export const INITIAL_USER = {
  name: "Anuj Gupta",
  role: "Admin",
  email: "admin@inventoryiq.com",
  phone: "+91 98765 43210",
  businessName: "InventoryIQ Retail & Wholesale",
  currency: "INR",
  currencySymbol: "₹",
  twoFactorEnabled: false
};

