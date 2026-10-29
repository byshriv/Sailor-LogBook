import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { blankLogbook, canonical } from '../../packages/domain/src/logbook.ts';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
import { previewBackup } from '../../packages/persistence/src/backup.ts';
import { setupContent, decryptContent } from '../../packages/crypto/src/content.ts';
import { productionPath } from '../../packages/sync-providers/src/dropbox.ts';
import type {
  CloudFile,
  ErasurePort,
  OwnedFile,
} from '../../packages/sync-providers/src/dropbox.ts';
import { NewCloudEngine } from '../../apps/web/src/new-cloud-engine.ts';
import { SyncEngine, readManifest } from '../../apps/web/src/sync-engine.ts';
import { ErasureEngine } from '../../apps/web/src/erasure-engine.ts';

const marker = () =>
  JSON.stringify({
    format: 'slb-erased',
    protocol: 2,
    reader: 2,
    generation: crypto.randomUUID(),
    at: new Date().toISOString(),
  });
class Cloud implements ErasurePort {
  file: CloudFile | null = { raw: marker(), revision: '1' };
  writes = 0;
  sequence = 1;
  uncertain = false;
  mismatch = false;
  mismatchNext = false;
  legacy: string | null = null;
  extra: OwnedFile[] = [];
  afterWrite?: () => void;
  async read() {
    const file = structuredClone(this.file);
    if (file && this.mismatchNext) {
      this.mismatchNext = false;
      file.revision = 'mismatched';
    }
    return file;
  }
  async legacyRevision() {
    return this.legacy;
  }
  async inventory() {
    return [
      ...this.extra,
      ...(this.file ? [{ path: productionPath, revision: this.file.revision }] : []),
    ];
  }
  async remove() {
    throw Error('New-cloud setup must not delete any file');
  }
  async write(raw: string, revision: string | null) {
    if ((this.file?.revision ?? null) !== revision) throw Error('CAS conflict');
    const rev = String(++this.sequence);
    this.file = { raw, revision: rev };
    this.writes++;
    this.afterWrite?.();
    this.mismatchNext = this.mismatch;
    if (this.uncertain) {
      this.uncertain = false;
      throw Error('uncertain write');
    }
    return rev;
  }
}
const db = (factory = new IDBFactory()) => openLogbook(factory, 'new-cloud');
const put = (d: Awaited<ReturnType<typeof db>>, id: string) =>
  d.commit({
    id: crypto.randomUUID(),
    at: 1,
    edit: { type: 'put', entity: { kind: 'history', id, value: id } },
  });

test('new-cloud preview is read-only and explicit creation publishes only a fresh empty generation', async () => {
  const d = await db(),
    c = new Cloud(),
    e = new NewCloudEngine(d, c),
    original = c.file!.raw;
  const p = await e.preview();
  assert.equal(c.writes, 0);
  assert.equal(await d.syncJournal(), undefined);
  assert.equal(c.file!.raw, original);
  assert.equal((await e.create(p)).localPending, 0);
  const m = readManifest(c.file!.raw);
  assert.notEqual(m.generation, JSON.parse(original).generation);
  assert.equal(m.mode, 'plain');
  assert.equal(canonical((await previewBackup(m.payload)).state), canonical(blankLogbook()));
  assert.equal((await d.syncJournal()).anchor.generation, m.generation);
  assert.equal(c.writes, 1);
});
test('old local records and retained history cannot be used to initialize a replacement cloud', async () => {
  const d = await db(),
    c = new Cloud(),
    e = new NewCloudEngine(d, c);
  await put(d, 'retired record');
  await assert.rejects(e.preview(), /fresh empty/);
  assert.equal(c.writes, 0);
  await d.commit({
    id: 'remove',
    at: 2,
    edit: { type: 'delete', keys: ['history:retired record'] },
  });
  assert.deepEqual((await d.load()).entities, {});
  await assert.rejects(e.preview(), /fresh empty/);
  const clean = await db();
  await clean.recovery('empty-point', 'retained empty history');
  await assert.rejects(new NewCloudEngine(clean, c).preview(), /fresh empty/);
});
test('restarting locally after erasure permits explicit creation but old handles remain fenced', async () => {
  const factory = new IDBFactory(),
    old = await db(factory),
    c = new Cloud();
  await put(old, 'old');
  const erase = new ErasureEngine(old);
  await erase.confirm(await erase.preview('local'));
  await assert.rejects(new NewCloudEngine(old, c).preview(), /paused|erased/);
  await old.startAfterErasure((await old.erasureStatus())!.id);
  await assert.rejects(new NewCloudEngine(old, c).preview(), /paused|erased/);
  const fresh = await db(factory),
    creator = new NewCloudEngine(fresh, c);
  await creator.create(await creator.preview());
  assert.equal((await fresh.pending()).length, 0);
});
test('configured encryption cannot silently downgrade and its new empty cloud contains no recovery secret', async () => {
  const d = await db(),
    c = new Cloud(),
    e = new NewCloudEngine(d, c),
    kit = await setupContent('synthetic new-cloud passphrase');
  await d.saveKeyPolicy(kit.setup);
  const p = await e.preview();
  await assert.rejects(e.create(p), /Unlock/);
  assert.equal(c.writes, 0);
  await e.create(p, kit);
  const m = readManifest(c.file!.raw);
  assert.equal(m.mode, 'encrypted');
  assert.ok(!c.file!.raw.includes(kit.code));
  assert.equal(
    canonical(
      (await previewBackup(await decryptContent(m.payload, kit.key, kit.setup, m.generation)))
        .state,
    ),
    canonical(blankLogbook()),
  );
});
test('changed barriers, legacy revival, leftover owned files and competing creators fail without overwriting a winner', async () => {
  const d = await db(),
    c = new Cloud(),
    e = new NewCloudEngine(d, c),
    p = await e.preview();
  c.file!.revision = 'changed';
  await assert.rejects(e.create(p), /preview changed/);
  assert.equal(await d.syncJournal(), undefined);
  c.legacy = 'revived';
  await assert.rejects(e.preview(), /legacy cloud/);
  c.legacy = null;
  c.extra = [{ path: '/sailors-logbook.json', revision: 'returned' }];
  await assert.rejects(e.preview(), /files changed or remain/);
  c.extra = [];
  const other = await db(),
    a = await e.preview(),
    competing = new NewCloudEngine(other, c),
    b = await competing.preview();
  await e.create(a);
  const winner = c.file!.raw;
  await assert.rejects(competing.create(b), /already active/);
  assert.equal(c.file!.raw, winner);
  assert.equal(c.writes, 1);
});
test('uncertain creation blocks ordinary sync and preserves later local edits until explicit verification', async () => {
  const d = await db(),
    c = new Cloud(),
    e = new NewCloudEngine(d, c),
    p = await e.preview();
  c.uncertain = true;
  await assert.rejects(e.create(p), /uncertain/);
  assert.equal((await d.syncJournal()).anchor, undefined);
  await assert.rejects(new SyncEngine(d, c).preview(), /explicit new-cloud verification/);
  await assert.rejects(d.saveKeyPolicy({ changed: true }), /policy changes are paused/);
  await put(d, 'local after uncertain upload');
  const retry = await e.preview();
  assert.equal(retry.records, 1);
  assert.equal((await e.create(retry)).localPending, 1);
  assert.equal(c.writes, 1);
  assert.equal(
    (await previewBackup(readManifest(c.file!.raw).payload)).state.entities[
      'history:local after uncertain upload'
    ],
    undefined,
  );
  const sync = new SyncEngine(d, c);
  await sync.apply(await sync.preview());
  assert.equal((await d.pending()).length, 0);
  assert.ok(c.file!.raw.includes('local after uncertain upload'));
});
test('read-back mismatch, cancellation and receipt quota failure retain a retryable request with no false anchor', async () => {
  const d = await db(),
    c = new Cloud(),
    e = new NewCloudEngine(d, c),
    p = await e.preview();
  c.mismatch = true;
  await assert.rejects(e.create(p), /not verified/);
  assert.equal((await d.syncJournal()).anchor, undefined);
  c.mismatch = false;
  await e.create(p);
  assert.equal(c.writes, 1);
  const q = await db(),
    cc = new Cloud(),
    ee = new NewCloudEngine(q, cc),
    controller = new AbortController();
  cc.afterWrite = () => controller.abort();
  await assert.rejects(ee.create(await ee.preview(), undefined, controller.signal), /not verified/);
  assert.equal((await q.syncJournal()).anchor, undefined);
  cc.afterWrite = undefined;
  const putOriginal = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args: Parameters<typeof putOriginal>) {
    if (this.name === 'meta' && args[1] === 'sync-v2' && (args[0] as any)?.anchor)
      throw Error('receipt quota');
    return putOriginal.apply(this, args);
  };
  try {
    await assert.rejects(ee.create(await ee.preview()), /quota/);
  } finally {
    IDBObjectStore.prototype.put = putOriginal;
  }
  assert.equal((await q.syncJournal()).anchor, undefined);
  await ee.create(await ee.preview());
  assert.equal(cc.writes, 1);
});
test('known old devices cannot upload to a replacement generation after explicit restart', async () => {
  const old = await db(),
    c = new Cloud();
  c.file = null;
  await put(old, 'retired content');
  const oldSync = new SyncEngine(old, c);
  await oldSync.apply(await oldSync.preview());
  const retired = readManifest(c.file!.raw).generation;
  await c.write(marker(), c.file!.revision);
  const fresh = await db(),
    newCloud = new NewCloudEngine(fresh, c);
  await newCloud.create(await newCloud.preview());
  assert.notEqual(readManifest(c.file!.raw).generation, retired);
  await put(old, 'offline old edit');
  const writes = c.writes;
  await assert.rejects(oldSync.preview(), /generation/);
  assert.equal(c.writes, writes);
  assert.equal((await old.pending()).length, 1);
  assert.ok(!c.file!.raw.includes('retired content'));
});

test('intent persistence atomically rejects cross-tab policy, retained-history and competing-request races before upload', async () => {
  for (const race of ['policy', 'history', 'request']) {
    const d = await db(),
      c = new Cloud(),
      e = new NewCloudEngine(d, c);
    const preview = await e.preview(),
      save = d.saveSyncJournal;
    d.saveSyncJournal = async (...args: Parameters<typeof save>) => {
      if (race === 'policy') await d.saveKeyPolicy({ changed: true });
      if (race === 'history') await d.recovery('racing-point', 'retained by another tab');
      if (race === 'request') await save({ intent: { other: true } }, await d.actor());
      return save(...args);
    };
    await assert.rejects(e.create(preview), /changed/);
    assert.equal(c.writes, 0);
    assert.ok(JSON.parse(c.file!.raw).format === 'slb-erased');
    if (race === 'request') assert.deepEqual((await d.syncJournal()).intent, { other: true });
    else assert.equal(await d.syncJournal(), undefined);
  }
});
