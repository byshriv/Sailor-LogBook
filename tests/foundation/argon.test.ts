import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveArgonCandidate } from '../../packages/crypto/src/argon.ts';
test('pinned Argon2id candidate is deterministic and salt-separated with a 256-bit output', async () => {
  const key = await deriveArgonCandidate('synthetic password', new Uint8Array(16).fill(1));
  assert.equal(key.length, 32);
  assert.deepEqual(
    key,
    await deriveArgonCandidate('synthetic password', new Uint8Array(16).fill(1)),
  );
  assert.notDeepEqual(
    key,
    await deriveArgonCandidate('synthetic password', new Uint8Array(16).fill(2)),
  );
  await assert.rejects(deriveArgonCandidate('synthetic password', new Uint8Array(1)));
});
