import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  (page as any).appErrors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as any).appErrors).toEqual([]);
});
const path = '/@fs/' + process.cwd().replaceAll('\\', '/') + '/packages/persistence/src/logbook.ts';
const date = '2026-10-28';
async function seed(page: Page) {
  await page.clock.install({ time: new Date('2026-10-28T10:00:00') });
  await page.goto('/');
  await page.evaluate(
    async ({ path, date }) => {
      const { openLogbook } = await import(path),
        db = await openLogbook(indexedDB);
      const entities: any[] = [
        {
          kind: 'settings',
          id: 'legacy',
          value: {
            name: 'Captain',
            pf: { h24: 0 },
            unknown: 'keep',
            rorder: ['hs', 'bs', 'mood', 'must', 'heat', 'les', 'grat', 'otd', 'per', 'ach', 'rev'],
          },
        },
        {
          kind: 'history',
          id: 'ach',
          value: {
            'Maiden Voyage': 1,
            'Bright Spot': 1,
            'Four Bells': 1,
            'Fair Winds': 1,
            unknown: 'keep',
          },
        },
        { kind: 'deck', id: 'rest', name: 'Renamed deck', parent: null, excludeFromStreak: true },
        { kind: 'deck', id: 'child', name: 'Descendant', parent: 'rest', excludeFromStreak: false },
        {
          kind: 'task',
          id: 'plan',
          title: 'Read a chapter',
          date,
          deck: null,
          status: 'todo',
          must: true,
          time: 600,
          duration: 120,
          history: [{ keep: 'history' }],
          legacy: { pct: 35 },
        },
        {
          kind: 'page',
          id: date,
          date,
          lines: [
            {
              id: 'line',
              t: 'Notebook sentinel',
              sk: [
                {
                  c: '#000',
                  w: 2,
                  p: [
                    [0, 0],
                    [1, 1],
                  ],
                },
              ],
              unknown: 'keep',
            },
          ],
          strokes: [],
          attachments: [],
        },
        { kind: 'history', id: 'mood', value: { '2026-10-27': 0, unknown: { keep: true } } },
        {
          kind: 'reflection',
          id: 'les:old',
          value: { id: 'old', date: '2025-10-28', t: 'An old lesson', unknown: 'keep' },
        },
      ];
      for (let i = 0; i < 3; i++) {
        const d = `2026-10-${28 - i}`;
        entities.push({
          kind: 'activity',
          id: 'log' + i,
          title: 'Deep work',
          deck: null,
          zone: null,
          segments: [{ date: d, start: 540, end: 660, offset: null }],
          attachments: [],
        });
      }
      entities.push(
        {
          kind: 'activity',
          id: 'overlap',
          title: 'Overlap',
          deck: null,
          zone: null,
          segments: [{ date, start: 570, end: 630, offset: null }],
          attachments: [],
        },
        {
          kind: 'activity',
          id: 'excluded',
          title: 'Rest',
          deck: 'child',
          zone: null,
          segments: [{ date, start: 660, end: 780, offset: null }],
          attachments: [],
        },
      );
      for (let i = 0; i < 6; i++)
        entities.push({
          kind: 'moment',
          id: 'm' + i,
          date,
          text: 'Moment ' + i,
          activity: null,
          featured: i < 4,
        });
      await db.commit({ id: 'seed', at: 1, edit: { type: 'putMany', entities } });
      db.close();
      localStorage.setItem('slb1', 'legacy-sentinel');
    },
    { path, date },
  );
  await page.goto('/?phase=5');
  await expect(page.getByRole('heading', { name: 'Good morning, Captain' })).toBeVisible();
}
const card = (page: Page, id: string) => page.locator(`[data-card="${id}"]`);
async function reflection(page: Page) {
  await page.locator('aside').getByRole('button', { name: 'Reflection', exact: true }).click();
}
async function read(page: Page) {
  return page.evaluate(async (path) => {
    const { openLogbook } = await import(path);
    const db = await openLogbook(indexedDB);
    const state = await db.load(),
      pending = await db.pending();
    db.close();
    return { state, pending };
  }, path);
}
test('Home union progress, inherited exclusions, mood zero, Must-do and best overflow share durable data with Notebook', async ({
  page,
}) => {
  await seed(page);
  await expect(card(page, 'must')).toContainText('Working on it');
  await expect(card(page, 'stats')).toContainText('4.0 h today');
  await expect(card(page, 'stats')).toContainText('120 / 120');
  await expect(card(page, 'streak')).toContainText('3');
  await page.getByRole('button', { name: 'Mood: Very low', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  await page.getByRole('button', { name: 'Mark Read a chapter done', exact: true }).click();
  await expect(card(page, 'must')).toContainText('1 of 1 completed');
  await page.getByRole('button', { name: 'Add best thing', exact: true }).click();
  await page.getByLabel('Your words').fill('Overflow kept');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(card(page, 'best')).toContainText('4/4');
  await page.getByRole('button', { name: 'Choose four to feature', exact: true }).click();
  await page.getByLabel('Moment 0', { exact: true }).uncheck();
  await page.getByLabel('Overflow kept', { exact: true }).check();
  await page.getByRole('button', { name: 'Save selection', exact: true }).click();
  await expect(card(page, 'best')).toContainText('Overflow kept');
  await expect(card(page, 'best')).not.toContainText('Moment 0');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mood: Very low', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const { state } = await read(page);
  expect(Object.values(state.entities).filter((e: any) => e.kind === 'moment')).toHaveLength(7);
  expect(state.entities['settings:legacy'].value.unknown).toBe('keep');
  expect(state.entities['task:plan'].history[0]).toEqual({ keep: 'history' });
  await page.getByRole('link', { name: 'Open notebook', exact: true }).click();
  await expect(page.getByLabel('Notebook date')).toHaveValue(date);
  await expect(page.locator('input[value="Overflow kept"]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('slb1'))).toBe('legacy-sentinel');
});
test('Reflection lessons, gratitude, historical review, delete and persistent Undo; seven original achievements and share PNG', async ({
  page,
}) => {
  await seed(page);
  await reflection(page);
  await expect(card(page, 'hs')).toContainText('3');
  await expect(
    card(page, 'ach')
      .getByRole('button')
      .filter({ has: page.locator('b') }),
  ).toHaveCount(7);
  await page.getByLabel('Recording date').fill('2026-10-27');
  await page.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await page.getByLabel('Your words').fill('Keep the small joys');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Add gratitude', exact: true }).click();
  await page.getByLabel('Your words').fill('A kind friend');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Mood through the year' })).toBeVisible();
  await page.getByRole('button', { name: 'Share streak card', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Your streaks share card' })).toBeVisible();
  const png = await page
    .getByRole('img', { name: 'Your streaks share card' })
    .evaluate(async (img: HTMLImageElement) => {
      const b = await (await fetch(img.src)).blob();
      return { width: img.naturalWidth, height: img.naturalHeight, type: b.type, size: b.size };
    });
  expect(png.width).toBe(1080);
  expect(png.height).toBe(1350);
  expect(png.type).toBe('image/png');
  expect(png.size).toBeGreaterThan(10000);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Maiden Voyage: unlocked', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Maiden Voyage share card' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Open review', exact: true }).click();
  await page.getByRole('button', { name: 'Lessons', exact: true }).click();
  await page.getByLabel('Search review').fill('2026-10-27');
  await expect(page.getByRole('heading', { name: 'Keep the small joys' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A kind friend' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete Keep the small joys', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep the small joys' })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Recent changes', exact: true }).click();
  const restore = page
    .getByRole('dialog')
    .locator('div')
    .filter({ hasText: 'reflection:les:' })
    .filter({ has: page.getByRole('button', { name: 'Undo change', exact: true }) });
  await restore.first().getByRole('button', { name: 'Undo change', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await reflection(page);
  await expect(card(page, 'les')).toContainText('Keep the small joys');
  await expect(card(page, 'grat')).toContainText('A kind friend');
});
test('Home and Reflection layouts persist independently, pointer cancellation does not save, and mobile fits', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  await page.getByRole('button', { name: 'Move Must-do down', exact: true }).click();
  await expect(page.locator('[data-card]').first()).toHaveAttribute('data-card', 'best');
  await page.getByRole('button', { name: 'Hide Mood today', exact: true }).click();
  await page.getByRole('button', { name: 'Done customizing', exact: true }).click();
  await expect(card(page, 'mood')).toHaveCount(0);
  await reflection(page);
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  const before = (await read(page)).pending.length,
    handle = page.getByRole('button', { name: 'Drag Hours streak', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const bounds = (await handle.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await handle.dispatchEvent('pointercancel');
  await page.mouse.up();
  expect((await read(page)).pending.length).toBe(before);
  const source = (await handle.boundingBox())!,
    destination = (await card(page, 'bs').boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.locator('[data-card]').first()).toHaveAttribute('data-card', 'bs');
  await page.getByRole('button', { name: 'Done customizing', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `build/reflection-desktop-${info.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await reflection(page);
  await expect(page.locator('[data-card]').first()).toHaveAttribute('data-card', 'bs');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `build/reflection-mobile-${info.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Home', exact: true })
    .click();
  await expect(page.locator('[data-card]').first()).toHaveAttribute('data-card', 'best');
  await expect(card(page, 'mood')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `build/home-mobile-${info.project.name}.png`, fullPage: true });
  const state = (await read(page)).state;
  expect(state.entities['settings:legacy'].value.pf).toEqual({ h24: 0 });
});
test('quota failure retains draft, retries exactly once and shares the Calendar editor lock', async ({
  page,
  context,
}) => {
  await seed(page);
  const count = (await read(page)).pending.length;
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    (window as any).restoreAdds = () => (IDBObjectStore.prototype.add = original);
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'tail')
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return original.apply(this, args as [any, any]);
    };
  });
  await page.getByRole('button', { name: 'Add best thing', exact: true }).click();
  await page.getByLabel('Your words').fill('Retained draft');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Unsaved');
  await expect(page.getByLabel('Your words')).toHaveValue('Retained draft');
  expect((await read(page)).pending.length).toBe(count);
  const second = await context.newPage();
  await second.goto('/?phase=3');
  await expect(second.getByRole('status')).toContainText('Another logbook editor is active');
  await second.close();
  await page.evaluate(() => (window as any).restoreAdds());
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await read(page)).pending.length).toBe(count + 1);
  await page.reload();
  expect(
    Object.values((await read(page)).state.entities).filter(
      (e: any) => e.kind === 'moment' && e.text === 'Retained draft',
    ),
  ).toHaveLength(1);
});
test('historical review links and Sea shortcut land on their original surfaces without changing Notebook data', async ({
  page,
}) => {
  await seed(page);
  await reflection(page);
  await expect(card(page, 'otd')).toContainText('An old lesson');
  await page.getByRole('button', { name: 'Open review', exact: true }).click();
  await page.getByLabel('Search review').fill('An old lesson');
  await page.getByRole('link', { name: 'Notebook', exact: true }).last().click();
  await expect(page.getByLabel('Notebook date')).toHaveValue('2025-10-28');
  await page.goto('/?phase=5');
  await page.getByRole('link', { name: /Sea adventure/ }).click();
  await expect(page.getByRole('heading', { name: 'Sea adventure' })).toBeVisible();
  const { state } = await read(page);
  expect(state.entities['page:' + date].lines[0].unknown).toBe('keep');
  expect(state.entities['page:' + date].lines[0].sk).toHaveLength(1);
  expect(state.entities['history:mood'].value.unknown).toEqual({ keep: true });
});

test('mobile Home quick Must-do, backfilled moods, keyboard ordering and immediate Undo preserve Calendar semantics', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.getByRole('button', { name: 'Add must-do', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add must-do' })).toBeVisible();
  await page.getByLabel('Your words').fill('Read book +learning t45');
  await page.getByLabel('Your words').press('Enter');
  await expect(card(page, 'must')).toContainText('Read book');
  await expect(card(page, 'stats')).toContainText('4.0 h today');
  const state = (await read(page)).state;
  const task = Object.values(state.entities).find(
    (e: any) => e.kind === 'task' && e.title === 'Read book',
  ) as any;
  expect(task.duration).toBe(45);
  expect(task.must).toBe(true);
  expect(state.entities['deck:' + task.deck].name).toBe('Learning');
  await page.getByLabel('Recording date').fill('2026-10-27');
  await page.getByRole('button', { name: 'Mood: Very low', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mood: Very low', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mood: Very low', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  const move = page.getByRole('button', { name: 'Move Must-do down', exact: true });
  await move.focus();
  await move.press('Enter');
  await expect(page.locator('[data-card]').first()).toHaveAttribute('data-card', 'best');
  await page.getByRole('button', { name: 'Done customizing', exact: true }).click();
  await page.getByLabel('Recording date').fill(date);
  await page.getByRole('button', { name: 'Mark Read a chapter done', exact: true }).click();
  await page.getByRole('button', { name: 'Mark Read a chapter to do', exact: true }).click();
  const result = (await read(page)).state.entities['task:plan'];
  expect(result.status).toBe('todo');
  expect(result.legacy.man).toBe(1);
  expect(result.legacy.pct).toBe(35);
});
