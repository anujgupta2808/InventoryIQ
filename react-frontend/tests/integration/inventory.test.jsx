import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithInventory } from '../helpers/testUtils';
import { InventoryPage } from '../../src/pages/InventoryPage';
import { storageService } from '../../src/services/storageService';
import { MOCK_PRODUCTS } from '../fixtures/mockData';

describe('Integration — Inventory Management Catalog & CRUD', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.setCollection('PRODUCTS', JSON.parse(JSON.stringify(MOCK_PRODUCTS)));
  });

  it('renders products table with mock catalog items', () => {
    renderWithInventory(<InventoryPage />);
    expect(screen.getByText('Wireless Bluetooth Mouse')).toBeInTheDocument();
    expect(screen.getByText('Mechanical Gaming Keyboard')).toBeInTheDocument();
    expect(screen.getByText('USB-C Fast Charging Cable')).toBeInTheDocument();
  });

  it('filters product table in real-time when search term is entered', () => {
    renderWithInventory(<InventoryPage />);
    const searchInput = screen.getByPlaceholderText(/Search products by name or SKU/i);
    fireEvent.change(searchInput, { target: { value: 'Keyboard' } });

    expect(screen.getByText('Mechanical Gaming Keyboard')).toBeInTheDocument();
    expect(screen.queryByText('Wireless Bluetooth Mouse')).not.toBeInTheDocument();
    expect(screen.queryByText('USB-C Fast Charging Cable')).not.toBeInTheDocument();
  });

  it('filters by stock status (e.g. Out of Stock)', () => {
    renderWithInventory(<InventoryPage />);
    const statusSelect = screen.getByDisplayValue(/All Stock Statuses/i);
    fireEvent.change(statusSelect, { target: { value: 'Out of Stock' } });

    expect(screen.getByText('USB-C Fast Charging Cable')).toBeInTheDocument();
    expect(screen.queryByText('Wireless Bluetooth Mouse')).not.toBeInTheDocument();
  });

  it('opens Add Product modal when button is clicked', () => {
    renderWithInventory(<InventoryPage />);
    const addBtn = screen.getByRole('button', { name: /Add Product/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Product')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Copper Wire/i)).toBeInTheDocument();
  });
});
