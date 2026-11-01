import React from 'react';
import { useInventory } from './context/InventoryContext';

// Components
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { InvoiceModal } from './components/InvoiceModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/ToastContainer';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CustomersPage } from './pages/CustomersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SecurityPage } from './pages/SecurityPage';

// Auth Pages
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';

export function App() {
  const { currentPage, isAuthenticated, sidebarCollapsed } = useInventory();

  // Route to Auth Pages
  if (!isAuthenticated || ['login', 'register', 'forgot-password', 'reset-password'].includes(currentPage)) {
    if (currentPage === 'register') return <><RegisterPage /><ToastContainer /></>;
    if (currentPage === 'forgot-password') return <><ForgotPasswordPage /><ToastContainer /></>;
    if (currentPage === 'reset-password') return <><ResetPasswordPage /><ToastContainer /></>;
    return <><LoginPage /><ToastContainer /></>;
  }

  // Main Dashboard View Router
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'sales':
        return <SalesPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'customers':
        return <CustomersPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'security':
        return <SecurityPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="main-content">
        <Topbar />
        <div className="content-body">
          {renderCurrentPage()}
        </div>
      </main>

      {/* Global Interactive Modals & Notification Portals */}
      <GlobalSearchModal />
      <InvoiceModal />
      <ConfirmModal />
      <ToastContainer />
    </div>
  );
}

export default App;
