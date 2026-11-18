import { test, expect } from '@playwright/test';

test.describe('Workflow E: Data Backup & CSV Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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
  });

  test('exports JSON database snapshot and CSV table exports', async ({ page }) => {
    // 1. Navigate to Settings -> Data & Backups
    await page.getByRole('button', { name: /Settings/i }).first().click();
    await expect(page.getByRole('heading', { name: /Settings & Workspace/i })).toBeVisible();

    await page.getByRole('button', { name: /Data & Backups/i }).click();
    await expect(page.getByText('Export Database JSON Snapshot')).toBeVisible();

    // 2. Download JSON Backup
    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button.btn-gold').filter({ hasText: 'Export JSON' }).click()
    ]);
    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/i);

    // 3. Navigate to Analytics and Download CSV Report
    await page.getByRole('button', { name: /Analytics/i }).first().click();
    await expect(page.getByRole('heading', { name: /Analytics & Growth/i })).toBeVisible();

    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export Report/i }).click()
    ]);
    expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/i);
  });
});
