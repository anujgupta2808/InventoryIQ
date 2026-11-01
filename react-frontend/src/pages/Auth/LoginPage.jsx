import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';

export const LoginPage = () => {
  const { setCurrentPage, setIsAuthenticated, showToast } = useInventory();
  const [email, setEmail] = useState('admin@inventoryiq.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Validation Error', 'Please enter email and password.', 'danger');
      return;
    }
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    showToast('Welcome Back!', 'Logged in as Anuj Gupta (Admin).');
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        {/* Left Side: Brand Showcase */}
        <div className="auth-showcase">
          <div className="brand-wrapper">
            <img src="/logo.svg" alt="InventoryIQ" className="brand-logo-img" />
            <div className="brand-text-block">
              <span className="brand-name">Inventory<span>IQ</span></span>
              <span className="brand-tagline">Smart Inventory. Smarter Business.</span>
            </div>
          </div>

          <div className="auth-showcase-hero">
            <h2 className="auth-showcase-title">Manage Your Business Effortlessly</h2>
            <p className="auth-showcase-desc">Track inventory, monitor sales, and grow your business with ease.</p>
            <img src="/hero-box.svg" alt="InventoryIQ 3D Boxes" className="auth-showcase-img" />
          </div>

          <div className="d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
            <span><i className="bi bi-shield-check text-gold me-1"></i> 256-Bit SSL Encrypted</span>
            <span>v2.0 Commercial</span>
          </div>
        </div>

        {/* Right Side: Sign-In Form */}
        <div className="auth-card-panel">
          <div className="auth-header">
            <h3 className="auth-title">Welcome Back!</h3>
            <p className="auth-subtitle">Sign in to your account</p>
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

            <button type="submit" className="btn-gold w-100 py-2 fw-semibold mb-4">
              Sign In
            </button>

            <div className="auth-divider">or continue with</div>

            <div className="social-login-grid">
              <button
                type="button"
                className="social-btn"
                title="Google"
                onClick={() => { setIsAuthenticated(true); setCurrentPage('dashboard'); }}
              >
                <i className="bi bi-google"></i>
              </button>
              <button
                type="button"
                className="social-btn"
                title="GitHub"
                onClick={() => { setIsAuthenticated(true); setCurrentPage('dashboard'); }}
              >
                <i className="bi bi-github"></i>
              </button>
              <button
                type="button"
                className="social-btn"
                title="Microsoft"
                onClick={() => { setIsAuthenticated(true); setCurrentPage('dashboard'); }}
              >
                <i className="bi bi-microsoft"></i>
              </button>
            </div>

            <div className="text-center text-secondary small">
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
          </form>
        </div>
      </div>
    </div>
  );
};
