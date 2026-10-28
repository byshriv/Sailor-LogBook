import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import {
  applyEdit,
  blankLogbook,
  canonical,
  loggedMinutes,
} from '../../packages/domain/src/logbook.ts';
import type { Activity, Entity, Logbook, Moment } from '../../packages/domain/src/logbook.ts';
import { shiftDate } from '../../packages/domain/src/calendar.ts';
import {
  achievements,
  addMustDo,
  achievementState,
  bestStreak,
  captureAchievements,
  hoursStreak,
  layout,
  moodAt,
  moodEdit,
  mustTasks,
  onThisDay,
  periodSummary,
  reflectionPut,
  reviewItems,
  saveLayout,
} from '../../packages/domain/src/reflection.ts';
import { migrateV8, previewV8 } from '../../packages/persistence/src/migration.ts';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
const date = '2026-10-28';
const put = (s: Logbook, entities: Entity[], id = crypto.randomUUID()) =>
  applyEdit(s, { id, at: 1, edit: { type: 'putMany', entities } });
const activity = (
  id: string,
  d = date,
  start = 540,
  end = 660,
  deck: string | null = null,
): Activity => ({
  kind: 'activity',
  id,
  title: id,
  deck,
  zone: null,
  segments: [{ date: d, start, end, offset: null }],
  attachments: [],
});
const moment = (id: string, d = date, featured = true): Moment => ({
  kind: 'moment',
  id,
  date: d,
  text: id,
  activity: null,
  featured,
});
test('Home and Reflection share union/DST totals and inherited exclusions; plans never log time', () => {
  let s = put(blankLogbook(), [
    { kind: 'deck', id: 'renamed', name: 'Rest', parent: null, excludeFromStreak: true },
    { kind: 'deck', id: 'child', name: 'Child', parent: 'renamed', excludeFromStreak: false },
    activity('a', date, 540, 630),
    activity('b', date, 570, 660),
    activity('excluded', date, 660, 780, 'child'),
    {
      kind: 'task',
      id: 'done',
      title: 'Done plan',
      date,
      deck: null,
      status: 'done',
      time: 0,
      duration: 600,
      must: true,
      history: [],
    },
  ]);
  assert.equal(loggedMinutes(s, date), 240);
  assert.equal(loggedMinutes(s, date, true), 120);
  assert.equal(hoursStreak(s, date), 1);
  assert.deepEqual(periodSummary(s, date, date), { days: 1, minutes: 240, best: 0 });
  s = put(s, [activity('b', date, 570, 650)]);
  assert.equal(hoursStreak(s, date), 0);
  const dst = activity('dst', '2026-11-01', 60, 120);
  dst.segments[0]!.offset = -240;
  dst.segments[0]!.endOffset = -300;
  s = put(s, [dst]);
  assert.equal(hoursStreak(s, '2026-11-01'), 1);
  assert.equal(mustTasks(s, date).length, 1);
});
test('hours streak skips unfinished today, accepts backfill and stops at a gap without a fixed 800-day cap', () => {
  let s = put(
    blankLogbook(),
    Array.from({ length: 805 }, (_, i) => activity(String(i), shiftDate(date, -i - 1))),
  );
  assert.equal(hoursStreak(s, date), 805);
  s = applyEdit(s, { id: 'gap', at: 2, edit: { type: 'delete', keys: ['activity:2'] } });
  assert.equal(hoursStreak(s, date), 2);
  s = applyEdit(s, { id: 'undo', at: 3, edit: { type: 'restore', deletion: 'gap' } });
  assert.equal(hoursStreak(s, date), 805);
});
test('best freezes bridge four missing past days per month, never count frozen days, and recompute on backfill', () => {
  let s = put(blankLogbook(), [moment('older', '2026-09-26'), moment('recent', '2026-10-05')]);
  assert.deepEqual(bestStreak(s, '2026-10-05'), {
    count: 2,
    used: { '2026-10': 4, '2026-09': 4 },
    remaining: 0,
  });
  assert.equal(bestStreak(s, '2026-10-06').count, 2); // today's empty day is free
  assert.equal(bestStreak(s, '2026-10-07').count, 1); // fifth October gap breaks the chain
  s = put(s, [moment('backfill', '2026-10-04')]);
  assert.equal(bestStreak(s, '2026-10-05').remaining, 1);
  s = put(s, [moment('unfeatured', '2026-10-03', false)]);
  assert.equal(bestStreak(s, '2026-10-05').remaining, 1);
  assert.deepEqual(bestStreak(blankLogbook(), date), { count: 0, used: {}, remaining: 4 });
  assert.equal(bestStreak(put(blankLogbook(), [moment('future', '2027-01-01')]), date).count, 0);
});
test('all seven achievement identities retain earned and opaque history after edits and backfill', () => {
  let s = put(blankLogbook(), [
    ...Array.from({ length: 30 }, (_, i) => activity(String(i), shiftDate(date, -i))),
    ...Array.from({ length: 4 }, (_, i) => moment('best' + i)),
    { kind: 'history', id: 'bt', value: [date] },
    { kind: 'history', id: 'ach', value: { opaque: { keep: true } } },
  ]);
  assert.equal(achievements.length, 7);
  assert.equal(Object.values(achievementState(s, date)).filter(Boolean).length, 7);
  s = put(s, [captureAchievements(s, date)!]);
  s = applyEdit(s, { id: 'remove', at: 2, edit: { type: 'delete', keys: ['activity:0'] } });
  assert.equal(achievementState(s, date)['Seasoned Sailor'], true);
  assert.equal(captureAchievements(s, date), null);
  assert.deepEqual(s.entities['history:ach']?.value.opaque, { keep: true });
});
test('overflow selection, moods, layouts and reflection edits retain all source fields and support Undo', () => {
  let s = put(blankLogbook(), [
    ...Array.from({ length: 6 }, (_, i) => moment('m' + i, date, false)),
    {
      kind: 'settings',
      id: 'legacy',
      value: {
        name: 'Captain',
        order: ['stats', 'stats', 'unknown'],
        pf: { h24: 0 },
        opaque: 'kept',
      },
    },
    { kind: 'history', id: 'mood', value: { unknown: { keep: true } } },
    reflectionPut(blankLogbook(), 'les', date, 'Lesson', 'l'),
  ]);
  s = applyEdit(s, {
    id: 'select',
    at: 2,
    edit: { type: 'feature', date, ids: ['m0', 'm1', 'm2', 'm3'] },
  });
  assert.equal(reviewItems(s, 'best').length, 6);
  assert.throws(() =>
    applyEdit(s, {
      id: 'five',
      at: 3,
      edit: { type: 'feature', date, ids: ['m0', 'm1', 'm2', 'm3', 'm4'] },
    }),
  );
  s = applyEdit(s, { id: 'mood', at: 4, edit: moodEdit(s, date, 0) });
  assert.equal(moodAt(s, date), 0);
  s = applyEdit(s, { id: 'clear', at: 5, edit: moodEdit(s, date, null) });
  assert.equal(moodAt(s, date), null);
  s = applyEdit(s, { id: 'layout', at: 6, edit: saveLayout(s, true, ['bs', 'hs'], ['mood']) });
  assert.deepEqual(layout(s, false).order, ['stats', 'must', 'best', 'mood', 'otd', 'streak']);
  assert.equal(layout(s, true).order[0], 'bs');
  assert.equal(s.entities['settings:legacy']?.value.opaque, 'kept');
  const edited = reflectionPut(s, 'les', date, 'Edited lesson', 'l');
  s = put(s, [edited], 'lesson');
  s = applyEdit(s, { id: 'restore', at: 7, edit: { type: 'restore', deletion: 'lesson' } });
  assert.equal(reviewItems(s, 'les')[0]?.text, 'Lesson');
  assert.throws(() => moodEdit(s, date, 9));
});
test('migration, durable restart and causal replay preserve reflection, achievements, media and unrelated records', async () => {
  const raw = JSON.stringify({
    docks: [],
    entries: [],
    tasks: [],
    best: [{ id: 'best', date, t: 'Best' }],
    nb: {
      [date]: {
        lines: [
          {
            id: 'ink',
            t: 'Note',
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
        draw: 'data:image/png;base64,aGVsbG8=',
      },
    },
    les: [{ id: 'l', date, t: 'Lesson', unknown: 'keep' }],
    grat: [{ id: 'g', date, t: 'Thanks' }],
    mood: { [date]: 0 },
    ach: { 'Maiden Voyage': 1 },
    rorder: ['ach', 'hs'],
    rhide: ['heat'],
    name: 'Captain',
    unknown: { preserve: true },
  });
  const options = { maxSourceBytes: 100000, maxAttachmentBytes: 10000, exclusion: {} };
  const plan = await previewV8(raw, options);
  assert.deepEqual(plan.review, []);
  const factory = new IDBFactory();
  let db = await openLogbook(factory, 'reflection');
  await migrateV8(db, plan, 'phase5', async () => plan.digest);
  const before = await db.load();
  const media = await db.attachment(plan.blobs[0]!.id);
  await db.commit({ id: 'mood', at: 10, edit: moodEdit(before, date, 4) });
  await db.commit({
    id: 'lesson',
    at: 11,
    edit: { type: 'put', entity: reflectionPut(await db.load(), 'les', date, 'Edited', 'l') },
  });
  const edited = await db.load(),
    pending = await db.pending();
  db.close();
  db = await openLogbook(factory, 'reflection');
  assert.equal(canonical(await db.load()), canonical(edited));
  assert.equal(moodAt(edited, date), 4);
  assert.equal(reviewItems(edited, 'les')[0]?.entity?.kind, 'reflection');
  assert.equal((edited.entities['reflection:les:l'] as any).value.unknown, 'keep');
  assert.equal(canonical(edited.archive), canonical(before.archive));
  assert.deepEqual(
    await (await db.attachment(plan.blobs[0]!.id))!.blob.arrayBuffer(),
    await media!.blob.arrayBuffer(),
  );
  const replica = await openLogbook(factory, 'replica');
  await migrateV8(replica, plan, 'replica-baseline', async () => plan.digest);
  for (const operation of pending.sort((a, b) => a.sequence - b.sequence))
    await replica.commit(operation.command, operation);
  assert.equal(canonical(await replica.load()), canonical(edited));
  assert.equal(
    onThisDay(edited, '2027-10-28').some((i) => i.text === 'Edited'),
    true,
  );
  db.close();
  replica.close();
});

test('Home Add must-do uses shared quick syntax atomically without logging time or losing deck metadata', () => {
  let s = put(blankLogbook(), [
    {
      kind: 'deck',
      id: 'learning',
      name: 'Learning',
      parent: null,
      excludeFromStreak: false,
      legacy: { unknown: 'keep' },
    },
  ]);
  s = applyEdit(s, { id: 'add', at: 10, edit: addMustDo(s, date, 'Read +lea t45', 'read', 10) });
  assert.equal((s.entities['task:read'] as any).duration, 45);
  assert.equal((s.entities['task:read'] as any).deck, 'learning');
  assert.equal((s.entities['deck:learning'] as any).legacy.unknown, 'keep');
  assert.equal(loggedMinutes(s, date), 0);
  s = applyEdit(s, { id: 'newdeck', at: 11, edit: addMustDo(s, date, 'Walk +health', 'walk', 11) });
  assert.equal((s.entities['task:walk'] as any).deck, 'walk-deck');
  assert.ok(s.entities['deck:walk-deck']);
  s = applyEdit(s, { id: 'undo-new', at: 12, edit: { type: 'restore', deletion: 'newdeck' } });
  assert.equal(s.entities['deck:walk-deck'], undefined);
  assert.throws(() => addMustDo(s, date, 'Invalid t1500', 'bad', 13));
});
