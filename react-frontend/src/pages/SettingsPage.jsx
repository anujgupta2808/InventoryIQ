import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const SettingsPage = () => {
  const { user, setUser, resetAllData, showToast, openConfirm, theme, setTheme } = useInventory();
  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '+91 98765 43210');
  const [businessName, setBusinessName] = useState(user.businessName || 'InventoryIQ Retail & Wholesale');
  const [currency, setCurrency] = useState('INR');

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);
  const [salesSummary, setSalesSummary] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setUser({
      ...user,
      name,
      email,
      phone,
      businessName,
      currency
    });
    showToast('Settings Updated', 'Your profile preferences have been updated successfully.');
  };

  const handleBackup = () => {
    const backupData = {
      user,
      timestamp: new Date().toISOString(),
      localStorageDump: { ...localStorage }
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InventoryIQ_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Backup Created', 'Database snapshot downloaded successfully.');
  };

  const handleConfirmReset = () => {
    openConfirm({
      title: 'Reset Demo Database',
      message: 'This will reset all inventory, sales, purchases, customers, and audit logs to the initial seed state. This action cannot be undone.',
      confirmText: 'Reset Everything',
      confirmVariant: 'danger',
      onConfirm: resetAllData
    });
  };

  return (
    <div className="settings-page animate-fade-in">
      {/* Page Header */}
      <div className="mb-4">
        <h2 className="page-title text-white fw-bold mb-1">Settings</h2>
        <p className="page-subtitle text-secondary mb-0">Customize your workspace experience and system configurations</p>
      </div>

      <div className="row g-4">
        {/* Left Navigation Tabs (matching reference screenshot) */}
        <div className="col-12 col-md-4 col-lg-3">
          <div className="card-custom p-2">
            <nav className="nav flex-row flex-md-column flex-nowrap overflow-x-auto gap-1 pb-1 pb-md-0">
              <button
                type="button"
                className={`btn text-start text-nowrap d-flex align-items-center gap-2 gap-md-3 py-2 px-3 rounded ${activeTab === 'profile' ? 'btn-gold' : 'text-secondary hover-bg-dark'}`}
                onClick={() => setActiveTab('profile')}
              >
                <i className="bi bi-person-fill"></i>
                <span className="fw-medium">Profile Settings</span>
              </button>

              <button
                type="button"
                className={`btn text-start text-nowrap d-flex align-items-center gap-2 gap-md-3 py-2 px-3 rounded ${activeTab === 'appearance' ? 'btn-gold' : 'text-secondary hover-bg-dark'}`}
                onClick={() => setActiveTab('appearance')}
              >
                <i className="bi bi-palette-fill"></i>
                <span className="fw-medium">Appearance</span>
              </button>

              <button
                type="button"
                className={`btn text-start text-nowrap d-flex align-items-center gap-2 gap-md-3 py-2 px-3 rounded ${activeTab === 'notifications' ? 'btn-gold' : 'text-secondary hover-bg-dark'}`}
                onClick={() => setActiveTab('notifications')}
              >
                <i className="bi bi-bell-fill"></i>
                <span className="fw-medium">Notifications</span>
              </button>

              <button
                type="button"
                className={`btn text-start text-nowrap d-flex align-items-center gap-2 gap-md-3 py-2 px-3 rounded ${activeTab === 'security' ? 'btn-gold' : 'text-secondary hover-bg-dark'}`}
                onClick={() => setActiveTab('security')}
              >
                <i className="bi bi-shield-lock-fill"></i>
                <span className="fw-medium">Security</span>
              </button>

              <button
                type="button"
                className={`btn text-start text-nowrap d-flex align-items-center gap-2 gap-md-3 py-2 px-3 rounded ${activeTab === 'database' ? 'btn-gold' : 'text-secondary hover-bg-dark'}`}
                onClick={() => setActiveTab('database')}
              >
                <i className="bi bi-database-fill"></i>
                <span className="fw-medium">Database</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Right Tab Content */}
        <div className="col-12 col-md-8 col-lg-9">
          {/* 1. Profile Settings Tab (matching reference design) */}
          {activeTab === 'profile' && (
            <div className="card-custom p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary">
                <h5 className="text-white fw-bold mb-1">Profile</h5>
                <small className="text-secondary">Update your profile information</small>
              </div>

              {/* Profile Card Header with Avatar */}
              <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-secondary-dark rounded">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold fs-4 border border-warning"
                  style={{ width: 64, height: 64, background: '#F5B942' }}
                >
                  AG
                </div>
                <div>
                  <h5 className="text-white fw-bold mb-0">{user.name}</h5>
                  <span className="text-secondary small">{user.email}</span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label text-secondary small">Full Name</label>
                    <input
                      type="text"
                      required
                      className="form-control bg-input border-secondary text-white"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-secondary small">Email Address</label>
                    <input
                      type="email"
                      required
                      className="form-control bg-input border-secondary text-white"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-secondary small">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control bg-input border-secondary text-white"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-secondary small">Business / Organization Name</label>
                    <input
                      type="text"
                      className="form-control bg-input border-secondary text-white"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-secondary small">Base Currency</label>
                    <select
                      className="form-select bg-input border-secondary text-white"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="INR">INR (₹ - Indian Rupee)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top border-secondary">
                  <button type="submit" className="btn btn-gold w-100 py-2 fw-semibold">
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card-custom p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary">
                <h5 className="text-white fw-bold mb-1">Appearance & Theme</h5>
                <small className="text-secondary">Custom visual style of your inventory dashboard</small>
              </div>

              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <div
                    className={`p-3 rounded bg-secondary-dark position-relative cursor-pointer ${theme === 'dark' ? 'border border-warning' : 'border border-secondary'}`}
                    onClick={() => setTheme('dark')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className="bi bi-moon-stars-fill text-gold"></i>
                      <strong className="text-white">Commercial Black & Gold</strong>
                    </div>
                    <small className="text-secondary d-block">
                      Signature dark high-contrast dashboard with golden metallic highlights.
                    </small>
                    {theme === 'dark' && (
                      <span className="badge badge-gold position-absolute top-0 end-0 m-3">Active</span>
                    )}
                  </div>
                </div>

                <div className="col-12 col-sm-6">
                  <div
                    className={`p-3 rounded bg-secondary-dark position-relative cursor-pointer ${theme === 'light' ? 'border border-warning' : 'border border-secondary'}`}
                    onClick={() => setTheme('light')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className="bi bi-sun-fill text-gold"></i>
                      <strong className="text-white">Enterprise Light Mode</strong>
                    </div>
                    <small className="text-secondary d-block">
                      Clean high-clarity daylight theme with gold accents and crisp contrast.
                    </small>
                    {theme === 'light' && (
                      <span className="badge badge-gold position-absolute top-0 end-0 m-3">Active</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card-custom p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary">
                <h5 className="text-white fw-bold mb-1">Notification Preferences</h5>
                <small className="text-secondary">Control real-time alerts and stock notifications</small>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center p-3 bg-secondary-dark rounded">
                  <div>
                    <strong className="text-white d-block">Low Stock Safety Alerts</strong>
                    <small className="text-secondary">Notify when any product stock drops to minimum threshold</small>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={stockAlerts}
                      onChange={(e) => setStockAlerts(e.target.checked)}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center p-3 bg-secondary-dark rounded">
                  <div>
                    <strong className="text-white d-block">Email Transaction Receipts</strong>
                    <small className="text-secondary">Send automated tax invoice PDF to customer email</small>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center p-3 bg-secondary-dark rounded">
                  <div>
                    <strong className="text-white d-block">Daily Financial Summary</strong>
                    <small className="text-secondary">Receive daily gross sales & profit digests</small>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={salesSummary}
                      onChange={(e) => setSalesSummary(e.target.checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Security Tab */}
          {activeTab === 'security' && (
            <div className="card-custom p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary">
                <h5 className="text-white fw-bold mb-1">Security & Authentication</h5>
                <small className="text-secondary">Manage credentials, passwords and MFA protection</small>
              </div>

              <div className="p-3 bg-secondary-dark rounded mb-3 d-flex justify-content-between align-items-center">
                <div>
                  <strong className="text-white d-block">Two-Factor Authentication (2FA)</strong>
                  <small className="text-secondary">Add an extra layer of security using Google Authenticator</small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning text-gold"
                  onClick={() => showToast('2FA Settings', 'Configuring TOTP credentials...', 'info')}
                >
                  Configure 2FA
                </button>
              </div>

              <div className="p-3 bg-secondary-dark rounded d-flex justify-content-between align-items-center">
                <div>
                  <strong className="text-white d-block">Change Password</strong>
                  <small className="text-secondary">Last updated 18 days ago</small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary-custom"
                  onClick={() => showToast('Password Form', 'Password modal opened.', 'info')}
                >
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* 5. Database Tab */}
          {activeTab === 'database' && (
            <div className="card-custom p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary">
                <h5 className="text-white fw-bold mb-1">Database & Data Preservation</h5>
                <small className="text-secondary">Download complete JSON snapshots or restore original demo catalog</small>
              </div>

              <div className="p-3 bg-secondary-dark rounded mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <strong className="text-white d-block">Download Full Backup JSON</strong>
                  <small className="text-secondary">Exports all inventory, sales, suppliers and audit logs</small>
                </div>
                <button
                  type="button"
                  className="btn btn-gold btn-sm d-flex align-items-center gap-2"
                  onClick={handleBackup}
                >
                  <i className="bi bi-cloud-arrow-down-fill"></i>
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="p-3 border border-danger-subtle bg-danger-subtle bg-opacity-10 rounded d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <strong className="text-danger d-block">Restore Demo Seed Data</strong>
                  <small className="text-secondary">Wipes client-side modifications and restores pristine default database</small>
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleConfirmReset}
                >
                  Reset All Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

