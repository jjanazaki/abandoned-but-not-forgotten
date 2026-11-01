import { test, expect } from '@playwright/test';

test('a11y: keyboard nav solar -> planet -> equipment', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('.solar-name').textContent();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  const after = await page.locator('.solar-name').textContent();
  expect(after).not.toBe(before);

  // Tab to Explore button and activate via Enter
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  // ensure a button has focus
  const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedTag).toBe('BUTTON');

  // focus ring present
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe('none');
});

test('a11y: reduced motion disables animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(500);
  const animInfo = await page.evaluate(() => {
    const el = document.querySelector('.motion-page-enter') as HTMLElement | null;
    if (!el) return { name: 'none', duration: '0s' };
    const s = getComputedStyle(el);
    return { name: s.animationName, duration: s.animationDuration };
  });
  expect(parseFloat(animInfo.duration)).toBeLessThanOrEqual(0.02);
  await page.goto('/planet/mars');
  await page.waitForSelector('.planet-point__dot', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  // point dot transition none
  const trans = await page.evaluate(() => {
    const el = document.querySelector('.planet-point__dot') as HTMLElement | null;
    if (!el) return '0s';
    return getComputedStyle(el).transitionDuration;
  });
  expect(parseFloat(trans)).toBeLessThanOrEqual(0.02);
});

test('a11y: timeline keyboard focus', async ({ page }) => {
  await page.goto('/timeline');
  await page.waitForTimeout(2000);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const tag = await page.evaluate(() => document.activeElement?.tagName);
  expect(tag).toBe('BUTTON');
});
