import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

export const InventoryPage = () => {
  const {
    products,
    categories,
    suppliers,
    addProduct,
    updateProduct,
    deleteProduct,
    openConfirm,
    exportCSV,
    lowStockItems,
    showToast
  } = useInventory();

  // Dynamic Categories from state & products
  const allCategories = useMemo(() => {
    return Array.from(new Set([...categories, ...products.map(p => p.category).filter(Boolean)]));
  }, [categories, products]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPageNum] = useState(1);
  const itemsPerPage = 8;

  // Modal States
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'details' | null
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form State
  const initialFormState = {
    name: '',
    sku: '',
    category: allCategories[0] || '',
    stock: '',
    minStock: '20',
    price: '',
    costPrice: '',
    unit: 'Piece',
    supplierId: suppliers[0]?.id || ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchStat = selectedStatus === 'All' || p.status === selectedStatus;
      return matchSearch && matchCat && matchStat;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (valA - valB) : (valB - valA);
    });
  }, [products, searchTerm, selectedCategory, selectedStatus, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedProduct(null);
    setFormData(initialFormState);
  };

  const handleGenerateSku = () => {
    const randomSku = `SKU-${Math.floor(100 + Math.random() * 900)}`;
    setFormData(prev => ({ ...prev, sku: randomSku }));
  };

  const handleOpenAdd = () => {
    setFormData({
      ...initialFormState,
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`
    });
    setModalMode('add');
  };

  const handleOpenEdit = (p) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      category: p.category,
      stock: p.stock,
      minStock: p.minStock,
      price: p.price,
      costPrice: p.costPrice,
      unit: p.unit || 'Piece',
      supplierId: p.supplierId || 1
    });
    setModalMode('edit');
  };

  const handleOpenDetails = (p) => {
    setSelectedProduct(p);
    setModalMode('details');
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const cleanName = String(formData.name || '').trim();
    const cleanSku = String(formData.sku || '').trim().toUpperCase();
    const cleanCat = String(formData.category || '').trim();
    const cleanPrice = parseFloat(formData.price);
    const cleanCost = parseFloat(formData.costPrice || 0);
    const cleanStock = parseInt(formData.stock, 10);
    const cleanMinStock = parseInt(formData.minStock || 0, 10);

    if (!cleanName) {
      showToast('Validation Error', 'Please enter a product name.', 'danger');
      return;
    }
    if (!cleanSku) {
      showToast('Validation Error', 'Please enter or generate a product SKU.', 'danger');
      return;
    }

    // Check duplicate SKU
    const skuExists = products.some(p =>
      p.sku.toUpperCase() === cleanSku &&
      (modalMode === 'add' || p.id !== selectedProduct?.id)
    );
    if (skuExists) {
      showToast('Duplicate SKU', `A product with SKU "${cleanSku}" already exists in your catalog.`, 'danger');
      return;
    }

    if (isNaN(cleanPrice) || cleanPrice <= 0) {
      showToast('Validation Error', 'Selling price must be greater than zero.', 'danger');
      return;
    }

    if (isNaN(cleanCost) || cleanCost < 0) {
      showToast('Validation Error', 'Cost price cannot be negative.', 'danger');
      return;
    }

    if (isNaN(cleanStock) || cleanStock < 0) {
      showToast('Validation Error', 'Available stock cannot be negative.', 'danger');
      return;
    }

    if (isNaN(cleanMinStock) || cleanMinStock < 0) {
      showToast('Validation Error', 'Min stock alert level cannot be negative.', 'danger');
      return;
    }

    const matchedSupplier = suppliers.find(s => s.id === Number(formData.supplierId));

    const payload = {
      ...formData,
      name: cleanName,
      sku: cleanSku,
      category: cleanCat || 'General',
      price: cleanPrice,
      costPrice: cleanCost,
      stock: cleanStock,
      minStock: cleanMinStock,
      supplierName: matchedSupplier?.name || 'Local Supplier'
    };

    if (modalMode === 'add') {
      addProduct(payload);
    } else if (modalMode === 'edit') {
      updateProduct(selectedProduct.id, payload);
    }
    handleCloseModal();
  };

  const handleDelete = (p) => {
    openConfirm({
      title: 'Delete Product',
      message: `Are you sure you want to permanently delete "${p.name}"? This action cannot be reversed.`,
      confirmText: 'Delete Product',
      confirmVariant: 'danger',
      onConfirm: () => deleteProduct(p.id)
    });
  };

  const handleExport = () => {
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Stock', 'Min Stock', 'Price', 'Cost Price', 'Unit', 'Status', 'Supplier'];
    const rows = filteredProducts.map(p => [
      p.id,
      p.name,
      p.sku,
      p.category,
      p.stock,
      p.minStock,
      p.price,
      p.costPrice,
      p.unit,
      p.status,
      p.supplierName
    ]);
    exportCSV('Inventory_Products', rows, headers);
  };

  return (
    <div className="inventory-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Inventory Management</h2>
          <p className="page-subtitle text-secondary mb-0">Manage products, stock levels, safety alerts and categories</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary-custom d-flex align-items-center gap-2"
            onClick={handleExport}
          >
            <i className="bi bi-file-earmark-arrow-down text-gold"></i>
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-gold d-flex align-items-center gap-2"
            onClick={handleOpenAdd}
          >
            <i className="bi bi-plus-lg"></i>
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && selectedStatus !== 'Low Stock' && (
        <div className="alert-card-warning mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2 p-3 rounded">
          <div className="d-flex align-items-center gap-2 text-warning">
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
            <span>
              <strong>Low Stock Alert:</strong> {lowStockItems.length} products have reached or fallen below safety thresholds.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            onClick={() => setSelectedStatus('Low Stock')}
          >
            View Low Stock ({lowStockItems.length})
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="card-custom p-3 mb-4">
        <div className="row g-3 align-items-center">
          {/* Search Box */}
          <div className="col-12 col-md-4">
            <div className="iq-search-bar">
              <i className="bi bi-search iq-search-icon"></i>
              <input
                type="text"
                className="iq-search-input"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPageNum(1); }}
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

          {/* Category Filter */}
          <div className="col-12 col-sm-6 col-md-3">
            <select
              className="form-select iq-toolbar-select"
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPageNum(1); }}
            >
              <option value="All">All Categories ({products.length})</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-12 col-sm-6 col-md-3">
            <select
              className="form-select iq-toolbar-select"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPageNum(1); }}
            >
              <option value="All">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="col-12 col-md-2 text-md-end">
            <button
              type="button"
              className="btn btn-secondary-custom w-100"
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedStatus('All'); }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Product Table Card */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                <th scope="col" style={{ width: 60 }}>#</th>
                <th scope="col" onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Product <i className="bi bi-arrow-down-up ms-1"></i>
                </th>
                <th scope="col" onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                  Category <i className="bi bi-arrow-down-up ms-1"></i>
                </th>
                <th scope="col" onClick={() => handleSort('stock')} style={{ cursor: 'pointer' }}>
                  Stock <i className="bi bi-arrow-down-up ms-1"></i>
                </th>
                <th scope="col" onClick={() => handleSort('price')} style={{ cursor: 'pointer' }}>
                  Price <i className="bi bi-arrow-down-up ms-1"></i>
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end" style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    {products.length === 0 ? (
                      <div className="py-3">
                        <i className="bi bi-box-seam fs-2 d-block mb-2 text-muted"></i>
                        <h6 className="text-white mb-1">No products in inventory yet</h6>
                        <p className="text-secondary small mb-3">Build your catalog by adding your first product with stock and pricing.</p>
                        <button type="button" className="btn btn-gold btn-sm" onClick={handleOpenAdd}>
                          <i className="bi bi-plus-lg me-1"></i> Add First Product
                        </button>
                      </div>
                    ) : (
                      <>
                        <i className="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                        No products matched your search or filter criteria.
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, index) => (
                  <tr key={p.id} className="border-bottom border-secondary">
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="product-table-thumb">
                          <i className="bi bi-box-seam text-gold"></i>
                        </div>
                        <div>
                          <div
                            className="fw-semibold text-white cursor-pointer"
                            onClick={() => handleOpenDetails(p)}
                            style={{ cursor: 'pointer' }}
                          >
                            {p.name}
                          </div>
                          <small className="text-muted">SKU: {p.sku}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{p.category}</span>
                    </td>
                    <td>
                      <span className="fw-semibold text-white">{p.stock}</span>
                      <small className="text-secondary ms-1">{p.unit || 'pcs'}</small>
                      {p.stock <= p.minStock && p.stock > 0 && (
                        <small className="d-block text-warning" style={{ fontSize: '0.75rem' }}>
                          Min: {p.minStock}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className="fw-semibold text-gold">₹{p.price}</span>
                      <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>Cost: ₹{p.costPrice}</small>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'In Stock' ? 'badge-success' :
                          p.status === 'Low Stock' ? 'badge-warning' : 'badge-danger'
                        }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-icon"
                          onClick={() => handleOpenDetails(p)}
                          title="View Product Details"
                        >
                          <i className="bi bi-eye text-secondary"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-icon"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product"
                        >
                          <i className="bi bi-pencil-square text-gold"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-icon"
                          onClick={() => handleDelete(p)}
                          title="Delete Product"
                        >
                          <i className="bi bi-trash3 text-danger"></i>
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
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} items
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

      {/* Add / Edit Product Modal */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="iq-modal-backdrop" onClick={handleCloseModal}>
          <div className="iq-modal-container modal-lg p-4" onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <h5 className="modal-title text-white fw-bold">
                {modalMode === 'add' ? 'Add New Product' : `Edit Product #${selectedProduct?.sku}`}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCloseModal}
              ></button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="row g-3">
                <div className="col-12 col-md-8">
                  <label className="form-label text-secondary small">Product Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control bg-input border-secondary text-white"
                    placeholder="e.g. Copper Wire 2.5mm Heavy"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label text-secondary small mb-0">SKU / Code *</label>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-gold text-decoration-none"
                      style={{ fontSize: '0.75rem' }}
                      onClick={handleGenerateSku}
                    >
                      <i className="bi bi-magic me-1"></i>Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    className="form-control bg-input border-secondary text-white"
                    placeholder="SKU-101"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label text-secondary small">Category *</label>
                  <input
                    type="text"
                    required
                    list="categoryDataList"
                    className="form-control bg-input border-secondary text-white"
                    placeholder="e.g. Electronics, Hardware, Apparel..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                  <datalist id="categoryDataList">
                    {allCategories.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-secondary small">Unit of Measure</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="Piece">Piece (pc)</option>
                    <option value="Pack">Pack</option>
                    <option value="Box">Box</option>
                    <option value="Roll">Roll</option>
                    <option value="Rim">Rim</option>
                    <option value="Kit">Kit</option>
                    <option value="Bottle">Bottle</option>
                  </select>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label text-secondary small">Cost / Purchase Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-control bg-input border-secondary text-white"
                    placeholder="300"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label text-secondary small">Selling Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    className="form-control bg-input border-secondary text-white"
                    placeholder="450"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label text-secondary small">Available Stock *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="form-control bg-input border-secondary text-white"
                    placeholder="50"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <label className="form-label text-secondary small">Min Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control bg-input border-secondary text-white"
                    placeholder="15"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label text-secondary small">Primary Supplier</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  >
                    {suppliers.length === 0 ? (
                      <option value="">No suppliers added yet (Optional)</option>
                    ) : (
                      suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.contactPerson || s.phone})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-secondary-custom"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  {modalMode === 'add' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {modalMode === 'details' && selectedProduct && (
        <div className="iq-modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="iq-modal-container p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <h5 className="modal-title text-white fw-bold">Product Information</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setModalMode(null)}
              ></button>
            </div>

            <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-secondary-dark rounded">
              <div className="product-table-thumb" style={{ width: 54, height: 54 }}>
                <i className="bi bi-box-seam fs-3 text-gold"></i>
              </div>
              <div>
                <h5 className="text-white fw-bold mb-0">{selectedProduct.name}</h5>
                <span className="text-gold small fw-medium">SKU: {selectedProduct.sku}</span>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-6">
                <small className="text-secondary d-block">Category</small>
                <span className="text-white fw-medium">{selectedProduct.category}</span>
              </div>
              <div className="col-6">
                <small className="text-secondary d-block">Status</small>
                <span className={`badge ${selectedProduct.status === 'In Stock' ? 'badge-success' :
                    selectedProduct.status === 'Low Stock' ? 'badge-warning' : 'badge-danger'
                  }`}>
                  {selectedProduct.status}
                </span>
              </div>
              <div className="col-6">
                <small className="text-secondary d-block">Selling Price</small>
                <span className="text-gold fw-bold fs-5">₹{selectedProduct.price}</span>
              </div>
              <div className="col-6">
                <small className="text-secondary d-block">Cost Price</small>
                <span className="text-white fw-semibold">₹{selectedProduct.costPrice}</span>
              </div>
              <div className="col-6">
                <small className="text-secondary d-block">Current Stock</small>
                <span className="text-white fw-bold fs-5">{selectedProduct.stock} {selectedProduct.unit}s</span>
              </div>
              <div className="col-6">
                <small className="text-secondary d-block">Safety Reorder Level</small>
                <span className="text-warning fw-semibold">{selectedProduct.minStock} {selectedProduct.unit}s</span>
              </div>
              <div className="col-12">
                <small className="text-secondary d-block">Supplier</small>
                <span className="text-white fw-medium">{selectedProduct.supplierName || 'ABC Traders'}</span>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
              <button
                type="button"
                className="btn btn-secondary-custom"
                onClick={() => setModalMode(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => {
                  const p = selectedProduct;
                  setModalMode(null);
                  handleOpenEdit(p);
                }}
              >
                <i className="bi bi-pencil-square me-1"></i> Edit Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

