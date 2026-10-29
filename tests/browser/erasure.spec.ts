import { expect, test } from '@playwright/test';
const modulePath =
  '/@fs/' + process.cwd().replaceAll('\\', '/') + '/packages/persistence/src/logbook.ts';
async function seed(page: any) {
  await page.goto('/?phase=9&tool=help');
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toBeVisible();
  await page.evaluate(async (path: string) => {
    const { openLogbook } = await import(path),
      db = await openLogbook(indexedDB);
    await db.commit({
      id: 'owner',
      at: 1,
      edit: {
        type: 'put',
        entity: { kind: 'history', id: 'owner', value: 'synthetic retained journal' },
      },
    });
    await db.recovery('manual', 'before erasure fixture');
    db.close();
    localStorage.setItem('slb1', 'separate demo retained');
  }, modulePath);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Permanent data erasure' })).toBeVisible();
}
async function state(page: any) {
  return page.evaluate(async (path: string) => {
    const { openLogbook } = await import(path),
      db = await openLogbook(indexedDB);
    const result = {
      state: await db.load(),
      policy: await db.keyPolicy(),
      job: await db.erasureStatus(),
      points: await db.recoveryPoints(),
      demo: localStorage.getItem('slb1'),
    };
    db.close();
    return result;
  }, modulePath);
}
async function connect(page: any) {
  await page.goto('/?phase=9&tool=help');
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toBeVisible();
  await page.evaluate(() =>
    sessionStorage.setItem(
      'slb-dropbox-pkce',
      JSON.stringify({
        verifier: 'synthetic',
        state: 'synthetic-state',
        clientId: 'syntheticapp',
        redirect: location.origin + '/?phase=9&tool=help',
        at: Date.now(),
      }),
    ),
  );
  await page.goto('/?phase=9&tool=help&code=synthetic&state=synthetic-state');
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toContainText(
    'Connected · preview required',
  );
}
async function mockCloud(page: any) {
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  let raw: string | null = null,
    revision = 0,
    fail = false;
  const files = new Map([
    ['/sailors-logbook.json', 'legacy-1'],
    ['/sailor-logbook/v2/backups/11111111-1111-4111-8111-111111111111.json', 'backup-1'],
    ['/unrelated.txt', 'keep'],
  ]);
  await page.route('https://api.dropboxapi.com/oauth2/token', (r: any) =>
    r.fulfill({ json: { access_token: 'synthetic-token', expires_in: 3600 } }),
  );
  await page.route('https://api.dropboxapi.com/2/files/get_metadata', (r: any) =>
    r.fulfill(
      files.has('/sailors-logbook.json')
        ? { json: { rev: files.get('/sailors-logbook.json') } }
        : { status: 409, json: { error: { '.tag': 'path', path: { '.tag': 'not_found' } } } },
    ),
  );
  await page.route('https://api.dropboxapi.com/2/files/list_folder', (r: any) =>
    r.fulfill({
      json: {
        entries: [...files]
          .map(([path_lower, rev]) => ({ '.tag': 'file', path_lower, rev }))
          .concat(
            raw
              ? [
                  {
                    '.tag': 'file',
                    path_lower: '/sailor-logbook/v2/logbook.json',
                    rev: String(revision),
                  },
                ]
              : [],
          ),
        has_more: false,
        cursor: 'done',
      },
    }),
  );
  await page.route('https://api.dropboxapi.com/2/files/delete_v2', (r: any) => {
    if (fail) return r.fulfill({ status: 503, body: 'synthetic failure' });
    const body = r.request().postDataJSON();
    if (files.get(body.path) !== body.parent_rev)
      return r.fulfill({ status: 409, body: 'conflict' });
    files.delete(body.path);
    return r.fulfill({ json: { metadata: { '.tag': 'file', path_lower: body.path } } });
  });
  await page.route('https://content.dropboxapi.com/2/files/**', (r: any) => {
    if (r.request().url().endsWith('/download'))
      return raw === null
        ? r.fulfill({
            status: 409,
            json: { error: { '.tag': 'path', path: { '.tag': 'not_found' } } },
          })
        : r.fulfill({
            body: raw,
            headers: {
              'Dropbox-API-Result': JSON.stringify({ rev: String(revision) }),
              'Access-Control-Expose-Headers': 'Dropbox-API-Result',
            },
          });
    const arg = JSON.parse(r.request().headers()['dropbox-api-arg']),
      expected = arg.mode['.tag'] === 'add' ? null : arg.mode.update;
    if (expected !== (raw === null ? null : String(revision)))
      return r.fulfill({ status: 409, body: 'conflict' });
    raw = r.request().postData();
    revision++;
    return r.fulfill({ json: { rev: String(revision) } });
  });
  return { errors, files, get: () => raw, fail: (value: boolean) => (fail = value) };
}

test('local erasure guards drafts, cancels without mutation, clears retained state and starts only a new local session', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Your name').fill('unsaved draft');
  await expect(page.getByRole('button', { name: 'Erase local data', exact: true })).toBeDisabled();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Erase local data', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Erase local data preview' })).toContainText(
    'Current records: 1',
  );
  await page.getByRole('button', { name: 'Cancel deletion preview' }).click();
  expect((await state(page)).state.entities['history:owner']).toBeTruthy();
  expect((await state(page)).job).toBeUndefined();
  await page.getByRole('button', { name: 'Erase local data', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm permanent erasure' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I understand this is permanent/ }).check();
  await page.getByLabel('Type ERASE LOCAL to confirm').fill('ERASE LOCAL');
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.getByRole('button', { name: 'Confirm permanent erasure' }).click(),
  ]);
  await expect(page.getByRole('region', { name: 'Erasure result' })).toContainText(
    'Local content erased',
  );
  const erased = await state(page);
  expect(Object.keys(erased.state.entities)).toHaveLength(0);
  expect(erased.points).toHaveLength(0);
  expect(erased.policy).toBeUndefined();
  expect(erased.demo).toBe('separate demo retained');
  await page.getByRole('button', { name: 'Start a new local logbook' }).click();
  await expect(page.getByRole('button', { name: 'Edit profile', exact: true })).toBeEnabled();
  expect((await state(page)).job).toBeUndefined();
});

test('cloud deletion reports partial failure, stays paused across reload and verifies completion before local clearing', async ({
  page,
}) => {
  const cloud = await mockCloud(page);
  await seed(page);
  await connect(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Delete logbook everywhere', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Delete logbook everywhere preview' });
  await expect(modal).toContainText('/sailors-logbook.json');
  await expect(modal).not.toContainText('/unrelated.txt');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('checkbox', { name: /I understand this is permanent/ }).check();
  await page.getByLabel('Type DELETE EVERYWHERE to confirm').fill('DELETE EVERYWHERE');
  await expect(page.getByRole('button', { name: 'Confirm permanent erasure' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I stopped legacy writers/ }).check();
  cloud.fail(true);
  await page.getByRole('button', { name: 'Confirm permanent erasure' }).click();
  await expect(modal).toContainText('Deletion not complete');
  expect((await state(page)).state.entities['history:owner']).toBeTruthy();
  expect(JSON.parse(cloud.get()!).format).toBe('slb-erased');
  await page.getByRole('button', { name: 'Cancel deletion preview' }).click();
  await expect(page.getByRole('button', { name: 'Edit profile', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Permanent data erasure' })).toContainText(
    'Deletion pending',
  );
  await expect(page.getByRole('button', { name: 'Resume reviewed deletion' })).toBeDisabled();
  await connect(page);
  cloud.fail(false);
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.getByRole('button', { name: 'Resume reviewed deletion' }).click(),
  ]);
  await expect(page.getByRole('region', { name: 'Erasure result' })).toContainText(
    'Reviewed deletion verified',
  );
  expect((await state(page)).state.entities).toEqual({});
  expect(cloud.files.size).toBe(1);
  expect(cloud.files.has('/unrelated.txt')).toBeTruthy();
  await expect(page.getByRole('region', { name: 'Erasure result' })).toContainText(
    'content-free cloud deletion barrier remains',
  );
  expect(cloud.errors).toEqual([]);
});

test('opening local erasure aborts an outstanding sync check before preparing its preview', async ({
  page,
}) => {
  await mockCloud(page);
  await seed(page);
  await connect(page);
  await page.evaluate(() => {
    const original = globalThis.fetch;
    (window as any).heldDownload = false;
    (window as any).downloadAborted = false;
    globalThis.fetch = (url, init) => {
      if (String(url).includes('/files/download')) {
        (window as any).heldDownload = true;
        return new Promise((_resolve, reject) =>
          init!.signal!.addEventListener(
            'abort',
            () => {
              (window as any).downloadAborted = true;
              reject(new DOMException('synthetic aborted request', 'AbortError'));
            },
            { once: true },
          ),
        );
      }
      return original(url, init);
    };
  });
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).heldDownload)).toBeTruthy();
  await page.getByRole('button', { name: 'Erase local data', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Erase local data preview' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).downloadAborted)).toBeTruthy();
  await page.getByRole('button', { name: 'Cancel deletion preview' }).click();
  expect((await state(page)).job).toBeUndefined();
});
