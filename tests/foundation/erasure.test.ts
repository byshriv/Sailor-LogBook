import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
import { canonical } from '../../packages/domain/src/logbook.ts';
import { sha256 } from '../../packages/persistence/src/media.ts';
import { exportBackup } from '../../packages/persistence/src/backup.ts';
import { setupContent } from '../../packages/crypto/src/content.ts';
import { erasureMarker } from '../../packages/sync-core/src/erasure.ts';
import {
  DropboxPort,
  ownedDataPath,
  productionPath,
} from '../../packages/sync-providers/src/dropbox.ts';
import type {
  CloudFile,
  ErasurePort,
  OwnedFile,
} from '../../packages/sync-providers/src/dropbox.ts';
import { SyncEngine, readManifest } from '../../apps/web/src/sync-engine.ts';
import { ErasureEngine } from '../../apps/web/src/erasure-engine.ts';
const legacy = '/sailors-logbook.json';
const cloudBackup = '/sailor-logbook/v2/backups/11111111-1111-4111-8111-111111111111.json';
const mediaPath = '/sailor-logbook/v2/media/' + 'a'.repeat(64);
class Cloud implements ErasurePort {
  file: CloudFile | null = null;
  sequence = 0;
  writes = 0;
  removals: OwnedFile[] = [];
  files = new Map<string, string>([
    [legacy, 'legacy-1'],
    [cloudBackup, 'backup-1'],
    [mediaPath, 'media-1'],
    ['/unrelated.txt', 'private'],
    ['/sailor-logbook/v2/backups/notes.txt', 'keep'],
  ]);
  uncertain = false;
  offline = false;
  failRemoval = false;
  recreateLegacy = false;
  async read() {
    if (this.offline) throw Error('offline');
    return structuredClone(this.file);
  }
  async write(raw: string, revision: string | null) {
    if (this.offline) throw Error('offline');
    if ((this.file?.revision ?? null) !== revision) throw Error('CAS changed');
    const rev = String(++this.sequence);
    this.file = { raw, revision: rev };
    this.writes++;
    if (this.uncertain) {
      this.uncertain = false;
      throw Error('uncertain');
    }
    return rev;
  }
  async inventory() {
    if (this.offline) throw Error('offline');
    return [...this.files]
      .filter(([path]) => ownedDataPath(path))
      .map(([path, revision]) => ({ path, revision }))
      .concat(this.file ? [{ path: productionPath, revision: this.file.revision }] : []);
  }
  async remove(file: OwnedFile) {
    if (this.failRemoval) throw Error('provider deletion failure');
    if (this.files.has(file.path) && this.files.get(file.path) !== file.revision)
      throw Error('delete revision conflict');
    this.files.delete(file.path);
    this.removals.push(file);
    if (this.recreateLegacy && file.path === legacy) this.files.set(legacy, 'returned-legacy');
  }
}
async function fixture() {
  const factory = new IDBFactory(),
    db = await openLogbook(factory, 'erase'),
    cloud = new Cloud(),
    key = await setupContent('synthetic erasure passphrase');
  const bytes = new Uint8Array([1, 2, 3, 255]),
    digest = await sha256(bytes.buffer);
  await db.commit(
    {
      id: 'kept',
      at: 1,
      edit: {
        type: 'put',
        entity: {
          kind: 'page',
          id: 'kept',
          date: '2026-10-29',
          lines: [{ t: 'synthetic journal' }],
          strokes: [],
          attachments: [digest],
        },
      },
    },
    undefined,
    [{ id: digest, digest, blob: new Blob([bytes], { type: 'image/png' }) }],
  );
  await db.recovery('before', 'synthetic point');
  await db.saveKeyPolicy(key.setup);
  const sync = new SyncEngine(db, cloud);
  await sync.apply(await sync.preview(), {}, key);
  await db.retainSyncSource(await exportBackup(db));
  return { db, factory, cloud, key, digest, engine: new ErasureEngine(db, cloud) };
}
test('deletion preview and cancellation are read-only; changed local or cloud copies require review again', async () => {
  const { db, cloud, engine } = await fixture(),
    before = canonical(await db.exportRetained()),
    writes = cloud.writes;
  const p = await engine.preview('everywhere');
  assert.equal(canonical(await db.exportRetained()), before);
  assert.equal(await db.erasureStatus(), undefined);
  assert.equal(cloud.writes, writes);
  cloud.files.set(legacy, 'changed');
  await assert.rejects(engine.confirm(p), /preview changed/);
  assert.equal(await db.erasureStatus(), undefined);
  const local = await engine.preview('local');
  await db.commit({
    id: 'later',
    at: 2,
    edit: { type: 'put', entity: { kind: 'history', id: 'later', value: 'kept' } },
  });
  await assert.rejects(engine.confirm(local), /preview changed/);
  assert.equal((await db.load()).entities['history:later']?.kind, 'history');
});
test('local erasure clears current data, all retained media/history and keys without touching Dropbox', async () => {
  const { db, factory, cloud, digest } = await fixture(),
    original = cloud.file!.raw,
    writes = cloud.writes,
    oldHandle = await openLogbook(factory, 'erase');
  const engine = new ErasureEngine(db);
  await engine.confirm(await engine.preview('local'));
  assert.equal(cloud.file!.raw, original);
  assert.equal(cloud.writes, writes);
  assert.deepEqual((await db.load()).entities, {});
  assert.equal(await db.keyPolicy(), undefined);
  assert.equal(await db.syncJournal(), undefined);
  assert.equal(await db.attachment(digest), undefined);
  const retained = await db.exportRetained();
  for (const name of ['blobs', 'recovery', 'migration', 'tail', 'receipts'])
    assert.equal(retained[name]!.values.length, 0);
  assert.ok(!canonical(retained.meta).includes('synthetic journal'));
  await assert.rejects(
    oldHandle.commit({
      id: 'queued',
      at: 4,
      edit: { type: 'put', entity: { kind: 'history', id: 'queued', value: 'old draft' } },
    }),
    /erased/,
  );
  const receipt = await db.erasureStatus();
  await db.startAfterErasure(receipt!.id);
  await assert.rejects(db.saveKeyPolicy({ old: 'wrapped-key' }), /erased/);
  const fresh = await openLogbook(factory, 'erase');
  await fresh.commit({
    id: 'fresh',
    at: 5,
    edit: { type: 'put', entity: { kind: 'history', id: 'fresh', value: 'new' } },
  });
  assert.equal((await fresh.load()).entities['history:fresh']?.kind, 'history');
});
test('cloud erasure retains a content-free barrier, deletes only owned exact files and blocks stale/fresh uploads', async () => {
  const { db, cloud, engine, key } = await fixture(),
    stale = await openLogbook(new IDBFactory(), 'stale');
  const staleSync = new SyncEngine(stale, cloud);
  await stale.saveKeyPolicy(key.setup);
  await staleSync.apply(await staleSync.preview(key.key), {}, key);
  await stale.commit({
    id: 'offline',
    at: 8,
    edit: {
      type: 'put',
      entity: { kind: 'history', id: 'offline', value: 'kept on offline device' },
    },
  });
  await engine.confirm(await engine.preview('everywhere'));
  assert.ok(erasureMarker(cloud.file!.raw));
  assert.throws(() => readManifest(cloud.file!.raw), /erased/);
  assert.equal(cloud.files.size, 2);
  assert.ok(cloud.files.has('/unrelated.txt'));
  assert.ok(cloud.files.has('/sailor-logbook/v2/backups/notes.txt'));
  assert.equal((await db.erasureStatus())?.phase, 'complete');
  assert.deepEqual((await db.load()).entities, {});
  const writes = cloud.writes;
  await assert.rejects(new SyncEngine(stale, cloud).preview(), /erased/);
  assert.equal((await stale.pending()).length, 1);
  assert.ok((await stale.load()).entities['page:kept']);
  const empty = await openLogbook(new IDBFactory(), 'empty');
  await assert.rejects(new SyncEngine(empty, cloud).preview(), /erased/);
  assert.equal(cloud.writes, writes);
  assert.ok(!cloud.file!.raw.includes('payload'));
  assert.ok(!cloud.file!.raw.includes('setup'));
});
test('an upload already in flight loses its old revision race to the deletion barrier and stays unacknowledged', async () => {
  const { cloud, engine, key } = await fixture(),
    other = await openLogbook(new IDBFactory(), 'inflight');
  await other.saveKeyPolicy(key.setup);
  const joining = new SyncEngine(other, cloud);
  await joining.apply(await joining.preview(key.key), {}, key);
  await other.commit({
    id: 'pending',
    at: 9,
    edit: { type: 'put', entity: { kind: 'history', id: 'pending', value: 'unsynced' } },
  });
  let reached!: () => void, release!: () => void;
  const ready = new Promise<void>((resolve) => (reached = resolve)),
    held = new Promise<void>((resolve) => (release = resolve));
  const delayed = new SyncEngine(other, {
    read: () => cloud.read(),
    write: async (raw, rev) => {
      reached();
      await held;
      return cloud.write(raw, rev);
    },
  });
  const upload = delayed.apply(await delayed.preview(key.key), {}, key);
  // Attach the rejection handler immediately while the provider request is held.
  const rejected = assert.rejects(upload, /CAS changed/);
  await ready;
  await engine.confirm(await engine.preview('everywhere'));
  release();
  await rejected;
  assert.ok(erasureMarker(cloud.file!.raw));
  assert.ok((await other.pending()).length);
});
test('partial provider failures retain local recovery/keys and persist the sync fence until verified resume', async () => {
  const { db, cloud, engine } = await fixture(),
    before = canonical(await db.load());
  cloud.failRemoval = true;
  await assert.rejects(engine.confirm(await engine.preview('everywhere')), /provider deletion/);
  const job = await db.erasureStatus();
  assert.equal(job?.phase, 'barrier');
  assert.equal(canonical(await db.load()), before);
  assert.ok(await db.keyPolicy());
  await assert.rejects(db.saveKeyPolicy({ accidental: 'replacement' }), /paused/);
  await assert.rejects(new SyncEngine(db, cloud).preview(), /paused/);
  cloud.offline = true;
  await assert.rejects(engine.resume(job!.id), /offline/);
  assert.ok(await db.keyPolicy());
  cloud.offline = false;
  cloud.failRemoval = false;
  await engine.resume(job!.id);
  assert.equal((await db.erasureStatus())?.phase, 'complete');
  assert.equal(await db.keyPolicy(), undefined);
});
test('uncertain marker upload never clears local data early; exact read-back resumes without another write', async () => {
  const { db, cloud, engine } = await fixture();
  cloud.uncertain = true;
  await assert.rejects(engine.confirm(await engine.preview('everywhere')), /uncertain/);
  assert.ok((await db.load()).entities['page:kept']);
  assert.equal((await db.erasureStatus())?.phase, 'pending');
  const writes = cloud.writes;
  await engine.resume((await db.erasureStatus())!.id);
  assert.equal(cloud.writes, writes);
  assert.deepEqual((await db.load()).entities, {});
});
test('a revived legacy file leaves deletion incomplete and needs explicit changed-file review', async () => {
  const { db, cloud, engine } = await fixture();
  cloud.recreateLegacy = true;
  await assert.rejects(engine.confirm(await engine.preview('everywhere')), /remain or reappeared/);
  assert.ok((await db.load()).entities['page:kept']);
  await assert.rejects(engine.resume((await db.erasureStatus())!.id), /changed or reappeared/);
  cloud.recreateLegacy = false;
  const reviewed = await engine.preview('everywhere');
  assert.equal(reviewed.job.targets.find((f) => f.path === legacy)?.revision, 'returned-legacy');
  await engine.confirm(reviewed);
  assert.equal((await db.erasureStatus())?.phase, 'complete');
});
test('atomic local-clear quota failure rolls back every store and leaves a retryable cloud-complete job', async () => {
  const { db, cloud, engine, digest } = await fixture(),
    clear = IDBObjectStore.prototype.clear;
  IDBObjectStore.prototype.clear = function () {
    if (this.name === 'blobs') throw Error('synthetic quota');
    return clear.call(this);
  };
  try {
    await assert.rejects(engine.confirm(await engine.preview('everywhere')), /quota/);
  } finally {
    IDBObjectStore.prototype.clear = clear;
  }
  assert.ok(await db.attachment(digest));
  assert.ok(await db.keyPolicy());
  assert.ok((await db.load()).entities['page:kept']);
  assert.ok(erasureMarker(cloud.file!.raw));
  await engine.resume((await db.erasureStatus())!.id);
  assert.equal(await db.attachment(digest), undefined);
});
test('provider inventory paginates and ignores unrelated files; deletion carries parent_rev and rejects folders/unknown paths', async () => {
  const requests: RequestInit[] = [];
  let pages = 0;
  const port = new DropboxPort(
    () => 'synthetic',
    async (url, init) => {
      requests.push(init!);
      if (url.includes('list_folder')) {
        pages++;
        return new Response(
          JSON.stringify(
            pages === 1
              ? {
                  entries: [
                    { '.tag': 'file', path_lower: cloudBackup, rev: 'r1' },
                    { '.tag': 'file', path_lower: '/unrelated.txt', rev: 'keep' },
                    { '.tag': 'folder', path_lower: '/sailor-logbook/v2/media' },
                  ],
                  cursor: 'page2',
                  has_more: true,
                }
              : {
                  entries: [{ '.tag': 'file', path_lower: mediaPath, rev: 'r2' }],
                  cursor: 'end',
                  has_more: false,
                },
          ),
        );
      }
      return new Response('{}');
    },
  );
  assert.equal((await port.inventory()).length, 2);
  assert.equal(pages, 2);
  await port.remove({ path: cloudBackup, revision: 'r1' });
  assert.deepEqual(JSON.parse(String(requests.at(-1)!.body)), {
    path: cloudBackup,
    parent_rev: 'r1',
  });
  const count = requests.length;
  await assert.rejects(port.remove({ path: '/sailor-logbook/v2', revision: 'r1' }), /Unowned/);
  assert.equal(requests.length, count);
});
test('content-bearing or future deletion markers fail closed instead of becoming retained personal data', () => {
  const marker = {
    format: 'slb-erased',
    protocol: 2,
    reader: 2,
    generation: crypto.randomUUID(),
    at: new Date().toISOString(),
  };
  assert.throws(
    () => erasureMarker(JSON.stringify({ ...marker, payload: 'personal' })),
    /Unsupported/,
  );
  assert.throws(() => erasureMarker(JSON.stringify({ ...marker, reader: 99 })), /Unsupported/);
});
test('malformed durable intents and residual personal stores cannot report completed erasure', async () => {
  const a = await fixture(),
    preview = await a.engine.preview('everywhere');
  preview.job.marker = JSON.stringify({
    format: 'slb-erased',
    protocol: 2,
    reader: 2,
    generation: crypto.randomUUID(),
    at: new Date().toISOString(),
    payload: 'must not upload',
  });
  await a.db.beginErasure(preview.job, preview.baseline);
  const writes = a.cloud.writes;
  await assert.rejects(a.engine.resume(preview.job.id), /Unsupported/);
  assert.equal(a.cloud.writes, writes);
  assert.ok((await a.db.load()).entities['page:kept']);
  const b = await fixture();
  await new ErasureEngine(b.db).confirm(await new ErasureEngine(b.db).preview('local'));
  const receipt = await b.db.erasureStatus();
  const raw = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = b.factory.open('erase', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = raw.transaction('migration', 'readwrite');
    tx.objectStore('migration').put({ source: 'unexpected retained source' }, 'damaged');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  await assert.rejects(b.db.erasureStatus(), /retained data/);
  await assert.rejects(b.db.startAfterErasure(receipt!.id), /retained data/);
  raw.close();
});
