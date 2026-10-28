import { useState, useSyncExternalStore } from 'react';
import type { Root } from 'react-dom/client';
import { openLogbook } from '../../../packages/persistence/src/logbook.ts';
import type { LogbookStore } from '../../../packages/persistence/src/logbook.ts';
import type { EditCommand } from '../../../packages/domain/src/logbook.ts';
import { createLogbookProjection } from './logbook-store.ts';

type Projection = Awaited<ReturnType<typeof createLogbookProjection>>;
function StoragePreview({ db, projection }: { db: LogbookStore; projection: Projection }) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('Ready · local Phase 2 preview');
  const [busy, setBusy] = useState(false);
  async function save(edit: EditCommand['edit']) {
    setBusy(true);
    setStatus('Saving locally…');
    try {
      const result = await projection.save({ id: crypto.randomUUID(), at: Date.now(), edit });
      setStatus(
        result.effectsFailed
          ? 'Saved locally · reopen to refresh the view.'
          : 'Saved locally · cloud sync is not connected',
      );
      return true;
    } catch (error) {
      setStatus(
        'Unsaved · ' +
          (error instanceof Error ? error.message : 'Storage failed') +
          '. Existing data and draft retained.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <small>SAILOR LOGBOOK / PHASE 2 STORAGE PREVIEW</small>
      <h1>A recoverable logbook.</h1>
      <p>
        Synthetic records only. This isolated preview exercises local saves, deletion and recovery.
        Product screens remain in the v8 demo.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const id = crypto.randomUUID();
          if (
            await save({
              type: 'put',
              entity: {
                kind: 'activity',
                id,
                title,
                deck: null,
                zone: null,
                segments: [{ date: '2026-10-28', start: 540, end: 600, offset: null }],
                attachments: [],
              },
            })
          )
            setTitle('');
        }}
      >
        <label htmlFor="phase2-title">Synthetic activity title</label>
        <input
          id="phase2-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button disabled={busy || !title.trim()}>Save activity locally</button>
      </form>
      <p role="status" aria-live="polite">
        {status}
      </p>
      <ul>
        {Object.entries(state.entities).map(
          ([key, entity]) =>
            entity.kind === 'activity' && (
              <li key={key}>
                {entity.title}{' '}
                <button disabled={busy} onClick={() => void save({ type: 'delete', keys: [key] })}>
                  Delete {entity.title}
                </button>
              </li>
            ),
        )}
      </ul>
      <section>
        <h2>Recently deleted and Undo</h2>
        {Object.values(state.trash)
          .filter((t) => t.expiresAt > Date.now())
          .map((t) => (
            <p key={t.command}>
              Recoverable until {new Date(t.expiresAt).toLocaleDateString('en')}{' '}
              <button
                disabled={busy}
                onClick={() => void save({ type: 'restore', deletion: t.command })}
              >
                Undo deletion
              </button>
            </p>
          ))}
      </section>
      <button
        disabled={busy}
        onClick={async () => {
          try {
            await db.recovery(crypto.randomUUID(), 'Manual preview recovery');
            setStatus('Recovery point saved locally');
          } catch {
            setStatus('Recovery point could not be saved. Existing data retained.');
          }
        }}
      >
        Save recovery point
      </button>
    </main>
  );
}
export async function startPhase2(root: Root) {
  const message = (text: string) =>
    root.render(
      <main>
        <h1>Sailor Logbook</h1>
        <p role="status">{text}</p>
      </main>,
    );
  if (!navigator.locks) {
    message('This preview requires Web Locks in a secure browser context.');
    return;
  }
  await navigator.locks.request('slb-phase2-editor', { ifAvailable: true }, async (lock) => {
    if (!lock) {
      message('Another Phase 2 preview tab is active. Return to it, or close it and reload.');
      return;
    }
    try {
      const db = await openLogbook(indexedDB);
      const projection = await createLogbookProjection(db, () => {
        /* transport is Phase 9; pending operations remain durable */
      });
      root.render(<StoragePreview db={db} projection={projection} />);
      await new Promise<void>(() => {});
    } catch {
      message('Storage validation failed. Existing data is retained; export/recovery is required.');
    }
  });
}
