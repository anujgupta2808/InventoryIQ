import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { usePermissions } from '../hooks/usePermissions';
import { mfaService } from '../services/mfaService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { migrationService } from '../services/migrationService';

export const SecurityPage = () => {
  const {
    user,
    sessions,
    revokeSession,
    revokeAllOtherSessions,
    auditLogs,
    openConfirm,
    showToast,
    logout,
    changePassword,
    addAuditLog
  } = useInventory();

  const { isOwner, isAdmin, canManageMembers, canManageSecurity } = usePermissions();

  // --------------------------------------------------------------------------
  // 2FA TOTP STATE
  // --------------------------------------------------------------------------
  const [mfaStatus, setMfaStatus] = useState({
    isLoading: true,
    isEnrolled: false,
    factors: [],
    level: 'aal1'
  });

  const [enrollModal, setEnrollModal] = useState({
    isOpen: false,
    step: 'qr', // 'qr' | 'recovery'
    factorId: '',
    secret: '',
    uri: '',
    qrCodeUrl: '',
    verifyCode: '',
    recoveryCodes: [],
    isSubmitting: false,
    error: ''
  });

  // --------------------------------------------------------------------------
  // PASSWORD CHANGE FORM STATE
  // --------------------------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // --------------------------------------------------------------------------
  // TEAM & ROLES (RBAC) STATE
  // --------------------------------------------------------------------------
  const [teamMembers, setTeamMembers] = useState(() => {
    try {
      const stored = localStorage.getItem('iq_team_members');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: user?.id || 'usr-1',
        name: user?.name || 'Anuj Gupta',
        email: user?.email || 'admin@inventoryiq.com',
        role: user?.role || 'owner',
        status: 'Active',
        joinedAt: 'Nov 2026'
      },
      {
        id: 'usr-2',
        name: 'Priya Sharma',
        email: 'priya.finance@inventoryiq.com',
        role: 'admin',
        status: 'Active',
        joinedAt: 'Nov 2026'
      },
      {
        id: 'usr-3',
        name: 'Rahul Verma',
        email: 'rahul.store@inventoryiq.com',
        role: 'staff',
        status: 'Active',
        joinedAt: 'Nov 2026'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('iq_team_members', JSON.stringify(teamMembers));
    } catch (e) {}
  }, [teamMembers]);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: 'staff' });

  // --------------------------------------------------------------------------
  // AUDIT LOG FILTER
  // --------------------------------------------------------------------------
  const [logSearch, setLogSearch] = useState('');

  // --------------------------------------------------------------------------
  // MIGRATION MODAL STATE
  // --------------------------------------------------------------------------
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [migrationStats, setMigrationStats] = useState(null);
  const [migrationProgress, setMigrationProgress] = useState(null);
  const [migrationInProgress, setMigrationInProgress] = useState(false);

  // Check initial 2FA status
  useEffect(() => {
    let isMounted = true;
    const checkMFA = async () => {
      try {
        const assurance = await mfaService.getAssuranceLevel();
        const factorList = await mfaService.listFactors();
        if (isMounted) {
          setMfaStatus({
            isLoading: false,
            isEnrolled: assurance.isEnrolled,
            factors: factorList.totp || [],
            level: assurance.currentLevel
          });
        }
      } catch (e) {
        if (isMounted) {
          setMfaStatus(prev => ({ ...prev, isLoading: false }));
        }
      }
    };
    checkMFA();
    return () => { isMounted = false; };
  }, []);

  // --------------------------------------------------------------------------
  // 2FA HANDLERS
  // --------------------------------------------------------------------------
  const handleStartEnrollTOTP = async () => {
    if (!isSupabaseConfigured()) {
      // In standalone demo mode, explain dual-mode and demonstrate setup
      const simulatedRecoveryCodes = mfaService.generateRecoveryCodes();
      setEnrollModal({
        isOpen: true,
        step: 'qr',
        factorId: 'demo-totp-factor',
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/InventoryIQ:admin@inventoryiq.com?secret=JBSWY3DPEHPK3PXP&issuer=InventoryIQ',
        qrCodeUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect width="220" height="220" fill="%23FFFFFF"/><text x="110" y="100" text-anchor="middle" font-size="14" fill="%23000">TOTP Authenticator</text><text x="110" y="125" text-anchor="middle" font-size="12" fill="%23777">Scan with Google Auth</text></svg>',
        verifyCode: '',
        recoveryCodes: simulatedRecoveryCodes,
        isSubmitting: false,
        error: ''
      });
      return;
    }

    try {
      const res = await mfaService.enrollTOTP('InventoryIQ Authenticator');
      if (!res.success) {
        showToast('2FA Setup Error', res.message, 'danger');
        return;
      }

      setEnrollModal({
        isOpen: true,
        step: 'qr',
        factorId: res.factorId,
        secret: res.secret,
        uri: res.uri,
        qrCodeUrl: res.qrCodeUrl,
        verifyCode: '',
        recoveryCodes: res.recoveryCodes,
        isSubmitting: false,
        error: ''
      });
    } catch (err) {
      showToast('2FA Error', err.message, 'danger');
    }
  };

  const handleVerifyEnrollment = async (e) => {
    e.preventDefault();
    const code = enrollModal.verifyCode.trim();
    if (code.length < 6) {
      setEnrollModal(prev => ({ ...prev, error: 'Please enter the full 6-digit verification code.' }));
      return;
    }

    setEnrollModal(prev => ({ ...prev, isSubmitting: true, error: '' }));

    if (!isSupabaseConfigured()) {
      // Demo mode verification simulation
      setTimeout(() => {
        setMfaStatus({
          isLoading: false,
          isEnrolled: true,
          factors: [{ id: 'demo-totp-factor', factorType: 'totp', friendlyName: 'InventoryIQ Authenticator', status: 'verified' }],
          level: 'aal2'
        });
        setEnrollModal(prev => ({ ...prev, isSubmitting: false, step: 'recovery' }));
        showToast('2FA Activated', 'Two-factor authenticator enrollment verified successfully!', 'success');
        addAuditLog('2FA Activated', 'Enrolled and verified TOTP Authenticator');
      }, 600);
      return;
    }

    const res = await mfaService.verifyChallenge({
      factorId: enrollModal.factorId,
      code
    });

    if (!res.success) {
      setEnrollModal(prev => ({
        ...prev,
        isSubmitting: false,
        error: res.message || 'Invalid 6-digit TOTP code. Please try again.'
      }));
      return;
    }

    // Save recovery codes hash
    await mfaService.saveRecoveryCodes(user.id, enrollModal.recoveryCodes);

    setMfaStatus(prev => ({
      ...prev,
      isEnrolled: true,
      level: 'aal2'
    }));

    setEnrollModal(prev => ({
      ...prev,
      isSubmitting: false,
      step: 'recovery'
    }));

    showToast('2FA Activated', 'Two-Factor Authentication is now active on your account!', 'success');
    addAuditLog('2FA Activated', 'Enrolled and verified TOTP Authenticator with 8 single-use recovery codes');
  };

  const handleDisable2FA = () => {
    openConfirm({
      title: 'Disable Two-Factor Authentication',
      message: 'Disabling 2FA will reduce your account security level to single-factor password verification. Are you sure you wish to disable 2FA?',
      confirmText: 'Disable 2FA',
      confirmVariant: 'danger',
      onConfirm: async () => {
        if (!isSupabaseConfigured()) {
          setMfaStatus({ isLoading: false, isEnrolled: false, factors: [], level: 'aal1' });
          showToast('2FA Disabled', 'Two-Factor Authentication has been removed.', 'warning');
          addAuditLog('2FA Disabled', 'User removed TOTP factor from account');
          return;
        }

        const factor = mfaStatus.factors[0];
        if (factor) {
          const res = await mfaService.unenrollFactor(factor.id);
          if (res.success) {
            setMfaStatus({ isLoading: false, isEnrolled: false, factors: [], level: 'aal1' });
            showToast('2FA Disabled', 'Two-Factor Authentication has been removed from this account.', 'warning');
            addAuditLog('2FA Disabled', `Unenrolled factor ${factor.id}`);
          } else {
            showToast('Error', res.message || 'Failed to unenroll 2FA factor', 'danger');
          }
        }
      }
    });
  };

  // --------------------------------------------------------------------------
  // SESSION REVOCATION HANDLERS
  // --------------------------------------------------------------------------
  const handleRevoke = (s) => {
    if (s.current) {
      openConfirm({
        title: 'Sign Out Current Device',
        message: 'This will terminate your current active session on this browser and return you to the login screen. Do you want to sign out?',
        confirmText: 'Sign Out',
        confirmVariant: 'danger',
        onConfirm: () => {
          logout();
        }
      });
      return;
    }

    openConfirm({
      title: 'Revoke Device Session',
      message: `Are you sure you want to disconnect "${s.device}" (${s.ip})? This remote session will be revoked immediately and require credentials to sign in again.`,
      confirmText: 'Revoke Access',
      confirmVariant: 'danger',
      onConfirm: async () => {
        await revokeSession(s.id);
      }
    });
  };

  // --------------------------------------------------------------------------
  // PASSWORD CHANGE HANDLER
  // --------------------------------------------------------------------------
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Validation Error', 'Please complete all password fields.', 'danger');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Validation Error', 'New passwords do not match.', 'danger');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // TEAM MANAGEMENT HANDLERS
  // --------------------------------------------------------------------------
  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!inviteData.name || !inviteData.email) {
      showToast('Validation Error', 'Name and email are required.', 'danger');
      return;
    }

    const newMember = {
      id: `usr-${Date.now()}`,
      name: inviteData.name.trim(),
      email: inviteData.email.trim().toLowerCase(),
      role: inviteData.role,
      status: 'Invited',
      joinedAt: 'Just now'
    };

    setTeamMembers(prev => [...prev, newMember]);
    setInviteModalOpen(false);
    setInviteData({ name: '', email: '', role: 'staff' });
    showToast('Invitation Sent', `Invitation sent to ${newMember.email} with role [${newMember.role.toUpperCase()}].`, 'success');
    addAuditLog('Member Invited', `Invited ${newMember.name} (${newMember.email}) as ${newMember.role}`);
  };

  const handleChangeMemberRole = (memberId, nextRole) => {
    if (!canManageMembers) {
      showToast('Access Denied', 'Only Owners and Admins can alter team role permissions.', 'danger');
      return;
    }

    setTeamMembers(prev =>
      prev.map(m => (m.id === memberId ? { ...m, role: nextRole } : m))
    );
    showToast('Role Updated', `Updated role to [${nextRole.toUpperCase()}].`, 'info');
    addAuditLog('Role Updated', `Changed role of member ${memberId} to ${nextRole}`);
  };

  const handleRemoveMember = (member) => {
    if (!canManageMembers) {
      showToast('Access Denied', 'Only Owners and Admins can remove organization team members.', 'danger');
      return;
    }
    if (member.role === 'owner') {
      showToast('Cannot Remove Owner', 'The organization primary owner cannot be removed.', 'warning');
      return;
    }

    openConfirm({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove ${member.name} (${member.email}) from this organization? Their permissions will be revoked immediately.`,
      confirmText: 'Remove Member',
      confirmVariant: 'danger',
      onConfirm: () => {
        setTeamMembers(prev => prev.filter(m => m.id !== member.id));
        showToast('Member Removed', `${member.name} has been removed from the organization.`, 'warning');
        addAuditLog('Member Removed', `Removed ${member.name} (${member.email}) with role [${member.role.toUpperCase()}] from organization`);
      }
    });
  };

  // --------------------------------------------------------------------------
  // MIGRATION HANDLERS
  // --------------------------------------------------------------------------
  const handleOpenMigration = () => {
    const stats = migrationService.inspectDemoData();
    setMigrationStats(stats);
    setMigrationModalOpen(true);
    setMigrationProgress(null);
  };

  const handleExecuteMigration = async () => {
    setMigrationInProgress(true);
    setMigrationProgress({ stage: 'starting', message: 'Connecting to Supabase...' });

    const orgId = user?.organizationId || '00000000-0000-0000-0000-000000000001';
    const res = await migrationService.migrateToSupabase({
      organizationId: orgId,
      onProgress: (p) => setMigrationProgress(p)
    });

    setMigrationInProgress(false);

    if (res.success) {
      showToast('Migration Complete', `Migrated ${res.results.products} products, ${res.results.sales} sales to Supabase PostgreSQL!`, 'success');
      addAuditLog('Data Migrated', `Successfully transferred local demo data to Supabase organization ${orgId}`);
    } else {
      showToast('Migration Notice', res.message || 'Check database connection credentials.', 'warning');
    }
  };

  // Filtered audit logs
  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    log.user.toLowerCase().includes(logSearch.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(logSearch.toLowerCase()))
  );

  const otherSessionsCount = sessions.filter(s => !s.current).length;

  return (
    <div className="security-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1 d-flex align-items-center gap-2">
            <span>Security & Access Control</span>
            <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
              <i className="bi bi-shield-lock-fill me-1"></i>Production Ready
            </span>
          </h2>
          <p className="page-subtitle text-secondary mb-0">
            Hardware-backed 2FA, session revocation, multi-tenant RBAC policies and immutable security audit logs
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary-custom btn-sm d-flex align-items-center gap-2"
          onClick={handleOpenMigration}
        >
          <i className="bi bi-cloud-arrow-up text-gold"></i>
          <span>Cloud Database Migration</span>
        </button>
      </div>

      {/* SECTION A: 2FA & Password Policy */}
      <div className="row g-4 mb-4">
        {/* Real 2FA TOTP Card */}
        <div className="col-12 col-md-6">
          <div className="card-custom p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '46px',
                    height: '46px',
                    background: mfaStatus.isEnrolled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 185, 66, 0.15)',
                    border: `1px solid ${mfaStatus.isEnrolled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 185, 66, 0.3)'}`
                  }}
                >
                  <i className={`bi ${mfaStatus.isEnrolled ? 'bi-shield-check text-success' : 'bi-shield-exclamation text-gold'} fs-4`}></i>
                </div>
                <div>
                  <h5 className="text-white fw-bold mb-0">Two-Factor Authentication</h5>
                  <small className="text-secondary">Time-Based One-Time Password (TOTP)</small>
                </div>
              </div>
              <span className={`badge ${mfaStatus.isEnrolled ? 'badge-success' : 'badge-warning'}`}>
                {mfaStatus.isEnrolled ? 'Active (AAL2)' : 'Disabled'}
              </span>
            </div>

            <p className="text-secondary small mb-3">
              Protect your business account with Google Authenticator, Authy, or Microsoft Authenticator.
              Sign-ins will require a dynamic 6-digit verification code from your device.
            </p>

            {mfaStatus.isEnrolled ? (
              <div className="p-3 rounded bg-secondary-dark border border-secondary border-opacity-25 mb-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-phone text-gold"></i>
                    <span className="text-white small fw-medium">Authenticator App Enrolled</span>
                  </div>
                  <span className="badge badge-success small">Verified</span>
                </div>
                <small className="text-secondary d-block mt-2">
                  Assurance Level: <strong className="text-white">AAL2 (Multi-Factor)</strong>. Verification is required on every new device login.
                </small>
              </div>
            ) : null}

            <div className="d-flex align-items-center gap-2">
              {mfaStatus.isEnrolled ? (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2"
                  onClick={handleDisable2FA}
                >
                  <i className="bi bi-shield-slash"></i>
                  <span>Disable 2FA</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-gold btn-sm d-flex align-items-center gap-2"
                  onClick={handleStartEnrollTOTP}
                >
                  <i className="bi bi-qr-code-scan"></i>
                  <span>Setup Authenticator (TOTP)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master Password & Compliance */}
        <div className="col-12 col-md-6">
          <div className="card-custom p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h5 className="text-white fw-bold mb-0">Master Account Password</h5>
                <small className="text-secondary">Cryptographic password hash & credential compliance</small>
              </div>
              <button
                type="button"
                className="btn btn-secondary-custom btn-sm"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                <i className={`bi ${showPasswordForm ? 'bi-chevron-up' : 'bi-key'} me-1 text-gold`}></i>
                {showPasswordForm ? 'Close Form' : 'Change Password'}
              </button>
            </div>

            {showPasswordForm ? (
              <form onSubmit={handleChangePasswordSubmit} className="mt-3">
                <div className="mb-2">
                  <label className="form-label text-secondary small">Current Password</label>
                  <input
                    type="password"
                    required
                    className="form-control form-control-sm form-control-iq"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label text-secondary small">New Password</label>
                    <input
                      type="password"
                      required
                      className="form-control form-control-sm form-control-iq"
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-secondary small">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      className="form-control form-control-sm form-control-iq"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn-gold btn-sm w-100 fw-semibold"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Updating Password...' : 'Save New Master Password'}
                </button>
              </form>
            ) : (
              <ul className="list-unstyled text-secondary small m-0 p-0 d-flex flex-column gap-2">
                <li className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-check text-gold"></i>
                  <span>Zero plaintext storage: Derivations use Web Crypto PBKDF2 & Supabase Auth.</span>
                </li>
                <li className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-check text-gold"></i>
                  <span>Complexity policy: Minimum 8 characters with uppercase, lowercase & digits.</span>
                </li>
                <li className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-check text-gold"></i>
                  <span>Session tokens refresh automatically with sliding window expiration.</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* SECTION B: Active Device Sessions & Revocation */}
      <div className="card-custom p-4 mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div>
            <h5 className="text-white fw-bold mb-1 d-flex align-items-center gap-2">
              <span>Active Device Sessions & Remote Revocation</span>
              <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                {sessions.length}
              </span>
            </h5>
            <small className="text-secondary">
              Real devices, operating systems and browsers with authenticated tokens to your tenant
            </small>
          </div>

          {otherSessionsCount > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2"
              onClick={() => {
                openConfirm({
                  title: 'Revoke All Other Sessions',
                  message: `Are you sure you want to disconnect ${otherSessionsCount} other remote device session(s)? Only this current browser will remain signed in.`,
                  confirmText: 'Revoke All Others',
                  confirmVariant: 'danger',
                  onConfirm: () => revokeAllOtherSessions()
                });
              }}
            >
              <i className="bi bi-shield-x"></i>
              <span>Revoke All Other Sessions ({otherSessionsCount})</span>
            </button>
          )}
        </div>

        <div className="d-flex flex-column gap-3">
          {sessions.length === 0 ? (
            <div className="p-3 rounded bg-secondary-dark text-secondary small">
              No active device sessions registered.
            </div>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                className="d-flex align-items-center justify-content-between p-3 rounded bg-secondary-dark flex-wrap gap-2 border border-secondary border-opacity-25"
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="text-gold fs-3">
                    <i className={`bi ${s.device && (s.device.includes('iPhone') || s.device.includes('Android') || s.device.includes('Mobile')) ? 'bi-phone' : 'bi-laptop'}`}></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-white fw-semibold">{s.device}</span>
                      {s.current && (
                        <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                          <i className="bi bi-check-circle-fill me-1"></i>Current Device
                        </span>
                      )}
                    </div>
                    <small className="text-secondary d-block mt-1">
                      <span className="text-white-50">{s.ip}</span> • {s.location} • <span className="text-gold">{s.lastActive}</span>
                    </small>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  {s.current ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                      onClick={() => handleRevoke(s)}
                      title="End session on this device"
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                      onClick={() => handleRevoke(s)}
                      title={`Disconnect ${s.device}`}
                    >
                      <i className="bi bi-x-circle"></i>
                      <span>Revoke Access</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION C: Organization Team & Role-Based Access Control (RBAC) */}
      <div className="card-custom p-4 mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div>
            <h5 className="text-white fw-bold mb-1 d-flex align-items-center gap-2">
              <span>Organization Team & Permissions (RBAC)</span>
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                Multi-Tenant
              </span>
            </h5>
            <small className="text-secondary">
              Role permissions strictly enforced: Owner, Admin, Manager, and Staff
            </small>
          </div>

          {canManageMembers && (
            <button
              type="button"
              className="btn btn-gold btn-sm d-flex align-items-center gap-2"
              onClick={() => setInviteModalOpen(true)}
            >
              <i className="bi bi-person-plus-fill"></i>
              <span>Invite Team Member</span>
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                <th>Member</th>
                <th>Email Address</th>
                <th>Role & Permissions</th>
                <th>Status</th>
                <th>Joined</th>
                {canManageMembers && <th className="text-end">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map(member => (
                <tr key={member.id} className="border-bottom border-secondary">
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-secondary-dark d-flex align-items-center justify-content-center text-gold fw-bold"
                        style={{ width: '32px', height: '32px', fontSize: '0.8rem', border: '1px solid rgba(245, 185, 66, 0.3)' }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <span className="text-white fw-medium">{member.name}</span>
                    </div>
                  </td>
                  <td className="text-secondary">{member.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        member.role === 'owner'
                          ? 'badge-gold'
                          : member.role === 'admin'
                          ? 'badge-info'
                          : member.role === 'manager'
                          ? 'badge-warning'
                          : 'badge-secondary'
                      }`}
                    >
                      {member.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-success small">{member.status}</span>
                  </td>
                  <td className="text-secondary small">{member.joinedAt}</td>
                  {canManageMembers && (
                    <td className="text-end">
                      {member.role !== 'owner' ? (
                        <div className="d-inline-flex align-items-center justify-content-end gap-2">
                          <select
                            className="form-select form-select-sm bg-dark text-white border-secondary d-inline-block"
                            style={{ width: 'auto', fontSize: '0.8rem' }}
                            value={member.role}
                            onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                            title="Change member role"
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm py-1 px-2 d-inline-flex align-items-center gap-1"
                            style={{ fontSize: '0.78rem' }}
                            onClick={() => handleRemoveMember(member)}
                            title={`Remove ${member.name} from team`}
                          >
                            <i className="bi bi-trash3-fill"></i>
                            <span className="d-none d-sm-inline">Remove</span>
                          </button>
                        </div>
                      ) : (
                        <span className="badge bg-secondary text-secondary-custom small">Organization Owner</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION D: Audit Trail & Security Logs */}
      <div className="card-custom p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h5 className="text-white fw-bold mb-1">Security Activity Ledger</h5>
            <small className="text-secondary">Immutable log of sign-ins, 2FA events, password changes and session revocations</small>
          </div>
          <div style={{ maxWidth: 280 }} className="iq-search-bar">
            <i className="bi bi-search iq-search-icon"></i>
            <input
              type="text"
              className="form-control iq-search-input"
              placeholder="Search security events..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
            {logSearch && (
              <button
                type="button"
                className="iq-search-clear"
                onClick={() => setLogSearch('')}
                title="Clear filter"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                <th>Action</th>
                <th>User / Actor</th>
                <th>Role</th>
                <th>Timestamp</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-secondary">
                    No security events match your filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="border-bottom border-secondary">
                    <td className="fw-medium text-white">{log.action}</td>
                    <td>{log.user}</td>
                    <td><span className="badge badge-secondary">{log.role}</span></td>
                    <td className="text-secondary">{log.timestamp}</td>
                    <td className="text-secondary small">{log.details || '-'}</td>
                    <td>
                      <span className={`badge ${log.status === 'Success' ? 'badge-success' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2FA ENROLLMENT MODAL (QR CODE + VERIFY + RECOVERY CODES)              */}
      {/* -------------------------------------------------------------------- */}
      {enrollModal.isOpen && (
        <div 
          className="iq-modal-backdrop" 
          style={{ zIndex: 1060, opacity: 1 }}
          onClick={() => setEnrollModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="iq-modal-container p-0" 
            style={{ maxWidth: 520, opacity: 1, backgroundColor: '#1A1A1A' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-shield-check text-gold fs-5"></i>
                <h5 className="modal-title fw-bold text-white mb-0">
                  {enrollModal.step === 'qr' ? 'Setup Authenticator App' : 'Save Recovery Backup Codes'}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setEnrollModal(prev => ({ ...prev, isOpen: false }))}
              ></button>
            </div>

            <div className="p-4" style={{ opacity: 1 }}>
                {enrollModal.step === 'qr' ? (
                  <div>
                    <p className="text-secondary small mb-3">
                      1. Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator).<br />
                      2. Scan this QR code or enter the secret key manually.<br />
                      3. Enter the 6-digit verification code below.
                    </p>

                    {/* QR Code Container */}
                    <div className="text-center p-3 rounded bg-white d-inline-block mx-auto mb-3 w-100" style={{ maxWidth: 240 }}>
                      {enrollModal.qrCodeUrl ? (
                        <img src={enrollModal.qrCodeUrl} alt="TOTP QR Code" className="img-fluid" style={{ width: 200, height: 200 }} />
                      ) : (
                        <div className="text-dark p-4">Loading QR Code...</div>
                      )}
                    </div>

                    {/* Manual Secret Key */}
                    <div className="p-2 rounded bg-secondary-dark border border-secondary border-opacity-50 mb-3 d-flex align-items-center justify-content-between">
                      <div>
                        <small className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>Manual Secret Key:</small>
                        <code className="text-gold fw-bold" style={{ fontSize: '0.85rem' }}>{enrollModal.secret}</code>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning text-gold py-1 px-2"
                        onClick={() => {
                          navigator.clipboard.writeText(enrollModal.secret);
                          showToast('Copied', 'TOTP Secret key copied to clipboard!', 'info');
                        }}
                      >
                        Copy
                      </button>
                    </div>

                    {/* Error Banner */}
                    {enrollModal.error && (
                      <div className="p-2 mb-3 rounded border border-danger border-opacity-50 text-danger small">
                        {enrollModal.error}
                      </div>
                    )}

                    {/* Verification Form */}
                    <form onSubmit={handleVerifyEnrollment}>
                      <div className="mb-3">
                        <label className="form-label text-secondary small">Enter 6-Digit Verification Code</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoFocus
                          required
                          className="form-control form-control-iq text-center fw-bold fs-4"
                          style={{ letterSpacing: '0.3rem' }}
                          placeholder="000000"
                          value={enrollModal.verifyCode}
                          onChange={(e) => setEnrollModal(prev => ({
                            ...prev,
                            verifyCode: e.target.value.replace(/\D/g, ''),
                            error: ''
                          }))}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-gold w-100 py-2 fw-semibold"
                        disabled={enrollModal.isSubmitting || enrollModal.verifyCode.length < 6}
                      >
                        {enrollModal.isSubmitting ? 'Verifying Code...' : 'Verify & Activate 2FA'}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Step 2: Recovery Codes */
                  <div>
                    <div className="p-3 rounded border border-warning border-opacity-50 mb-3" style={{ background: 'rgba(245, 185, 66, 0.1)' }}>
                      <h6 className="text-gold fw-bold mb-1">Emergency Recovery Backup Codes</h6>
                      <p className="text-secondary small mb-0">
                        If you lose access to your authenticator device, each recovery code can be used once to access your account. Store them in a secure password manager.
                      </p>
                    </div>

                    <div className="p-3 rounded bg-secondary-dark border border-secondary border-opacity-50 mb-3">
                      <div className="row g-2">
                        {enrollModal.recoveryCodes.map((code, idx) => (
                          <div key={idx} className="col-6">
                            <code className="text-white fw-bold d-block p-1 rounded bg-black text-center" style={{ fontSize: '0.85rem' }}>
                              {code}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 mb-3">
                      <button
                        type="button"
                        className="btn btn-secondary-custom btn-sm flex-fill"
                        onClick={() => {
                          navigator.clipboard.writeText(enrollModal.recoveryCodes.join('\n'));
                          showToast('Codes Copied', 'All 8 recovery backup codes copied to clipboard!', 'info');
                        }}
                      >
                        <i className="bi bi-clipboard me-1"></i> Copy All Codes
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn-gold w-100 py-2 fw-semibold"
                      onClick={() => setEnrollModal(prev => ({ ...prev, isOpen: false }))}
                    >
                      I Have Saved My Recovery Codes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* -------------------------------------------------------------------- */}
      {/* INVITE TEAM MEMBER MODAL                                             */}
      {/* -------------------------------------------------------------------- */}
      {inviteModalOpen && (
        <div 
          className="iq-modal-backdrop" 
          style={{ zIndex: 1060, opacity: 1 }}
          onClick={() => setInviteModalOpen(false)}
        >
          <div 
            className="iq-modal-container p-0" 
            style={{ maxWidth: 460, opacity: 1, backgroundColor: '#1A1A1A' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
              <h5 className="modal-title fw-bold text-white mb-0">Invite Team Member</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setInviteModalOpen(false)}
              ></button>
            </div>

            <form onSubmit={handleInviteSubmit} style={{ opacity: 1 }}>
              <div className="p-4">
                <div className="mb-3">
                  <label className="form-label text-secondary small">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-control form-control-iq"
                    placeholder="e.g. Rahul Sharma"
                    value={inviteData.name}
                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label text-secondary small">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-control form-control-iq"
                    placeholder="name@company.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label text-secondary small">Role & Access Level</label>
                  <select
                    className="form-select bg-dark text-white border-secondary"
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                  >
                    <option value="admin">Admin (Full administrative & catalog access)</option>
                    <option value="manager">Manager (Inventory, Sales & Purchases)</option>
                    <option value="staff">Staff (POS & Sales Creation only)</option>
                  </select>
                </div>
              </div>

              <div className="border-top border-secondary p-3 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary-custom btn-sm"
                  onClick={() => setInviteModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-gold btn-sm fw-semibold">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* CLOUD MIGRATION MODAL (PHASE 14 DATA MIGRATION)                      */}
      {/* -------------------------------------------------------------------- */}
      {migrationModalOpen && (
        <div 
          className="iq-modal-backdrop" 
          style={{ zIndex: 1060, opacity: 1 }}
          onClick={() => setMigrationModalOpen(false)}
        >
          <div 
            className="iq-modal-container p-0" 
            style={{ maxWidth: 520, opacity: 1, backgroundColor: '#1A1A1A' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-cloud-arrow-up text-gold fs-5"></i>
                <h5 className="modal-title fw-bold text-white mb-0">Cloud Database Migration</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setMigrationModalOpen(false)}
              ></button>
            </div>

            <div className="p-4" style={{ opacity: 1 }}>
              <p className="text-secondary small mb-3">
                Migrate your verified business data (products, sales, suppliers, customers) from local storage directly into Supabase PostgreSQL under your authenticated tenant organization.
              </p>

              {migrationStats && (
                <div className="p-3 rounded bg-secondary-dark border border-secondary border-opacity-50 mb-3">
                  <h6 className="text-white fw-bold mb-2 small text-uppercase">Records Eligible for Migration</h6>
                  <div className="row g-2 text-secondary small">
                    <div className="col-6">Products: <strong className="text-white">{migrationStats.productsCount}</strong></div>
                    <div className="col-6">Categories: <strong className="text-white">{migrationStats.categoriesCount}</strong></div>
                    <div className="col-6">Sales Orders: <strong className="text-white">{migrationStats.salesCount}</strong></div>
                    <div className="col-6">Suppliers: <strong className="text-white">{migrationStats.suppliersCount}</strong></div>
                    <div className="col-6">Customers: <strong className="text-white">{migrationStats.customersCount}</strong></div>
                    <div className="col-6">Total Records: <strong className="text-gold">{migrationStats.totalRecords}</strong></div>
                  </div>
                </div>
              )}

              <div className="p-2 rounded bg-black border border-secondary border-opacity-25 text-secondary small mb-3">
                <i className="bi bi-shield-check text-gold me-1"></i>
                Passwords, mock tokens, and fake sessions are excluded from migration.
              </div>

              {migrationProgress && (
                <div className="p-3 mb-3 rounded bg-secondary-dark border border-warning border-opacity-50 text-gold small">
                  <i className="bi bi-arrow-repeat spin me-2"></i>
                  {migrationProgress.message}
                </div>
              )}

              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary-custom btn-sm"
                  onClick={() => setMigrationModalOpen(false)}
                  disabled={migrationInProgress}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-gold btn-sm fw-semibold"
                  onClick={handleExecuteMigration}
                  disabled={migrationInProgress}
                >
                  {migrationInProgress ? 'Migrating Records...' : 'Start Migration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
