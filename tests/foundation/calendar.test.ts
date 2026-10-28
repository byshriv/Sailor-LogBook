import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import {
  applyEdit,
  blankLogbook,
  canonical,
  loggedMinutes,
} from '../../packages/domain/src/logbook.ts';
import type { Activity, Deck, Task } from '../../packages/domain/src/logbook.ts';
import {
  calendarSegments,
  dayBlocks,
  interval,
  parseQuick,
  reschedule,
  taskClockStatus,
  viewDates,
  zoneOffset,
} from '../../packages/domain/src/calendar.ts';
import { openLogbook, OperationPipeline } from '../../packages/persistence/src/logbook.ts';
const activity = (id: string, start: number, duration: number): Activity => ({
  kind: 'activity',
  id,
  title: id,
  deck: null,
  zone: null,
  segments: calendarSegments('2026-10-27', start, duration, null),
  attachments: [],
  legacy: { unknown: 'retain' },
});
const task: Task = {
  kind: 'task',
  id: 'task',
  title: 'Planned',
  deck: null,
  date: '2026-10-27',
  time: 600,
  duration: 30,
  status: 'todo',
  must: false,
  history: [],
};
test('Calendar overlap chains allocate consistent lanes across activities and tasks; totals exclude plans', () => {
  const s = blankLogbook();
  for (const e of [activity('a', 540, 60), activity('b', 570, 60), activity('c', 610, 60), task])
    s.entities[e.kind + ':' + e.id] = e;
  const blocks = dayBlocks(s, '2026-10-27');
  for (const a of blocks)
    for (const b of blocks)
      if (a !== b && a.start < b.end && b.start < a.end) assert.notEqual(a.lane, b.lane);
  assert.deepEqual(
    blocks.map((b) => b.lanes),
    [3, 3, 3, 3],
  );
  assert.equal(loggedMinutes(s, '2026-10-27'), 130);
  assert.equal(taskClockStatus(task, '2026-10-27', 610), 'doing');
  assert.equal(taskClockStatus(task, '2026-10-27', 640), 'done');
  assert.equal(task.status, 'todo');
});
test('Calendar views align week and leap-month without using the travelling device timezone', () => {
  assert.equal(viewDates('2024-03-01', 'month', 1)[0], '2024-02-26');
  assert.equal(viewDates('2024-03-01', 'month').length, 42);
  assert.deepEqual(viewDates('2026-10-28', 3), ['2026-10-28', '2026-10-29', '2026-10-30']);
  assert.equal(viewDates('2026-10-28', 7, 0)[0], '2026-10-25');
});
test('Quick syntax matches word starts by recency and keeps zero-duration preset choice in caller', () => {
  const deck = (id: string, name: string, r: number): Deck => ({
    id,
    kind: 'deck',
    name,
    parent: null,
    excludeFromStreak: false,
    legacy: { r },
  });
  const p = parseQuick('Read book +lea t45', [
    deck('a', 'Learning', 1),
    deck('b', 'Deep Learning', 2),
  ]);
  assert.equal(p.title, 'Read book');
  assert.equal(p.duration, 45);
  assert.equal(p.deck?.id, 'b');
  assert.equal(parseQuick('Read +unknown', []).query, 'unknown');
  assert.throws(() => parseQuick('Read t0', []));
  assert.equal(parseQuick('title45 +ear', [deck('a', 'Learning', 1)]).deck, null);
});
test('Midnight moves keep identity and unknown context; explicit DST offsets resolve repeated times', () => {
  const a = activity('night', 1380, 120);
  const moved = reschedule(a, '2026-11-01', 1410, 90) as Activity;
  assert.equal(moved.id, a.id);
  assert.equal(moved.zone, null);
  assert.equal(moved.segments[1]?.date, '2026-11-02');
  assert.equal(moved.segments[0]?.offset, null);
  assert.equal(moved.legacy?.unknown, 'retain');
  assert.deepEqual(interval(moved), { date: '2026-11-01', start: 1410, duration: 90 });
  assert.equal(zoneOffset('2026-07-01', 600, 'America/New_York'), -240);
  assert.throws(() => zoneOffset('2026-03-08', 150, 'America/New_York'), /missing or repeated/);
  assert.throws(() => zoneOffset('2026-11-01', 90, 'America/New_York'), /missing or repeated/);
  const s = blankLogbook();
  const dst = {
    ...a,
    segments: calendarSegments('2026-11-01', 90, 60, 'America/New_York', {
      start: -240,
      end: -300,
    }),
  };
  s.entities['activity:night'] = dst;
  assert.equal(loggedMinutes(s, '2026-11-01'), 120);
});
test('Compound Calendar save is atomic, replayable, reversible and retains deletion barriers', async () => {
  const factory = new IDBFactory();
  let db = await openLogbook(factory, 'calendar-regression', 'actor');
  const deck: Deck = {
    kind: 'deck',
    id: 'learning',
    name: 'Learning',
    parent: null,
    excludeFromStreak: false,
  };
  const a = { ...activity('night', 1380, 120), deck: deck.id };
  let published = blankLogbook();
  let scheduled = 0;
  const pipeline = new OperationPipeline(
    db,
    (s) => (published = s),
    () => scheduled++,
  );
  await assert.rejects(
    pipeline.save({
      id: 'bad',
      at: 1,
      edit: { type: 'putMany', entities: [deck, { ...a, deck: 'missing' }] },
    }),
  );
  assert.equal(Object.keys(published.entities).length, 0);
  assert.equal((await db.pending()).length, 0);
  assert.equal(scheduled, 0);
  await pipeline.save({
    id: 'save',
    at: 2,
    edit: {
      type: 'putMany',
      entities: [
        deck,
        a,
        {
          kind: 'moment',
          id: 'best',
          date: '2026-10-27',
          text: 'Night',
          activity: a.id,
          featured: true,
        },
      ],
    },
  });
  assert.equal(scheduled, 1);
  assert.equal((await db.pending()).length, 1);
  const saved = canonical(published);
  db.close();
  db = await openLogbook(factory, 'calendar-regression');
  assert.equal(canonical(await db.load()), saved);
  await db.commit({ id: 'delete', at: 3, edit: { type: 'delete', keys: ['activity:night'] } });
  assert.equal((await db.load()).entities['moment:best']?.activity, null);
  await db.commit({ id: 'undo', at: 4, edit: { type: 'restore', deletion: 'delete' } });
  assert.equal(canonical(await db.load()).includes('learning'), true);
  await db.commit({ id: 'undo-save', at: 5, edit: { type: 'restore', deletion: 'save' } });
  const state = await db.load();
  assert.equal(Object.keys(state.entities).length, 0);
  assert.equal(state.tombstones['activity:night'], 'undo-save');
  assert.throws(() => applyEdit(state, { id: 'stale', at: 6, edit: { type: 'put', entity: a } }));
  db.close();
});

test('Calendar media gateway snapshots attachments and keeps failed media writes atomic', async () => {
  const factory = new IDBFactory();
  const db = await openLogbook(factory, 'calendar-media', 'actor');
  const { sha256 } = await import('../../packages/persistence/src/media.ts');
  const blob = new Blob(['synthetic-photo'], { type: 'image/webp' });
  const digest = await sha256(await blob.arrayBuffer());
  const media = [{ id: digest, digest, blob }];
  let published = blankLogbook();
  let effects = 0;
  const gateway = new OperationPipeline(
    db,
    (s) => (published = s),
    () => effects++,
  );
  const pending = gateway.save(
    {
      id: 'media-save',
      at: 1,
      edit: {
        type: 'putMany',
        entities: [{ ...activity('photo', 500, 30), attachments: [digest] }],
      },
    },
    undefined,
    media,
  );
  media[0]!.digest = 'changed-after-queue';
  await pending;
  assert.equal(effects, 1);
  assert.equal((await db.attachment(digest)).blob.size, blob.size);
  assert.deepEqual((published.entities['activity:photo'] as Activity).attachments, [digest]);
  await assert.rejects(
    gateway.save(
      {
        id: 'bad-photo',
        at: 2,
        edit: { type: 'putMany', entities: [activity('must-not-appear', 500, 30)] },
      },
      undefined,
      [{ id: 'bad', digest: 'bad', blob }],
    ),
  );
  assert.equal(published.entities['activity:must-not-appear'], undefined);
  assert.equal((await db.pending()).length, 1);
  db.close();
});
