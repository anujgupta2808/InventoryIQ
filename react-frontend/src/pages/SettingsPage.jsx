import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const SettingsPage = () => {
  const {
    user,
    setUser,
    updateUserProfile,
    changePassword,
    resetAllData,
    showToast,
    openConfirm,
    theme,
    setTheme
  } = useInventory();

  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [businessName, setBusinessName] = useState(user?.businessName || user?.organizationName || 'InventoryIQ Retail & Wholesale');
  const [organizationType, setOrganizationType] = useState(user?.organizationType || 'Retail Store / Shop');
  const [gstin, setGstin] = useState(user?.gstin || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length > 7) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(newPassword);

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);
  const [salesSummary, setSalesSummary] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim();
    const cleanBiz = String(businessName || '').trim();
    const cleanOrgType = String(organizationType || '').trim();
    const cleanGstin = String(gstin || '').trim().toUpperCase();

    if (!cleanName) {
      showToast('Validation Error', 'Full Name is required.', 'danger');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Validation Error', 'A valid Email Address is required.', 'danger');
      return;
    }

    if (cleanGstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(cleanGstin)) {
        showToast('Invalid GSTIN', 'GSTIN must follow the 15-character standard format (e.g. 07AAAAA0000A1Z5) or left empty.', 'danger');
        return;
      }
    }

    const payload = {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      businessName: cleanBiz,
      organizationName: cleanBiz,
      organizationType: cleanOrgType,
      gstin: cleanGstin,
      currency
    };

    if (updateUserProfile) {
      updateUserProfile(payload);
    } else {
      setUser({
        ...user,
        ...payload
      });
      showToast('Settings Updated', 'Your organization preferences have been saved successfully.', 'success');
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Validation Error', 'Please enter your current password.', 'danger');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Validation Error', 'New password must be at least 8 characters long.', 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Validation Error', 'New password and confirmation do not match.', 'danger');
      return;
    }

    const res = changePassword({ currentPassword, newPassword });
    if (res && res.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    }
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
    showToast('Backup Created', 'Database snapshot downloaded successfully.', 'success');
  };

  const handleConfirmReset = () => {
    openConfirm({
      title: 'Reset Demo Database',
      message: 'This will reset all inventory, sales, purchases, suppliers, and audit logs to the initial demo seed state. This action cannot be undone.',
      confirmText: 'Reset Everything',
      confirmVariant: 'danger',
      onConfirm: resetAllData
    });
  };

  return (
    <div className="settings-page animate-fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-2 border-bottom border-secondary border-opacity-50">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Settings & Workspace</h2>
          <p className="page-subtitle text-secondary mb-0">
            Manage your organization identity, security, theme appearance, and data
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-secondary-dark text-gold border border-warning border-opacity-25 px-3 py-2">
            <i className="bi bi-patch-check-fill text-gold me-1"></i>Verified Workspace
          </span>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Navigation Tabs Panel */}
        <div className="col-12 col-md-4 col-lg-3">
          <div className="settings-card p-2">
            <div className="d-flex flex-row flex-md-column gap-1 overflow-x-auto pb-1 pb-md-0">
              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <i className="bi bi-building"></i>
                <div className="text-truncate">
                  <span className="fw-semibold d-block">Organization Profile</span>
                  <span className="tab-hint d-none d-md-block">Company name, type, GSTIN</span>
                </div>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setActiveTab('appearance')}
              >
                <i className="bi bi-palette-fill"></i>
                <div className="text-truncate">
                  <span className="fw-semibold d-block">Appearance & Theme</span>
                  <span className="tab-hint d-none d-md-block">Black & Gold or Light mode</span>
                </div>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                <i className="bi bi-bell-fill"></i>
                <div className="text-truncate">
                  <span className="fw-semibold d-block">Notifications & Alerts</span>
                  <span className="tab-hint d-none d-md-block">Low stock, invoice digests</span>
                </div>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <i className="bi bi-shield-lock-fill"></i>
                <div className="text-truncate">
                  <span className="fw-semibold d-block">Security Credentials</span>
                  <span className="tab-hint d-none d-md-block">Password & 2FA protection</span>
                </div>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
                onClick={() => setActiveTab('database')}
              >
                <i className="bi bi-database-fill"></i>
                <div className="text-truncate">
                  <span className="fw-semibold d-block">Data & Backups</span>
                  <span className="tab-hint d-none d-md-block">Export JSON & reset database</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Tab Content Panel */}
        <div className="col-12 col-md-8 col-lg-9">
          {/* TAB 1: Profile & Organization Settings */}
          {activeTab === 'profile' && (
            <div className="settings-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-secondary border-opacity-50">
                <div>
                  <h5 className="text-white fw-bold mb-1">Organization & Commercial Profile</h5>
                  <small className="text-secondary">Appears on invoices, receipts, and system navigation</small>
                </div>
              </div>

              {/* Owner Avatar & Workspace Card */}
              <div className="p-3 mb-4 rounded bg-secondary-dark border border-secondary border-opacity-50 d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-4"
                    style={{
                      width: 54,
                      height: 54,
                      background: 'linear-gradient(135deg, #F5B942 0%, #D99726 100%)',
                      color: '#090909',
                      border: '2px solid rgba(245, 185, 66, 0.4)'
                    }}
                  >
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'IQ'}
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h5 className="text-white fw-bold mb-0">{user?.name || 'Administrator'}</h5>
                      <span className="badge badge-gold px-2 py-0" style={{ fontSize: '0.7rem' }}>
                        {user?.role || 'Admin'}
                      </span>
                    </div>
                    <span className="text-secondary small d-block">{user?.email || 'admin@inventoryiq.com'}</span>
                  </div>
                </div>

                <div className="text-end">
                  <span className="text-gold small fw-bold d-block text-uppercase">Active Tenant</span>
                  <span className="text-white small fw-medium">{user?.organizationName || 'InventoryIQ Retail & Wholesale'}</span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile}>
                {/* Personal Information Group */}
                <h6 className="text-gold fw-bold small text-uppercase mb-3">
                  <i className="bi bi-person-badge me-2"></i>Account Representative Details
                </h6>

                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-4">
                    <label className="form-label text-secondary small fw-medium">Full Name *</label>
                    <div className="settings-input-group">
                      <i className="bi bi-person settings-input-icon"></i>
                      <input
                        type="text"
                        required
                        className="form-control settings-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Anuj Gupta"
                      />
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label text-secondary small fw-medium">Email Address *</label>
                    <div className="settings-input-group">
                      <i className="bi bi-envelope settings-input-icon"></i>
                      <input
                        type="email"
                        required
                        className="form-control settings-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label text-secondary small fw-medium">Contact Phone</label>
                    <div className="settings-input-group">
                      <i className="bi bi-telephone settings-input-icon"></i>
                      <input
                        type="tel"
                        className="form-control settings-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-section-divider"></div>

                {/* Organization & Commercial Details */}
                <h6 className="text-gold fw-bold small text-uppercase mb-3">
                  <i className="bi bi-building me-2"></i>Business & Organization Details
                </h6>

                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-6">
                    <label className="form-label text-secondary small fw-medium">Organization / Store Name *</label>
                    <div className="settings-input-group">
                      <i className="bi bi-shop settings-input-icon"></i>
                      <input
                        type="text"
                        required
                        className="form-control settings-input"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. InventoryIQ Retail & Wholesale"
                      />
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-secondary small fw-medium">Organization Type *</label>
                    <div className="settings-input-group">
                      <i className="bi bi-briefcase settings-input-icon"></i>
                      <select
                        className="form-select settings-input"
                        value={organizationType}
                        onChange={(e) => setOrganizationType(e.target.value)}
                      >
                        <option value="Retail Store / Shop">Retail Store / Shop</option>
                        <option value="Wholesale / Distribution">Wholesale / Distribution</option>
                        <option value="Private Limited (Pvt Ltd)">Private Limited (Pvt Ltd)</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="Partnership Firm">Partnership Firm</option>
                        <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                        <option value="Manufacturing / Industrial">Manufacturing / Industrial</option>
                        <option value="E-Commerce / Online Seller">E-Commerce / Online Seller</option>
                        <option value="Other Enterprise">Other Enterprise</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-secondary small fw-medium">
                      GSTIN Number <span className="text-muted">(Optional for registered businesses)</span>
                    </label>
                    <div className="settings-input-group">
                      <i className="bi bi-card-heading settings-input-icon"></i>
                      <input
                        type="text"
                        maxLength={15}
                        className="form-control settings-input text-uppercase fw-semibold"
                        placeholder="e.g. 07AAAAA0000A1Z5"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      />
                    </div>
                    <small className="text-secondary d-block mt-1">
                      15-character Goods & Services Tax Identification Number
                    </small>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-secondary small fw-medium">Base Reporting Currency</label>
                    <div className="settings-input-group">
                      <i className="bi bi-currency-rupee settings-input-icon"></i>
                      <select
                        className="form-select settings-input"
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
                </div>

                <div className="d-flex justify-content-end pt-3 border-top border-secondary border-opacity-50">
                  <button type="submit" className="btn btn-gold px-4 py-2 fw-semibold d-flex align-items-center gap-2">
                    <i className="bi bi-check2-circle"></i>
                    <span>Save Organization Changes</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Appearance & Visual Style */}
          {activeTab === 'appearance' && (
            <div className="settings-card p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary border-opacity-50">
                <h5 className="text-white fw-bold mb-1">Appearance & Dashboard Theme</h5>
                <small className="text-secondary">Select the visual appearance of your inventory workspace</small>
              </div>

              <div className="row g-4">
                {/* Dark Gold Theme Card */}
                <div className="col-12 col-sm-6">
                  <div
                    className={`settings-theme-card ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    {/* Mock UI Preview */}
                    <div
                      className="rounded p-2 mb-3 border border-secondary border-opacity-50"
                      style={{ background: '#090909', height: 110 }}
                    >
                      <div className="d-flex align-items-center justify-content-between pb-1 mb-2 border-bottom border-secondary border-opacity-25">
                        <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>InventoryIQ</span>
                        <span style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }}></span>
                      </div>
                      <div className="d-flex gap-2">
                        <div style={{ width: 32, height: 60, background: '#141414', borderRadius: 4 }}></div>
                        <div className="flex-grow-1">
                          <div className="p-1 mb-1 rounded" style={{ background: '#181818', border: '1px solid #282828' }}>
                            <div style={{ width: '60%', height: 6, background: '#F5B942', borderRadius: 3 }}></div>
                          </div>
                          <div className="p-1 rounded" style={{ background: '#181818' }}>
                            <div style={{ width: '80%', height: 6, background: '#10B981', borderRadius: 3 }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong className="text-white d-block">Commercial Black & Gold</strong>
                        <small className="text-secondary">Signature luxury obsidian with 24K gold accents</small>
                      </div>
                      {theme === 'dark' && (
                        <span className="badge badge-gold">Active</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Light Theme Card */}
                <div className="col-12 col-sm-6">
                  <div
                    className={`settings-theme-card ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    {/* Mock UI Preview */}
                    <div
                      className="rounded p-2 mb-3 border border-secondary border-opacity-50"
                      style={{ background: '#FFFFFF', height: 110 }}
                    >
                      <div className="d-flex align-items-center justify-content-between pb-1 mb-2 border-bottom border-secondary border-opacity-25">
                        <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>InventoryIQ</span>
                        <span style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }}></span>
                      </div>
                      <div className="d-flex gap-2">
                        <div style={{ width: 32, height: 60, background: '#F3F4F6', borderRadius: 4 }}></div>
                        <div className="flex-grow-1">
                          <div className="p-1 mb-1 rounded" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                            <div style={{ width: '60%', height: 6, background: '#D9822B', borderRadius: 3 }}></div>
                          </div>
                          <div className="p-1 rounded" style={{ background: '#F9FAFB' }}>
                            <div style={{ width: '80%', height: 6, background: '#10B981', borderRadius: 3 }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong className="text-white d-block">Enterprise Daylight Mode</strong>
                        <small className="text-secondary">High clarity daytime UI with gold highlights</small>
                      </div>
                      {theme === 'light' && (
                        <span className="badge badge-gold">Active</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Notifications & System Alerts */}
          {activeTab === 'notifications' && (
            <div className="settings-card p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary border-opacity-50">
                <h5 className="text-white fw-bold mb-1">Notifications & Thresholds</h5>
                <small className="text-secondary">Control real-time warnings and dispatch channels</small>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="settings-toggle-row">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded d-flex align-items-center justify-content-center"
                      style={{ width: 38, height: 38, background: 'rgba(245, 185, 66, 0.15)', color: '#F5B942' }}
                    >
                      <i className="bi bi-exclamation-triangle fs-5"></i>
                    </div>
                    <div>
                      <strong className="text-white d-block">Low Stock Safety Alerts</strong>
                      <small className="text-secondary">Instantly alert in topbar when catalog items fall below minimum stock</small>
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input fs-5"
                      type="checkbox"
                      checked={stockAlerts}
                      onChange={(e) => setStockAlerts(e.target.checked)}
                    />
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded d-flex align-items-center justify-content-center"
                      style={{ width: 38, height: 38, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
                    >
                      <i className="bi bi-receipt fs-5"></i>
                    </div>
                    <div>
                      <strong className="text-white d-block">Automated Email Tax Invoices</strong>
                      <small className="text-secondary">Dispatch digital tax invoice receipts to customer upon completing sales</small>
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input fs-5"
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                    />
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded d-flex align-items-center justify-content-center"
                      style={{ width: 38, height: 38, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}
                    >
                      <i className="bi bi-graph-up fs-5"></i>
                    </div>
                    <div>
                      <strong className="text-white d-block">Daily Financial Summary Digest</strong>
                      <small className="text-secondary">Receive daily gross sales, received payments, and pending dues reports</small>
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input fs-5"
                      type="checkbox"
                      checked={salesSummary}
                      onChange={(e) => setSalesSummary(e.target.checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Security & Authentication */}
          {activeTab === 'security' && (
            <div className="settings-card p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary border-opacity-50">
                <h5 className="text-white fw-bold mb-1">Security & Authentication</h5>
                <small className="text-secondary">Protect your workspace with password policy and 2FA</small>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="settings-toggle-row">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded d-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40, background: 'rgba(245, 185, 66, 0.15)', color: '#F5B942' }}
                    >
                      <i className="bi bi-key-fill fs-5"></i>
                    </div>
                    <div>
                      <strong className="text-white d-block">Account Master Password</strong>
                      <small className="text-secondary">Ensure your workspace credentials are strong and unique</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-gold btn-sm d-flex align-items-center gap-2"
                    onClick={() => setIsPasswordModalOpen(true)}
                  >
                    <i className="bi bi-shield-lock"></i>
                    <span>Change Password</span>
                  </button>
                </div>

                <div className="settings-toggle-row">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded d-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
                    >
                      <i className="bi bi-shield-check fs-5"></i>
                    </div>
                    <div>
                      <strong className="text-white d-block">Two-Factor Authentication (2FA)</strong>
                      <small className="text-secondary">Require verification code via authenticator app on sign-in</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-warning text-gold btn-sm"
                    onClick={() => showToast('2FA Settings', 'Configuring TOTP credentials...', 'info')}
                  >
                    Configure 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Data Management & Backups */}
          {activeTab === 'database' && (
            <div className="settings-card p-4">
              <div className="mb-4 pb-2 border-bottom border-secondary border-opacity-50">
                <h5 className="text-white fw-bold mb-1">Database & Data Preservation</h5>
                <small className="text-secondary">Export JSON snapshots or restore original demo catalog</small>
              </div>

              {/* Snapshot Backup Card */}
              <div className="settings-toggle-row mb-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded d-flex align-items-center justify-content-center"
                    style={{ width: 40, height: 40, background: 'rgba(245, 185, 66, 0.15)', color: '#F5B942' }}
                  >
                    <i className="bi bi-cloud-arrow-down-fill fs-5"></i>
                  </div>
                  <div>
                    <strong className="text-white d-block">Export Database JSON Snapshot</strong>
                    <small className="text-secondary">Downloads all products, sales invoices, client dues, and audit records</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-gold btn-sm d-flex align-items-center gap-2"
                  onClick={handleBackup}
                >
                  <i className="bi bi-download"></i>
                  <span>Export JSON</span>
                </button>
              </div>

              {/* Danger Zone Card */}
              <div
                className="p-3 rounded border border-danger border-opacity-50"
                style={{ background: 'rgba(239, 68, 68, 0.08)' }}
              >
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded d-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40, background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
                    >
                      <i className="bi bi-exclamation-octagon-fill fs-5"></i>
                    </div>
                    <div>
                      <strong className="text-danger d-block">Restore Pristine Demo Database</strong>
                      <small className="text-secondary">Resets all products, sales, and dues back to pristine factory demo seed state</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm px-3"
                    onClick={handleConfirmReset}
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="iq-modal-backdrop" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="iq-modal-container p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <h5 className="modal-title text-white fw-bold mb-0">Update Password</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setIsPasswordModalOpen(false)}
              ></button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="form-label text-secondary small">Current Password *</label>
                <input
                  type="password"
                  required
                  className="form-control bg-input border-secondary text-white"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-secondary small">New Password *</label>
                <input
                  type="password"
                  required
                  className="form-control bg-input border-secondary text-white"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {newPassword && (
                  <div className="mt-2">
                    <div className="d-flex justify-content-between small text-secondary mb-1">
                      <span>Strength</span>
                      <span className={strength >= 75 ? 'text-success' : strength >= 50 ? 'text-warning' : 'text-danger'}>
                        {strength >= 75 ? 'Strong' : strength >= 50 ? 'Medium' : 'Weak'}
                      </span>
                    </div>
                    <div className="progress" style={{ height: 5, backgroundColor: '#282828' }}>
                      <div
                        className={`progress-bar ${strength >= 75 ? 'bg-success' : strength >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${strength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label text-secondary small">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  className="form-control bg-input border-secondary text-white"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 pt-3 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-secondary-custom"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
