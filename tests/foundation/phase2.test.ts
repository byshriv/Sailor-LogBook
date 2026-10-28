import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import {
  applyEdit,
  blankLogbook,
  canonical,
  loggedMinutes,
  splitMidnight,
  validateLogbook,
} from '../../packages/domain/src/logbook.ts';
import type { Activity, Deck, EditCommand, Logbook } from '../../packages/domain/src/logbook.ts';
import { openLogbook, OperationPipeline } from '../../packages/persistence/src/logbook.ts';
import { migrateV8, previewV8 } from '../../packages/persistence/src/migration.ts';
import { preparePhoto, sha256 } from '../../packages/persistence/src/media.ts';

const deck = (id: string, parent: string | null = null, excludeFromStreak = false): Deck => ({
  kind: 'deck',
  id,
  name: id,
  parent,
  excludeFromStreak,
});
const activity = (
  id: string,
  start = 540,
  end = 600,
  category: string | null = null,
): Activity => ({
  kind: 'activity',
  id,
  title: id,
  deck: category,
  zone: null,
  segments: splitMidnight('2026-10-28', start, end),
  attachments: [],
});
const put = (id: string): EditCommand => ({
  id,
  at: 1,
  edit: { type: 'put', entity: activity(id) },
});
function fixture() {
  return {
    name: 'Synthetic sailor',
    full: 'Synthetic only',
    ob: 1,
    out: 0,
    docks: [
      { id: 'work', n: 'Work', c: '#226192' },
      { id: 'sub', n: 'Sub', p: 'work', c: '#226192' },
      { id: 'leaf', n: 'Leaf', p: 'sub', c: '#226192' },
      { id: 'wasted', n: 'Time Wasted', c: '#226192' },
    ],
    entries: [
      {
        id: 'midnight',
        t: 'Night',
        d: 'leaf',
        date: '2026-10-28',
        s: 1380,
        e: 1500,
        photo: 'data:image/png;base64,AQID',
        tg: { voy: 1 },
        pct: 25,
        futureField: { keep: true },
      },
      {
        id: 'dst',
        t: 'Repeated hour',
        d: 'work',
        date: '2026-11-01',
        s: 60,
        e: 120,
        zone: 'America/New_York',
        offset: -240,
      },
    ],
    tasks: [
      {
        id: 'planned',
        t: 'Must do',
        d: 'work',
        date: '2026-10-28',
        st: 'todo',
        time: null,
        dur: 60,
        must: 1,
        low: 1,
        wait: 'Somebody',
        man: 1,
      },
    ],
    best: Array.from({ length: 6 }, (_, i) => ({
      id: 'b' + i,
      date: '2026-10-28',
      t: 'Moment ' + i,
      ref: 'midnight',
    })),
    nb: {
      '2026-10-28': {
        lines: [
          {
            id: 'line',
            t: 'Editable',
            bt: 'b0',
            sk: [{ c: '#226192', w: 2, p: [[1, 2]] }],
            dd: 'data:image/png;base64,AQID',
          },
        ],
        draw: '',
        fsk: [{ c: '#226192', w: 2, p: [[3, 4]] }],
      },
    },
    pre: [{ t: 'No duration', d: 'leaf', dur: 0 }, 'Old string preset'],
    bt: ['2026-10-28'],
    seen: { '2026-10': ['2026-10-28'] },
    ach: { maiden: 1, bright: 1, sent: 1, fair: 1, open: 1, bells: 1, seasoned: 1 },
    les: [{ id: 'l', date: '2026-10-28', t: 'Lesson' }],
    grat: [{ id: 'g', date: '2026-10-28', t: 'Gratitude' }],
    mood: { '2026-10-28': 3 },
    order: ['best', 'must'],
    hide: ['stats'],
    rorder: ['mood'],
    rhide: [],
    pf: { snd: 0, hap: 1, dl: 45, ws: 1, h24: 0 },
    sync: { on: 1, enc: 1, last: 42 },
    unknownTop: { deleted: ['old-id'], conflicts: [{ original: 'retained alternative' }] },
  };
}
const options = {
  maxSourceBytes: 10_000_000,
  maxAttachmentBytes: 1_000_000,
  exclusion: { work: false, sub: false, leaf: false },
};
const backup = async (_raw: string, digest: string) => digest;

test('three levels, cycle rejection, union minutes, inherited exclusions, planned is not logged', () => {
  const s = blankLogbook();
  for (const e of [
    deck('root', null, true),
    deck('child', 'root'),
    deck('leaf', 'child'),
    activity('a', 540, 600),
    activity('b', 570, 660),
    activity('excluded', 660, 720, 'leaf'),
  ])
    s.entities[e.kind + ':' + e.id] = e;
  validateLogbook(s);
  assert.equal(loggedMinutes(s, '2026-10-28'), 180);
  assert.equal(loggedMinutes(s, '2026-10-28', true), 120);
  assert.throws(
    () =>
      applyEdit(s, { id: 'fourth', at: 1, edit: { type: 'put', entity: deck('fourth', 'leaf') } }),
    /depth/,
  );
  assert.throws(
    () => applyEdit(s, { id: 'cycle', at: 1, edit: { type: 'put', entity: deck('root', 'leaf') } }),
    /cycle/,
  );
  const midnight = splitMidnight('2024-02-29', 1380, 1500, 330);
  assert.deepEqual(
    midnight.map((p) => p.date),
    ['2024-02-29', '2024-03-01'],
  );
  assert.throws(() => splitMidnight('2026-02-30', 0, 60));
});

test('deck reassignment and linked activity deletion are one reversible command with 30-day policy', () => {
  let s = blankLogbook();
  for (const e of [deck('root'), deck('child', 'root'), activity('a', 1380, 1500, 'root')])
    s.entities[e.kind + ':' + e.id] = e;
  const original = canonical(s.entities);
  s = applyEdit(s, {
    id: 'remove',
    at: 10,
    edit: { type: 'deck.remove', id: 'root', reassign: null },
  });
  assert.equal((s.entities['activity:a'] as Activity).deck, null);
  s = applyEdit(s, { id: 'undo', at: 20, edit: { type: 'restore', deletion: 'remove' } });
  assert.equal(canonical(s.entities), original);
  s = applyEdit(s, { id: 'delete', at: 30, edit: { type: 'delete', keys: ['activity:a'] } });
  assert.equal(s.tombstones['activity:a'], 'delete');
  assert.throws(
    () => applyEdit(s, { id: 'resurrect', at: 40, edit: { type: 'put', entity: activity('a') } }),
    /Restore/,
  );
  assert.throws(
    () =>
      applyEdit(s, {
        id: 'late',
        at: 30 + 30 * 86400000,
        edit: { type: 'restore', deletion: 'delete' },
      }),
    /expired/,
  );
  assert.equal(
    (
      applyEdit(s, { id: 'undo-delete', at: 50, edit: { type: 'restore', deletion: 'delete' } })
        .entities['activity:a'] as Activity
    ).segments.length,
    2,
  );
});

test('durable actor, duplicate receipt across compaction, pending acknowledgement and restart', async () => {
  const f = new IDBFactory();
  let db = await openLogbook(f, 'causal', 'actor');
  const commits = await Promise.all([db.commit(put('a')), db.commit(put('b'))]);
  // Hashing precedes the transaction: simultaneous requests may commit in either
  // order. Exercise a noncontiguous acknowledgement using actual causal order.
  const ordered = commits.sort((a, b) => a.operation.sequence - b.operation.sequence);
  assert.equal((await db.pending()).length, 2);
  assert.deepEqual(await db.checkpoint(), { revision: 0, retained: 2 });
  await db.acknowledge([ordered[1]!.operation.id]);
  assert.equal((await db.checkpoint()).revision, 0);
  await db.acknowledge([ordered[0]!.operation.id]);
  assert.equal((await db.checkpoint()).revision, 2);
  db.close();
  db = await openLogbook(f, 'causal', 'another-actor');
  assert.equal(await db.actor(), 'actor');
  assert.equal((await db.commit(put('a'))).duplicate, true);
  const c = await db.commit(put('c'));
  assert.equal(c.operation.sequence, 3);
  assert.deepEqual(c.operation.clock, { actor: 3 });
  assert.equal(Object.keys((await db.load()).entities).length, 3);
  await assert.rejects(db.commit({ ...put('a'), at: 2 }), /reused/);
  db.close();
});

test('remote replay has no capture, dependency gaps and concurrent branches fail closed', async () => {
  const a = await openLogbook(new IDBFactory(), 'a', 'a'),
    b = await openLogbook(new IDBFactory(), 'b', 'b');
  const op = (await a.commit(put('one'))).operation;
  let schedules = 0;
  const pipeline = new OperationPipeline(
    b,
    () => {},
    () => schedules++,
  );
  await pipeline.save(op.command, op);
  assert.equal(schedules, 0);
  assert.equal((await b.pending()).length, 0);
  const own = (await b.commit(put('two'))).operation;
  assert.deepEqual(own.clock, { a: 1, b: 1 });
  await a.commit(put('branch'));
  await assert.rejects(a.commit(own.command, own), /review/);
  await assert.rejects(
    b.commit(put('gap'), { ...op, id: 'gap', sequence: 3, clock: { a: 3 }, command: put('gap') }),
    /sequence/,
  );
  a.close();
  b.close();
});

test('queued input snapshots, duplicate effects and failed commands preserve state', async () => {
  const db = await openLogbook(new IDBFactory());
  let schedules = 0;
  const p = new OperationPipeline(
      db,
      () => {},
      () => schedules++,
    ),
    input = put('snapshot');
  const saving = p.save(input);
  input.at = 99;
  await saving;
  await p.save(put('snapshot'));
  assert.equal(schedules, 1);
  await assert.rejects(
    p.save({
      id: 'invalid',
      at: 1,
      edit: { type: 'put', entity: activity('invalid', 0, 1, 'missing') },
    }),
  );
  assert.equal(schedules, 1);
  assert.equal((await db.pending()).length, 1);
  db.close();
});

test('full synthetic v8 preview preserves every source byte, field, entity and media byte', async () => {
  const source = fixture(),
    raw = JSON.stringify(source, null, 2),
    plan = await previewV8(raw, options);
  assert.equal(plan.counts.activity, 2);
  assert.equal(plan.counts.moment, 6);
  assert.equal(plan.blobs.length, 1);
  assert.equal(plan.blobs[0].paths.length, 2);
  assert.deepEqual(plan.review, ['featured:2026-10-28']);
  assert.deepEqual(plan.unknown, ['unknownTop']);
  const page = plan.state.entities['page:2026-10-28'];
  assert.equal(page.kind, 'page');
  if (page.kind === 'page') {
    assert.equal(page.lines.length, 6);
    assert.equal(page.strokes.length, 1);
  }
  assert.equal((plan.state.entities['preset:legacy-0'] as { duration: number }).duration, 0);
  const db = await openLogbook(new IDBFactory());
  await migrateV8(db, plan, 'generation', backup);
  const archive = (await db.load()).archive as { source: unknown; raw: string };
  assert.deepEqual(archive.source, source);
  assert.equal(archive.raw, raw);
  assert.equal((await db.pending()).length, 0);
  assert.equal((await db.recoveryPoints()).length, 1);
  await db.commit(put('new-edit'));
  await migrateV8(db, plan, 'generation', backup);
  assert.ok((await db.load()).entities['activity:new-edit']);
  db.close();
});

test('empty/starter, review blockers, malformed input and explicit resource limits', async () => {
  const empty = await previewV8('{"entries":[],"docks":[]}', options);
  assert.equal(empty.counts.activity ?? 0, 0);
  const s = fixture();
  const ambiguous = await previewV8(JSON.stringify(s), { ...options, exclusion: {} });
  assert.ok(ambiguous.review.includes('exclusion:work'));
  const db = await openLogbook(new IDBFactory());
  await assert.rejects(migrateV8(db, ambiguous, 'g', backup), /review/);
  await assert.rejects(previewV8('{', options));
  await assert.rejects(previewV8('{"format":"slb-records","records":{}}', options));
  await assert.rejects(previewV8(JSON.stringify(s), { ...options, maxSourceBytes: 10 }), /size/);
  await assert.rejects(previewV8(JSON.stringify(s), { ...options, maxAttachmentBytes: 2 }), /size/);
  s.entries.push(s.entries[0]);
  await assert.rejects(previewV8(JSON.stringify(s), options), /Duplicate/);
  db.close();
});

test('backup failure aborts migration, interrupted stage resumes and nonempty destination is retained', async () => {
  const f = new IDBFactory(),
    plan = await previewV8(JSON.stringify(fixture()), options);
  let db = await openLogbook(f, 'resume');
  await assert.rejects(
    migrateV8(db, plan, 'g', async () => {
      throw Error('Download failed');
    }),
    /Download/,
  );
  assert.equal(Object.keys((await db.load()).entities).length, 0);
  const id = 'g:' + plan.digest;
  await db.stageMigration(id, plan.raw, plan.digest, plan.state, plan.blobs);
  db.close();
  db = await openLogbook(f, 'resume');
  await migrateV8(db, plan, 'g', backup);
  assert.equal((await db.migration(id)).complete, true);
  await assert.rejects(migrateV8(db, { ...plan, raw: plan.raw + ' ' }, 'bad', backup), /digest/);
  await assert.rejects(db.activateMigration(id, 'wrong'), /digest/);
  const other = await openLogbook(new IDBFactory());
  await other.commit(put('existing'));
  await assert.rejects(migrateV8(other, plan, 'g', backup), /Nonempty/);
  assert.ok((await other.load()).entities['activity:existing']);
  other.close();
  db.close();
});

test('photo output MIME, dimensions and memory caps; original bytes are opt-in; blob/operation atomicity', async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
  const limits = { inputBytes: 10, outputBytes: 10, pixels: 10000, longEdge: 100 };
  const codec = {
    inspect: async () => ({ width: 50, height: 50 }),
    webp: async () => new Blob(['webp'], { type: 'image/webp' }),
  };
  const compressed = await preparePhoto(blob, false, limits, codec);
  assert.equal(compressed.blob.type, 'image/webp');
  const original = await preparePhoto(blob, true, limits, codec);
  assert.equal(original.digest, await sha256(await blob.arrayBuffer()));
  await assert.rejects(
    preparePhoto(blob, false, limits, {
      ...codec,
      webp: async () => new Blob(['jpeg'], { type: 'image/jpeg' }),
    }),
    /WebP/,
  );
  await assert.rejects(preparePhoto(blob, true, { ...limits, pixels: 1 }, codec), /memory/);
  const db = await openLogbook(new IDBFactory());
  const entity = { ...activity('photo'), attachments: [original.id] };
  const c: EditCommand = { id: 'photo-save', at: 1, edit: { type: 'put', entity } };
  await assert.rejects(db.commit(c), /Missing attachment/);
  assert.equal((await db.pending()).length, 0);
  await db.commit(c, undefined, [original]);
  assert.ok(await db.attachment(original.id));
  assert.equal((await db.pending()).length, 1);
  db.close();
});

// Abort after writes have been queued: requests succeeding must never imply Saved.
test('quota abort rolls back operation/head, gateway retries and recovery failure leaves source intact', async () => {
  const f = new IDBFactory(),
    open = f.open.bind(f);
  let armed = false;
  f.open = (...args) => {
    const r = open(...args);
    r.addEventListener('success', () => {
      const transaction = r.result.transaction.bind(r.result);
      r.result.transaction = (...args) => {
        const tx = transaction(...args),
          store = tx.objectStore.bind(tx);
        tx.objectStore = (name) => {
          const s = store(name);
          if (armed && name === 'meta' && tx.mode === 'readwrite') {
            const put = s.put.bind(s);
            s.put = (...args) => {
              const result = put(...args);
              armed = false;
              tx.abort();
              throw new DOMException('Quota', 'QuotaExceededError');
            };
          }
          return s;
        };
        return tx;
      };
    });
    return r;
  };
  const db = await openLogbook(f);
  let scheduled = 0;
  const p = new OperationPipeline(
    db,
    () => {},
    () => scheduled++,
  );
  armed = true;
  await assert.rejects(p.save(put('abort')), /Quota/);
  assert.equal(scheduled, 0);
  assert.equal((await db.pending()).length, 0);
  assert.deepEqual(await db.load(), blankLogbook());
  assert.equal((await p.save(put('abort'))).operation.sequence, 1);
  db.close();
});

test('corruption fails closed while raw retained export remains available', async () => {
  const f = new IDBFactory(),
    db = await openLogbook(f, 'corrupt');
  await db.commit(put('one'));
  db.close();
  const r = f.open('corrupt', 2);
  await new Promise<void>((resolve) => {
    r.onsuccess = () => resolve();
  });
  const tx = r.result.transaction('meta', 'readwrite');
  tx.objectStore('meta').delete('head');
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });
  r.result.close();
  const broken = await openLogbook(f, 'corrupt');
  await assert.rejects(broken.load(), /recovery/);
  assert.ok((await broken.exportRetained()).tail);
  await assert.rejects(broken.commit(put('two')), /recovery/);
  broken.close();
});

test('reviewed rollover retains historical status and never changes logged time', async () => {
  const plan = await previewV8(JSON.stringify(fixture()), options);
  const s: Logbook = applyEdit(plan.state, {
    id: 'roll',
    at: 1,
    edit: { type: 'rollover', id: 'planned', date: '2026-10-29', status: 'todo' },
  });
  const task = s.entities['task:planned'];
  assert.equal(task.kind, 'task');
  if (task.kind === 'task')
    assert.deepEqual(task.history, [{ date: '2026-10-28', status: 'todo' }]);
  assert.equal(loggedMinutes(s, '2026-10-28'), 60);
  assert.equal(loggedMinutes(s, '2026-10-29'), 60);
});

test('explicit DST offsets count elapsed repeated/spring hours without travel reinterpretation', () => {
  const s = blankLogbook();
  const a = activity('first'),
    b = activity('second');
  a.segments = [{ date: '2026-11-01', start: 60, end: 120, offset: -240 }];
  b.segments = [{ date: '2026-11-01', start: 60, end: 120, offset: -300 }];
  s.entities['activity:first'] = a;
  s.entities['activity:second'] = b;
  validateLogbook(s);
  assert.equal(loggedMinutes(s, '2026-11-01'), 120);
  a.segments = [{ date: '2026-03-08', start: 90, end: 210, offset: -300, endOffset: -240 }];
  delete s.entities['activity:second'];
  validateLogbook(s);
  assert.equal(loggedMinutes(s, '2026-03-08'), 60);
  const prior = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Kolkata';
    assert.equal(loggedMinutes(s, '2026-03-08'), 60);
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(loggedMinutes(s, '2026-03-08'), 60);
  } finally {
    if (prior === undefined) delete process.env.TZ;
    else process.env.TZ = prior;
  }
});

test('recovery ring, causal restore and secondary effect failure retain a successful save', async () => {
  const db = await openLogbook(new IDBFactory());
  await db.commit(put('original'));
  await db.recovery('before', 'Synthetic recovery');
  await db.commit(put('later'));
  const snapshot = await db.recoverySnapshot('before');
  const restored = await db.commit({ id: 'recover', at: 5, edit: { type: 'recover', snapshot } });
  assert.equal(restored.operation.sequence, 3);
  assert.ok(restored.state.entities['activity:original']);
  assert.equal(restored.state.entities['activity:later'], undefined);
  await db.commit({ id: 'undo-recovery', at: 6, edit: { type: 'restore', deletion: 'recover' } });
  assert.ok((await db.load()).entities['activity:later']);
  for (let i = 0; i < 8; i++) await db.recovery('point-' + i, 'bounded');
  assert.equal((await db.recoveryPoints()).length, 5);
  const pipeline = new OperationPipeline(
    db,
    () => {
      throw Error('Projection unavailable');
    },
    () => {
      throw Error('Scheduler unavailable');
    },
  );
  assert.equal((await pipeline.save(put('durable'))).effectsFailed, true);
  assert.ok((await db.load()).entities['activity:durable']);
  db.close();
});

test('orphaned demo deck references require review while old best text remains recoverable', async () => {
  const source = fixture();
  source.entries[0].d = 'removed-deck';
  source.best[0].ref = 'deleted-entry';
  const plan = await previewV8(JSON.stringify(source), options);
  assert.ok(plan.review.includes('deck-reference:removed-deck'));
  assert.ok(plan.review.includes('unlinked-moment:b0'));
  const db = await openLogbook(new IDBFactory());
  await assert.rejects(migrateV8(db, plan, 'g', backup), /review/);
  const reviewed = await previewV8(JSON.stringify(source), {
    ...options,
    orphanDecks: { 'removed-deck': null },
  });
  await migrateV8(db, reviewed, 'g', backup);
  assert.equal(((await db.load()).entities['activity:midnight'] as Activity).deck, null);
  db.close();
});

test('Undo of snapshot recovery retains a causal deletion barrier after checkpoint/restart', async () => {
  for (const previouslyDeleted of [false, true]) {
    const factory = new IDBFactory();
    let db = await openLogbook(factory, 'undo-snapshot', 'actor');
    const snapshot = blankLogbook();
    snapshot.entities['activity:old'] = activity('old');
    if (previouslyDeleted) {
      await db.commit(put('old'));
      await db.commit({
        id: 'prior-delete',
        at: 1,
        edit: { type: 'delete', keys: ['activity:old'] },
      });
    }
    await db.commit({ id: 'recover', at: 2, edit: { type: 'recover', snapshot } });
    await db.commit({ id: 'undo-recover', at: 3, edit: { type: 'restore', deletion: 'recover' } });
    await db.acknowledge((await db.pending()).map((op) => op.id));
    await db.checkpoint();
    db.close();
    db = await openLogbook(factory, 'undo-snapshot');
    const state = await db.load();
    assert.equal(state.entities['activity:old'], undefined);
    assert.equal(state.tombstones['activity:old'], 'undo-recover');
    await assert.rejects(db.commit({ ...put('old'), id: 'stale-recreate' }), /Restore deleted/);
    db.close();
  }
});

test('near-budget source remains byte-identical and recovery/activation quota failures are resumable', async () => {
  const raw = JSON.stringify({ entries: [], docks: [], future: 'x'.repeat(1024 * 1024) });
  const near = await previewV8(raw, {
    ...options,
    maxSourceBytes: new TextEncoder().encode(raw).length,
  });
  assert.equal((near.state.archive as { raw: string }).raw, raw);
  await assert.rejects(
    previewV8(raw, { ...options, maxSourceBytes: new TextEncoder().encode(raw).length - 1 }),
    /size/,
  );
  const f = new IDBFactory(),
    original = f.open.bind(f);
  let fail: string | null = null;
  f.open = (...args) => {
    const r = original(...args);
    r.addEventListener('success', () => {
      const transact = r.result.transaction.bind(r.result);
      r.result.transaction = (...args) => {
        const tx = transact(...args),
          objectStore = tx.objectStore.bind(tx);
        tx.objectStore = (name) => {
          const store = objectStore(name);
          if (fail === name && tx.mode === 'readwrite') {
            if (name === 'recovery')
              store.add = () => {
                fail = null;
                tx.abort();
                throw Error('Recovery quota');
              };
            if (name === 'meta')
              store.put = () => {
                fail = null;
                tx.abort();
                throw Error('Activation quota');
              };
          }
          return store;
        };
        return tx;
      };
    });
    return r;
  };
  const db = await openLogbook(f),
    plan = await previewV8(JSON.stringify(fixture()), options),
    id = 'g:' + plan.digest;
  fail = 'recovery';
  await assert.rejects(migrateV8(db, plan, 'g', backup), /Recovery quota/);
  assert.equal(await db.migration(id), undefined);
  assert.deepEqual(await db.load(), blankLogbook());
  await db.stageMigration(id, plan.raw, plan.digest, plan.state, plan.blobs);
  fail = 'meta';
  await assert.rejects(db.activateMigration(id, plan.digest), /Activation quota/);
  assert.equal((await db.migration(id)).complete, false);
  assert.deepEqual(await db.load(), blankLogbook());
  assert.equal(await db.attachment(plan.blobs[0].id), undefined);
  await migrateV8(db, plan, 'g', backup);
  assert.equal((await db.migration(id)).complete, true);
  db.close();
});
