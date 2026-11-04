import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';

export const GlobalSearchModal = () => {
  const {
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    products,
    suppliers,
    sales,
    setCurrentPage
  } = useInventory();

  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isGlobalSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isGlobalSearchOpen]);

  if (!isGlobalSearchOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedProducts = q ? products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  ).slice(0, 4) : [];

  const matchedSuppliers = q ? suppliers.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
    (s.email && s.email.toLowerCase().includes(q)) ||
    (s.phone && s.phone.includes(q))
  ).slice(0, 3) : [];

  const matchedSales = q ? sales.filter(s =>
    s.id.toLowerCase().includes(q) ||
    (s.customerName && s.customerName.toLowerCase().includes(q))
  ).slice(0, 3) : [];

  const matchedLedger = q && ('party due tracker client ledger receivables debt pending received not received'.includes(q))
    ? [{ id: 'ledger-nav', name: 'Party Due Tracker (Received vs. Due Ledger)', path: 'ledger' }]
    : [];

  const hasResults = matchedProducts.length > 0 || matchedSuppliers.length > 0 || matchedSales.length > 0 || matchedLedger.length > 0;

  const handleSelect = (page) => {
    setCurrentPage(page);
    setIsGlobalSearchOpen(false);
  };

  return (
    <div className="iq-modal-backdrop" onClick={() => setIsGlobalSearchOpen(false)}>
      <div className="iq-modal-container p-0" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        {/* Search Input Bar */}
        <div className="p-3 border-bottom border-secondary d-flex align-items-center gap-3">
          <i className="bi bi-search text-gold fs-5"></i>
          <input
            ref={inputRef}
            type="text"
            className="form-control bg-transparent border-0 text-white shadow-none fs-5 p-0"
            placeholder="Search products, SKU, suppliers, invoices, party dues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ fontWeight: 400 }}
          />
          {query && (
            <button
              type="button"
              className="btn btn-sm btn-icon text-secondary"
              onClick={() => setQuery('')}
              title="Clear input"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}
          <kbd className="bg-dark text-gold border border-secondary px-2 py-1 rounded small">ESC</kbd>
        </div>

        {/* Results Container */}
        <div className="p-3" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {!query && (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-keyboard fs-3 d-block mb-2"></i>
              Type to search items, transactions or contacts...
            </div>
          )}

          {query && !hasResults && (
            <div className="text-center py-4 text-muted">
              No matching records found for "{query}".
            </div>
          )}

          {matchedProducts.length > 0 && (
            <div className="mb-3">
              <div className="text-uppercase small fw-bold text-gold mb-2">Products</div>
              {matchedProducts.map(p => (
                <div
                  key={p.id}
                  className="d-flex align-items-center justify-content-between p-2 rounded bg-hover mb-1 cursor-pointer"
                  onClick={() => handleSelect('inventory')}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <span className="text-white fw-medium">{p.name}</span>
                    <small className="text-muted ms-2">SKU: {p.sku} • {p.category}</small>
                  </div>
                  <div className="text-end">
                    <span className="badge badge-gold">₹{p.price}</span>
                    <small className="d-block text-secondary">{p.stock} in stock</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {matchedLedger.length > 0 && (
            <div className="mb-3">
              <div className="text-uppercase small fw-bold text-gold mb-2">Finance & Receivables</div>
              {matchedLedger.map(item => (
                <div
                  key={item.id}
                  className="d-flex align-items-center justify-content-between p-2 rounded bg-hover mb-1 cursor-pointer"
                  onClick={() => handleSelect('ledger')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-wallet2 text-gold"></i>
                    <span className="text-white fw-medium">{item.name}</span>
                  </div>
                  <span className="badge badge-gold">Open Ledger →</span>
                </div>
              ))}
            </div>
          )}

          {matchedSales.length > 0 && (
            <div className="mb-3">
              <div className="text-uppercase small fw-bold text-gold mb-2">Invoices / Sales</div>
              {matchedSales.map(s => (
                <div
                  key={s.id}
                  className="d-flex align-items-center justify-content-between p-2 rounded bg-hover mb-1 cursor-pointer"
                  onClick={() => handleSelect('sales')}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <span className="text-white fw-medium">Invoice #{s.id}</span>
                    <small className="text-muted ms-2">{s.customerName} • {s.date}</small>
                  </div>
                  <span className="badge badge-success">₹{s.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}

          {matchedSuppliers.length > 0 && (
            <div className="mb-2">
              <div className="text-uppercase small fw-bold text-gold mb-2">Suppliers & Contacts</div>
              {matchedSuppliers.map(s => (
                <div
                  key={s.id}
                  className="d-flex align-items-center justify-content-between p-2 rounded bg-hover mb-1 cursor-pointer"
                  onClick={() => handleSelect('suppliers')}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <span className="text-white fw-medium">{s.name}</span>
                    <small className="text-muted ms-2">{s.email} • {s.phone}</small>
                  </div>
                  <span className="text-secondary small">{s.totalPurchases || '₹0'} spent</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Quick Shortcuts */}
        <div className="p-3 bg-secondary-dark border-top border-secondary d-flex align-items-center justify-content-between small text-secondary">
          <div className="d-flex gap-3">
            <span><kbd className="bg-dark text-gold px-1 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-dark text-gold px-1 rounded">ESC</kbd> Close</span>
          </div>
          <span className="text-gold">InventoryIQ Global Index</span>
        </div>
      </div>
    </div>
  );
};
