import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

export const PurchasesPage = () => {
  const {
    purchases,
    products,
    categories,
    suppliers,
    createPurchase,
    setPurchases,
    setProducts,
    exportCSV,
    showToast
  } = useInventory();

  // Dynamic Categories from state & products
  const allCategories = useMemo(() => {
    return Array.from(new Set([...categories, ...products.map(p => p.category).filter(Boolean)]));
  }, [categories, products]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);
  const [selectedPoDetails, setSelectedPoDetails] = useState(null);

  // Supplier Mode: 'existing' | 'new'
  const [supplierMode, setSupplierMode] = useState(suppliers.length > 0 ? 'existing' : 'new');
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');

  const [poStatus, setPoStatus] = useState('Completed');

  // Line items state
  const getInitialPoItems = () => {
    if (products && products.length > 0) {
      return [{
        productId: products[0].id,
        name: products[0].name,
        category: products[0].category,
        qty: 20,
        cost: products[0].costPrice || 50,
        sellingPrice: products[0].price || Math.round((products[0].costPrice || 50) * 1.35),
        isNew: false
      }];
    }
    return [{
      productId: '',
      name: '',
      category: allCategories[0] || '',
      qty: 20,
      cost: 50,
      sellingPrice: 75,
      isNew: true
    }];
  };

  const [poItems, setPoItems] = useState(getInitialPoItems);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const matchSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
      return matchSearch && matchStatus;
    });
  }, [purchases, searchTerm, selectedStatus]);

  const handleOpenNewPo = () => {
    setSupplierMode(suppliers.length > 0 ? 'existing' : 'new');
    setPoSupplierId(suppliers[0]?.id || '');
    setNewSupplierName('');
    setNewContactPerson('');
    setNewSupplierPhone('');
    setNewSupplierEmail('');
    setNewSupplierAddress('');
    setPoItems(getInitialPoItems());
    setIsNewPoOpen(true);
  };

  const handleAddPoRow = () => {
    if (products.length > 0) {
      const existingIds = new Set(poItems.map(i => Number(i.productId)));
      const nextProd = products.find(p => !existingIds.has(p.id)) || products[0];
      setPoItems(prev => [...prev, {
        productId: nextProd.id,
        name: nextProd.name,
        category: nextProd.category,
        qty: 15,
        cost: nextProd.costPrice || 50,
        sellingPrice: nextProd.price || Math.round((nextProd.costPrice || 50) * 1.35),
        isNew: false
      }]);
    } else {
      setPoItems(prev => [...prev, {
        productId: '',
        name: '',
        category: allCategories[0] || '',
        qty: 15,
        cost: 50,
        sellingPrice: 75,
        isNew: true
      }]);
    }
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
          if (value === '__NEW__') {
            return {
              ...item,
              productId: '',
              isNew: true,
              name: '',
              category: allCategories[0] || '',
              cost: item.cost || 50,
              sellingPrice: item.sellingPrice || 75
            };
          }
          const matchedP = products.find(p => p.id === Number(value));
          return {
            ...item,
            productId: value,
            isNew: false,
            name: matchedP?.name || item.name,
            category: matchedP?.category || item.category,
            cost: matchedP?.costPrice || item.cost,
            sellingPrice: matchedP?.price || Math.round((matchedP?.costPrice || item.cost) * 1.35)
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const totalPoAmount = poItems.reduce((acc, i) => acc + (Number(i.qty || 0) * Number(i.cost || 0)), 0);

  const handleSubmitPo = (e) => {
    e.preventDefault();

    // Validate supplier
    let supplierName = '';
    let newSuppData = null;

    if (supplierMode === 'existing') {
      const sup = suppliers.find(s => s.id === Number(poSupplierId));
      if (!sup) {
        showToast('Validation Error', 'Please select a supplier.', 'danger');
        return;
      }
      supplierName = sup.name;
    } else {
      if (!newSupplierName.trim()) {
        showToast('Validation Error', 'Please enter a Supplier Company Name.', 'danger');
        return;
      }
      supplierName = newSupplierName.trim();
      newSuppData = {
        name: supplierName,
        contactPerson: newContactPerson.trim(),
        phone: newSupplierPhone.trim(),
        email: newSupplierEmail.trim(),
        address: newSupplierAddress.trim()
      };
    }

    // Validate items
    for (const item of poItems) {
      if (item.isNew && !item.name.trim()) {
        showToast('Validation Error', 'Please enter a name for all new products.', 'danger');
        return;
      }
      if (Number(item.qty) <= 0 || Number(item.cost) < 0) {
        showToast('Validation Error', 'Item quantity and cost must be greater than zero.', 'danger');
        return;
      }
    }

    const formattedItems = poItems.map(i => {
      let finalName = i.name;
      let finalCat = i.category;
      if (!i.isNew && i.productId) {
        const p = products.find(x => x.id === Number(i.productId));
        if (p) {
          finalName = p.name;
          finalCat = p.category;
        }
      }
      return {
        productId: i.isNew ? null : i.productId,
        name: finalName,
        category: finalCat,
        qty: Number(i.qty),
        cost: Number(i.cost),
        price: Number(i.sellingPrice) || Math.round(Number(i.cost) * 1.35)
      };
    });

    createPurchase({
      supplierId: supplierMode === 'existing' ? poSupplierId : null,
      supplierName,
      newSupplierData: newSuppData,
      amount: totalPoAmount,
      status: poStatus,
      items: formattedItems
    });

    setIsNewPoOpen(false);
  };

  const handleMarkCompleted = (po) => {
    if (po.status === 'Completed') return;

    // Replenish stock or auto-create in inventory
    if (po.items && po.items.length) {
      setProducts(prev => {
        let updated = [...prev];
        po.items.forEach(item => {
          const existingIdx = updated.findIndex(p =>
            (item.productId && p.id === Number(item.productId)) ||
            (item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
          );
          if (existingIdx >= 0) {
            const existing = updated[existingIdx];
            const newStock = existing.stock + Number(item.qty);
            const status = newStock <= 0 ? 'Out of Stock' : (newStock <= existing.minStock ? 'Low Stock' : 'In Stock');
            updated[existingIdx] = {
              ...existing,
              stock: newStock,
              costPrice: Number(item.cost) || existing.costPrice,
              status
            };
          } else {
            const newProdId = updated.length > 0 ? Math.max(...updated.map(p => p.id)) + 1 : 1;
            const cost = Number(item.cost) || 0;
            const price = Number(item.price) || Math.round(cost * 1.35) || (cost + 50);
            const qty = Number(item.qty) || 1;
            const newProd = {
              id: newProdId,
              name: item.name || `Product #${newProdId}`,
              sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
              category: item.category ? String(item.category).trim() : 'General',
              stock: qty,
              minStock: 20,
              costPrice: cost,
              price: price,
              unit: 'Piece',
              status: qty <= 0 ? 'Out of Stock' : 'In Stock',
              supplierId: po.supplierId || 1,
              supplierName: po.supplierName || 'Supplier'
            };
            updated.unshift(newProd);
          }
        });
        return updated;
      });
    }

    setPurchases(prev => prev.map(p => p.id === po.id ? { ...p, status: 'Completed' } : p));
    showToast('PO Received', `Order #${po.id} marked as Received. Stock added to Inventory catalog.`);
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
          <p className="page-subtitle text-secondary mb-0">Procure stock, auto-register supplier contacts, and restock inventory</p>
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
            onClick={handleOpenNewPo}
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
            <div className="iq-search-bar">
              <i className="bi bi-search iq-search-icon"></i>
              <input
                type="text"
                className="iq-search-input"
                placeholder="Search PO number or supplier name..."
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
          <div className="col-12 col-sm-6 col-md-4">
            <select
              className="form-select iq-toolbar-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All PO Statuses</option>
              <option value="Completed">Completed / Received</option>
              <option value="Pending">Pending Delivery</option>
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
                    {purchases.length === 0 ? (
                      <div className="py-3">
                        <i className="bi bi-box-arrow-in-down fs-2 d-block mb-2 text-muted"></i>
                        <h6 className="text-white mb-1">No purchase orders recorded yet</h6>
                        <p className="text-secondary small mb-3">Procure inventory items from suppliers. Contacts and inventory will sync automatically!</p>
                        <button
                          type="button"
                          className="btn btn-gold btn-sm"
                          onClick={handleOpenNewPo}
                        >
                          <i className="bi bi-plus-lg me-1"></i> + New Purchase
                        </button>
                      </div>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-down fs-2 d-block mb-2 text-muted"></i>
                        No purchase orders found matching your search.
                      </>
                    )}
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
          <div className="iq-modal-container modal-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <div>
                <h5 className="modal-title text-white fw-bold mb-0">Create Purchase Order</h5>
                <small className="text-secondary">
                  Supplier will be auto-saved in Contacts & products will be auto-added to Inventory catalog
                </small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setIsNewPoOpen(false)}
              ></button>
            </div>

            <form onSubmit={handleSubmitPo}>
              {/* Supplier Mode Selector */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-5">
                  <label className="form-label text-secondary small">Supplier / Vendor Source</label>
                  <div className="btn-group w-100" role="group">
                    {suppliers.length > 0 && (
                      <button
                        type="button"
                        className={`btn btn-sm ${supplierMode === 'existing' ? 'btn-gold' : 'btn-outline-secondary'}`}
                        onClick={() => setSupplierMode('existing')}
                      >
                        Existing Supplier
                      </button>
                    )}
                    <button
                      type="button"
                      className={`btn btn-sm ${supplierMode === 'new' ? 'btn-gold' : 'btn-outline-secondary'}`}
                      onClick={() => setSupplierMode('new')}
                    >
                      + New Supplier Contact
                    </button>
                  </div>
                </div>

                <div className="col-12 col-md-7">
                  <label className="form-label text-secondary small">Fulfillment Status</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={poStatus}
                    onChange={(e) => setPoStatus(e.target.value)}
                  >
                    <option value="Completed">Received (Auto-add/increase stock in Inventory now)</option>
                    <option value="Pending">Pending Delivery (Stock updates upon receiving)</option>
                  </select>
                </div>
              </div>

              {/* Supplier Details */}
              {supplierMode === 'existing' ? (
                <div className="p-3 rounded bg-secondary-dark border border-secondary mb-4">
                  <label className="form-label text-secondary small">Select Supplier from Contacts *</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contactPerson ? `${s.contactPerson} - ` : ''}{s.phone || 'No phone'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded bg-secondary-dark border border-warning mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-gold fw-semibold small">
                      <i className="bi bi-person-plus-fill me-1"></i> New Supplier Contact
                    </span>
                    <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                      Auto-saves to Contacts page
                    </span>
                  </div>
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <label className="form-label text-secondary small">Company / Supplier Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control bg-input border-secondary text-white"
                        placeholder="e.g. Apex Hardware Supplies"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label text-secondary small">Contact Person</label>
                      <input
                        type="text"
                        className="form-control bg-input border-secondary text-white"
                        placeholder="e.g. Vikram Sharma"
                        value={newContactPerson}
                        onChange={(e) => setNewContactPerson(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label text-secondary small">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control bg-input border-secondary text-white"
                        placeholder="+91 98765 43210"
                        value={newSupplierPhone}
                        onChange={(e) => setNewSupplierPhone(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-secondary small">Email Address (Optional)</label>
                      <input
                        type="email"
                        className="form-control bg-input border-secondary text-white"
                        placeholder="orders@apexsupplies.com"
                        value={newSupplierEmail}
                        onChange={(e) => setNewSupplierEmail(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-secondary small">Address / Warehouse (Optional)</label>
                      <input
                        type="text"
                        className="form-control bg-input border-secondary text-white"
                        placeholder="Lamington Road, Mumbai"
                        value={newSupplierAddress}
                        onChange={(e) => setNewSupplierAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="card-custom p-3 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-bold text-white mb-0">Products to Procure</h6>
                    <small className="text-secondary">
                      Items purchased will automatically appear in your Inventory page
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning text-gold"
                    onClick={handleAddPoRow}
                  >
                    <i className="bi bi-plus me-1"></i> Add Another Item
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-dark align-middle mb-0">
                    <thead>
                      <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                        <th style={{ width: '40%' }}>Product</th>
                        <th style={{ width: '18%' }}>Category</th>
                        <th style={{ width: '14%' }}>Unit Cost (₹)</th>
                        <th style={{ width: '12%' }}>Qty</th>
                        <th style={{ width: '12%' }} className="text-end">Subtotal</th>
                        <th style={{ width: '4%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((item, index) => {
                        const lineTotal = (Number(item.qty) || 0) * (Number(item.cost) || 0);
                        return (
                          <tr key={index} className="border-bottom border-secondary">
                            <td>
                              {item.isNew || products.length === 0 ? (
                                <div>
                                  <input
                                    type="text"
                                    required
                                    className="form-control form-control-sm bg-input border-secondary text-white mb-1"
                                    placeholder="Enter new product name..."
                                    value={item.name}
                                    onChange={(e) => handlePoItemChange(index, 'name', e.target.value)}
                                  />
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                                      Auto-adds to Inventory
                                    </span>
                                    {products.length > 0 && (
                                      <button
                                        type="button"
                                        className="btn btn-link p-0 text-secondary text-decoration-none"
                                        style={{ fontSize: '0.72rem' }}
                                        onClick={() => handlePoItemChange(index, 'productId', products[0].id)}
                                      >
                                        Pick Existing Product
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <select
                                    className="form-select form-select-sm bg-input border-secondary text-white"
                                    value={item.productId}
                                    onChange={(e) => handlePoItemChange(index, 'productId', e.target.value)}
                                  >
                                    {products.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (In Stock: {p.stock} {p.unit || 'pcs'})
                                      </option>
                                    ))}
                                    <option value="__NEW__">+ Enter New Product to Add...</option>
                                  </select>
                                </div>
                              )}
                            </td>
                            <td>
                              {item.isNew || products.length === 0 ? (
                                <>
                                  <input
                                    type="text"
                                    list="purchaseCatList"
                                    className="form-control form-control-sm bg-input border-secondary text-white"
                                    placeholder="Category..."
                                    value={item.category || ''}
                                    onChange={(e) => handlePoItemChange(index, 'category', e.target.value)}
                                  />
                                  <datalist id="purchaseCatList">
                                    {allCategories.map(c => (
                                      <option key={c} value={c} />
                                    ))}
                                  </datalist>
                                </>
                              ) : (
                                <span className="text-secondary small">{item.category || 'General'}</span>
                              )}
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                required
                                className="form-control form-control-sm bg-input border-secondary text-white"
                                value={item.cost}
                                onChange={(e) => handlePoItemChange(index, 'cost', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                required
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
                                title="Remove row"
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
                  <i className="bi bi-check2-circle me-1"></i> Place Purchase & Sync Inventory
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
