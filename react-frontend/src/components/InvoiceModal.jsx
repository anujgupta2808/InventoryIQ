import React from 'react';
import { useInventory } from '../context/InventoryContext';

export const InvoiceModal = () => {
  const {
    isInvoiceOpen,
    setIsInvoiceOpen,
    activeInvoice,
    showToast
  } = useInventory();

  if (!isInvoiceOpen || !activeInvoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textContent = `
========================================
           INVENTORYIQ RECEIPT          
   Smart Inventory. Smarter Business.   
========================================
Invoice #: ${activeInvoice.id}
Date: ${activeInvoice.date}
Customer: ${activeInvoice.customerName}
Payment Method: ${activeInvoice.paymentMethod}
Payment Status: ${activeInvoice.status}
----------------------------------------
ITEMS:
${(activeInvoice.items || []).map(i => `${i.name} x ${i.qty} @ ₹${i.price} = ₹${i.qty * i.price}`).join('\n')}
----------------------------------------
Subtotal: ₹${activeInvoice.subtotal || activeInvoice.amount}
Tax (GST): ₹${activeInvoice.tax || 0}
Discount: ₹${activeInvoice.discount || 0}
GRAND TOTAL: ₹${activeInvoice.amount}
========================================
Thank you for your business!
`;
    const element = document.createElement("a");
    const file = new Blob([textContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Invoice_${activeInvoice.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Downloaded', `Invoice #${activeInvoice.id} receipt downloaded.`);
  };

  return (
    <div className="iq-modal-backdrop" onClick={() => setIsInvoiceOpen(false)}>
      <div
        className="iq-modal-container modal-lg p-4 bg-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 720 }}
      >
        {/* Actions bar (hidden in print) */}
        <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary d-print-none">
          <div className="d-flex align-items-center gap-2">
            <span className="badge badge-gold">Tax Invoice</span>
            <span className="text-white fw-semibold">#{activeInvoice.id}</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-warning text-gold"
              onClick={handlePrint}
            >
              <i className="bi bi-printer me-1"></i> Print
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleDownload}
            >
              <i className="bi bi-download me-1"></i> Download
            </button>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setIsInvoiceOpen(false)}
            ></button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="printable-invoice p-4 rounded bg-dark border border-secondary text-white">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <div className="brand-icon-box" style={{ width: 32, height: 32 }}>
                  <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                    <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" fill="#F5B942" />
                    <path d="M20 2L36 11L20 20L4 11L20 2Z" fill="#FFE07D" />
                    <path d="M20 20V38L36 29V11L20 20Z" fill="#D99726" />
                  </svg>
                </div>
                <h4 className="fw-bold mb-0 text-white">Inventory<span className="text-gold">IQ</span></h4>
              </div>
              <small className="text-muted d-block">Retail & Wholesale Distribution</small>
              <small className="text-muted d-block">GSTIN: 07AAAAA0000A1Z5</small>
            </div>
            <div className="text-end">
              <h5 className="fw-bold text-gold mb-1">TAX INVOICE</h5>
              <div className="text-white fw-medium">Invoice: {activeInvoice.id}</div>
              <div className="text-secondary small">Date: {activeInvoice.date}</div>
              <span className="badge badge-success mt-1">{activeInvoice.status}</span>
            </div>
          </div>

          <hr className="border-secondary my-3" />

          {/* Customer & Payment Info */}
          <div className="row g-3 mb-4">
            <div className="col-6">
              <span className="text-gold small fw-bold text-uppercase d-block mb-1">Billed To:</span>
              <div className="fw-semibold text-white">{activeInvoice.customerName}</div>
              <small className="text-secondary d-block">Cash / Registered Customer</small>
            </div>
            <div className="col-6 text-end">
              <span className="text-gold small fw-bold text-uppercase d-block mb-1">Payment Method:</span>
              <div className="fw-semibold text-white">{activeInvoice.paymentMethod}</div>
              <small className="text-secondary d-block">Status: Verified & Settled</small>
            </div>
          </div>

          {/* Items Table */}
          <div className="table-responsive mb-4">
            <table className="table table-dark table-striped align-middle mb-0">
              <thead>
                <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                  <th scope="col" style={{ width: '50%' }}>Item Description</th>
                  <th scope="col" className="text-center">Qty</th>
                  <th scope="col" className="text-end">Unit Price</th>
                  <th scope="col" className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {(activeInvoice.items || []).map((item, index) => (
                  <tr key={index} className="border-bottom border-secondary">
                    <td>
                      <span className="fw-medium text-white">{item.name}</span>
                    </td>
                    <td className="text-center">{item.qty}</td>
                    <td className="text-end">₹{Number(item.price).toLocaleString('en-IN')}</td>
                    <td className="text-end fw-semibold text-white">
                      ₹{(Number(item.qty) * Number(item.price)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="row justify-content-end mb-4">
            <div className="col-sm-6">
              <div className="d-flex justify-content-between py-1">
                <span className="text-secondary">Subtotal</span>
                <span className="text-white">₹{(activeInvoice.subtotal || activeInvoice.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-secondary">GST / Tax</span>
                <span className="text-white">₹{(activeInvoice.tax || 0).toLocaleString('en-IN')}</span>
              </div>
              {activeInvoice.discount > 0 && (
                <div className="d-flex justify-content-between py-1">
                  <span className="text-secondary">Discount</span>
                  <span className="text-success">-₹{Number(activeInvoice.discount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="d-flex justify-content-between py-2 border-top border-warning mt-2">
                <span className="fw-bold text-white fs-5">Grand Total</span>
                <span className="fw-bold text-gold fs-5">₹{Number(activeInvoice.amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="border-top border-secondary pt-3 text-center text-muted small">
            Thank you for choosing InventoryIQ! For support, email support@inventoryiq.com.
          </div>
        </div>
      </div>
    </div>
  );
};

