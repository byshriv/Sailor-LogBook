import { expect, test } from '@playwright/test';
const modulePath =
  '/@fs/' + process.cwd().replaceAll('\\', '/') + '/packages/persistence/src/logbook.ts';
async function connect(page: any) {
  await page.goto('/?phase=9&tool=help');
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toBeVisible();
  await page.evaluate(() =>
    sessionStorage.setItem(
      'slb-dropbox-pkce',
      JSON.stringify({
        verifier: 'synthetic-verifier',
        state: 'synthetic-state',
        at: Date.now(),
        clientId: 'syntheticapp',
        redirect: location.origin + '/?phase=9&tool=help',
      }),
    ),
  );
  await page.goto('/?phase=9&tool=help&code=synthetic-code&state=synthetic-state#sync');
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toContainText(
    'Connected · preview required',
  );
}
async function mocked(page: any, initial: string | null = null) {
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  let raw: string | null = initial,
    revision = initial ? 1 : 0,
    rejectRead = false,
    failure = 503,
    reads = 0;
  await page.route('https://api.dropboxapi.com/oauth2/token', (route: any) =>
    route.fulfill({ json: { access_token: 'synthetic-token', expires_in: 3600 } }),
  );
  await page.route('https://api.dropboxapi.com/2/files/get_metadata', (route: any) =>
    route.fulfill({
      status: 409,
      json: { error: { '.tag': 'path', path: { '.tag': 'not_found' } } },
    }),
  );
  await page.route('https://content.dropboxapi.com/2/files/**', async (route: any) => {
    if (route.request().url().endsWith('/download')) {
      reads++;
      if (rejectRead) return route.fulfill({ status: failure, body: 'unavailable' });
      return raw === null
        ? route.fulfill({
            status: 409,
            json: { error: { '.tag': 'path', path: { '.tag': 'not_found' } } },
          })
        : route.fulfill({
            body: raw,
            headers: {
              'Dropbox-API-Result': JSON.stringify({ rev: String(revision) }),
              'Access-Control-Expose-Headers': 'Dropbox-API-Result',
            },
          });
    }
    const arg = JSON.parse(route.request().headers()['dropbox-api-arg']);
    const expected = arg.mode['.tag'] === 'add' ? null : arg.mode.update;
    if (expected !== (raw === null ? null : String(revision)))
      return route.fulfill({ status: 409, body: 'conflict' });
    raw = route.request().postData();
    revision++;
    return route.fulfill({ json: { rev: String(revision) } });
  });
  return {
    errors,
    read: () => raw,
    reads: () => reads,
    fail: (status: number) => {
      rejectRead = true;
      failure = status;
    },
    offline: (value: boolean) => {
      rejectRead = value;
    },
  };
}
test('plain-first Dropbox preview, cancel, verified sync, offline failure and draft protection', async ({
  page,
}) => {
  const cloud = await mocked(page);
  await connect(page);
  const region = page.getByRole('region', { name: 'Dropbox synchronization' });
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await expect(page.getByRole('dialog', { name: 'Dropbox sync preview' })).toContainText(
    'First-device join',
  );
  expect(cloud.read()).toBeNull();
  await page.getByRole('button', { name: 'Cancel preview' }).click();
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await page.getByRole('button', { name: 'Apply reviewed sync' }).click();
  await expect(region).toContainText('Synced · Dropbox revision read back');
  expect(JSON.parse(cloud.read()!).mode).toBe('plain');
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview Dropbox sync' })).toBeDisabled();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  cloud.offline(true);
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await expect(region).toContainText('Not synced');
  expect(cloud.errors).toEqual([]);
});
test('guided recovery verifies saved secret, encrypted upload and backup preview, lock and reload', async ({
  page,
}) => {
  const cloud = await mocked(page);
  await connect(page);
  await page.getByRole('button', { name: 'Set up optional encryption' }).click();
  await page.getByLabel('New encryption passphrase').fill('synthetic long passphrase');
  await page.getByRole('button', { name: 'Create recovery kit' }).click();
  const code = await page.getByLabel('Printable recovery code').inputValue();
  await page.getByLabel('I saved the file or printed the code privately').check();
  await page.getByLabel('Re-enter saved recovery code').fill('incorrect');
  await page.getByRole('button', { name: 'Verify recovery and use key' }).click();
  await expect(page.getByRole('dialog', { name: 'Protect cloud content' })).toBeVisible();
  await page.getByLabel('Re-enter saved recovery code').fill(code);
  await page.getByRole('button', { name: 'Verify recovery and use key' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await page.getByRole('button', { name: 'Apply reviewed sync' }).click();
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toContainText(
    'Synced · Dropbox revision read back',
  );
  expect(JSON.parse(cloud.read()!).mode).toBe('encrypted');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const path = await (await download).path();
  await expect(page.getByLabel('Verify encrypted backup')).toBeEnabled();
  await page.getByLabel('Verify encrypted backup').setInputFiles(path!);
  await expect(page.getByRole('dialog', { name: 'Import preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel import' }).click();
  await page.getByRole('button', { name: 'Lock logbook', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download encrypted backup' })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unlock configured key' })).toBeVisible();
  // A saved backup carries its own wrappers and unlocks without connecting Dropbox.
  await page.getByLabel('Verify encrypted backup').setInputFiles(path!);
  await page.getByLabel('Use recovery code/file text').check();
  await page.getByLabel('Recovery code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Unlock for this tab' }).click();
  await expect(page.getByRole('dialog', { name: 'Import preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel import' }).click();
  await page.getByRole('button', { name: 'Unlock configured key' }).click();
  await page.getByLabel('Use recovery code/file text').check();
  await page.getByLabel('Recovery code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Unlock for this tab' }).click();
  await expect(page.getByRole('button', { name: 'Download encrypted backup' })).toBeVisible();
  expect(cloud.errors).toEqual([]);
});
test('browser first join retains nonempty copies and conflict alternatives', async ({ page }) => {
  const cloud = await mocked(page);
  await connect(page);
  await page.evaluate(async (path: string) => {
    const { openLogbook } = await import(path),
      d = await openLogbook(indexedDB);
    await d.commit({
      id: 'seed-sync',
      at: 1,
      edit: { type: 'put', entity: { kind: 'history', id: 'kept', value: 'private kept text' } },
    });
    d.close();
  }, modulePath);
  // Reload projection while preserving the cloud mock; callback reconnects with a fresh token.
  await connect(page);
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await expect(page.getByRole('dialog')).toContainText('Local: 1');
  await page.getByRole('button', { name: 'Apply reviewed sync' }).click();
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toContainText(
    'Synced ·',
  );
  expect(cloud.read()).toContain('private kept text');
  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download plaintext backup' }).click();
  const backupPath = await (await backupDownload).path();
  await page.getByRole('button', { name: 'Review device join' }).click();
  await page.getByLabel('Verified backup for join reset').setInputFiles(backupPath!);
  await page.getByLabel('Type JOIN to reset device continuity').fill('JOIN');
  await page.getByRole('button', { name: 'Reset device continuity' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.evaluate(async (path: string) => {
    const { openLogbook } = await import(path),
      d = await openLogbook(indexedDB);
    await d.commit({
      id: 'conflicting-local',
      at: 2,
      edit: { type: 'put', entity: { kind: 'history', id: 'kept', value: 'local alternative' } },
    });
    d.close();
  }, modulePath);
  await connect(page);
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await expect(page.getByRole('button', { name: 'Apply reviewed sync' })).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('private kept text');
  await expect(page.getByRole('dialog')).toContainText('local alternative');
  await page.getByLabel('Resolution for history:kept').selectOption('cloud');
  await page.getByRole('button', { name: 'Apply reviewed sync' }).click();
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toContainText(
    'Synced ·',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(cloud.errors).toEqual([]);
});
test('fresh browser unlocks an encrypted cloud and joins without encryption downgrade', async ({
  page,
  browser,
}) => {
  const cloud = await mocked(page);
  await connect(page);
  await page.getByRole('button', { name: 'Set up optional encryption' }).click();
  await page.getByLabel('New encryption passphrase').fill('synthetic cross device phrase');
  await page.getByRole('button', { name: 'Create recovery kit' }).click();
  const code = await page.getByLabel('Printable recovery code').inputValue();
  await page.getByLabel('I saved the file or printed the code privately').check();
  await page.getByLabel('Re-enter saved recovery code').fill(code);
  await page.getByRole('button', { name: 'Verify recovery and use key' }).click();
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await page.getByRole('button', { name: 'Apply reviewed sync' }).click();
  await expect(page.getByRole('region', { name: 'Dropbox synchronization' })).toContainText(
    'Synced ·',
  );
  const context = await browser.newContext(),
    second = await context.newPage();
  try {
    const secondCloud = await mocked(second, cloud.read());
    await connect(second);
    await second.getByRole('button', { name: 'Preview Dropbox sync' }).click();
    await expect(second.getByRole('dialog', { name: 'Unlock encrypted Dropbox' })).toBeVisible();
    await second
      .getByLabel('Encryption passphrase', { exact: true })
      .fill('synthetic cross device phrase');
    await second.getByRole('button', { name: 'Unlock for this tab' }).click();
    await second.getByRole('button', { name: 'Preview Dropbox sync' }).click();
    await second.getByRole('button', { name: 'Apply reviewed sync' }).click();
    await expect(second.getByRole('region', { name: 'Dropbox synchronization' })).toContainText(
      'Synced ·',
    );
    expect(JSON.parse(secondCloud.read()!).mode).toBe('encrypted');
    expect(secondCloud.errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('credential change authenticates current key, verifies replacement kit and commits only after review', async ({
  page,
}) => {
  const cloud = await mocked(page);
  await connect(page);
  const region = page.getByRole('region', { name: 'Dropbox synchronization' });
  await page.getByRole('button', { name: 'Set up optional encryption' }).click();
  await page.getByLabel('New encryption passphrase').fill('synthetic original passphrase');
  await page.getByRole('button', { name: 'Create recovery kit' }).click();
  const originalCode = await page.getByLabel('Printable recovery code').inputValue();
  await page.getByLabel('I saved the file or printed the code privately').check();
  await page.getByLabel('Re-enter saved recovery code').fill(originalCode);
  await page.getByRole('button', { name: 'Verify recovery and use key' }).click();
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await page.getByRole('button', { name: 'Apply reviewed sync' }).click();
  await expect(region).toContainText('Synced ·');
  const before = JSON.parse(cloud.read()!);
  await page.getByRole('button', { name: 'Change passphrase and recovery kit' }).click();
  await expect(page.getByRole('dialog')).toContainText('does not revoke a lost device');
  await page.getByLabel('Current passphrase or recovery code').fill('incorrect');
  await page.getByLabel('New encryption passphrase').fill('synthetic replacement passphrase');
  await page.getByLabel('Confirm new passphrase').fill('synthetic replacement passphrase');
  await page.getByRole('button', { name: 'Create recovery kit' }).click();
  await expect(page.getByRole('dialog')).toContainText('Not synced');
  expect(JSON.parse(cloud.read()!).setup).toEqual(before.setup);
  await page
    .getByLabel('Current passphrase or recovery code')
    .fill('synthetic original passphrase');
  await page.getByRole('button', { name: 'Create recovery kit' }).click();
  const replacementCode = await page.getByLabel('Printable recovery code').inputValue();
  expect(replacementCode).not.toBe(originalCode);
  await page.getByLabel('I saved the file or printed the code privately').check();
  await page.getByLabel('Re-enter saved recovery code').fill(originalCode);
  await page.getByRole('button', { name: 'Verify recovery and use key' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(JSON.parse(cloud.read()!).setup).toEqual(before.setup);
  await page.getByLabel('Re-enter saved recovery code').fill(replacementCode);
  await page.getByRole('button', { name: 'Verify recovery and use key' }).click();
  await expect(region).toContainText('Credential change verified on Dropbox');
  const after = JSON.parse(cloud.read()!);
  expect(after.generation).toBe(before.generation);
  expect(after.setup.id).toBe(before.setup.id);
  expect(after.setup.salt).not.toBe(before.setup.salt);
  await page.getByRole('button', { name: 'Lock logbook', exact: true }).click();
  await page.getByRole('button', { name: 'Unlock configured key' }).click();
  await page
    .getByLabel('Encryption passphrase', { exact: true })
    .fill('synthetic original passphrase');
  await page.getByRole('button', { name: 'Unlock for this tab' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByLabel('Encryption passphrase', { exact: true })
    .fill('synthetic replacement passphrase');
  await page.getByRole('button', { name: 'Unlock for this tab' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(cloud.errors).toEqual([]);
});

test('lost-device key replacement verifies backup and new kit while old backups keep their own unlock route', async ({
  page,
}) => {
  const cloud = await mocked(page);
  await connect(page);
  const region = page.getByRole('region', { name: 'Dropbox synchronization' });
  await page.getByRole('button', { name: 'Set up optional encryption' }).click();
  await page.getByLabel('New encryption passphrase').fill('synthetic original passphrase');
  await page.getByRole('button', { name: 'Create recovery kit' }).click();
  const oldCode = await page.getByLabel('Printable recovery code').inputValue();
  await page.getByLabel('I saved the file or printed the code privately').check();
  await page.getByLabel('Re-enter saved recovery code').fill(oldCode);
  await page.getByRole('button', { name: 'Verify recovery and use key' }).click();
  await page.getByRole('button', { name: 'Preview Dropbox sync' }).click();
  await page.getByRole('button', { name: 'Apply reviewed sync' }).click();
  await expect(region).toContainText('Synced ·');
  const previous = JSON.parse(cloud.read()!);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const backupPath = await (await download).path();
  await page.getByRole('button', { name: 'Replace content key / lost device' }).click();
  const dialog = page.getByRole('dialog', { name: 'Protect cloud content' });
  await expect(dialog).toContainText("This app cannot identify or revoke another device's token");
  await expect(
    dialog.getByRole('link', { name: 'secure devices, web sessions and connected apps' }),
  ).toHaveAttribute('href', 'https://help.dropbox.com/security/unknown-device-linked');
  await page
    .getByLabel('Current passphrase or recovery code')
    .fill('synthetic original passphrase');
  await page
    .getByLabel('New encryption passphrase')
    .fill('synthetic independent content passphrase');
  await page.getByLabel('Confirm new passphrase').fill('synthetic independent content passphrase');
  await expect(page.getByRole('button', { name: 'Create recovery kit' })).toBeDisabled();
  await page
    .getByLabel('Verify current external backup for key replacement')
    .setInputFiles(backupPath!);
  await expect(dialog).toContainText('Current external backup verified');
  await page.getByLabel('I reviewed untrusted Dropbox access and reconnected if needed').check();
  await page.getByLabel('Type ROTATE to replace the content key').fill('ROTATE');
  await page.getByRole('button', { name: 'Create recovery kit' }).click();
  const nextCode = await page.getByLabel('Printable recovery code').inputValue();
  expect(nextCode).not.toBe(oldCode);
  await page.getByLabel('I saved the file or printed the code privately').check();
  await page.getByLabel('Re-enter saved recovery code').fill(nextCode);
  expect(JSON.parse(cloud.read()!).generation).toBe(previous.generation);
  await page.getByRole('button', { name: 'Verify recovery and use key' }).click();
  await expect(region).toContainText('Content key replaced · cloud generation verified');
  const next = JSON.parse(cloud.read()!);
  expect(next.generation).not.toBe(previous.generation);
  expect(next.setup.id).not.toBe(previous.setup.id);
  await page.reload();
  await expect(page.getByLabel('Verify encrypted backup')).toBeEnabled();
  await page.getByLabel('Verify encrypted backup').setInputFiles(backupPath!);
  await page.getByLabel('Use recovery code/file text').check();
  await page.getByLabel('Recovery code', { exact: true }).fill(oldCode);
  await page.getByRole('button', { name: 'Unlock for this tab' }).click();
  await expect(page.getByRole('dialog', { name: 'Import preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel import' }).click();
  await page.getByRole('button', { name: 'Unlock configured key' }).click();
  await page.getByLabel('Recovery code', { exact: true }).fill(oldCode);
  await page.getByRole('button', { name: 'Unlock for this tab' }).click();
  await expect(page.getByRole('dialog', { name: 'Unlock encrypted Dropbox' })).toBeVisible();
  await page.getByLabel('Recovery code', { exact: true }).fill(nextCode);
  await page.getByRole('button', { name: 'Unlock for this tab' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(cloud.errors).toEqual([]);
});

test('scheduled checks wait for drafts, react only after durable saves and never upload without review', async ({
  page,
}) => {
  const cloud = await mocked(page);
  await connect(page);
  await page.clock.install();
  const checks = page.getByLabel(
    'Check on return, after saved edits and every minute here; changes require review',
  );
  await checks.check();
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Your name').fill('Unsaved scheduled draft');
  await page.clock.runFor(10000);
  expect(cloud.reads()).toBe(0);
  expect(cloud.read()).toBeNull();
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.clock.runFor(3000);
  await expect(page.getByRole('dialog', { name: 'Dropbox sync preview' })).toBeVisible();
  expect(cloud.read()).toBeNull();
  await page.getByRole('button', { name: 'Cancel preview' }).click();
  const reads = cloud.reads();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.clock.runFor(3000);
  await expect(page.getByRole('dialog', { name: 'Dropbox sync preview' })).toBeVisible();
  expect(cloud.reads()).toBeGreaterThan(reads);
  expect(cloud.read()).toBeNull();
  expect(cloud.errors).toEqual([]);
});

test('temporary scheduled read failures back off and stop after bounded retries; authorization does not retry', async ({
  page,
}) => {
  const cloud = await mocked(page);
  await connect(page);
  await page.clock.install();
  const region = page.getByRole('region', { name: 'Dropbox synchronization' });
  const checks = page.getByLabel(
    'Check on return, after saved edits and every minute here; changes require review',
  );
  cloud.offline(true);
  await checks.check();
  for (const [index, delay] of [3000, 5000, 15000, 60000].entries()) {
    await page.clock.runFor(delay);
    await expect.poll(() => cloud.reads()).toBe(index + 1);
    await expect(region).toContainText('Not synced');
    await expect(checks).toBeEnabled();
  }
  await expect(checks).not.toBeChecked();
  await expect(region).toContainText('Automatic checks paused');
  await page.clock.runFor(300000);
  expect(cloud.reads()).toBe(4);
  cloud.fail(401);
  await checks.check();
  await page.clock.runFor(3000);
  await expect.poll(() => cloud.reads()).toBe(5);
  await expect(checks).not.toBeChecked();
  await page.clock.runFor(300000);
  expect(cloud.reads()).toBe(5);
  expect(cloud.read()).toBeNull();
  expect(cloud.errors).toEqual([]);
});

test('shared sync status reports local pending work and reconnect limits on every production screen', async ({
  page,
}) => {
  const cloud = await mocked(page);
  await connect(page);
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Your name').fill('Local pending status');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  for (const phase of ['3', '4', '5', '6', '9&tool=help']) {
    await page.goto('/?phase=' + phase);
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
    await page.keyboard.press('Control+s');
    const modal = page.getByRole('dialog', { name: 'Sync status' });
    await expect(modal).toContainText(/[1-9]\d* local operation\(s\) pending/);
    await expect(modal).toContainText('Cloud freshness has not been checked');
    await expect(modal).toContainText('requires reconnecting');
    await expect(modal.getByRole('link', { name: 'Open Dropbox synchronization' })).toHaveAttribute(
      'href',
      '/?phase=9&tool=help#sync',
    );
    await page.keyboard.press('Escape');
  }
  expect(cloud.reads()).toBe(0);
  expect(cloud.errors).toEqual([]);
});
