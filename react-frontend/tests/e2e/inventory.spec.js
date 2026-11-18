import { test, expect } from '@playwright/test';

test.describe('Workflow B: Inventory Management Catalog & CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear storage to ensure pristine demo state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // Authenticate
    await page.getByLabel(/^Email Address$/i).fill('admin@inventoryiq.com');
    await page.getByLabel(/^Password$/i).fill('admin');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Dashboard/i })).toBeVisible();

    // Navigate to Inventory
    await page.getByRole('button', { name: /Inventory/i }).first().click();
    await expect(page.getByRole('heading', { name: /Inventory Management/i })).toBeVisible();
  });

  test('creates, searches, edits, and deletes a product item', async ({ page }) => {
    // 1. Open Add Product Modal
    await page.getByRole('button', { name: /Add Product/i }).click();
    await expect(page.getByText('Add New Product')).toBeVisible();

    // 2. Fill Form Details
    const uniqueSku = `SKU-E2E-${Date.now().toString().slice(-4)}`;
    await page.locator('input[placeholder="e.g. Copper Wire 2.5mm Heavy"]').fill('E2E Premium Widget');
    await page.locator('input[placeholder="SKU-101"]').fill(uniqueSku);
    await page.locator('input[placeholder*="Electronics, Hardware"]').fill('Electronics');
    await page.locator('input[placeholder="300"]').fill('450');
    await page.locator('input[placeholder="450"]').fill('899');
    await page.locator('input[placeholder="50"]').fill('35');
    await page.locator('input[placeholder="15"]').fill('10');

    // 3. Save Product
    await page.getByRole('button', { name: /Create Product/i }).click();

    // 4. Verify Product Appears in Table
    await page.locator('input[placeholder*="Search products"]').fill('E2E Premium Widget');
    await expect(page.getByText('E2E Premium Widget', { exact: true })).toBeVisible();
    await expect(page.getByText(uniqueSku)).toBeVisible();

    // 5. Edit Product
    await page.locator('button[title="Edit Product"]').first().click();
    await expect(page.getByText(/Edit Product/i)).toBeVisible();
    
    // Modify selling price
    const priceInput = page.locator('input[placeholder="450"]');
    await priceInput.fill('1250');
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Verify updated price reflected
    await expect(page.getByText('₹1250')).toBeVisible();

    // 6. Delete Product
    await page.locator('button[title="Delete Product"]').first().click();
    await expect(page.getByText(/Are you sure you want to permanently delete/i)).toBeVisible();
    await page.getByRole('button', { name: 'Delete Product' }).click();

    // Verify product is gone
    await expect(page.getByText('E2E Premium Widget', { exact: true })).not.toBeVisible();
  });
});
