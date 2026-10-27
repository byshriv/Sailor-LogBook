import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { openProofStore, WriteGateway } from '../../packages/persistence/src/index.ts';
import { emptyState, replay } from '../../packages/domain/src/index.ts';
import type { Command } from '../../packages/domain/src/index.ts';
const command = (id: string): Command => ({
  id,
  type: 'entry.put',
  entry: { id, title: 'Synthetic sample', wallDate: '2026-10-27', start: 540, end: 600 },
});

test('queued commands snapshot caller input before deferred persistence', async () => {
  const db = await openProofStore(new IDBFactory());
  const gateway = new WriteGateway(db, 'a', () => {});
  const input = command('snapshot');
  const saved = gateway.save(input);
  input.entry.title = 'Mutated after enqueue';
  await saved;
  assert.equal((await db.load()).entries.snapshot.title, 'Synthetic sample');
  db.close();
});

test('atomic head/operation save, restart/replay, duplicate delivery and ID collision', async () => {
  const factory = new IDBFactory();
  const first = await openProofStore(factory);
  await first.commit(command('one'), 'actor');
  first.close();
  const reopened = await openProofStore(factory);
  assert.equal((await reopened.load()).entries.one.title, 'Synthetic sample');
  assert.equal((await reopened.commit(command('one'), 'actor')).duplicate, true);
  await assert.rejects(
    reopened.commit(
      { ...command('one'), entry: { ...command('one').entry, title: 'Collision' } },
      'actor',
    ),
    /reused/,
  );
  assert.equal(Object.keys((await reopened.load()).entries).length, 1);
  reopened.close();
});
test('concurrent gateways serialize in IndexedDB without losing either write', async () => {
  const db = await openProofStore(new IDBFactory());
  await Promise.all([db.commit(command('one'), 'a'), db.commit(command('two'), 'b')]);
  assert.equal(Object.keys((await db.load()).entries).length, 2);
  db.close();
});
test('abort rolls back both stores, never schedules sync, retry uses next available sequence', async () => {
  const factory = new IDBFactory();
  const originalOpen = factory.open.bind(factory);
  // Inject a real transaction abort after the head write is queued.
  let abortOnce = true;
  factory.open = (...args) => {
    const opening = originalOpen(...args);
    opening.addEventListener('success', () => {
      const originalTransaction = opening.result.transaction.bind(opening.result);
      opening.result.transaction = (...txArgs) => {
        const tx = originalTransaction(...txArgs);
        if (tx.mode === 'readwrite' && abortOnce) {
          abortOnce = false;
          const originalObjectStore = tx.objectStore.bind(tx);
          tx.objectStore = (name) => {
            const store = originalObjectStore(name);
            if (name === 'head')
              store.put = () => {
                tx.abort();
                throw new DOMException('Quota exhausted', 'QuotaExceededError');
              };
            return store;
          };
        }
        return tx;
      };
    });
    return opening;
  };
  const db = await openProofStore(factory);
  let notifications = 0;
  const gateway = new WriteGateway(db, 'a', () => {
    notifications++;
  });
  await assert.rejects(gateway.save(command('one')), /Quota/);
  assert.deepEqual(await db.load(), emptyState());
  assert.equal(notifications, 0);
  const saved = await gateway.save(command('one'));
  assert.equal(saved.operation.sequence, 1);
  assert.equal(notifications, 1);
  db.close();
});
test('invalid commands do not persist and corrupted tails fail closed', async () => {
  const factory = new IDBFactory(),
    db = await openProofStore(factory);
  await assert.rejects(
    db.commit({ ...command('x'), entry: { ...command('x').entry, wallDate: '2026-02-30' } }, 'a'),
  );
  assert.deepEqual(await db.load(), emptyState());
  assert.throws(
    () => replay([{ schema: 1, id: 'x', actor: 'a', sequence: 2, command: command('x') }]),
    /Invalid/,
  );
  await db.commit(command('x'), 'a');
  db.close();
  const request = factory.open('slb-phase1-proof', 1);
  await new Promise<void>((resolve) => {
    request.onsuccess = () => resolve();
  });
  const tx = request.result.transaction('head', 'readwrite');
  tx.objectStore('head').delete('current');
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });
  request.result.close();
  const broken = await openProofStore(factory);
  await assert.rejects(broken.load(), /mismatch/);
  broken.close();
});
