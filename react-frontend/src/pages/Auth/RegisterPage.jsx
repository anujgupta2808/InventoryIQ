import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';

export const RegisterPage = () => {
  const { setCurrentPage, register, showToast } = useInventory();
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
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOrgName = organizationName.trim();
    const cleanOrgType = organizationType.trim();
    const cleanGstin = gstin.trim().toUpperCase();

    if (cleanName.length < 2) {
      showToast('Validation Error', 'Full Name must be at least 2 characters long.', 'danger');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showToast('Validation Error', 'Please enter a valid email address (e.g. name@company.com).', 'danger');
      return;
    }

    if (cleanOrgName.length < 2) {
      showToast('Validation Error', 'Please enter your Organization or Business Name.', 'danger');
      return;
    }

    // Optional GSTIN format validation (15-character standard GSTIN format if provided)
    if (cleanGstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(cleanGstin)) {
        showToast(
          'Invalid GSTIN Format',
          'GSTIN must be a 15-character valid code (e.g. 07AAAAA0000A1Z5) or left empty.',
          'danger'
        );
        return;
      }
    }

    if (password.length < 6) {
      showToast('Validation Error', 'Password must be at least 6 characters long.', 'danger');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Validation Error', 'Password and Confirm Password do not match.', 'danger');
      return;
    }

    if (!agreeTerms) {
      showToast('Terms Required', 'Please accept the Terms of Service to register your account.', 'warning');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = register({
        fullName: cleanName,
        email: cleanEmail,
        organizationName: cleanOrgName,
        organizationType: cleanOrgType,
        gstin: cleanGstin,
        password
      });
      if (!res || !res.success) {
        setLoading(false);
      }
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
            <p className="auth-showcase-desc">Register your enterprise workspace and start tracking stock, GST tax invoices, and sales with ease.</p>
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
            <p className="auth-subtitle">Register your organization & setup commercial catalog</p>
          </div>

          <form onSubmit={handleSubmit}>
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
                    className="form-control-iq"
                    placeholder="e.g. Anuj Gupta"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                    className="form-control-iq"
                    placeholder="name@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setOrganizationName(e.target.value)}
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
                    15-digit Tax ID for GST Invoices
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
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
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
                    className="form-control-iq"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
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
                onChange={(e) => setAgreeTerms(e.target.checked)}
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
              className="btn-gold w-100 py-2 fw-semibold mb-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Setting Up Workspace...
                </>
              ) : (
                'Register Organization & Workspace'
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
