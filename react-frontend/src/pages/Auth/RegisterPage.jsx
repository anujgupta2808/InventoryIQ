import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';

export const RegisterPage = () => {
  const { setCurrentPage, register, showToast, isAuthenticated } = useInventory();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('Retail Store / Shop');
  const [gstin, setGstin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, setCurrentPage]);

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

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOrgName = organizationName.trim();
    const cleanOrgType = organizationType.trim();
    const cleanGstin = gstin.trim().toUpperCase();

    // 1. Validate Full Name
    if (cleanName.length < 2) {
      const msg = 'Full Name must be at least 2 characters long.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    // 2. Validate Email Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const msg = 'Please enter a valid email address (e.g. name@company.com).';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    // 3. Validate Organization Name
    if (cleanOrgName.length < 2) {
      const msg = 'Please enter your Organization or Business Name.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    // 4. Validate GSTIN (Optional, but if entered must match 15-character standard format)
    if (cleanGstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(cleanGstin)) {
        const msg = 'GSTIN must be a 15-character valid code (e.g. 07AAAAA0000A1Z5) or left empty.';
        setErrorMessage(msg);
        showToast('Invalid GSTIN Format', msg, 'danger');
        return;
      }
    }

    // 5. Validate Password minimum 8 characters
    if (password.length < 8) {
      const msg = 'Password must contain at least 8 characters.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    // 6. Validate Password Confirmation
    if (password !== confirmPassword) {
      const msg = 'Password and Confirm Password do not match.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    // 7. Validate Terms Acceptance
    if (!agreeTerms) {
      const msg = 'Please accept the Terms of Service and Privacy Policy to register.';
      setErrorMessage(msg);
      showToast('Terms Required', msg, 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        fullName: cleanName,
        email: cleanEmail,
        organizationName: cleanOrgName,
        organizationType: cleanOrgType,
        gstin: cleanGstin,
        password
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Registration failed.');
      }
      // Note: On success, register() automatically sets prefillEmail and redirects to 'login'
    } catch (err) {
      console.error('Registration error:', err);
      const msg = 'An unexpected error occurred during registration. Please try again.';
      setErrorMessage(msg);
      showToast('System Error', msg, 'danger');
    } finally {
      setLoading(false);
    }
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
            <p className="auth-showcase-desc">Register your enterprise workspace and start tracking stock, GST tax invoices, supplier POs, and party dues with ease.</p>
            <img src="./hero-register.svg" alt="InventoryIQ Registration" className="auth-showcase-img" />
          </div>

          <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
            <span><i className="bi bi-shield-check text-gold me-1"></i> Web Crypto PBKDF2 Hashing</span>
            <span>v2.1 Enterprise</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="auth-card-panel">
          <div className="auth-header">
            <h3 className="auth-title">Create Account</h3>
            <p className="auth-subtitle">Register your organization & setup commercial catalog</p>
          </div>

          {/* Inline Error Banner */}
          {errorMessage && (
            <div className="p-2 mb-3 rounded border border-danger border-opacity-50 d-flex align-items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#FCA5A5', fontSize: '0.84rem' }}>
              <i className="bi bi-exclamation-triangle-fill text-danger flex-shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-2">
              {/* Full Name */}
              <div className="col-12 col-md-6 mb-2">
                <label className="form-label small" htmlFor="fullName">Full Name *</label>
                <div className="input-icon-group">
                  <i className="bi bi-person input-icon-left"></i>
                  <input
                    id="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    className="form-control-iq"
                    placeholder="e.g. Anuj Gupta"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="col-12 col-md-6 mb-2">
                <label className="form-label small" htmlFor="email">Email Address *</label>
                <div className="input-icon-group">
                  <i className="bi bi-envelope input-icon-left"></i>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="form-control-iq"
                    placeholder="name@business.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </div>
              </div>

              {/* Organization Name */}
              <div className="col-12 col-md-6 mb-2">
                <label className="form-label small" htmlFor="organizationName">Organization Name *</label>
                <div className="input-icon-group">
                  <i className="bi bi-building input-icon-left"></i>
                  <input
                    id="organizationName"
                    type="text"
                    required
                    className="form-control-iq"
                    placeholder="e.g. Apex Enterprises Pvt Ltd"
                    value={organizationName}
                    onChange={(e) => {
                      setOrganizationName(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </div>
              </div>

              {/* Type of Organization */}
              <div className="col-12 col-md-6 mb-2">
                <label className="form-label small" htmlFor="organizationType">Organization Type *</label>
                <div className="input-icon-group">
                  <i className="bi bi-briefcase input-icon-left"></i>
                  <select
                    id="organizationType"
                    className="form-select-iq"
                    style={{ paddingLeft: '2.75rem' }}
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

              {/* GSTIN Number (Optional) */}
              <div className="col-12 mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small mb-0" htmlFor="gstin">
                    GSTIN Number <span className="text-secondary">(Optional)</span>
                  </label>
                  <span className="text-secondary" style={{ fontSize: '0.72rem' }}>
                    15-digit Tax Code for Invoices
                  </span>
                </div>
                <div className="input-icon-group">
                  <i className="bi bi-card-heading input-icon-left"></i>
                  <input
                    id="gstin"
                    type="text"
                    maxLength={15}
                    className="form-control-iq text-uppercase"
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => {
                      setGstin(e.target.value.toUpperCase());
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="col-12 col-md-6 mb-2">
                <label className="form-label small" htmlFor="password">Password *</label>
                <div className="input-icon-group">
                  <i className="bi bi-lock input-icon-left"></i>
                  <input
                    id="password"
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
              </div>

              {/* Confirm Password */}
              <div className="col-12 col-md-6 mb-2">
                <label className="form-label small" htmlFor="confirmPassword">Confirm Password *</label>
                <div className="input-icon-group">
                  <i className="bi bi-shield-lock input-icon-left"></i>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    className="form-control-iq"
                    placeholder="Repeat password"
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
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="mt-1 mb-3">
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

            {/* Terms & Conditions Checkbox */}
            <div className="form-check-iq my-3">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errorMessage) setErrorMessage('');
                }}
              />
              <label htmlFor="agreeTerms" style={{ fontSize: '0.85rem' }}>
                I agree to the{' '}
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none fw-semibold"
                  style={{ color: 'var(--primary-accent)', fontSize: 'inherit', verticalAlign: 'baseline' }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage('terms'); }}
                >
                  Terms of Service
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none fw-semibold"
                  style={{ color: 'var(--primary-accent)', fontSize: 'inherit', verticalAlign: 'baseline' }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage('privacy'); }}
                >
                  Privacy Policy
                </button>
              </label>
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
                  <span>Deriving PBKDF2 Credentials...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-person-check-fill"></i>
                  <span>Register Organization & Workspace</span>
                </>
              )}
            </button>

            {/* Link to Login */}
            <div className="text-center text-secondary small">
              Already have an account?{' '}
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none fw-semibold"
                style={{ color: 'var(--primary-accent)', fontSize: '0.875rem' }}
                onClick={() => setCurrentPage('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
