import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });
const base = '/@fs/' + process.cwd().replaceAll('\\', '/') + '/';
const persistence = base + 'packages/persistence/src/logbook.ts';
async function seed(page: Page, days = 0) {
  await page.goto('/');
  await page.evaluate(
    async ({ path, days }) => {
      const { openLogbook } = await import(path);
      const db = await openLogbook(indexedDB);
      const entities: any[] = [
        {
          kind: 'activity',
          id: 'linked',
          title: 'Walk',
          deck: null,
          zone: null,
          segments: [{ date: '2026-10-27', start: 540, end: 600, offset: null }],
          attachments: [],
        },
        {
          kind: 'moment',
          id: 'best',
          date: '2026-10-27',
          text: 'A good walk',
          activity: 'linked',
          featured: true,
        },
        { kind: 'settings', id: 'legacy', value: { pf: { dl: 30 }, unknown: 'keep' } },
      ];
      const dates = Array.from(
        { length: days },
        (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`,
      );
      for (const date of dates)
        entities.push({
          kind: 'page',
          id: date,
          date,
          lines: [
            { id: 'a', t: `First ${date}`, unknown: 'kept' },
            { id: 'b', t: `Second ${date}` },
          ],
          strokes: [],
          attachments: [],
        });
      if (days) entities.push({ kind: 'history', id: 'bt', value: dates });
      await db.commit({ id: 'seed', at: 1, edit: { type: 'putMany', entities } });
      db.close();
      localStorage.setItem('slb1', 'legacy-sentinel');
    },
    { path: persistence, days },
  );
  await page.goto('/?phase=4');
  await expect(page.getByRole('heading', { name: 'A message in a bottle' })).toBeVisible();
}
async function read(page: Page) {
  return page.evaluate(async (path) => {
    const { openLogbook } = await import(path);
    const db = await openLogbook(indexedDB);
    const state = await db.load();
    const pending = await db.pending();
    db.close();
    return { state, pending };
  }, persistence);
}
async function draw(page: Page, label: string) {
  const canvas = page.getByRole('img', { name: label, exact: true });
  const r = (await canvas.boundingBox())!;
  await page.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.6, r.y + r.height * 0.6, { steps: 5 });
  await page.mouse.up();
}

test('Notebook in-place writing, blank row, quick syntax, navigation and restart preserve all other data', async ({
  page,
}) => {
  await seed(page);
  await page.getByLabel('Notebook date').fill('2026-10-26');
  const input = page.getByLabel('Write a new line');
  await input.fill('Read book +learning t45');
  await input.press('Enter');
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toHaveValue('Read book');
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await page.getByLabel('Notebook line 1', { exact: true }).fill('Edited in place');
  await page.getByRole('button', { name: 'Next day', exact: true }).click();
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toHaveValue('A good walk');
  await page.getByRole('button', { name: 'Previous day', exact: true }).click();
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toHaveValue('Edited in place');
  await page.reload();
  await page.getByLabel('Notebook date').fill('2026-10-26');
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toHaveValue('Edited in place');
  const result = await read(page);
  expect(result.state.entities['activity:linked'].title).toBe('Walk');
  expect(result.state.entities['settings:legacy'].value.unknown).toBe('keep');
  expect(result.state.entities['page:2026-10-26'].lines).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem('slb1'))).toBe('legacy-sentinel');
});

test('Notebook doodles, stroke Undo, clear recovery, guarded free drawing and sent-page editing survive restart', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(page);
  await page.getByLabel('Write a new line').fill('Doodle day');
  await page.getByLabel('Write a new line').press('Enter');
  await page.getByRole('button', { name: 'Draw beside line 1', exact: true }).click();
  await draw(page, 'Doodle canvas');
  await draw(page, 'Doodle canvas');
  await page.getByRole('button', { name: 'Undo stroke', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Doodle canvas', exact: true }).locator('path'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Saved doodle', exact: true }).locator('path'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Draw your day here', exact: true }).click();
  await draw(page, 'Day drawing');
  await page.getByRole('button', { name: 'Save drawing', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  await page.getByRole('button', { name: 'Draw your day here', exact: true }).click();
  await page.getByRole('button', { name: 'Clear drawing', exact: true }).click();
  await page.getByRole('button', { name: 'Save drawing', exact: true }).click();
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Day drawing', exact: true }).locator('path'),
  ).toHaveCount(1);
  await page.screenshot({
    path: `build/notebook-desktop-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Send to sea', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Notebook line 1', { exact: true }).fill('Edited after send');
  await page.getByLabel('Notebook line 1', { exact: true }).press('Enter');
  await expect(page.getByRole('status')).toContainText('Saved locally');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `build/notebook-mobile-${info.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const state = (await read(page)).state;
  const p = Object.values(state.entities).find(
    (e: any) => e.kind === 'page' && e.lines.some((l: any) => l.t === 'Edited after send'),
  ) as any;
  expect(p.strokes).toHaveLength(1);
  expect(p.lines[0].sk).toHaveLength(1);
});

test('Sea uses five sent days, small/whole-day and best/date filters, durable monthly history and explicit review', async ({
  page,
}, info) => {
  await seed(page, 5);
  await page.getByRole('button', { name: 'Sea adventure', exact: true }).click();
  await expect(page.getByRole('button', { name: /bottle 2026/ })).toHaveCount(5);
  await page.getByRole('button', { name: 'Small', exact: true }).click();
  await expect(page.getByRole('button', { name: /One message bottle/ })).toHaveCount(5);
  const bottle = page.getByRole('button', { name: /One message bottle/ }).first(),
    name = (await bottle.getAttribute('aria-label'))!,
    date = name.slice(-10);
  await bottle.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('p')).toHaveCount(1);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: new RegExp('bottle ' + date) })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Sea adventure', exact: true }).click();
  await expect(page.getByRole('button', { name: new RegExp('bottle ' + date) })).toHaveCount(0);
  await page.getByLabel('Review date').fill(date);
  await page.getByRole('button', { name: 'Big', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Whole day bottle ' + date, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Whole day bottle ' + date, exact: true }).click();
  await expect(page.getByRole('dialog').locator('p')).toHaveCount(2);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Best things', exact: true }).click();
  await expect(page.getByRole('button', { name: /bottle 2026/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Best things', exact: true }).click();
  await page.screenshot({ path: `build/sea-desktop-${info.project.name}.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Notebook sections' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Back to Notebook', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Notebook sections' })).toBeVisible();
});

test('Notebook best links share Calendar moments and retain historical date on return to Calendar', async ({
  page,
}) => {
  await seed(page);
  await page.getByLabel('Notebook date').fill('2026-10-27');
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toHaveValue('A good walk');
  await page.getByLabel('Notebook line 1', { exact: true }).fill('A better walk');
  await page.getByLabel('Notebook line 1', { exact: true }).press('Enter');
  await expect(page.getByRole('status')).toContainText('Saved locally');
  expect((await read(page)).state.entities['moment:best'].text).toBe('A better walk');
  await page.getByRole('link', { name: 'Best thing · View activity', exact: true }).click();
  await expect(page.getByLabel('Calendar date')).toHaveValue('2026-10-27');
  expect((await read(page)).state.entities['activity:linked'].title).toBe('Walk');
});

test('Notebook save abort retains text and blocks navigation; retry commits once; editor lock spans Calendar', async ({
  page,
  context,
}) => {
  await seed(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    (window as any).restoreAdds = () => {
      IDBObjectStore.prototype.add = original;
    };
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'tail')
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return original.apply(this, args as [any, any]);
    };
  });
  await page.getByLabel('Write a new line').fill('Retained after failure');
  await page.getByLabel('Write a new line').press('Enter');
  await expect(page.getByRole('status')).toContainText('Unsaved');
  await expect(page.getByLabel('Write a new line')).toHaveValue('Retained after failure');
  await page.getByRole('button', { name: 'Sea adventure', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A message in a bottle' })).toBeVisible();
  expect((await read(page)).pending).toHaveLength(1);
  await page.evaluate(() => (window as any).restoreAdds());
  await page.getByLabel('Write a new line').press('Enter');
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toHaveValue(
    'Retained after failure',
  );
  expect((await read(page)).pending).toHaveLength(2);
  const second = await context.newPage();
  await second.goto('/?phase=3');
  await expect(second.getByRole('status')).toContainText('Another logbook editor is active');
  await second.close();
});

test('Notebook cancels unfinished strokes and doodles, and recovers deleted text after restart', async ({
  page,
}) => {
  await seed(page);
  await page.getByLabel('Write a new line').fill('Recover this line');
  await page.getByLabel('Write a new line').press('Enter');
  await page.getByRole('button', { name: 'Draw beside line 1', exact: true }).click();
  await draw(page, 'Doodle canvas');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Saved doodle', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Draw your day here', exact: true }).click();
  const canvas = page.getByRole('img', { name: 'Day drawing', exact: true }),
    r = (await canvas.boundingBox())!;
  await page.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.4, r.y + r.height * 0.4);
  await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect(canvas.locator('path')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel drawing', exact: true }).click();
  await page.getByLabel('Notebook line 1', { exact: true }).fill('');
  await page.getByLabel('Notebook line 1', { exact: true }).press('Enter');
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Recent changes · 30 days', exact: true }).click();
  await page
    .getByRole('button', { name: /^Restore / })
    .first()
    .click();
  await expect(page.getByLabel('Notebook line 1', { exact: true })).toHaveValue(
    'Recover this line',
  );
});
