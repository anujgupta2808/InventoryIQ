import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithInventory } from '../helpers/testUtils';
import { PurchasesPage } from '../../src/pages/PurchasesPage';
import { PartyDueTrackerPage } from '../../src/pages/PartyDueTrackerPage';
import { storageService } from '../../src/services/storageService';
import { MOCK_PRODUCTS, MOCK_PURCHASES, MOCK_SALES, MOCK_SUPPLIERS } from '../fixtures/mockData';

describe('Integration — Purchases & Party Due Tracker', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.setCollection('PRODUCTS', JSON.parse(JSON.stringify(MOCK_PRODUCTS)));
    storageService.setCollection('PURCHASES', JSON.parse(JSON.stringify(MOCK_PURCHASES)));
    storageService.setCollection('SALES', JSON.parse(JSON.stringify(MOCK_SALES)));
    storageService.setCollection('SUPPLIERS', JSON.parse(JSON.stringify(MOCK_SUPPLIERS)));
  });

  describe('PurchasesPage', () => {
    it('renders purchase orders history table', () => {
      renderWithInventory(<PurchasesPage />);
      expect(screen.getByText('PO-2001')).toBeInTheDocument();
      expect(screen.getByText('Apex Tech Distributors')).toBeInTheDocument();
    });

    it('opens Create Purchase Order modal', () => {
      renderWithInventory(<PurchasesPage />);
      const createBtn = screen.getByRole('button', { name: /\+ New Purchase/i });
      fireEvent.click(createBtn);

      expect(screen.getByText(/Create Purchase Order/i)).toBeInTheDocument();
    });
  });

  describe('PartyDueTrackerPage', () => {
    it('renders party due ledger and shows customer balances', () => {
      renderWithInventory(<PartyDueTrackerPage />);
      expect(screen.getByText(/Party Due Tracker/i)).toBeInTheDocument();
      expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
    });

    it('filters customer ledger by search term', () => {
      renderWithInventory(<PartyDueTrackerPage />);
      const searchInput = screen.getByPlaceholderText(/Search person \/ client name or phone/i);
      fireEvent.change(searchInput, { target: { value: 'Rohan' } });

      expect(screen.getByText('Rohan Sharma')).toBeInTheDocument();
    });
  });
});
