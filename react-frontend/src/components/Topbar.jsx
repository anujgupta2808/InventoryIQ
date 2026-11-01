import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

export const Topbar = () => {
  const {
    user,
    sales,
    purchases,
    setCurrentPage,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    setIsGlobalSearchOpen,
    lowStockItems,
    logout,
    showToast,
    theme,
    toggleTheme
  } = useInventory();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const notifications = useMemo(() => {
    const list = [];
    if (lowStockItems && lowStockItems.length > 0) {
      list.push({
        id: 'notif-stock',
        title: 'Low Stock Alert',
        desc: `${lowStockItems.length} product${lowStockItems.length > 1 ? 's' : ''} below safety threshold.`,
        time: 'Just now',
        unread: true
      });
    }
    if (sales && sales.length > 0) {
      const s = sales[0];
      list.push({
        id: `notif-${s.id}`,
        title: 'Sale Created',
        desc: `Invoice #${s.id} for ₹${Number(s.amount).toLocaleString('en-IN')}`,
        time: s.date || 'Recent',
        unread: false
      });
    }
    if (purchases && purchases.length > 0) {
      const p = purchases[0];
      list.push({
        id: `notif-${p.id}`,
        title: 'Purchase Order Logged',
        desc: `Order #${p.id} placed with ${p.supplierName}`,
        time: p.date || 'Recent',
        unread: false
      });
    }
    return list;
  }, [lowStockItems, sales, purchases]);

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

  const [readNotifIds, setReadNotifIds] = useState([]);

  const markAllRead = () => {
    setReadNotifIds(notifications.map(n => n.id));
    showToast('Notifications', 'All notifications marked as read.', 'info');
  };

  const handleLogout = () => {
    logout();
  };

  const handleToggleSidebar = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const unreadCount = notifications.filter(n => n.unread && !readNotifIds.includes(n.id)).length;

  return (
    <header className="iq-topbar">
      <div className="topbar-left">
        {/* Navigation Drawer Toggle (Mobiles Only - Strictly Hidden on Desktop & Tablet) */}
        <button
          type="button"
          id="sidebarToggleBtn"
          className="sidebar-toggle-btn d-md-none"
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
            placeholder="Search anything..."
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
            title="Quick Create"
          >
            <i className="bi bi-plus-lg"></i>
            <span className="d-none d-md-inline">Create</span>
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
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-secondary small">
                    <i className="bi bi-bell-slash fs-4 d-block mb-1 text-muted"></i>
                    No new notifications
                  </div>
                ) : (
                  notifications.map(item => {
                    const isUnread = item.unread && !readNotifIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`d-flex align-items-start gap-2 p-2 rounded mb-1 ${isUnread ? 'bg-hover' : ''}`}
                      >
                        <i className="bi bi-exclamation-triangle-fill mt-1" style={{ color: 'var(--primary-accent)' }}></i>
                        <div>
                          <div className="text-white" style={{ fontSize: '0.85rem' }}><strong>{item.title}</strong></div>
                          <small className="text-secondary d-block" style={{ fontSize: '0.75rem' }}>{item.desc}</small>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{item.time}</div>
                        </div>
                      </div>
                    );
                  })
                )}
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
            <div className="user-avatar">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'IQ'}
            </div>
            <div className="user-info-text d-none d-sm-flex">
              <span className="user-name">{user?.name || 'Admin'}</span>
              <span className="user-role">{user?.role || 'User'}</span>
            </div>
            <i className="bi bi-chevron-down text-muted small ms-1"></i>
          </div>

          {profileOpen && (
            <div
              className="dropdown-menu-iq position-absolute end-0 mt-2 shadow-lg"
              style={{ minWidth: 'min(220px, calc(100vw - 24px))', zIndex: 1050 }}
            >
              <div className="px-3 py-2 border-bottom border-secondary mb-1">
                <div className="fw-semibold text-white">{user?.name || 'User'}</div>
                <small className="text-secondary">{user?.email || ''}</small>
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
