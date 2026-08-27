import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const mobile = { width: 390, height: 844 };

async function expectNoDocumentOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
}

test('landing demo has no horizontal document overflow at 390 px', async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { name: 'Count every token. Keep every prompt private.' })).toBeVisible();
  await expect(page.locator('#demo-table tbody tr')).toHaveCount(3);
  await expectNoDocumentOverflow(page);
});

test('local dashboard has no horizontal document overflow at 390 px', async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.goto('http://127.0.0.1:4319/');
  await expect(page.getByRole('heading', { name: 'Your traces, reduced to evidence.' })).toBeVisible();
  await expect(page.locator('#ledger tbody tr')).toHaveCount(1);
  await expectNoDocumentOverflow(page);
});

test('landing keyboard demo and both tables have no serious accessibility defects', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:4173/');
  const modelTab = page.getByRole('tab', { name: 'Model' });
  await page.getByRole('tab', { name: 'Project' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(modelTab).toBeFocused();
  await expect(modelTab).toHaveAttribute('aria-selected', 'true');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.goto('http://127.0.0.1:4319/');
  await expect(page.locator('#ledger tbody tr')).toHaveCount(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
