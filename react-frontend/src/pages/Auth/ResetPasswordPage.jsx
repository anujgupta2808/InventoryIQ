import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';

export const ResetPasswordPage = () => {
  const { setCurrentPage, showToast } = useInventory();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length > 7) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(password);
  const strengthColor = strength >= 75 ? 'var(--success)' : strength >= 50 ? 'var(--warning)' : 'var(--danger)';
  const strengthLabel = strength >= 75 ? 'Strong' : strength >= 50 ? 'Medium' : 'Weak';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('Validation Error', 'Passwords do not match.', 'danger');
      return;
    }
    if (password.length < 8) {
      showToast('Validation Error', 'Password must be at least 8 characters long.', 'danger');
      return;
    }
    showToast('Success!', 'Your password has been reset. Please sign in with your new credentials.');
    setCurrentPage('login');
  };

  return (
    <div className="auth-page-wrapper">
      <div className="iq-card p-4 p-md-5" style={{ maxWidth: 480, width: '100%', borderColor: 'var(--border-gold)' }}>
        <div className="text-center mb-4">
          <img src="/logo.svg" alt="InventoryIQ" style={{ width: 44, height: 44 }} className="mx-auto mb-3" />
          <h3 className="auth-title">Set New Password</h3>
          <p className="auth-subtitle">
            Please choose a secure and strong password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="newPass">New Password</label>
            <div className="input-icon-group">
              <i className="bi bi-lock input-icon-left"></i>
              <input
                id="newPass"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-control-iq"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>

            {password && (
              <div className="mt-2">
                <div className="strength-meter">
                  <div
                    className="strength-bar"
                    style={{ width: `${strength}%`, backgroundColor: strengthColor }}
                  ></div>
                </div>
                <span className="strength-text" style={{ color: strengthColor }}>
                  Strength: {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="confirmPass">Confirm New Password</label>
            <div className="input-icon-group">
              <i className="bi bi-shield-lock input-icon-left"></i>
              <input
                id="confirmPass"
                type="password"
                required
                className="form-control-iq"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-gold w-100 py-2 fw-semibold mb-3">
            Update & Sign In
          </button>

          <div className="text-center">
            <button
              type="button"
              className="btn btn-link p-0 text-secondary text-decoration-none small"
              onClick={() => setCurrentPage('login')}
            >
              Cancel and Return to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
