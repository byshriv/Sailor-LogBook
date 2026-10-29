import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
import { canonical } from '../../packages/domain/src/logbook.ts';
import {
  setupContent,
  rewrapContent,
  unlockContent,
  encryptContent,
  decryptContent,
} from '../../packages/crypto/src/content.ts';
import { SyncEngine, readManifest } from '../../apps/web/src/sync-engine.ts';
import type { CloudFile, CloudPort } from '../../packages/sync-providers/src/dropbox.ts';
class Cloud implements CloudPort {
  file: CloudFile | null = null;
  writes = 0;
  uncertain = false;
  conflict = false;
  async read() {
    return structuredClone(this.file);
  }
  async write(raw: string, revision: string | null) {
    if (this.conflict || (this.file?.revision ?? null) !== revision) throw Error('CAS conflict');
    const rev = String(++this.writes);
    this.file = { revision: rev, raw };
    if (this.uncertain) {
      this.uncertain = false;
      throw Error('uncertain write');
    }
    return rev;
  }
}
const oldPass = 'synthetic original passphrase',
  newPass = 'synthetic replacement passphrase';
async function fixture() {
  const db = await openLogbook(new IDBFactory(), 'rotation'),
    cloud = new Cloud(),
    engine = new SyncEngine(db, cloud),
    old = await setupContent(oldPass);
  await db.commit({
    id: 'kept',
    at: 1,
    edit: {
      type: 'put',
      entity: {
        kind: 'history',
        id: 'kept',
        value: { text: 'retained content', opaque: [1, 'keep'] },
      },
    },
  });
  await db.saveKeyPolicy(old.setup);
  await engine.apply(await engine.preview(), {}, old);
  const next = await rewrapContent(old.setup, oldPass, false, newPass);
  return { db, cloud, engine, old, next };
}
test('credential rewrap authenticates current credentials, verifies new passphrase and keeps old backups readable', async () => {
  const old = await setupContent(oldPass),
    next = await rewrapContent(old.setup, old.code, true, newPass);
  assert.equal(old.setup.id, next.setup.id);
  assert.notEqual(old.setup.salt, next.setup.salt);
  assert.notEqual(old.code, next.code);
  const payload = await encryptContent('private original bytes', old.key, old.setup, old.setup.id);
  assert.equal(
    await decryptContent(payload, await unlockContent(old.setup, oldPass), old.setup, old.setup.id),
    'private original bytes',
  );
  assert.equal(
    await decryptContent(payload, next.key, old.setup, old.setup.id),
    'private original bytes',
  );
  await unlockContent(next.setup, newPass);
  await unlockContent(next.setup, next.code, true);
  await assert.rejects(unlockContent(next.setup, oldPass));
  await assert.rejects(unlockContent(next.setup, old.code, true));
  await assert.rejects(rewrapContent(old.setup, 'wrong', false, newPass));
});
test('revision-verified credential change preserves current data and archives the previous policy', async () => {
  const { db, cloud, engine, old, next } = await fixture(),
    before = canonical(await db.load());
  await engine.rotateCredentials(old, next);
  assert.equal(canonical(await db.load()), before);
  assert.equal((await db.pending()).length, 0);
  assert.equal(canonical(await db.keyPolicy()), canonical(next.setup));
  const manifest = readManifest(cloud.file!.raw);
  assert.equal(canonical(manifest.setup), canonical(next.setup));
  assert.ok(
    (await decryptContent(manifest.payload, next.key, next.setup, manifest.generation)).includes(
      'retained content',
    ),
  );
  assert.ok(
    (await db.exportRetained()).migration!.values.some(
      (v: any) =>
        v.reason === 'Verified credential rotation' &&
        canonical(v.previous) === canonical(old.setup),
    ),
  );
  await assert.rejects(
    engine.apply(await engine.preview(old.key), {}, old),
    /current encryption generation/,
  );
});
test('uncertain credential upload keeps old policy until exact read-back and retry does not write again', async () => {
  const { db, cloud, engine, old, next } = await fixture();
  cloud.uncertain = true;
  await assert.rejects(engine.rotateCredentials(old, next), /uncertain/);
  assert.equal(canonical(await db.keyPolicy()), canonical(old.setup));
  assert.equal(cloud.writes, 2);
  await engine.rotateCredentials(old, next);
  assert.equal(cloud.writes, 2);
  assert.equal(canonical(await db.keyPolicy()), canonical(next.setup));
  const interrupted = await fixture(),
    controller = new AbortController();
  const port: CloudPort = {
    read: () => interrupted.cloud.read(),
    write: async (raw, rev) => {
      const result = await interrupted.cloud.write(raw, rev);
      controller.abort();
      return result;
    },
  };
  await assert.rejects(
    new SyncEngine(interrupted.db, port).rotateCredentials(
      interrupted.old,
      interrupted.next,
      controller.signal,
    ),
    /not verified/,
  );
  assert.equal(canonical(await interrupted.db.keyPolicy()), canonical(interrupted.old.setup));
  await interrupted.engine.rotateCredentials(interrupted.old, interrupted.next);
  assert.equal(interrupted.cloud.writes, 2);
});
test('concurrent Dropbox writer and pending local edits block credential replacement', async () => {
  const { db, cloud, engine, old, next } = await fixture(),
    original = cloud.file!.raw;
  cloud.conflict = true;
  await assert.rejects(engine.rotateCredentials(old, next), /CAS/);
  assert.equal(cloud.file!.raw, original);
  assert.equal(canonical(await db.keyPolicy()), canonical(old.setup));
  cloud.conflict = false;
  await db.commit({
    id: 'later',
    at: 2,
    edit: { type: 'put', entity: { kind: 'history', id: 'later', value: 'draft saved locally' } },
  });
  await assert.rejects(engine.rotateCredentials(old, next), /Sync and review/);
  assert.equal(cloud.writes, 1);
  assert.equal((await db.pending()).length, 1);
});
test('local rotation transaction abort rolls back policy and receipt; verified retry recovers', async () => {
  const { db, cloud, engine, old, next } = await fixture(),
    add = IDBObjectStore.prototype.add;
  IDBObjectStore.prototype.add = function (...args: Parameters<typeof add>) {
    if (this.name === 'migration' && (args[0] as any)?.reason === 'Verified credential rotation')
      throw Error('quota');
    return add.apply(this, args);
  };
  try {
    await assert.rejects(engine.rotateCredentials(old, next), /quota/);
  } finally {
    IDBObjectStore.prototype.add = add;
  }
  assert.equal(canonical(await db.keyPolicy()), canonical(old.setup));
  assert.ok((await db.syncJournal()).intent);
  assert.equal(cloud.writes, 2);
  await engine.rotateCredentials(old, next);
  assert.equal(canonical(await db.keyPolicy()), canonical(next.setup));
  assert.equal(cloud.writes, 2);
});
test('a different content master cannot masquerade as a credential-only rotation', async () => {
  const { db, cloud, engine, old } = await fixture(),
    impostor = await setupContent(newPass);
  await assert.rejects(
    engine.rotateCredentials(old, { ...impostor, setup: { ...impostor.setup, id: old.setup.id } }),
  );
  assert.equal(canonical(await db.keyPolicy()), canonical(old.setup));
  assert.equal(cloud.writes, 1);
});
