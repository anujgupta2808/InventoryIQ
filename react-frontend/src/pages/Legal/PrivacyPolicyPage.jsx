import React from 'react';
import { useInventory } from '../../context/InventoryContext';

export const PrivacyPolicyPage = () => {
  const { setCurrentPage, isAuthenticated } = useInventory();

  const handleBack = () => {
    if (isAuthenticated) {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('register');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="legal-page-wrapper py-5 px-3 px-md-4" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div className="container" style={{ maxWidth: 940 }}>
        {/* Header Bar */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom border-secondary d-print-none">
          <div
            className="d-flex align-items-center gap-2 cursor-pointer"
            onClick={handleBack}
            style={{ cursor: 'pointer' }}
          >
            <img src="./logo.svg" alt="InventoryIQ" style={{ width: 38, height: 38 }} />
            <div>
              <h5 className="fw-bold mb-0 text-white">Inventory<span className="text-gold">IQ</span></h5>
              <small className="text-secondary">Smart Inventory. Smarter Business.</small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setCurrentPage('terms')}
            >
              Terms of Service
            </button>
            <button
              type="button"
              className="btn btn-sm btn-gold active"
              onClick={() => setCurrentPage('privacy')}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning text-gold ms-1"
              onClick={handlePrint}
              title="Print document"
            >
              <i className="bi bi-printer me-1"></i> Print
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary-custom ms-1"
              onClick={handleBack}
            >
              <i className="bi bi-arrow-left me-1"></i> {isAuthenticated ? 'Dashboard' : 'Back'}
            </button>
          </div>
        </div>

        {/* Hero Title Card */}
        <div className="card-custom p-4 p-md-5 mb-4 border border-secondary" style={{ background: '#141414' }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <span className="badge badge-gold px-3 py-1">Privacy & Compliance • Commercial v2.0</span>
            <span className="text-secondary small">
              <i className="bi bi-shield-check me-1"></i> Last Updated: November 2, 2026
            </span>
          </div>

          <h1 className="display-6 fw-bold text-white mb-3">Privacy Policy</h1>
          <p className="lead text-secondary mb-0" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
            At <strong className="text-white">InventoryIQ</strong>, we hold business privacy, financial data confidentiality, and multi-tenant security as fundamental cornerstones of our platform architecture. This Privacy Policy outlines how your organizational records are protected.
          </p>
        </div>

        {/* Content Document Card */}
        <div className="card-custom p-4 p-md-5 border border-secondary text-secondary" style={{ background: '#121212', lineHeight: 1.7 }}>
          {/* Section 1 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>1</span>
              <h4 className="text-white fw-bold mb-0">Information We Collect</h4>
            </div>
            <p>
              To provide an end-to-end inventory tracking, point-of-sale checkout, and GST invoicing experience, we process the following information:
            </p>
            <ul className="list-unstyled d-flex flex-column gap-2 ps-3">
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-check2 text-gold mt-1"></i>
                <span><strong>Account & Administrator Profile:</strong> Full name, verified business email, contact phone number, and hashed authentication credentials.</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-check2 text-gold mt-1"></i>
                <span><strong>Enterprise Details:</strong> Organization name, organization type (e.g. Retail, Wholesale, Private Limited, LLP), and optional GSTIN tax identification numbers.</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-check2 text-gold mt-1"></i>
                <span><strong>Catalog & Transaction Records:</strong> Product SKUs, stock levels, reorder thresholds, supplier directories, purchase orders, sales receipts, and audit trail logs.</span>
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>2</span>
              <h4 className="text-white fw-bold mb-0">How We Use Your Business Data</h4>
            </div>
            <p>
              All captured data is strictly utilized to operate and enhance your business management workflow:
            </p>
            <ul className="list-unstyled d-flex flex-column gap-2 ps-3">
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-dot text-gold fs-4"></i>
                <span>Facilitating real-time stock deduction and inventory turnover calculations.</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-dot text-gold fs-4"></i>
                <span>Generating compliant tax invoices bearing your registered organization name, type, and GSTIN.</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-dot text-gold fs-4"></i>
                <span>Triggering low-stock warnings when inventory items fall below defined safety thresholds.</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-dot text-gold fs-4"></i>
                <span>Maintaining chronological audit trail records for security monitoring and multi-device session verification.</span>
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>3</span>
              <h4 className="text-white fw-bold mb-0">Encrypted Storage & Session Architecture</h4>
            </div>
            <div className="p-3 rounded bg-secondary-dark border border-secondary mb-3">
              <span className="text-white fw-semibold">
                <i className="bi bi-shield-check text-gold me-2"></i>Zero Third-Party Tracking & Cookie-Less Storage
              </span>
              <p className="small text-secondary mb-0 mt-1">
                InventoryIQ does not use cross-site tracking cookies or intrusive analytics beacons. User sessions are persisted locally using standard sandboxed Web Storage (<code>localStorage</code> and <code>sessionStorage</code>) with cryptographic token validation.
              </p>
            </div>
            <p>
              When choosing <em>"Remember Me"</em> on sign-in, your authenticated session is securely bound to your local device. Unchecking this option stores your session strictly in volatile session storage, terminating immediately upon closing your browser window.
            </p>
          </div>

          {/* Section 4 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>4</span>
              <h4 className="text-white fw-bold mb-0">Zero Data Monetization & Strict Confidentiality</h4>
            </div>
            <p>
              We firmly believe your catalog and commercial turnover data belong exclusively to you. <strong className="text-white">InventoryIQ never sells, rents, licenses, or exchanges your business data, supplier catalogs, or customer invoices with third-party advertisers or data brokers under any circumstances.</strong>
            </p>
          </div>

          {/* Section 5 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>5</span>
              <h4 className="text-white fw-bold mb-0">Data Portability & Erasure Rights</h4>
            </div>
            <p>
              You maintain total authority over your operational records:
            </p>
            <ul className="list-unstyled d-flex flex-column gap-2 ps-3">
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-arrow-down-circle text-gold mt-1"></i>
                <span><strong>Instant Data Export:</strong> Export your full database snapshot in JSON format or download tabular CSV reports of Products, Invoices, and Suppliers with a single click.</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-trash text-gold mt-1"></i>
                <span><strong>Instant Data Wipe:</strong> Access the Database Settings tab to wipe local catalog modifications and restore pristine demo seed states at your discretion.</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-door-closed text-gold mt-1"></i>
                <span><strong>Active Session Revocation:</strong> Review all connected devices in the Security Center and remotely disconnect any suspicious or inactive logins.</span>
              </li>
            </ul>
          </div>

          {/* Section 6 */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>6</span>
              <h4 className="text-white fw-bold mb-0">Privacy Inquiries & Data Protection Desk</h4>
            </div>
            <p className="mb-0">
              For any questions regarding our data protection standards or to submit a privacy inquiry, please reach out to our team at <strong className="text-white">privacy@inventoryiq.com</strong>.
            </p>
          </div>

          {/* Footer Navigation */}
          <div className="pt-4 border-top border-secondary d-flex flex-wrap align-items-center justify-content-between gap-3">
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleBack}
            >
              <i className="bi bi-arrow-left me-1"></i> Return to {isAuthenticated ? 'Dashboard' : 'Registration'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setCurrentPage('terms')}
            >
              View Terms of Service →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

