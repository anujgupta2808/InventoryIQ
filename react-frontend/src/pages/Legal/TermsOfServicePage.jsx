import React from 'react';
import { useInventory } from '../../context/InventoryContext';

export const TermsOfServicePage = () => {
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
              className="btn btn-sm btn-gold active"
              onClick={() => setCurrentPage('terms')}
            >
              Terms of Service
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
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
            <span className="badge badge-gold px-3 py-1">Legal Document • Commercial v2.0</span>
            <span className="text-secondary small">
              <i className="bi bi-clock-history me-1"></i> Last Updated: November 2, 2026
            </span>
          </div>

          <h1 className="display-6 fw-bold text-white mb-3">Terms of Service</h1>
          <p className="lead text-secondary mb-0" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
            Welcome to <strong className="text-white">InventoryIQ</strong>. These Terms of Service govern your access to and use of the InventoryIQ smart enterprise inventory management, point-of-sale (POS), procurement logging, and automated GST billing software platform.
          </p>
        </div>

        {/* Content Document Card */}
        <div className="card-custom p-4 p-md-5 border border-secondary text-secondary" style={{ background: '#121212', lineHeight: 1.7 }}>
          {/* Section 1 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>1</span>
              <h4 className="text-white fw-bold mb-0">Acceptance of Terms</h4>
            </div>
            <p>
              By accessing our platform, registering an organization workspace, or utilizing any of our automated inventory control or invoicing features, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company, retail firm, or corporate enterprise, you represent that you possess the full legal authority to bind such entity.
            </p>
          </div>

          {/* Section 2 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>2</span>
              <h4 className="text-white fw-bold mb-0">Enterprise Account & Tenant Credentials</h4>
            </div>
            <p>
              When creating an account on InventoryIQ, you agree to:
            </p>
            <ul className="list-unstyled d-flex flex-column gap-2 ps-3">
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-check-circle-fill text-gold mt-1"></i>
                <span>Provide authentic, accurate, and current information regarding your <strong>Full Name</strong>, <strong>Business Email</strong>, <strong>Organization Name</strong>, <strong>Type of Organization</strong>, and optional <strong>GSTIN</strong>.</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-check-circle-fill text-gold mt-1"></i>
                <span>Maintain the confidentiality of your master administrative credentials and promptly notify us upon any unauthorized tenant session or security breach.</span>
              </li>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-check-circle-fill text-gold mt-1"></i>
                <span>Accept complete responsibility for all transaction records, purchase orders, catalog edits, and stock deductions conducted under your authenticated session.</span>
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>3</span>
              <h4 className="text-white fw-bold mb-0">Commercial Black & Gold SaaS License</h4>
            </div>
            <p>
              Subject to these Terms, InventoryIQ grants your business a non-exclusive, non-transferable, revocable license to utilize our web application and cloud tools for your direct internal commercial operations, stock auditing, counter point-of-sale settlements, and supplier management. You may not reverse-engineer, decompile, redistribute, or resell the proprietary application bundle without written consent.
            </p>
          </div>

          {/* Section 4 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>4</span>
              <h4 className="text-white fw-bold mb-0">Data Ownership & Catalog Sovereignty</h4>
            </div>
            <div className="p-3 rounded bg-secondary-dark border border-secondary mb-3">
              <span className="text-white fw-semibold">
                <i className="bi bi-shield-lock-fill text-gold me-2"></i>You Own 100% of Your Business Data
              </span>
              <p className="small text-secondary mb-0 mt-1">
                All SKU records, product names, price margins, supplier contacts, transaction invoices, and customer receipt histories recorded in your workspace remain your exclusive intellectual and commercial property.
              </p>
            </div>
            <p>
              InventoryIQ does not monetize, sell, or disclose your catalog inventory or retail turnover statistics to third-party advertisers. You retain the permanent right to export complete JSON database snapshots or CSV data sheets at any time.
            </p>
          </div>

          {/* Section 5 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>5</span>
              <h4 className="text-white fw-bold mb-0">GST Billing & Tax Invoice Compliance</h4>
            </div>
            <p>
              InventoryIQ provides automated math calculations for Goods and Services Tax (GST rates: 0%, 5%, 12%, 18%, 28%) and creates formatted tax invoice documents. Your organization is strictly responsible for ensuring that the GSTIN provided, applicable tax slabs, and commercial disclosures comply with all central and state statutory tax laws.
            </p>
          </div>

          {/* Section 6 */}
          <div className="mb-5">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>6</span>
              <h4 className="text-white fw-bold mb-0">Platform Availability & SLA Target</h4>
            </div>
            <p>
              We strive to maintain a 99.9% uptime availability for all commercial workspaces. Periodic maintenance or security upgrades may occur; our engineering team works diligently to minimize downtime and prevent disruption to active register checkout operations.
            </p>
          </div>

          {/* Section 7 */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge badge-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>7</span>
              <h4 className="text-white fw-bold mb-0">Contact & Legal Inquiries</h4>
            </div>
            <p className="mb-0">
              For any questions regarding these Terms of Service or enterprise commercial licensing, please contact our legal and compliance desk at <strong className="text-white">legal@inventoryiq.com</strong> or via the Security & Settings center.
            </p>
          </div>

          {/* Footer Navigation */}
          <div className="pt-4 border-top border-secondary d-flex flex-wrap align-items-center justify-content-between gap-3">
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleBack}
            >
              <i className="bi bi-check2-circle me-1"></i> I Understand & Accept
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setCurrentPage('privacy')}
            >
              Read Privacy Policy →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

