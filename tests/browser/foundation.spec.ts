import { expect, test } from '@playwright/test';

test('save survives reload; second editor is blocked; ownership recovers when first tab closes', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('Sample entry title').fill('Synthetic browser record');
  await page.getByRole('button', { name: 'Save sample locally' }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  await page.reload();
  await expect(page.getByRole('listitem')).toContainText('Synthetic browser record');
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.getByRole('status')).toContainText('Another preview tab is active');
  await page.close();
  await other.reload();
  await expect(other.getByLabel('Sample entry title')).toBeVisible();
  await expect(other.getByRole('listitem')).toContainText('Synthetic browser record');
  expect(errors).toEqual([]);
});

test('real IndexedDB aborted transaction retains draft, never reports Saved, and can retry', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    let fail = true;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'head' && fail) {
        fail = false;
        this.transaction.abort();
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
  await page.goto('/');
  await page.getByLabel('Sample entry title').fill('Retain this synthetic draft');
  await page.getByRole('button', { name: 'Save sample locally' }).click();
  await expect(page.getByRole('status')).toContainText('Unsaved');
  await expect(page.getByLabel('Sample entry title')).toHaveValue('Retain this synthetic draft');
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save sample locally' }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  await expect(page.getByRole('listitem')).toHaveCount(1);
});

test('narrow viewport and keyboard save remain usable', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByLabel('Sample entry title').fill('Keyboard sample');
  await page.getByLabel('Sample entry title').press('Enter');
  await expect(page.getByRole('status')).toContainText('Saved locally');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `build/foundation-${info.project.name}.png`, fullPage: true });
});

test('vetted Argon2id WASM works in the browser and reports an observed synthetic timing', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Run synthetic KDF check' }).click();
  await expect(page.getByTestId('kdf-result')).toContainText('Argon2id proof passed');
  await info.attach('synthetic-kdf-timing', {
    body: await page.getByTestId('kdf-result').innerText(),
    contentType: 'text/plain',
  });
});
