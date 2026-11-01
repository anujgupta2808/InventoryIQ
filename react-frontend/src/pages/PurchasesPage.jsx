import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

export const PurchasesPage = () => {
  const {
    purchases,
    products,
    suppliers,
    createPurchase,
    setPurchases,
    setProducts,
    exportCSV,
    showToast
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);
  const [selectedPoDetails, setSelectedPoDetails] = useState(null);

  // New PO State
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || 1);
  const [poStatus, setPoStatus] = useState('Completed');
  const [poItems, setPoItems] = useState([
    { productId: products[0]?.id || 1, qty: 50, cost: products[0]?.costPrice || 30 }
  ]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
      return matchSearch && matchStatus;
    });
  }, [purchases, searchTerm, selectedStatus]);

  const handleAddPoRow = () => {
    const existingIds = new Set(poItems.map(i => Number(i.productId)));
    const nextProd = products.find(p => !existingIds.has(p.id)) || products[0];
    setPoItems(prev => [...prev, {
      productId: nextProd.id,
      qty: 20,
      cost: nextProd.costPrice || 50
    }]);
  };

  const handleRemovePoRow = (index) => {
    if (poItems.length === 1) {
      showToast('Warning', 'A purchase order must include at least one item.', 'warning');
      return;
    }
    setPoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePoItemChange = (index, field, value) => {
    setPoItems(prev => prev.map((item, i) => {
      if (i === index) {
        if (field === 'productId') {
          const matchedP = products.find(p => p.id === Number(value));
          return {
            ...item,
            productId: value,
            cost: matchedP?.costPrice || item.cost
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const totalPoAmount = poItems.reduce((acc, i) => acc + (Number(i.qty) * Number(i.cost)), 0);

  const handleSubmitPo = (e) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === Number(poSupplierId)) || suppliers[0];

    const formattedItems = poItems.map(i => {
      const prod = products.find(p => p.id === Number(i.productId));
      return {
        productId: i.productId,
        name: prod?.name || 'Item',
        qty: Number(i.qty),
        cost: Number(i.cost)
      };
    });

    createPurchase({
      supplierId: sup.id,
      supplierName: sup.name,
      amount: totalPoAmount,
      status: poStatus,
      items: formattedItems
    });

    setIsNewPoOpen(false);
    setPoItems([{ productId: products[0]?.id || 1, qty: 50, cost: products[0]?.costPrice || 30 }]);
  };

  const handleMarkCompleted = (po) => {
    if (po.status === 'Completed') return;

    // Replenish stock
    if (po.items && po.items.length) {
      setProducts(prev => prev.map(p => {
        const line = po.items.find(i => Number(i.productId) === p.id);
        if (line) {
          const newStock = p.stock + Number(line.qty);
          const status = newStock <= 0 ? 'Out of Stock' : (newStock <= p.minStock ? 'Low Stock' : 'In Stock');
          return { ...p, stock: newStock, status };
        }
        return p;
      }));
    }

    setPurchases(prev => prev.map(p => p.id === po.id ? { ...p, status: 'Completed' } : p));
    showToast('PO Received', `Order #${po.id} marked as Completed. Stock replenishment confirmed.`);
  };

  const handleExport = () => {
    const headers = ['Order ID', 'Date', 'Supplier', 'Amount', 'Status'];
    const rows = filteredPurchases.map(p => [
      p.id,
      p.date,
      p.supplierName,
      p.amount,
      p.status
    ]);
    exportCSV('Purchase_Orders', rows, headers);
  };

  return (
    <div className="purchases-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Purchases</h2>
          <p className="page-subtitle text-secondary mb-0">Manage your purchase orders</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary-custom d-flex align-items-center gap-2"
            onClick={handleExport}
          >
            <i className="bi bi-download text-gold"></i>
            <span>Export POs</span>
          </button>
          <button
            type="button"
            className="btn btn-gold d-flex align-items-center gap-2"
            onClick={() => setIsNewPoOpen(true)}
          >
            <i className="bi bi-plus-lg"></i>
            <span>+ New Purchase</span>
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
                placeholder="Search PO number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <select
              className="form-select bg-input border-secondary text-white"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All PO Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending / In Transit</option>
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-3 text-md-end">
            <button
              type="button"
              className="btn btn-secondary-custom w-100"
              onClick={() => { setSearchTerm(''); setSelectedStatus('All'); }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Purchases Orders Table */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                <th scope="col" style={{ width: 100 }}>#</th>
                <th scope="col">Date</th>
                <th scope="col">Supplier</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-secondary">
                    <i className="bi bi-box-arrow-in-down fs-2 d-block mb-2 text-muted"></i>
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="border-bottom border-secondary">
                    <td>
                      <span
                        className="fw-bold text-gold cursor-pointer"
                        onClick={() => setSelectedPoDetails(p)}
                        style={{ cursor: 'pointer' }}
                      >
                        {p.id}
                      </span>
                    </td>
                    <td className="text-secondary">{p.date}</td>
                    <td className="fw-semibold text-white">{p.supplierName}</td>
                    <td className="fw-bold text-gold">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${p.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        {p.status === 'Pending' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleMarkCompleted(p)}
                            title="Mark as Received & Restock"
                          >
                            <i className="bi bi-check2"></i> Receive
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-icon"
                          onClick={() => setSelectedPoDetails(p)}
                          title="View PO Details"
                        >
                          <i className="bi bi-eye text-gold"></i>
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

      {/* New Purchase Order Modal */}
      {isNewPoOpen && (
        <div className="iq-modal-backdrop" onClick={() => setIsNewPoOpen(false)}>
          <div className="iq-modal-container modal-lg p-4" onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <div>
                <h5 className="modal-title text-white fw-bold mb-0">Create Purchase Order</h5>
                <small className="text-secondary">Procure inventory items from verified suppliers</small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setIsNewPoOpen(false)}
              ></button>
            </div>

            <form onSubmit={handleSubmitPo}>
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-7">
                  <label className="form-label text-secondary small">Supplier *</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contactPerson}) - {s.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-5">
                  <label className="form-label text-secondary small">Delivery / Fulfillment Status</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={poStatus}
                    onChange={(e) => setPoStatus(e.target.value)}
                  >
                    <option value="Completed">Received (Auto-increase stock now)</option>
                    <option value="Pending">Pending Delivery</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="card-custom p-3 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold text-white mb-0">Products to Restock</h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning text-gold"
                    onClick={handleAddPoRow}
                  >
                    <i className="bi bi-plus me-1"></i> Add Item
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-dark align-middle mb-0">
                    <thead>
                      <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                        <th style={{ width: '45%' }}>Product</th>
                        <th style={{ width: '20%' }}>Unit Cost (₹)</th>
                        <th style={{ width: '15%' }}>Qty</th>
                        <th style={{ width: '15%' }} className="text-end">Subtotal</th>
                        <th style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((item, index) => {
                        const lineTotal = (Number(item.qty) || 0) * (Number(item.cost) || 0);
                        return (
                          <tr key={index} className="border-bottom border-secondary">
                            <td>
                              <select
                                className="form-select form-select-sm bg-input border-secondary text-white"
                                value={item.productId}
                                onChange={(e) => handlePoItemChange(index, 'productId', e.target.value)}
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (Current: {p.stock} {p.unit}s)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm bg-input border-secondary text-white"
                                value={item.cost}
                                onChange={(e) => handlePoItemChange(index, 'cost', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm bg-input border-secondary text-white"
                                value={item.qty}
                                onChange={(e) => handlePoItemChange(index, 'qty', e.target.value)}
                              />
                            </td>
                            <td className="text-end fw-semibold text-white">
                              ₹{lineTotal.toLocaleString('en-IN')}
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-icon text-danger"
                                onClick={() => handleRemovePoRow(index)}
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary */}
              <div className="d-flex justify-content-between align-items-center p-3 rounded bg-secondary-dark mb-4">
                <span className="text-secondary">Estimated Total Procurement Cost:</span>
                <span className="text-gold fw-bold fs-4">₹{totalPoAmount.toLocaleString('en-IN')}</span>
              </div>

              <div className="d-flex justify-content-end gap-2 pt-3 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-secondary-custom"
                  onClick={() => setIsNewPoOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold px-4">
                  <i className="bi bi-check2-circle me-1"></i> Place Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Order Details Modal */}
      {selectedPoDetails && (
        <div className="iq-modal-backdrop" onClick={() => setSelectedPoDetails(null)}>
          <div className="iq-modal-container p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <div>
                <h5 className="modal-title text-white fw-bold mb-0">Purchase Order #{selectedPoDetails.id}</h5>
                <small className="text-secondary">Issued on {selectedPoDetails.date}</small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setSelectedPoDetails(null)}
              ></button>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-6">
                <small className="text-secondary d-block">Supplier</small>
                <span className="text-white fw-semibold">{selectedPoDetails.supplierName}</span>
              </div>
              <div className="col-6 text-end">
                <small className="text-secondary d-block">Order Status</small>
                <span className={`badge ${selectedPoDetails.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                  {selectedPoDetails.status}
                </span>
              </div>
            </div>

            <div className="card-custom p-3 mb-3">
              <div className="table-responsive">
                <table className="table table-dark table-sm align-middle mb-0">
                  <thead>
                    <tr className="text-secondary small">
                      <th>Item</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Cost</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPoDetails.items || []).map((item, idx) => (
                      <tr key={idx} className="border-bottom border-secondary">
                        <td className="text-white">{item.name}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-end">₹{item.cost}</td>
                        <td className="text-end text-gold fw-semibold">₹{(item.qty * item.cost).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center p-3 bg-secondary-dark rounded mb-3">
              <span className="text-white fw-medium">Total Order Amount</span>
              <span className="text-gold fw-bold fs-5">₹{selectedPoDetails.amount.toLocaleString('en-IN')}</span>
            </div>

            <div className="d-flex justify-content-end gap-2 pt-2 border-top border-secondary">
              <button
                type="button"
                className="btn btn-secondary-custom"
                onClick={() => setSelectedPoDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

