import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export const ResetPasswordPage = () => {
  const {
    setCurrentPage,
    demoResetSession,
    resetPassword,
    showToast,
    isAuthenticated
  } = useInventory();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, setCurrentPage]);

  // In production with Supabase, active recovery session is managed via Supabase Auth
  const isSessionValid = isSupabaseConfigured() || Boolean(
    demoResetSession &&
    demoResetSession.email &&
    Date.now() <= (demoResetSession.expiresAt || 0)
  );

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(password);
  const strengthColor = strength >= 75 ? 'var(--success)' : strength >= 50 ? 'var(--warning)' : 'var(--danger)';
  const strengthLabel = strength >= 75 ? 'Strong' : strength >= 50 ? 'Medium' : 'Weak';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isSessionValid) {
      const msg = 'No active recovery session found. Please start recovery from Forgot Password.';
      setErrorMessage(msg);
      showToast('Session Expired', msg, 'danger');
      return;
    }

    // Minimum 8 characters validation
    if (password.length < 8) {
      const msg = 'New password must contain at least 8 characters.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    // Confirmation matching validation
    if (password !== confirmPassword) {
      const msg = 'New Password and Confirm Password do not match.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ newPassword: password, confirmPassword });
      if (!res.success) {
        setErrorMessage(res.message || 'Failed to update password.');
      }
      // Note: On success, resetPassword() automatically updates PBKDF2 hash, sets prefillEmail, and redirects to 'login'
    } catch (err) {
      console.error('Password reset error:', err);
      const msg = 'An unexpected error occurred while resetting password.';
      setErrorMessage(msg);
      showToast('System Error', msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="iq-card p-4 p-md-5" style={{ maxWidth: 490, width: '100%', borderColor: 'var(--border-gold)' }}>
        <div className="text-center mb-4">
          <img src="./logo.svg" alt="InventoryIQ" style={{ width: 44, height: 44 }} className="mx-auto mb-3" />
          <h3 className="auth-title">Set New Password</h3>
          <p className="auth-subtitle">
            Choose a strong, 8+ character password for your account.
          </p>
        </div>

        {/* Guard: If no valid simulated recovery request exists */}
        {!isSessionValid ? (
          <div className="text-center py-3">
            <div
              className="p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: 60,
                height: 60,
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--danger)',
                fontSize: '1.75rem',
                border: '1px solid rgba(239, 68, 68, 0.35)'
              }}
            >
              <i className="bi bi-shield-x"></i>
            </div>
            <h5 className="text-white fw-bold mb-2">Recovery Request Required</h5>
            <p className="text-secondary small mb-4">
              Direct arbitrary password resets are restricted. You must initiate a simulated recovery session via Forgot Password before resetting your credentials.
            </p>
            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                className="btn-gold w-100 py-2 fw-semibold"
                onClick={() => setCurrentPage('forgot-password')}
              >
                Go to Forgot Password
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => setCurrentPage('login')}
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Verified Target Account Banner */}
            <div className="p-3 mb-3 rounded bg-secondary-dark border border-secondary border-opacity-50">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                  <i className="bi bi-check-circle-fill me-1"></i>Verified Recovery Session
                </span>
                <span className="text-secondary" style={{ fontSize: '0.72rem' }}>15-min token</span>
              </div>
              <div className="text-white small fw-semibold">
                Target: {demoResetSession?.email}
              </div>
              <p className="text-secondary mb-0 mt-1" style={{ fontSize: '0.72rem' }}>
                Simulated reset mechanism. Not equivalent to verified email recovery.
              </p>
            </div>

            {/* Inline Error Banner */}
            {errorMessage && (
              <div className="p-2 mb-3 rounded border border-danger border-opacity-50 d-flex align-items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#FCA5A5', fontSize: '0.84rem' }}>
                <i className="bi bi-exclamation-triangle-fill text-danger flex-shrink-0"></i>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* New Password */}
              <div className="mb-3">
                <label className="form-label" htmlFor="newPass">New Password *</label>
                <div className="input-icon-group">
                  <i className="bi bi-lock input-icon-left"></i>
                  <input
                    id="newPass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    className="form-control-iq"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2">
                    <div className="strength-meter">
                      <div
                        className="strength-bar"
                        style={{ width: `${strength}%`, backgroundColor: strengthColor }}
                      ></div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-1" style={{ fontSize: '0.75rem' }}>
                      <span className="text-secondary">Password Security:</span>
                      <span className="fw-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="mb-4">
                <label className="form-label" htmlFor="confirmPass">Confirm New Password *</label>
                <div className="input-icon-group">
                  <i className="bi bi-shield-lock input-icon-left"></i>
                  <input
                    id="confirmPass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    className="form-control-iq"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-gold w-100 py-2 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Re-Hashing Credentials...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-key-fill"></i>
                    <span>Update & Proceed to Sign In</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  className="btn btn-link p-0 text-secondary text-decoration-none small"
                  onClick={() => setCurrentPage('login')}
                >
                  <i className="bi bi-arrow-left me-1"></i> Cancel and Return to Login
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
