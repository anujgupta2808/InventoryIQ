import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('InventoryIQ ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn(e);
    }
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090909',
          color: '#ffffff',
          fontFamily: "'Inter', sans-serif",
          padding: '2rem'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#151515',
            border: '1px solid rgba(245, 185, 66, 0.3)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 185, 66, 0.12)',
              color: '#F5B942',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.75rem'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#ffffff' }}>
              Something Went Wrong
            </h2>
            <p style={{ color: '#A1A1AA', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              The application encountered an unexpected runtime error.
            </p>
            {this.state.error && (
              <pre style={{
                backgroundColor: '#0a0a0a',
                border: '1px solid #333',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#EF4444',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '1.5rem'
              }}>
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#F5B942',
                  color: '#090909',
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Reload App
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  backgroundColor: 'transparent',
                  color: '#A1A1AA',
                  border: '1px solid #353535',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

