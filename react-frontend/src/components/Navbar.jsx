import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

export const Navbar = () => {
  const {
    user,
    sales,
    purchases,
    stats,
    currentPage,
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
  const [readNotifIds, setReadNotifIds] = useState([]);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const createRef = useRef(null);

  // Close dropdowns on click outside
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

  // Keyboard shortcut Ctrl+K / Cmd+K
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

  // Notifications generation with Party Dues alerts
  const notifications = useMemo(() => {
    const list = [];

    // Pending dues alert
    if (stats?.totalDue > 0) {
      list.push({
        id: 'notif-dues',
        title: 'Outstanding Client Dues',
        desc: `₹${stats.totalDue.toLocaleString('en-IN')} pending collection across client accounts.`,
        time: 'Active',
        unread: true,
        type: 'warning'
      });
    }

    // Low stock alerts
    if (lowStockItems && lowStockItems.length > 0) {
      list.push({
        id: 'notif-stock',
        title: 'Low Stock Alert',
        desc: `${lowStockItems.length} product${lowStockItems.length > 1 ? 's' : ''} require immediate reordering.`,
        time: 'Just now',
        unread: true,
        type: 'danger'
      });
    }

    // Recent sale
    if (sales && sales.length > 0) {
      const s = sales[0];
      list.push({
        id: `notif-${s.id}`,
        title: 'Recent Sale Invoice',
        desc: `Invoice #${s.id} for ${s.customerName || 'Client'} (₹${Number(s.amount).toLocaleString('en-IN')})`,
        time: s.date || 'Recent',
        unread: false,
        type: 'info'
      });
    }

    // Recent purchase
    if (purchases && purchases.length > 0) {
      const p = purchases[0];
      list.push({
        id: `notif-${p.id}`,
        title: 'Purchase Order Logged',
        desc: `PO #${p.id} placed with ${p.supplierName}`,
        time: p.date || 'Recent',
        unread: false,
        type: 'success'
      });
    }

    return list;
  }, [stats?.totalDue, lowStockItems, sales, purchases]);

  const unreadCount = notifications.filter(n => n.unread && !readNotifIds.includes(n.id)).length;

  const markAllRead = () => {
    setReadNotifIds(notifications.map(n => n.id));
    showToast('Notifications Cleared', 'All notifications marked as read.', 'info');
  };

  const handleLogout = () => {
    logout();
  };

  // Human-readable active page label
  const pageTitleMap = {
    dashboard: 'Dashboard',
    inventory: 'Inventory Catalog',
    sales: 'Sales & Invoices',
    ledger: 'Party Due & Client Ledger',
    purchases: 'Purchases & POs',
    analytics: 'Analytics & Insights',
    suppliers: 'Supplier Contacts',
    settings: 'Organization Settings',
    profile: 'User Profile',
    security: 'Security Center',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy'
  };

  return (
    <header className="iq-topbar iq-navbar">
      {/* 1. LEFT: Toggle, Organization Branding & Breadcrumb */}
      <div className="topbar-left d-flex align-items-center gap-2 gap-md-3">
        {/* Mobile Sidebar Toggle Button */}
        <button
          type="button"
          id="sidebarToggleBtn"
          className="sidebar-toggle-btn d-md-none"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label="Toggle navigation drawer"
          title="Toggle menu"
        >
          <i className="bi bi-list fs-5"></i>
        </button>

        {/* Desktop Sidebar Quick Collapse Toggle */}
        <button
          type="button"
          className="btn btn-sm btn-icon d-none d-md-flex align-items-center justify-content-center text-secondary border border-secondary rounded"
          style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.03)' }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <i className={`bi ${sidebarCollapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar'}`}></i>
        </button>

        {/* Organization / Tenant Identity Pill */}
        <div className="d-flex flex-column justify-content-center">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fw-bold text-white fs-6 d-flex align-items-center gap-1">
              <span className="d-none d-sm-inline">{user?.organizationName || user?.businessName || 'InventoryIQ'}</span>
              <span className="d-sm-none">{user?.organizationName ? user.organizationName.slice(0, 14) + '...' : 'InventoryIQ'}</span>
            </span>

            {user?.organizationType && (
              <span className="badge bg-secondary-dark text-gold border border-warning border-opacity-25 px-2 py-0 d-none d-lg-inline" style={{ fontSize: '0.72rem' }}>
                <i className="bi bi-building me-1"></i>{user.organizationType}
              </span>
            )}

            {user?.gstin && (
              <span className="badge bg-secondary-dark text-secondary border border-secondary px-2 py-0 d-none d-xl-inline" style={{ fontSize: '0.72rem' }}>
                <i className="bi bi-patch-check text-success me-1"></i>GSTIN: {user.gstin}
              </span>
            )}
          </div>

          {/* Current Page Breadcrumb */}
          <div className="d-flex align-items-center gap-1 text-secondary" style={{ fontSize: '0.75rem' }}>
            <span>Workspace</span>
            <i className="bi bi-chevron-right" style={{ fontSize: '0.65rem' }}></i>
            <span className="text-gold fw-medium">{pageTitleMap[currentPage] || 'Dashboard'}</span>
          </div>
        </div>
      </div>

      {/* 2. CENTER: Live Due Ticker & Global Search Trigger */}
      <div className="topbar-center d-none d-lg-flex align-items-center gap-3">
        {/* Party Due / Collections Live Indicators */}
        <div className="d-flex align-items-center gap-2">
          {/* Amount Received Pill */}
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 px-3 py-1 rounded-pill"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              fontSize: '0.78rem'
            }}
            onClick={() => setCurrentPage('sales')}
            title="Total Amount Received across all orders"
          >
            <i className="bi bi-arrow-down-left-circle-fill"></i>
            <span>Received: <strong>₹{(stats?.totalReceived || 0).toLocaleString('en-IN')}</strong></span>
          </button>

          {/* Money Not Received (Due) Pill */}
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 px-3 py-1 rounded-pill"
            style={{
              background: stats?.totalDue > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: stats?.totalDue > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
              color: stats?.totalDue > 0 ? '#EF4444' : 'var(--secondary-text)',
              fontSize: '0.78rem'
            }}
            onClick={() => setCurrentPage('ledger')}
            title="Outstanding balance due from client accounts. Click to view Party Ledger."
          >
            <i className={`bi ${stats?.totalDue > 0 ? 'bi-exclamation-circle-fill text-danger' : 'bi-check-circle-fill text-success'}`}></i>
            <span>Pending Dues: <strong>₹{(stats?.totalDue || 0).toLocaleString('en-IN')}</strong></span>
          </button>
        </div>

        {/* Omni Search Trigger */}
        <div
          className="topbar-search-box cursor-pointer"
          onClick={() => setIsGlobalSearchOpen(true)}
          title="Search anything (Ctrl+K)"
          style={{ cursor: 'pointer', width: 280 }}
        >
          <i className="bi bi-search topbar-search-icon"></i>
          <input
            type="text"
            readOnly
            className="topbar-search-input cursor-pointer"
            placeholder="Search catalog, invoices, client dues..."
            style={{ cursor: 'pointer', height: 40 }}
          />
          <kbd className="topbar-search-kbd">Ctrl+K</kbd>
        </div>
      </div>

      {/* 3. RIGHT: Actions, Theme, Notifications & User Capsule */}
      <div className="topbar-right d-flex align-items-center gap-2">
        {/* Mobile Search Button */}
        <button
          type="button"
          className="topbar-btn d-flex d-lg-none"
          onClick={() => setIsGlobalSearchOpen(true)}
          aria-label="Search"
          title="Search anything"
        >
          <i className="bi bi-search"></i>
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="topbar-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-gold' : 'bi-moon-stars-fill'}`}></i>
        </button>

        {/* Quick Action (+) Create Dropdown */}
        <div className="position-relative" ref={createRef}>
          <button
            type="button"
            className="btn btn-gold btn-sm d-flex align-items-center gap-1 px-2 px-md-3"
            style={{ height: 36 }}
            onClick={() => setCreateOpen(!createOpen)}
            title="Create new transaction or entry"
          >
            <i className="bi bi-plus-lg fw-bold"></i>
            <span className="d-none d-sm-inline fw-semibold">New Action</span>
          </button>

          {createOpen && (
            <div
              className="dropdown-menu-iq position-absolute end-0 mt-2 shadow-lg animate-fade-in"
              style={{ minWidth: 230, zIndex: 1050 }}
            >
              <div className="px-3 py-2 border-bottom border-secondary mb-1">
                <span className="small fw-bold text-gold text-uppercase">Quick Actions</span>
              </div>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('sales'); setCreateOpen(false); }}
              >
                <i className="bi bi-receipt text-gold me-2"></i> New Sale & Invoice
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('ledger'); setCreateOpen(false); }}
              >
                <i className="bi bi-cash-stack text-success me-2"></i> Collect Party Payment / Due
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('purchases'); setCreateOpen(false); }}
              >
                <i className="bi bi-bag-plus text-info me-2"></i> New Purchase Order
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('inventory'); setCreateOpen(false); }}
              >
                <i className="bi bi-box-seam text-warning me-2"></i> Add Product to Catalog
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('suppliers'); setCreateOpen(false); }}
              >
                <i className="bi bi-truck text-secondary me-2"></i> Add Supplier Contact
              </button>
            </div>
          )}
        </div>

        {/* Notifications Hub */}
        <div className="position-relative" ref={notifRef}>
          <button
            type="button"
            id="notifDropdownBtn"
            className="topbar-btn position-relative"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
            title="Notifications & Alerts"
          >
            <i className="bi bi-bell"></i>
            {unreadCount > 0 && (
              <span className="notification-badge position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-dark rounded-circle">
                <span className="visually-hidden">unread alerts</span>
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="dropdown-menu-iq position-absolute end-0 mt-2 p-0 shadow-lg animate-fade-in"
              style={{ width: 'min(340px, calc(100vw - 24px))', zIndex: 1050 }}
            >
              <div className="p-3 border-bottom border-secondary d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="badge bg-danger rounded-pill px-2 py-0" style={{ fontSize: '0.7rem' }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-gold text-decoration-none"
                  onClick={markAllRead}
                  style={{ fontSize: '0.75rem' }}
                >
                  Mark all read
                </button>
              </div>

              <div className="p-2" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-secondary small">
                    <i className="bi bi-bell-slash fs-4 d-block mb-1 text-muted"></i>
                    No pending notifications
                  </div>
                ) : (
                  notifications.map(item => {
                    const isUnread = item.unread && !readNotifIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`d-flex align-items-start gap-2 p-2 rounded mb-1 cursor-pointer ${
                          isUnread ? 'bg-secondary-dark border border-secondary' : 'bg-hover'
                        }`}
                        onClick={() => {
                          if (item.id === 'notif-dues') setCurrentPage('ledger');
                          if (item.id === 'notif-stock') setCurrentPage('inventory');
                          setNotificationsOpen(false);
                        }}
                      >
                        <i className={`bi mt-1 ${
                          item.type === 'danger' ? 'bi-exclamation-octagon-fill text-danger' :
                          item.type === 'warning' ? 'bi-exclamation-triangle-fill text-warning' :
                          item.type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-info-circle-fill text-info'
                        }`}></i>
                        <div className="flex-grow-1">
                          <div className="text-white d-flex justify-content-between align-items-center" style={{ fontSize: '0.82rem' }}>
                            <strong>{item.title}</strong>
                            <span className="text-muted" style={{ fontSize: '0.68rem' }}>{item.time}</span>
                          </div>
                          <small className="text-secondary d-block mt-1" style={{ fontSize: '0.75rem' }}>{item.desc}</small>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Capsule */}
        <div className="position-relative" ref={profileRef}>
          <div
            className="user-capsule cursor-pointer d-flex align-items-center gap-2 px-2 py-1 rounded"
            onClick={() => setProfileOpen(!profileOpen)}
            style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}
          >
            <div
              className="user-avatar rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #F5B942 0%, #D99726 100%)',
                color: '#090909',
                fontSize: '0.82rem'
              }}
            >
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'IQ'}
            </div>

            <div className="user-info-text d-none d-md-flex flex-column text-start" style={{ lineHeight: 1.2 }}>
              <span className="user-name text-white fw-semibold" style={{ fontSize: '0.82rem' }}>
                {user?.name || 'Administrator'}
              </span>
              <span className="user-role text-secondary" style={{ fontSize: '0.7rem' }}>
                {user?.role || 'Admin'}
              </span>
            </div>

            <i className="bi bi-chevron-down text-muted small ms-1"></i>
          </div>

          {profileOpen && (
            <div
              className="dropdown-menu-iq position-absolute end-0 mt-2 shadow-lg animate-fade-in"
              style={{ minWidth: 240, zIndex: 1050 }}
            >
              <div className="px-3 py-2 border-bottom border-secondary mb-1">
                <div className="fw-bold text-white">{user?.name || 'User'}</div>
                <small className="text-secondary d-block">{user?.email || 'admin@inventoryiq.com'}</small>
                {user?.organizationName && (
                  <span className="badge bg-secondary-dark text-gold border border-warning border-opacity-25 mt-1" style={{ fontSize: '0.68rem' }}>
                    {user.organizationName}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('profile'); setProfileOpen(false); }}
              >
                <i className="bi bi-person me-2 text-gold"></i> My Profile
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('settings'); setProfileOpen(false); }}
              >
                <i className="bi bi-gear me-2 text-gold"></i> Organization Settings
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('security'); setProfileOpen(false); }}
              >
                <i className="bi bi-shield-check me-2 text-gold"></i> Security & Sessions
              </button>

              <div className="dropdown-divider-iq my-1"></div>

              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('terms'); setProfileOpen(false); }}
              >
                <i className="bi bi-file-earmark-text me-2 text-secondary"></i> Terms of Service
              </button>
              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start"
                onClick={() => { setCurrentPage('privacy'); setProfileOpen(false); }}
              >
                <i className="bi bi-shield-lock me-2 text-secondary"></i> Privacy Policy
              </button>

              <div className="dropdown-divider-iq my-1"></div>

              <button
                type="button"
                className="dropdown-item-iq w-100 border-0 bg-transparent text-start text-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right text-danger me-2"></i> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

