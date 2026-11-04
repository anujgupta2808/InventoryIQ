import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

export const SalesPage = () => {
  const {
    sales,
    products,
    createSale,
    recordPayment,
    setActiveInvoice,
    setIsInvoiceOpen,
    setCurrentPage,
    exportCSV,
    showToast
  } = useInventory();

  // Filters & Search for Invoices
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPageNum] = useState(1);
  const itemsPerPage = 8;

  // New Sale Modal State
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('Walk-in Customer');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(12); // 12% GST
  const [paymentMode, setPaymentMode] = useState('full'); // 'full' | 'partial' | 'credit'
  const [customPaidAmount, setCustomPaidAmount] = useState('');

  // Collect Payment Modal State (for overdue invoices)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState({ saleId: null, customerName: '', dueAmount: 0 });
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('UPI');
  const [collectNote, setCollectNote] = useState('');

  // Cart / Line items
  const availableProducts = useMemo(() => products.filter(p => p.stock > 0), [products]);
  const [cartItems, setCartItems] = useState(() =>
    availableProducts.length > 0 ? [{ productId: availableProducts[0].id, qty: 1 }] : []
  );

  // --- Payment & Due Calculation Helpers ---
  const getSalePaid = (s) => (
    s.paidAmount !== undefined
      ? Number(s.paidAmount) || 0
      : (s.status === 'Completed' || s.status === 'Paid' ? Number(s.amount) || 0 : 0)
  );

  const getSaleDue = (s) => (
    s.dueAmount !== undefined
      ? Number(s.dueAmount) || 0
      : Math.max(0, (Number(s.amount) || 0) - getSalePaid(s))
  );

  const getSaleStatus = (s) => {
    const due = getSaleDue(s);
    const paid = getSalePaid(s);
    if (due <= 0) return 'Paid';
    if (paid > 0) return 'Partial';
    return 'Unpaid';
  };

  // --- KPI Aggregates ---
  const totalBilled = useMemo(() => sales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0), [sales]);
  const totalReceived = useMemo(() => sales.reduce((acc, s) => acc + getSalePaid(s), 0), [sales]);
  const totalDue = useMemo(() => sales.reduce((acc, s) => acc + getSaleDue(s), 0), [sales]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchSearch = s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (s.customerPhone && s.customerPhone.includes(searchTerm));
      const matchPayment = selectedPayment === 'All' || s.paymentMethod === selectedPayment;
      const status = getSaleStatus(s);
      const matchStatus = selectedStatus === 'All' || status === selectedStatus;
      return matchSearch && matchPayment && matchStatus;
    });
  }, [sales, searchTerm, selectedPayment, selectedStatus]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  // --- Cart Calculations ---
  const calculatedItems = useMemo(() => {
    return cartItems.map(item => {
      const p = products.find(x => x.id === Number(item.productId));
      const price = p ? Number(p.price) || 0 : 0;
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);
      const total = price * qty;
      const availableStock = p ? p.stock : 0;
      return {
        productId: item.productId,
        name: p?.name || 'Selected Product',
        qty,
        price,
        total,
        availableStock
      };
    });
  }, [cartItems, products]);

  const hasStockErrors = useMemo(() => {
    return calculatedItems.some(i => i.qty > i.availableStock);
  }, [calculatedItems]);

  const subtotal = calculatedItems.reduce((acc, i) => acc + i.total, 0);
  const discountVal = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const taxable = Math.max(0, subtotal - discountVal);
  const taxVal = Math.round(taxable * (Number(taxRate) / 100));
  const grandTotal = taxable + taxVal;

  // New Sale: Compute paid amount & due balance based on mode
  const effectivePaidNow = useMemo(() => {
    if (paymentMode === 'full') return grandTotal;
    if (paymentMode === 'credit') return 0;
    if (paymentMode === 'partial') {
      const entered = Number(customPaidAmount) || 0;
      return Math.max(0, Math.min(grandTotal, entered));
    }
    return grandTotal;
  }, [paymentMode, customPaidAmount, grandTotal]);

  const effectiveDueLater = Math.max(0, grandTotal - effectivePaidNow);

  // --- Handlers ---
  const handleOpenNewSale = () => {
    setBuyerName('Walk-in Customer');
    setBuyerPhone('');
    setBuyerEmail('');
    setBuyerAddress('');
    setPaymentMethod('UPI');
    setPaymentMode('full');
    setCustomPaidAmount('');
    setDiscount(0);
    setTaxRate(12);

    if (availableProducts.length > 0) {
      setCartItems([{ productId: availableProducts[0].id, qty: 1 }]);
    } else if (products.length > 0) {
      setCartItems([{ productId: products[0].id, qty: 1 }]);
    } else {
      setCartItems([]);
    }

    setIsNewSaleOpen(true);
  };

  const handleAddCartRow = () => {
    const existingIds = new Set(cartItems.map(c => Number(c.productId)));
    const nextProd = availableProducts.find(p => !existingIds.has(p.id)) || availableProducts[0] || products[0];
    if (nextProd) {
      setCartItems(prev => [...prev, { productId: nextProd.id, qty: 1 }]);
    } else {
      showToast('Inventory Alert', 'No additional products available in catalog.', 'warning');
    }
  };

  const handleRemoveCartRow = (index) => {
    if (cartItems.length === 1) {
      showToast('Cart Notice', 'Every sale invoice requires at least one product line item.', 'warning');
      return;
    }
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCartChange = (index, field, value) => {
    setCartItems(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmitSale = (e) => {
    e.preventDefault();

    if (products.length === 0 || cartItems.length === 0) {
      showToast('Empty Cart', 'Please add products to your sale invoice.', 'danger');
      return;
    }

    for (const item of calculatedItems) {
      if (item.availableStock <= 0) {
        showToast('Out of Stock', `"${item.name}" is completely out of stock.`, 'danger');
        return;
      }
      if (item.qty > item.availableStock) {
        showToast('Insufficient Stock', `Only ${item.availableStock} available for "${item.name}". Please lower quantity to proceed.`, 'danger');
        return;
      }
    }

    const finalCustomerName = buyerName.trim() || 'Walk-in Customer';

    const newSale = createSale({
      customerName: finalCustomerName,
      customerPhone: buyerPhone.trim(),
      customerEmail: buyerEmail.trim(),
      customerAddress: buyerAddress.trim(),
      items: calculatedItems.map(i => ({
        productId: i.productId,
        name: i.name,
        qty: i.qty,
        price: i.price
      })),
      subtotal,
      tax: taxVal,
      discount: discountVal,
      amount: grandTotal,
      paidAmount: effectivePaidNow,
      paymentMethod
    });

    setIsNewSaleOpen(false);
    setActiveInvoice(newSale);
    setIsInvoiceOpen(true);
  };

  const handleViewInvoice = (s) => {
    setActiveInvoice(s);
    setIsInvoiceOpen(true);
  };

  const handleOpenCollectPayment = ({ saleId = null, customerName = '', dueAmount = 0 }) => {
    setPaymentTarget({ saleId, customerName, dueAmount });
    setCollectAmount(dueAmount > 0 ? String(dueAmount) : '');
    setCollectMethod('UPI');
    setCollectNote(saleId ? `Payment for Invoice #${saleId}` : `Payment for ${customerName}`);
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = (e) => {
    e.preventDefault();
    const amt = Number(collectAmount) || 0;
    if (amt <= 0) {
      showToast('Validation Error', 'Please enter a valid payment amount greater than zero.', 'danger');
      return;
    }

    const result = recordPayment({
      saleId: paymentTarget.saleId,
      customerName: paymentTarget.customerName,
      paymentAmount: Math.min(amt, paymentTarget.dueAmount || amt),
      paymentMethod: collectMethod,
      note: collectNote
    });

    if (result.success) {
      setIsPaymentModalOpen(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Invoice ID', 'Date', 'Customer Name', 'Contact Phone', 'Payment Method', 'Subtotal', 'Tax', 'Discount', 'Total Billed', 'Amount Received', 'Balance Due', 'Status'];
    const rows = filteredSales.map(s => [
      s.id,
      s.date,
      s.customerName,
      s.customerPhone || 'N/A',
      s.paymentMethod,
      `₹${s.subtotal || s.amount}`,
      `₹${s.tax || 0}`,
      `₹${s.discount || 0}`,
      `₹${s.amount}`,
      `₹${getSalePaid(s)}`,
      `₹${getSaleDue(s)}`,
      getSaleStatus(s)
    ]);
    exportCSV('Sales_Invoices_Register', rows, headers);
  };

  return (
    <div className="sales-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Sales & Invoices</h2>
          <p className="page-subtitle text-secondary mb-0">
            Issue tax invoices, record register sales, and track collections
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary-custom d-flex align-items-center gap-2"
            onClick={handleExportCSV}
          >
            <i className="bi bi-file-earmark-arrow-down text-gold"></i>
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-gold d-flex align-items-center gap-2"
            onClick={handleOpenNewSale}
          >
            <i className="bi bi-cart-plus"></i>
            <span>New Sale</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="stat-card">
            <span className="stat-card-title">Completed Orders</span>
            <div className="stat-card-value text-white">{sales.length}</div>
            <div className="stat-card-footer">
              <span className="stat-trend up">
                <i className="bi bi-receipt"></i> Lifetime Invoices
              </span>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="stat-card">
            <span className="stat-card-title">Gross Revenue (Billed)</span>
            <div className="stat-card-value text-gold">
              ₹{totalBilled.toLocaleString('en-IN')}
            </div>
            <div className="stat-card-footer">
              <span className="stat-trend up">
                <i className="bi bi-graph-up-arrow"></i> Total billings
              </span>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <span className="stat-card-title">Amount Received</span>
            <div className="stat-card-value text-success">
              ₹{totalReceived.toLocaleString('en-IN')}
            </div>
            <div className="stat-card-footer">
              <span className="text-success small fw-medium">
                <i className="bi bi-check-circle me-1"></i>
                {totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 100}% Settled
              </span>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="stat-card" style={{ borderColor: totalDue > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)' }}>
            <span className="stat-card-title">Uncollected Balance</span>
            <div className={`stat-card-value ${totalDue > 0 ? 'text-danger' : 'text-secondary'}`}>
              ₹{totalDue.toLocaleString('en-IN')}
            </div>
            <div className="stat-card-footer">
              <span className="stat-period">across invoices</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card-custom p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-4">
            <div className="iq-search-bar">
              <i className="bi bi-search iq-search-icon"></i>
              <input
                type="text"
                className="iq-search-input"
                placeholder="Search invoice #, customer name, phone..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPageNum(1); }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="iq-search-clear"
                  onClick={() => { setSearchTerm(''); setCurrentPageNum(1); }}
                  title="Clear search"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select iq-toolbar-select"
              value={selectedPayment}
              onChange={(e) => { setSelectedPayment(e.target.value); setCurrentPageNum(1); }}
            >
              <option value="All">All Payment Modes</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="Card">Card POS</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select iq-toolbar-select"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPageNum(1); }}
            >
              <option value="All">All Payment Statuses</option>
              <option value="Paid">Paid in Full</option>
              <option value="Partial">Partial Payment</option>
              <option value="Unpaid">Unpaid / Full Due</option>
            </select>
          </div>

          <div className="col-12 col-md-2 text-md-end text-secondary small">
            Showing <strong className="text-white">{filteredSales.length}</strong> of {sales.length}
          </div>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead className="bg-secondary-dark border-bottom border-secondary text-secondary small text-uppercase">
              <tr>
                <th className="py-3 px-3">Invoice #</th>
                <th className="py-3">Date</th>
                <th className="py-3">Client / Buyer</th>
                <th className="py-3">Payment Method</th>
                <th className="py-3 text-end">Total Billed</th>
                <th className="py-3 text-end">Received</th>
                <th className="py-3 text-end">Balance Due</th>
                <th className="py-3 text-center">Status</th>
                <th className="py-3 text-end px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="py-3">
                      <i className="bi bi-receipt-cutoff fs-2 text-secondary d-block mb-2"></i>
                      <h6 className="text-white mb-1">No sales transactions found</h6>
                      <p className="text-secondary small mb-3">Record counter sales or issue tax invoices right here.</p>
                      <button
                        type="button"
                        className="btn btn-gold btn-sm"
                        onClick={handleOpenNewSale}
                      >
                        <i className="bi bi-cart-plus me-1"></i> Create First Sale
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSales.map(s => {
                  const paid = getSalePaid(s);
                  const due = getSaleDue(s);
                  const status = getSaleStatus(s);

                  return (
                    <tr key={s.id} className="border-bottom border-secondary">
                      <td className="py-3 px-3">
                        <span className="fw-bold text-gold">#{s.id}</span>
                      </td>
                      <td className="py-3 text-secondary small">{s.date}</td>
                      <td className="py-3">
                        <div className="fw-semibold text-white">{s.customerName || 'Walk-in Customer'}</div>
                        {s.customerPhone && <small className="text-secondary">{s.customerPhone}</small>}
                      </td>
                      <td className="py-3">
                        <span className="badge bg-secondary-dark text-white border border-secondary">
                          <i className={`bi ${s.paymentMethod === 'UPI' ? 'bi-qr-code' : s.paymentMethod === 'Cash' ? 'bi-cash' : 'bi-credit-card'} me-1 text-gold`}></i>
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 text-end fw-semibold text-white">
                        ₹{Number(s.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-end fw-semibold text-success">
                        ₹{paid.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-end">
                        {due > 0 ? (
                          <span className="fw-bold text-danger">₹{due.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-secondary small">₹0</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`badge ${
                          status === 'Paid' ? 'badge-success' : status === 'Partial' ? 'badge-warning text-dark' : 'badge-danger'
                        }`}>
                          {status === 'Paid' ? 'Paid' : status === 'Partial' ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="py-3 text-end px-3">
                        <div className="d-inline-flex align-items-center gap-1">
                          {due > 0 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success text-success d-inline-flex align-items-center gap-1"
                              onClick={() => handleOpenCollectPayment({ saleId: s.id, customerName: s.customerName, dueAmount: due })}
                              title="Record payment for this invoice"
                            >
                              <i className="bi bi-cash-stack"></i>
                              <span>Collect</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning text-gold d-inline-flex align-items-center gap-1"
                            onClick={() => handleViewInvoice(s)}
                            title="View printable invoice"
                          >
                            <i className="bi bi-receipt"></i>
                            <span>Invoice</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-top border-secondary d-flex justify-content-between align-items-center">
            <span className="small text-secondary">
              Page {currentPage} of {totalPages}
            </span>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPageNum(prev => Math.max(1, prev - 1))}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPageNum(prev => Math.min(totalPages, prev + 1))}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CREATE NEW SALE                                 */}
      {/* ======================================================== */}
      {isNewSaleOpen && (
        <div className="iq-modal-backdrop" onClick={() => setIsNewSaleOpen(false)}>
          <div className="iq-modal-container modal-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <div>
                <h5 className="modal-title text-white fw-bold mb-0">Create New Sale</h5>
                <small className="text-secondary">
                  Issue compliant tax invoice and configure amount received vs credit balance
                </small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setIsNewSaleOpen(false)}
              ></button>
            </div>

            {/* Zero product notification banner */}
            {products.length === 0 && (
              <div className="p-3 mb-3 rounded bg-secondary-dark border border-warning d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2 text-warning">
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                  <span><strong>No products in catalog!</strong> Add products via Purchases or directly in Inventory to record sales.</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-gold"
                    onClick={() => { setIsNewSaleOpen(false); setCurrentPage('purchases'); }}
                  >
                    Go to Purchases
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary-custom"
                    onClick={() => { setIsNewSaleOpen(false); setCurrentPage('inventory'); }}
                  >
                    Go to Inventory
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitSale}>
              {/* Buyer / Customer Details Card */}
              <div className="p-3 rounded bg-secondary-dark border border-secondary mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-person-badge text-gold fs-5"></i>
                    <div>
                      <h6 className="text-white fw-semibold mb-0">Client / Buyer Details</h6>
                      <small className="text-secondary">Appears on tax invoice and customer records</small>
                    </div>
                  </div>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className={`btn ${buyerName === 'Walk-in Customer' ? 'btn-gold' : 'btn-outline-secondary'}`}
                      onClick={() => {
                        setBuyerName('Walk-in Customer');
                        setBuyerPhone('');
                        setBuyerEmail('');
                      }}
                    >
                      Walk-in Customer
                    </button>
                    <button
                      type="button"
                      className={`btn ${buyerName !== 'Walk-in Customer' ? 'btn-gold' : 'btn-outline-secondary'}`}
                      onClick={() => {
                        if (buyerName === 'Walk-in Customer') setBuyerName('');
                      }}
                    >
                      Named Client / Business
                    </button>
                  </div>
                </div>

                <div className="row g-2">
                  <div className="col-12 col-md-4">
                    <label className="form-label text-secondary small">Person / Company Name *</label>
                    <input
                      type="text"
                      className="form-control bg-input border-secondary text-white"
                      placeholder="e.g. Rahul Sharma or Priya Enterprises"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label text-secondary small">Contact Phone Number</label>
                    <input
                      type="tel"
                      className="form-control bg-input border-secondary text-white"
                      placeholder="+91 98765 43210"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label text-secondary small">Email Address</label>
                    <input
                      type="email"
                      className="form-control bg-input border-secondary text-white"
                      placeholder="client@example.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label text-secondary small">Billing / Delivery Address</label>
                    <input
                      type="text"
                      className="form-control bg-input border-secondary text-white"
                      placeholder="Shop #4, Commercial Complex, MG Road (Optional)"
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="card-custom p-3 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-bold text-white mb-0">Products & Quantities</h6>
                    <small className="text-secondary">Quantities will be deducted from inventory automatically</small>
                  </div>
                  {products.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning text-gold"
                      onClick={handleAddCartRow}
                    >
                      <i className="bi bi-plus me-1"></i> Add Another Item
                    </button>
                  )}
                </div>

                <div className="table-responsive">
                  <table className="table table-dark align-middle mb-0">
                    <thead>
                      <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                        <th style={{ width: '42%' }}>Product</th>
                        <th style={{ width: '15%' }}>Price</th>
                        <th style={{ width: '18%' }}>Qty</th>
                        <th style={{ width: '15%' }} className="text-end">Line Total</th>
                        <th style={{ width: '10%' }} className="text-end"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-secondary">
                            No products available to add. Please add products to inventory first.
                          </td>
                        </tr>
                      ) : (
                        cartItems.map((item, index) => {
                          const prod = products.find(p => p.id === Number(item.productId)) || products[0];
                          const stockCount = prod?.stock || 0;
                          const isOverStock = item.qty > stockCount;

                          return (
                            <tr key={index} className="border-bottom border-secondary">
                              <td>
                                <select
                                  className="form-select form-select-sm bg-input border-secondary text-white"
                                  value={item.productId}
                                  onChange={(e) => handleCartChange(index, 'productId', e.target.value)}
                                >
                                  {products.map(p => (
                                    <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                      {p.name} (Stock: {p.stock} {p.unit || 'pcs'}) - ₹{p.price}
                                      {p.stock <= 0 ? ' [OUT OF STOCK]' : ''}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <span className="text-secondary">₹{prod?.price || 0}</span>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  className={`form-control form-control-sm bg-input text-white ${isOverStock ? 'border-danger text-danger' : 'border-secondary'}`}
                                  value={item.qty}
                                  onChange={(e) => handleCartChange(index, 'qty', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                />
                                {isOverStock && (
                                  <small className="text-danger d-block mt-1">
                                    <i className="bi bi-exclamation-circle me-1"></i>Max available: {stockCount}
                                  </small>
                                )}
                              </td>
                              <td className="text-end fw-semibold text-white">
                                ₹{(Number(prod?.price || 0) * (Number(item.qty) || 1)).toLocaleString('en-IN')}
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-icon text-danger"
                                  onClick={() => handleRemoveCartRow(index)}
                                  title="Remove row"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Math Summary & Payment Mode Breakdown */}
              <div className="row g-4 mb-4">
                {/* Payment Configuration */}
                <div className="col-12 col-md-6">
                  <div className="card-custom p-3 bg-secondary-dark h-100">
                    <h6 className="text-white fw-bold mb-3">Payment Settlement & Advance</h6>

                    {/* Mode Selector */}
                    <div className="mb-3">
                      <label className="form-label text-secondary small">Payment Settlement Type</label>
                      <div className="btn-group w-100" role="group">
                        <button
                          type="button"
                          className={`btn btn-sm ${paymentMode === 'full' ? 'btn-gold' : 'btn-outline-secondary'}`}
                          onClick={() => setPaymentMode('full')}
                        >
                          <i className="bi bi-check-circle me-1"></i> Full Paid (100%)
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${paymentMode === 'partial' ? 'btn-gold' : 'btn-outline-secondary'}`}
                          onClick={() => {
                            setPaymentMode('partial');
                            if (!customPaidAmount) setCustomPaidAmount(String(Math.round(grandTotal / 2)));
                          }}
                        >
                          <i className="bi bi-pie-chart me-1"></i> Partial Payment
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${paymentMode === 'credit' ? 'btn-gold' : 'btn-outline-secondary'}`}
                          onClick={() => setPaymentMode('credit')}
                        >
                          <i className="bi bi-clock-history me-1"></i> Credit / Full Due
                        </button>
                      </div>
                    </div>

                    {/* Partial Amount Input if selected */}
                    {paymentMode === 'partial' && (
                      <div className="mb-3 p-2 rounded bg-dark border border-warning">
                        <label className="form-label text-white small fw-bold">
                          Amount Received Now (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={grandTotal}
                          className="form-control bg-input border-secondary text-white fw-bold"
                          placeholder="e.g. 5000"
                          value={customPaidAmount}
                          onChange={(e) => setCustomPaidAmount(e.target.value)}
                          required
                        />
                        <div className="small text-secondary mt-1">
                          Remaining ₹{effectiveDueLater.toLocaleString('en-IN')} will be logged as pending due.
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label text-secondary small">Payment Method *</label>
                      <select
                        className="form-select bg-input border-secondary text-white"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="UPI">UPI / QR Code (GPay, PhonePe, Paytm)</option>
                        <option value="Card">Credit / Debit Card (POS Machine)</option>
                        <option value="Cash">Cash on Counter</option>
                        <option value="Bank Transfer">Net Banking / NEFT</option>
                      </select>
                    </div>

                    <div className="p-3 rounded bg-dark border border-secondary text-secondary small">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Amount to Receive:</span>
                        <strong className="text-success">₹{effectivePaidNow.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Balance Left as Due:</span>
                        <strong className={effectiveDueLater > 0 ? 'text-danger' : 'text-white'}>
                          ₹{effectiveDueLater.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtotal & Taxes Breakdown */}
                <div className="col-12 col-md-6">
                  <div className="card-custom p-3 bg-secondary-dark">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-secondary">Subtotal:</span>
                      <span className="text-white fw-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-secondary">Discount (₹):</span>
                      <input
                        type="number"
                        min="0"
                        max={subtotal}
                        className="form-control form-control-sm bg-input border-secondary text-white text-end"
                        style={{ width: 110 }}
                        value={discount}
                        onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, Number(e.target.value) || 0)))}
                      />
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-secondary">GST Tax Rate:</span>
                      <select
                        className="form-select form-select-sm bg-input border-secondary text-white text-end"
                        style={{ width: 110 }}
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                      >
                        <option value="0">0% (Exempt)</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                        <option value="28">28% GST</option>
                      </select>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-secondary">Calculated Tax:</span>
                      <span className="text-white fw-medium">₹{taxVal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="d-flex justify-content-between pt-2 border-top border-secondary">
                      <span className="fw-bold text-white fs-5">Grand Total:</span>
                      <span className="fw-bold text-gold fs-5">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="d-flex justify-content-between py-1 border-top border-secondary mt-2 text-success">
                      <span>Amount Received Now:</span>
                      <span className="fw-bold">₹{effectivePaidNow.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="d-flex justify-content-between py-1 border-top border-warning mt-1">
                      <span className={effectiveDueLater > 0 ? 'text-danger fw-bold' : 'text-secondary'}>
                        Remaining Balance Due:
                      </span>
                      <span className={`fw-bold ${effectiveDueLater > 0 ? 'text-danger' : 'text-success'}`}>
                        ₹{effectiveDueLater.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {hasStockErrors && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                  <span>One or more items exceed available stock. Please adjust quantities before finalizing the sale.</span>
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 pt-3 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-secondary-custom"
                  onClick={() => setIsNewSaleOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-gold px-4"
                  disabled={products.length === 0 || cartItems.length === 0 || hasStockErrors}
                >
                  <i className="bi bi-check2-circle me-1"></i> Finalize Sale & Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: COLLECT / RECORD PAYMENT FOR OVERDUE INVOICE    */}
      {/* ======================================================== */}
      {isPaymentModalOpen && (
        <div className="iq-modal-backdrop" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="iq-modal-container modal-md p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <div>
                <h5 className="modal-title text-white fw-bold mb-0">Record Invoice Payment</h5>
                <small className="text-secondary">
                  Settle outstanding balance on this invoice
                </small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setIsPaymentModalOpen(false)}
              ></button>
            </div>

            <form onSubmit={handleProcessPayment}>
              <div className="p-3 rounded bg-secondary-dark border border-secondary mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-secondary small">Invoice Number:</span>
                  <span className="text-gold fw-bold">#{paymentTarget.saleId}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-secondary small">Customer:</span>
                  <span className="text-white fw-semibold">{paymentTarget.customerName}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary">
                  <span className="text-danger small fw-semibold">Balance Due:</span>
                  <span className="text-danger fw-bold fs-6">₹{Number(paymentTarget.dueAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-secondary small mb-0">Amount Received (₹) *</label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-gold text-decoration-none p-0"
                    onClick={() => setCollectAmount(String(paymentTarget.dueAmount))}
                  >
                    Pay Full Due (₹{paymentTarget.dueAmount})
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  max={paymentTarget.dueAmount || 9999999}
                  className="form-control bg-input border-secondary text-white fw-bold fs-5"
                  placeholder="0"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-secondary small">Payment Method *</label>
                <select
                  className="form-select bg-input border-secondary text-white"
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Cash">Cash on Counter</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Card">Card Swipe (POS)</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label text-secondary small">Reference Note / Transaction ID (Optional)</label>
                <input
                  type="text"
                  className="form-control bg-input border-secondary text-white"
                  placeholder="e.g. UTR / UPI Ref #12345"
                  value={collectNote}
                  onChange={(e) => setCollectNote(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 pt-3 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-secondary-custom"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-gold px-4"
                  disabled={!collectAmount || Number(collectAmount) <= 0}
                >
                  <i className="bi bi-check-circle me-1"></i> Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
