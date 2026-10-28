import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
const path = '/@fs/' + process.cwd().replaceAll('\\', '/') + '/packages/persistence/src/logbook.ts';
test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  (page as any).errors = errors;
});
test.afterEach(async ({ page }) => expect((page as any).errors).toEqual([]));
async function seed(page: Page) {
  await page.clock.install({ time: new Date('2026-10-28T10:00:00') });
  await page.goto('/');
  await page.evaluate(async (path) => {
    const { openLogbook } = await import(path),
      db = await openLogbook(indexedDB);
    await db.commit({
      id: 'seed',
      at: 1,
      edit: {
        type: 'putMany',
        entities: [
          {
            kind: 'deck',
            id: 'work',
            name: 'Work',
            parent: null,
            excludeFromStreak: false,
            legacy: { c: '#226192', ic: 'briefcase', unknown: 'keep' },
          },
          {
            kind: 'deck',
            id: 'project',
            name: 'Project',
            parent: 'work',
            excludeFromStreak: false,
          },
          {
            kind: 'deck',
            id: 'chapter',
            name: 'Chapter',
            parent: 'project',
            excludeFromStreak: false,
          },
          {
            kind: 'deck',
            id: 'learning',
            name: 'Learning',
            parent: null,
            excludeFromStreak: false,
            legacy: { c: '#d8b94c', ic: 'book' },
          },
          {
            kind: 'activity',
            id: 'log',
            title: 'Read a book',
            deck: 'project',
            zone: null,
            segments: [{ date: '2026-10-28', start: 540, end: 600, offset: null }],
            attachments: [],
            legacy: { opaque: 'keep' },
          },
          {
            kind: 'task',
            id: 'plan',
            title: 'Plan a voyage',
            deck: 'work',
            date: '2026-10-28',
            time: null,
            duration: 45,
            status: 'todo',
            must: true,
            history: [],
            legacy: { pct: 40, unknown: 'keep' },
          },
          {
            kind: 'page',
            id: '2026-10-28',
            date: '2026-10-28',
            lines: [
              {
                id: 'l',
                t: 'A quiet afternoon',
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
              },
            ],
            strokes: [],
            attachments: [],
          },
          { kind: 'reflection', id: 'les:l', value: { date: '2026-10-28', t: 'A lesson learned' } },
          { kind: 'history', id: 'bt', value: ['2026-10-28'] },
          { kind: 'history', id: 'seen', value: { '2026-10': ['2026-10-28'] } },
          {
            kind: 'preset',
            id: 'routine',
            title: 'Morning routine',
            deck: 'work',
            duration: 0,
            legacy: { opaque: 'keep' },
          },
          {
            kind: 'settings',
            id: 'legacy',
            value: {
              name: 'Captain',
              pf: { h24: 0, rem: 0, unknown: 'keep' },
              order: ['best'],
              unknown: 'keep',
            },
          },
        ],
      },
    });
    db.close();
    localStorage.setItem('slb1', 'legacy-sentinel');
  }, path);
  await page.goto('/?phase=7');
  await expect(page.getByRole('heading', { name: 'Make it yours' })).toBeVisible();
}
async function read(page: Page) {
  return page.evaluate(async (path) => {
    const { openLogbook } = await import(path),
      db = await openLogbook(indexedDB),
      state = await db.load(),
      pending = await db.pending();
    db.close();
    return { state, pending };
  }, path);
}
async function saved(page: Page) {
  await expect(page.locator('main > [role="status"]')).toHaveText('Saved locally');
}
test('preferences/profile persist through restart and configure Calendar; cancellation and typing stay safe', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Edit preferences', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit preferences' });
  await dialog.getByLabel('Open on startup').selectOption('note');
  await dialog.getByLabel('Default block length').selectOption('45');
  await dialog.getByLabel('Week starts on').selectOption('1');
  await dialog.getByLabel('Default Calendar view').selectOption('m');
  await dialog.getByLabel('24-hour time').check();
  await dialog.getByLabel('Sounds', { exact: true }).uncheck();
  await dialog.getByLabel('Haptics', { exact: true }).uncheck();
  await dialog.getByLabel('Remind at').fill('18:30');
  await dialog.getByRole('button', { name: 'Save preferences' }).click();
  await saved(page);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Your name').fill('Sailor N');
  await page.keyboard.press('Control+Enter');
  await saved(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const expected = (await read(page)).state;
  await page.reload();
  await expect(page.locator('#profile')).toContainText('Sailor N');
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Your name').fill('Unsaved name');
  await page.keyboard.press('n');
  await expect(page.getByLabel('Your name')).toHaveValue('Unsaved namen');
  await page.keyboard.press('Escape');
  expect((await read(page)).state).toEqual(expected);
  await page.getByRole('button', { name: 'Open startup screen' }).click();
  await expect(page).toHaveURL(/phase=4/);
  await page.goto('/?phase=3');
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await page.evaluate(() => localStorage.getItem('slb1'))).toBe('legacy-sentinel');
});
test('three-level deck controls, invalid moves, reassignment, record aggregation and persistent Undo', async ({
  page,
}) => {
  await seed(page);
  const before = (await read(page)).state;
  await page.locator('#decks').getByRole('button', { name: 'Edit deck Work', exact: true }).click();
  await page.getByLabel('Parent deck').selectOption('chapter');
  await page.getByRole('button', { name: 'Save deck', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Deck cycle/depth');
  expect((await read(page)).state).toEqual(before);
  await page.getByLabel('Parent deck').selectOption('');
  await page.getByLabel('Deck name', { exact: true }).fill('Renamed Work');
  await page.getByLabel('Exclude from hours streak').check();
  await page.getByLabel('Deck icon').selectOption('book');
  await page.getByRole('button', { name: 'Save deck', exact: true }).click();
  await saved(page);
  await page
    .locator('#decks')
    .getByRole('button', { name: 'Open deck Renamed Work', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Read a book');
  await expect(page.getByRole('dialog')).toContainText('Plan a voyage');
  await page.keyboard.press('Escape');
  await page
    .locator('#decks')
    .getByRole('button', { name: 'Edit deck Renamed Work', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete deck…' }).click();
  await page.getByLabel('Reassign to').selectOption('learning');
  await page.getByRole('button', { name: 'Delete and reassign', exact: true }).click();
  await saved(page);
  let result = await read(page);
  expect(result.state.entities['deck:work']).toBeUndefined();
  expect(result.state.entities['task:plan'].deck).toBe('learning');
  expect(result.state.entities['deck:project'].parent).toBe('learning');
  expect(result.state.entities['activity:log']).toEqual(before.entities['activity:log']);
  await page.reload();
  await page.getByRole('button', { name: 'Recent changes', exact: true }).click();
  // Recovery rows identify every touched relationship; use the newest matching row.
  const row = page
    .getByRole('dialog')
    .locator('div')
    .filter({ has: page.locator('span').filter({ hasText: 'deck:project' }) })
    .last();
  await row.getByRole('button', { name: 'Undo change' }).click();
  result = await read(page);
  expect(result.state.entities['deck:work'].name).toBe('Renamed Work');
  expect(result.state.entities['task:plan'].deck).toBe('work');
});
test('preset management preserves duration-free Calendar behavior and deletion has durable recovery', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Edit preset Morning routine' }).click();
  await page.getByLabel('Preset title').fill('Shower');
  await page.getByLabel('Duration in minutes').fill('0');
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  await saved(page);
  await page.goto('/?phase=3&preset=routine');
  await expect(page.getByLabel('Activity title', { exact: true })).toHaveValue('Shower');
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/?phase=7');
  await page.getByRole('button', { name: 'Edit preset Shower' }).click();
  await page.getByRole('button', { name: 'Delete preset…' }).click();
  await page.getByRole('button', { name: 'Delete preset', exact: true }).click();
  await saved(page);
  expect((await read(page)).state.entities['preset:routine']).toBeUndefined();
  await page.getByRole('button', { name: 'Undo last change' }).click();
  await saved(page);
  expect((await read(page)).state.entities['preset:routine'].duration).toBe(0);
});
test('search works across every accepted screen, follows original-date items and protects drafts', async ({
  page,
}) => {
  await seed(page);
  for (const phase of [7, 3, 4, 5, 6]) {
    await page.goto('/?phase=' + phase);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByLabel('Search logbook').fill('quiet');
    await expect(page.getByRole('link', { name: /A quiet afternoon/ })).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.keyboard.press('Control+k');
  await page.getByLabel('Search logbook').fill('voyage');
  await page.getByRole('link', { name: /Plan a voyage/ }).click();
  await expect(page.getByRole('dialog', { name: 'Edit task', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeDisabled();
  await page.getByLabel('Task title', { exact: true }).fill('Uncommitted');
  await page.keyboard.press('n');
  expect((await read(page)).state.entities['task:plan'].title).toBe('Plan a voyage');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByLabel('Search logbook').fill('lesson');
  await page.getByRole('link', { name: /A lesson learned/ }).click();
  await expect(page.getByRole('heading', { name: 'Reflection', exact: true })).toBeVisible();
});
test('safe keyboard practice ends in full reference; actual commands create, focus, duplicate and delete reversibly', async ({
  page,
}) => {
  await seed(page);
  await page.goto('/?phase=7&tool=shortcuts');
  await page.getByRole('button', { name: 'Try keyboard practice' }).click();
  const before = (await read(page)).state;
  for (const key of ['n', 'Shift+a', 'Control+k', 'Escape']) await page.keyboard.press(key);
  await expect(page.getByRole('dialog', { name: 'Keyboard practice' })).toContainText(
    'Your full shortcut reference',
  );
  await expect(page.getByRole('dialog')).toContainText('Ctrl/Cmd D');
  expect((await read(page)).state).toEqual(before);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await read(page)).state.entities['settings:preferences'].value.shortcutTour).toBe(1);
  await page.keyboard.press('t');
  await expect(page).toHaveURL(/phase=6/);
  await expect(page.getByRole('dialog', { name: 'Add task', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('j');
  await page.keyboard.press('Control+d');
  await expect
    .poll(
      async () =>
        Object.values((await read(page)).state.entities).filter((e: any) => e.kind === 'task')
          .length,
    )
    .toBe(2);
  await page.keyboard.press('Delete');
  await page.getByRole('button', { name: 'Delete item', exact: true }).click();
  await expect
    .poll(
      async () =>
        Object.values((await read(page)).state.entities).filter((e: any) => e.kind === 'task')
          .length,
    )
    .toBe(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(
      async () =>
        Object.values((await read(page)).state.entities).filter((e: any) => e.kind === 'task')
          .length,
    )
    .toBe(2);
});
test('save failure keeps profile draft, retry commits once; shared editor lock and honest platform copy', async ({
  page,
  context,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Your name').fill('Retry captain');
  await page.evaluate(() => {
    const proto = IDBObjectStore.prototype,
      add = proto.add;
    proto.add = function (...args: any[]) {
      if (this.name === 'tail') {
        proto.add = add;
        throw new DOMException('Synthetic quota', 'QuotaExceededError');
      }
      return add.apply(this, args as [any, any]);
    };
  });
  const count = (await read(page)).pending.length;
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('alert')).toContainText('Unsaved');
  await expect(page.getByLabel('Your name')).toHaveValue('Retry captain');
  expect((await read(page)).pending.length).toBe(count);
  await page.getByRole('button', { name: 'Save profile' }).click();
  await saved(page);
  expect((await read(page)).pending.length).toBe(count + 1);
  const second = await context.newPage();
  await second.goto('/?phase=3');
  await expect(second.getByRole('status')).toContainText('Another logbook editor is active');
  await second.close();
  await expect(page.locator('#capabilities')).toContainText(
    'Unencrypted Dropbox content can be read by Dropbox',
  );
  await expect(page.locator('#capabilities')).toContainText('Browser unlock is session-only');
  await expect(page.locator('#reminders')).toContainText('Closed-app scheduling is unavailable');
  await page.getByRole('button', { name: 'Test reminder', exact: true }).click();
  await expect(page.locator('main > [role="status"]')).toContainText('How was your day?');
});
test('mobile settings have no overflow; onboarding cancels without writes and walkthrough completes without automatic replay', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?phase=7');
  await expect(page.getByRole('dialog', { name: 'Welcome to Sailor Logbook' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel setup' }).click();
  expect(Object.keys((await read(page)).state.entities)).toHaveLength(0);
  await page.getByRole('button', { name: 'Review onboarding' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('New sailor');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Often', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Remind me if I have not logged today').uncheck();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Set sail', exact: true }).click();
  for (let i = 0; i < 12; i++) {
    await expect(page.getByRole('dialog', { name: 'Logbook walkthrough' })).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Logbook walkthrough' })
      .getByRole('button', { name: 'Next', exact: true })
      .click();
  }
  await page.getByRole('button', { name: 'Start my logbook', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/?phase=7');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await read(page)).state.entities['settings:legacy'].value.name).toBe('New sailor');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'build/settings-mobile-' + test.info().project.name + '.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: 'build/settings-desktop-' + test.info().project.name + '.png',
    fullPage: true,
  });
});
test('automatic reminder is recorded once, skips logged days and never claims closed-app delivery', async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(async (path) => {
    const { openLogbook } = await import(path),
      db = await openLogbook(indexedDB);
    await db.commit({
      id: 'reminder-prefs',
      at: 2,
      edit: {
        type: 'putMany',
        entities: [
          { kind: 'settings', id: 'preferences', value: { rem: 1, rt: '10:01', snd: 0, hap: 0 } },
        ],
      },
    });
    db.close();
  }, path);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Make it yours' })).toBeVisible();
  await page.clock.runFor(90000);
  expect((await read(page)).state.entities['history:reminder']).toBeUndefined();
  await page.evaluate(async (path) => {
    const { openLogbook } = await import(path),
      db = await openLogbook(indexedDB);
    await db.commit({ id: 'remove-log', at: 3, edit: { type: 'delete', keys: ['activity:log'] } });
    db.close();
  }, path);
  await page.clock.setSystemTime(new Date('2026-10-28T10:01:00'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Make it yours' })).toBeVisible();
  await page.clock.runFor(30000);
  await expect(
    page.getByText('How was your day? Log the little things.', { exact: true }),
  ).toBeVisible();
  const pending = (await read(page)).pending.length;
  await page.clock.runFor(30000);
  expect((await read(page)).pending.length).toBe(pending);
});
test('profile media saves verified bytes or retains drafts when native Blob storage is unavailable', async ({
  page,
}) => {
  await seed(page);
  const before = await read(page);
  const blobStorage = await page.evaluate(async () => {
    const opening = indexedDB.open('profile-blob-capability', 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore('data');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('data', 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
        tx.objectStore('data').put(new Blob(['test'], { type: 'image/png' }), 'test');
      });
      return true;
    } catch {
      return false;
    } finally {
      db.close();
    }
  });
  const bytes = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      canvas.getContext('2d')!.fillRect(0, 0, 1, 1);
      return canvas.toDataURL('image/png').split(',')[1]!;
    }),
    'base64',
  );
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page
    .getByLabel('Profile photo', { exact: true })
    .setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: bytes });
  await expect(page.getByLabel('Keep original')).not.toBeChecked();
  await page.getByRole('button', { name: 'Save profile' }).click();
  if (!blobStorage) {
    await expect(page.locator('main > [role="status"]')).toContainText(
      'Unsaved · Photo storage failed in this browser',
    );
    await expect(page.getByRole('dialog', { name: 'Edit profile', exact: true })).toBeVisible();
    await expect(page.getByLabel('Your name')).toHaveValue('Captain');
    expect(
      await page
        .getByLabel('Profile photo', { exact: true })
        .evaluate((i: HTMLInputElement) => i.files?.[0]?.name),
    ).toBe('profile.png');
    const after = await read(page);
    expect(after.state).toEqual(before.state);
    expect(after.pending).toHaveLength(before.pending.length);
    return;
  }
  await saved(page);
  const webpDigest = (await read(page)).state.entities['settings:legacy'].value.avatarDigest;
  expect(
    await page.evaluate(
      async ({ path, digest }) => {
        const { openLogbook } = await import(path),
          db = await openLogbook(indexedDB);
        const b = await db.attachment(digest);
        db.close();
        return b.blob.type;
      },
      { path, digest: webpDigest },
    ),
  ).toBe('image/webp');
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page
    .getByLabel('Profile photo', { exact: true })
    .setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: bytes });
  await page.getByLabel('Keep original').check();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await saved(page);
  const digest = (await read(page)).state.entities['settings:legacy'].value.avatarDigest;
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
  await page.reload();
  await expect(page.locator('#profile img')).toHaveJSProperty('naturalWidth', 1);
  const stored = await page.evaluate(
    async ({ path, digest }) => {
      const { openLogbook } = await import(path),
        db = await openLogbook(indexedDB),
        b = await db.attachment(digest);
      db.close();
      return Array.from(new Uint8Array(await b.blob.arrayBuffer()));
    },
    { path, digest },
  );
  expect(stored).toEqual([...bytes]);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Remove current picture').check();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await saved(page);
  await page.getByRole('button', { name: 'Undo last change' }).click();
  await saved(page);
  expect((await read(page)).state.entities['settings:legacy'].value.avatarDigest).toBe(digest);
});

test('modal focus and Escape return, storage denial and unavailable notification permission stay honest', async ({
  page,
}) => {
  await seed(page);
  const trigger = page.getByRole('button', { name: 'Edit preferences', exact: true });
  await trigger.click();
  const modal = page.getByRole('dialog', { name: 'Edit preferences' });
  const last = modal.getByRole('button', { name: 'Save preferences' });
  await last.focus();
  await page.keyboard.press('Tab');
  expect(await modal.evaluate((e) => e.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  expect(await modal.evaluate((e) => e.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.evaluate(() => {
    Object.defineProperty(navigator.storage, 'persist', {
      configurable: true,
      value: async () => false,
    });
    Object.defineProperty(navigator.storage, 'persisted', {
      configurable: true,
      value: async () => false,
    });
    Object.defineProperty(navigator.storage, 'estimate', {
      configurable: true,
      value: async () => ({ usage: 1048576, quota: 8388608 }),
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: class {
        static permission = 'denied';
        static requestPermission = async () => 'denied';
      },
    });
  });
  await page.getByRole('button', { name: 'Request persistent storage' }).click();
  await expect(page.locator('#storage')).toContainText(
    'Standard browser storage; persistence not granted',
  );
  await page.getByRole('button', { name: 'Enable system notifications' }).click();
  await expect(page.locator('#reminders')).toContainText('System notification permission: denied');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByLabel('Search logbook').fill('Chapter');
  await expect(page.getByRole('link', { name: /Work \/ Project \/ Chapter/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Search settings').fill('Morning routine');
  await expect(page.locator('#presets')).toBeVisible();
});

test('Planner uses the saved time format without rewriting native time input values', async ({
  page,
}) => {
  await seed(page);
  await page.goto('/?phase=6&item=plan');
  await page.getByLabel('Time (optional)').fill('13:15');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(page.locator('[data-task="plan"]')).toContainText('1:15 PM');
  await page.goto('/?phase=7');
  await page.getByRole('button', { name: 'Edit preferences', exact: true }).click();
  await page.getByLabel('24-hour time').check();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await saved(page);
  await page.goto('/?phase=6&item=plan');
  await expect(page.getByLabel('Time (optional)')).toHaveValue('13:15');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-task="plan"]')).toContainText('13:15');
});

test('explicit create/help/walkthrough routes do not stack first-run onboarding on an empty store', async ({
  page,
}) => {
  await page.goto('/?phase=7&new=deck');
  await expect(page.getByRole('dialog', { name: 'Add deck', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  expect(Object.keys((await read(page)).state.entities)).toHaveLength(0);
  await page.goto('/?phase=7&tool=shortcuts');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.goto('/?phase=7&tour=5');
  const guide = page.getByRole('dialog', { name: 'Logbook walkthrough' });
  await expect(guide).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide).toContainText('Make the familiar easy');
});

test('photo preview decodes bounded raster pixels without file URLs and rejects markup while retaining drafts', async ({
  page,
}) => {
  await seed(page);
  const before = await read(page);
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 8;
      canvas.getContext('2d')!.fillRect(0, 0, 8, 8);
      (window as any).filePreviewUrls = 0;
      URL.createObjectURL = () => {
        (window as any).filePreviewUrls++;
        throw Error('File preview must not render URLs');
      };
      return canvas.toDataURL('image/png').split(',')[1]!;
    }),
    'base64',
  );
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Your name').fill('Retained captain');
  const upload = page.getByLabel('Profile photo', { exact: true });
  await upload.setInputFiles({ name: 'safe.png', mimeType: 'image/png', buffer: png });
  const preview = page.getByRole('img', { name: 'Selected photo preview' });
  await expect(preview).toHaveJSProperty('tagName', 'CANVAS');
  await expect
    .poll(() =>
      preview.evaluate(
        (c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, 1, 1).data[3],
      ),
    )
    .toBe(255);
  await upload.setInputFiles({
    name: 'unsafe.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="window.previewMarkupExecuted=true"><script>window.previewMarkupExecuted=true</script></svg>',
    ),
  });
  await expect(page.getByRole('alert')).toContainText('Photo preview unavailable');
  await expect(preview).toHaveCount(0);
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText(/Unsaved · Unsupported or oversized photo/).first()).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveValue('Retained captain');
  expect(await page.evaluate(() => (window as any).previewMarkupExecuted)).toBeUndefined();
  expect(await page.evaluate(() => (window as any).filePreviewUrls)).toBe(0);
  expect((await read(page)).state).toEqual(before.state);
  expect(await upload.evaluate((input: HTMLInputElement) => input.files?.[0]?.name)).toBe(
    'unsafe.svg',
  );
});
