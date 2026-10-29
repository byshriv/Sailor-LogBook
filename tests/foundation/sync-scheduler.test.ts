import test from 'node:test';
import assert from 'node:assert/strict';
import { ReviewScheduler } from '../../apps/web/src/sync-scheduler.ts';
import type { ReviewResult } from '../../apps/web/src/sync-scheduler.ts';
import { DropboxReadError } from '../../packages/sync-providers/src/dropbox.ts';
import { createLogbookProjection } from '../../apps/web/src/logbook-store.ts';
import { openLogbook } from '../../packages/persistence/src/logbook.ts';
import { IDBFactory } from 'fake-indexeddb';
function harness(review: () => Promise<ReviewResult>) {
  let now = 0,
    sequence = 0,
    paused = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const scheduler = new ReviewScheduler(
    review,
    () => paused++,
    () => now,
    {
      set: ((fn: () => void, ms: number) => {
        const id = ++sequence;
        timers.set(id, { at: now + ms, fn });
        return id;
      }) as any,
      clear: ((id: number) => timers.delete(id)) as any,
    },
  );
  return {
    scheduler,
    paused: () => paused,
    timers,
    advance: async (ms: number) => {
      now += ms;
      const ready = [...timers].filter(([, t]) => t.at <= now);
      for (const [id, t] of ready) {
        timers.delete(id);
        t.fn();
      }
      await new Promise<void>((resolve) => setImmediate(resolve));
    },
  };
}
test('review scheduling is opt-in, debounces durable work and blocks drafts/offline/hidden eligibility', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
    return { kind: 'done' };
  });
  h.scheduler.request();
  await h.advance(60000);
  assert.equal(calls, 0);
  h.scheduler.update(true, true);
  await h.advance(2000);
  h.scheduler.request();
  await h.advance(2999);
  assert.equal(calls, 0);
  await h.advance(1);
  assert.equal(calls, 1);
  h.scheduler.update(true, false);
  h.scheduler.request();
  await h.advance(60000);
  assert.equal(calls, 1);
  h.scheduler.update(true, true);
  await h.advance(0);
  assert.equal(calls, 2);
  h.scheduler.update(false, true);
  await h.advance(60000);
  assert.equal(calls, 2);
});
test('transient retries honor provider delays, resist edit/return bursts and stop after three retries', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
    return { kind: 'retry', after: 20000 };
  });
  h.scheduler.update(true, true);
  await h.advance(3000);
  assert.equal(calls, 1);
  h.scheduler.request();
  await h.advance(19999);
  assert.equal(calls, 1);
  await h.advance(1);
  assert.equal(calls, 2);
  await h.advance(20000);
  assert.equal(calls, 3);
  await h.advance(59999);
  assert.equal(calls, 3);
  await h.advance(1);
  assert.equal(calls, 4);
  assert.equal(h.paused(), 1);
  h.scheduler.request();
  await h.advance(300000);
  assert.equal(calls, 4);
});
test('long rate limits and permanent errors pause checks without blind retry', async () => {
  for (const result of [{ kind: 'stop' }, { kind: 'retry', after: 3600000 }] as ReviewResult[]) {
    const h = harness(async () => result);
    h.scheduler.update(true, true);
    await h.advance(3000);
    assert.equal(h.paused(), 1);
    assert.equal(h.timers.size, 0);
  }
});
test('checks never overlap and disposal prevents late completion from scheduling work', async () => {
  let calls = 0,
    finish!: (r: ReviewResult) => void;
  const h = harness(() => {
    calls++;
    return new Promise((resolve) => (finish = resolve));
  });
  h.scheduler.update(true, true);
  await h.advance(3000);
  h.scheduler.request();
  h.scheduler.update(true, true);
  await h.advance(60000);
  assert.equal(calls, 1);
  h.scheduler.dispose();
  finish({ kind: 'retry' });
  await h.advance(60000);
  assert.equal(calls, 1);
  assert.equal(h.timers.size, 0);
});
test('Retry-After uses server dates; authorization and conflict are not transient', () => {
  assert.equal(
    new DropboxReadError('safe', 429, new Headers({ 'Retry-After': '25' })).retryAfter,
    25000,
  );
  const headers = new Headers({
    Date: 'Wed, 01 Jan 2020 00:00:00 GMT',
    'Retry-After': 'Wed, 01 Jan 2020 00:01:00 GMT',
  });
  assert.equal(new DropboxReadError('safe', 503, headers).retryAfter, 60000);
  assert.equal(
    new DropboxReadError('safe', 429, new Headers({ 'Retry-After': 'bad' })).retryAfter,
    0,
  );
  for (const status of [401, 403, 409])
    assert.equal(new DropboxReadError('safe', status, headers).transient, false);
});
test('durability scheduling observes committed saves, never failed saves or projection refreshes', async () => {
  const db = await openLogbook(new IDBFactory(), 'scheduling');
  const projection = await createLogbookProjection(db, () => {});
  let saved = 0;
  const remove = projection.onDurable(() => saved++);
  await projection.save({
    id: 'one',
    at: 1,
    edit: { type: 'put', entity: { kind: 'history', id: 'one', value: 'saved' } },
  });
  assert.equal(saved, 1);
  assert.equal((await db.pending()).length, 1);
  await projection.refresh();
  assert.equal(saved, 1);
  await assert.rejects(
    projection.save({
      id: 'invalid',
      at: 2,
      edit: { type: 'put', entity: { kind: 'activity', id: 'bad' } as any },
    }),
  );
  assert.equal(saved, 1);
  remove();
  db.close();
});
