import React from 'react';
import { useInventory } from '../context/InventoryContext';

export const ConfirmModal = () => {
  const { confirmModal, closeConfirm } = useInventory();

  if (!confirmModal || !confirmModal.isOpen) return null;

  const handleConfirm = () => {
    if (typeof confirmModal.onConfirm === 'function') {
      try {
        confirmModal.onConfirm();
      } catch (err) {
        console.error('Confirm modal action failed:', err);
      }
    }
    closeConfirm();
  };

  return (
    <div className="iq-modal-backdrop" onClick={closeConfirm}>
      <div className="iq-modal-container p-4" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="icon-pill-avatar bg-danger-subtle text-danger p-2 rounded-circle">
            <i className="bi bi-exclamation-triangle-fill fs-4"></i>
          </div>
          <div>
            <h5 className="modal-title mb-0 text-white">{confirmModal.title || 'Confirm Action'}</h5>
          </div>
        </div>

        <p className="text-secondary mb-4">{confirmModal.message}</p>

        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary-custom"
            onClick={closeConfirm}
          >
            {confirmModal.cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            className={`btn ${confirmModal.confirmVariant === 'danger' ? 'btn-danger' : 'btn-gold'}`}
            onClick={handleConfirm}
          >
            {confirmModal.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

