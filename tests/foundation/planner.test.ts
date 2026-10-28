import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import {
  applyEdit,
  blankLogbook,
  canonical,
  loggedMinutes,
} from '../../packages/domain/src/logbook.ts';
import type { Edit, Logbook, Task } from '../../packages/domain/src/logbook.ts';
import { taskClockStatus } from '../../packages/domain/src/calendar.ts';
import {
  moveTask,
  plannerDates,
  reviewTask,
  saveTask,
  taskDraft,
  taskFlags,
  taskHistory,
  tasks,
  unresolved,
} from '../../packages/domain/src/planner.ts';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
import { migrateV8, previewV8 } from '../../packages/persistence/src/migration.ts';
const date = '2026-10-28';
const task = (id = 'a'): Task => ({
  kind: 'task',
  id,
  title: 'Read',
  date,
  deck: null,
  status: 'todo',
  time: null,
  duration: 45,
  must: true,
  history: [{ unknown: 'keep' }],
  legacy: { wait: 'Sam', low: 1, voy: 1, pct: 35, unknown: { deep: true } },
});
const edit = (s: Logbook, e: Edit, id = crypto.randomUUID()) =>
  applyEdit(s, { id, at: 10, edit: e });
test('Planner moves retain one identity, wall dates, manual statuses, progress and unknown fields; Undo restores exactly', () => {
  const original = task();
  original.status = 'stuck';
  original.legacy = { ...(original.legacy as object), man: 1 };
  const s = edit(blankLogbook(), { type: 'putMany', entities: [original] });
  const moved = edit(s, moveTask(original, '2026-11-01', 10), 'move');
  const t = moved.entities['task:a'] as Task;
  assert.equal(tasks(moved).length, 1);
  assert.equal(t.date, '2026-11-01');
  assert.equal(t.status, 'stuck');
  assert.deepEqual(t.legacy, original.legacy);
  assert.equal(taskClockStatus(t, '2026-11-02', 1000), 'stuck');
  assert.deepEqual(t.history[0], { unknown: 'keep' });
  assert.equal(taskHistory(t)[0]?.date, date);
  const undo = edit(moved, { type: 'restore', deletion: 'move' });
  assert.equal(canonical(undo.entities), canonical(s.entities));
  assert.throws(() => moveTask(original, date, 10));
});
test('reviewed rollover archives skipped and prior status, preserves metadata, and is reversible; skip/nogo remain on original day', () => {
  const t = task();
  t.status = 'doing';
  t.time = 600;
  let s = edit(blankLogbook(), { type: 'putMany', entities: [t] });
  s = edit(s, reviewTask(t, 'rollover', '2026-10-29', 10), 'roll');
  const rolled = s.entities['task:a'] as Task;
  assert.equal(rolled.id, t.id);
  assert.equal(rolled.date, '2026-10-29');
  assert.equal(rolled.time, null);
  assert.equal(rolled.status, 'todo');
  assert.equal(taskFlags(rolled).progress, 35);
  assert.equal(taskFlags(rolled).wait, 'Sam');
  assert.deepEqual(rolled.history.at(-1), {
    date,
    status: 'skip',
    previousStatus: 'doing',
    time: 600,
    duration: 45,
    pct: 35,
    man: false,
    action: 'rollover',
    at: 10,
  });
  s = edit(s, { type: 'restore', deletion: 'roll' });
  assert.equal(canonical(s.entities['task:a']), canonical(t));
  for (const choice of ['skip', 'nogo'] as const) {
    const next = edit(s, reviewTask(t, choice, '2026-10-29', 10));
    const skipped = next.entities['task:a'] as Task;
    assert.equal(skipped.date, date);
    assert.equal(skipped.status, choice);
    assert.equal(taskHistory(skipped).at(-1)?.status, 'doing');
    assert.equal(unresolved(next, '2026-10-29').length, 0);
  }
  assert.throws(() => reviewTask(t, 'rollover', date, 10));
  assert.throws(() => reviewTask({ ...t, status: 'done' }, 'rollover', '2026-10-29', 10));
});
test('timed/untimed, clock completion and manual status do not produce logged time or silently roll tasks', () => {
  let s = edit(blankLogbook(), { type: 'putMany', entities: [task()] });
  let t = s.entities['task:a'] as Task;
  s = edit(s, moveTask(t, '2026-10-29', 10, 540));
  t = s.entities['task:a'] as Task;
  const before = canonical(s);
  assert.equal(taskClockStatus(t, '2026-10-29', 530), 'todo');
  assert.equal(taskClockStatus(t, '2026-10-29', 550), 'doing');
  assert.equal(taskClockStatus(t, '2026-10-30', 0), 'done');
  assert.equal(unresolved(s, '2026-10-30')[0]?.id, 'a');
  assert.equal(canonical(s), before);
  assert.equal(loggedMinutes(s, '2026-10-29'), 0);
  s = edit(s, saveTask(s, { ...taskDraft(t), status: 'done', manual: true, progress: 100 }, 10));
  assert.equal(loggedMinutes(s, '2026-10-29'), 0);
});
test('quick syntax and task edits are atomic, preserve compatibility and status history; invalid dates and minutes fail', () => {
  const t = task();
  let s = edit(blankLogbook(), { type: 'putMany', entities: [t] });
  const d = {
    ...taskDraft(t),
    title: 'Study +learning t30',
    status: 'done' as const,
    manual: true,
  };
  s = edit(s, saveTask(s, d, 10), 'save');
  const saved = s.entities['task:a'] as Task;
  assert.equal(saved.deck, 'a-deck');
  assert.equal(saved.duration, 30);
  assert.equal(saved.status, 'done');
  assert.equal(taskFlags(saved).wait, 'Sam');
  assert.deepEqual((saved.legacy as any).unknown, { deep: true });
  assert.equal(taskHistory(saved).at(-1)?.status, 'todo');
  assert.ok(s.entities['deck:a-deck']);
  s = edit(s, { type: 'restore', deletion: 'save' });
  assert.equal(s.entities['deck:a-deck'], undefined);
  assert.deepEqual(s.entities['task:a'], t);
  for (const date of ['2026-02-29', '2026-13-01', 'garbage', ''])
    assert.throws(() => saveTask(s, { ...d, date }, 10));
  assert.throws(() => saveTask(s, { ...d, time: 1440 }, 10));
  assert.throws(() => saveTask(s, { ...d, duration: 0 }, 10));
  assert.throws(() => saveTask(s, { ...d, title: 'Invalid t1500' }, 10));
  assert.deepEqual(plannerDates('2028-02-29').slice(0, 5), [
    '2028-02-26',
    '2028-02-27',
    '2028-02-28',
    '2028-02-29',
    '2028-03-01',
  ]);
});
test('move/review/delete survive restart and causal replay; later edit blocks stale Undo', async () => {
  const factory = new IDBFactory();
  let db = await openLogbook(factory, 'planner');
  await db.commit({ id: 'seed', at: 1, edit: { type: 'putMany', entities: [task()] } });
  let t = (await db.load()).entities['task:a'] as Task;
  await db.commit({ id: 'move', at: 2, edit: moveTask(t, '2026-10-29', 2, 600) });
  t = (await db.load()).entities['task:a'] as Task;
  await db.commit({ id: 'review', at: 3, edit: reviewTask(t, 'rollover', '2026-11-01', 3) });
  await assert.rejects(
    db.commit({ id: 'stale', at: 4, edit: { type: 'restore', deletion: 'move' } }),
    /changed/,
  );
  await db.commit({ id: 'delete', at: 5, edit: { type: 'delete', keys: ['task:a'] } });
  db.close();
  db = await openLogbook(factory, 'planner');
  await db.commit({ id: 'restore', at: 6, edit: { type: 'restore', deletion: 'delete' } });
  const expected = await db.load(),
    pending = await db.pending();
  const replica = await openLogbook(factory, 'replica');
  for (const op of pending.sort((a, b) => a.sequence - b.sequence))
    await replica.commit(op.command, op);
  assert.equal(canonical(await replica.load()), canonical(expected));
  assert.equal(tasks(expected).length, 1);
  assert.equal((expected.entities['task:a'] as Task).date, '2026-11-01');
  assert.equal(loggedMinutes(expected, '2026-11-01'), 0);
  db.close();
  replica.close();
});
test('migrated Planner edits retain Calendar, Notebook/Sea, Reflection, exact archive and digest media through restart', async () => {
  const raw = JSON.stringify({
    docks: [],
    entries: [
      {
        id: 'log',
        t: 'Log',
        d: null,
        date,
        s: 540,
        e: 600,
        photo: 'data:image/png;base64,aGVsbG8=',
      },
    ],
    tasks: [
      {
        id: 'a',
        t: 'Plan',
        d: null,
        date,
        st: 'todo',
        time: 600,
        dur: 45,
        must: 1,
        voy: 1,
        pct: 35,
        wait: 'Sam',
        low: 1,
        unknown: { keep: true },
      },
    ],
    nb: {
      [date]: {
        lines: [
          {
            id: 'line',
            t: 'Keep',
            sk: [
              {
                c: '#000',
                w: 2,
                p: [
                  [0, 0],
                  [1, 1],
                ],
              },
            ],
          },
        ],
        fsk: [],
      },
    },
    bt: [date],
    seen: { '2026-10': [date] },
    mood: { [date]: 0 },
    les: [{ id: 'l', date, t: 'Lesson' }],
    ach: { 'Maiden Voyage': 1 },
  });
  const plan = await previewV8(raw, {
    maxSourceBytes: 100000,
    maxAttachmentBytes: 10000,
    exclusion: {},
  });
  assert.deepEqual(plan.review, []);
  const factory = new IDBFactory();
  let db = await openLogbook(factory, 'migration');
  await migrateV8(db, plan, 'phase6', async () => plan.digest);
  const before = await db.load(),
    media = await db.attachment(plan.blobs[0]!.id);
  const t = before.entities['task:a'] as Task;
  await db.commit({ id: 'roll', at: 10, edit: reviewTask(t, 'rollover', '2026-10-29', 10) });
  db.close();
  db = await openLogbook(factory, 'migration');
  const after = await db.load();
  for (const [key, value] of Object.entries(before.entities))
    if (!key.startsWith('task:')) assert.equal(canonical(after.entities[key]), canonical(value));
  assert.equal(canonical(after.archive), canonical(before.archive));
  assert.deepEqual(
    await (await db.attachment(plan.blobs[0]!.id))!.blob.arrayBuffer(),
    await media!.blob.arrayBuffer(),
  );
  assert.deepEqual((after.entities['task:a']!.legacy as any).unknown, { keep: true });
  db.close();
});
