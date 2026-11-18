import { test, expect } from '@playwright/test';

test.describe('Workflow A: Authentication Flow & Route Protection', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('displays login screen for unauthenticated visitors', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Sign in to your InventoryIQ workspace/i)).toBeVisible();
    await expect(page.getByLabel(/^Email Address$/i)).toBeVisible();
    await expect(page.getByLabel(/^Password$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Auto-Fill Demo Account/i })).not.toBeVisible();
  });

  test('populates credentials and authenticates successfully', async ({ page }) => {
    await page.goto('/');
    
    // Fill credentials
    await page.getByLabel(/^Email Address$/i).fill('admin@inventoryiq.com');
    await page.getByLabel(/^Password$/i).fill('admin');
    await expect(page.getByLabel(/^Email Address$/i)).toHaveValue('admin@inventoryiq.com');
    await expect(page.getByLabel(/^Password$/i)).toHaveValue('admin');

    // Click Sign In
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Verify redirected to Dashboard
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard/i })).toBeVisible();
    await expect(page.locator('.page-header-subtitle')).toBeVisible();
  });

  test('logs out and redirects back to protected login screen', async ({ page }) => {
    await page.goto('/');

    // Sign in
    await page.getByLabel(/^Email Address$/i).fill('admin@inventoryiq.com');
    await page.getByLabel(/^Password$/i).fill('admin');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard/i })).toBeVisible();

    // Sign out from Sidebar
    await page.getByRole('button', { name: /Sign Out/i }).first().click();

    // Verify back on Login page
    await expect(page.getByText(/Sign in to your InventoryIQ workspace/i)).toBeVisible();

    // Verify reload keeps user at login
    await page.reload();
    await expect(page.getByText(/Sign in to your InventoryIQ workspace/i)).toBeVisible();
  });
});
