import React from 'react';
import { useInventory } from '../context/InventoryContext';

export const Sidebar = () => {
  const {
    currentPage,
    setCurrentPage,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    lowStockItems,
    logout
  } = useInventory();

  // Clean, uncluttered list matching the Stockly reference screenshot exactly
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-fill' },
    { id: 'inventory', label: 'Inventory', icon: 'bi-box-seam-fill', badge: lowStockItems.length > 0 ? `${lowStockItems.length}` : null },
    { id: 'sales', label: 'Sales', icon: 'bi-cart-check-fill' },
    { id: 'purchases', label: 'Purchases', icon: 'bi-bag-check-fill' },
    { id: 'analytics', label: 'Analytics', icon: 'bi-graph-up-arrow' },
    { id: 'customers', label: 'Customers', icon: 'bi-people-fill' },
    { id: 'suppliers', label: 'Contact', icon: 'bi-truck' },
    { id: 'settings', label: 'Settings', icon: 'bi-gear-fill' },
    { id: 'security', label: 'Security', icon: 'bi-shield-check' }
  ];

  // On mobile devices (drawer mode), the sidebar always displays fully with no collapse controls
  const isCollapsed = !mobileMenuOpen && sidebarCollapsed;

  const handleNavClick = (id) => {
    setCurrentPage(id);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay active"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        id="mainSidebar"
        className={`iq-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand Header & Toggle */}
        <div className={`sidebar-header ${isCollapsed ? 'collapsed-header' : ''}`}>
          {!isCollapsed ? (
            <>
              <div
                className="brand-wrapper cursor-pointer"
                onClick={() => handleNavClick('dashboard')}
                title="InventoryIQ Dashboard"
                style={{ cursor: 'pointer' }}
              >
                <img src="./logo.svg" alt="InventoryIQ" className="brand-logo-img" />
                <div className="brand-text-block">
                  <span className="brand-name">Inventory<span>IQ</span></span>
                  <span className="brand-tagline">Smart Inventory. Smarter Business.</span>
                </div>
              </div>

              {/* Sidebar Collapse Button - Desktop & Tablet only (strictly hidden on mobile) */}
              <button
                type="button"
                className="sidebar-collapse-btn d-none d-md-flex"
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
            </>
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center w-100 py-2 gap-2">
              <img
                src="./logo.svg"
                alt="InventoryIQ"
                className="brand-logo-img cursor-pointer"
                onClick={() => setSidebarCollapsed(false)}
                title="Click to expand sidebar"
                style={{ cursor: 'pointer' }}
              />
              {/* Sidebar Expand Button - Desktop & Tablet only (strictly hidden on mobile) */}
              <button
                type="button"
                className="sidebar-expand-btn d-none d-md-flex"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="sidebar-nav-container">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed ? item.label : undefined}
              >
                <i className={`bi ${item.icon}`}></i>
                {!isCollapsed && <span>{item.label}</span>}
                {item.badge && !isCollapsed && (
                  <span className="nav-badge status-low-stock">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer with Logout */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-link btn-logout"
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
          >
            <i className="bi bi-box-arrow-left"></i>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
