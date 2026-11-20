import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

// Modular Services
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { salesService } from '../services/salesService';
import { purchaseService } from '../services/purchaseService';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { paymentService } from '../services/paymentService';
import { inventoryService } from '../services/inventoryService';
import { analyticsService } from '../services/analyticsService';
import { exportService } from '../services/exportService';
import { importService } from '../services/importService';
import { backupService } from '../services/backupService';
import { syncChannel } from '../services/syncChannel';
import { checkDatabaseHealth } from '../database/db';
import { licenseService } from '../services/licenseService';

const InventoryContext = createContext();

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

export const InventoryProvider = ({ children }) => {
  // --------------------------------------------------------------------------
  // AUTHENTICATION & SESSION STATE
  // --------------------------------------------------------------------------
  const [users, setUsers] = useState(() => authService.getStoredUsers());
  const initialSession = authService.getStoredSession();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialSession));
  const [user, setUser] = useState(initialSession ? initialSession.user : null);
  const [prefillEmail, setPrefillEmail] = useState('');
  const [resetTargetEmail, setResetTargetEmail] = useState('');
  const [demoResetSession, setDemoResetSession] = useState(null);
  const [sessions, setSessions] = useState(() => []);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isNewDevice, setIsNewDevice] = useState(false);

  const currentShopId = user?.organizationId || user?.shopId || 'default_shop';
  const licenseStatus = licenseService.getLicenseStatus(user);

  // Fetch real sessions on mount and when authenticated user changes
  useEffect(() => {
    let isMounted = true;
    if (user) {
      authService.getSessions(user).then(sessList => {
        if (isMounted && Array.isArray(sessList)) {
          setSessions(sessList);
        }
      }).catch(err => console.warn('Sessions load notice:', err));
    } else {
      setSessions([]);
    }
    return () => { isMounted = false; };
  }, [user]);

  // --------------------------------------------------------------------------
  // CENTRAL DATA COLLECTIONS (IndexedDB Backed)
  // --------------------------------------------------------------------------
  const [categories, setCategories] = useState(() => storageService.getCollection('CATEGORIES', []));
  const [products, setProducts] = useState(() => storageService.getCollection('PRODUCTS', INITIAL_PRODUCTS));
  const [sales, setSales] = useState(() => storageService.getCollection('SALES', INITIAL_SALES));
  const [purchases, setPurchases] = useState(() => storageService.getCollection('PURCHASES', INITIAL_PURCHASES));
  const [suppliers, setSuppliers] = useState(() => storageService.getCollection('SUPPLIERS', INITIAL_SUPPLIERS));
  const [customers, setCustomers] = useState(() => storageService.getCollection('CUSTOMERS', []));
  const [auditLogs, setAuditLogs] = useState(() => storageService.getCollection('AUDIT_LOGS', INITIAL_AUDIT_LOGS));

  // Initialize IndexedDB for authenticated shop & check new device status
  useEffect(() => {
    let isMounted = true;
    const shopId = user?.organizationId || user?.shopId || 'default_shop';

    storageService.initShop(shopId).then(() => {
      if (isMounted) {
        const loadedProds = productService.getAll();
        const loadedSales = salesService.getAll();
        const loadedPurchases = purchaseService.getAll();
        const loadedSuppliers = supplierService.getAll();
        const loadedCustomers = customerService.getAll();
        const loadedCats = storageService.getCollection('CATEGORIES', []);
        const loadedAudit = storageService.getCollection('AUDIT_LOGS', []);

        setProducts(loadedProds);
        setSales(loadedSales);
        setPurchases(loadedPurchases);
        setSuppliers(loadedSuppliers);
        setCustomers(loadedCustomers);
        setCategories(loadedCats);
        setAuditLogs(loadedAudit);

        // Detect fresh new device (Section 30)
        const lastBackup = backupService.getLastBackupInfo(shopId);
        if (loadedProds.length === 0 && loadedSales.length === 0 && !lastBackup && isAuthenticated) {
          setIsNewDevice(true);
        }
      }
    });

    return () => { isMounted = false; };
  }, [user, isAuthenticated]);

  // Multi-tab synchronization via BroadcastChannel (Section 38)
  useEffect(() => {
    const unsubscribe = syncChannel.subscribe((msg) => {
      if (!msg) return;
      setProducts(productService.getAll());
      setSales(salesService.getAll());
      setPurchases(purchaseService.getAll());
      setSuppliers(supplierService.getAll());
      setCustomers(customerService.getAll());
      setCategories(storageService.getCollection('CATEGORIES', []));
      setAuditLogs(storageService.getCollection('AUDIT_LOGS', []));
    });
    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // UI & NAVIGATION SHELL STATE
  // --------------------------------------------------------------------------
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Theme Management
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

  // Toast Notifications
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((title, message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Global Confirmation Dialog
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmVariant: 'danger',
    onConfirm: () => { }
  });

  const openConfirm = useCallback(({
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
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Audit Logger
  const addAuditLog = useCallback((action, details = '', status = 'Success', customUser = null, customRole = null) => {
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
      status,
      createdAt: now.toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [user]);

  // --------------------------------------------------------------------------
  // AUTHENTICATION OPERATIONS (Delegated to authService)
  // --------------------------------------------------------------------------
  const login = async ({ email, password, rememberMe = true }) => {
    const result = await authService.login({ email, password, rememberMe });
    if (!result.success) {
      showToast('Authentication Failed', result.message, 'danger');
      return result;
    }

    // MFA Challenge required (TOTP 2FA)
    if (result.requiresMFA) {
      showToast('2FA Challenge', 'Please enter your 6-digit authenticator code to complete login.', 'info');
      return result;
    }

    setUser(result.user);
    setIsAuthenticated(true);
    setPrefillEmail('');
    setCurrentPage('dashboard');

    try {
      const activeSess = await authService.getSessions(result.user);
      setSessions(activeSess);
    } catch (e) {
      console.warn('Session retrieval notice:', e);
    }

    addAuditLog('User Login', `User ${result.user.name} signed in successfully`, 'Success', result.user.name, result.user.role);
    showToast('Welcome Back!', `Logged in as ${result.user.name} (${result.user.role || 'Admin'}).`);
    return result;
  };

  const verifyLoginMFA = async ({ factorId, code }) => {
    const result = await authService.verifyLoginMFA({ factorId, code });
    if (!result.success) {
      showToast('MFA Verification Failed', result.message || 'Invalid 6-digit TOTP code.', 'danger');
      return result;
    }

    setUser(result.user);
    setIsAuthenticated(true);
    setPrefillEmail('');
    setCurrentPage('dashboard');

    try {
      const activeSess = await authService.getSessions(result.user);
      setSessions(activeSess);
    } catch (e) {
      console.warn('Session retrieval notice:', e);
    }

    addAuditLog('MFA Verification', `User ${result.user.name} successfully verified 2FA TOTP challenge`, 'Success', result.user.name, result.user.role);
    showToast('Identity Verified', `Welcome back, ${result.user.name}!`);
    return result;
  };

  const register = async (userData) => {
    const result = await authService.register(userData);
    if (!result.success) {
      showToast('Registration Error', result.message, 'danger');
      return result;
    }

    setUsers(authService.getStoredUsers());
    addAuditLog('User Registered', `New tenant registered: ${result.user.name} (${result.user.email}) - PBKDF2 hashed`, 'Success', result.user.name, result.user.role);

    if (result.requiresEmailConfirmation) {
      showToast('Confirmation Required', 'Account created! Please check your email to confirm registration before logging in.', 'info');
    } else {
      showToast('Registration Successful!', 'Your account has been registered. Please sign in with your credentials.', 'success');
    }

    setPrefillEmail(result.user.email);
    setCurrentPage('login');
    return result;
  };

  const requestPasswordReset = async (email) => {
    const result = await authService.requestPasswordReset(email);
    if (!result.success) {
      showToast('Account Not Found', result.message, 'danger');
      return result;
    }

    if (result.session) {
      setDemoResetSession(result.session);
      setResetTargetEmail(email.trim().toLowerCase());
      addAuditLog('Password Reset Requested', `Simulated recovery link initiated for ${email}`);
      showToast('Recovery Link Generated', 'Demo mode: Password recovery is simulated. No email has been sent.', 'info');
    } else {
      addAuditLog('Password Reset Email', `Sent recovery link to ${email}`);
      showToast('Recovery Email Sent', result.message || 'Please check your email for the reset link.', 'info');
    }
    return result;
  };

  const resetPassword = async ({ newPassword, confirmPassword }) => {
    const result = await authService.resetPassword({
      newPassword,
      confirmPassword,
      demoResetSession
    });

    if (!result.success) {
      showToast('Reset Failed', result.message, 'danger');
      return result;
    }

    setUsers(authService.getStoredUsers());
    if (user && user.email.toLowerCase() === (result.targetEmail || '').toLowerCase()) {
      setIsAuthenticated(false);
      setUser(null);
    }

    setDemoResetSession(null);
    setResetTargetEmail('');
    setPrefillEmail(result.targetEmail || '');
    addAuditLog('Password Reset Completed', `Password updated for ${result.targetEmail || 'account'}`);
    showToast('Password Updated', 'Your password has been successfully reset! Please sign in with your new password.', 'success');
    setCurrentPage('login');
    return result;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    const result = await authService.changePassword({ user, currentPassword, newPassword });
    if (!result.success) {
      showToast('Verification Failed', result.message, 'danger');
      return result;
    }

    setUsers(authService.getStoredUsers());
    addAuditLog('Password Changed', `User ${user.name} changed their account master password`);
    showToast('Password Changed', 'Your master account password has been updated.', 'success');
    return result;
  };

  const updateUserProfile = (profileData) => {
    const updated = authService.updateUserProfile(user, profileData);
    setUser(updated);
    setUsers(authService.getStoredUsers());
    addAuditLog('Profile Updated', `Updated profile settings for ${updated.name}`);
    showToast('Profile Saved', 'Profile settings updated successfully.', 'success');
    return updated;
  };

  const logout = async () => {
    if (user) {
      addAuditLog('User Logout', `User ${user.name} logged out`);
    }
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setSessions([]);
    setDemoResetSession(null);
    setCurrentPage('login');
    showToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  const revokeSession = async (id) => {
    const res = await authService.revokeSession(id);
    if (res.success) {
      setSessions(prev => prev.filter(s => String(s.id) !== String(id)));
      addAuditLog('Session Revoked', `Terminated session ID ${id}`);
      showToast('Session Revoked', 'The device session has been signed out.', 'warning');
    } else {
      showToast('Revocation Error', res.message || 'Unable to revoke device session.', 'danger');
    }
  };

  const revokeAllOtherSessions = async () => {
    const currentSess = sessions.find(s => s.current);
    const res = await authService.revokeAllOtherSessions(currentSess?.id);
    if (res.success) {
      setSessions(prev => prev.filter(s => s.current));
      addAuditLog('All Sessions Revoked', 'Terminated all remote device sessions');
      showToast('Sessions Terminated', 'All other active device sessions have been revoked.', 'warning');
    } else {
      showToast('Revocation Error', res.message || 'Unable to revoke other sessions.', 'danger');
    }
  };

  // --------------------------------------------------------------------------
  // CATEGORY OPERATIONS (categoryService)
  // --------------------------------------------------------------------------
  const addCategory = (categoryName) => {
    const res = categoryService.addCategory(categoryName);
    if (res.success) {
      setCategories(res.categories);
    }
    return res;
  };

  // --------------------------------------------------------------------------
  // PRODUCT OPERATIONS (productService)
  // --------------------------------------------------------------------------
  const addProduct = (prodData) => {
    if (prodData.category && String(prodData.category).trim()) {
      addCategory(String(prodData.category).trim());
    }

    const res = productService.addProduct(prodData);
    if (!res.success) {
      showToast('Validation Error', res.errors.join(' '), 'danger');
      return null;
    }

    setProducts(productService.getAll());
    addAuditLog('Product Added', `Added ${res.product.name} (${res.product.sku})`);
    showToast('Product Added', `"${res.product.name}" added to inventory.`);
    return res.product;
  };

  const updateProduct = (id, prodData) => {
    if (prodData.category && String(prodData.category).trim()) {
      addCategory(String(prodData.category).trim());
    }

    const res = productService.updateProduct(id, prodData);
    if (!res.success) {
      showToast('Validation Error', res.errors.join(' '), 'danger');
      return null;
    }

    setProducts(productService.getAll());
    addAuditLog('Product Updated', `Updated product #${id}`);
    showToast('Product Updated', 'Product changes saved successfully.');
    return res.product;
  };

  const deleteProduct = (id) => {
    const p = products.find(item => String(item.id) === String(id));
    const res = productService.deleteProduct(id);
    if (res.success) {
      setProducts(productService.getAll());
      addAuditLog('Product Deleted', `Removed ${p?.name || 'Product'} (${p?.sku || id})`);
      showToast('Product Deleted', 'The product has been removed from catalog.', 'warning');
    }
  };

  // --------------------------------------------------------------------------
  // SALES & PAYMENT OPERATIONS (salesService & paymentService)
  // --------------------------------------------------------------------------
  const createSale = (saleData) => {
    if (isProcessingSale) {
      showToast('Processing', 'A sale transaction is already processing. Please wait...', 'warning');
      return null;
    }

    setIsProcessingSale(true);
    try {
      const res = salesService.createSale(saleData, user?.name || 'Admin', currentShopId);
      if (!res.success) {
        showToast('Sale Failed', (res.errors || [res.message]).join(' '), 'danger');
        return null;
      }

      // Refresh state from storage
      setProducts(productService.getAll());
      setSales(salesService.getAll());
      setCustomers(customerService.getAll());

      const { sale } = res;
      addAuditLog(
        'Sale Created',
        `Sale #${sale.id} (${sale.customerName}) – Billed ₹${Number(sale.amount).toLocaleString('en-IN')}, Received ₹${Number(sale.paidAmount).toLocaleString('en-IN')}${Number(sale.dueAmount) > 0 ? `, Due ₹${Number(sale.dueAmount).toLocaleString('en-IN')}` : ''}`
      );
      showToast('Sale Completed', `Invoice #${sale.id} generated. Status: ${sale.status}.`);

      // Broadcast to other open tabs
      syncChannel.broadcast('SALE_COMPLETED', { saleId: sale.id });

      return sale;
    } finally {
      setIsProcessingSale(false);
    }
  };

  const cancelSale = (saleId, reason = 'Invoice Cancelled') => {
    const res = salesService.cancelSale(saleId, reason, user?.name || 'Admin');
    if (!res.success) {
      showToast('Cancellation Error', res.message, 'danger');
      return res;
    }

    setSales(salesService.getAll());
    setProducts(productService.getAll());
    setCustomers(customerService.getAll());

    addAuditLog('Sale Cancelled', `Cancelled invoice #${saleId} (Reason: ${reason})`);
    showToast('Sale Cancelled', `Invoice #${saleId} cancelled and inventory restored.`, 'warning');

    syncChannel.broadcast('SALE_CANCELLED', { saleId });
    return res;
  };

  const recordPayment = ({ saleId, customerName, paymentAmount, paymentMethod = 'UPI', note = '' }) => {
    const res = paymentService.recordPayment({
      saleId,
      customerName,
      amount: paymentAmount,
      paymentMethod,
      note,
      user: user?.name || 'Admin'
    });

    if (!res.success) {
      showToast('Payment Error', res.message, 'danger');
      return res;
    }

    // Refresh sales & customers
    setSales(salesService.getAll());
    setCustomers(customerService.getAll());

    const targetLabel = saleId ? `Invoice #${saleId}` : `Client "${customerName}"`;
    addAuditLog('Payment Received', `Collected ₹${Number(paymentAmount).toLocaleString('en-IN')} via ${paymentMethod} for ${targetLabel}`);
    showToast('Payment Collected', `Successfully recorded ₹${Number(paymentAmount).toLocaleString('en-IN')} via ${paymentMethod} for ${targetLabel}.`, 'success');
    return res;
  };

  const refundPayment = ({ saleId, amount, reason = '', idempotencyKey = null }) => {
    const res = paymentService.refundPayment({
      saleId,
      amount,
      reason,
      user: user?.name || 'Admin',
      idempotencyKey
    });

    if (!res.success) {
      showToast('Refund Error', res.message, 'danger');
      return res;
    }

    setSales(salesService.getAll());
    setCustomers(customerService.getAll());

    addAuditLog('Payment Refunded', `Refunded ₹${Number(amount).toLocaleString('en-IN')} for Invoice #${saleId}`);
    showToast('Refund Processed', `Refunded ₹${Number(amount).toLocaleString('en-IN')} for Invoice #${saleId}.`, 'info');
    return res;
  };

  // --------------------------------------------------------------------------
  // PURCHASES & SUPPLIERS (purchaseService & supplierService)
  // --------------------------------------------------------------------------
  const createPurchase = (poData) => {
    const res = purchaseService.createPurchase(poData, user?.name || 'Admin');
    if (!res.success) {
      showToast('PO Failed', (res.errors || [res.message]).join(' '), 'danger');
      return null;
    }

    setPurchases(purchaseService.getAll());
    setProducts(productService.getAll());
    setSuppliers(supplierService.getAll());
    setCategories(categoryService.getCategories());

    const { purchase } = res;
    addAuditLog('Purchase Order Created', `Order #${purchase.id} placed with ${purchase.supplierName}`);
    showToast('Purchase Completed', `PO #${purchase.id} recorded, contact added/updated, and inventory stocked.`);

    syncChannel.broadcast('PURCHASE_COMPLETED', { poId: purchase.id });
    return purchase;
  };

  const receivePurchase = (purchaseId) => {
    const res = purchaseService.receivePurchase(purchaseId, user?.name || 'Admin');
    if (!res.success) {
      showToast('PO Receipt Error', res.message, 'warning');
      return res;
    }

    setPurchases(purchaseService.getAll());
    setProducts(productService.getAll());
    setSuppliers(supplierService.getAll());
    setCategories(categoryService.getCategories());

    addAuditLog('Purchase Received', `PO #${purchaseId} received and stocked.`);
    showToast('PO Received', `Order #${purchaseId} marked as Received. Stock added to catalog.`, 'success');

    syncChannel.broadcast('PURCHASE_RECEIVED', { poId: purchaseId });
    return res;
  };

  const addSupplier = (suppData) => {
    const res = supplierService.addSupplier(suppData);
    if (!res.success) {
      showToast('Validation Error', res.errors.join(' '), 'danger');
      return null;
    }
    setSuppliers(supplierService.getAll());
    addAuditLog('Supplier Added', `Added supplier ${res.supplier.name}`);
    showToast('Supplier Added', `${res.supplier.name} registered successfully.`);
    return res.supplier;
  };

  const updateSupplier = (id, suppData) => {
    const res = supplierService.updateSupplier(id, suppData);
    if (!res.success) {
      showToast('Validation Error', res.errors.join(' '), 'danger');
      return null;
    }
    setSuppliers(supplierService.getAll());
    addAuditLog('Supplier Updated', `Updated supplier #${id}`);
    showToast('Supplier Updated', 'Supplier details saved.');
    return res.supplier;
  };

  const deleteSupplier = (id) => {
    const s = suppliers.find(item => String(item.id) === String(id));
    const res = supplierService.deleteSupplier(id);
    if (!res.success) {
      showToast('Cannot Remove Supplier', res.message, 'warning');
      return;
    }
    setSuppliers(supplierService.getAll());
    addAuditLog('Supplier Deleted', `Removed ${s?.name || 'Supplier'}`);
    showToast('Supplier Removed', 'Supplier deleted from directory.', 'warning');
  };

  // --------------------------------------------------------------------------
  // LOCAL-FIRST BACKUP, VERIFICATION & RESTORE (backupService)
  // --------------------------------------------------------------------------
  const exportCSV = (filename, dataRows, headerNames, customTitle = null) => {
    const res = exportService.downloadCSV(filename, headerNames, dataRows, customTitle);
    if (!res.success) {
      showToast('Export Error', res.message, 'warning');
      return;
    }
    showToast('Export Complete', `${filename}.csv has been downloaded.`);
  };

  const exportBackup = async () => {
    try {
      const payload = await backupService.generateBackup(currentShopId);
      const fileInfo = backupService.downloadBackupFile(payload);
      addAuditLog('Backup Exported', `Generated full JSON backup for shop ${currentShopId}`);
      showToast('Backup Created', `Backup file ${fileInfo.filename} downloaded and verified.`, 'success');
      return { success: true, payload, fileInfo };
    } catch (err) {
      showToast('Backup Failed', err.message, 'danger');
      return { success: false, error: err.message };
    }
  };

  const validateBackup = async (fileContent) => {
    return backupService.validateBackupFile(fileContent, currentShopId);
  };

  const restoreBackup = async (backupPayload, options = { replace: true }) => {
    try {
      const res = await backupService.restoreBackup(currentShopId, backupPayload, options);
      // Re-hydrate local collections
      await storageService.initShop(currentShopId);
      setProducts(productService.getAll());
      setSales(salesService.getAll());
      setPurchases(purchaseService.getAll());
      setSuppliers(supplierService.getAll());
      setCustomers(customerService.getAll());
      setCategories(storageService.getCollection('CATEGORIES', []));
      setAuditLogs(storageService.getCollection('AUDIT_LOGS', []));

      addAuditLog('Backup Restored', `Restored database from archive (${backupPayload.exportedAt || 'backup'})`);
      showToast('Backup Restored', 'Business data restored into local IndexedDB successfully.', 'success');
      return res;
    } catch (err) {
      showToast('Restore Failed', err.message, 'danger');
      return { success: false, error: err.message };
    }
  };

  const clearLocalData = async (confirmationText) => {
    try {
      await backupService.clearLocalData(currentShopId, confirmationText);
      await storageService.initShop(currentShopId);
      setProducts([]);
      setSales([]);
      setPurchases([]);
      setSuppliers([]);
      setCustomers([]);
      setCategories([]);
      setAuditLogs([]);

      addAuditLog('Database Reset', `Cleared all local data for shop ${currentShopId}`);
      showToast('Data Cleared', 'All local business records have been removed.', 'warning');
      return { success: true };
    } catch (err) {
      showToast('Clear Failed', err.message, 'danger');
      return { success: false, error: err.message };
    }
  };

  const resetAllData = () => {
    // Section 41: REMOVE OR DISABLE in production
    if (import.meta.env.PROD) {
      showToast('Feature Disabled', 'Demo database restoration is disabled in production to protect real commercial data.', 'warning');
      return;
    }

    storageService.resetAll({
      products: INITIAL_PRODUCTS,
      categories: [],
      sales: INITIAL_SALES,
      purchases: INITIAL_PURCHASES,
      suppliers: INITIAL_SUPPLIERS,
      auditLogs: INITIAL_AUDIT_LOGS,
      sessions: INITIAL_SESSIONS
    });

    setProducts(INITIAL_PRODUCTS);
    setCategories([]);
    setSales(INITIAL_SALES);
    setPurchases(INITIAL_PURCHASES);
    setSuppliers(INITIAL_SUPPLIERS);
    setCustomers([]);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSessions(INITIAL_SESSIONS);

    showToast('Demo Data Restored', 'Pristine demo inventory catalog and records have been restored.', 'success');
  };

  // --------------------------------------------------------------------------
  // LIVE COMPUTED KPIS (analyticsService)
  // --------------------------------------------------------------------------
  const stats = analyticsService.getKPIs();
  const lowStockItems = products.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock');

  const value = {
    // Categories
    categories,
    setCategories,
    addCategory,

    // Products
    products,
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    lowStockItems,

    // Sales & Payments
    sales,
    setSales,
    createSale,
    cancelSale,
    recordPayment,
    refundPayment,
    isProcessingSale,

    // Purchases & Suppliers
    purchases,
    setPurchases,
    createPurchase,
    receivePurchase,
    suppliers,
    setSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,

    // Customers
    customers,
    setCustomers,

    // Sessions & Security
    sessions,
    setSessions,
    revokeSession,
    revokeAllOtherSessions,
    auditLogs,

    // Auth & Licensing
    user,
    setUser,
    users,
    getStoredUsers: () => authService.getStoredUsers(),
    getStoredSession: () => authService.getStoredSession(),
    prefillEmail,
    setPrefillEmail,
    demoResetSession,
    setDemoResetSession,
    login,
    verifyLoginMFA,
    register,
    logout,
    resetTargetEmail,
    setResetTargetEmail,
    requestPasswordReset,
    resetPassword,
    changePassword,
    updateUserProfile,
    isAuthenticated,
    setIsAuthenticated,
    shopId: currentShopId,
    licenseStatus,
    isNewDevice,
    dismissNewDevicePrompt: () => setIsNewDevice(false),

    // UI & Shell
    currentPage,
    setCurrentPage,
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

    // Exporter, IndexedDB & Backup
    exportCSV,
    exportBackup,
    validateBackup,
    restoreBackup,
    clearLocalData,
    getLastBackupInfo: () => backupService.getLastBackupInfo(currentShopId),
    checkDatabaseHealth: () => checkDatabaseHealth(currentShopId),
    resetAllData,

    // Live Metrics
    stats,

    // Theme
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
