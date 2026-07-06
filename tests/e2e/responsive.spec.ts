import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
];

for (const v of viewports) {
  test(`Layout responsivo home: ${v.name}`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.goto('/');
    await expect(page.getByRole('banner').first()).toBeVisible();
    await page.screenshot({ path: `playwright-report/screenshots/home-${v.name}.png`, fullPage: true });
  });
}
