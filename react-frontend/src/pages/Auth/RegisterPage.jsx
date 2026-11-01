import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';

export const RegisterPage = () => {
  const { setCurrentPage, register, showToast } = useInventory();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

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
    if (!agreeTerms) {
      showToast('Terms Required', 'Please accept the terms and conditions.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Validation Error', 'Passwords do not match.', 'danger');
      return;
    }
    if (password.length < 6) {
      showToast('Validation Error', 'Password must be at least 6 characters.', 'danger');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      register({ fullName, email, password });
      setLoading(false);
    }, 250);
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        {/* Left Side: Brand Showcase */}
        <div className="auth-showcase">
          <div className="brand-wrapper">
            <img src="./logo.svg" alt="InventoryIQ" className="brand-logo-img" />
            <div className="brand-text-block">
              <span className="brand-name">Inventory<span>IQ</span></span>
              <span className="brand-tagline">Smart Inventory. Smarter Business.</span>
            </div>
          </div>

          <div className="auth-showcase-hero">
            <h2 className="auth-showcase-title">Start Your Journey with InventoryIQ</h2>
            <p className="auth-showcase-desc">Create your business workspace and start managing inventory, sales, and suppliers with ease.</p>
            <img src="./hero-register.svg" alt="InventoryIQ Registration" className="auth-showcase-img" />
          </div>

          <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
            <span><i className="bi bi-shield-check text-gold me-1"></i> 256-Bit SSL Encrypted</span>
            <span>v2.0 Commercial</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="auth-card-panel">
          <div className="auth-header">
            <h3 className="auth-title">Create Account</h3>
            <p className="auth-subtitle">Join us today to set up your business catalog!</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <div className="input-icon-group">
                <i className="bi bi-person input-icon-left"></i>
                <input
                  id="fullName"
                  type="text"
                  required
                  className="form-control-iq"
                  placeholder="e.g. Anuj Gupta"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-icon-group">
                <i className="bi bi-envelope input-icon-left"></i>
                <input
                  id="email"
                  type="email"
                  required
                  className="form-control-iq"
                  placeholder="name@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-icon-group">
                <i className="bi bi-lock input-icon-left"></i>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-control-iq"
                  placeholder="At least 6 characters"
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

            <div className="mb-3">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-icon-group">
                <i className="bi bi-shield-lock input-icon-left"></i>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  className="form-control-iq"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-check-iq mb-4">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <label htmlFor="agreeTerms">
                I agree to the <span style={{ color: 'var(--primary-accent)' }}>Terms of Service</span> and <span style={{ color: 'var(--primary-accent)' }}>Privacy Policy</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn-gold w-100 py-2 fw-semibold mb-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Setting Up Workspace...
                </>
              ) : (
                'Register Account'
              )}
            </button>

            <div className="text-center text-secondary small">
              Already have an account?{' '}
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold"
                style={{ color: 'var(--primary-accent)', fontSize: '0.875rem' }}
                onClick={() => setCurrentPage('login')}
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
