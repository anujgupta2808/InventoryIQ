import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const SuppliersPage = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    openConfirm,
    exportCSV,
    showToast
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const initialForm = {
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    status: 'Active'
  };
  const [formData, setFormData] = useState(initialForm);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setModalMode('add');
  };

  const handleOpenEdit = (s) => {
    setSelectedSupplier(s);
    setFormData({
      name: s.name,
      contactPerson: s.contactPerson || '',
      email: s.email,
      phone: s.phone,
      address: s.address || '',
      status: s.status || 'Active'
    });
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSupplier(null);
    setFormData(initialForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = String(formData.name || '').trim();
    const cleanEmail = String(formData.email || '').trim().toLowerCase();
    const cleanPhone = String(formData.phone || '').trim();

    if (!cleanName) {
      showToast('Validation Error', 'Please enter a supplier or company name.', 'danger');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Validation Error', 'Please enter a valid email address.', 'danger');
      return;
    }
    if (!cleanPhone) {
      showToast('Validation Error', 'Please provide a contact phone number.', 'danger');
      return;
    }

    const payload = {
      ...formData,
      name: cleanName,
      contactPerson: String(formData.contactPerson || '').trim(),
      email: cleanEmail,
      phone: cleanPhone,
      address: String(formData.address || '').trim()
    };

    if (modalMode === 'add') {
      addSupplier(payload);
    } else if (modalMode === 'edit') {
      updateSupplier(selectedSupplier.id, payload);
    }
    handleCloseModal();
  };

  const handleDelete = (s) => {
    openConfirm({
      title: 'Delete Supplier',
      message: `Are you sure you want to remove "${s.name}"? Past purchase logs will retain supplier history.`,
      confirmText: 'Delete Supplier',
      confirmVariant: 'danger',
      onConfirm: () => deleteSupplier(s.id)
    });
  };

  const handleExport = () => {
    const headers = ['ID', 'Company Name', 'Contact Person', 'Email', 'Phone', 'Address', 'Status', 'Total Purchases'];
    const rows = filteredSuppliers.map(s => [
      s.id,
      s.name,
      s.contactPerson,
      s.email,
      s.phone,
      s.address,
      s.status,
      s.totalPurchases
    ]);
    exportCSV('Suppliers_Directory', rows, headers);
  };

  return (
    <div className="suppliers-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Contact / Suppliers</h2>
          <p className="page-subtitle text-secondary mb-0">Manage supplier information and contacts</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary-custom d-flex align-items-center gap-2"
            onClick={handleExport}
          >
            <i className="bi bi-download text-gold"></i>
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-gold d-flex align-items-center gap-2"
            onClick={handleOpenAdd}
          >
            <i className="bi bi-plus-lg"></i>
            <span>+ Add Contact</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="card-custom p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-6">
            <div className="iq-search-bar">
              <i className="bi bi-search iq-search-icon"></i>
              <input
                type="text"
                className="iq-search-input"
                placeholder="Search by supplier name, contact person, email or phone..."
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
          <div className="col-12 col-md-6 text-md-end text-secondary small">
            Registered Partners: <strong className="text-white">{suppliers.length}</strong>
          </div>
        </div>
      </div>

      {/* Supplier List (styled like the reference screenshot) */}
      <div className="d-flex flex-column gap-3 mb-4">
        {filteredSuppliers.length === 0 ? (
          <div className="card-custom p-5 text-center text-secondary">
            {suppliers.length === 0 ? (
              <div className="py-3">
                <i className="bi bi-truck fs-2 d-block mb-2 text-muted"></i>
                <h6 className="text-white mb-1">No supplier contacts added yet</h6>
                <p className="text-secondary small mb-3">Add verified suppliers to manage restock purchase orders and contact info.</p>
                <button type="button" className="btn btn-gold btn-sm" onClick={handleOpenAdd}>
                  <i className="bi bi-plus-lg me-1"></i> + Add First Supplier
                </button>
              </div>
            ) : (
              <>
                <i className="bi bi-person-x fs-2 d-block mb-2 text-muted"></i>
                No suppliers matched your search query.
              </>
            )}
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="card-custom p-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
            >
              <div className="d-flex align-items-center gap-3">
                {/* Brand Avatar */}
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center fw-bold"
                  style={{
                    width: 52,
                    height: 52,
                    background: '#121212',
                    border: '1px solid #353535',
                    color: '#F5B942',
                    fontSize: '1.1rem'
                  }}
                >
                  {(s.name || 'SUP').slice(0, 3).toUpperCase()}
                </div>

                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h6 className="text-white fw-bold mb-0">{s.name}</h6>
                    {s.contactPerson && (
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                        {s.contactPerson}
                      </span>
                    )}
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-3 text-secondary small mt-1">
                    <span><i className="bi bi-envelope me-1 text-gold"></i> {s.email}</span>
                    <span><i className="bi bi-telephone me-1 text-gold"></i> {s.phone}</span>
                    {s.address && (
                      <span className="d-none d-lg-inline"><i className="bi bi-geo-alt me-1 text-gold"></i> {s.address}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 ms-auto ms-sm-0">
                <span className="badge badge-success px-3 py-2">{s.status || 'Active'}</span>
                <div className="d-flex align-items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-icon"
                    onClick={() => handleOpenEdit(s)}
                    title="Edit Contact"
                  >
                    <i className="bi bi-pencil-square text-gold"></i>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-icon"
                    onClick={() => handleDelete(s)}
                    title="Delete Supplier"
                  >
                    <i className="bi bi-trash3 text-danger"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {modalMode && (
        <div className="iq-modal-backdrop" onClick={handleCloseModal}>
          <div className="iq-modal-container p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <h5 className="modal-title text-white fw-bold">
                {modalMode === 'add' ? 'Add New Supplier' : `Edit Supplier: ${selectedSupplier?.name}`}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCloseModal}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label text-secondary small">Company / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control bg-input border-secondary text-white"
                    placeholder="e.g. Apex Hardware Supplies"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-secondary small">Contact Person</label>
                  <input
                    type="text"
                    className="form-control bg-input border-secondary text-white"
                    placeholder="e.g. Vikram Sharma"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-secondary small">Status</label>
                  <select
                    className="form-select bg-input border-secondary text-white"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-secondary small">Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-control bg-input border-secondary text-white"
                    placeholder="orders@apexsupplies.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-secondary small">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    className="form-control bg-input border-secondary text-white"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label text-secondary small">Office / Warehouse Address</label>
                  <textarea
                    rows="2"
                    className="form-control bg-input border-secondary text-white"
                    placeholder="Street, City, State, PIN"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  ></textarea>
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
                  {modalMode === 'add' ? 'Save Supplier' : 'Update Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

