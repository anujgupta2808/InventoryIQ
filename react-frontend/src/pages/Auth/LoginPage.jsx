import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export const LoginPage = () => {
  const {
    setCurrentPage,
    login,
    verifyLoginMFA,
    showToast,
    isAuthenticated,
    prefillEmail
  } = useInventory();

  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // MFA Challenge State
  const [isMFAChallenge, setIsMFAChallenge] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // If user is already authenticated, redirect to dashboard immediately
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, setCurrentPage]);

  // Sync prefillEmail if it changes (e.g. redirected from registration or password reset)
  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
      setPassword('');
      setErrorMessage('');
    }
  }, [prefillEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    // Validate email
    if (!cleanEmail) {
      const msg = 'Please enter your email address.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const msg = 'Please enter a valid email address (e.g. name@company.com).';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    // Validate password
    if (!cleanPass) {
      const msg = 'Please enter your account password.';
      setErrorMessage(msg);
      showToast('Validation Error', msg, 'danger');
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email: cleanEmail, password: cleanPass, rememberMe });
      if (!res.success) {
        setErrorMessage(res.message || 'Authentication failed. Please verify credentials.');
      } else if (res.requiresMFA) {
        setIsMFAChallenge(true);
        setMfaFactorId(res.factorId);
        setMfaCode('');
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = 'An unexpected error occurred during sign-in. Please try again.';
      setErrorMessage(msg);
      showToast('System Error', msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleMFASubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanCode = String(mfaCode || '').trim();
    if (!cleanCode || cleanCode.length < 6) {
      const msg = 'Please enter the 6-digit TOTP code from your authenticator app.';
      setErrorMessage(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await verifyLoginMFA({ factorId: mfaFactorId, code: cleanCode });
      if (!res.success) {
        setErrorMessage(res.message || 'Verification failed. Please check your authenticator code.');
      }
    } catch (err) {
      setErrorMessage('MFA verification error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    const msg = 'Social authentication is available in a future release.';
    setErrorMessage('');
    showToast(`${provider} Login`, msg, 'info');
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
            <h2 className="auth-showcase-title">Manage Your Business Effortlessly</h2>
            <p className="auth-showcase-desc">Track real-time stock, record client sales, monitor dues, issue GST tax invoices, and grow your enterprise.</p>
            <img src="./hero-box.svg" alt="InventoryIQ 3D Stock" className="auth-showcase-img" />
          </div>

          <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
            <span><i className="bi bi-shield-check text-gold me-1"></i> Production Security Engine</span>
            <span>v2.1 Enterprise</span>
          </div>
        </div>

        {/* Right Side: Sign-In Form or TOTP MFA Step */}
        <div className="auth-card-panel">
          {isMFAChallenge ? (
            /* MFA Verification Step */
            <div>
              <div className="auth-header text-center mb-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: '56px', height: '56px', background: 'rgba(245, 185, 66, 0.15)', border: '1px solid rgba(245, 185, 66, 0.3)' }}
                >
                  <i className="bi bi-shield-lock text-gold" style={{ fontSize: '1.75rem' }}></i>
                </div>
                <h3 className="auth-title">Two-Factor Authentication</h3>
                <p className="auth-subtitle">Enter the 6-digit verification code from your authenticator application</p>
              </div>

              {errorMessage && (
                <div className="p-2 mb-3 rounded border border-danger border-opacity-50 d-flex align-items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#FCA5A5', fontSize: '0.84rem' }}>
                  <i className="bi bi-exclamation-triangle-fill text-danger flex-shrink-0"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleMFASubmit}>
                <div className="mb-4">
                  <label className="form-label text-center d-block" htmlFor="mfaCode">6-Digit Authenticator Code</label>
                  <input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    required
                    className="form-control-iq text-center fw-bold"
                    style={{ fontSize: '1.6rem', letterSpacing: '0.4rem' }}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => {
                      setMfaCode(e.target.value.replace(/\D/g, ''));
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                  <small className="text-secondary d-block text-center mt-2">
                    Check Google Authenticator, Authy, or Microsoft Authenticator
                  </small>
                </div>

                <button
                  type="submit"
                  className="btn-gold w-100 py-2 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
                  disabled={loading || mfaCode.length < 6}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Verifying TOTP...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check"></i>
                      <span>Verify & Access Account</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary-custom w-100 py-2 small"
                  onClick={() => {
                    setIsMFAChallenge(false);
                    setErrorMessage('');
                  }}
                >
                  Back to Password Sign In
                </button>
              </form>
            </div>
          ) : (
            /* Primary Sign-In Form */
            <div>
              <div className="auth-header">
                <h3 className="auth-title">Welcome Back!</h3>
                <p className="auth-subtitle">Sign in to your InventoryIQ workspace</p>
              </div>

              {/* Production Configuration Guard */}
              {import.meta.env.PROD && !isSupabaseConfigured() && (
                <div className="p-3 mb-3 rounded border border-warning border-opacity-50 text-start" style={{ background: 'rgba(245, 185, 66, 0.12)' }}>
                  <div className="fw-semibold text-gold small mb-1">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>Production Database Required
                  </div>
                  <p className="text-secondary small mb-0">
                    Supabase backend connection is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect your PostgreSQL workspace. Insecure demo fallback is disabled in production.
                  </p>
                </div>
              )}

              {/* Inline Error Banner */}
              {errorMessage && (
                <div className="p-2 mb-3 rounded border border-danger border-opacity-50 d-flex align-items-center gap-2" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#FCA5A5', fontSize: '0.84rem' }}>
                  <i className="bi bi-exclamation-triangle-fill text-danger flex-shrink-0"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Email Field */}
                <div className="mb-3">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <div className="input-icon-group">
                    <i className="bi bi-envelope input-icon-left"></i>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="form-control-iq"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="mb-3">
                  <label className="form-label" htmlFor="password">Password</label>
                  <div className="input-icon-group">
                    <i className="bi bi-lock input-icon-left"></i>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      className="form-control-iq"
                      placeholder="••••••••"
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

                {/* Remember Me & Forgot Password Navigation */}
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                  <div className="form-check-iq">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="rememberMe">Remember me</label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none"
                    style={{ color: 'var(--primary-accent)', fontSize: '0.85rem' }}
                    onClick={() => setCurrentPage('forgot-password')}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn-gold w-100 py-2 fw-semibold mb-4 d-flex align-items-center justify-content-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right"></i>
                      <span>Sign In</span>
                    </>
                  )}
                </button>

                {/* Social Authentication */}
                <div className="auth-divider">or continue with</div>

                <div className="social-login-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <button
                    type="button"
                    className="social-btn d-flex align-items-center justify-content-center gap-2 text-white"
                    title="Continue with Google (Demo Notice)"
                    onClick={() => handleSocialLogin('Google')}
                  >
                    <i className="bi bi-google text-danger"></i>
                    <span className="small fw-medium">Google</span>
                  </button>
                  <button
                    type="button"
                    className="social-btn d-flex align-items-center justify-content-center gap-2 text-white"
                    title="Continue with Microsoft (Demo Notice)"
                    onClick={() => handleSocialLogin('Microsoft')}
                  >
                    <i className="bi bi-microsoft text-info"></i>
                    <span className="small fw-medium">Microsoft</span>
                  </button>
                </div>

                {/* Register Link */}
                <div className="text-center text-secondary small mb-3">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none fw-semibold"
                    style={{ color: 'var(--primary-accent)', fontSize: '0.875rem' }}
                    onClick={() => setCurrentPage('register')}
                  >
                    Register
                  </button>
                </div>

                {/* Legal Links */}
                <div className="text-center text-muted border-top border-secondary border-opacity-50 pt-3" style={{ fontSize: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-secondary text-decoration-none small me-2"
                    onClick={() => setCurrentPage('terms')}
                  >
                    Terms of Service
                  </button>
                  •
                  <button
                    type="button"
                    className="btn btn-link p-0 text-secondary text-decoration-none small ms-2"
                    onClick={() => setCurrentPage('privacy')}
                  >
                    Privacy Policy
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
