import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';

export const GlobalSearchModal = () => {
  const {
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    products,
    customers,
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

  const matchedCustomers = q ? customers.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    c.phone.includes(q)
  ).slice(0, 3) : [];

  const matchedSuppliers = q ? suppliers.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.email.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const matchedSales = q ? sales.filter(s =>
    s.id.toLowerCase().includes(q) ||
    s.customerName.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const hasResults = matchedProducts.length > 0 || matchedCustomers.length > 0 || matchedSuppliers.length > 0 || matchedSales.length > 0;

  const handleSelect = (page) => {
    setCurrentPage(page);
    setIsGlobalSearchOpen(false);
  };

  return (
    <div className="iq-modal-backdrop" onClick={() => setIsGlobalSearchOpen(false)}>
      <div className="iq-modal-container p-0" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        {/* Search Input Bar */}
        <div className="p-3 border-bottom border-secondary d-flex align-items-center gap-2">
          <i className="bi bi-search text-gold fs-5"></i>
          <input
            ref={inputRef}
            type="text"
            className="form-control bg-transparent border-0 text-white shadow-none fs-5 p-0"
            placeholder="Search products, SKU, customers, suppliers, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setIsGlobalSearchOpen(false)}
          >
            ESC
          </button>
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

          {matchedCustomers.length > 0 && (
            <div className="mb-3">
              <div className="text-uppercase small fw-bold text-gold mb-2">Customers</div>
              {matchedCustomers.map(c => (
                <div
                  key={c.id}
                  className="d-flex align-items-center justify-content-between p-2 rounded bg-hover mb-1 cursor-pointer"
                  onClick={() => handleSelect('customers')}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <span className="text-white fw-medium">{c.name}</span>
                    <small className="text-muted ms-2">{c.email} • {c.phone}</small>
                  </div>
                  <span className="text-secondary small">{c.totalOrders} orders</span>
                </div>
              ))}
            </div>
          )}

          {matchedSuppliers.length > 0 && (
            <div className="mb-2">
              <div className="text-uppercase small fw-bold text-gold mb-2">Suppliers</div>
              {matchedSuppliers.map(s => (
                <div
                  key={s.id}
                  className="d-flex align-items-center justify-content-between p-2 rounded bg-hover mb-1 cursor-pointer"
                  onClick={() => handleSelect('suppliers')}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <span className="text-white fw-medium">{s.name}</span>
                    <small className="text-muted ms-2">{s.email}</small>
                  </div>
                  <span className="badge badge-outline-warning">{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

