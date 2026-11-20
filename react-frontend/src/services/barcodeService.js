/**
 * Barcode & QR Code Processing Service
 * Provides hardware camera detection (via native BarcodeDetector API), image scanning,
 * QR generation, format validation, audio feedback, and debounce control.
 *
 * Supported formats (where technically available):
 * - QR Code
 * - EAN-13
 * - EAN-8
 * - UPC-A
 * - UPC-E
 * - Code 128
 * - Code 39
 */

import QRCode from 'qrcode';

export const SUPPORTED_BARCODE_FORMATS = [
  'qr_code',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39'
];

class BarcodeService {
  constructor() {
    this.detector = null;
    this._initDetector();
  }

  async _initDetector() {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const availableFormats = SUPPORTED_BARCODE_FORMATS.filter(f => supported.includes(f));
        this.detector = new window.BarcodeDetector({
          formats: availableFormats.length ? availableFormats : supported
        });
      } catch (err) {
        console.warn('[BarcodeService] Failed to initialize BarcodeDetector:', err);
      }
    }
  }

  isDetectorSupported() {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
  }

  /**
   * Detect barcodes/QR codes from a <video>, <img>, or <canvas> element
   */
  async detectFromSource(source) {
    if (!this.detector && this.isDetectorSupported()) {
      await this._initDetector();
    }

    if (this.detector && source) {
      try {
        const barcodes = await this.detector.detect(source);
        if (barcodes && barcodes.length > 0) {
          const first = barcodes[0];
          return {
            rawValue: first.rawValue,
            format: first.format,
            boundingBox: first.boundingBox
          };
        }
      } catch (err) {
        // Video frame might not be ready or empty
      }
    }
    return null;
  }

  /**
   * Generates a high-resolution base64 PNG QR Code
   */
  async generateQRCode(text, options = {}) {
    if (!text) return '';
    try {
      const dataUrl = await QRCode.toDataURL(String(text), {
        width: options.width || 300,
        margin: options.margin || 2,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      return dataUrl;
    } catch (err) {
      console.error('[BarcodeService] QR generation failed:', err);
      return '';
    }
  }

  /**
   * Formats a product into a structured QR payload
   */
  formatProductQRData(product) {
    if (!product) return '';
    return JSON.stringify({
      app: 'InventoryIQ',
      id: String(product.id),
      sku: product.sku || '',
      barcode: product.barcode || '',
      name: product.name || '',
      price: product.price || 0
    });
  }

  /**
   * Parses raw scanned text into an identified code or product reference
   */
  parseScannedCode(rawText) {
    if (!rawText) return '';
    const trimmed = String(rawText).trim();

    // Check if JSON payload from InventoryIQ QR code
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.sku) return parsed.sku;
        if (parsed.barcode) return parsed.barcode;
        if (parsed.id) return String(parsed.id);
      } catch (_) {}
    }

    return trimmed;
  }

  /**
   * Emits a pleasant synthetic audio beep on successful scan
   */
  playScanBeep() {
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        setTimeout(() => ctx.close().catch(() => {}), 200);
      }
    } catch (_) {
      // Audio playback silently suppressed if blocked by user gesture policy
    }
  }
}

export const barcodeService = new BarcodeService();
