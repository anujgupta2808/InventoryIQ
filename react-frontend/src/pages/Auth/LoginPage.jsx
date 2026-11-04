import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';

export const LoginPage = () => {
  const { setCurrentPage, login, showToast } = useInventory();
  const [email, setEmail] = useState('admin@inventoryiq.com');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Validation Error', 'Please enter email and password.', 'danger');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      login({ email, password, rememberMe });
      setLoading(false);
    }, 250);
  };

  const handleDemoLogin = () => {
    setEmail('admin@inventoryiq.com');
    setPassword('admin');
    login({ email: 'admin@inventoryiq.com', password: 'admin', rememberMe: true });
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
            <p className="auth-showcase-desc">Track real-time inventory, record sales, issue tax invoices, and grow your business.</p>
            <img src="./hero-box.svg" alt="InventoryIQ 3D Boxes" className="auth-showcase-img" />
          </div>

          <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
            <span><i className="bi bi-shield-check text-gold me-1"></i> 256-Bit SSL Encrypted Session</span>
            <span>v2.0 Commercial</span>
          </div>
        </div>

        {/* Right Side: Sign-In Form */}
        <div className="auth-card-panel">
          <div className="auth-header">
            <h3 className="auth-title">Welcome Back!</h3>
            <p className="auth-subtitle">Sign in to your account</p>
          </div>

          {/* Quick Demo Helper Pill */}
          <div className="p-2 mb-3 rounded bg-secondary-dark border border-secondary d-flex align-items-center justify-content-between text-secondary small">
            <div>
              <span className="text-gold fw-semibold">Demo Admin:</span> admin@inventoryiq.com / admin
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning text-gold py-0 px-2"
              onClick={handleDemoLogin}
              style={{ fontSize: '0.75rem' }}
            >
              Auto-Fill
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-icon-group">
                <i className="bi bi-envelope input-icon-left"></i>
                <input
                  id="email"
                  type="email"
                  required
                  className="form-control-iq"
                  placeholder="name@company.com"
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
                  placeholder="••••••••"
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

            <div className="d-flex align-items-center justify-content-between mb-4">
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

            <button
              type="submit"
              className="btn-gold w-100 py-2 fw-semibold mb-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="auth-divider">or continue with</div>

            <div className="social-login-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <button
                type="button"
                className="social-btn d-flex align-items-center justify-content-center gap-2 text-white"
                title="Continue with Google"
                onClick={handleDemoLogin}
              >
                <i className="bi bi-google text-danger"></i>
                <span className="small fw-medium">Google</span>
              </button>
              <button
                type="button"
                className="social-btn d-flex align-items-center justify-content-center gap-2 text-white"
                title="Continue with Microsoft"
                onClick={handleDemoLogin}
              >
                <i className="bi bi-microsoft text-info"></i>
                <span className="small fw-medium">Microsoft</span>
              </button>
            </div>

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

            <div className="text-center text-muted border-top border-secondary pt-3" style={{ fontSize: '0.75rem' }}>
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
      </div>
    </div>
  );
};
