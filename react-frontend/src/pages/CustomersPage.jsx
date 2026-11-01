import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const CustomersPage = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    openConfirm,
    exportCSV
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const initialForm = {
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'Active'
  };
  const [formData, setFormData] = useState(initialForm);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setModalMode('add');
  };

  const handleOpenEdit = (c) => {
    setSelectedCustomer(c);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address || '',
      status: c.status || 'Active'
    });
    setModalMode('edit');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    if (modalMode === 'add') {
      addCustomer(formData);
    } else if (modalMode === 'edit') {
      updateCustomer(selectedCustomer.id, formData);
    }
    setModalMode(null);
  };

  const handleDelete = (c) => {
    openConfirm({
      title: 'Delete Customer',
      message: `Are you sure you want to remove "${c.name}" from your customer directory?`,
      confirmText: 'Delete Customer',
      confirmVariant: 'danger',
      onConfirm: () => deleteCustomer(c.id)
    });
  };

  const handleExport = () => {
    const headers = ['ID', 'Customer Name', 'Email', 'Phone', 'Address', 'Total Orders', 'Total Spending', 'Status'];
    const rows = filteredCustomers.map(c => [
      c.id,
      c.name,
      c.email,
      c.phone,
      c.address,
      c.totalOrders,
      `₹${c.totalSpending}`,
      c.status
    ]);
    exportCSV('Customer_Directory', rows, headers);
  };

  return (
    <div className="customers-page animate-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="page-title text-white fw-bold mb-1">Customer CRM</h2>
          <p className="page-subtitle text-secondary mb-0">Track customer spending, order histories and contact profiles</p>
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
            <i className="bi bi-person-plus-fill"></i>
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="card-custom p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-input border-secondary text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-input border-secondary text-white"
                placeholder="Search customers by name, phone or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-6 text-md-end text-secondary small">
            Active Accounts: <strong className="text-white">{customers.length}</strong>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card-custom p-0 overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="border-bottom border-secondary text-secondary small text-uppercase">
                <th scope="col" style={{ width: 60 }}>#</th>
                <th scope="col">Customer</th>
                <th scope="col">Contact Info</th>
                <th scope="col">Orders</th>
                <th scope="col">Total Spent</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-secondary">
                    {customers.length === 0 ? (
                      <div className="py-3">
                        <i className="bi bi-people fs-2 d-block mb-2 text-muted"></i>
                        <h6 className="text-white mb-1">No customers registered yet</h6>
                        <p className="text-secondary small mb-3">Add customers to track their contact information, orders, and purchase histories.</p>
                        <button type="button" className="btn btn-gold btn-sm" onClick={handleOpenAdd}>
                          <i className="bi bi-person-plus-fill me-1"></i> + Add First Customer
                        </button>
                      </div>
                    ) : (
                      <>
                        <i className="bi bi-people fs-2 d-block mb-2 text-muted"></i>
                        No customers found matching search.
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, index) => (
                  <tr key={c.id} className="border-bottom border-secondary">
                    <td>{index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold bg-dark text-gold border border-secondary"
                          style={{ width: 38, height: 38, fontSize: '0.85rem' }}
                        >
                          {(c.name || 'CU').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold text-white">{c.name}</div>
                          <small className="text-muted">{c.address || 'India'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-white">{c.phone}</div>
                      <small className="text-secondary">{c.email}</small>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{c.totalOrders || 0} orders</span>
                    </td>
                    <td>
                      <span className="fw-bold text-gold">₹{Number(c.totalSpending || 0).toLocaleString('en-IN')}</span>
                    </td>
                    <td>
                      <span className="badge badge-success">{c.status || 'Active'}</span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-icon"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Customer"
                        >
                          <i className="bi bi-pencil-square text-gold"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-icon"
                          onClick={() => handleDelete(c)}
                          title="Delete Customer"
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
      </div>

      {/* Add / Edit Customer Modal */}
      {modalMode && (
        <div className="iq-modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="iq-modal-container p-4" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
              <h5 className="modal-title text-white fw-bold">
                {modalMode === 'add' ? 'Add New Customer' : `Edit Customer: ${selectedCustomer?.name}`}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setModalMode(null)}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label text-secondary small">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control bg-input border-secondary text-white"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label text-secondary small">Email Address</label>
                  <input
                    type="email"
                    className="form-control bg-input border-secondary text-white"
                    placeholder="rahul@example.com"
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
                    placeholder="+91 98111 22334"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label text-secondary small">Delivery / Billing Address</label>
                  <textarea
                    rows="2"
                    className="form-control bg-input border-secondary text-white"
                    placeholder="Apartment, Street, City, State"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                <button
                  type="button"
                  className="btn btn-secondary-custom"
                  onClick={() => setModalMode(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  {modalMode === 'add' ? 'Save Customer' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

