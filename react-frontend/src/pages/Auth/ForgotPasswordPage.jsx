import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';

export const ForgotPasswordPage = () => {
  const {
    setCurrentPage,
    requestPasswordReset,
    showToast,
    isAuthenticated,
    prefillEmail
  } = useInventory();

  const [email, setEmail] = useState(prefillEmail || '');
  const [submitted, setSubmitted] = useState(false);
  const [recoveryDetails, setRecoveryDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, setCurrentPage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = String(email || '').trim().toLowerCase();

    // 1. Empty field validation
    if (!cleanEmail) {
      const msg = 'Please enter your registered email address.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const msg = 'Please enter a valid email address (e.g. name@company.com).';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(cleanEmail);
      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="iq-card p-4 p-md-5" style={{ maxWidth: 490, width: '100%', borderColor: 'var(--border-gold)' }}>
        <div className="text-center mb-4">
          <img src="./logo.svg" alt="InventoryIQ" style={{ width: 44, height: 44 }} className="mx-auto mb-3" />
          <h3 className="auth-title">Forgot Password?</h3>
          <p className="auth-subtitle">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        {/* Inline Error Banner */}
        {errorMessage && (
          <div className="p-2 mb-3 rounded border border-danger border-opacity-50 d-flex align-items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#FCA5A5', fontSize: '0.84rem' }}>
            <i className="bi bi-exclamation-triangle-fill text-danger flex-shrink-0"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        {submitted ? (
          <div className="text-center py-2">
            <div
              className="p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: 64,
                height: 64,
                background: 'rgba(245, 185, 66, 0.15)',
                color: 'var(--primary-accent)',
                fontSize: '1.8rem',
                border: '1px solid rgba(245, 185, 66, 0.4)'
              }}
            >
              <i className="bi bi-envelope-check-fill"></i>
            </div>

            <h5 className="text-white fw-bold mb-2">Instructions Sent</h5>

            <div className="p-3 mb-4 rounded border border-secondary border-opacity-50 text-start" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
              <p className="text-secondary small mb-0">
                If an account exists with this email address, password recovery instructions have been sent. Please check your inbox and click the recovery link to set a new password.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-gold w-100 py-2 d-flex align-items-center justify-content-center gap-2"
              onClick={() => setCurrentPage('login')}
            >
              <i className="bi bi-arrow-left"></i>
              <span>Back to Sign In</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label mb-0" htmlFor="resetEmail">Registered Email *</label>
                {!import.meta.env.PROD && (
                  <button
                    type="button"
                    className="btn btn-link p-0 text-gold text-decoration-none"
                    style={{ fontSize: '0.75rem' }}
                    onClick={handleFillDemo}
                  >
                    Use Demo Admin Email
                  </button>
                )}
              </div>
              <div className="input-icon-group">
                <i className="bi bi-envelope input-icon-left"></i>
                <input
                  id="resetEmail"
                  type="email"
                  required
                  autoComplete="email"
                  className="form-control-iq"
                  placeholder="admin@inventoryiq.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-gold w-100 py-2 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Verifying Account...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-send-check"></i>
                  <span>Send Reset Link</span>
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                className="btn btn-link p-0 text-secondary text-decoration-none small"
                onClick={() => setCurrentPage('login')}
              >
                <i className="bi bi-arrow-left me-1"></i> Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
