import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';

export const Topbar = () => {
  const {
    user,
    setCurrentPage,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    setIsGlobalSearchOpen,
    lowStockItems,
    setIsAuthenticated,
    showToast,
    theme,
    toggleTheme
  } = useInventory();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Low Stock Alert', desc: `${lowStockItems.length} products below minimum threshold.`, time: '10m ago', unread: true },
    { id: 2, title: 'Purchase Delivered', desc: 'PO #P-2045 from ABC Traders restocked.', time: '1h ago', unread: true },
    { id: 3, title: 'High Value Sale', desc: 'Sale #S-1040 for ₹4,320 completed.', time: '3h ago', unread: false }
  ]);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const createRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (createRef.current && !createRef.current.contains(e.target)) {
        setCreateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsGlobalSearchOpen]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    showToast('Notifications', 'All notifications marked as read.', 'info');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('login');
    showToast('Signed Out', 'You have been logged out.', 'info');
  };

  const handleToggleSidebar = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="iq-topbar">
      <div className="topbar-left">
        {/* Navigation Drawer Toggle (Mobiles and Small Devices Only) */}
        <button
          type="button"
          id="sidebarToggleBtn"
          className="sidebar-toggle-btn d-lg-none"
          onClick={handleToggleSidebar}
          aria-label="Toggle navigation menu"
          title="Toggle menu"
        >
          <i className="bi bi-list"></i>
        </button>

        {/* Global Search Bar (Desktop & Tablet) */}
        <div
          className="topbar-search-box d-none d-md-flex cursor-pointer"
          onClick={() => setIsGlobalSearchOpen(true)}
          title="Search anything (Ctrl+K)"
          style={{ cursor: 'pointer' }}
        >
          <i className="bi bi-search topbar-search-icon"></i>
          <input
            type="text"
            readOnly
            className="topbar-search-input cursor-pointer"
            placeholder="Search anything... (Products, Sales, Contacts)"
            style={{ cursor: 'pointer' }}
          />
          <kbd className="topbar-search-kbd">Ctrl+K</kbd>
        </div>

        {/* Mobile Search Button (Phone) */}
        <button
          type="button"
          className="topbar-btn d-flex d-md-none"
          onClick={() => setIsGlobalSearchOpen(true)}
          aria-label="Search"
          title="Search"
        >
          <i className="bi bi-search"></i>
        </button>
      </div>

      <div className="topbar-right">
        {/* Theme Toggle (Light / Dark) */}
        <button
          type="button"
          className="topbar-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-gold' : 'bi-moon-stars-fill'}`}></i>
        </button>

        {/* Quick Create Dropdown */}
        <div className="position-relative" ref={createRef}>
          <button
            type="button"
            className="btn btn-gold btn-sm d-flex align-items-center gap-1"
            onClick={() => setCreateOpen(!createOpen)}
          >
            <i className="bi bi-plus-lg"></i>
            <span className="d-none d-sm-inline">Create</span>
          </button>

          {createOpen && (
            <div className="dropdown-menu-iq position-absolute end-0 mt-2 shadow-lg" style={{ minWidth: 200, zIndex: 1050 }}>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('sales'); setCreateOpen(false); }}
              >
                <i className="bi bi-receipt"></i> New Sale
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('purchases'); setCreateOpen(false); }}
              >
                <i className="bi bi-cart-plus"></i> New Purchase Order
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('inventory'); setCreateOpen(false); }}
              >
                <i className="bi bi-box"></i> Add Product
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('customers'); setCreateOpen(false); }}
              >
                <i className="bi bi-person-plus"></i> Add Customer
              </button>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="position-relative" ref={notifRef}>
          <button
            type="button"
            id="notifDropdownBtn"
            className="topbar-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            <i className="bi bi-bell"></i>
            {unreadCount > 0 && <span className="notification-badge"></span>}
          </button>

          {notificationsOpen && (
            <div
              className="dropdown-menu-iq position-absolute end-0 mt-2 p-0 shadow-lg"
              style={{ width: 'min(320px, calc(100vw - 24px))', zIndex: 1050 }}
            >
              <div className="p-3 border-bottom border-dark d-flex align-items-center justify-content-between">
                <span className="fw-semibold text-white">Notifications</span>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-gold text-decoration-none"
                  onClick={markAllRead}
                  style={{ color: 'var(--primary-accent)', fontSize: '0.75rem' }}
                >
                  Mark all read
                </button>
              </div>
              <div className="p-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.map(item => (
                  <div
                    key={item.id}
                    className={`d-flex align-items-start gap-2 p-2 rounded mb-1 ${item.unread ? 'bg-hover' : ''}`}
                  >
                    <i className="bi bi-exclamation-triangle-fill mt-1" style={{ color: 'var(--primary-accent)' }}></i>
                    <div>
                      <div className="text-white" style={{ fontSize: '0.85rem' }}><strong>{item.title}</strong></div>
                      <small className="text-secondary d-block" style={{ fontSize: '0.75rem' }}>{item.desc}</small>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Capsule */}
        <div className="position-relative" ref={profileRef}>
          <div
            className="user-capsule"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="user-avatar">AG</div>
            <div className="user-info-text d-none d-sm-flex">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <i className="bi bi-chevron-down text-muted small ms-1"></i>
          </div>

          {profileOpen && (
            <div
              className="dropdown-menu-iq position-absolute end-0 mt-2 shadow-lg"
              style={{ minWidth: 'min(220px, calc(100vw - 24px))', zIndex: 1050 }}
            >
              <div className="px-3 py-2 border-bottom border-secondary mb-1">
                <div className="fw-semibold text-white">{user.name}</div>
                <small className="text-secondary">{user.email}</small>
              </div>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('profile'); setProfileOpen(false); }}
              >
                <i className="bi bi-person"></i> My Profile
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('settings'); setProfileOpen(false); }}
              >
                <i className="bi bi-gear"></i> Settings
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('security'); setProfileOpen(false); }}
              >
                <i className="bi bi-shield-check"></i> Security Center
              </button>
              <div className="dropdown-divider-iq"></div>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start text-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right text-danger"></i> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
