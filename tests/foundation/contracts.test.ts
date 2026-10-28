import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRevisionPort, RevisionConflict } from '../../packages/sync-providers/src/index.ts';
import { requireReadable } from '../../packages/sync-core/src/index.ts';
import { parseWidgetLink, widgetProjection } from '../../packages/platform/src/index.ts';
import {
  createKeySetup,
  unlockPassphrase,
  unlockRecovery,
} from '../../packages/crypto/src/index.ts';

test('stale writers and stale create-only writes cannot overwrite the winning revision', async () => {
  const port = new MemoryRevisionPort(),
    envelope = {
      protocol: 1 as const,
      generation: 'sample',
      mode: 'plain' as const,
      payload: '{}',
    };
  const rev = await port.write(envelope, null);
  await assert.rejects(port.write({ ...envelope, payload: 'stale' }, null), RevisionConflict);
  await port.write({ ...envelope, payload: 'winner' }, rev);
  await assert.rejects(port.write(envelope, rev), RevisionConflict);
  assert.equal((await port.read())?.envelope.payload, 'winner');
  assert.throws(() => requireReadable(envelope, true), /downgrade/);
});
test('widget text stays private by default; deep links cannot carry arbitrary actions', () => {
  const input = {
    schema: 1 as const,
    revision: 1,
    wallDate: '2026-10-27',
    loggedMinutes: 60,
    bestCount: 1,
    updatedAt: '2026-10-27T10:00:00Z',
    personalText: 'Private synthetic text',
    token: 'must be dropped',
  };
  assert.equal(widgetProjection(input).personalText, undefined);
  assert.equal('token' in widgetProjection(input, true), false);
  assert.equal(widgetProjection(input, true).personalText, input.personalText);
  assert.equal(parseWidgetLink('sailorlogbook://widget/quick-log'), 'quick-log');
  for (const link of [
    'https://widget/quick-log',
    'sailorlogbook://widget/erase',
    'sailorlogbook://widget/today?token=x',
  ])
    assert.equal(parseWidgetLink(link), null);
});
test('passphrase/recovery wrappers unlock the same random master; wrong key/tampering fail', async () => {
  const { setup, recoverySecret, master } = await createKeySetup('synthetic test passphrase');
  assert.deepEqual(
    new Uint8Array(await unlockPassphrase(setup, 'synthetic test passphrase')),
    master,
  );
  assert.deepEqual(new Uint8Array(await unlockRecovery(setup, recoverySecret)), master);
  await assert.rejects(unlockPassphrase(setup, 'incorrect passphrase'));
  await assert.rejects(unlockRecovery(setup, new Uint8Array(32)));
  const corrupted = structuredClone(setup);
  new Uint8Array(corrupted.recovery.ciphertext)[0] ^= 1;
  await assert.rejects(unlockRecovery(corrupted, recoverySecret));
});
