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
    stats,
    user,
    logout
  } = useInventory();

  // Categorized Navigation Sections with Party Due Tracker prominently highlighted
  const navGroups = [
    {
      group: 'Core',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-fill' },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: 'bi-box-seam-fill',
          badge: lowStockItems && lowStockItems.length > 0 ? `${lowStockItems.length}` : null,
          badgeVariant: 'warning'
        }
      ]
    },
    {
      group: 'Finance & Sales',
      items: [
        { id: 'sales', label: 'Sales & Invoices', icon: 'bi-cart-check-fill' },
        {
          id: 'ledger',
          label: 'Party Due Tracker',
          icon: 'bi-wallet2',
          badge: stats?.totalDue > 0 ? `₹${stats.totalDue.toLocaleString('en-IN')}` : 'Cleared',
          badgeVariant: stats?.totalDue > 0 ? 'danger' : 'success',
          highlight: stats?.totalDue > 0
        },
        { id: 'purchases', label: 'Purchases & POs', icon: 'bi-bag-check-fill' }
      ]
    },
    {
      group: 'Operations',
      items: [
        { id: 'analytics', label: 'Analytics', icon: 'bi-graph-up-arrow' },
        { id: 'suppliers', label: 'Supplier Contacts', icon: 'bi-truck' }
      ]
    },
    {
      group: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: 'bi-gear-fill' },
        { id: 'security', label: 'Security', icon: 'bi-shield-check' }
      ]
    }
  ];

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
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay active"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        id="mainSidebar"
        className={`iq-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand Header */}
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

              {/* Sidebar Collapse Toggle Button (Desktop & Tablet only) */}
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

        {/* Categorized Navigation Items */}
        <div className="sidebar-nav-container">
          {navGroups.map((group) => (
            <div key={group.group} className="mb-2">
              {!isCollapsed && (
                <div className="nav-section-label">
                  {group.group}
                </div>
              )}

              {group.items.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link ${isActive ? 'active' : ''} ${item.highlight ? 'has-alert' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <i className={`bi ${item.icon}`}></i>
                    {!isCollapsed && <span>{item.label}</span>}
                    {item.badge && !isCollapsed && (
                      <span className={`nav-badge ${
                        item.badgeVariant === 'danger' ? 'bg-danger text-white' :
                        item.badgeVariant === 'success' ? 'bg-success text-white' :
                        'status-low-stock'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Logout Button */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-link btn-logout"
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <i className="bi bi-box-arrow-left"></i>
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
