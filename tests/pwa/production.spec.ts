import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('production install, offline all-screen reopen, update waits for active draft and every tab, failed install retains current shell', async ({
  page,
  context,
}) => {
  const workerFile = 'build/foundation/sw-production.js',
    htmlFile = 'build/foundation/index.html';
  const original = await fs.readFile(workerFile, 'utf8'),
    html = await fs.readFile(htmlFile, 'utf8');
  try {
    await page.goto('/?phase=8&tool=help');
    await expect(page.getByLabel('Offline and updates')).toContainText('Offline shell ready');
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await page.getByLabel('Your name', { exact: true }).fill('Offline sailor');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.goto('/?phase=8');
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByLabel('Offline and updates')).toContainText('Offline');
    for (const phase of [3, 4, 5, 6]) {
      await page.goto('/?phase=' + phase);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByText('Storage validation failed', { exact: false })).toHaveCount(0);
    }
    await page.goto('/?phase=8');
    await expect(page.getByText('Offline sailor', { exact: false }).first()).toBeVisible();
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await page.getByLabel('Your name', { exact: true }).fill('Draft survives update');
    // Serve a complete next release on this disposable localhost origin only.
    const next = original.replace(/slb-production-([a-f0-9]+)/, 'slb-production-update-test');
    await fs.writeFile(workerFile, next);
    await fs.writeFile(
      htmlFile,
      html.replace('</head>', '<meta name="test-release" content="next" /></head>'),
    );
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect
      .poll(() =>
        page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting),
      )
      .toBeTruthy();
    await expect(page.getByLabel('Your name', { exact: true })).toHaveValue(
      'Draft survives update',
    );
    expect(await page.locator('meta[name="test-release"]').count()).toBe(0);
    const second = await context.newPage();
    await second.goto('/?phase=8');
    await expect(
      second.getByText('Another logbook editor is active.', { exact: false }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.close();
    expect(await second.locator('meta[name="test-release"]').count()).toBe(0);
    await second.close();
    const reopened = await context.newPage();
    await reopened.goto('/?phase=8');
    await expect(reopened.locator('meta[name="test-release"]')).toHaveAttribute('content', 'next');
    await expect(
      reopened.getByText('Draft survives update', { exact: false }).first(),
    ).toBeVisible();
    await expect
      .poll(() =>
        reopened.evaluate(
          async () => (await navigator.serviceWorker.getRegistration())?.active?.state,
        ),
      )
      .toBe('activated');
    await fs.writeFile(
      workerFile,
      next
        .replace('slb-production-update-test', 'slb-production-broken-test')
        .replace('const FILES=[', 'const FILES=["https://127.0.0.1:1/required-asset.js",'),
    );
    await reopened.evaluate(async () => {
      try {
        await (await navigator.serviceWorker.getRegistration())!.update();
      } catch {}
    });
    await expect
      .poll(() =>
        reopened.evaluate(async () => {
          const r = await navigator.serviceWorker.getRegistration();
          return !r?.installing && !r?.waiting;
        }),
      )
      .toBeTruthy();
    const cacheState = await reopened.evaluate(async () => {
      const keys = await caches.keys();
      return Promise.all(
        keys.map(async (key) => ({
          key,
          urls: (await (await caches.open(key)).keys()).map((r) => r.url),
        })),
      );
    });
    await test.info().attach('cache-before-offline', {
      body: JSON.stringify(cacheState),
      contentType: 'application/json',
    });
    expect(
      cacheState
        .find((c) => c.key === 'slb-production-update-test')
        ?.urls.some((u) => u.endsWith('/index.html')),
    ).toBeTruthy();
    await context.setOffline(true);
    await reopened.reload();
    await expect(
      reopened.getByText('Draft survives update', { exact: false }).first(),
    ).toBeVisible();
  } finally {
    await fs.writeFile(workerFile, original);
    await fs.writeFile(htmlFile, html);
    await context.setOffline(false).catch(() => {});
  }
});
