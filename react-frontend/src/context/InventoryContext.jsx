import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_SUPPLIERS,
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

  // Password reset target state (for forgot -> reset password workflow)
  const [resetTargetEmail, setResetTargetEmail] = useState('');

  // Central Application Data States
  const [categories, setCategories] = useState(() => {
    const saved = loadState('categories', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [products, setProducts] = useState(() => loadState('products', INITIAL_PRODUCTS));
  const [sales, setSales] = useState(() => loadState('sales', INITIAL_SALES));
  const [purchases, setPurchases] = useState(() => loadState('purchases', INITIAL_PURCHASES));
  const [suppliers, setSuppliers] = useState(() => loadState('suppliers', INITIAL_SUPPLIERS));
  const [sessions, setSessions] = useState(() => {
    const saved = loadState('sessions', INITIAL_SESSIONS);
    if (saved && saved.length > 0) return saved;
    return INITIAL_SESSIONS;
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
    try {
      localStorage.setItem('iq_theme', theme);
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation & Interactive Shell State
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals & Overlay Portals
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Global Confirmation Dialog
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmVariant: 'danger',
    onConfirm: () => {}
  });

  const openConfirm = ({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger',
    onConfirm
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      confirmVariant,
      onConfirm: () => {
        if (typeof onConfirm === 'function') {
          try {
            onConfirm();
          } catch (err) {
            console.error('Action error:', err);
          }
        }
        closeConfirm();
      }
    });
  };

  const closeConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  // Auto-sync State to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_users', JSON.stringify(users));
    } catch (e) { console.warn(e); }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_products', JSON.stringify(products));
    } catch (e) { console.warn(e); }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('iq_v3_categories', JSON.stringify(categories));
    } catch (e) { console.warn(e); }
  }, [categories]);

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
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Audit Logger
  const addAuditLog = (action, details = '', status = 'Success', customUser = null, customRole = null) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const newLog = {
      id: Date.now() + Math.floor(Math.random() * 100),
      timestamp: `${dateStr} at ${timeStr}`,
      action,
      details,
      user: customUser || user?.name || 'Administrator',
      role: customRole || user?.role || 'Admin',
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
  const register = ({ fullName, email, password, organizationName, organizationType, gstin }) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(fullName || '').trim();
    const cleanPass = String(password || '').trim();
    const cleanOrgName = String(organizationName || '').trim() || `${cleanName}'s Store`;
    const cleanOrgType = String(organizationType || '').trim() || 'Retail Store / Shop';
    const cleanGstin = String(gstin || '').trim().toUpperCase();

    if (!cleanName || !cleanEmail || !cleanPass) {
      showToast('Validation Error', 'Please complete all required fields.', 'danger');
      return { success: false, message: 'Missing fields.' };
    }

    if (!cleanOrgName) {
      showToast('Validation Error', 'Please enter your organization or company name.', 'danger');
      return { success: false, message: 'Missing organization name.' };
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
      organizationName: cleanOrgName,
      businessName: cleanOrgName,
      organizationType: cleanOrgType,
      gstin: cleanGstin,
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

  // Request password reset verification link
  const requestPasswordReset = (email) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    setResetTargetEmail(cleanEmail);
    addAuditLog('Password Reset Requested', `Reset requested for ${cleanEmail}`);
    showToast('Reset Instructions Dispatched', `Password reset verification link sent to ${cleanEmail}.`, 'info');
    return { success: true };
  };

  // Actual Reset Password handler that updates user record in database
  const resetPassword = ({ email, newPassword }) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(newPassword || '').trim();

    if (!cleanEmail || !cleanPass) {
      showToast('Validation Error', 'Email and new password are required.', 'danger');
      return { success: false, message: 'Missing fields' };
    }

    if (cleanPass.length < 8) {
      showToast('Validation Error', 'Password must be at least 8 characters long.', 'danger');
      return { success: false, message: 'Password too short' };
    }

    const userIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (userIndex === -1) {
      showToast('Account Not Found', `No registered account found for ${cleanEmail}.`, 'danger');
      return { success: false, message: 'User not found' };
    }

    const updatedUsers = users.map((u, i) => {
      if (i === userIndex) {
        return { ...u, password: cleanPass };
      }
      return u;
    });

    setUsers(updatedUsers);
    try {
      localStorage.setItem('iq_v3_users', JSON.stringify(updatedUsers));
    } catch (e) {
      console.warn(e);
    }

    // If currently logged-in user matches, update current session as well
    if (user && user.email.toLowerCase() === cleanEmail) {
      const updatedUser = { ...user, password: cleanPass };
      setUser(updatedUser);
      try {
        const sess = getStoredSession();
        if (sess) {
          sess.user = updatedUser;
          if (localStorage.getItem('iq_v3_session')) {
            localStorage.setItem('iq_v3_session', JSON.stringify(sess));
          } else {
            sessionStorage.setItem('iq_v3_session', JSON.stringify(sess));
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }

    addAuditLog('Password Reset Completed', `Password updated for account ${cleanEmail}`);
    showToast('Password Updated', 'Your password has been successfully reset. Please log in with your new credentials.', 'success');
    return { success: true };
  };

  // Change password for currently logged-in user
  const changePassword = ({ currentPassword, newPassword }) => {
    if (!user) {
      showToast('Auth Error', 'You must be logged in to change your password.', 'danger');
      return { success: false, message: 'Not logged in' };
    }

    const cleanCurrent = String(currentPassword || '').trim();
    const cleanNew = String(newPassword || '').trim();

    if (user.password && user.password !== cleanCurrent) {
      showToast('Verification Failed', 'Current password is incorrect.', 'danger');
      return { success: false, message: 'Current password incorrect' };
    }

    if (cleanNew.length < 8) {
      showToast('Validation Error', 'New password must be at least 8 characters long.', 'danger');
      return { success: false, message: 'Password too short' };
    }

    const updatedUser = { ...user, password: cleanNew };
    setUser(updatedUser);

    const updatedUsers = users.map(u => u.email.toLowerCase() === user.email.toLowerCase() ? updatedUser : u);
    setUsers(updatedUsers);

    try {
      localStorage.setItem('iq_v3_users', JSON.stringify(updatedUsers));
      const sess = getStoredSession();
      if (sess) {
        sess.user = updatedUser;
        if (localStorage.getItem('iq_v3_session')) {
          localStorage.setItem('iq_v3_session', JSON.stringify(sess));
        } else {
          sessionStorage.setItem('iq_v3_session', JSON.stringify(sess));
        }
      }
    } catch (e) {
      console.warn(e);
    }

    addAuditLog('Password Changed', `User ${user.name} changed account password`);
    showToast('Security Alert', 'Your account password has been updated successfully.', 'success');
    return { success: true };
  };

  // Update user profile information
  const updateUserProfile = (profileData) => {
    if (!user) return;
    const updated = {
      ...user,
      ...profileData
    };
    setUser(updated);
    const updatedUsers = users.map(u => u.email.toLowerCase() === user.email.toLowerCase() ? updated : u);
    setUsers(updatedUsers);
    try {
      localStorage.setItem('iq_v3_users', JSON.stringify(updatedUsers));
      const sess = getStoredSession();
      if (sess) {
        sess.user = updated;
        if (localStorage.getItem('iq_v3_session')) {
          localStorage.setItem('iq_v3_session', JSON.stringify(sess));
        } else {
          sessionStorage.setItem('iq_v3_session', JSON.stringify(sess));
        }
      }
    } catch (e) {
      console.warn(e);
    }
    addAuditLog('Profile Updated', `Updated profile settings for ${updated.name}`);
    showToast('Profile Saved', 'Profile settings updated successfully.', 'success');
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
    const stock = Math.max(0, parseInt(prodData.stock, 10) || 0);
    const minStock = Math.max(0, parseInt(prodData.minStock, 10) || 0);
    const price = Math.max(0, parseFloat(prodData.price) || 0);
    const costPrice = Math.max(0, parseFloat(prodData.costPrice) || 0);
    const status = stock <= 0 ? 'Out of Stock' : (stock <= minStock ? 'Low Stock' : 'In Stock');
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    if (prodData.category && String(prodData.category).trim()) {
      addCategory(String(prodData.category).trim());
    }

    const newProduct = {
      id: newId,
      name: String(prodData.name || '').trim(),
      sku: String(prodData.sku || `SKU-${Math.floor(100 + Math.random() * 900)}`).trim(),
      category: String(prodData.category || 'General').trim(),
      stock,
      minStock,
      price,
      costPrice,
      unit: prodData.unit || 'Piece',
      supplierId: prodData.supplierId ? Number(prodData.supplierId) : null,
      supplierName: prodData.supplierName || 'Primary Supplier',
      status
    };

    setProducts(prev => [newProduct, ...prev]);
    addAuditLog('Product Added', `Added ${newProduct.name} (${newProduct.sku})`);
    showToast('Product Added', `"${newProduct.name}" added to inventory.`);
    return newProduct;
  };

  const updateProduct = (id, prodData) => {
    const stock = Math.max(0, parseInt(prodData.stock, 10) || 0);
    const minStock = Math.max(0, parseInt(prodData.minStock, 10) || 0);
    const price = Math.max(0, parseFloat(prodData.price) || 0);
    const costPrice = Math.max(0, parseFloat(prodData.costPrice) || 0);
    const status = stock <= 0 ? 'Out of Stock' : (stock <= minStock ? 'Low Stock' : 'In Stock');

    if (prodData.category && String(prodData.category).trim()) {
      addCategory(String(prodData.category).trim());
    }

    setProducts(prev => prev.map(p => {
      if (p.id === Number(id)) {
        return {
          ...p,
          ...prodData,
          id: p.id,
          name: String(prodData.name || p.name).trim(),
          sku: String(prodData.sku || p.sku).trim(),
          category: String(prodData.category || p.category).trim(),
          stock,
          minStock,
          price,
          costPrice,
          unit: prodData.unit || p.unit,
          status
        };
      }
      return p;
    }));

    addAuditLog('Product Updated', `Updated product #${id}`);
    showToast('Product Updated', 'Product changes saved successfully.');
  };

  const deleteProduct = (id) => {
    const p = products.find(item => item.id === Number(id));
    setProducts(prev => prev.filter(item => item.id !== Number(id)));
    addAuditLog('Product Deleted', `Removed ${p?.name || 'Product'} (${p?.sku || id})`);
    showToast('Product Deleted', 'The product has been removed from catalog.', 'warning');
  };

  // Sales Creation & Immediate Stock Deduction
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

    const custName = (saleData.customerName || '').trim() || 'Walk-in Customer';
    const custPhone = (saleData.customerPhone || '').trim();
    const custEmail = (saleData.customerEmail || '').trim();
    const custAddress = (saleData.customerAddress || '').trim();

    // Paid amount & Due calculations
    const paidAmount = saleData.paidAmount !== undefined
      ? Math.max(0, Math.min(saleAmount, Number(saleData.paidAmount) || 0))
      : saleAmount;
    const dueAmount = Math.max(0, saleAmount - paidAmount);
    const paymentStatus = dueAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid');

    const paymentHistory = [];
    if (paidAmount > 0) {
      paymentHistory.push({
        id: 'PAY-' + Date.now().toString().slice(-6),
        date: dateStr,
        amount: paidAmount,
        method: saleData.paymentMethod || 'UPI',
        note: 'Initial payment at invoice creation'
      });
    }

    const newSale = {
      id: newSaleId,
      date: dateStr,
      customerName: custName,
      customerPhone: custPhone,
      customerEmail: custEmail,
      customerAddress: custAddress,
      items: saleData.items || [],
      subtotal: Number(saleData.subtotal) || saleAmount,
      tax: Number(saleData.tax) || 0,
      discount: Number(saleData.discount) || 0,
      amount: saleAmount,
      paidAmount,
      dueAmount,
      status: paymentStatus,
      paymentMethod: saleData.paymentMethod || 'UPI',
      paymentHistory
    };

    setSales(prev => [newSale, ...prev]);
    addAuditLog('Sale Created', `Sale #${newSaleId} (${custName}) – Billed ₹${saleAmount.toLocaleString('en-IN')}, Received ₹${paidAmount.toLocaleString('en-IN')}${dueAmount > 0 ? `, Due ₹${dueAmount.toLocaleString('en-IN')}` : ''}`);
    showToast('Sale Completed', `Invoice #${newSaleId} generated. Status: ${paymentStatus}.`);
    return newSale;
  };

  // Record / Collect Payment for a Specific Invoice or Person Ledger (Accounts Receivable)
  const recordPayment = ({ saleId, customerName, paymentAmount, paymentMethod = 'UPI', note = '' }) => {
    const payAmt = Number(paymentAmount) || 0;
    if (payAmt <= 0) {
      showToast('Invalid Amount', 'Payment amount must be greater than zero.', 'danger');
      return { success: false, message: 'Invalid payment amount' };
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const paymentId = 'PAY-' + Date.now().toString().slice(-6);
    let remainingToAllocate = payAmt;
    const affectedSales = [];

    setSales(prevSales => {
      // 1. Targeted Invoice Settlement
      if (saleId) {
        return prevSales.map(s => {
          if (s.id === saleId) {
            const currentTotal = Number(s.amount) || 0;
            const currentPaid = Number(s.paidAmount !== undefined ? s.paidAmount : (s.status === 'Completed' || s.status === 'Paid' ? s.amount : 0));
            const newPaid = Math.min(currentTotal, currentPaid + payAmt);
            const newDue = Math.max(0, currentTotal - newPaid);
            const newStatus = newDue <= 0 ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');

            const historyEntry = {
              id: paymentId,
              date: dateStr,
              amount: payAmt,
              method: paymentMethod,
              note: note || `Payment installment received`
            };

            affectedSales.push(s.id);
            return {
              ...s,
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newStatus,
              paymentHistory: [...(s.paymentHistory || []), historyEntry]
            };
          }
          return s;
        });
      }

      // 2. FIFO Settlement across Person's Overdue Invoices
      if (customerName) {
        const cleanTarget = customerName.trim().toLowerCase();
        const updated = [...prevSales];

        // Traverse oldest to newest (sales array has newest at index 0, so iterate backwards)
        for (let i = updated.length - 1; i >= 0 && remainingToAllocate > 0; i--) {
          const s = updated[i];
          if ((s.customerName || '').trim().toLowerCase() === cleanTarget) {
            const currentTotal = Number(s.amount) || 0;
            const currentPaid = Number(s.paidAmount !== undefined ? s.paidAmount : (s.status === 'Completed' || s.status === 'Paid' ? s.amount : 0));
            const currentDue = Math.max(0, currentTotal - currentPaid);

            if (currentDue > 0) {
              const alloc = Math.min(currentDue, remainingToAllocate);
              const newPaid = currentPaid + alloc;
              const newDue = Math.max(0, currentTotal - newPaid);
              const newStatus = newDue <= 0 ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');

              const historyEntry = {
                id: `${paymentId}-${s.id}`,
                date: dateStr,
                amount: alloc,
                method: paymentMethod,
                note: note || `Payment installment allocated to #${s.id}`
              };

              remainingToAllocate -= alloc;
              affectedSales.push(s.id);

              updated[i] = {
                ...s,
                paidAmount: newPaid,
                dueAmount: newDue,
                status: newStatus,
                paymentHistory: [...(s.paymentHistory || []), historyEntry]
              };
            }
          }
        }
        return updated;
      }

      return prevSales;
    });

    const targetLabel = saleId ? `Invoice #${saleId}` : `Client "${customerName}"`;
    addAuditLog('Payment Received', `Collected ₹${payAmt.toLocaleString('en-IN')} via ${paymentMethod} for ${targetLabel}`);
    showToast('Payment Collected', `Successfully recorded ₹${payAmt.toLocaleString('en-IN')} via ${paymentMethod} for ${targetLabel}.`, 'success');
    return { success: true, paymentId, affectedSales };
  };

  // Purchases PO Creation, Supplier Auto-Sync & Inventory Auto-Stocking/Creation
  const createPurchase = (poData) => {
    const newPoId = `PO-${2001 + purchases.length}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let finalSupplierId = poData.supplierId;
    let finalSupplierName = poData.supplierName;

    // 1. Auto-save new supplier to Contacts if created inline
    if (poData.newSupplierData && poData.newSupplierData.name) {
      const newSupId = suppliers.length > 0 ? Math.max(...suppliers.map(s => s.id)) + 1 : 1;
      const createdSup = {
        id: newSupId,
        name: poData.newSupplierData.name,
        contactPerson: poData.newSupplierData.contactPerson || 'Vendor Rep',
        email: poData.newSupplierData.email || 'orders@supplier.com',
        phone: poData.newSupplierData.phone || '+91 98765 00000',
        address: poData.newSupplierData.address || 'Vendor Address',
        status: 'Active',
        totalPurchases: `₹${Number(poData.amount).toLocaleString('en-IN')}`
      };
      finalSupplierId = newSupId;
      finalSupplierName = createdSup.name;
      setSuppliers(prev => [createdSup, ...prev]);
      addAuditLog('Supplier Auto-Added', `Supplier ${createdSup.name} auto-added from PO #${newPoId}`);
    } else if (finalSupplierId) {
      // Update existing supplier spend tally
      setSuppliers(prev => prev.map(s => {
        if (s.id === Number(finalSupplierId)) {
          const currentTotal = parseInt(String(s.totalPurchases || '0').replace(/[^0-9]/g, ''), 10) || 0;
          return {
            ...s,
            totalPurchases: `₹${(currentTotal + Number(poData.amount)).toLocaleString('en-IN')}`
          };
        }
        return s;
      }));
    }

    const newPo = {
      id: newPoId,
      supplierId: finalSupplierId,
      supplierName: finalSupplierName,
      date: dateStr,
      amount: Number(poData.amount) || 0,
      status: poData.status || 'Completed',
      itemsCount: poData.items ? poData.items.length : 1,
      items: poData.items || []
    };

    // 2. If status is Completed, immediately replenish or create products in Inventory!
    if (newPo.status === 'Completed' && poData.items && poData.items.length > 0) {
      setProducts(prev => {
        let updated = [...prev];

        poData.items.forEach(item => {
          const existingIdx = updated.findIndex(p =>
            (item.productId && p.id === Number(item.productId)) ||
            (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
          );

          if (existingIdx >= 0) {
            const existing = updated[existingIdx];
            const newStock = existing.stock + Number(item.qty);
            const status = newStock <= 0 ? 'Out of Stock' : (newStock <= existing.minStock ? 'Low Stock' : 'In Stock');
            updated[existingIdx] = {
              ...existing,
              stock: newStock,
              costPrice: Number(item.cost) || existing.costPrice,
              status
            };
          } else {
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
      status: suppData.status || 'Active',
      name: String(suppData.name || '').trim(),
      contactPerson: String(suppData.contactPerson || '').trim(),
      email: String(suppData.email || '').trim(),
      phone: String(suppData.phone || '').trim(),
      address: String(suppData.address || '').trim()
    };
    setSuppliers(prev => [newSupp, ...prev]);
    addAuditLog('Supplier Added', `Added supplier ${newSupp.name}`);
    showToast('Supplier Added', `${newSupp.name} registered successfully.`);
    return newSupp;
  };

  const updateSupplier = (id, suppData) => {
    setSuppliers(prev => prev.map(s => s.id === Number(id) ? {
      ...s,
      ...suppData,
      name: String(suppData.name || s.name).trim(),
      contactPerson: String(suppData.contactPerson ?? s.contactPerson).trim(),
      email: String(suppData.email || s.email).trim(),
      phone: String(suppData.phone || s.phone).trim(),
      address: String(suppData.address ?? s.address).trim()
    } : s));
    addAuditLog('Supplier Updated', `Updated supplier #${id}`);
    showToast('Supplier Updated', 'Supplier details saved.');
  };

  const deleteSupplier = (id) => {
    const s = suppliers.find(item => item.id === Number(id));
    setSuppliers(prev => prev.filter(item => item.id !== Number(id)));
    addAuditLog('Supplier Deleted', `Removed ${s?.name || 'Supplier'}`);
    showToast('Supplier Removed', 'Supplier deleted from directory.', 'warning');
  };

  // Security Sessions
  const revokeSession = (id) => {
    setSessions(prev => prev.filter(s => String(s.id) !== String(id)));
    addAuditLog('Session Revoked', `Terminated session ID ${id}`);
    showToast('Session Revoked', 'The device session has been signed out.', 'warning');
  };

  const revokeAllOtherSessions = () => {
    setSessions(prev => prev.filter(s => s.current));
    addAuditLog('All Sessions Revoked', 'Terminated all remote device sessions');
    showToast('Sessions Terminated', 'All other active device sessions have been revoked.', 'warning');
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

  // Reset demo database to pristine seeds
  const resetAllData = () => {
    setProducts(INITIAL_PRODUCTS);
    setCategories([]);
    setSales(INITIAL_SALES);
    setPurchases(INITIAL_PURCHASES);
    setSuppliers(INITIAL_SUPPLIERS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSessions(INITIAL_SESSIONS);

    localStorage.removeItem('iq_v3_products');
    localStorage.removeItem('iq_v3_categories');
    localStorage.removeItem('iq_v3_sales');
    localStorage.removeItem('iq_v3_purchases');
    localStorage.removeItem('iq_v3_suppliers');
    localStorage.removeItem('iq_v3_customers');
    localStorage.removeItem('iq_v3_auditLogs');
    localStorage.removeItem('iq_v3_sessions');

    showToast('Demo Data Restored', 'Pristine demo inventory catalog and records have been restored.', 'success');
  };

  // Calculated Dashboard Stats
  const totalSalesVal = sales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const totalReceivedVal = sales.reduce((acc, s) => {
    const paid = s.paidAmount !== undefined
      ? Number(s.paidAmount) || 0
      : (s.status === 'Completed' || s.status === 'Paid' ? Number(s.amount) || 0 : 0);
    return acc + paid;
  }, 0);
  const totalDueVal = sales.reduce((acc, s) => {
    if (s.dueAmount !== undefined) return acc + (Number(s.dueAmount) || 0);
    const paid = s.status === 'Completed' || s.status === 'Paid' ? Number(s.amount) || 0 : 0;
    return acc + Math.max(0, (Number(s.amount) || 0) - paid);
  }, 0);
  const totalPurchasesVal = purchases.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalProfit = Math.max(0, totalSalesVal - totalPurchasesVal);
  const lowStockItems = products.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock');

  const stats = {
    totalProducts: products.length,
    totalSales: totalSalesVal,
    totalReceived: totalReceivedVal,
    totalDue: totalDueVal,
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
    sessions,
    setSessions,
    auditLogs,
    user,
    setUser,
    users,
    login,
    register,
    logout,
    resetTargetEmail,
    setResetTargetEmail,
    requestPasswordReset,
    resetPassword,
    changePassword,
    updateUserProfile,
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
    recordPayment,
    createPurchase,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    revokeSession,
    revokeAllOtherSessions,
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
