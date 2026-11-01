import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_SESSIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_USER
} from '../data/seedData';

const InventoryContext = createContext();

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

export const InventoryProvider = ({ children }) => {
  // Helper to load localStorage with seed fallback
  const loadState = (key, initial) => {
    try {
      const saved = localStorage.getItem(`iq_v2_${key}`);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  };

  // Central Application Data States
  const [products, setProducts] = useState(() => loadState('products', INITIAL_PRODUCTS));
  const [sales, setSales] = useState(() => loadState('sales', INITIAL_SALES));
  const [purchases, setPurchases] = useState(() => loadState('purchases', INITIAL_PURCHASES));
  const [suppliers, setSuppliers] = useState(() => loadState('suppliers', INITIAL_SUPPLIERS));
  const [customers, setCustomers] = useState(() => loadState('customers', INITIAL_CUSTOMERS));
  const [sessions, setSessions] = useState(() => loadState('sessions', INITIAL_SESSIONS));
  const [auditLogs, setAuditLogs] = useState(() => loadState('auditLogs', INITIAL_AUDIT_LOGS));
  const [user, setUser] = useState(() => loadState('user', INITIAL_USER));

  // Theme State ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('iq_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    try {
      localStorage.setItem('iq_theme', theme);
    } catch (e) {
      console.warn(e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast('Theme Changed', `Switched to ${next === 'dark' ? 'Dark' : 'Light'} mode.`, 'info');
      return next;
    });
  };

  // Navigation & View State
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Responsive Breakpoint Handler across Mobile (<768px), Tablet (768px-1023px), Laptop/Desktop (>=1024px)
  useEffect(() => {
    let prevWidth = window.innerWidth;

    const handleResize = () => {
      const width = window.innerWidth;

      if (width < 768 && prevWidth >= 768) {
        setMobileMenuOpen(false);
      } else if (width >= 768 && width < 1024 && (prevWidth < 768 || prevWidth >= 1024)) {
        setSidebarCollapsed(true);
        setMobileMenuOpen(false);
      } else if (width >= 1024 && prevWidth < 1024) {
        setSidebarCollapsed(false);
        setMobileMenuOpen(false);
      }

      prevWidth = width;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure mobile menu closes upon route/page changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPage]);

  // Global Dialogs & Invoices
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'danger',
    onConfirm: () => {}
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('iq_v2_products', JSON.stringify(products));
    } catch (e) { console.warn(e); }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v2_sales', JSON.stringify(sales));
    } catch (e) { console.warn(e); }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v2_purchases', JSON.stringify(purchases));
    } catch (e) { console.warn(e); }
  }, [purchases]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v2_suppliers', JSON.stringify(suppliers));
    } catch (e) { console.warn(e); }
  }, [suppliers]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v2_customers', JSON.stringify(customers));
    } catch (e) { console.warn(e); }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v2_sessions', JSON.stringify(sessions));
    } catch (e) { console.warn(e); }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v2_auditLogs', JSON.stringify(auditLogs));
    } catch (e) { console.warn(e); }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v2_user', JSON.stringify(user));
    } catch (e) { console.warn(e); }
  }, [user]);

  // Toast Helper
  const showToast = (title, message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Confirm Modal Helper
  const openConfirm = ({ title, message, confirmText = 'Delete', confirmVariant = 'danger', onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      confirmVariant,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const closeConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Audit Logging Helper
  const addAuditLog = (action, details, status = 'Success') => {
    const now = new Date();
    const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newLog = {
      id: Date.now(),
      action,
      user: user.name,
      role: user.role,
      timestamp: timeStr,
      ip: '103.21.244.18',
      details,
      status
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Product CRUD
  const addProduct = (prodData) => {
    const stock = Number(prodData.stock) || 0;
    const minStock = Number(prodData.minStock) || 0;
    const status = stock <= 0 ? 'Out of Stock' : (stock <= minStock ? 'Low Stock' : 'In Stock');
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    const newProduct = {
      ...prodData,
      id: newId,
      stock,
      minStock,
      price: Number(prodData.price) || 0,
      costPrice: Number(prodData.costPrice) || 0,
      status
    };

    setProducts(prev => [newProduct, ...prev]);
    addAuditLog('Product Added', `Added ${newProduct.name} (SKU: ${newProduct.sku})`);
    showToast('Product Created', `${newProduct.name} has been added successfully.`);
    return newProduct;
  };

  const updateProduct = (id, prodData) => {
    setProducts(prev => prev.map(p => {
      if (p.id === Number(id)) {
        const stock = prodData.stock !== undefined ? Number(prodData.stock) : p.stock;
        const minStock = prodData.minStock !== undefined ? Number(prodData.minStock) : p.minStock;
        const status = stock <= 0 ? 'Out of Stock' : (stock <= minStock ? 'Low Stock' : 'In Stock');
        return {
          ...p,
          ...prodData,
          stock,
          minStock,
          price: prodData.price !== undefined ? Number(prodData.price) : p.price,
          costPrice: prodData.costPrice !== undefined ? Number(prodData.costPrice) : p.costPrice,
          status
        };
      }
      return p;
    }));
    addAuditLog('Product Updated', `Updated product ID #${id}`);
    showToast('Product Updated', 'Product changes saved successfully.');
  };

  const deleteProduct = (id) => {
    const item = products.find(p => p.id === Number(id));
    setProducts(prev => prev.filter(p => p.id !== Number(id)));
    addAuditLog('Product Deleted', `Removed ${item?.name || 'Product'}`);
    showToast('Product Deleted', 'The product has been removed from catalog.', 'warning');
  };

  // Sales Creation & Stock Deduction
  const createSale = (saleData) => {
    const newSaleId = `S-${1046 + sales.length}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const newSale = {
      id: newSaleId,
      date: dateStr,
      ...saleData,
      status: 'Completed'
    };

    // Deduct stock for each purchased line item
    if (saleData.items && saleData.items.length > 0) {
      setProducts(prev => prev.map(p => {
        const line = saleData.items.find(i => Number(i.productId) === p.id);
        if (line) {
          const newStock = Math.max(0, p.stock - Number(line.qty));
          const status = newStock <= 0 ? 'Out of Stock' : (newStock <= p.minStock ? 'Low Stock' : 'In Stock');
          return { ...p, stock: newStock, status };
        }
        return p;
      }));
    }

    // Update customer spending & order count if customer matched
    if (saleData.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === Number(saleData.customerId)) {
          return {
            ...c,
            totalSpending: c.totalSpending + Number(saleData.amount),
            totalOrders: c.totalOrders + 1
          };
        }
        return c;
      }));
    }

    setSales(prev => [newSale, ...prev]);
    addAuditLog('Sale Created', `Sale #${newSaleId} – ₹${Number(saleData.amount).toLocaleString('en-IN')}`);
    showToast('Sale Completed', `Invoice #${newSaleId} created and inventory updated.`);
    return newSale;
  };

  // Purchases PO Creation & Auto Stocking
  const createPurchase = (poData) => {
    const newPoId = `P-${2046 + purchases.length}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const newPo = {
      id: newPoId,
      date: dateStr,
      ...poData
    };

    // If completed status, replenish stock
    if (newPo.status === 'Completed' && poData.items && poData.items.length > 0) {
      setProducts(prev => prev.map(p => {
        const line = poData.items.find(i => Number(i.productId) === p.id);
        if (line) {
          const newStock = p.stock + Number(line.qty);
          const status = newStock <= 0 ? 'Out of Stock' : (newStock <= p.minStock ? 'Low Stock' : 'In Stock');
          return { ...p, stock: newStock, status };
        }
        return p;
      }));
    }

    setPurchases(prev => [newPo, ...prev]);
    addAuditLog('Purchase Order Created', `Order #${newPoId} placed with ${poData.supplierName}`);
    showToast('PO Created', `Purchase order #${newPoId} recorded.`);
    return newPo;
  };

  // Suppliers CRUD
  const addSupplier = (suppData) => {
    const newId = suppliers.length > 0 ? Math.max(...suppliers.map(s => s.id)) + 1 : 1;
    const newSupp = {
      id: newId,
      totalPurchases: '₹0',
      status: 'Active',
      ...suppData
    };
    setSuppliers(prev => [newSupp, ...prev]);
    addAuditLog('Supplier Added', `Added supplier ${newSupp.name}`);
    showToast('Supplier Added', `${newSupp.name} registered successfully.`);
    return newSupp;
  };

  const updateSupplier = (id, suppData) => {
    setSuppliers(prev => prev.map(s => s.id === Number(id) ? { ...s, ...suppData } : s));
    addAuditLog('Supplier Updated', `Updated supplier #${id}`);
    showToast('Supplier Updated', 'Supplier details saved.');
  };

  const deleteSupplier = (id) => {
    const s = suppliers.find(item => item.id === Number(id));
    setSuppliers(prev => prev.filter(item => item.id !== Number(id)));
    addAuditLog('Supplier Deleted', `Removed ${s?.name || 'Supplier'}`);
    showToast('Supplier Removed', 'Supplier deleted from directory.', 'warning');
  };

  // Customers CRUD
  const addCustomer = (custData) => {
    const newId = customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1;
    const newCust = {
      id: newId,
      totalSpending: 0,
      totalOrders: 0,
      status: 'Active',
      ...custData
    };
    setCustomers(prev => [newCust, ...prev]);
    addAuditLog('Customer Added', `Added customer ${newCust.name}`);
    showToast('Customer Created', `${newCust.name} added to records.`);
    return newCust;
  };

  const updateCustomer = (id, custData) => {
    setCustomers(prev => prev.map(c => c.id === Number(id) ? { ...c, ...custData } : c));
    addAuditLog('Customer Updated', `Updated customer #${id}`);
    showToast('Customer Updated', 'Customer profile updated.');
  };

  const deleteCustomer = (id) => {
    const c = customers.find(item => item.id === Number(id));
    setCustomers(prev => prev.filter(item => item.id !== Number(id)));
    addAuditLog('Customer Deleted', `Removed ${c?.name || 'Customer'}`);
    showToast('Customer Removed', 'Customer deleted from records.', 'warning');
  };

  // Security Sessions
  const revokeSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    addAuditLog('Session Revoked', `Terminated session ID ${id}`);
    showToast('Session Revoked', 'The device session has been signed out.', 'warning');
  };

  // CSV Exporter
  const exportCSV = (filename, dataRows, headerNames) => {
    if (!dataRows || !dataRows.length) {
      showToast('Export Error', 'No data available to export.', 'warning');
      return;
    }
    const headers = headerNames.join(',');
    const rows = dataRows.map(row => 
      row.map(val => {
        const str = String(val ?? '').replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Complete', `${filename}.csv has been downloaded.`);
  };

  // Reset to default seed
  const resetAllData = () => {
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setPurchases(INITIAL_PURCHASES);
    setSuppliers(INITIAL_SUPPLIERS);
    setCustomers(INITIAL_CUSTOMERS);
    setSessions(INITIAL_SESSIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setUser(INITIAL_USER);
    localStorage.clear();
    showToast('Data Reset', 'All application data restored to defaults.', 'info');
  };

  // Calculated Dashboard Stats
  const totalSalesVal = sales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const totalPurchasesVal = purchases.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalProfit = Math.max(0, totalSalesVal - totalPurchasesVal);
  const lowStockItems = products.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock');

  const stats = {
    totalProducts: products.length,
    totalSales: totalSalesVal,
    totalPurchases: totalPurchasesVal,
    profit: totalProfit,
    lowStockCount: lowStockItems.length,
    trends: {
      products: '+12%',
      sales: '+18%',
      purchases: '+8%',
      profit: '+20%'
    }
  };

  const value = {
    products,
    setProducts,
    sales,
    setSales,
    purchases,
    setPurchases,
    suppliers,
    setSuppliers,
    customers,
    setCustomers,
    sessions,
    setSessions,
    auditLogs,
    user,
    setUser,
    currentPage,
    setCurrentPage,
    isAuthenticated,
    setIsAuthenticated,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    toasts,
    showToast,
    removeToast,
    confirmModal,
    openConfirm,
    closeConfirm,
    activeInvoice,
    setActiveInvoice,
    isInvoiceOpen,
    setIsInvoiceOpen,
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    addProduct,
    updateProduct,
    deleteProduct,
    createSale,
    createPurchase,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    revokeSession,
    exportCSV,
    resetAllData,
    stats,
    lowStockItems,
    theme,
    setTheme,
    toggleTheme
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

