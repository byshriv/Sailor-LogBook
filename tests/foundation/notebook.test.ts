import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { applyEdit, blankLogbook, canonical } from '../../packages/domain/src/logbook.ts';
import type { Entity, Page } from '../../packages/domain/src/logbook.ts';
import {
  linesFor,
  messages,
  openBottleHistory,
  pageFor,
  pickBottles,
  sendPage,
  sentDates,
  strokes,
  writeLine,
} from '../../packages/domain/src/notebook.ts';
import { openLogbook, OperationPipeline } from '../../packages/persistence/src/logbook.ts';
import { previewV8, migrateV8 } from '../../packages/persistence/src/migration.ts';
const date = '2026-10-28';
const sketch = [
  {
    c: '#1a1816',
    w: 4,
    p: [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
  },
];
const page = (d = date): Page => ({
  kind: 'page',
  id: d,
  date: d,
  lines: [{ id: 'line', t: 'Little thing', sk: sketch, unknown: { keep: true } }],
  strokes: sketch,
  attachments: [],
  legacy: { other: 'retained' },
});
const put = (s: ReturnType<typeof blankLogbook>, entities: Entity[], id = 'put') =>
  applyEdit(s, { id, at: 1, edit: { type: 'putMany', entities } });

test('Notebook rows retain opaque fields, strokes, deck syntax and best-thing identity without duplication', () => {
  let s = put(blankLogbook(), [
    page(),
    {
      kind: 'moment',
      id: 'best',
      date,
      text: 'Best from Calendar',
      activity: null,
      featured: true,
    },
  ]);
  assert.equal(linesFor(s, date).length, 2);
  s = put(s, writeLine(s, date, 'moment:best', 'Edited best', 'unused', 2), 'best-edit');
  assert.equal(linesFor(s, date).length, 2);
  assert.equal(s.entities['moment:best']?.text, 'Edited best');
  s = put(s, writeLine(s, date, 'line', 'Read book +learning t45', 'new', 3), 'line-edit');
  const line = pageFor(s, date).lines[0] as Record<string, unknown>;
  assert.equal(line.t, 'Read book');
  assert.equal(line.dur, 45);
  assert.equal(line.d, 'new-deck');
  assert.deepEqual(line.sk, sketch);
  assert.deepEqual(line.unknown, { keep: true });
  assert.equal(pageFor(s, date).legacy?.other, 'retained');
  assert.throws(() => writeLine(s, date, 'new', 'Oops t1500', 'bad', 4));
  // Calendar unfeaturing updates the Notebook projection without losing text.
  s = applyEdit(s, { id: 'unfeature', at: 4, edit: { type: 'feature', date, ids: [] } });
  assert.equal(messages(s, date, true).length, 0);
  assert.equal(linesFor(s, date)[1]?.text, 'Edited best');
  assert.throws(
    () => applyEdit(s, { id: 'undo', at: 5, edit: { type: 'restore', deletion: 'best-edit' } }),
    /needs review/,
  );
  // Restore refuses changed linked moment state instead of overwriting it.
});

test('Sea enforces five unique sent days, ten bottles, weighted older selection, filters and monthly history', () => {
  let s = blankLogbook();
  const dates = Array.from({ length: 12 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
  for (const d of dates) s = put(s, [page(d)], 'page-' + d);
  for (const d of dates.slice(0, 4)) s = put(s, [sendPage(s, d)], 'send-' + d);
  const filter = { best: false, size: 'both' as const, date: '' };
  assert.equal(pickBottles(s, date, filter).length, 0);
  assert.equal(pickBottles(s, date, { ...filter, date: dates[0]! }).length, 2);
  for (const d of dates.slice(4)) s = put(s, [sendPage(s, d)], 'send-' + d);
  assert.equal(sentDates(s).length, 12);
  s = put(s, [sendPage(s, dates[0]!)], 'resend');
  assert.equal(sentDates(s).length, 12);
  const chosen = pickBottles(s, date, { ...filter, size: 'small' }, () => 0);
  assert.equal(chosen.length, 10);
  assert.equal(new Set(chosen.map((b) => b.date)).size, 10);
  assert.ok(chosen.every((b) => !b.big));
  assert.equal(chosen[0]?.date, dates[0]);
  const older = pickBottles(s, date, filter, () => 0.07)[0]!.date;
  assert.equal(older, dates[0]); // the oldest date owns more than 1/12 of cumulative weight.
  s = put(s, [openBottleHistory(s, dates[0]!, date)], 'open');
  assert.ok(pickBottles(s, date, filter, () => 0).every((b) => b.date !== dates[0]));
  assert.equal(pickBottles(s, '2026-11-01', filter, () => 0)[0]?.date, dates[0]);
  assert.equal(pickBottles(s, date, { ...filter, date: dates[0]!, size: 'big' }).length, 1);
  assert.equal(pickBottles(s, date, { ...filter, best: true }).length, 0);
  assert.throws(() => sendPage(blankLogbook(), date));
});

test('Notebook migration, drawing edits, atomic failure, restart, Undo and remote replay retain exact data and media', async () => {
  const factory = new IDBFactory();
  let db = await openLogbook(factory, 'notebook', 'actor');
  const raw = JSON.stringify({
    entries: [],
    docks: [],
    nb: {
      [date]: {
        lines: [
          {
            id: 'line',
            t: 'Migrated',
            sk: sketch,
            dd: 'data:image/png;base64,eA==',
            unknown: 'keep',
          },
        ],
        fsk: sketch,
        other: 7,
      },
    },
    bt: [date],
    seen: { '2026-10': ['2026-10-01'] },
  });
  const plan = await previewV8(raw, {
    maxSourceBytes: 100000,
    maxAttachmentBytes: 100000,
    exclusion: {},
  });
  await migrateV8(db, plan, 'notebook', async (_raw, digest) => digest);
  const initial = await db.load(),
    baseline = canonical(initial),
    p = pageFor(initial, date);
  const blobId = p.attachments[0]!;
  assert.equal(await (await db.attachment(blobId)).blob.text(), 'x');
  let published = initial;
  const gateway = new OperationPipeline(
    db,
    (s) => {
      published = s;
    },
    () => {},
  );
  const changed = writeLine(initial, date, 'line', 'After migration', 'id', 2);
  await gateway.save({ id: 'write', at: 2, edit: { type: 'putMany', entities: changed } });
  const op = (await db.pending()).find((o) => o.command.id === 'write')!;
  const drawn = pageFor(published, date);
  drawn.strokes = [
    ...drawn.strokes,
    {
      c: '#4a4642',
      w: 7,
      p: [
        [0.2, 0.3],
        [0.7, 0.8],
      ],
    },
  ];
  await gateway.save({ id: 'draw', at: 3, edit: { type: 'putMany', entities: [drawn] } });
  const drawingOperation = (await db.pending()).find((o) => o.command.id === 'draw')!;
  await assert.rejects(
    gateway.save({
      id: 'bad',
      at: 3,
      edit: {
        type: 'putMany',
        entities: [{ ...pageFor(published, date), attachments: ['missing'] }],
      },
    }),
  );
  assert.equal((await db.pending()).length, 2);
  assert.equal(linesFor(published, date)[0]?.text, 'After migration');
  db.close();
  db = await openLogbook(factory, 'notebook');
  assert.deepEqual(pageFor(await db.load(), date).strokes, drawn.strokes);
  assert.deepEqual(pageFor(await db.load(), date).attachments, [blobId]);
  await db.commit({ id: 'undo-draw', at: 4, edit: { type: 'restore', deletion: 'draw' } });
  assert.deepEqual(pageFor(await db.load(), date).strokes, sketch);
  await db.commit({ id: 'undo', at: 5, edit: { type: 'restore', deletion: 'write' } });
  assert.equal(canonical((await db.load()).entities), canonical(initial.entities));
  const remote = await openLogbook(factory, 'remote', 'replica');
  await migrateV8(remote, plan, 'replica', async (_raw, digest) => digest);
  await remote.commit(op.command, op);
  await remote.commit(drawingOperation.command, drawingOperation);
  assert.deepEqual(pageFor(await remote.load(), date).strokes, drawn.strokes);
  assert.equal(linesFor(await remote.load(), date)[0]?.text, 'After migration');
  assert.equal((await remote.pending()).length, 0);
  assert.equal(canonical(initial), baseline);
  assert.equal(sentDates(await db.load())[0], date);
  db.close();
  remote.close();
});

test('Stroke rendering rejects malformed coordinates without rewriting the canonical source', () => {
  const input = [
    ...sketch,
    {
      c: '#000000',
      w: 2,
      p: [
        [NaN, 0],
        [1, 1],
        [2, 0],
      ],
    },
    { c: 'url(bad)', w: 2, p: [[0, 0]] },
  ];
  const original = structuredClone(input);
  const result = strokes(input);
  assert.equal(result.length, 2);
  assert.deepEqual(result[1]?.p, [[1, 1]]);
  assert.deepEqual(input, original);
});
