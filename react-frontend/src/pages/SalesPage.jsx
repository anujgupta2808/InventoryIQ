import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

export const SalesPage = () => {
  const {
    sales,
    products,
    customers,
    createSale,
    setActiveInvoice,
    setIsInvoiceOpen,
    setCurrentPage,
    exportCSV,
    showToast
  } = useInventory();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [currentPage, setCurrentPageNum] = useState(1);
  const itemsPerPage = 8;

  // New Sale Modal State
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [customerType, setCustomerType] = useState(customers.length > 0 ? 'existing' : 'walkin');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinEmail, setWalkinEmail] = useState('');
  const [walkinAddress, setWalkinAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(12); // 12% GST

  // Cart / Line items
  const [cartItems, setCartItems] = useState(() => 
    products.length > 0 ? [{ productId: products[0].id, qty: 1 }] : []
  );

  const handleOpenNewSale = () => {
    setCustomerType(customers.length > 0 ? 'existing' : 'walkin');
    setSelectedCustomerId(customers[0]?.id || '');
    setWalkinName('');
    setWalkinPhone('');
    setWalkinEmail('');
    setWalkinAddress('');
    if (products.length > 0) {
      setCartItems([{ productId: products[0].id, qty: 1 }]);
    } else {
      setCartItems([]);
    }
    setDiscount(0);
    setIsNewSaleOpen(true);
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchSearch = s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPayment = selectedPayment === 'All' || s.paymentMethod === selectedPayment;
      return matchSearch && matchPayment;
    });
  }, [sales, searchTerm, selectedPayment]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  // Cart calculations
  const calculatedItems = useMemo(() => {
    return cartItems.map(item => {
      const p = products.find(x => x.id === Number(item.productId));
      const price = p ? p.price : 0;
      const total = price * (Number(item.qty) || 1);
      return {
        productId: item.productId,
        name: p?.name || 'Selected Product',
        qty: Number(item.qty) || 1,
        price,
        total,
        availableStock: p?.stock || 0
      };
    });
  }, [cartItems, products]);

  const subtotal = calculatedItems.reduce((acc, i) => acc + i.total, 0);
  const discountVal = Number(discount) || 0;
  const taxable = Math.max(0, subtotal - discountVal);
  const taxVal = Math.round(taxable * (Number(taxRate) / 100));
  const grandTotal = taxable + taxVal;

  const handleAddCartRow = () => {
    const existingIds = new Set(cartItems.map(c => Number(c.productId)));
    const nextProd = products.find(p => !existingIds.has(p.id)) || products[0];
    if (nextProd) {
      setCartItems(prev => [...prev, { productId: nextProd.id, qty: 1 }]);
    }
  };

  const handleRemoveCartRow = (index) => {
    if (cartItems.length === 1) {
      showToast('Warning', 'A sale must have at least one product.', 'warning');
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
      showToast('No Products in Cart', 'Please add products to your sale invoice.', 'danger');
      return;
    }

    // Validate stocks
    for (const item of calculatedItems) {
      if (item.qty > item.availableStock) {
        showToast('Insufficient Stock', `Only ${item.availableStock} available for "${item.name}".`, 'danger');
        return;
      }
    }

    let customerName = (walkinName || '').trim() || 'Walk-in Customer';
    let custId = null;
    let customerPhone = walkinPhone.trim();
    let customerEmail = walkinEmail.trim();
    let customerAddress = walkinAddress.trim();

    if (customerType === 'existing') {
      const c = customers.find(x => x.id === Number(selectedCustomerId));
      if (c) {
        customerName = c.name;
        custId = c.id;
        customerPhone = c.phone;
        customerEmail = c.email;
        customerAddress = c.address;
      }
    }

    const newSale = createSale({
      customerId: custId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
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
      paymentMethod
    });

    setIsNewSaleOpen(false);

    // Open invoice preview
    setActiveInvoice(newSale);
    setIsInvoiceOpen(true);
  };

  const handleViewInvoice = (s) => {
    setActiveInvoice(s);
    setIsInvoiceOpen(true);
  };

  const handleExport = () => {
    const headers = ['Invoice ID', 'Date', 'Customer', 'Amount', 'Payment Method', 'Status'];
    const rows = filteredSales.map(s => [
      s.id,
      s.date,
      s.customerName,
      s.amount,
      s.paymentMethod,
      s.status
    ]);
    exportCSV('Sales_History', rows, headers);
  };

  return (
    <div className="sales-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Sales Management</h2>
          <p className="page-subtitle text-secondary mb-0">Record sales, auto-sync customer profiles, and automatically deduct inventory</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary-custom d-flex align-items-center gap-2"
            onClick={handleExport}
          >
            <i className="bi bi-download text-gold"></i>
            <span>Export Sales</span>
          </button>
          <button
            type="button"
            className="btn btn-gold d-flex align-items-center gap-2"
            onClick={handleOpenNewSale}
          >
            <i className="bi bi-plus-lg"></i>
            <span>+ New Sale</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card-custom p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-input border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-input border-secondary text-white"
                placeholder="Search invoice number or customer name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPageNum(1); }}
              />
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <select
              className="form-select bg-input border-secondary text-white"
              value={selectedPayment}
              onChange={(e) => { setSelectedPayment(e.target.value); setCurrentPageNum(1); }}
            >
              <option value="All">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-3 text-md-end">
            <button
              type="button"
              className="btn btn-secondary-custom w-100"
              onClick={() => { setSearchTerm(''); setSelectedPayment('All'); }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                <th scope="col" style={{ width: 100 }}>#</th>
                <th scope="col">Date</th>
                <th scope="col">Customer</th>
                <th scope="col">Amount</th>
                <th scope="col">Payment</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    {sales.length === 0 ? (
                      <div className="py-3">
                        <i className="bi bi-receipt fs-2 d-block mb-2 text-muted"></i>
                        <h6 className="text-white mb-1">No sales recorded yet</h6>
                        <p className="text-secondary small mb-3">Record transactions to auto-create customer records and deduct inventory stock.</p>
                        <button
                          type="button"
                          className="btn btn-gold btn-sm"
                          onClick={handleOpenNewSale}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Record First Sale
                        </button>
                      </div>
                    ) : (
                      <>
                        <i className="bi bi-receipt fs-2 d-block mb-2 text-muted"></i>
                        No sales records found matching your filters.
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedSales.map((s) => (
                  <tr key={s.id} className="border-bottom border-secondary">
                    <td>
                      <span
                        className="fw-bold text-gold cursor-pointer"
                        onClick={() => handleViewInvoice(s)}
                        style={{ cursor: 'pointer' }}
                      >
                        {s.id}
                      </span>
                    </td>
                    <td className="text-secondary">{s.date}</td>
                    <td className="fw-semibold text-white">{s.customerName}</td>
                    <td className="fw-bold text-gold">₹{s.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <span className="badge badge-secondary">{s.paymentMethod}</span>
                    </td>
                    <td>
                      <span className="badge badge-success">{s.status}</span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-icon"
                          onClick={() => handleViewInvoice(s)}
                          title="View / Print Tax Invoice"
                        >
                          <i className="bi bi-printer text-gold"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-icon"
                          onClick={() => handleViewInvoice(s)}
                          title="Invoice Details"
                        >
                          <i className="bi bi-eye text-secondary"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between p-3 border-top border-secondary">
            <small className="text-secondary">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} sales
            </small>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPageNum(prev => Math.max(1, prev - 1))}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`btn ${currentPage === i + 1 ? 'btn-gold' : 'btn-outline-secondary'}`}
                  onClick={() => setCurrentPageNum(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
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

      {/* New Sale Modal (Point-of-Sale line items) */}
      {isNewSaleOpen && (
        <div className="iq-modal-backdrop" onClick={() => setIsNewSaleOpen(false)}>
          <div className="iq-modal-container modal-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <div>
                <h5 className="modal-title text-white fw-bold mb-0">Create New Sale</h5>
                <small className="text-secondary">
                  Customer data will sync to Customer CRM & purchased quantities will be deducted from Inventory stock
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
                  <span><strong>No products in inventory!</strong> Add products via Purchases or directly in Inventory to record sales.</span>
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
              {/* Customer Selector & Inputs */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-4">
                  <label className="form-label text-secondary small">Customer Source</label>
                  <div className="btn-group w-100" role="group">
                    {customers.length > 0 && (
                      <button
                        type="button"
                        className={`btn btn-sm ${customerType === 'existing' ? 'btn-gold' : 'btn-outline-secondary'}`}
                        onClick={() => setCustomerType('existing')}
                      >
                        Existing Customer
                      </button>
                    )}
                    <button
                      type="button"
                      className={`btn btn-sm ${customerType === 'walkin' ? 'btn-gold' : 'btn-outline-secondary'}`}
                      onClick={() => setCustomerType('walkin')}
                    >
                      + New / Walk-in Customer
                    </button>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-secondary small">Payment Method *</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Cash">Cash on Counter</option>
                    <option value="Bank Transfer">Net Banking / NEFT</option>
                  </select>
                </div>
              </div>

              {/* Customer Info Card */}
              {customerType === 'existing' ? (
                <div className="p-3 rounded bg-secondary-dark border border-secondary mb-4">
                  <label className="form-label text-secondary small">Select Customer *</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'No phone'}) - {c.totalOrders || 0} orders
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded bg-secondary-dark border border-warning mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-gold fw-semibold small">
                      <i className="bi bi-person-plus-fill me-1"></i> Customer Information
                    </span>
                    <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                      Auto-saves to Customer CRM
                    </span>
                  </div>
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <label className="form-label text-secondary small">Customer Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control bg-input border-secondary text-white"
                        placeholder="e.g. Rahul Sharma"
                        value={walkinName}
                        onChange={(e) => setWalkinName(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label text-secondary small">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control bg-input border-secondary text-white"
                        placeholder="+91 98111 22334"
                        value={walkinPhone}
                        onChange={(e) => setWalkinPhone(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label text-secondary small">Email Address (Optional)</label>
                      <input
                        type="email"
                        className="form-control bg-input border-secondary text-white"
                        placeholder="rahul@example.com"
                        value={walkinEmail}
                        onChange={(e) => setWalkinEmail(e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label text-secondary small">Billing / Delivery Address (Optional)</label>
                      <input
                        type="text"
                        className="form-control bg-input border-secondary text-white"
                        placeholder="Apartment, Street, City"
                        value={walkinAddress}
                        onChange={(e) => setWalkinAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

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
                        <th style={{ width: '45%' }}>Product</th>
                        <th style={{ width: '15%' }}>Price</th>
                        <th style={{ width: '15%' }}>Qty</th>
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
                                  max={prod?.stock || 999}
                                  className="form-control form-control-sm bg-input border-secondary text-white"
                                  value={item.qty}
                                  onChange={(e) => handleCartChange(index, 'qty', e.target.value)}
                                />
                                {prod && prod.stock < item.qty && (
                                  <small className="text-danger d-block">Only {prod.stock} in stock</small>
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

              {/* Financial Math Summary */}
              <div className="row justify-content-end mb-4">
                <div className="col-12 col-md-5">
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
                        className="form-control form-control-sm bg-input border-secondary text-white text-end"
                        style={{ width: 100 }}
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-secondary">Tax Rate:</span>
                      <select
                        className="form-select form-select-sm bg-input border-secondary text-white text-end"
                        style={{ width: 100 }}
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                      >
                        <option value="0">0%</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST</option>
                      </select>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-secondary">GST Amount:</span>
                      <span className="text-white fw-medium">₹{taxVal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="d-flex justify-content-between pt-2 border-top border-warning">
                      <span className="fw-bold text-white fs-5">Grand Total:</span>
                      <span className="fw-bold text-gold fs-5">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

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
                  disabled={products.length === 0 || cartItems.length === 0}
                >
                  <i className="bi bi-check2-circle me-1"></i> Finalize Sale & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
