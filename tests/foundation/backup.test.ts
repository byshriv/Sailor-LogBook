import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { canonical } from '../../packages/domain/src/logbook.ts';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
import {
  applyImport,
  exportBackup,
  planImport,
  previewBackup,
} from '../../packages/persistence/src/backup.ts';
import { sha256 } from '../../packages/persistence/src/media.ts';
const entity = (id: string, text = id) => ({
  kind: 'history' as const,
  id,
  value: { text, opaque: [1, 'keep'] },
});
const command = (id: string) => ({
  id: crypto.randomUUID(),
  at: Date.now(),
  edit: { type: 'put' as const, entity: entity(id) },
});
async function db() {
  return openLogbook(new IDBFactory(), 'backup', 'actor');
}
async function incoming(id = 'remote') {
  const d = await db();
  await d.commit(command(id));
  return previewBackup(await exportBackup(d));
}
test('versioned backup round-trips exact state, editable JSON, archives, trash and original media', async () => {
  const d = await db(),
    bytes = new Uint8Array([0, 1, 2, 255]),
    digest = await sha256(bytes.buffer);
  await d.commit(
    {
      id: 'photo',
      at: 1,
      edit: {
        type: 'put',
        entity: {
          kind: 'page',
          id: '2026-10-28',
          date: '2026-10-28',
          lines: [{ id: 'l', t: 'ink', sk: [{ c: '#fff', w: 2, p: [[0.2, 0.3]] }] }],
          strokes: [],
          attachments: [digest],
        },
      },
    },
    undefined,
    [{ id: digest, digest, blob: new Blob([bytes], { type: 'image/png' }) }],
  );
  await d.commit({ id: 'delete', at: 2, edit: { type: 'delete', keys: ['page:2026-10-28'] } });
  const p = await previewBackup(await exportBackup(d));
  assert.equal(canonical(p.state), canonical(await d.load()));
  assert.deepEqual(new Uint8Array(await p.media[0]!.blob.arrayBuffer()), bytes);
});
test('corruption, missing media and future versions fail without touching destination', async () => {
  const d = await db();
  await d.commit(command('a'));
  const raw = await exportBackup(d),
    v = JSON.parse(raw);
  v.payload.state.entities['history:a'].value = 'tampered';
  await assert.rejects(previewBackup(JSON.stringify(v)), /checksum/);
  v.version = 2;
  await assert.rejects(previewBackup(JSON.stringify(v)), /Unsupported/);
  assert.equal(Object.keys((await d.load()).entities).length, 1);
});
test('preview is read-only; merge keeps local records and uses an atomic verified pre-import point', async () => {
  const d = await db();
  await d.commit(command('local'));
  const before = canonical(await d.load()),
    p = await incoming();
  planImport(await d.load(), p, 'merge');
  assert.equal(canonical(await d.load()), before);
  await applyImport(d, p, 'merge', before);
  assert.deepEqual(Object.keys((await d.load()).entities).sort(), [
    'history:local',
    'history:remote',
  ]);
  const points = await d.recoveryPoints();
  assert.equal(points.length, 1);
  assert.equal(canonical(await d.recoverySnapshot(points[0]!.id)), before);
});
test('replace preserves an external source archive and local pre-replace recovery after reopen', async () => {
  const factory = new IDBFactory(),
    d = await openLogbook(factory, 'replace');
  await d.commit(command('local'));
  const before = canonical(await d.load());
  const r = await applyImport(d, await incoming(), 'replace', before);
  d.close();
  const reopened = await openLogbook(factory, 'replace');
  assert.deepEqual(Object.keys((await reopened.load()).entities), ['history:remote']);
  assert.equal(canonical(await reopened.recoverySnapshot('restore:' + r.operation.id)), before);
  await reopened.commit({
    id: 'undo',
    at: Date.now(),
    edit: { type: 'restore', deletion: r.operation.id },
  });
  assert.ok((await reopened.load()).entities['history:local']);
});
test('merge conflicts and deletion barriers require individual explicit choices', async () => {
  const d = await db();
  await d.commit(command('a'));
  const p = await incoming('a');
  p.state.entities['history:a'] = entity('a', 'changed');
  assert.deepEqual(planImport(await d.load(), p, 'merge').conflicts, ['history:a']);
  const local = planImport(await d.load(), p, 'merge', { 'history:a': 'local' });
  assert.equal(canonical(local.state.entities['history:a']), canonical(entity('a')));
  await d.commit({ id: 'del', at: Date.now(), edit: { type: 'delete', keys: ['history:a'] } });
  assert.deepEqual(planImport(await d.load(), p, 'merge').conflicts, ['history:a']);
  assert.equal(
    planImport(await d.load(), p, 'merge', { 'history:a': 'local' }).state.entities['history:a'],
    undefined,
  );
});
test('stale preview, mutated preview and unresolved conflicts cannot write', async () => {
  const d = await db(),
    p = await incoming(),
    baseline = canonical(await d.load());
  await d.commit(command('new'));
  await assert.rejects(applyImport(d, p, 'replace', baseline), /changed since preview/);
  const fresh = canonical(await d.load());
  p.state.entities['history:remote'] = entity('remote', 'forged');
  await assert.rejects(applyImport(d, p, 'merge', fresh), /Preview changed/);
  assert.equal((await d.recoveryPoints()).length, 0);
});
test('recovery write failure aborts the entire import, including blobs and receipts', async () => {
  const d = await db(),
    p = await incoming(),
    baseline = canonical(await d.load());
  const original = IDBObjectStore.prototype.add;
  IDBObjectStore.prototype.add = function (...args: Parameters<typeof original>) {
    if (this.name === 'recovery') throw new DOMException('Synthetic quota', 'QuotaExceededError');
    return original.apply(this, args);
  };
  try {
    await assert.rejects(applyImport(d, p, 'replace', baseline), /quota/);
  } finally {
    IDBObjectStore.prototype.add = original;
  }
  assert.equal(canonical(await d.load()), baseline);
  assert.equal((await d.pending()).length, 0);
  assert.equal((await d.recoveryPoints()).length, 0);
});
test('legacy backup review preserves unknown fields, exact source and explicit streak choices', async () => {
  const raw = JSON.stringify({
    name: 'Legacy',
    docks: [{ id: 'work', n: 'Renamed', p: null }],
    entries: [],
    unknown: { keep: 'all' },
  });
  const p = await previewBackup(raw);
  assert.ok(p.review.includes('exclusion:work'));
  const d = await db();
  await assert.rejects(applyImport(d, p, 'replace', canonical(await d.load())), /review required/);
  const reviewed = await previewBackup(raw, { work: true });
  await applyImport(d, reviewed, 'merge', canonical(await d.load()));
  assert.equal((await d.load()).entities['deck:work']?.kind, 'deck');
  assert.ok(canonical((await d.load()).archive).includes('unknown'));
});
test('recovery verifies hashes, retains five snapshots and rescues corrupted replay without discarding retained history', async () => {
  const factory = new IDBFactory(),
    d = await openLogbook(factory, 'rescue');
  await d.commit(command('safe'));
  for (let i = 0; i < 7; i++) await d.recovery('p' + i, 'manual');
  assert.equal((await d.recoveryPoints()).length, 5);
  const opening = factory.open('rescue', 2);
  const raw = await new Promise<IDBDatabase>((resolve, reject) => {
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
  await new Promise<void>((resolve) => {
    const tx = raw.transaction('recovery', 'readwrite');
    const read = tx.objectStore('recovery').get('p6');
    read.onsuccess = () =>
      tx.objectStore('recovery').put({ ...read.result, id: 'old-command-id' }, 'p6');
    tx.oncomplete = () => resolve();
  });
  assert.ok((await d.recoveryPoints()).some((p) => p.id === 'p6'));
  await new Promise<void>((resolve, reject) => {
    const tx = raw.transaction('tail', 'readwrite');
    tx.objectStore('tail').clear();
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  await assert.rejects(d.load(), /mismatch/);
  await d.rescueRecovery('p6');
  assert.ok((await d.load()).entities['history:safe']);
  const retained = await d.exportRetained();
  assert.ok(
    retained.migration!.values.some((v: any) => v.reason === 'Before explicit local rescue'),
  );
  raw.close();
});

test('backup rejects missing or corrupted original media even with a recomputed envelope checksum', async () => {
  const d = await db(),
    bytes = new Uint8Array([12, 34, 56]),
    digest = await sha256(bytes.buffer);
  await d.commit(
    {
      id: 'media',
      at: 1,
      edit: {
        type: 'put',
        entity: {
          kind: 'page',
          id: '2026-10-28',
          date: '2026-10-28',
          lines: [],
          strokes: [],
          attachments: [digest],
        },
      },
    },
    undefined,
    [{ id: digest, digest, blob: new Blob([bytes], { type: 'image/png' }) }],
  );
  const { textDigest } = await import('../../packages/persistence/src/media.ts');
  const value = JSON.parse(await exportBackup(d));
  const media = value.payload.media;
  value.payload.media = [];
  value.digest = await textDigest(canonical(value.payload));
  await assert.rejects(previewBackup(JSON.stringify(value)), /attachment missing/);
  value.payload.media = media;
  value.payload.media[0].data = btoa('wrong bytes');
  value.digest = await textDigest(canonical(value.payload));
  await assert.rejects(previewBackup(JSON.stringify(value)), /Media checksum/);
});

test('corrupted recovery media blocks restore and rescue while retained history stays untouched', async () => {
  const factory = new IDBFactory(),
    d = await openLogbook(factory, 'bad-media'),
    bytes = new Uint8Array([1, 2, 3]),
    digest = await sha256(bytes.buffer);
  await d.commit(
    {
      id: 'photo',
      at: 1,
      edit: {
        type: 'put',
        entity: {
          kind: 'page',
          id: '2026-10-28',
          date: '2026-10-28',
          lines: [],
          strokes: [],
          attachments: [digest],
        },
      },
    },
    undefined,
    [{ id: digest, digest, blob: new Blob([bytes], { type: 'image/png' }) }],
  );
  await d.recovery('safe', 'manual');
  const r = factory.open('bad-media', 2),
    raw = await new Promise<IDBDatabase>((resolve) => (r.onsuccess = () => resolve(r.result)));
  await new Promise<void>((resolve) => {
    const tx = raw.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put({ id: digest, digest, blob: new Blob(['corrupt']) }, digest);
    tx.oncomplete = () => resolve();
  });
  const before = await d.exportRetained();
  await assert.rejects(d.recoverySnapshot('safe'), /corrupted/);
  await assert.rejects(d.rescueRecovery('safe'), /corrupted/);
  const after = await d.exportRetained();
  assert.equal(canonical(before.meta), canonical(after.meta));
  assert.equal(canonical(before.tail), canonical(after.tail));
  assert.equal(after.migration!.values.length, 0);
  raw.close();
});
