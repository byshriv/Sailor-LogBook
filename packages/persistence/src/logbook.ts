import {
  applyEdit,
  attachmentIds,
  blankLogbook,
  canonical,
  safeId,
  validateLogbook,
} from '../../domain/src/logbook.ts';
import type { Clock, EditCommand, Entity, Logbook } from '../../domain/src/logbook.ts';
import { sha256, textDigest } from './media.ts';

export interface CausalOperation {
  schema: 2;
  id: string;
  actor: string;
  sequence: number;
  clock: Clock;
  command: EditCommand;
}
interface Snapshot {
  state: Logbook;
  clock: Clock;
  revision: number;
}
interface Head extends Snapshot {
  actor: string;
}
interface Receipt {
  operation: CausalOperation;
  commandDigest: string;
  pending: boolean;
  revision: number;
}
interface CompactReceipt {
  operation: Omit<CausalOperation, 'command'>;
  commandDigest: string;
  pending: false;
  revision: number;
}
export interface DurableResult {
  state: Logbook;
  operation: CausalOperation;
  duplicate: boolean;
  effectsFailed?: boolean;
}
export interface RecoveryPoint {
  id: string;
  snapshot: Snapshot;
  reason: string;
}
const stores = ['meta', 'tail', 'receipts', 'recovery', 'blobs', 'migration'];
const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const complete = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? Error('Transaction aborted'));
    tx.onerror = () => {};
  });
function advance(clock: Clock, op: CausalOperation): Clock {
  safeId(op.actor);
  safeId(op.id);
  if (
    op.schema !== 2 ||
    op.id !== op.command.id ||
    !Number.isSafeInteger(op.sequence) ||
    op.sequence !== (clock[op.actor] ?? 0) + 1 ||
    op.clock[op.actor] !== op.sequence
  )
    throw Error('Invalid causal sequence');
  for (const [actor, n] of Object.entries(op.clock)) {
    safeId(actor);
    if (!Number.isSafeInteger(n) || n < 0 || (actor !== op.actor && n > (clock[actor] ?? 0)))
      throw Error('Missing causal dependency');
  }
  // Concurrent branches need Phase 9 conflict review; do not arbitrarily overwrite a local edit.
  for (const [actor, n] of Object.entries(clock))
    if (actor !== op.actor && n > (op.clock[actor] ?? 0))
      throw Error('Concurrent branch requires review');
  return { ...clock, [op.actor]: op.sequence };
}
export async function openLogbook(
  factory: IDBFactory,
  name = 'slb-phase2',
  actor = crypto.randomUUID(),
) {
  safeId(actor);
  const opening = factory.open(name, 2);
  opening.onupgradeneeded = () => {
    for (const name of stores)
      if (!opening.result.objectStoreNames.contains(name)) opening.result.createObjectStore(name);
  };
  const db = await req(opening);
  db.onversionchange = () => db.close();
  async function transaction<T>(
    mode: IDBTransactionMode,
    run: (tx: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    const tx = db.transaction(stores, mode),
      done = complete(tx);
    try {
      const result = await run(tx);
      await done;
      return result;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        /* completed */
      }
      await done.catch(() => {});
      throw error;
    }
  }
  const readHead = async (tx: IDBTransaction): Promise<Head> =>
    (await req(tx.objectStore('meta').get('head'))) ?? {
      actor,
      state: blankLogbook(),
      clock: {},
      revision: 0,
    };
  async function addRecovery(tx: IDBTransaction, key: string, point: RecoveryPoint) {
    const store = tx.objectStore('recovery');
    if (await req(store.get(key))) throw Error('Recovery ID reused');
    const keys = await req(store.getAllKeys()),
      values = (await req(store.getAll())) as RecoveryPoint[];
    const ordinary = values
      .map((value, i) => ({ value, key: keys[i]! }))
      .filter((r) => r.value.snapshot)
      .sort((a, b) => a.value.snapshot.revision - b.value.snapshot.revision);
    // Migration source archives have no snapshot property and are never aged out here.
    for (const r of ordinary.slice(0, Math.max(0, ordinary.length - 4))) store.delete(r.key);
    store.add(point, key);
  }
  async function verify(tx: IDBTransaction): Promise<Head> {
    if (!(await req(tx.objectStore('meta').get('head'))))
      throw Error('Missing head; recovery required');
    const head = await readHead(tx);
    const checkpoint: Snapshot = (await req(tx.objectStore('meta').get('checkpoint'))) ?? {
      state: blankLogbook(),
      clock: {},
      revision: 0,
    };
    validateLogbook(checkpoint.state);
    let state = checkpoint.state,
      clock = checkpoint.clock,
      revision = checkpoint.revision;
    const tail = (await req(tx.objectStore('tail').getAll())) as Receipt[];
    tail.sort((a, b) => a.revision - b.revision);
    for (const r of tail) {
      if (r.revision !== ++revision) throw Error('Operation gap; recovery required');
      clock = advance(clock, r.operation);
      state = applyEdit(state, r.operation.command);
    }
    if (
      !tail.length &&
      !checkpoint.revision &&
      !head.revision &&
      (await req(tx.objectStore('receipts').count()))
    )
      throw Error('Missing checkpoint; recovery required');
    if (
      canonical({ state, clock, revision }) !==
      canonical({ state: head.state, clock: head.clock, revision: head.revision })
    )
      throw Error('Projection mismatch; recovery required');
    return head;
  }
  // Initialize actor once, inside the same serialized transaction used by writers.
  await transaction('readwrite', async (tx) => {
    if (
      !(await req(tx.objectStore('meta').get('head'))) &&
      !(await req(tx.objectStore('meta').count())) &&
      !(await req(tx.objectStore('tail').count())) &&
      !(await req(tx.objectStore('receipts').count()))
    )
      tx.objectStore('meta').put(await readHead(tx), 'head');
  });
  return {
    close: () => db.close(),
    async load() {
      const loaded = await transaction('readonly', async (tx) => {
        const state = structuredClone((await verify(tx)).state);
        const ids = new Set(Object.values(state.entities).flatMap(attachmentIds));
        const blobs = [];
        for (const id of ids) {
          const b = await req(tx.objectStore('blobs').get(id));
          if (!b || b.id !== id || b.digest !== id)
            throw Error('Missing attachment; recovery required');
          blobs.push(b);
        }
        return { state, blobs };
      });
      // Crypto runs after the read transaction completes, never across an IDB auto-close boundary.
      for (const b of loaded.blobs)
        if ((await sha256(await b.blob.arrayBuffer())) !== b.digest)
          throw Error('Attachment corruption; recovery required');
      return loaded.state;
    },
    actor: () => transaction('readonly', async (tx) => (await readHead(tx)).actor),
    async commit(
      input: EditCommand,
      remote?: CausalOperation,
      attachments: { id: string; digest: string; blob: Blob }[] = [],
      expectedState?: string,
    ): Promise<DurableResult> {
      const command = structuredClone(input),
        incoming = remote && structuredClone(remote);
      const media = structuredClone(attachments);
      const commandDigest = await textDigest(canonical(command));
      for (const b of media)
        if (b.id !== b.digest || (await sha256(await b.blob.arrayBuffer())) !== b.digest)
          throw Error('Attachment digest mismatch');
      if (incoming && canonical(incoming.command) !== canonical(command))
        throw Error('Remote command mismatch');
      return transaction('readwrite', async (tx) => {
        const head = await verify(tx),
          receipts = tx.objectStore('receipts');
        if (expectedState !== undefined && canonical(head.state) !== expectedState)
          throw Error('Logbook changed since preview; preview again');
        const prior = (await req(receipts.get(command.id))) as Receipt | CompactReceipt | undefined;
        if (prior) {
          const operation: CausalOperation = { ...prior.operation, command };
          if (
            prior.commandDigest !== commandDigest ||
            (incoming && canonical(operation) !== canonical(incoming))
          )
            throw Error('Operation ID reused');
          return { state: head.state, operation, duplicate: true };
        }
        const sequence = (head.clock[head.actor] ?? 0) + 1;
        const operation: CausalOperation = incoming ?? {
          schema: 2,
          id: command.id,
          actor: head.actor,
          sequence,
          clock: { ...head.clock, [head.actor]: sequence },
          command,
        };
        const clock = advance(head.clock, operation),
          state = applyEdit(head.state, command),
          revision = head.revision + 1;
        if (command.edit.type === 'recover') {
          await addRecovery(tx, 'restore:' + command.id, {
            id: 'restore:' + command.id,
            reason: 'before restore',
            snapshot: { state: head.state, clock: head.clock, revision: head.revision },
          });
          const saved = await req(tx.objectStore('recovery').get('restore:' + command.id));
          if (canonical(saved.snapshot.state) !== canonical(head.state))
            throw Error('Recovery verification failed');
        }
        for (const b of media) tx.objectStore('blobs').put(b, b.id);
        for (const e of Object.values(state.entities))
          for (const id of attachmentIds(e))
            if (!(await req(tx.objectStore('blobs').get(id)))) throw Error('Missing attachment');
        const receipt: Receipt = { operation, commandDigest, revision, pending: !incoming };
        receipts.add(receipt, operation.id);
        tx.objectStore('tail').add(receipt, revision);
        tx.objectStore('meta').put({ ...head, state, clock, revision }, 'head');
        return { state, operation, duplicate: false };
      });
    },
    pending: () =>
      transaction('readonly', async (tx) =>
        ((await req(tx.objectStore('receipts').getAll())) as Receipt[])
          .filter((r) => r.pending)
          .map((r) => r.operation),
      ),
    acknowledge: (ids: string[]) =>
      transaction('readwrite', async (tx) => {
        for (const id of ids) {
          const r = (await req(tx.objectStore('receipts').get(id))) as Receipt | undefined;
          if (!r) throw Error('Unknown acknowledgement');
          tx.objectStore('receipts').put({ ...r, pending: false }, id);
        }
      }),
    checkpoint: () =>
      transaction('readwrite', async (tx) => {
        const head = await verify(tx),
          tail = ((await req(tx.objectStore('tail').getAll())) as Receipt[]).sort(
            (a, b) => a.revision - b.revision,
          );
        let base: Snapshot = (await req(tx.objectStore('meta').get('checkpoint'))) ?? {
          state: blankLogbook(),
          clock: {},
          revision: 0,
        };
        for (const r of tail) {
          const current = (await req(tx.objectStore('receipts').get(r.operation.id))) as Receipt;
          if (current.pending) break;
          base = {
            state: applyEdit(base.state, r.operation.command),
            clock: advance(base.clock, r.operation),
            revision: r.revision,
          };
          tx.objectStore('tail').delete(r.revision);
          const { command: _command, ...envelope } = r.operation;
          tx.objectStore('receipts').put(
            {
              operation: envelope,
              commandDigest: r.commandDigest,
              revision: r.revision,
              pending: false,
            } satisfies CompactReceipt,
            r.operation.id,
          );
        }
        tx.objectStore('meta').put(base, 'checkpoint');
        // Compact acknowledged payloads; retain causal tombstones and minimal duplicate receipts.
        return { revision: base.revision, retained: head.revision - base.revision };
      }),
    recentTrash: (now: number) =>
      transaction('readonly', async (tx) => {
        // Expiration is visibility/restore policy. Physical cleanup waits for a causal cleanup operation.
        const head = await verify(tx);
        return Object.values(head.state.trash).filter((t) => t.expiresAt > now);
      }),
    recovery: (id: string, reason: string) =>
      transaction('readwrite', async (tx) => {
        safeId(id);
        const head = await verify(tx);
        const point: RecoveryPoint = {
          id,
          reason,
          snapshot: { state: head.state, clock: head.clock, revision: head.revision },
        };
        await addRecovery(tx, id, point);
        return point;
      }),
    recoverySnapshot: async (id: string) => {
      const saved = await transaction('readonly', async (tx) => {
        const point = (await req(tx.objectStore('recovery').get(id))) as RecoveryPoint | undefined;
        if (!point?.snapshot) throw Error('Recovery point unavailable');
        validateLogbook(point.snapshot.state);
        const blobs = [];
        for (const key of new Set(
          Object.values(point.snapshot.state.entities).flatMap(attachmentIds),
        )) {
          const b = await req(tx.objectStore('blobs').get(key));
          if (!b || b.id !== key || b.digest !== key) throw Error('Recovery media missing');
          blobs.push(b);
        }
        return { state: point.snapshot.state, blobs };
      });
      for (const b of saved.blobs)
        if ((await sha256(await b.blob.arrayBuffer())) !== b.digest)
          throw Error('Recovery media corrupted');
      return saved.state;
    },
    // Explicit local rescue only. Retain every damaged store in an unaged forensic archive.
    // This creates a new causal actor; it must never be uploaded as a continuation by Phase 9.
    async rescueRecovery(id: string) {
      const state = await this.recoverySnapshot(id);
      return transaction('readwrite', async (tx) => {
        const point = await req(tx.objectStore('recovery').get(id));
        if (canonical(point?.snapshot?.state) !== canonical(state)) throw Error('Recovery changed');
        const retained = Object.fromEntries(
          await Promise.all(
            stores.map(async (name) => [
              name,
              {
                keys: await req(tx.objectStore(name).getAllKeys()),
                values: await req(tx.objectStore(name).getAll()),
              },
            ]),
          ),
        );
        const key = 'rescue:' + crypto.randomUUID();
        tx.objectStore('migration').add(
          { id: key, retained, reason: 'Before explicit local rescue' },
          key,
        );
        const verified = await req(tx.objectStore('migration').get(key));
        if (
          canonical(verified.retained.meta) !== canonical(retained.meta) ||
          canonical(verified.retained.tail) !== canonical(retained.tail)
        )
          throw Error('Rescue archive verification failed');
        tx.objectStore('meta').clear();
        tx.objectStore('tail').clear();
        tx.objectStore('receipts').clear();
        const snapshot = { state, clock: {}, revision: 0 };
        tx.objectStore('meta').put({ ...snapshot, actor: crypto.randomUUID() }, 'head');
        tx.objectStore('meta').put(snapshot, 'checkpoint');
      });
    },
    recoveryPoints: () =>
      transaction('readonly', async (tx) => {
        const recovery = tx.objectStore('recovery');
        const values = (await req(recovery.getAll())) as RecoveryPoint[];
        const keys = await req(recovery.getAllKeys());
        // Earlier recover points stored the command ID in the value and restore:ID as the key.
        // Present the durable lookup key without rewriting any existing point.
        return values.map((value, i) => ({ ...value, id: String(keys[i]) }));
      }),
    exportRetained: () =>
      transaction('readonly', async (tx) =>
        Object.fromEntries(
          await Promise.all(
            stores.map(async (name) => [
              name,
              {
                keys: await req(tx.objectStore(name).getAllKeys()),
                values: await req(tx.objectStore(name).getAll()),
              },
            ]),
          ),
        ),
      ),
    // Migration/recovery are explicit baselines, never captured as user interactions.
    async stageMigration(
      id: string,
      source: string,
      digest: string,
      state: Logbook,
      blobs: { id: string; blob: Blob; digest: string }[],
    ) {
      const snapshot = structuredClone(state);
      validateLogbook(snapshot);
      const suppliedIds = new Set(blobs.map((b) => b.id));
      for (const e of Object.values(snapshot.entities))
        for (const id of attachmentIds(e))
          if (!suppliedIds.has(id)) throw Error('Migration attachment missing');
      if ((await textDigest(source)) !== digest) throw Error('Source digest mismatch');
      const stateDigest = await textDigest(canonical(snapshot));
      for (const b of blobs)
        if (b.id !== b.digest || (await sha256(await b.blob.arrayBuffer())) !== b.digest)
          throw Error('Attachment digest mismatch');
      return transaction('readwrite', async (tx) => {
        const old = await req(tx.objectStore('migration').get(id));
        const staged = { id, source, digest, state: snapshot, stateDigest, blobs, complete: false };
        if (old) {
          if (canonical({ ...old, complete: false }) !== canonical(staged))
            throw Error('Migration source/destination mismatch');
          return;
        }
        await verify(tx);
        tx.objectStore('recovery').add(
          { id, source, digest, destination: await readHead(tx) },
          'migration:' + id,
        );
        tx.objectStore('migration').add(staged, id);
      });
    },
    migration: (id: string) =>
      transaction('readonly', (tx) => req(tx.objectStore('migration').get(id))),
    async activateMigration(id: string, digest: string) {
      const staged = await transaction('readonly', (tx) =>
        req(tx.objectStore('migration').get(id)),
      );
      if (
        !staged ||
        staged.digest !== digest ||
        (await textDigest(staged.source)) !== digest ||
        (await textDigest(canonical(staged.state))) !== staged.stateDigest
      )
        throw Error('Migration digest mismatch');
      for (const b of staged.blobs)
        if (b.id !== b.digest || (await sha256(await b.blob.arrayBuffer())) !== b.digest)
          throw Error('Attachment digest mismatch');
      return transaction('readwrite', async (tx) => {
        const m = await req(tx.objectStore('migration').get(id));
        if (!m || m.digest !== digest) throw Error('Migration digest mismatch');
        if (
          m.stateDigest !== staged.stateDigest ||
          canonical(m.state) !== canonical(staged.state) ||
          canonical(m.blobs) !== canonical(staged.blobs)
        )
          throw Error('Staging changed');
        if (m.complete) return;
        const head = await verify(tx);
        if (head.revision || Object.keys(head.state.entities).length || head.state.archive !== null)
          throw Error('Nonempty destination needs import/merge review');
        validateLogbook(m.state);
        const ids = new Set(m.blobs.map((b: { id: string }) => b.id));
        for (const e of Object.values(m.state.entities) as Entity[])
          for (const id of attachmentIds(e))
            if (!ids.has(id)) throw Error('Migration attachment missing');
        const snapshot: Snapshot = { state: m.state, clock: {}, revision: 0 };
        tx.objectStore('meta').put({ ...snapshot, actor: head.actor }, 'head');
        tx.objectStore('meta').put(snapshot, 'checkpoint');
        for (const b of m.blobs) tx.objectStore('blobs').put(b, b.id);
        tx.objectStore('migration').put({ ...m, complete: true }, id);
      });
    },
    attachment: (id: string) =>
      transaction('readonly', (tx) => req(tx.objectStore('blobs').get(id))),
  };
}
export type LogbookStore = Awaited<ReturnType<typeof openLogbook>>;
export class OperationPipeline {
  private tail: Promise<unknown> = Promise.resolve();
  private store: LogbookStore;
  private publish: (state: Logbook) => void;
  private schedule: () => void;
  constructor(store: LogbookStore, publish: (state: Logbook) => void, schedule: () => void) {
    this.store = store;
    this.publish = publish;
    this.schedule = schedule;
  }
  save(
    command: EditCommand,
    remote?: CausalOperation,
    attachments: { id: string; digest: string; blob: Blob }[] = [],
  ): Promise<DurableResult> {
    const input = structuredClone(command),
      incoming = remote && structuredClone(remote),
      media = structuredClone(attachments);
    const result = this.tail.then(() => this.store.commit(input, incoming, media));
    this.tail = result.catch(() => {});
    return result.then((r) => {
      let effectsFailed = false;
      try {
        this.publish(r.state);
      } catch {
        effectsFailed = true;
      }
      if (!incoming && !r.duplicate)
        try {
          this.schedule();
        } catch {
          effectsFailed = true;
        }
      return effectsFailed ? { ...r, effectsFailed } : r;
    });
  }
}
