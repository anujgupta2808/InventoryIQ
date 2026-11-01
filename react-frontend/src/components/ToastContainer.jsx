import React from 'react';
import { useInventory } from '../context/InventoryContext';

export const ToastContainer = () => {
  const { toasts, removeToast } = useInventory();

  if (!toasts.length) return null;

  return (
    <div
      className="toast-container position-fixed bottom-0 end-0 p-3"
      style={{ zIndex: 1100 }}
    >
      {toasts.map(toast => {
        let borderClass = 'border-gold';
        let icon = 'bi-check-circle-fill text-gold';

        if (toast.type === 'danger') {
          borderClass = 'border-danger';
          icon = 'bi-exclamation-octagon-fill text-danger';
        } else if (toast.type === 'warning') {
          borderClass = 'border-warning';
          icon = 'bi-exclamation-triangle-fill text-warning';
        } else if (toast.type === 'info') {
          borderClass = 'border-info';
          icon = 'bi-info-circle-fill text-info';
        }

        return (
          <div
            key={toast.id}
            className={`toast show bg-card ${borderClass} text-white mb-2 shadow-lg`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <div className="toast-header bg-secondary-dark text-white border-bottom border-secondary d-flex align-items-center justify-content-between p-2">
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${icon}`}></i>
                <strong className="me-auto text-white">{toast.title}</strong>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => removeToast(toast.id)}
                aria-label="Close"
              ></button>
            </div>
            <div className="toast-body p-3 text-secondary">
              {toast.message}
            </div>
          </div>
        );
      })}
    </div>
  );
};

