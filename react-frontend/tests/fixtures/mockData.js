export const MOCK_USER = {
  id: 'usr-test-1',
  name: 'Test Administrator',
  email: 'admin@inventoryiq.com',
  role: 'owner',
  organizationName: 'InventoryIQ Test Store',
  businessName: 'InventoryIQ Test Store',
  organizationType: 'Retail Store / Shop',
  gstin: '07AAAAA0000A1Z5',
  phone: '+91 98765 43210',
  currency: 'INR',
  currencySymbol: '₹'
};

export const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Wireless Bluetooth Mouse',
    sku: 'ELE-1001',
    category: 'Electronics',
    costPrice: 400,
    price: 850,
    stock: 25,
    minStock: 5,
    status: 'In Stock',
    unit: 'pcs',
    description: 'Ergonomic optical mouse'
  },
  {
    id: 2,
    name: 'Mechanical Gaming Keyboard',
    sku: 'ELE-1002',
    category: 'Electronics',
    costPrice: 1500,
    price: 2999,
    stock: 3, // Low stock (minStock = 5)
    minStock: 5,
    status: 'Low Stock',
    unit: 'pcs',
    description: 'RGB Backlit mechanical keyboard'
  },
  {
    id: 3,
    name: 'USB-C Fast Charging Cable',
    sku: 'ACC-1003',
    category: 'Accessories',
    costPrice: 100,
    price: 299,
    stock: 0, // Out of stock
    minStock: 10,
    status: 'Out of Stock',
    unit: 'pcs',
    description: 'Braided 65W fast charging cable'
  }
];

export const MOCK_CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'Rohan Sharma',
    phone: '9876543210',
    email: 'rohan.sharma@example.com',
    gstin: '07ABCDE1234F1Z5',
    address: 'Connaught Place, New Delhi',
    balanceDue: 1500
  },
  {
    id: 'cust-2',
    name: 'Ananya Verma',
    phone: '9123456780',
    email: 'ananya.v@example.com',
    gstin: '',
    address: 'Koramangala, Bengaluru',
    balanceDue: 0
  }
];

export const MOCK_SUPPLIERS = [
  {
    id: 'sup-1',
    name: 'Apex Tech Distributors',
    contactPerson: 'Vikram Mehta',
    phone: '9811223344',
    email: 'sales@apextech.in',
    gstin: '07AAAAA1111A1Z1',
    address: 'Nehru Place, New Delhi',
    balanceDue: 4500
  },
  {
    id: 'sup-2',
    name: 'LogiAccessories Wholesale',
    contactPerson: 'Suresh Patel',
    phone: '9822334455',
    email: 'orders@logiacc.com',
    gstin: '24BBBBB2222B1Z2',
    address: 'GIDC, Ahmedabad',
    balanceDue: 0
  }
];

export const MOCK_SALES = [
  {
    id: 'S-1001',
    date: '2026-11-15',
    customerName: 'Rohan Sharma',
    customerId: 'cust-1',
    amount: 1700,
    subtotal: 1700,
    discount: 0,
    tax: 0,
    paidAmount: 200,
    dueAmount: 1500,
    status: 'Partial',
    paymentMethod: 'UPI',
    items: [
      { productId: 1, name: 'Wireless Bluetooth Mouse', price: 850, qty: 2, gstRate: 0, discount: 0, total: 1700 }
    ]
  },
  {
    id: 'S-1002',
    date: '2026-11-16',
    customerName: 'Walk-in Customer',
    customerId: null,
    amount: 2999,
    subtotal: 2999,
    discount: 0,
    tax: 0,
    paidAmount: 2999,
    dueAmount: 0,
    status: 'Paid',
    paymentMethod: 'Cash',
    items: [
      { productId: 2, name: 'Mechanical Gaming Keyboard', price: 2999, qty: 1, gstRate: 0, discount: 0, total: 2999 }
    ]
  }
];

export const MOCK_PURCHASES = [
  {
    id: 'PO-2001',
    date: '2026-11-10',
    supplierName: 'Apex Tech Distributors',
    supplierId: 'sup-1',
    amount: 7500,
    subtotal: 7500,
    tax: 0,
    paidAmount: 3000,
    dueAmount: 4500,
    status: 'Completed',
    items: [
      { productId: 2, name: 'Mechanical Gaming Keyboard', cost: 1500, qty: 5, total: 7500 }
    ]
  }
];
