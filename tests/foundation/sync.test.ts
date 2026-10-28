import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
import { SyncEngine, readManifest } from '../../apps/web/src/sync-engine.ts';
import {
  DropboxPort,
  beginDropbox,
  finishDropbox,
  productionPath,
} from '../../packages/sync-providers/src/dropbox.ts';
import type { CloudFile, CloudPort } from '../../packages/sync-providers/src/dropbox.ts';
import { reconcile } from '../../packages/sync-core/src/reconcile.ts';
import {
  setupContent,
  unlockContent,
  encryptContent,
  decryptContent,
} from '../../packages/crypto/src/content.ts';
import { canonical } from '../../packages/domain/src/logbook.ts';
import { sha256 } from '../../packages/persistence/src/media.ts';

class Cloud implements CloudPort {
  legacy: string | null = null;
  async legacyRevision() {
    return this.legacy;
  }
  file: CloudFile | null = null;
  failAfterWrite = false;
  failRead = false;
  writes = 0;
  async read() {
    if (this.failRead) throw Error('offline');
    return structuredClone(this.file);
  }
  async write(raw: string, revision: string | null) {
    if ((this.file?.revision ?? null) !== revision) throw Error('CAS conflict');
    const next = String(++this.writes);
    this.file = { raw, revision: next };
    if (this.failAfterWrite) {
      this.failAfterWrite = false;
      throw Error('connection lost after commit');
    }
    return next;
  }
}
const db = () => openLogbook(new IDBFactory(), 'sync', crypto.randomUUID());
async function put(d: Awaited<ReturnType<typeof db>>, id: string, value: string) {
  return d.commit({
    id: crypto.randomUUID(),
    at: 1,
    edit: { type: 'put', entity: { kind: 'history', id, value } },
  });
}
async function sync(d: Awaited<ReturnType<typeof db>>, c: Cloud) {
  const e = new SyncEngine(d, c);
  return e.apply(await e.preview());
}
test('plain first-device join previews before mutation, verifies receipt and survives restart', async () => {
  const a = await db(),
    b = await db(),
    c = new Cloud();
  await put(a, 'a', 'alpha');
  await sync(a, c);
  assert.equal((await a.pending()).length, 0);
  await put(b, 'b', 'beta');
  const e = new SyncEngine(b, c),
    p = await e.preview();
  assert.equal((await b.load()).entities['history:a'], undefined);
  await e.apply(p);
  assert.deepEqual(Object.keys((await b.load()).entities).sort(), ['history:a', 'history:b']);
  await sync(a, c);
  assert.equal((await a.load()).entities['history:b']?.value, 'beta');
  assert.equal((await a.pending()).length, 0);
  assert.ok((await b.recoveryPoints()).length);
  assert.ok(Object.keys((await b.exportRetained()).migration!.values).length);
});
test('three-way independent fields merge; concurrent opaque fields and deletion/edit need review', () => {
  const base = { a: { title: 'old', colour: 'blue' } };
  assert.deepEqual(
    reconcile({ a: { title: 'new', colour: 'blue' } }, { a: { title: 'old', colour: 'red' } }, base)
      .entities.a,
    { title: 'new', colour: 'red' },
  );
  assert.deepEqual(reconcile({}, { a: { title: 'new', colour: 'blue' } }, base).conflicts, ['a']);
  assert.deepEqual(reconcile({ a: { x: 1 } }, { a: { x: 2 } }, null).conflicts, ['a']);
});
test('concurrent conflict preserves both copies until explicit choice and verified recovery', async () => {
  const a = await db(),
    b = await db(),
    c = new Cloud();
  await put(a, 'x', 'base');
  await sync(a, c);
  await sync(b, c);
  await sync(a, c);
  await put(a, 'x', 'local');
  await put(b, 'x', 'cloud');
  await sync(b, c);
  const e = new SyncEngine(a, c),
    p = await e.preview();
  assert.deepEqual(e.plan(p).conflicts, ['history:x']);
  await assert.rejects(e.apply(p), /Resolve conflicts/);
  assert.equal((await a.load()).entities['history:x']?.value, 'local');
  await e.apply(p, { 'history:x': 'cloud' });
  assert.equal((await a.load()).entities['history:x']?.value, 'cloud');
  assert.ok((await a.recoveryPoints()).length);
});
test('interrupted upload does not acknowledge until a byte-exact cloud read-back', async () => {
  const a = await db(),
    c = new Cloud(),
    e = new SyncEngine(a, c);
  await put(a, 'x', 'kept');
  c.failAfterWrite = true;
  await assert.rejects(e.apply(await e.preview()), /connection lost/);
  assert.equal((await a.pending()).length, 1);
  c.failRead = true;
  await assert.rejects(e.preview());
  assert.equal((await a.pending()).length, 1);
  c.failRead = false;
  await e.preview();
  assert.equal((await a.pending()).length, 0);
});
test('cloud revision races and stale local previews never upload or acknowledge', async () => {
  const a = await db(),
    c = new Cloud(),
    e = new SyncEngine(a, c);
  const p = await e.preview();
  await put(a, 'x', 'later');
  await assert.rejects(e.apply(p), /Local copy changed/);
  assert.equal(c.writes, 0);
  await sync(a, c);
  const q = await e.preview();
  c.file!.revision = 'raced';
  await assert.rejects(e.apply(q), /Preview changed|Dropbox changed/);
});
test('future versions, missing known cloud generation, downgrade and mutated previews fail closed', async () => {
  assert.throws(
    () =>
      readManifest(
        JSON.stringify({
          format: 'slb-sync',
          protocol: 2,
          reader: 2,
          generation: crypto.randomUUID(),
          mode: 'plain',
          payload: '',
        }),
      ),
    /Unsupported/,
  );
  const a = await db(),
    c = new Cloud(),
    e = new SyncEngine(a, c);
  await put(a, 'x', 'keep');
  const p = await e.preview();
  p.local.state.entities = {};
  await assert.rejects(e.apply(p), /Preview changed/);
  assert.equal(c.writes, 0);
  await sync(a, c);
  const file = structuredClone(c.file);
  c.file = null;
  await assert.rejects(e.preview(), /generation/);
  c.file = file;
  const m = JSON.parse(c.file!.raw);
  m.reader = 99;
  c.file!.raw = JSON.stringify(m);
  await assert.rejects(e.preview(), /Unsupported cloud/);
});
test('recovery/quota failure aborts before local merge and cloud write', async () => {
  const a = await db(),
    b = await db(),
    c = new Cloud();
  await put(a, 'a', 'source');
  await sync(a, c);
  await put(b, 'b', 'keep');
  const e = new SyncEngine(b, c),
    p = await e.preview(),
    original = IDBObjectStore.prototype.add;
  IDBObjectStore.prototype.add = function (...args: Parameters<typeof original>) {
    if (this.name === 'recovery') throw Error('quota');
    return original.apply(this, args);
  };
  try {
    await assert.rejects(e.apply(p), /quota/);
  } finally {
    IDBObjectStore.prototype.add = original;
  }
  assert.equal((await b.load()).entities['history:a'], undefined);
  assert.equal(c.writes, 1);
});
test('rescue clears old continuity; stale deleted content requires first-join review', async () => {
  const a = await db(),
    b = await db(),
    c = new Cloud();
  await put(a, 'x', 'old');
  await sync(a, c);
  await sync(b, c);
  await a.recovery('point', 'test');
  await a.commit({ id: 'deleted', at: 2, edit: { type: 'delete', keys: ['history:x'] } });
  await sync(a, c);
  await a.rescueRecovery('point');
  assert.equal(await a.syncJournal(), undefined);
  const e = new SyncEngine(a, c),
    p = await e.preview();
  assert.deepEqual(e.plan(p).conflicts, ['history:x']);
  await assert.rejects(e.apply(p), /Resolve conflicts/);
});
test('full-content encryption, recovery, wrong secrets, tampering and policy survive without silent plain fallback', async () => {
  const a = await db(),
    b = await db(),
    c = new Cloud(),
    kit = await setupContent('synthetic long passphrase');
  const key = await unlockContent(kit.setup, kit.code, true);
  const probe = await encryptContent('secret photo and notebook', key, kit.setup, kit.setup.id);
  assert.equal(
    await decryptContent(
      probe,
      await unlockContent(kit.setup, 'synthetic long passphrase'),
      kit.setup,
      kit.setup.id,
    ),
    'secret photo and notebook',
  );
  await assert.rejects(unlockContent(kit.setup, 'incorrect secret'));
  await assert.rejects(unlockContent(kit.setup, kit.code.slice(0, -1) + 'x', true));
  await assert.rejects(decryptContent(probe, key, kit.setup, crypto.randomUUID()));
  await put(a, 'x', 'personal notebook');
  await a.saveKeyPolicy(kit.setup);
  const e = new SyncEngine(a, c);
  await assert.rejects(e.apply(await e.preview()), /encryption is locked/);
  await e.apply(await e.preview(), {}, { setup: kit.setup, key });
  assert.ok(!c.file!.raw.includes('personal notebook'));
  assert.equal(readManifest(c.file!.raw).mode, 'encrypted');
  const f = new SyncEngine(b, c);
  await assert.rejects(f.preview(), /locked/);
  await f.apply(await f.preview(key), {}, { setup: kit.setup, key });
  assert.equal((await b.load()).entities['history:x']?.value, 'personal notebook');
  const manifest = readManifest(c.file!.raw);
  manifest.mode = 'plain';
  delete manifest.setup;
  c.file!.raw = JSON.stringify(manifest);
  await assert.rejects(e.preview(), /downgrade/);
});
test('Dropbox keeps create-only/update revision intent and classifies errors without content leakage', async () => {
  const requests: RequestInit[] = [];
  const port = new DropboxPort(
    () => 'synthetic',
    async (_url, init) => {
      requests.push(init!);
      return new Response(JSON.stringify({ rev: 'r' }), { status: 200 });
    },
  );
  await port.write('synthetic payload', null);
  await port.write('next', 'old');
  const arg = (i: number) =>
    JSON.parse((requests[i]!.headers as Record<string, string>)['Dropbox-API-Arg']!);
  assert.equal(arg(0).path, productionPath);
  assert.equal(arg(0).mode['.tag'], 'add');
  assert.equal(arg(0).autorename, false);
  assert.equal(arg(1).mode.update, 'old');
  assert.equal(arg(1).strict_conflict, true);
  const missing = new DropboxPort(
    () => '',
    async () =>
      new Response(JSON.stringify({ error: { '.tag': 'path', path: { '.tag': 'not_found' } } }), {
        status: 409,
      }),
  );
  assert.equal(await missing.read(), null);
  const denied = new DropboxPort(
    () => '',
    async () => new Response('personal text', { status: 401 }),
  );
  await assert.rejects(denied.read(), /401/);
  await assert.rejects(denied.write('x', null), /401/);
});
test('PKCE uses S256, expiring state-bound code exchange, never a client secret', async () => {
  const p = await beginDropbox('syntheticapp', 'http://localhost/?phase=9');
  assert.equal(new URL(p.url).searchParams.get('code_challenge_method'), 'S256');
  await assert.rejects(
    finishDropbox(p, 'code', 'wrong', async () => {
      throw Error('must not call');
    }),
    /state mismatch/,
  );
  const result = await finishDropbox(p, 'code', p.state, async (_url, init) => {
    assert.equal((init!.body as URLSearchParams).get('code_verifier'), p.verifier);
    assert.equal((init!.body as URLSearchParams).has('client_secret'), false);
    return new Response(JSON.stringify({ access_token: 'fake', expires_in: 100 }));
  });
  assert.equal(result.token, 'fake');
});
test('legacy revision changes require reviewed cutover and never modify the old file', async () => {
  const a = await db(),
    c = new Cloud(),
    e = new SyncEngine(a, c);
  c.legacy = 'old-v8-1';
  const p = await e.preview();
  await assert.rejects(e.apply(p), /Legacy cloud changed/);
  await e.apply(p, {}, undefined, undefined, true);
  c.legacy = 'old-v8-2';
  const q = await e.preview();
  await assert.rejects(e.apply(q), /Legacy cloud changed/);
  assert.equal(c.writes, 1);
});
test('verified media travels unchanged through encrypted full content and remains locally recoverable', async () => {
  const a = await db(),
    b = await db(),
    c = new Cloud(),
    kit = await setupContent('synthetic media passphrase');
  const bytes = new Uint8Array([1, 3, 7, 255]),
    id = await sha256(bytes.buffer);
  await a.commit(
    {
      id: 'photo',
      at: 1,
      edit: {
        type: 'put',
        entity: {
          kind: 'page',
          id: 'page',
          date: '2026-10-29',
          lines: [{ t: 'kept editable' }],
          strokes: [{ c: '#123456', w: 2, p: [[0, 1]] }],
          attachments: [id],
        },
      },
    },
    undefined,
    [{ id, digest: id, blob: new Blob([bytes], { type: 'image/png' }) }],
  );
  const encryption = { setup: kit.setup, key: kit.key },
    e = new SyncEngine(a, c),
    f = new SyncEngine(b, c);
  await e.apply(await e.preview(), {}, encryption);
  assert.ok(!c.file!.raw.includes('kept editable'));
  assert.ok(!c.file!.raw.includes(id));
  await f.apply(await f.preview(kit.key), {}, encryption);
  assert.deepEqual(new Uint8Array(await (await b.attachment(id)).blob.arrayBuffer()), bytes);
  assert.deepEqual((await b.load()).entities['page:page'], (await a.load()).entities['page:page']);
});
test('returning stale device honors deletion after sync and explicit join reset retains pending operations', async () => {
  const a = await db(),
    b = await db(),
    c = new Cloud();
  await put(a, 'x', 'old');
  await sync(a, c);
  const deletedFile = structuredClone(c.file);
  await sync(b, c);
  await a.commit({ id: 'remove', at: 2, edit: { type: 'delete', keys: ['history:x'] } });
  await sync(a, c);
  const emptyDevice = await db();
  await sync(emptyDevice, c);
  assert.ok(JSON.parse(readManifest(c.file!.raw).payload).payload.state.tombstones['history:x']);
  const unjoinedStale = await db();
  await put(unjoinedStale, 'x', 'old');
  const staleEngine = new SyncEngine(unjoinedStale, c);
  assert.deepEqual(staleEngine.plan(await staleEngine.preview()).conflicts, ['history:x']);
  await sync(b, c);
  assert.equal((await b.load()).entities['history:x'], undefined);
  await put(b, 'pending', 'keep');
  const before = await b.pending();
  await assert.rejects(b.resetSyncJoin('stale'), /Local copy changed/);
  await b.resetSyncJoin(canonical(await b.load()));
  assert.equal(await b.syncJournal(), undefined);
  assert.deepEqual(await b.pending(), before);
  // Dropbox restore/history can replay an earlier snapshot without changing generation.
  // A known device must not infer that a previously deleted entity is a new remote addition.
  const restored = JSON.parse(deletedFile!.raw),
    savedState = JSON.parse(restored.payload);
  savedState.payload.state.entities['history:x'] = {
    kind: 'history',
    id: 'x',
    value: 'rolled back',
  };
  delete savedState.payload.state.tombstones['history:x'];
  const { textDigest } = await import('../../packages/persistence/src/media.ts');
  savedState.digest = await textDigest(canonical(savedState.payload));
  restored.payload = JSON.stringify(savedState);
  c.file = { revision: 'rolled-back', raw: JSON.stringify(restored) };
  const engine = new SyncEngine(a, c),
    preview = await engine.preview();
  assert.deepEqual(engine.plan(preview).conflicts, ['history:x']);
  await assert.rejects(engine.apply(preview), /Resolve conflicts/);
});
test('joining distinct archives stabilizes rather than recursively nesting copies on every sync', async () => {
  const a = await db(),
    b = await db(),
    c = new Cloud();
  const local = await a.load(),
    remote = await b.load();
  local.archive = { opaque: 'a' };
  remote.archive = { opaque: 'b' };
  await a.commit({ id: 'archive-a', at: 1, edit: { type: 'recover', snapshot: local } });
  await b.commit({ id: 'archive-b', at: 1, edit: { type: 'recover', snapshot: remote } });
  await sync(a, c);
  await sync(b, c);
  await sync(a, c);
  const expected = canonical((await a.load()).archive);
  await sync(b, c);
  await sync(a, c);
  assert.equal(canonical((await a.load()).archive), expected);
  assert.equal(canonical((await b.load()).archive), expected);
});
test('edit or cancellation after upload keeps receipts pending and never reports successful sync', async () => {
  const a = await db(),
    c = new Cloud();
  await put(a, 'x', 'before');
  const port: CloudPort = {
    read: () => c.read(),
    write: async (raw, revision) => {
      const result = await c.write(raw, revision);
      await put(a, 'later', 'after');
      return result;
    },
  };
  const e = new SyncEngine(a, port);
  await assert.rejects(e.apply(await e.preview()), /Local copy changed/);
  assert.equal((await a.pending()).length, 2);
  const signal = new AbortController(),
    b = await db(),
    next = new Cloud();
  await put(b, 'b', 'kept');
  const cancelPort: CloudPort = {
    read: () => next.read(),
    write: async (raw, revision) => {
      const result = await next.write(raw, revision);
      signal.abort();
      return result;
    },
  };
  const f = new SyncEngine(b, cancelPort);
  await assert.rejects(f.apply(await f.preview(), {}, undefined, signal.signal), /interrupted/);
  assert.equal((await b.pending()).length, 1);
});
