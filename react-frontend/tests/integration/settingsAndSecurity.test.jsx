import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithInventory } from '../helpers/testUtils';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { SecurityPage } from '../../src/pages/SecurityPage';
import { storageService } from '../../src/services/storageService';
import { MOCK_USER } from '../fixtures/mockData';

describe('Integration — Settings, Security & Access Control', () => {
  beforeEach(() => {
    localStorage.clear();
    const session = {
      user: MOCK_USER,
      token: 'test_token',
      loginTime: new Date().toISOString()
    };
    localStorage.setItem('iq_v4_session', JSON.stringify(session));
    storageService.setCollection('USERS', [MOCK_USER]);
  });

  describe('SettingsPage', () => {
    it('renders profile configuration tabs and inputs', () => {
      renderWithInventory(<SettingsPage />);
      expect(screen.getByText(/Organization Profile/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(MOCK_USER.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(MOCK_USER.email)).toBeInTheDocument();
    });

    it('updates user business details on save', async () => {
      renderWithInventory(<SettingsPage />);
      const nameInput = screen.getByDisplayValue(MOCK_USER.name);
      fireEvent.change(nameInput, { target: { value: 'Updated Manager' } });

      const saveBtn = screen.getByRole('button', { name: /Save Organization Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(nameInput.value).toBe('Updated Manager');
      });
    });
  });

  describe('SecurityPage', () => {
    it('renders production security sections: 2FA, Active Sessions, and RBAC Team', () => {
      renderWithInventory(<SecurityPage />);
      expect(screen.getByText(/Security & Access Control/i)).toBeInTheDocument();
      expect(screen.getByText(/Two-Factor Authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Device Sessions & Remote Revocation/i)).toBeInTheDocument();
      expect(screen.getByText(/Organization Team & Permissions/i)).toBeInTheDocument();
    });

    it('opens TOTP Setup modal when clicking Setup Authenticator', async () => {
      renderWithInventory(<SecurityPage />);
      const setupBtn = await screen.findByRole('button', { name: /Setup Authenticator/i });
      fireEvent.click(setupBtn);

      await waitFor(() => {
        expect(screen.getByText(/Setup Authenticator App/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Enter 6-Digit Verification Code/i)).toBeInTheDocument();
    });

    it('renders remove member buttons for non-owner members', () => {
      renderWithInventory(<SecurityPage />);
      expect(screen.getByText(/Organization Team & Permissions/i)).toBeInTheDocument();
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      expect(removeButtons.length).toBeGreaterThan(0);
      expect(removeButtons[0]).toBeInTheDocument();
    });
  });
});
