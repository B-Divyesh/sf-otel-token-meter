import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const site = 'http://127.0.0.1:4173';
const mobile = { width: 390, height: 844 };

async function expectNoDocumentOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
}

test('landing and demo remain usable at 390 px', async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.goto(`${site}/`);
  await expect(page.getByRole('heading', { name: 'Count tokens from OpenTelemetry traces' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await expect(page.locator('#demo-table tbody tr')).toHaveCount(4);
  await expectNoDocumentOverflow(page);

  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(`${site}/demo/`);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#demo-table tbody tr')).toHaveCount(4);
  await expectNoDocumentOverflow(page);
});

test('local dashboard has no horizontal document overflow at 390 px', async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.goto('http://127.0.0.1:4319/');
  await expect(page.getByRole('heading', { name: 'Review local token and latency totals' })).toBeVisible();
  await expect(page.locator('#ledger tbody tr')).toHaveCount(1);
  await expectNoDocumentOverflow(page);
});

test('keyboard grouping, focus, reduced motion, and accessibility work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto(`${site}/demo/`);
  const modelTab = page.getByRole('tab', { name: 'Model' });
  await page.getByRole('tab', { name: 'Project' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(modelTab).toBeFocused();
  await expect(modelTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#demo-table tbody tr')).toHaveCount(4);
  expect(await modelTab.evaluate(element => getComputedStyle(element).outlineWidth)).toBe('3px');
  expect(await page.locator('.button').first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.goto(`${site}/`);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.goto('http://127.0.0.1:4319/');
  await expect(page.locator('#ledger tbody tr')).toHaveCount(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('every public route has its own title, common navigation, and accessible content', async ({ page }) => {
  const routes = new Map([
    ['/', 'OTel Token Meter — Count tokens from OTLP traces'],
    ['/demo/', 'Demo — OTel Token Meter'],
    ['/privacy/', 'Privacy — OTel Token Meter'],
    ['/terms/', 'Terms — OTel Token Meter'],
  ]);
  for (const [route, title] of routes) {
    const response = await page.goto(`${site}${route}`);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Demo' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }

  const missing = await page.goto(`${site}/does-not-exist`);
  expect(missing?.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found — OTel Token Meter');
  await expect(page.getByRole('heading', { name: 'Return to the token meter' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the product' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
