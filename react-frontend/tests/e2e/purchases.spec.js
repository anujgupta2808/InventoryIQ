import { test, expect } from '@playwright/test';

test.describe('Workflow D: Purchase Order & Stock Replenishment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // Authenticate
    await page.getByRole('button', { name: /Auto-Fill Demo Account/i }).click();
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard/i })).toBeVisible();

    // Navigate to Purchases
    await page.getByRole('button', { name: /Purchases & POs/i }).first().click();
    await expect(page.getByRole('heading', { name: /^Purchases$/i })).toBeVisible();
  });

  test('creates a purchase order and syncs inventory', async ({ page }) => {
    // 1. Open Create Purchase Order Modal
    await page.locator('button').filter({ hasText: '+ New Purchase' }).first().click();
    await expect(page.getByText('Create Purchase Order')).toBeVisible();

    // 2. Fill Supplier if in new supplier mode
    const supplierInput = page.locator('input[placeholder="e.g. Apex Hardware Supplies"]');
    if (await supplierInput.isVisible()) {
      await supplierInput.fill('Apex Hardware Supplies');
    }

    // 3. Fill Item name if in new item mode
    const itemInput = page.locator('input[placeholder="Enter new product name..."]');
    if (await itemInput.isVisible()) {
      await itemInput.fill('Heavy Duty Cables');
    }

    // 4. Submit PO
    const submitBtn = page.getByRole('button', { name: /Place Purchase & Sync Inventory/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 5. Verify modal closes and purchase order appears in table
    await expect(page.getByText('Create Purchase Order')).not.toBeVisible();
    await expect(page.getByText('Apex Hardware Supplies')).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  });
});
