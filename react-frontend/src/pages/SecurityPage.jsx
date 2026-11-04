import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const SecurityPage = () => {
  const {
    sessions,
    revokeSession,
    revokeAllOtherSessions,
    auditLogs,
    openConfirm,
    showToast,
    logout
  } = useInventory();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  const handleRevoke = (s) => {
    if (s.current) {
      openConfirm({
        title: 'Sign Out Current Device',
        message: 'This will terminate your current session on this device and return you to the login screen. Do you want to proceed?',
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
      message: `Are you sure you want to disconnect "${s.device}" (${s.ip})? This remote device session will be signed out immediately.`,
      confirmText: 'Revoke Session',
      confirmVariant: 'danger',
      onConfirm: () => {
        revokeSession(s.id);
      }
    });
  };

  const handleToggle2FA = () => {
    const nextState = !twoFactorEnabled;
    setTwoFactorEnabled(nextState);
    showToast('2FA Status', nextState ? 'Two-Factor Authentication has been activated.' : 'Two-Factor Authentication disabled.', nextState ? 'success' : 'warning');
  };

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    log.user.toLowerCase().includes(logSearch.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(logSearch.toLowerCase()))
  );

  const otherSessionsCount = sessions.filter(s => !s.current).length;

  return (
    <div className="security-page animate-fade-in">
      <div className="mb-4">
        <h2 className="page-title text-white fw-bold mb-1">Security Center</h2>
        <p className="page-subtitle text-secondary mb-0">Active sessions, device security, audit logs and role policies</p>
      </div>

      {/* 2FA & Security Overview */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6">
          <div className="card-custom p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h5 className="text-white fw-bold mb-1">Two-Factor Authentication</h5>
                <small className="text-secondary">Protect account access with 6-digit TOTP code</small>
              </div>
              <span className={`badge ${twoFactorEnabled ? 'badge-success' : 'badge-warning'}`}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-secondary small">
              When 2FA is active, signing in requires your password and a temporary verification code generated on your mobile authenticator app.
            </p>
            <button
              type="button"
              className={`btn ${twoFactorEnabled ? 'btn-secondary-custom' : 'btn-gold'} btn-sm`}
              onClick={handleToggle2FA}
            >
              <i className={`bi ${twoFactorEnabled ? 'bi-shield-slash' : 'bi-shield-check'} me-1`}></i>
              {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA Protection'}
            </button>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card-custom p-4 h-100">
            <h5 className="text-white fw-bold mb-1">Password & Policy</h5>
            <small className="text-secondary d-block mb-3">Organizational password compliance rules</small>
            <ul className="list-unstyled text-secondary small m-0 p-0 d-flex flex-column gap-2">
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-check2 text-gold"></i> Minimum length: 8 characters
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-check2 text-gold"></i> Must contain uppercase, lowercase & digits
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-check2 text-gold"></i> Session expires after 30 days of inactivity
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Device Sessions */}
      <div className="card-custom p-4 mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div>
            <h5 className="text-white fw-bold mb-1 d-flex align-items-center gap-2">
              <span>Active Device Sessions</span>
              <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                {sessions.length}
              </span>
            </h5>
            <small className="text-secondary">Devices and browsers currently logged into this InventoryIQ tenant</small>
          </div>

          {otherSessionsCount > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2"
              onClick={() => {
                openConfirm({
                  title: 'Revoke All Other Sessions',
                  message: `Are you sure you want to disconnect ${otherSessionsCount} other device(s)? Only this browser session will stay active.`,
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
              No active device sessions recorded.
            </div>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                className="d-flex align-items-center justify-content-between p-3 rounded bg-secondary-dark flex-wrap gap-2 border border-secondary border-opacity-25"
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="text-gold fs-3">
                    <i className={`bi ${s.device && (s.device.includes('iPhone') || s.device.includes('Mobile') || s.device.includes('Android')) ? 'bi-phone' : 'bi-laptop'}`}></i>
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

      {/* Audit Logs Viewer */}
      <div className="card-custom p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h5 className="text-white fw-bold mb-1">Audit Trail & Security Logs</h5>
            <small className="text-secondary">Immutable ledger of administrative and sales actions</small>
          </div>
          <div style={{ maxWidth: 280 }} className="iq-search-bar">
            <i className="bi bi-search iq-search-icon"></i>
            <input
              type="text"
              className="form-control iq-search-input"
              placeholder="Search audit trail..."
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
                <th>IP Address</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-secondary">
                    No security audit logs match your filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="border-bottom border-secondary">
                    <td className="fw-medium text-white">{log.action}</td>
                    <td>{log.user}</td>
                    <td><span className="badge badge-secondary">{log.role}</span></td>
                    <td className="text-secondary">{log.timestamp}</td>
                    <td className="text-muted small">{log.ip}</td>
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
    </div>
  );
};

