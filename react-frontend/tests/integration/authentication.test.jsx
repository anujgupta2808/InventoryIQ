import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithInventory } from '../helpers/testUtils';
import { LoginPage } from '../../src/pages/Auth/LoginPage';
import { App } from '../../src/App';
import { authService } from '../../src/services/authService';

describe('Integration — Authentication Workflow & Route Guarding', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    authService.logout();
  });

  it('renders login screen with authentic inputs and clean UI', () => {
    renderWithInventory(<LoginPage />);
    expect(screen.getByText(/Welcome Back!/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email Address$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Auto-Fill Demo Account/i })).not.toBeInTheDocument();
  });

  it('allows manual credential input for authentication', () => {
    renderWithInventory(<LoginPage />);
    const emailInput = screen.getByLabelText(/^Email Address$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    fireEvent.change(emailInput, { target: { value: 'admin@inventoryiq.com' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });

    expect(emailInput.value).toBe('admin@inventoryiq.com');
    expect(passwordInput.value).toBe('admin');
  });

  it('prevents empty form submission and displays validation error', async () => {
    renderWithInventory(<LoginPage />);
    const emailInput = screen.getByLabelText(/^Email Address$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter your email address/i)).toBeInTheDocument();
    });
  });

  it('shows error banner when invalid password is provided', async () => {
    renderWithInventory(<LoginPage />);
    const emailInput = screen.getByLabelText(/^Email Address$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    fireEvent.change(emailInput, { target: { value: 'admin@inventoryiq.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Incorrect password/i)).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated users to login and grants access upon successful sign-in', async () => {
    renderWithInventory(<App />);

    // Initially unauthenticated -> displays login page
    expect(screen.getByText(/Sign in to your InventoryIQ workspace/i)).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/^Email Address$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    fireEvent.change(emailInput, { target: { value: 'admin@inventoryiq.com' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    // After sign-in -> redirects to dashboard
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/Here's your business overview/i)).toBeInTheDocument();
    });
  });
});
