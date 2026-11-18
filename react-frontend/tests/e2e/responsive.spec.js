import { test, expect } from '@playwright/test';

test.describe('Section 7: Responsive & Cross-Device Usability', () => {
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

  test('desktop layout (1280x800) displays persistent sidebar and unconstrained body', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Sidebar visible
    const sidebar = page.locator('aside.iq-sidebar');
    await expect(sidebar).toBeVisible();

    // Check no unexpected body horizontal scrollbar
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('tablet layout (768x1024) adapts gracefully without content clipping', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    // Header visible
    const topbar = page.locator('header.iq-topbar');
    await expect(topbar).toBeVisible();

    // Body fits within tablet width
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('mobile layout (375x667) verifies sticky topbar and responsive navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify topbar is fixed/sticky at the top
    const topbar = page.locator('header.iq-topbar');
    await expect(topbar).toBeVisible();

    // Scroll down and verify sticky topbar positioning
    await page.evaluate(() => window.scrollTo(0, 400));
    const topbarBoundingBox = await topbar.boundingBox();
    expect(topbarBoundingBox).not.toBeNull();
    // Topbar remains at or near top (y <= 5)
    expect(topbarBoundingBox.y).toBeLessThanOrEqual(5);

    // Verify mobile drawer toggle is visible and toggles sidebar
    const toggleBtn = page.locator('#sidebarToggleBtn');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(page.locator('aside.iq-sidebar')).toHaveClass(/mobile-open/);

    // Verify no body horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
