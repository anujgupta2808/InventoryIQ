/**
 * Enterprise Barcode & QR Code Scanner Modal
 * Supports:
 * 1. Live Camera Detection (via BarcodeDetector API)
 * 2. Image File Upload / Photo Scan
 * 3. Manual Barcode / SKU Entry
 * 4. Hardware Camera Stream Lifecycle & Teardown
 * 5. Debounce & Repeated-Scan Quantity Control
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { barcodeService, SUPPORTED_BARCODE_FORMATS } from '../services/barcodeService';

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Barcode & QR Code Scanner',
  instruction = 'Point camera at barcode or QR code to scan'
}) {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'image' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [lastScanned, setLastScanned] = useState(null);
  const [isScanningActive, setIsScanningActive] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastScanTimestamp = useRef(0);
  const lastScannedCode = useRef('');

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanningActive(false);
  }, []);

  // Handle successful detection with debounce cooldown
  const handleDetectedCode = useCallback((rawCode, format = 'Unknown') => {
    const cleanCode = barcodeService.parseScannedCode(rawCode);
    if (!cleanCode) return;

    const now = Date.now();
    // 1200ms cooldown for repeat scans to avoid 30 reads/sec
    if (cleanCode === lastScannedCode.current && now - lastScanTimestamp.current < 1200) {
      return;
    }

    lastScanTimestamp.current = now;
    lastScannedCode.current = cleanCode;

    barcodeService.playScanBeep();
    setLastScanned({ code: cleanCode, format, time: new Date().toLocaleTimeString() });

    if (typeof onScan === 'function') {
      onScan(cleanCode, format);
    }
  }, [onScan]);

  // Continuous frame detection loop
  const scanLoop = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    try {
      const res = await barcodeService.detectFromSource(videoRef.current);
      if (res && res.rawValue) {
        handleDetectedCode(res.rawValue, res.format);
      }
    } catch (_) {}

    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [handleDetectedCode]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser or environment.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanningActive(true);
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      console.warn('[BarcodeScanner] Camera start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Use manual entry or image upload.');
      } else {
        setCameraError(`Camera unavailable (${err.message || 'Error'}). Try manual entry or image upload.`);
      }
    }
  }, [facingMode, scanLoop, stopCamera]);

  // Lifecycle control
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode, startCamera, stopCamera]);

  // Image file scanner
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = async () => {
        try {
          const res = await barcodeService.detectFromSource(img);
          if (res && res.rawValue) {
            handleDetectedCode(res.rawValue, res.format);
          } else {
            alert('No recognizable barcode or QR code found in this image. Try high contrast image or manual entry.');
          }
        } catch (err) {
          alert('Could not decode barcode from image.');
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      img.src = objectUrl;
    } catch (err) {
      console.error('Image scan error:', err);
    }
  };

  // Manual code entry
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode.trim(), 'Manual');
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="iq-modal-backdrop" onClick={onClose}>
      <div 
        className="iq-modal-container p-4" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 580, width: '95%' }}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 bg-warning-subtle text-gold rounded">
              <i className="bi bi-upc-scan fs-5"></i>
            </div>
            <div>
              <h5 className="modal-title text-white fw-bold mb-0">{title}</h5>
              <small className="text-secondary">{instruction}</small>
            </div>
          </div>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>

        {/* Tab Selection */}
        <div className="d-flex gap-2 mb-3">
          <button
            type="button"
            className={`btn btn-sm flex-fill ${activeTab === 'camera' ? 'btn-gold' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('camera')}
          >
            <i className="bi bi-camera-video me-1"></i> Live Camera
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-fill ${activeTab === 'image' ? 'btn-gold' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('image')}
          >
            <i className="bi bi-image me-1"></i> Scan Photo
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-fill ${activeTab === 'manual' ? 'btn-gold' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('manual')}
          >
            <i className="bi bi-keyboard me-1"></i> Manual Entry
          </button>
        </div>

        {/* TAB 1: LIVE CAMERA */}
        {activeTab === 'camera' && (
          <div className="text-center">
            {cameraError ? (
              <div className="p-4 bg-danger-subtle text-danger rounded mb-3 border border-danger">
                <i className="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
                <div className="fw-bold mb-1">Camera Stream Unavailable</div>
                <small className="d-block mb-3">{cameraError}</small>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-danger" 
                  onClick={() => startCamera()}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i> Retry Camera
                </button>
              </div>
            ) : (
              <div className="position-relative bg-black rounded overflow-hidden mb-3 border border-secondary" style={{ minHeight: 280, maxHeight: 340 }}>
                <video
                  ref={videoRef}
                  className="w-100 h-100"
                  style={{ objectFit: 'cover', minHeight: 280 }}
                  muted
                />

                {/* Laser Targeting Guide */}
                <div 
                  className="position-absolute top-50 start-50 translate-middle border border-gold rounded"
                  style={{
                    width: '70%',
                    height: '55%',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                    pointerEvents: 'none'
                  }}
                >
                  <div 
                    className="w-100" 
                    style={{ 
                      height: 2, 
                      backgroundColor: '#d4af37', 
                      boxShadow: '0 0 8px #d4af37',
                      marginTop: '45%'
                    }}
                  ></div>
                </div>

                {/* Camera Switcher Button */}
                <button
                  type="button"
                  className="btn btn-sm btn-dark position-absolute bottom-0 end-0 m-3 border border-secondary"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  title="Switch Camera"
                >
                  <i className="bi bi-arrow-repeat me-1 text-gold"></i> Switch Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IMAGE UPLOAD */}
        {activeTab === 'image' && (
          <div className="p-4 bg-secondary-dark rounded text-center border border-secondary border-dashed mb-3">
            <i className="bi bi-cloud-arrow-up text-gold fs-1 d-block mb-2"></i>
            <h6 className="text-white fw-bold mb-1">Upload Barcode / QR Code Image</h6>
            <p className="text-secondary small mb-3">Upload photo or receipt showing barcode (PNG, JPG, WebP)</p>
            <input
              type="file"
              accept="image/*"
              className="form-control form-control-sm mx-auto"
              style={{ maxWidth: 320 }}
              onChange={handleImageUpload}
            />
          </div>
        )}

        {/* TAB 3: MANUAL ENTRY */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="mb-3">
            <label className="form-label text-secondary small fw-bold">Enter Barcode, SKU or Product ID</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control bg-secondary-dark text-white border-secondary"
                placeholder="e.g. 8901030382572 or SKU-INV-101"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-gold" disabled={!manualCode.trim()}>
                <i className="bi bi-search me-1"></i> Lookup
              </button>
            </div>
            <small className="text-secondary mt-1 d-block">
              Type or paste barcode from hand scanner or vendor box.
            </small>
          </form>
        )}

        {/* Recent Scan Feedback Box */}
        {lastScanned && (
          <div className="p-2 px-3 rounded bg-secondary-dark border border-gold mb-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill text-gold fs-5"></i>
              <div>
                <small className="text-secondary d-block">Scanned Code ({lastScanned.format})</small>
                <span className="text-white fw-bold font-monospace">{lastScanned.code}</span>
              </div>
            </div>
            <span className="badge bg-gold text-black">{lastScanned.time}</span>
          </div>
        )}

        {/* Supported Formats Info */}
        <div className="d-flex flex-wrap gap-1 align-items-center pt-2 border-top border-secondary">
          <small className="text-secondary me-2">Supported:</small>
          {SUPPORTED_BARCODE_FORMATS.map(fmt => (
            <span key={fmt} className="badge bg-secondary text-white-50" style={{ fontSize: '0.68rem' }}>
              {fmt.replace(/_/g, ' ').toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
