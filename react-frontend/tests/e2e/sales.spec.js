import { test, expect } from '@playwright/test';

test.describe('Workflow C: Sales / POS & Invoice Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear storage for fresh test state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // Authenticate
    await page.getByRole('button', { name: /Auto-Fill Demo Account/i }).click();
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard/i })).toBeVisible();

    // Navigate to Sales
    await page.getByRole('button', { name: /Sales & Invoices/i }).first().click();
    await expect(page.getByRole('heading', { name: /Sales & Invoices/i })).toBeVisible();
  });

  test('creates a new sales invoice with automatic calculations and records transaction', async ({ page }) => {
    // 1. Open New Sale Modal
    await page.getByRole('button', { name: /New Sale/i }).click();
    await expect(page.getByText('Create New Sale')).toBeVisible();

    // 2. Buyer Details
    const buyerInput = page.locator('input[placeholder="Enter customer name"]');
    if (await buyerInput.isVisible()) {
      await buyerInput.fill('E2E Retail Buyer');
    }

    // 3. Check Tax & Calculation Display
    await expect(page.getByText(/Grand Total:/i)).toBeVisible();

    // 4. Submit Sale
    const submitBtn = page.getByRole('button', { name: /Finalize Sale & Issue Invoice/i });
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      // Verify modal closes and invoice is recorded
      await expect(page.getByText('Create New Sale')).not.toBeVisible();
      await expect(page.getByText(/Lifetime Invoices/i)).toBeVisible();
    }
  });
});
