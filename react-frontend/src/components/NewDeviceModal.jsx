import React, { useRef, useState } from 'react';
import { useInventory } from '../context/InventoryContext';

export const NewDeviceModal = () => {
  const {
    isNewDevice,
    dismissNewDevicePrompt,
    validateBackup,
    restoreBackup,
    showToast,
    shopId
  } = useInventory();

  const fileInputRef = useRef(null);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isNewDevice) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    setErrorMessage('');

    try {
      const text = await file.text();
      const validation = await validateBackup(text);

      if (!validation.valid) {
        setErrorMessage(validation.errors.join(' '));
        setIsValidating(false);
        return;
      }

      const res = await restoreBackup(validation.payload, { replace: true });
      if (res.success) {
        showToast('Database Restored', 'Business data imported into this device successfully.', 'success');
        dismissNewDevicePrompt();
      } else {
        setErrorMessage(res.error || 'Failed to restore backup.');
      }
    } catch (err) {
      setErrorMessage(`Failed to read backup file: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="iq-modal-backdrop">
      <div className="iq-modal-container p-4" style={{ maxWidth: 520 }}>
        <div className="d-flex align-items-center gap-3 mb-3">
          <div
            className="rounded d-flex align-items-center justify-content-center"
            style={{ width: 44, height: 44, background: 'rgba(245, 185, 66, 0.15)', color: '#F5B942' }}
          >
            <i className="bi bi-hdd-network-fill fs-4"></i>
          </div>
          <div>
            <h5 className="modal-title mb-0 text-white fw-bold">New Device Setup</h5>
            <small className="text-secondary">Shop ID: {shopId}</small>
          </div>
        </div>

        <p className="text-light mb-3">
          No local business database was found on this device. InventoryIQ stores your products, sales,
          and customer records directly on your local machine for privacy, speed, and offline reliability.
        </p>

        {errorMessage && (
          <div className="alert alert-danger py-2 px-3 small mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {errorMessage}
          </div>
        )}

        <p className="text-secondary small mb-4">
          Would you like to import an existing database backup from another device, or start with a fresh new database?
        </p>

        <input
          type="file"
          ref={fileInputRef}
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="d-flex flex-column flex-sm-row justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary-custom"
            onClick={dismissNewDevicePrompt}
            disabled={isValidating}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Start New Database
          </button>
          <button
            type="button"
            className="btn btn-gold d-flex align-items-center justify-content-center gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <span className="spinner-border spinner-border-sm"></span>
                <span>Verifying Backup...</span>
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-down"></i>
                <span>Import Existing Backup</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
