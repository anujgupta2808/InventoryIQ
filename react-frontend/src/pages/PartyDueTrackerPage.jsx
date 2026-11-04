import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

export const PartyDueTrackerPage = () => {
  const {
    sales,
    recordPayment,
    setActiveInvoice,
    setIsInvoiceOpen,
    exportCSV,
    showToast,
    stats
  } = useInventory();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'due_only' | 'settled_only'

  // Collect Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState({ saleId: null, customerName: '', dueAmount: 0 });
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('UPI');
  const [collectNote, setCollectNote] = useState('');

  // Person Detailed Statement Modal State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

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

  // --- Person-wise Ledger Aggregation ---
  const personLedgers = useMemo(() => {
    const map = new Map();

    sales.forEach(s => {
      const name = (s.customerName || '').trim() || 'Walk-in Customer';
      const key = name.toLowerCase();

      const billed = Number(s.amount) || 0;
      const paid = getSalePaid(s);
      const due = getSaleDue(s);

      if (!map.has(key)) {
        map.set(key, {
          name,
          phone: s.customerPhone || '',
          email: s.customerEmail || '',
          address: s.customerAddress || '',
          totalBilled: 0,
          totalReceived: 0,
          totalDue: 0,
          invoicesCount: 0,
          lastDate: s.date,
          invoices: []
        });
      }

      const entry = map.get(key);
      entry.totalBilled += billed;
      entry.totalReceived += paid;
      entry.totalDue += due;
      entry.invoicesCount += 1;
      if (!entry.phone && s.customerPhone) entry.phone = s.customerPhone;
      if (!entry.email && s.customerEmail) entry.email = s.customerEmail;
      if (!entry.address && s.customerAddress) entry.address = s.customerAddress;
      entry.invoices.push(s);
    });

    return Array.from(map.values()).map(p => ({
      ...p,
      collectionRate: p.totalBilled > 0 ? Math.min(100, Math.round((p.totalReceived / p.totalBilled) * 100)) : 100,
      status: p.totalDue <= 0 ? 'Settled' : (p.totalReceived > 0 ? 'Partial Due' : 'Full Due')
    }));
  }, [sales]);

  // Overall Financial Stats for Party Dues
  const totalBilled = useMemo(() => personLedgers.reduce((acc, p) => acc + p.totalBilled, 0), [personLedgers]);
  const totalReceived = useMemo(() => personLedgers.reduce((acc, p) => acc + p.totalReceived, 0), [personLedgers]);
  const totalDue = useMemo(() => personLedgers.reduce((acc, p) => acc + p.totalDue, 0), [personLedgers]);
  const partiesWithDuesCount = useMemo(() => personLedgers.filter(p => p.totalDue > 0).length, [personLedgers]);
  const clearedPartiesCount = useMemo(() => personLedgers.filter(p => p.totalDue <= 0).length, [personLedgers]);

  // Filtered List
  const filteredLedgers = useMemo(() => {
    return personLedgers.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.phone.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (filterType === 'due_only') return p.totalDue > 0;
      if (filterType === 'settled_only') return p.totalDue <= 0;
      return true;
    });
  }, [personLedgers, searchTerm, filterType]);

  // Handlers
  const handleOpenCollect = (person) => {
    setPaymentTarget({
      saleId: null,
      customerName: person.name,
      dueAmount: person.totalDue
    });
    setCollectAmount(person.totalDue > 0 ? String(person.totalDue) : '');
    setCollectMethod('UPI');
    setCollectNote(`Payment installment for ${person.name}`);
    setIsPaymentModalOpen(true);
  };

  const handleOpenStatement = (person) => {
    setSelectedPerson(person);
    setIsStatementModalOpen(true);
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
      if (selectedPerson && selectedPerson.name.toLowerCase() === paymentTarget.customerName.toLowerCase()) {
        const updated = personLedgers.find(p => p.name.toLowerCase() === paymentTarget.customerName.toLowerCase());
        if (updated) setSelectedPerson(updated);
      }
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Person / Client Name',
      'Contact Phone',
      'Email',
      'Invoices Count',
      'Total Billed Amount',
      'Amount Received (Paid)',
      'Money Not Received (Pending Due)',
      'Collection Rate (%)',
      'Status'
    ];
    const rows = filteredLedgers.map(p => [
      p.name,
      p.phone || 'N/A',
      p.email || 'N/A',
      p.invoicesCount,
      `₹${p.totalBilled}`,
      `₹${p.totalReceived}`,
      `₹${p.totalDue}`,
      `${p.collectionRate}%`,
      p.status
    ]);
    exportCSV('Party_Due_Tracker_Ledger', rows, headers);
  };

  return (
    <div className="party-due-tracker-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Party Due Tracker</h2>
          <p className="page-subtitle text-secondary mb-0">
            Track amount received, money not received, and outstanding balance per person
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary-custom d-flex align-items-center gap-2"
            onClick={handleExportCSV}
          >
            <i className="bi bi-file-earmark-arrow-down text-gold"></i>
            <span>Export Ledger CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights: Billed vs Received vs Not Received (Due) */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="stat-card">
            <span className="stat-card-title">Total Clients / Parties</span>
            <div className="stat-card-value text-white">{personLedgers.length}</div>
            <div className="stat-card-footer">
              <span className="stat-trend up">
                <i className="bi bi-people-fill"></i> Accounts on file
              </span>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="stat-card">
            <span className="stat-card-title">Total Invoiced (Billed)</span>
            <div className="stat-card-value text-gold">
              ₹{totalBilled.toLocaleString('en-IN')}
            </div>
            <div className="stat-card-footer">
              <span className="stat-trend up">
                <i className="bi bi-receipt"></i> Lifetime billed
              </span>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <span className="stat-card-title">Amount Received (Paid)</span>
            <div className="stat-card-value text-success">
              ₹{totalReceived.toLocaleString('en-IN')}
            </div>
            <div className="stat-card-footer">
              <span className="text-success small fw-medium">
                <i className="bi bi-check-circle me-1"></i>
                {totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 100}% Cleared
              </span>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="stat-card"
            style={{
              borderColor: totalDue > 0 ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.3)'
            }}
          >
            <span className="stat-card-title">Money Not Received (Due)</span>
            <div className={`stat-card-value ${totalDue > 0 ? 'text-danger' : 'text-success'}`}>
              ₹{totalDue.toLocaleString('en-IN')}
            </div>
            <div className="stat-card-footer">
              <span className={`small fw-medium ${totalDue > 0 ? 'text-warning' : 'text-success'}`}>
                <i className={`bi ${totalDue > 0 ? 'bi-exclamation-triangle-fill' : 'bi-shield-check'} me-1`}></i>
                {totalDue > 0 ? `${partiesWithDuesCount} clients have pending dues` : 'All client dues settled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-custom p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-5">
            <div className="iq-search-bar">
              <i className="bi bi-search iq-search-icon"></i>
              <input
                type="text"
                className="iq-search-input"
                placeholder="Search person / client name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="iq-search-clear"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="btn-group w-100" role="group">
              <button
                type="button"
                className={`btn btn-sm ${filterType === 'all' ? 'btn-gold fw-bold' : 'btn-outline-secondary text-secondary'}`}
                onClick={() => setFilterType('all')}
              >
                All Parties ({personLedgers.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterType === 'due_only' ? 'btn-gold fw-bold' : 'btn-outline-secondary text-secondary'}`}
                onClick={() => setFilterType('due_only')}
              >
                With Pending Dues ({partiesWithDuesCount})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterType === 'settled_only' ? 'btn-gold fw-bold' : 'btn-outline-secondary text-secondary'}`}
                onClick={() => setFilterType('settled_only')}
              >
                Fully Settled ({clearedPartiesCount})
              </button>
            </div>
          </div>

          <div className="col-12 col-md-3 text-md-end text-secondary small">
            Showing <strong className="text-white">{filteredLedgers.length}</strong> of {personLedgers.length} client ledgers
          </div>
        </div>
      </div>

      {/* Party / Client Ledger Table */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead className="bg-secondary-dark border-bottom border-secondary text-secondary small text-uppercase">
              <tr>
                <th className="py-3 px-3">Person / Client</th>
                <th className="py-3 text-center">Bills</th>
                <th className="py-3 text-end">Total Billed</th>
                <th className="py-3 text-end text-success">Amount Received</th>
                <th className="py-3 text-end text-danger">Money Not Received (Due)</th>
                <th className="py-3" style={{ minWidth: 150 }}>Settlement Progress</th>
                <th className="py-3 text-center">Status</th>
                <th className="py-3 text-end px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="py-4">
                      <i className="bi bi-people fs-2 text-secondary d-block mb-2"></i>
                      <h6 className="text-white mb-1">No client accounts found</h6>
                      <p className="text-secondary small mb-0">
                        {searchTerm
                          ? `No client matches your search "${searchTerm}".`
                          : 'As you create sales with customer names, their received amounts and dues will appear here automatically.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLedgers.map(person => (
                  <tr key={person.name} className="border-bottom border-secondary">
                    <td className="py-3 px-3">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                          style={{
                            width: 38,
                            height: 38,
                            background: person.totalDue > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: person.totalDue > 0 ? '#EF4444' : '#10B981',
                            border: `1px solid ${person.totalDue > 0 ? '#EF4444' : '#10B981'}`
                          }}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold text-white">{person.name}</div>
                          {person.phone ? (
                            <small className="text-secondary d-block">
                              <i className="bi bi-telephone me-1"></i>{person.phone}
                            </small>
                          ) : (
                            <small className="text-muted d-block">No phone on file</small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 text-center">
                      <span className="badge bg-secondary-dark text-white border border-secondary px-2 py-1">
                        {person.invoicesCount} {person.invoicesCount === 1 ? 'bill' : 'bills'}
                      </span>
                    </td>

                    <td className="py-3 text-end fw-semibold text-white">
                      ₹{person.totalBilled.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 text-end fw-bold text-success">
                      ₹{person.totalReceived.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 text-end">
                      {person.totalDue > 0 ? (
                        <span className="fw-bold text-danger fs-6">
                          ₹{person.totalDue.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-secondary small fw-medium">
                          <i className="bi bi-check-all text-success me-1"></i>₹0 (Settled)
                        </span>
                      )}
                    </td>

                    <td className="py-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 6, backgroundColor: '#262626' }}>
                          <div
                            className={`progress-bar ${person.collectionRate === 100 ? 'bg-success' : 'bg-warning'}`}
                            role="progressbar"
                            style={{ width: `${person.collectionRate}%` }}
                            aria-valuenow={person.collectionRate}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <span className="small text-secondary" style={{ width: 42, fontSize: '0.75rem' }}>
                          {person.collectionRate}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3 text-center">
                      <span className={`badge ${
                        person.totalDue <= 0 ? 'badge-success' : person.totalReceived > 0 ? 'badge-warning text-dark' : 'badge-danger'
                      }`}>
                        {person.totalDue <= 0 ? 'Settled' : person.totalReceived > 0 ? 'Partial Due' : 'Full Due'}
                      </span>
                    </td>

                    <td className="py-3 text-end px-3">
                      <div className="d-inline-flex align-items-center gap-1">
                        {person.totalDue > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-gold d-inline-flex align-items-center gap-1"
                            onClick={() => handleOpenCollect(person)}
                            title="Collect payment installment from this person"
                          >
                            <i className="bi bi-cash-stack"></i>
                            <span>Collect</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                          onClick={() => handleOpenStatement(person)}
                          title="View individual statement & historical bills"
                        >
                          <i className="bi bi-journal-text"></i>
                          <span>Statement</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: COLLECT / RECORD PAYMENT FOR PERSON             */}
      {/* ======================================================== */}
      {isPaymentModalOpen && (
        <div className="iq-modal-backdrop" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="iq-modal-container modal-md p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <div>
                <h5 className="modal-title text-white fw-bold mb-0">Record Payment Received</h5>
                <small className="text-secondary">
                  Credit funds directly against client ledger balance
                </small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setIsPaymentModalOpen(false)}
              ></button>
            </div>

            <form onSubmit={handleProcessPayment}>
              {/* Target Details */}
              <div className="p-3 rounded bg-secondary-dark border border-secondary mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-secondary small">Person / Client:</span>
                  <span className="text-white fw-bold">{paymentTarget.customerName}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary">
                  <span className="text-danger small fw-semibold">Current Money Due:</span>
                  <span className="text-danger fw-bold fs-6">₹{Number(paymentTarget.dueAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Amount Input */}
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

              {/* Payment Method */}
              <div className="mb-3">
                <label className="form-label text-secondary small">Payment Method *</label>
                <select
                  className="form-select bg-input border-secondary text-white"
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                >
                  <option value="UPI">UPI / QR Code (GPay, PhonePe, Paytm)</option>
                  <option value="Cash">Cash on Counter</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                  <option value="Card">Card Swipe (POS)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="mb-3">
                <label className="form-label text-secondary small">Reference Note / Transaction ID (Optional)</label>
                <input
                  type="text"
                  className="form-control bg-input border-secondary text-white"
                  placeholder="e.g. UTR / UPI Ref #12345 or Cash receipt note"
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
                  <i className="bi bi-check-circle me-1"></i> Confirm & Credit Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: PERSON DETAILED STATEMENT & BILL BREAKDOWN      */}
      {/* ======================================================== */}
      {isStatementModalOpen && selectedPerson && (
        <div className="iq-modal-backdrop" onClick={() => setIsStatementModalOpen(false)}>
          <div className="iq-modal-container modal-lg p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: 820 }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-start mb-3 pb-3 border-bottom border-secondary">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-4"
                  style={{
                    width: 48,
                    height: 48,
                    background: selectedPerson.totalDue > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: selectedPerson.totalDue > 0 ? '#EF4444' : '#10B981',
                    border: `1px solid ${selectedPerson.totalDue > 0 ? '#EF4444' : '#10B981'}`
                  }}
                >
                  {selectedPerson.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="modal-title text-white fw-bold mb-0">{selectedPerson.name}</h5>
                  <small className="text-secondary">
                    {selectedPerson.phone ? `Phone: ${selectedPerson.phone}` : 'No phone recorded'}
                    {selectedPerson.email ? ` • ${selectedPerson.email}` : ''}
                  </small>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                {selectedPerson.totalDue > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-gold d-flex align-items-center gap-1"
                    onClick={() => {
                      setIsStatementModalOpen(false);
                      handleOpenCollect(selectedPerson);
                    }}
                  >
                    <i className="bi bi-cash-stack"></i> Collect Payment
                  </button>
                )}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setIsStatementModalOpen(false)}
                ></button>
              </div>
            </div>

            {/* Financial Summary Cards for this person */}
            <div className="row g-3 mb-4">
              <div className="col-4">
                <div className="p-3 rounded bg-secondary-dark border border-secondary text-center">
                  <span className="text-secondary small d-block">Total Billed</span>
                  <span className="text-white fw-bold fs-5">
                    ₹{selectedPerson.totalBilled.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="col-4">
                <div className="p-3 rounded bg-secondary-dark border border-secondary text-center">
                  <span className="text-success small d-block">Amount Received</span>
                  <span className="text-success fw-bold fs-5">
                    ₹{selectedPerson.totalReceived.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="col-4">
                <div className="p-3 rounded bg-secondary-dark border border-secondary text-center">
                  <span className="text-danger small d-block">Balance Due (Pending)</span>
                  <span className="text-danger fw-bold fs-5">
                    ₹{selectedPerson.totalDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <h6 className="text-white fw-bold mb-2">
              <i className="bi bi-clock-history text-gold me-2"></i>Invoice Breakdown for {selectedPerson.name}
            </h6>
            <div className="table-responsive mb-4">
              <table className="table table-dark table-striped align-middle mb-0">
                <thead>
                  <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th className="text-end">Total Amount</th>
                    <th className="text-end text-success">Received</th>
                    <th className="text-end text-danger">Due</th>
                    <th className="text-center">Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPerson.invoices.map(inv => {
                    const invPaid = getSalePaid(inv);
                    const invDue = getSaleDue(inv);
                    const invStatus = getSaleStatus(inv);

                    return (
                      <tr key={inv.id} className="border-bottom border-secondary">
                        <td className="fw-semibold text-gold">#{inv.id}</td>
                        <td className="text-secondary small">{inv.date}</td>
                        <td className="text-end fw-semibold text-white">
                          ₹{Number(inv.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="text-end text-success fw-semibold">
                          ₹{invPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="text-end text-danger fw-semibold">
                          ₹{invDue.toLocaleString('en-IN')}
                        </td>
                        <td className="text-center">
                          <span className={`badge ${
                            invStatus === 'Paid' ? 'badge-success' : invStatus === 'Partial' ? 'badge-warning text-dark' : 'badge-danger'
                          }`}>
                            {invStatus}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning text-gold py-0 px-2"
                            onClick={() => {
                              setIsStatementModalOpen(false);
                              setActiveInvoice(inv);
                              setIsInvoiceOpen(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary">
              <small className="text-secondary">
                InventoryIQ Party Ledger • Verified accounts receivable
              </small>
              <button
                type="button"
                className="btn btn-secondary-custom btn-sm"
                onClick={() => setIsStatementModalOpen(false)}
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

