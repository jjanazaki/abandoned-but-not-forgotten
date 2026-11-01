import { test, expect } from '@playwright/test';
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

for (const vp of viewports) {
  test(`responsive ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Explore!/i })).toBeVisible({ timeout: 30_000 });
    const overflowHome = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(overflowHome).toBe(false);

    await page.goto('/planet/mars');
    await page.waitForTimeout(2000);
    const overflowPlanet = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(overflowPlanet).toBe(false);

    await page.goto('/equipment/viking-1');
    await page.waitForTimeout(2000);
    await expect(page.locator('.eq-simple__name')).toBeVisible({ timeout: 30_000 });
    const overflowEq = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(overflowEq).toBe(false);

    await page.goto('/timeline');
    await page.waitForTimeout(2000);
    const overflowTl = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(overflowTl).toBe(false);
  });
}
