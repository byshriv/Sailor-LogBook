import { expect, test } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
const path = '/@fs/' + process.cwd().replaceAll('\\', '/') + '/packages/persistence/src/logbook.ts';
const date = '2026-10-28';
test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  (page as any).appErrors = errors;
});
test.afterEach(async ({ page }) => expect((page as any).appErrors).toEqual([]));
async function seed(page: Page) {
  await page.clock.install({ time: new Date('2026-10-28T10:00:00') });
  await page.goto('/');
  await page.evaluate(
    async ({ path, date }) => {
      const { openLogbook } = await import(path),
        db = await openLogbook(indexedDB);
      const task = (id: string, title: string, d = date) => ({
        kind: 'task',
        id,
        title,
        date: d,
        deck: 'learning',
        status: 'todo',
        time: null,
        duration: 45,
        must: true,
        history: [{ keep: 'history' }],
        legacy: { wait: 'Sam', low: 1, voy: 1, pct: 35, unknown: { keep: true } },
      });
      await db.commit({
        id: 'seed',
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
              legacy: { c: '#d8b94c', unknown: 'keep' },
            },
            task('move', 'Move me'),
            task('past', 'Unresolved plan', '2026-10-27'),
            task('skip', 'Skip me', '2026-10-26'),
            task('nogo', 'Not doing', '2026-10-25'),
            { ...task('timed', 'Timed plan'), time: 540, duration: 30 },
            {
              kind: 'activity',
              id: 'log',
              title: 'Logged only',
              deck: null,
              zone: null,
              segments: [{ date, start: 540, end: 600, offset: null }],
              attachments: [],
              legacy: { keep: true },
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
            { kind: 'history', id: 'bt', value: [date] },
            { kind: 'history', id: 'seen', value: { '2026-10': [date] } },
            { kind: 'history', id: 'mood', value: { [date]: 0 } },
            { kind: 'reflection', id: 'les:l', value: { date, t: 'Lesson', unknown: 'keep' } },
            {
              kind: 'settings',
              id: 'legacy',
              value: { name: 'Captain', order: ['must', 'best'], unknown: 'keep' },
            },
          ],
        },
      });
      db.close();
      localStorage.setItem('slb1', 'legacy-sentinel');
    },
    { path, date },
  );
  await page.goto('/?phase=6&date=' + date);
  await expect(page.getByRole('heading', { name: 'Plan your day', exact: true })).toBeVisible();
}
const card = (page: Page, id: string) => page.locator(`[data-task="${id}"]`);
const column = (page: Page, date: string) => page.locator(`[data-day="${date}"]`);
async function read(page: Page) {
  return page.evaluate(async (path) => {
    const { openLogbook } = await import(path),
      db = await openLogbook(indexedDB);
    const state = await db.load(),
      pending = await db.pending();
    db.close();
    return { state, pending };
  }, path);
}
async function saved(page: Page) {
  await expect(page.getByRole('status')).toContainText('Saved locally');
}
async function dragTo(page: Page, handle: Locator, target: Locator) {
  await handle.scrollIntoViewIfNeeded();
  const a = await handle.boundingBox();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  const b = await target.boundingBox();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + Math.min(50, b!.height / 2), { steps: 8 });
  await page.mouse.up();
}
test('responsive task editor keeps flags, quick decks, statuses and dates without logging plans', async ({
  page,
}, info) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Add task on ' + date, exact: true }).click();
  await page.getByLabel('Task title', { exact: true }).fill('Study +lea t30');
  await expect(page.getByText('Learning selected', { exact: true })).toBeVisible();
  await page.getByLabel('Must-do', { exact: true }).check();
  await page.getByLabel('Low energy', { exact: true }).check();
  await page.getByLabel('Waiting on', { exact: true }).check();
  await page.getByLabel('Waiting on whom or what?').fill('A reply');
  await page.getByLabel('Voyage', { exact: true }).check();
  await page.getByRole('slider', { name: 'Voyage progress' }).fill('65');
  await page.getByLabel('Time (optional)', { exact: true }).fill('11:00');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await saved(page);
  const result = await read(page),
    t = Object.values(result.state.entities).find((t: any) => t.title === 'Study') as any;
  expect(t.deck).toBe('learning');
  expect(t.duration).toBe(30);
  expect(t.legacy.pct).toBe(65);
  expect(t.legacy.wait).toBe('A reply');
  await expect(card(page, t.id)).toContainText('Must-do');
  await expect(card(page, t.id)).toContainText('Low energy');
  await expect(card(page, t.id)).toContainText('Voyage · 65%');
  await expect(
    page.getByText('60 min logged on ' + date + '. Planned time is separate.', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `build/planner-mobile-${info.project.name}.png` });
  await card(page, t.id).getByRole('button', { name: 'Edit / move' }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('done');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(card(page, t.id)).toContainText('Done');
  expect((await read(page)).state.entities['task:' + t.id]).toMatchObject({
    status: 'done',
    legacy: { man: 1, pct: 65 },
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `build/planner-desktop-${info.project.name}.png` });
});
test('actual pointer moves and editor moves keep identity, time, history and restart; scheduling stays a plan', async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await dragTo(
    page,
    card(page, 'move').getByRole('button', { name: 'Move Move me', exact: true }),
    column(page, '2026-10-29'),
  );
  await saved(page);
  await expect(column(page, '2026-10-29').locator('[data-task="move"]')).toBeVisible();
  expect((await read(page)).state.entities['task:move']).toMatchObject({
    date: '2026-10-29',
    time: null,
    legacy: { pct: 35, unknown: { keep: true } },
  });
  await card(page, 'move').getByRole('button', { name: 'Edit / move' }).click();
  await page.getByLabel('Date', { exact: true }).fill(date);
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await saved(page);
  await page.getByRole('button', { name: 'Schedule on Calendar', exact: true }).click();
  const slot = page.locator('[data-drop-minute="600"]');
  await slot.scrollIntoViewIfNeeded();
  await dragTo(
    page,
    card(page, 'move').getByRole('button', { name: 'Move Move me', exact: true }),
    slot,
  );
  await saved(page);
  expect((await read(page)).state.entities['task:move']).toMatchObject({ date, time: 600 });
  await page.reload();
  await expect(card(page, 'move')).toContainText('10:00');
  expect(
    Object.values((await read(page)).state.entities).filter(
      (e: any) => e.kind === 'task' && e.id === 'move',
    ),
  ).toHaveLength(1);
  await card(page, 'move').getByRole('button', { name: 'Edit / move' }).click();
  await page.getByLabel('Time (optional)', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await saved(page);
  await expect(card(page, 'move')).toContainText('Untimed');
  await page.locator('aside').getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByLabel('Calendar date')).toHaveValue(date);
  await expect(page.getByRole('status')).toBeVisible();
  expect((await read(page)).state.entities['task:move']).toMatchObject({ time: null });
});
test('Escape, pointer cancellation, lost capture, outside release and pre-hold touch do not write', async ({
  page,
}) => {
  await seed(page);
  const before = await read(page),
    handle = card(page, 'move').getByRole('button', { name: 'Move Move me', exact: true });
  for (const kind of ['escape', 'pointercancel', 'lostpointercapture', 'outside']) {
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    if (kind === 'escape') await page.keyboard.press('Escape');
    else if (kind === 'outside') await page.mouse.move(5, 5);
    else await handle.dispatchEvent(kind);
    await page.mouse.up();
    expect((await read(page)).pending).toHaveLength(before.pending.length);
  }
  await handle.scrollIntoViewIfNeeded();
  const touchBox = await handle.boundingBox();
  await page.mouse.move(touchBox!.x + touchBox!.width / 2, touchBox!.y + touchBox!.height / 2);
  await page.mouse.down();
  await handle.dispatchEvent('pointercancel');
  await handle.dispatchEvent('pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
    button: 0,
    clientX: 100,
    clientY: 200,
  });
  await handle.dispatchEvent('pointermove', {
    pointerId: 1,
    pointerType: 'touch',
    clientX: 130,
    clientY: 200,
  });
  await page.clock.runFor(400);
  await handle.dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'touch',
    clientX: 130,
    clientY: 200,
  });
  await page.mouse.up();
  expect((await read(page)).state).toEqual(before.state);
});
test('rollover is reviewed, leave planned cancels, skip/nogo retain dates and history persists with Undo', async ({
  page,
}) => {
  await seed(page);
  const original = await read(page);
  await page.locator('details').first().locator('summary').click();
  await page.getByRole('button', { name: 'Review Unresolved plan', exact: true }).click();
  await page.getByRole('button', { name: 'Leave planned', exact: true }).click();
  expect((await read(page)).state).toEqual(original.state);
  await page.getByRole('button', { name: 'Review Unresolved plan', exact: true }).click();
  await page.getByLabel('New day', { exact: true }).fill('2026-11-01');
  await expect(page.getByRole('dialog')).toContainText('original day is recorded as Skipped');
  await page.getByRole('button', { name: 'Apply review', exact: true }).click();
  await saved(page);
  expect((await read(page)).state.entities['task:past']).toMatchObject({
    date: '2026-11-01',
    time: null,
    status: 'todo',
    history: [{ keep: 'history' }, { date: '2026-10-27', status: 'skip', previousStatus: 'todo' }],
  });
  await expect(page.locator('[data-history="past"]')).toContainText('Skipped');
  for (const [title, id, decision] of [
    ['Skip me', 'skip', 'skip'],
    ['Not doing', 'nogo', 'nogo'],
  ]) {
    await page.getByRole('button', { name: 'Review ' + title, exact: true }).click();
    await page.getByLabel('Decision').selectOption(decision!);
    await page.getByRole('button', { name: 'Apply review', exact: true }).click();
    await saved(page);
    expect((await read(page)).state.entities['task:' + id]).toMatchObject({
      date: id === 'skip' ? '2026-10-26' : '2026-10-25',
      status: decision,
    });
  }
  await page.reload();
  await page.getByRole('button', { name: 'Recent changes', exact: true }).click();
  const row = page.getByRole('dialog').locator('[data-change-keys="task:nogo"]');
  await row.getByRole('button', { name: 'Undo change', exact: true }).click();
  await saved(page);
  expect((await read(page)).state.entities['task:nogo']).toMatchObject({
    date: '2026-10-25',
    status: 'todo',
  });
});
test('held touch-style drag ignores a second pointer, filters retain tasks and keyboard cancellation saves nothing', async ({
  page,
}) => {
  await seed(page);
  await expect(page.getByRole('heading', { name: 'Plan your day', exact: true })).toBeInViewport();
  const before = await read(page);
  for (const filter of ['must', 'wait', 'low', 'voy']) {
    await page.getByLabel('Task filter').selectOption(filter);
    await expect(card(page, 'move')).toHaveCount(1);
  }
  await page.getByLabel('Task filter').selectOption('history');
  await expect(card(page, 'move')).toHaveCount(0);
  await page.getByLabel('Task filter').selectOption('all');
  const handle = card(page, 'move').getByRole('button', { name: 'Move Move me', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const b = await handle.boundingBox();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2);
  await page.mouse.down();
  await handle.dispatchEvent('pointercancel');
  await handle.dispatchEvent('pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
    button: 0,
    clientX: b!.x,
    clientY: b!.y,
  });
  await handle.dispatchEvent('pointerdown', {
    pointerId: 2,
    pointerType: 'touch',
    button: 0,
    clientX: b!.x,
    clientY: b!.y,
  });
  await page.clock.runFor(400);
  const target = await column(page, '2026-10-29').boundingBox();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + 50, { steps: 5 });
  await page.mouse.up();
  await saved(page);
  expect((await read(page)).state.entities['task:move']).toMatchObject({ date: '2026-10-29' });
  await card(page, 'move').getByRole('button', { name: 'Edit / move' }).click();
  await page.getByLabel('Task title', { exact: true }).fill('Unsaved cancellation');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = await read(page);
  expect(after.pending).toHaveLength(before.pending.length + 1);
  expect(after.state.entities['task:move'].title).toBe('Move me');
});
test('failed writes retain all draft fields and retry once atomically; delete/restart recovery and shared lock', async ({
  page,
  context,
}) => {
  await seed(page);
  const before = await read(page);
  await page.getByRole('button', { name: 'Add task on ' + date, exact: true }).click();
  await page.getByLabel('Task title', { exact: true }).fill('Draft +newdeck t20');
  await page.getByLabel('Waiting on', { exact: true }).check();
  await page.getByLabel('Waiting on whom or what?').fill('Retry person');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    (window as any).restoreAdds = () => (IDBObjectStore.prototype.add = original);
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'tail')
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Unsaved');
  await expect(page.getByLabel('Task title', { exact: true })).toHaveValue('Draft +newdeck t20');
  await expect(page.getByLabel('Waiting on whom or what?')).toHaveValue('Retry person');
  expect((await read(page)).state).toEqual(before.state);
  await expect(page.getByLabel('Planner date')).toBeDisabled();
  await page.evaluate(() => (window as any).restoreAdds());
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await saved(page);
  const after = await read(page),
    t = Object.values(after.state.entities).find((e: any) => e.title === 'Draft') as any;
  expect(after.pending).toHaveLength(before.pending.length + 1);
  expect(after.state.entities['deck:' + t.deck]).toBeTruthy();
  const other = await context.newPage();
  await other.goto('/?phase=3');
  await expect(other.getByRole('status')).toContainText('Another logbook editor');
  await other.close();
  await card(page, t.id).getByRole('button', { name: 'Edit / move' }).click();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(card(page, t.id)).toHaveCount(0);
  await page.getByRole('button', { name: 'Recent changes', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Undo change', exact: true })
    .first()
    .click();
  await saved(page);
  expect((await read(page)).state.entities['task:' + t.id]).toMatchObject({
    title: 'Draft',
    legacy: { wait: 'Retry person' },
  });
});
test('date changes, midnight, leap-day review and navigation preserve all unrelated data', async ({
  page,
}) => {
  await seed(page);
  const before = await read(page);
  await expect(card(page, 'timed')).toContainText('Done · by clock');
  await page.clock.setSystemTime(new Date('2026-10-29T00:01:00'));
  await page.clock.runFor(30001);
  await expect(page.getByText('Thursday, Oct 29', { exact: true })).toBeVisible();
  expect((await read(page)).state).toEqual(before.state);
  await page.getByLabel('Planner date').fill('2028-02-29');
  await expect(column(page, '2028-03-01')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add task on 2028-02-29', exact: true }).click();
  await page.getByLabel('Task title', { exact: true }).fill('Leap plan');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await saved(page);
  await page.reload();
  // Navigation is local unless explicitly linked; reload returns to the URL's original anchor.
  const after = await read(page);
  for (const [key, value] of Object.entries(before.state.entities))
    expect(after.state.entities[key]).toEqual(value);
  expect(await page.evaluate(() => localStorage.getItem('slb1'))).toBe('legacy-sentinel');
  await page.locator('aside').getByRole('button', { name: 'Notebook', exact: true }).click();
  await expect(page.locator('input[value="Notebook sentinel"]')).toBeVisible();
  expect((await read(page)).state.entities['page:' + date]).toEqual(
    before.state.entities['page:' + date],
  );
});
