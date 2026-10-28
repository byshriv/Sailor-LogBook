import { emptyState, replay, transition } from '../../domain/src/index.ts';
import type { Command, Operation, State } from '../../domain/src/index.ts';

interface Head {
  sequence: number;
  state: State;
}
export interface Commit {
  state: State;
  operation: Operation;
  duplicate: boolean;
}
export interface DurableStore {
  commit(command: Command, actor: string): Promise<Commit>;
  load(): Promise<State>;
}
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const completion = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Local write aborted'));
    tx.onerror = () => {
      /* abort event supplies final transaction outcome */
    };
  });

export async function openProofStore(
  factory: IDBFactory,
  name = 'slb-phase1-proof',
): Promise<DurableStore & { close(): void }> {
  const opening = factory.open(name, 1);
  opening.onupgradeneeded = () => {
    opening.result.createObjectStore('head');
    opening.result.createObjectStore('operations', { keyPath: 'id' });
  };
  const db = await request(opening);
  db.onversionchange = () => db.close();
  return {
    close: () => db.close(),
    async load() {
      const tx = db.transaction(['head', 'operations'], 'readonly');
      const done = completion(tx);
      const [head, ops] = await Promise.all([
        request(tx.objectStore('head').get('current')) as Promise<Head | undefined>,
        request(tx.objectStore('operations').getAll()) as Promise<Operation[]>,
      ]);
      await done;
      const state = replay(ops.sort((a, b) => a.sequence - b.sequence));
      if (
        (head?.sequence ?? 0) !== ops.length ||
        JSON.stringify(head?.state ?? emptyState()) !== JSON.stringify(state)
      ) {
        throw new Error('Projection/tail mismatch; recovery required');
      }
      return state;
    },
    async commit(command, actor) {
      // Validation before opening a transaction; no network/crypto awaits within it.
      transition(emptyState(), command);
      if (!actor) throw new Error('Actor required');
      const tx = db.transaction(['head', 'operations'], 'readwrite');
      const done = completion(tx);
      try {
        const heads = tx.objectStore('head'),
          operations = tx.objectStore('operations');
        const [stored, existing] = await Promise.all([
          request(heads.get('current')) as Promise<Head | undefined>,
          request(operations.get(command.id)) as Promise<Operation | undefined>,
        ]);
        const head = stored ?? { sequence: 0, state: emptyState() };
        if (existing) {
          if (JSON.stringify(existing.command) !== JSON.stringify(command))
            throw new Error('Operation ID reused');
          await done;
          return { state: head.state, operation: existing, duplicate: true };
        }
        const operation: Operation = {
          schema: 1,
          id: command.id,
          actor,
          sequence: head.sequence + 1,
          command,
        };
        const state = transition(head.state, command);
        operations.add(operation);
        heads.put({ sequence: operation.sequence, state }, 'current');
        await done; // A request succeeding is not a committed transaction.
        return { state, operation, duplicate: false };
      } catch (error) {
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
        await done.catch(() => undefined);
        throw error;
      }
    },
  };
}

export class WriteGateway {
  private tail: Promise<unknown> = Promise.resolve();
  private store: DurableStore;
  private actor: string;
  private afterDurable: (commit: Commit) => void;
  constructor(store: DurableStore, actor: string, afterDurable: (commit: Commit) => void) {
    this.store = store;
    this.actor = actor;
    this.afterDurable = afterDurable;
  }
  save(command: Command): Promise<Commit> {
    const snapshot = structuredClone(command);
    const result = this.tail.then(() => this.store.commit(snapshot, this.actor));
    // A failed write must not poison subsequent retries or schedule sync.
    this.tail = result.catch(() => undefined);
    return result.then((commit) => {
      this.afterDurable(commit);
      return commit;
    });
  }
}
