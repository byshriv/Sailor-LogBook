import { expect, test } from '@playwright/test';
const base = '/@fs/' + process.cwd().replaceAll('\\', '/') + '/';
async function seed(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(
    async (paths) => {
      const { openLogbook } = await import(paths.persistence);
      const db = await openLogbook(indexedDB);
      await db.commit({
        id: 'seed-calendar',
        at: 1,
        edit: {
          type: 'putMany',
          entities: [
            {
              kind: 'deck',
              id: 'learning',
              name: 'Learning',
              parent: null,
              excludeFromStreak: false,
              legacy: { c: '#226192' },
            },
            { kind: 'preset', id: 'read', title: 'Read preset', deck: 'learning', duration: 45 },
            { kind: 'preset', id: 'free', title: 'Duration free', deck: null, duration: 0 },
            {
              kind: 'activity',
              id: 'morning',
              title: 'Morning',
              deck: 'learning',
              zone: null,
              segments: [{ date: '2026-10-27', start: 540, end: 600, offset: null }],
              attachments: [],
              legacy: { desc: 'Original note', unknown: { retained: true } },
            },
            {
              kind: 'activity',
              id: 'night',
              title: 'Midnight',
              deck: null,
              zone: 'America/New_York',
              segments: [
                { date: '2026-10-27', start: 1380, end: 1440, offset: -240 },
                { date: '2026-10-28', start: 0, end: 60, offset: -240 },
              ],
              attachments: [],
            },
            { kind: 'settings', id: 'legacy', value: { pf: { dl: 30, ws: 1 } } },
          ],
        },
      });
      db.close();
      localStorage.setItem('slb1', 'legacy-sentinel');
    },
    { persistence: base + 'packages/persistence/src/logbook.ts' },
  );
  await page.goto('/?phase=3');
  await page.getByLabel('Calendar date').fill('2026-10-27');
  await page.getByRole('button', { name: 'Day', exact: true }).click();
}
async function read(page: import('@playwright/test').Page) {
  return page.evaluate(async (path) => {
    const { openLogbook } = await import(path);
    const db = await openLogbook(indexedDB);
    const state = await db.load();
    const pending = await db.pending();
    db.close();
    return { state, pending };
  }, base + 'packages/persistence/src/logbook.ts');
}

test('Calendar quick syntax, presets, future plans, reload and shared editing lock', async ({
  page,
  context,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Quick log', exact: true }).click();
  await page.getByLabel('Activity title').fill('Read book +newdeck t45');
  await page.getByLabel('Activity title').press('Enter');
  await expect(page.getByRole('status')).toContainText('Saved locally');
  let data = await read(page);
  expect(
    Object.values(data.state.entities).some((e: any) => e.kind === 'deck' && e.name === 'newdeck'),
  ).toBe(true);
  expect(data.pending).toHaveLength(2);
  await page.getByRole('button', { name: 'Quick log', exact: true }).click();
  await page.getByRole('button', { name: 'Read preset', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Duration free', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Quick add' })).toContainText('45 min');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  await page.getByLabel('Calendar date').fill('2099-01-01');
  await page.getByRole('button', { name: 'Quick log', exact: true }).click();
  await page.getByLabel('Activity title').fill('Future task');
  await page.getByLabel('Activity title').press('Enter');
  await expect(page.getByRole('status')).toContainText('Planned task');
  data = await read(page);
  expect(Object.values(data.state.entities).find((e: any) => e.title === 'Future task')?.kind).toBe(
    'task',
  );
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Ready');
  expect((await read(page)).pending).toHaveLength(4);
  const other = await context.newPage();
  await other.goto('/?phase=2');
  await expect(other.getByRole('status')).toContainText('Another Phase 2 preview tab');
  await other.close();
  expect(await page.evaluate(() => localStorage.getItem('slb1'))).toBe('legacy-sentinel');
});

test('Calendar linked midnight editor, best thing, delete and 30-day restore survive restart', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '3 days', exact: true }).click();
  const night = page.getByTestId('calendar-block').filter({ hasText: 'Midnight' });
  await expect(night).toHaveCount(2);
  await night.first().scrollIntoViewIfNeeded();
  await night.first().click();
  await page.getByLabel('Activity title').fill('Night renamed');
  await page.getByRole('button', { name: 'Best thing', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  let data = await read(page);
  expect(data.state.entities['activity:night'].segments[0].offset).toBe(-240);
  expect(data.state.entities['activity:night'].segments).toHaveLength(2);
  expect(
    Object.values(data.state.entities).filter((e: any) => e.kind === 'moment' && e.featured),
  ).toHaveLength(1);
  const renamed = page.getByTestId('calendar-block').filter({ hasText: 'Night renamed' });
  await renamed.first().click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(renamed).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Recently deleted', exact: true }).click();
  await page.getByRole('button', { name: 'Restore', exact: true }).last().click();
  await expect(page.getByRole('status')).toContainText('Restored locally');
  data = await read(page);
  expect(data.state.entities['activity:night'].segments).toHaveLength(2);
});

test('Calendar mouse move, edge resize, keyboard alternative and escape cancel', async ({
  page,
}) => {
  await seed(page);
  const block = page.getByTestId('calendar-block').filter({ hasText: 'Morning' });
  await block.scrollIntoViewIfNeeded();
  let r = (await block.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + 20);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2, r.y + 48, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  expect((await read(page)).state.entities['activity:morning'].segments[0].start).toBe(570);
  r = (await block.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height - 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height + 26, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => (await read(page)).state.entities['activity:morning'].segments[0].end)
    .toBe(660);
  await block.focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect
    .poll(async () => (await read(page)).state.entities['activity:morning'].segments[0].start)
    .toBe(565);
  const before = JSON.stringify((await read(page)).state.entities['activity:morning']);
  r = (await block.boundingBox())!;
  await page.mouse.move(r.x + 20, r.y + 20);
  await page.mouse.down();
  await page.mouse.move(r.x + 20, r.y + 60);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(JSON.stringify((await read(page)).state.entities['activity:morning'])).toBe(before);
});

test('Mobile outside tap dismisses without selecting another block; views and zoom remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const block = page.getByTestId('calendar-block').filter({ hasText: 'Morning' });
  await block.scrollIntoViewIfNeeded();
  await block.click();
  await expect(page.getByRole('form', { name: 'Entry editor' })).toBeVisible();
  await page.getByRole('status').click();
  await expect(page.getByRole('form', { name: 'Entry editor' })).toHaveCount(0);
  await expect(page.getByLabel('Calendar date')).toHaveValue('2026-10-27');
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await page.getByRole('button', { name: 'Open 2026-10-28', exact: true }).click();
  await expect(page.getByLabel('Calendar date')).toHaveValue('2026-10-28');
  await page.getByLabel('Calendar zoom').fill('100');
  expect(await page.getByLabel('Calendar zoom').inputValue()).toBe('100');
  await page
    .locator('[data-calendar-day]')
    .first()
    .dispatchEvent('wheel', { ctrlKey: true, deltaY: -100 });
  await expect(page.getByLabel('Calendar zoom')).toHaveValue('110');
  await page.getByRole('button', { name: 'Quick log', exact: true }).click();
  await page.getByLabel('Activity title').fill('Read book +lea t45');
  await page.screenshot({ path: 'build/calendar-mobile.png', fullPage: true });
});

test('Calendar storage abort retains draft and publishes no partial deck or activity', async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
      const tx = original.apply(this, args);
      if (this.name === 'slb-phase2' && args[1] === 'readwrite') {
        IDBDatabase.prototype.transaction = original;
        queueMicrotask(() => tx.abort());
      }
      return tx;
    };
  });
  await page.getByRole('button', { name: 'Quick log', exact: true }).click();
  await page.getByLabel('Activity title').fill('Keep this draft +faildeck');
  await page.getByLabel('Activity title').press('Enter');
  await expect(page.getByRole('status')).toContainText('Unsaved');
  await expect(page.getByLabel('Activity title')).toHaveValue('Keep this draft +faildeck');
  const data = await read(page);
  expect(
    Object.values(data.state.entities).some((e: any) => e.kind === 'deck' && e.name === 'faildeck'),
  ).toBe(false);
  expect(data.pending).toHaveLength(1);
});

test('Mobile held ghost resize preserves typed text and commits only on Done', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.getByRole('button', { name: 'Quick log', exact: true }).click();
  await page.getByLabel('Activity title').fill('Typed ghost');
  const edge = page.locator('[data-draft-edge="end"]');
  await edge.scrollIntoViewIfNeeded();
  const r = (await edge.boundingBox())!;
  await edge.dispatchEvent('pointerdown', {
    pointerId: 5,
    pointerType: 'touch',
    clientX: r.x + 10,
    clientY: r.y + 3,
    button: 0,
  });
  await page.waitForTimeout(400);
  await edge.dispatchEvent('pointermove', {
    pointerId: 5,
    pointerType: 'touch',
    clientX: r.x + 10,
    clientY: r.y + 31,
    button: 0,
  });
  await edge.dispatchEvent('pointerup', {
    pointerId: 5,
    pointerType: 'touch',
    clientX: r.x + 10,
    clientY: r.y + 31,
    button: 0,
  });
  await expect(page.getByLabel('Activity title')).toHaveValue('Typed ghost');
  await expect(page.getByRole('form', { name: 'Quick add' })).toContainText('60 min');
  expect((await read(page)).pending).toHaveLength(1);
  await page.getByLabel('Activity title').press('Enter');
  await expect(page.getByRole('status')).toContainText('Saved locally');
  expect((await read(page)).pending).toHaveLength(2);
});

test('Calendar historical title edits retain original offsets across device timezones', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '3 days', exact: true }).click();
  const block = page.getByTestId('calendar-block').filter({ hasText: 'Midnight' }).first();
  await block.scrollIntoViewIfNeeded();
  await block.click();
  const before = (await read(page)).state.entities['activity:night'];
  await page.getByLabel('Activity title').fill('Travel kept');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  const after = (await read(page)).state.entities['activity:night'];
  expect(after.zone).toBe(before.zone);
  expect(after.segments).toEqual(before.segments);
  await page.screenshot({ path: 'build/calendar-desktop.png', fullPage: true });
});

test('Calendar photo opt-in commits exact bytes, or retains the draft when native Blob storage is unavailable', async ({
  page,
}) => {
  await seed(page);
  const blobStorage = await page.evaluate(async () => {
    const opening = indexedDB.open('calendar-blob-capability', 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore('data');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('data', 'readwrite');
        tx.objectStore('data').put(new Blob(['test'], { type: 'image/png' }), 'test');
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
      });
      return true;
    } catch {
      return false;
    } finally {
      db.close();
    }
  });
  const png = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    canvas.getContext('2d')!.fillRect(0, 0, 8, 8);
    return Array.from(
      new Uint8Array(
        await (
          await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
        ).arrayBuffer(),
      ),
    );
  });
  const block = page.getByTestId('calendar-block').filter({ hasText: 'Morning' });
  await block.scrollIntoViewIfNeeded();
  await block.click();
  await page.getByRole('button', { name: 'More Options', exact: true }).click();
  await page
    .getByLabel('Photo', { exact: true })
    .setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from(png) });
  await expect(page.getByRole('checkbox', { name: /Keep original/ })).not.toBeChecked();
  await page.getByRole('checkbox', { name: /Keep original/ }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  if (!blobStorage) {
    await expect(page.getByRole('status')).toContainText('Photo storage failed');
    await expect(page.getByRole('form', { name: 'Entry editor' })).toBeVisible();
    expect((await read(page)).state.entities['activity:morning'].attachments).toHaveLength(0);
    expect((await read(page)).pending).toHaveLength(1);
    return;
  }
  await expect(page.getByRole('status')).toContainText('Saved locally');
  const data = await read(page);
  const ids = data.state.entities['activity:morning'].attachments;
  expect(ids).toHaveLength(1);
  const bytes = await page.evaluate(
    async ({ path, id }) => {
      const { openLogbook } = await import(path);
      const db = await openLogbook(indexedDB);
      const attachment = await db.attachment(id);
      db.close();
      return {
        type: attachment.blob.type,
        bytes: Array.from(new Uint8Array(await attachment.blob.arrayBuffer())),
      };
    },
    { path: base + 'packages/persistence/src/logbook.ts', id: ids[0] },
  );
  expect(bytes.type).toBe('image/png');
  expect(bytes.bytes).toEqual(png);
  await block.click();
  await page.getByRole('button', { name: 'More Options', exact: true }).click();
  await expect(page.getByAltText('Activity attachment')).toBeVisible();
  await page.getByRole('button', { name: 'Remove attachment 1', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  expect((await read(page)).state.entities['activity:morning'].attachments).toHaveLength(0);
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Restored locally');
  expect((await read(page)).state.entities['activity:morning'].attachments).toEqual(ids);
});
