/**
 * Product QR Code & Printable Label Modal
 * Generates high-resolution QR codes encoding product SKU, barcode, and catalog details.
 * Provides instant one-click download and printable thermal/standard label layout.
 */

import React, { useState, useEffect } from 'react';
import { barcodeService } from '../services/barcodeService';

export default function ProductQRModal({ isOpen, onClose, product }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [labelFormat, setLabelFormat] = useState('standard'); // 'standard' | 'compact'

  useEffect(() => {
    if (isOpen && product) {
      const payload = barcodeService.formatProductQRData(product);
      barcodeService.generateQRCode(payload, { width: 350, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate product QR:', err));
    } else {
      setQrDataUrl('');
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `InventoryIQ_QR_${product.sku || product.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=480,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Label - ${product.sku}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; margin: 20px; color: #000; }
            .label-card { border: 2px solid #000; padding: 16px; width: 280px; margin: 0 auto; border-radius: 8px; }
            .brand { font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; color: #555; }
            .prod-name { font-size: 16px; font-weight: bold; margin: 6px 0 2px 0; }
            .sku { font-size: 12px; font-family: monospace; color: #333; margin-bottom: 8px; }
            .qr-img { width: 180px; height: 180px; }
            .price { font-size: 18px; font-weight: bold; margin-top: 6px; }
            .barcode-num { font-size: 11px; font-family: monospace; color: #666; margin-top: 2px; }
            @media print {
              body { margin: 0; }
              .label-card { border: 1px solid #000; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="brand">InventoryIQ Product Label</div>
            <div class="prod-name">${product.name}</div>
            <div class="sku">${product.sku}</div>
            <img src="${qrDataUrl}" class="qr-img" />
            <div class="price">₹${Number(product.price).toLocaleString('en-IN')}</div>
            ${product.barcode ? `<div class="barcode-num">EAN/UPC: ${product.barcode}</div>` : ''}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="iq-modal-backdrop" onClick={onClose}>
      <div 
        className="iq-modal-container p-4" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 460, width: '90%' }}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-qr-code text-gold fs-5"></i>
            <h5 className="modal-title text-white fw-bold mb-0">Product QR Label</h5>
          </div>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>

        {/* Printable Label Preview Card */}
        <div className="text-center p-3 rounded bg-white text-dark mb-3 border border-secondary shadow-sm">
          <div className="text-uppercase fw-bold text-secondary" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            InventoryIQ Catalog Label
          </div>
          <h5 className="fw-bold mt-1 mb-0 text-dark">{product.name}</h5>
          <div className="font-monospace text-secondary small mb-2">{product.sku}</div>

          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Product QR Code" className="img-fluid my-2" style={{ width: 190, height: 190 }} />
          ) : (
            <div className="p-4 text-muted">Generating QR Code...</div>
          )}

          <div className="fs-4 fw-bold text-dark mt-1">₹{Number(product.price).toLocaleString('en-IN')}</div>
          {product.barcode && (
            <div className="font-monospace small text-muted">Barcode: {product.barcode}</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2">
          <button 
            type="button" 
            className="btn btn-outline-secondary flex-fill" 
            onClick={handleDownload}
            disabled={!qrDataUrl}
          >
            <i className="bi bi-download me-1"></i> Download PNG
          </button>
          <button 
            type="button" 
            className="btn btn-gold flex-fill" 
            onClick={handlePrint}
            disabled={!qrDataUrl}
          >
            <i className="bi bi-printer me-1"></i> Print Label
          </button>
        </div>
      </div>
    </div>
  );
}
