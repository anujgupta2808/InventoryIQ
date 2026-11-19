import React, { useEffect } from 'react';
import { useInventory } from './context/InventoryContext';

// Components
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { InvoiceModal } from './components/InvoiceModal';
import { ConfirmModal } from './components/ConfirmModal';
import { NewDeviceModal } from './components/NewDeviceModal';
import { ToastContainer } from './components/ToastContainer';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { PartyDueTrackerPage } from './pages/PartyDueTrackerPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SecurityPage } from './pages/SecurityPage';

// Auth Pages
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';

// Legal Pages
import { TermsOfServicePage } from './pages/Legal/TermsOfServicePage';
import { PrivacyPolicyPage } from './pages/Legal/PrivacyPolicyPage';

export function App() {
  const { currentPage, setCurrentPage, isAuthenticated, sidebarCollapsed } = useInventory();

  // Guard: Redirect authenticated users away from authentication views to the dashboard
  useEffect(() => {
    if (isAuthenticated && ['login', 'register', 'forgot-password', 'reset-password'].includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, currentPage, setCurrentPage]);

  // Guard: Prevent unauthenticated users from reaching protected dashboard pages
  useEffect(() => {
    const publicPages = ['login', 'register', 'forgot-password', 'reset-password', 'terms', 'privacy'];
    if (!isAuthenticated && !publicPages.includes(currentPage)) {
      setCurrentPage('login');
    }
  }, [isAuthenticated, currentPage, setCurrentPage]);

  // Route to Legal Pages (Accessible publicly or from within authenticated app)
  if (currentPage === 'terms') {
    return <><TermsOfServicePage /><ToastContainer /></>;
  }
  if (currentPage === 'privacy') {
    return <><PrivacyPolicyPage /><ToastContainer /></>;
  }

  // Route to Auth Pages for unauthenticated visitors
  if (!isAuthenticated) {
    if (currentPage === 'register') return <><RegisterPage /><ToastContainer /></>;
    if (currentPage === 'forgot-password') return <><ForgotPasswordPage /><ToastContainer /></>;
    if (currentPage === 'reset-password') return <><ResetPasswordPage /><ToastContainer /></>;
    return <><LoginPage /><ToastContainer /></>;
  }

  // Main Dashboard View Router for authenticated users
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'sales':
        return <SalesPage />;
      case 'ledger':
        return <PartyDueTrackerPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'security':
        return <SecurityPage />;
      case 'terms':
        return <TermsOfServicePage />;
      case 'privacy':
        return <PrivacyPolicyPage />;
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
      <NewDeviceModal />
      <ToastContainer />
    </div>
  );
}

export default App;
