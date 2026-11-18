import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithInventory } from '../helpers/testUtils';
import { SalesPage } from '../../src/pages/SalesPage';
import { storageService } from '../../src/services/storageService';
import { MOCK_PRODUCTS, MOCK_SALES } from '../fixtures/mockData';

describe('Integration — Sales & POS Invoicing Workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.setCollection('PRODUCTS', JSON.parse(JSON.stringify(MOCK_PRODUCTS)));
    storageService.setCollection('SALES', JSON.parse(JSON.stringify(MOCK_SALES)));
  });

  it('renders sales invoice history table', () => {
    renderWithInventory(<SalesPage />);
    expect(screen.getByText(/S-1001/)).toBeInTheDocument();
    expect(screen.getByText(/S-1002/)).toBeInTheDocument();
    expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
  });

  it('filters invoices when searching by invoice ID or customer name', () => {
    renderWithInventory(<SalesPage />);
    const searchInput = screen.getByPlaceholderText(/Search invoice #, customer name/i);
    fireEvent.change(searchInput, { target: { value: 'S-1001' } });

    expect(screen.getByText(/S-1001/)).toBeInTheDocument();
    expect(screen.queryByText(/S-1002/)).not.toBeInTheDocument();
  });

  it('opens New Sale POS Modal when clicking button', () => {
    renderWithInventory(<SalesPage />);
    const newSaleBtn = screen.getByRole('button', { name: /New Sale/i });
    fireEvent.click(newSaleBtn);

    expect(screen.getByText(/Create New Sale/i)).toBeInTheDocument();
  });
});
