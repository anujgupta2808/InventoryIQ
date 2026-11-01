import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_SESSIONS,
  INITIAL_AUDIT_LOGS,
  DEFAULT_USERS,
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
  // Session Retrieval Helper
  const getStoredSession = () => {
    try {
      const sessionStr = localStorage.getItem('iq_v3_session') || sessionStorage.getItem('iq_v3_session');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed && parsed.token && parsed.user) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Registered Users Helper
  const getStoredUsers = () => {
    try {
      const usersStr = localStorage.getItem('iq_v3_users');
      return usersStr ? JSON.parse(usersStr) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  };

  // Helper to load localStorage with fallback
  const loadState = (key, initial) => {
    try {
      const saved = localStorage.getItem(`iq_v3_${key}`);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  };

  // User Accounts & Authentication State
  const [users, setUsers] = useState(getStoredUsers);
  const initialSession = getStoredSession();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialSession));
  const [user, setUser] = useState(initialSession ? initialSession.user : null);

  // Central Application Data States
  const [categories, setCategories] = useState(() => {
    const saved = loadState('categories', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [products, setProducts] = useState(() => loadState('products', INITIAL_PRODUCTS));
  const [sales, setSales] = useState(() => loadState('sales', INITIAL_SALES));
  const [purchases, setPurchases] = useState(() => loadState('purchases', INITIAL_PURCHASES));
  const [suppliers, setSuppliers] = useState(() => loadState('suppliers', INITIAL_SUPPLIERS));
  const [customers, setCustomers] = useState(() => loadState('customers', INITIAL_CUSTOMERS));
  const [sessions, setSessions] = useState(() => {
    const saved = loadState('sessions', INITIAL_SESSIONS);
    if (saved && saved.length > 0) return saved;
    if (initialSession) {
      return [{
        id: 'SES-' + Math.floor(1000 + Math.random() * 9000),
        device: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile Browser' : 'Chrome / Desktop',
        ip: '103.21.244.18',
        location: 'India',
        lastActive: 'Just now',
        current: true
      }];
    }
    return [];
  });
  const [auditLogs, setAuditLogs] = useState(() => loadState('auditLogs', INITIAL_AUDIT_LOGS));

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

  // Navigation & View State (denied to dashboard unless authenticated)
  const [currentPage, setCurrentPage] = useState(() => {
    return initialSession ? 'dashboard' : 'login';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Responsive Breakpoint Handler
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
      localStorage.setItem('iq_v3_users', JSON.stringify(users));
    } catch (e) { console.warn(e); }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_categories', JSON.stringify(categories));
    } catch (e) { console.warn(e); }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_products', JSON.stringify(products));
    } catch (e) { console.warn(e); }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_sales', JSON.stringify(sales));
    } catch (e) { console.warn(e); }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_purchases', JSON.stringify(purchases));
    } catch (e) { console.warn(e); }
  }, [purchases]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_suppliers', JSON.stringify(suppliers));
    } catch (e) { console.warn(e); }
  }, [suppliers]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_customers', JSON.stringify(customers));
    } catch (e) { console.warn(e); }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_sessions', JSON.stringify(sessions));
    } catch (e) { console.warn(e); }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_auditLogs', JSON.stringify(auditLogs));
    } catch (e) { console.warn(e); }
  }, [auditLogs]);

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
  const addAuditLog = (action, details, status = 'Success', actorName = null, actorRole = null) => {
    const now = new Date();
    const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newLog = {
      id: Date.now(),
      action,
      user: actorName || user?.name || 'Administrator',
      role: actorRole || user?.role || 'Admin',
      timestamp: timeStr,
      ip: '103.21.244.18',
      details,
      status
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATION & SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  // Login with credentials & session persistence
  const login = ({ email, password, rememberMe = true }) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    const matchedUser = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!matchedUser) {
      showToast('Login Failed', 'Account not found with this email address.', 'danger');
      return { success: false, message: 'Account not found.' };
    }

    if (matchedUser.password !== cleanPass) {
      showToast('Login Failed', 'Incorrect password. Please try again.', 'danger');
      return { success: false, message: 'Invalid password.' };
    }

    // Create session object
    const sessionData = {
      user: matchedUser,
      token: 'iq_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      loginTime: new Date().toISOString()
    };

    // Persist session
    try {
      if (rememberMe) {
        localStorage.setItem('iq_v3_session', JSON.stringify(sessionData));
        sessionStorage.removeItem('iq_v3_session');
      } else {
        sessionStorage.setItem('iq_v3_session', JSON.stringify(sessionData));
        localStorage.removeItem('iq_v3_session');
      }
    } catch (e) {
      console.warn('Session storage error:', e);
    }

    // Set active device session
    const currentDeviceSession = {
      id: 'SES-' + Math.floor(1000 + Math.random() * 9000),
      device: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile Browser' : 'Chrome / Desktop',
      ip: '103.21.244.18',
      location: 'India',
      lastActive: 'Just now',
      current: true
    };
    setSessions(prev => [currentDeviceSession, ...prev.map(s => ({ ...s, current: false }))]);

    setUser(matchedUser);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    addAuditLog('User Login', `User ${matchedUser.name} signed in successfully`, 'Success', matchedUser.name, matchedUser.role);
    showToast('Welcome Back!', `Logged in as ${matchedUser.name} (${matchedUser.role}).`);

    return { success: true, user: matchedUser };
  };

  // Registration & immediate session creation
  const register = ({ fullName, email, password }) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(fullName || '').trim();
    const cleanPass = String(password || '').trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      showToast('Validation Error', 'Please complete all required fields.', 'danger');
      return { success: false, message: 'Missing fields.' };
    }

    // Check duplicate email
    const exists = users.some(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      showToast('Registration Error', 'An account with this email already exists. Please log in.', 'warning');
      return { success: false, message: 'Email already registered.' };
    }

    const newUser = {
      id: Date.now(),
      name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      role: 'Admin',
      businessName: `${cleanName}'s Store`,
      phone: '',
      currency: 'INR',
      currencySymbol: '₹'
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);

    // Save session
    const sessionData = {
      user: newUser,
      token: 'iq_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      loginTime: new Date().toISOString()
    };

    try {
      localStorage.setItem('iq_v3_session', JSON.stringify(sessionData));
    } catch (e) {
      console.warn('Session write error:', e);
    }

    const currentDeviceSession = {
      id: 'SES-' + Math.floor(1000 + Math.random() * 9000),
      device: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile Browser' : 'Chrome / Desktop',
      ip: '103.21.244.18',
      location: 'India',
      lastActive: 'Just now',
      current: true
    };
    setSessions([currentDeviceSession]);

    setUser(newUser);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    addAuditLog('User Registered', `Created new tenant account for ${newUser.name}`, 'Success', newUser.name, newUser.role);
    showToast('Account Created!', `Welcome to InventoryIQ, ${newUser.name}! Your workspace is ready.`);

    return { success: true, user: newUser };
  };

  // Logout & session termination
  const logout = () => {
    try {
      localStorage.removeItem('iq_v3_session');
      sessionStorage.removeItem('iq_v3_session');
    } catch (e) {
      console.warn(e);
    }

    if (user) {
      addAuditLog('User Logout', `User ${user.name} logged out`);
    }

    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('login');
    showToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  // --------------------------------------------------------------------------
  // BUSINESS OPERATIONS & CRUD
  // --------------------------------------------------------------------------

  // Categories CRUD
  const addCategory = (categoryName) => {
    const trimmed = String(categoryName || '').trim();
    if (!trimmed) return;
    setCategories(prev => {
      if (prev.some(c => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
  };

  // Product CRUD
  const addProduct = (prodData) => {
    const stock = Number(prodData.stock) || 0;
    const minStock = Number(prodData.minStock) || 0;
    const status = stock <= 0 ? 'Out of Stock' : (stock <= minStock ? 'Low Stock' : 'In Stock');
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    if (prodData.category && String(prodData.category).trim()) {
      addCategory(String(prodData.category).trim());
    }

    const newProduct = {
      ...prodData,
      id: newId,
      category: String(prodData.category || 'General').trim(),
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
    if (prodData.category && String(prodData.category).trim()) {
      addCategory(String(prodData.category).trim());
    }
    setProducts(prev => prev.map(p => {
      if (p.id === Number(id)) {
        const stock = prodData.stock !== undefined ? Number(prodData.stock) : p.stock;
        const minStock = prodData.minStock !== undefined ? Number(prodData.minStock) : p.minStock;
        const status = stock <= 0 ? 'Out of Stock' : (stock <= minStock ? 'Low Stock' : 'In Stock');
        return {
          ...p,
          ...prodData,
          category: prodData.category !== undefined ? String(prodData.category).trim() : p.category,
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

  // Sales Creation, Customer Auto-Creation/Sync & Stock Deduction
  const createSale = (saleData) => {
    const newSaleId = `S-${1001 + sales.length}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const saleAmount = Number(saleData.amount) || 0;

    // 1. Deduct stock for each purchased line item from Inventory
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

    // 2. Auto-upload / sync customer in Customer CRM
    let assignedCustomerId = saleData.customerId;
    const custName = (saleData.customerName || '').trim();
    const custPhone = (saleData.customerPhone || '').trim();
    const custEmail = (saleData.customerEmail || '').trim();
    const custAddress = (saleData.customerAddress || '').trim();

    if (assignedCustomerId) {
      // Existing customer: update spending and order count
      setCustomers(prev => prev.map(c => {
        if (c.id === Number(assignedCustomerId)) {
          return {
            ...c,
            totalSpending: (Number(c.totalSpending) || 0) + saleAmount,
            totalOrders: (Number(c.totalOrders) || 0) + 1
          };
        }
        return c;
      }));
    } else if (custName) {
      // Check if customer already exists by phone or name
      setCustomers(prev => {
        const existingIdx = prev.findIndex(c => 
          (custPhone && custPhone !== 'N/A' && c.phone === custPhone) ||
          (c.name.toLowerCase() === custName.toLowerCase())
        );

        if (existingIdx >= 0) {
          assignedCustomerId = prev[existingIdx].id;
          return prev.map((c, idx) => {
            if (idx === existingIdx) {
              return {
                ...c,
                totalSpending: (Number(c.totalSpending) || 0) + saleAmount,
                totalOrders: (Number(c.totalOrders) || 0) + 1,
                phone: (c.phone === 'N/A' || !c.phone) && custPhone ? custPhone : c.phone,
                email: !c.email && custEmail ? custEmail : c.email,
                address: !c.address && custAddress ? custAddress : c.address
              };
            }
            return c;
          });
        } else {
          // Auto-create new customer in Customer CRM!
          const newId = prev.length > 0 ? Math.max(...prev.map(c => c.id)) + 1 : 1;
          assignedCustomerId = newId;
          const newCustomer = {
            id: newId,
            name: custName,
            phone: custPhone || 'N/A',
            email: custEmail || '',
            address: custAddress || 'Store Customer',
            totalSpending: saleAmount,
            totalOrders: 1,
            status: 'Active'
          };
          addAuditLog('Customer Auto-Registered', `Customer ${newCustomer.name} auto-added to CRM from Sale #${newSaleId}`);
          return [newCustomer, ...prev];
        }
      });
    }

    const newSale = {
      id: newSaleId,
      date: dateStr,
      ...saleData,
      customerId: assignedCustomerId,
      status: 'Completed'
    };

    setSales(prev => [newSale, ...prev]);
    addAuditLog('Sale Created', `Sale #${newSaleId} – ₹${Number(saleData.amount).toLocaleString('en-IN')}`);
    showToast('Sale Completed', `Invoice #${newSaleId} generated, customer data synced, and inventory stock deducted.`);
    return newSale;
  };

  // Purchases PO Creation, Supplier Auto-Sync & Inventory Auto-Stocking/Creation
  const createPurchase = (poData) => {
    const newPoId = `P-${2001 + purchases.length}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const poAmount = Number(poData.amount) || 0;

    // 1. Auto-upload / sync supplier in Contact / Suppliers
    let finalSupplierId = poData.supplierId;
    let finalSupplierName = (poData.supplierName || '').trim();

    if (poData.newSupplierData) {
      // User entered a new supplier in the PO modal
      const supp = poData.newSupplierData;
      finalSupplierName = (supp.name || '').trim();
      const newSuppId = suppliers.length > 0 ? Math.max(...suppliers.map(s => s.id)) + 1 : 1;
      finalSupplierId = newSuppId;

      const newSupplier = {
        id: newSuppId,
        name: finalSupplierName,
        contactPerson: supp.contactPerson || '',
        phone: supp.phone || '',
        email: supp.email || '',
        address: supp.address || '',
        status: 'Active',
        totalPurchases: `₹${poAmount.toLocaleString('en-IN')}`
      };

      setSuppliers(prev => [newSupplier, ...prev]);
      addAuditLog('Contact Auto-Registered', `Supplier ${newSupplier.name} auto-registered from PO #${newPoId}`);
    } else if (finalSupplierId) {
      // Existing supplier selected: update their totalPurchases
      setSuppliers(prev => prev.map(s => {
        if (s.id === Number(finalSupplierId)) {
          const currentTotal = Number(String(s.totalPurchases || '0').replace(/[^0-9]/g, '')) || 0;
          const newTotal = currentTotal + poAmount;
          return {
            ...s,
            totalPurchases: `₹${newTotal.toLocaleString('en-IN')}`
          };
        }
        return s;
      }));
    }

    const newPo = {
      id: newPoId,
      date: dateStr,
      ...poData,
      supplierId: finalSupplierId,
      supplierName: finalSupplierName
    };

    // 2. Auto-replenish stock or Auto-add new product in Inventory
    if (newPo.status === 'Completed' && poData.items && poData.items.length > 0) {
      setProducts(prev => {
        let updated = [...prev];

        poData.items.forEach(item => {
          // Check if product exists by ID or by Name
          const existingIdx = updated.findIndex(p => 
            (item.productId && p.id === Number(item.productId)) ||
            (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
          );

          if (existingIdx >= 0) {
            // Existing product: add quantity to stock, update cost price
            const existing = updated[existingIdx];
            const newStock = existing.stock + Number(item.qty);
            const status = newStock <= 0 ? 'Out of Stock' : (newStock <= existing.minStock ? 'Low Stock' : 'In Stock');
            updated[existingIdx] = {
              ...existing,
              stock: newStock,
              costPrice: Number(item.cost) || existing.costPrice,
              status,
              supplierName: finalSupplierName || existing.supplierName
            };
          } else {
            // Product doesn't exist yet: auto-add to Inventory catalog!
            const newProdId = updated.length > 0 ? Math.max(...updated.map(p => p.id)) + 1 : 1;
            const cost = Number(item.cost) || 0;
            const price = Number(item.price) || Math.round(cost * 1.35) || (cost + 50);
            const qty = Number(item.qty) || 1;
            if (item.category && String(item.category).trim()) {
              addCategory(String(item.category).trim());
            }
            const newProd = {
              id: newProdId,
              name: item.name || `Purchased Item #${newProdId}`,
              sku: item.sku || `SKU-${Math.floor(100 + Math.random() * 900)}`,
              category: item.category ? String(item.category).trim() : 'General',
              stock: qty,
              minStock: 20,
              costPrice: cost,
              price: price,
              unit: item.unit || 'Piece',
              status: qty <= 0 ? 'Out of Stock' : 'In Stock',
              supplierId: finalSupplierId || 1,
              supplierName: finalSupplierName || 'Supplier'
            };
            updated.unshift(newProd);
            addAuditLog('Product Auto-Created', `Product ${newProd.name} auto-added to inventory catalog from PO #${newPoId}`);
          }
        });

        return updated;
      });
    }

    setPurchases(prev => [newPo, ...prev]);
    addAuditLog('Purchase Order Created', `Order #${newPoId} placed with ${finalSupplierName}`);
    showToast('Purchase Completed', `PO #${newPoId} recorded, contact added/updated, and inventory stocked.`);
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

  // Reset to default
  const resetAllData = () => {
    setProducts([]);
    setCategories([]);
    setSales([]);
    setPurchases([]);
    setSuppliers([]);
    setCustomers([]);
    setAuditLogs([]);
    setSessions([]);
    localStorage.removeItem('iq_v3_products');
    localStorage.removeItem('iq_v3_categories');
    localStorage.removeItem('iq_v3_sales');
    localStorage.removeItem('iq_v3_purchases');
    localStorage.removeItem('iq_v3_suppliers');
    localStorage.removeItem('iq_v3_customers');
    localStorage.removeItem('iq_v3_auditLogs');
    localStorage.removeItem('iq_v3_sessions');
    showToast('Data Cleared', 'All application data has been wiped.', 'info');
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
      products: products.length > 0 ? '+12%' : '0%',
      sales: sales.length > 0 ? '+18%' : '0%',
      purchases: purchases.length > 0 ? '+8%' : '0%',
      profit: totalProfit > 0 ? '+20%' : '0%'
    }
  };

  const value = {
    categories,
    setCategories,
    addCategory,
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
    users,
    login,
    register,
    logout,
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
