import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
// Browser adapter regressions only: this fake bridge is not Android/device evidence.
async function bridge(page: Page) {
  await page.route(
    (url) => url.pathname === '/src/native.ts',
    (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `
    export const isNative=()=>true;
    export const native={getTextVisibility:async()=>({show:false}),setTextVisibility:async()=>{},publishCurrent:async()=>({written:true})};
    export const launchAction=async()=> 'none'; export const listenForWidgetLaunch=async()=>()=>{}; export const publishWidget=async()=>{};
  `,
      }),
  );
  await page.route(
    (url) => url.pathname === '/src/native-production.ts',
    (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `
    window.__nativeEvents = new Set(); window.__nativeAction = 'none';
    export const bindNativeProjection=()=>{};
    export const restoreTrust=async()=>{throw Error('No trust')}; export const trustContent=async()=>{};
    export const device={
      takeLaunch:async()=>{const action=window.__nativeAction;window.__nativeAction='none';return {action}},
      addListener:async(_,fn)=>{window.__nativeEvents.add(fn);return {remove:async()=>window.__nativeEvents.delete(fn)}},
      takeOAuth:async()=>{const r=window.__oauthReturn||{};window.__oauthReturn=null;return r},
      beginOAuth:async({pending})=>{window.__oauthPending=pending},
      requestNotifications:async()=>({granted:false}),reminders:async()=>({granted:false}),
      lock:async()=>{},forget:async()=>{if(window.__failForget) throw Error('Native cleanup failed')},minimize:async()=>{},saveBackup:async()=>{throw Error('Document canceled')}
    };
  `,
      }),
  );
}
async function emit(page: Page, action: string) {
  await page.evaluate((action) => {
    (window as any).__nativeAction = action;
    for (const fn of (window as any).__nativeEvents) fn();
  }, action);
}
test('adapter: production native root and widget returns preserve a profile draft', async ({
  page,
}) => {
  await bridge(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?tool=help');
  await expect(page.getByRole('heading', { name: 'Make it yours' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Offline and updates' })).toContainText(
    'Offline assets are packaged in this Android app',
  );
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  const name = page.getByLabel('Your name', { exact: true });
  await name.fill('Native unsaved draft');
  await emit(page, 'quick-log');
  await expect(name).toHaveValue('Native unsaved draft');
  await expect(page).toHaveURL(/tool=help/);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/phase=3&new=log/);
  await expect(page.getByLabel('Activity title')).toBeVisible();
  expect(errors).toEqual([]);
});
test('adapter: native OAuth uses external PKCE and consumes return without uploading', async ({
  page,
}) => {
  await bridge(page);
  let exchanges = 0;
  await page.route('https://api.dropboxapi.com/2/**', () => {
    throw Error('No data transfer authorized');
  });
  await page.route('https://api.dropboxapi.com/oauth2/token', async (route) => {
    exchanges++;
    expect(route.request().postData()).toContain(
      'redirect_uri=sailorlogbook%3A%2F%2Foauth%2Fdropbox',
    );
    await route.fulfill({ json: { access_token: 'synthetic', expires_in: 60 } });
  });
  await page.goto('/?phase=9&tool=help#sync');
  await page.getByLabel('Dropbox public app key').fill('publicAppKey');
  await page.getByRole('button', { name: 'Connect Dropbox', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!(window as any).__oauthPending)).toBe(true);
  await page.evaluate(() => {
    const p = (window as any).__oauthPending;
    (window as any).__oauthReturn = {
      pending: p,
      url: 'sailorlogbook://oauth/dropbox?code=synthetic&state=' + p.state,
    };
    window.dispatchEvent(new Event('slb-oauth-return'));
  });
  await expect(
    page.getByRole('button', { name: 'Preview Dropbox sync', exact: true }),
  ).toBeVisible();
  expect(exchanges).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('slb-oauth-return')));
  await expect(
    page.getByRole('button', { name: 'Preview Dropbox sync', exact: true }),
  ).toBeVisible();
  expect(exchanges).toBe(1);
});
test('adapter: configured encryption gates Quick log and document cancellation retains canonical data', async ({
  page,
}) => {
  await bridge(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?phase=9&tool=help');
  const base = '/@fs/' + process.cwd().replaceAll('\\', '/') + '/';
  await page.evaluate(async (base) => {
    const { openLogbook } = await import(base + 'packages/persistence/src/logbook.ts');
    const { setupContent } = await import(base + 'packages/crypto/src/content.ts');
    const db = await openLogbook(indexedDB);
    await db.saveKeyPolicy((await setupContent('Synthetic device passphrase')).setup);
    await db.commit({
      id: 'seed-native',
      at: 1,
      edit: {
        type: 'put',
        entity: {
          kind: 'deck',
          id: 'keep',
          name: 'Keep me',
          parent: null,
          excludeFromStreak: false,
        },
      },
    });
    db.close();
  }, base);
  await page.goto('/?phase=3');
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
  await emit(page, 'quick-log');
  await expect(page.getByRole('dialog', { name: 'Unlock encrypted Dropbox' })).toBeVisible();
  await page.getByLabel('Encryption passphrase').fill('Synthetic device passphrase');
  await page.getByRole('button', { name: 'Unlock for this tab', exact: true }).click();
  await expect(page).toHaveURL(/phase=3&new=log/);
  await expect(page.getByLabel('Activity title')).toBeVisible();
  // End this empty editor through the existing cancellation flow before navigation.
  await page.goto('/?phase=9&tool=help');
  await page.getByRole('button', { name: 'Download plaintext backup', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Backup and recovery' })).toContainText(
    'Document canceled',
  );
  expect(
    await page.evaluate(async (base) => {
      const { openLogbook } = await import(base + 'packages/persistence/src/logbook.ts');
      const db = await openLogbook(indexedDB);
      const state = await db.load();
      db.close();
      return state.entities['deck:keep']?.kind === 'deck';
    }, base),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('adapter: native erasure cleanup failure cannot bypass the new-session fence', async ({
  page,
}) => {
  await bridge(page);
  await page.goto('/?phase=9&tool=help');
  await page.evaluate(() => {
    (window as any).__failForget = true;
  });
  await page.getByRole('button', { name: 'Erase local data', exact: true }).click();
  await page.getByRole('checkbox', { name: /I understand this is permanent/ }).check();
  await page.getByLabel('Type ERASE LOCAL to confirm').fill('ERASE LOCAL');
  await page.getByRole('button', { name: 'Confirm permanent erasure' }).click();
  const result = page.getByRole('region', { name: 'Erasure result' });
  await expect(result).toContainText('native trust cleanup failed');
  await page.getByRole('button', { name: 'Start a new local logbook' }).click();
  await expect(result).toContainText('native cleanup and storage must succeed');
  const base = '/@fs/' + process.cwd().replaceAll('\\', '/') + '/';
  expect(
    await page.evaluate(async (base) => {
      const { openLogbook } = await import(base + 'packages/persistence/src/logbook.ts');
      const db = await openLogbook(indexedDB);
      const job = await db.erasureStatus();
      db.close();
      return job?.phase;
    }, base),
  ).toBe('complete');
});
