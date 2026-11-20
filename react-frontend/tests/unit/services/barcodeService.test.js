/**
 * Unit Test Suite for Barcode & QR Code Processing Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { barcodeService, SUPPORTED_BARCODE_FORMATS } from '../../../src/services/barcodeService';
import { productService } from '../../../src/services/productService';
import { storageService } from '../../../src/services/storageService';

describe('BarcodeService & Scanner Integration Suite', () => {
  beforeEach(() => {
    storageService.clearMemoryCache();
  });

  it('includes all required barcode & QR formats', () => {
    expect(SUPPORTED_BARCODE_FORMATS).toContain('qr_code');
    expect(SUPPORTED_BARCODE_FORMATS).toContain('ean_13');
    expect(SUPPORTED_BARCODE_FORMATS).toContain('ean_8');
    expect(SUPPORTED_BARCODE_FORMATS).toContain('upc_a');
    expect(SUPPORTED_BARCODE_FORMATS).toContain('upc_e');
    expect(SUPPORTED_BARCODE_FORMATS).toContain('code_128');
    expect(SUPPORTED_BARCODE_FORMATS).toContain('code_39');
  });

  it('generates high-resolution base64 PNG QR code from payload', async () => {
    const text = 'https://inventoryiq.app/product/SKU-101';
    const qrDataUrl = await barcodeService.generateQRCode(text);
    expect(qrDataUrl).toBeDefined();
    expect(typeof qrDataUrl).toBe('string');
    expect(qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('formats structured product QR data accurately', () => {
    const product = {
      id: 'p123',
      sku: 'SKU-TEST-99',
      barcode: '8901234567890',
      name: 'Industrial Widget',
      price: 999.5
    };

    const qrString = barcodeService.formatProductQRData(product);
    const parsed = JSON.parse(qrString);

    expect(parsed.app).toBe('InventoryIQ');
    expect(parsed.id).toBe('p123');
    expect(parsed.sku).toBe('SKU-TEST-99');
    expect(parsed.barcode).toBe('8901234567890');
    expect(parsed.name).toBe('Industrial Widget');
    expect(parsed.price).toBe(999.5);
  });

  it('parses both JSON QR codes and raw barcodes correctly', () => {
    // 1. Raw barcode string
    expect(barcodeService.parseScannedCode('8901234567890')).toBe('8901234567890');

    // 2. Structured InventoryIQ QR payload
    const jsonPayload = JSON.stringify({
      app: 'InventoryIQ',
      id: 'prod_99',
      sku: 'SKU-EAN-99',
      barcode: '777888999'
    });
    expect(barcodeService.parseScannedCode(jsonPayload)).toBe('SKU-EAN-99');
  });

  it('productService.getByBarcode resolves products by barcode, SKU, or ID', () => {
    const product = {
      id: 'p_bc_1',
      name: 'Barcode Scan Test Item',
      sku: 'SKU-BC-001',
      barcode: '8905556667778',
      stock: 25,
      price: 150
    };
    storageService.insertItem('PRODUCTS', product);

    // Lookup by Barcode
    expect(productService.getByBarcode('8905556667778')?.id).toBe('p_bc_1');
    // Lookup by SKU
    expect(productService.getByBarcode('SKU-BC-001')?.id).toBe('p_bc_1');
    // Lookup by ID
    expect(productService.getByBarcode('p_bc_1')?.name).toBe('Barcode Scan Test Item');
    // Non-existent
    expect(productService.getByBarcode('9999999999999')).toBeNull();
  });

  it('plays synthetic audio beep without throwing errors', () => {
    expect(() => barcodeService.playScanBeep()).not.toThrow();
  });
});
