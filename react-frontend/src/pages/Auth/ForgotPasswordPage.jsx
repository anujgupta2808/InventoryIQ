import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';

export const ForgotPasswordPage = () => {
  const { setCurrentPage, showToast } = useInventory();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    showToast('Link Sent', `Password reset instructions dispatched to ${email}.`, 'info');
  };

  return (
    <div className="auth-page-wrapper">
      <div className="iq-card p-4 p-md-5" style={{ maxWidth: 480, width: '100%', borderColor: 'var(--border-gold)' }}>
        <div className="text-center mb-4">
          <img src="/logo.svg" alt="InventoryIQ" style={{ width: 44, height: 44 }} className="mx-auto mb-3" />
          <h3 className="auth-title">Forgot Password?</h3>
          <p className="auth-subtitle">
            Enter your email and we'll send you instructions to reset your account password.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-3">
            <div className="status-pill status-success p-3 rounded-circle d-inline-block mb-3" style={{ fontSize: '1.5rem' }}>
              <i className="bi bi-envelope-check-fill"></i>
            </div>
            <h5 className="text-white fw-bold mb-2">Check Your Inbox</h5>
            <p className="text-secondary small mb-4">
              We sent a verification link to <strong className="text-white">{email}</strong>.
            </p>
            <div className="d-flex flex-column gap-2">
              <button
                type="button"
                className="btn-gold w-100"
                onClick={() => setCurrentPage('reset-password')}
              >
                Proceed to Reset Password
              </button>
              <button
                type="button"
                className="btn-dark-custom w-100"
                onClick={() => setCurrentPage('login')}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label" htmlFor="resetEmail">Registered Email</label>
              <div className="input-icon-group">
                <i className="bi bi-envelope input-icon-left"></i>
                <input
                  id="resetEmail"
                  type="email"
                  required
                  className="form-control-iq"
                  placeholder="admin@inventoryiq.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-gold w-100 py-2 fw-semibold mb-3">
              Send Reset Link
            </button>

            <div className="text-center">
              <button
                type="button"
                className="btn btn-link p-0 text-secondary text-decoration-none small"
                onClick={() => setCurrentPage('login')}
              >
                <i className="bi bi-arrow-left me-1"></i> Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
