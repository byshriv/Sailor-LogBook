import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeOAuthReturn } from '../../packages/platform/src/native.ts';
import {
  setupContent,
  unlockContent,
  encryptContent,
  decryptContent,
} from '../../packages/crypto/src/content.ts';
import { beginDropbox, finishDropbox } from '../../packages/sync-providers/src/dropbox.ts';

test('native OAuth callback rejects alternate origins, payloads, duplicates and mixed results', () => {
  assert.deepEqual(nativeOAuthReturn('sailorlogbook://oauth/dropbox?code=abc&state=def'), {
    code: 'abc',
    state: 'def',
    canceled: false,
  });
  assert.equal(
    nativeOAuthReturn('sailorlogbook://oauth/dropbox?error=access_denied&state=def').canceled,
    true,
  );
  for (const raw of [
    'https://oauth/dropbox?code=x&state=s',
    'sailorlogbook://user@oauth/dropbox?code=x&state=s',
    'sailorlogbook://oauth/dropbox/extra?code=x&state=s',
    'sailorlogbook://oauth/dropbox?code=x&code=y&state=s',
    'sailorlogbook://oauth/dropbox?code=x&state=s#fragment',
    'sailorlogbook://oauth/dropbox?code=x',
    'sailorlogbook://oauth/dropbox?code=x&state=s&error=denied',
    'sailorlogbook://oauth/dropbox?code=x&state=s&title=private',
  ])
    assert.throws(() => nativeOAuthReturn(raw));
});
test('native trust receives only authenticated key bytes, zeroes them and keeps session keys nonextractable', async () => {
  const { setup, key } = await setupContent('Synthetic passphrase only');
  let held: Uint8Array | undefined;
  const restored = await unlockContent(setup, 'Synthetic passphrase only', false, async (raw) => {
    assert.equal(raw.length, 32);
    assert.ok(raw.some((x) => x !== 0));
    held = raw;
  });
  assert.equal(restored.extractable, false);
  assert.ok(held?.every((x) => x === 0));
  const payload = await encryptContent('synthetic content', key, setup, 'test');
  assert.equal(await decryptContent(payload, restored, setup, 'test'), 'synthetic content');
  let called = false;
  await assert.rejects(
    unlockContent(setup, 'wrong passphrase', false, async () => {
      called = true;
    }),
  );
  assert.equal(called, false);
  await assert.rejects(
    unlockContent(setup, 'Synthetic passphrase only', false, async (raw) => {
      held = raw;
      throw Error('native canceled');
    }),
  );
  assert.ok(held?.every((x) => x === 0));
});
test('native PKCE retains exact callback and refuses stale, future or wrong-state returns before HTTP', async () => {
  const pending = await beginDropbox('publicAppKey', 'sailorlogbook://oauth/dropbox');
  let calls = 0;
  const http = async (_url: string, init?: RequestInit) => {
    calls++;
    const body = init?.body as URLSearchParams;
    assert.equal(body.get('redirect_uri'), pending.redirect);
    assert.equal(body.get('code_verifier'), pending.verifier);
    return new Response(JSON.stringify({ access_token: 'synthetic', expires_in: 60 }));
  };
  for (const bad of [
    { ...pending, at: Date.now() - 600001 },
    { ...pending, at: Date.now() + 60000 },
  ])
    await assert.rejects(finishDropbox(bad, 'code', pending.state, http));
  await assert.rejects(finishDropbox(pending, 'code', 'wrong', http));
  assert.equal(calls, 0);
  await finishDropbox(pending, 'code', pending.state, http);
  assert.equal(calls, 1);
});
