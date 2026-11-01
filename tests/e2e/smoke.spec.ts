import { test, expect } from '@playwright/test';

test('E2E smoke: Solar System -> Planet -> Equipment -> PDF -> Timeline -> back', async ({ page }) => {
  // 1. Solar System
  await page.goto('/');
  const exploreBtn = page.getByRole('button', { name: /Explore!/i });
  await expect(exploreBtn).toBeVisible({ timeout: 30_000 });

  // select Mars (index 3) via keyboard
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowRight');
  }
  await page.waitForTimeout(300);

  // 2. Planet
  await exploreBtn.click();
  await expect(page).toHaveURL(/\/planet\/mars/, { timeout: 30_000 });

  // wait for a point button
  const point = page.locator('.planet-point').first();
  await expect(point).toBeVisible({ timeout: 60_000 });
  await point.dispatchEvent('click');
  await page.waitForURL(/\/equipment\//, { timeout: 30_000 });
  await expect(page.locator('.eq-simple__name')).toBeVisible({ timeout: 30_000 });

  // 4. PDF download
  const downloadLink = page.locator('a.eq-download');
  await expect(downloadLink).toBeVisible({ timeout: 60_000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    downloadLink.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);

  // 5. Timeline
  await page.goto('/timeline');
  await expect(page).toHaveURL(/\/timeline/);
  const tlPoint = page.locator('.tl-point, .tl-mobile-item').first();
  await expect(tlPoint).toBeVisible({ timeout: 30_000 });

  // click a timeline point -> equipment
  await tlPoint.click();
  await expect(page).toHaveURL(/\/equipment\//, { timeout: 30_000 });

  // back to solar system
  await page.goto('/');
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
});
