import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  (page as any).errors = errors;
});
test.afterEach(async ({ page }) => expect((page as any).errors).toEqual([]));
const modulePath =
  '/@fs/' + process.cwd().replaceAll('\\', '/') + '/packages/persistence/src/logbook.ts';
async function seed(page: any) {
  await page.goto('/');
  await page.evaluate(async (path: string) => {
    const { openLogbook } = await import(path);
    const db = await openLogbook(indexedDB);
    await db.commit({
      id: 'seed',
      at: 1,
      edit: {
        type: 'put',
        entity: { kind: 'history', id: 'kept', value: { text: 'Owner data', unknown: 'keep' } },
      },
    });
    db.close();
  }, modulePath);
  await page.goto('/?phase=8#storage');
}
test('download, cancel, replace, recovery and restart retain data', async ({ page }) => {
  await seed(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download plaintext backup' }).click();
  const file = await (await download).path();
  expect(file).toBeTruthy();
  await expect(page.getByLabel('Preview import')).toBeEnabled();
  await page.getByLabel('Preview import').setInputFiles(file!);
  const modal = page.getByRole('dialog', { name: 'Import preview' });
  await expect(modal).toContainText('Version 1 backup');
  await modal.getByRole('button', { name: 'Cancel import' }).click();
  const legacy = JSON.stringify({ docks: [], entries: [], name: 'Imported', unknown: 'preserved' });
  await page.getByLabel('Preview import').setInputFiles({
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(legacy),
  });
  await page.getByLabel('Import mode').selectOption('replace');
  await page.getByRole('button', { name: 'Apply reviewed import' }).click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('region', { name: 'Backup and recovery' })).toContainText(
    'Import saved locally',
  );
  await page.getByRole('button', { name: 'Verify storage and list recovery' }).click();
  await page.getByRole('button', { name: 'Review restore' }).first().click();
  await page.getByRole('button', { name: 'Restore this recovery point' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page.getByLabel('Preview import').setInputFiles(file!);
  await expect(page.getByRole('dialog')).toContainText('Current: 1');
  await page.getByRole('button', { name: 'Cancel import' }).click();
});
test('bad backup is rejected, quota failure retains preview and mobile layout fits', async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Preview import').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"sailor-logbook","version":99}'),
  });
  await expect(page.getByRole('region', { name: 'Backup and recovery' })).toContainText(
    'Unsupported backup version',
  );
  const raw = JSON.stringify({ docks: [], entries: [], name: 'Import' });
  await page
    .getByLabel('Preview import')
    .setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    (window as any).restoreQuota = () => (IDBObjectStore.prototype.add = original);
    IDBObjectStore.prototype.add = function (...args: any[]) {
      if (this.name === 'recovery') throw new DOMException('Synthetic quota', 'QuotaExceededError');
      return (original as any).apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Apply reviewed import' }).click();
  await expect(page.getByRole('dialog')).toContainText('Synthetic quota');
  await page.evaluate(() => (window as any).restoreQuota());
  await page.getByRole('button', { name: 'Apply reviewed import' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'build/data-tools-mobile.png', fullPage: true });
});
test('damaged replay opens recovery UI and explicitly restores a verified local point', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Save recovery point' }).click();
  await expect(page.getByRole('region', { name: 'Backup and recovery' })).toContainText(
    'Recovery point saved and verified',
  );
  await page.evaluate(async () => {
    const r = indexedDB.open('slb-phase2', 2);
    const db = await new Promise<IDBDatabase>((resolve) => (r.onsuccess = () => resolve(r.result)));
    await new Promise<void>((resolve) => {
      const tx = db.transaction('tail', 'readwrite');
      tx.objectStore('tail').clear();
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Local recovery' })).toBeVisible();
  await page.getByRole('button', { name: 'Find verified recovery points' }).click();
  await page.getByLabel('Recovery point', { exact: true }).selectOption({ index: 1 });
  await page
    .getByRole('button', { name: 'Restore selected point and archive damaged history' })
    .click();
  await expect(page.getByRole('heading', { name: 'Make it yours', exact: true })).toBeVisible();
});

test('Merge exposes ID conflicts and profile drafts disable data mutation', async ({ page }) => {
  await seed(page);
  const raw = await page.evaluate(async (path) => {
    const { openLogbook } = await import(path);
    const { exportBackup } = await import(path.replace('logbook.ts', 'backup.ts'));
    const db = await openLogbook(indexedDB, 'incoming-fixture');
    await db.commit({
      id: 'fixture',
      at: 1,
      edit: {
        type: 'put',
        entity: { kind: 'history', id: 'kept', value: { text: 'Imported version' } },
      },
    });
    const raw = await exportBackup(db);
    db.close();
    return raw;
  }, modulePath);
  await page.getByLabel('Preview import').setInputFiles({
    name: 'incoming.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  });
  await expect(page.getByRole('button', { name: 'Apply reviewed import' })).toBeDisabled();
  await page.getByText('Compare full record details').click();
  await expect(page.getByRole('dialog')).toContainText('Imported version');
  await expect(page.getByRole('dialog')).toContainText('Owner data');
  await page.getByLabel('Conflict history:kept').selectOption('incoming');
  await page.getByRole('dialog').screenshot({ path: 'build/import-preview-desktop.png' });
  await page.getByRole('button', { name: 'Apply reviewed import' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const value = await page.evaluate(async (path) => {
    const { openLogbook } = await import(path);
    const db = await openLogbook(indexedDB);
    const s = await db.load();
    db.close();
    return s.entities['history:kept'].value.text;
  }, modulePath);
  expect(value).toBe('Imported version');
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Your name').fill('Unsaved protected draft');
  await expect(page.getByRole('button', { name: 'Download plaintext backup' })).toBeDisabled();
  await expect(page.getByLabel('Preview import')).toBeDisabled();
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved protected draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
