import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import {
  applyEdit,
  blankLogbook,
  canonical,
  loggedMinutes,
} from '../../packages/domain/src/logbook.ts';
import type { Deck, Edit, Logbook } from '../../packages/domain/src/logbook.ts';
import {
  deckEdit,
  deckRecords,
  presetEdit,
  profileEdit,
  reminderDue,
  reminderReceipt,
  removeDeck,
  searchLogbook,
  settings,
  settingsEdit,
} from '../../packages/domain/src/management.ts';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
import { sha256 } from '../../packages/persistence/src/media.ts';
import { migrateV8, previewV8 } from '../../packages/persistence/src/migration.ts';
const d = (id: string, parent: string | null = null): Deck => ({
  kind: 'deck',
  id,
  name: id,
  parent,
  excludeFromStreak: false,
  legacy: { c: '#226192', ic: 'book', unknown: { keep: true } },
});
const edit = (s: Logbook, edit: Edit, id = crypto.randomUUID()) =>
  applyEdit(s, { id, at: 10, edit });
function fixture() {
  return edit(blankLogbook(), {
    type: 'putMany',
    entities: [
      d('a'),
      d('b', 'a'),
      d('c', 'b'),
      d('x'),
      {
        kind: 'activity',
        id: 'log',
        title: 'Read a book',
        deck: 'c',
        zone: 'Asia/Calcutta',
        segments: [{ date: '2026-10-28', start: 540, end: 600, offset: 330 }],
        attachments: [],
        legacy: { opaque: true },
      },
      {
        kind: 'task',
        id: 'plan',
        title: 'Plan a voyage',
        deck: 'a',
        date: '2026-10-28',
        time: null,
        duration: 30,
        status: 'todo',
        must: true,
        history: [],
        legacy: { pct: 40 },
      },
      {
        kind: 'preset',
        id: 'p',
        title: 'Morning routine',
        deck: 'a',
        duration: 0,
        legacy: { unknown: 'keep' },
      },
      {
        kind: 'page',
        id: 'day',
        date: '2026-10-28',
        lines: [
          {
            id: 'line',
            t: 'A quiet afternoon',
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
        strokes: [],
        attachments: [],
      },
      {
        kind: 'reflection',
        id: 'les:l',
        value: { date: '2026-10-28', t: 'A lesson learned', unknown: 'keep' },
      },
      {
        kind: 'settings',
        id: 'legacy',
        value: {
          name: 'Captain',
          pf: { h24: 0, rt: '18:30', unknown: 'keep' },
          order: ['best'],
          unknown: { keep: true },
        },
      },
    ],
  });
}
test('deck hierarchy rejects cycles and fourth levels, including whole-subtree moves, without mutating source', () => {
  const s = fixture(),
    before = canonical(s);
  assert.throws(() => deckEdit(s, d('four', 'c')), /depth/);
  assert.throws(() => deckEdit(s, { ...d('a'), parent: 'c' }), /cycle|depth/);
  const moved = edit(s, deckEdit(s, { ...d('b'), parent: 'x' }));
  assert.equal((moved.entities['deck:c'] as Deck).parent, 'b');
  assert.deepEqual((moved.entities['deck:b'] as Deck).legacy, d('b').legacy);
  assert.equal(canonical(s), before);
  assert.equal(deckRecords(s, 'a').filter((e) => e.kind === 'activity').length, 1);
});
test('deck removal reassigns relationships atomically, never deletes content; Undo restores descendants and references', () => {
  const s = fixture();
  assert.throws(() => removeDeck(s, 'a', 'c'), /cycle|depth/);
  const next = edit(s, removeDeck(s, 'a', 'x'), 'remove');
  assert.equal((next.entities['deck:b'] as Deck).parent, 'x');
  assert.equal((next.entities['task:plan'] as any).deck, 'x');
  assert.equal((next.entities['preset:p'] as any).deck, 'x');
  assert.deepEqual(next.entities['activity:log'], s.entities['activity:log']);
  const restored = edit(next, { type: 'restore', deletion: 'remove' });
  assert.deepEqual(restored.entities, s.entities);
});
test('settings and profile edits preserve legacy/unknown fields and unrelated layouts, and override migrated Calendar preferences', () => {
  const s = fixture();
  const changed = edit(
    edit(s, settingsEdit(s, { dl: 45, dv: 'm', h24: 1, ws: 1, rem: 0, st: 'note' })),
    profileEdit(s, { name: 'New name' }),
  );
  assert.equal(settings(changed).unknown, 'keep');
  assert.equal(settings(changed).h24, 1);
  assert.equal((changed.entities['settings:legacy'] as any).value.pf.h24, 0);
  assert.deepEqual((changed.entities['settings:legacy'] as any).value.order, ['best']);
  assert.deepEqual((changed.entities['settings:legacy'] as any).value.unknown, { keep: true });
  assert.throws(() => settingsEdit(s, { rt: '25:00' }), /Invalid/);
  assert.throws(() => settingsEdit(s, { dl: 0 }), /Invalid/);
});
test('duration-free preset edits/delete/recovery retain identity, compatibility and no logged time', () => {
  const s = fixture(),
    original = s.entities['preset:p'];
  assert.equal(original?.kind, 'preset');
  if (original?.kind !== 'preset') return;
  const changed = edit(s, presetEdit(s, { ...original, title: 'Updated', duration: 0 }));
  assert.deepEqual((changed.entities['preset:p'] as any).legacy, { unknown: 'keep' });
  const removed = edit(changed, { type: 'delete', keys: ['preset:p'] }, 'remove');
  const restored = edit(removed, { type: 'restore', deletion: 'remove' });
  assert.deepEqual(restored.entities, changed.entities);
  assert.equal(loggedMinutes(restored, '2026-10-28'), 60);
});
test('global search finds entries/tasks by date and deck, Notebook text and Reflection without mutations', () => {
  const s = fixture(),
    before = canonical(s);
  assert.equal(searchLogbook(s, 'book')[0]?.title, 'Read a book');
  assert.match(searchLogbook(s, 'voyage')[0]!.href, /item=plan/);
  assert.match(searchLogbook(s, 'quiet')[0]!.href, /phase=4/);
  assert.match(searchLogbook(s, 'lesson')[0]!.href, /screen=reflection/);
  assert.equal(searchLogbook(s, '2026-10-28').length, 3);
  assert.equal(searchLogbook(s, '').length, 0);
  assert.equal(canonical(s), before);
});
test('reminders are once per original local day, skip actual logs but never confuse plans with logging', () => {
  let s = fixture();
  const time = new Date(2026, 9, 28, 18, 30);
  assert.equal(reminderDue(s, time), false);
  s = edit(s, { type: 'delete', keys: ['activity:log'] });
  assert.equal(reminderDue(s, time), true);
  s = edit(s, { type: 'putMany', entities: [reminderReceipt('2026-10-28')] });
  assert.equal(reminderDue(s, time), false);
  assert.equal(reminderDue(s, new Date(2026, 9, 29, 18, 30)), true);
  s = edit(s, settingsEdit(s, { rem: 0 }));
  assert.equal(reminderDue(s, new Date(2026, 9, 29, 18, 30)), false);
});
test('profile digest media is atomic, verified on restart/replay, reversible and absent from operation payload bytes', async () => {
  const factory = new IDBFactory();
  let db = await openLogbook(factory, 'management');
  const blob = new Blob(['synthetic-photo'], { type: 'image/webp' }),
    digest = await sha256(await blob.arrayBuffer()),
    media = { id: digest, digest, blob };
  await assert.rejects(
    db.commit({
      id: 'missing',
      at: 1,
      edit: profileEdit(await db.load(), { name: 'Captain', avatarDigest: digest }),
    }),
    /attachment/,
  );
  assert.equal((await db.pending()).length, 0);
  await db.commit(
    {
      id: 'profile',
      at: 2,
      edit: profileEdit(await db.load(), { name: 'Captain', avatarDigest: digest }),
    },
    undefined,
    [media],
  );
  db.close();
  db = await openLogbook(factory, 'management');
  assert.equal(await (await db.attachment(digest))!.blob.text(), 'synthetic-photo');
  const saved = await db.load(),
    pending = await db.pending();
  assert.ok(!JSON.stringify(pending).includes('synthetic-photo'));
  const replica = await openLogbook(factory, 'replica');
  await replica.commit(pending[0]!.command, pending[0], [media]);
  assert.equal(canonical(await replica.load()), canonical(saved));
  await db.commit({ id: 'undo', at: 3, edit: { type: 'restore', deletion: 'profile' } });
  assert.deepEqual((await db.load()).entities, {});
  assert.equal(await (await db.attachment(digest))!.blob.text(), 'synthetic-photo');
  db.close();
  replica.close();
});
test('management edits after migration retain exact archive, Notebook drawing, Sea state and all original media bytes', async () => {
  const raw = JSON.stringify({
    docks: [{ id: 'a', n: 'Learning', c: '#d8b94c', ic: 'book' }],
    entries: [
      {
        id: 'e',
        t: 'Original',
        d: 'a',
        date: '2026-10-28',
        s: 540,
        e: 600,
        photo: 'data:image/png;base64,aGVsbG8=',
      },
    ],
    pre: [{ id: 'p', t: 'Read', d: 'a', dur: 0 }],
    name: 'Captain',
    av: 'data:image/png;base64,aGVsbG8=',
    nb: {
      '2026-10-28': {
        lines: [
          {
            id: 'l',
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
      },
    },
    bt: ['2026-10-28'],
    seen: { '2026-10': ['2026-10-28'] },
    pf: { h24: 0, unknown: 'keep' },
    unknown: { keep: true },
  });
  const options = { exclusion: { a: false }, maxSourceBytes: 100000, maxAttachmentBytes: 1000 },
    plan = await previewV8(raw, options),
    factory = new IDBFactory();
  let db = await openLogbook(factory, 'migrated');
  await migrateV8(db, plan, 'fixture', async (_raw, digest) => digest);
  const before = await db.load();
  await db.commit({ id: 'settings', at: 2, edit: settingsEdit(before, { dl: 45 }) });
  await db.commit({
    id: 'deck',
    at: 3,
    edit: deckEdit(await db.load(), { ...(before.entities['deck:a'] as Deck), name: 'Books' }),
  });
  db.close();
  db = await openLogbook(factory, 'migrated');
  const after = await db.load();
  assert.deepEqual(after.archive, before.archive);
  for (const [key, value] of Object.entries(before.entities))
    if (key !== 'deck:a') assert.deepEqual(after.entities[key], value);
  for (const b of plan.blobs)
    assert.equal(await (await db.attachment(b.id))!.blob.text(), await b.blob.text());
  db.close();
});
