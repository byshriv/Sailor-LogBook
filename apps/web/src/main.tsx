import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { emptyState } from '../../../packages/domain/src/index.ts';
import type { State } from '../../../packages/domain/src/index.ts';
import { openProofStore, WriteGateway } from '../../../packages/persistence/src/index.ts';
import './tokens.css';
import { benchmarkArgon } from '../../../packages/crypto/src/argon.ts';
import { launchAction, listenForWidgetLaunch, publishWidget } from './native.ts';

const slice = createSlice({
  name: 'proof',
  initialState: emptyState(),
  reducers: {
    loaded: (_state, action: PayloadAction<State>) => action.payload,
  },
});
const store = configureStore({ reducer: slice.reducer });
let gateway: WriteGateway;
function App() {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('Ready · local proof only');
  const [busy, setBusy] = useState(false);
  const [benchmark, setBenchmark] = useState('Not run');
  const [widgetStatus, setWidgetStatus] = useState('');
  useEffect(() => {
    const receive = (action: string) => {
      if (action === 'quick-log') {
        document.getElementById('title')?.focus();
        setStatus('Quick log launch received · synthetic logging form ready');
      } else if (action === 'today') setStatus('Today launch received · synthetic day ready');
    };
    let cancelled = false;
    let remove = () => {};
    void launchAction().then((action) => {
      if (!cancelled) receive(action);
    });
    void listenForWidgetLaunch(receive).then((cleanup) => {
      if (cancelled) cleanup();
      else remove = cleanup;
    });
    return () => {
      cancelled = true;
      remove();
    };
  }, []);
  return (
    <main>
      <small>SAILOR LOGBOOK / PHASE 1 FOUNDATION</small>
      <h1>A durable beginning.</h1>
      <p>
        This isolated architecture preview saves sample records locally. The v8 demo remains the
        product reference. Sync, migration and product screens arrive in later phases.
      </p>
      <section>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setStatus('Saving locally…');
            try {
              const id = crypto.randomUUID();
              const commit = await gateway.save({
                id,
                type: 'entry.put',
                entry: { id, title, wallDate: '2026-10-27', start: 540, end: 600 },
              });
              setTitle('');
              setStatus('Saved locally · cloud sync is not implemented');
              try {
                await publishWidget({
                  schema: 1,
                  revision: commit.operation.sequence,
                  wallDate: '2026-10-27',
                  loggedMinutes: 60,
                  bestCount: 0,
                  updatedAt: new Date().toISOString(),
                });
              } catch {
                setWidgetStatus('Saved locally; widget refresh failed. Reopen to retry.');
              }
            } catch {
              setStatus(
                'Unsaved · storage failed; your text is retained. Retry when storage is available.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="title">Sample entry title</label>
          <input
            id="title"
            value={title}
            maxLength={500}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <button disabled={busy || !title.trim()}>Save sample locally</button>
        </form>
        <p role="status" aria-live="polite">
          {status}
        </p>
        {widgetStatus && <p>{widgetStatus}</p>}
      </section>
      <section>
        <h2>Encryption feasibility</h2>
        <p>Runs Argon2id on synthetic input only. This preview does not encrypt your logbook.</p>
        <button
          onClick={async () => {
            setBenchmark('Running…');
            try {
              setBenchmark(`Argon2id proof passed · ${await benchmarkArgon()} ms`);
            } catch {
              setBenchmark('Argon2id unavailable in this environment');
            }
          }}
        >
          Run synthetic KDF check
        </button>
        <p data-testid="kdf-result">{benchmark}</p>
      </section>
      <section>
        <h2>Replayed records</h2>
        <p>
          Reopen this preview to verify the operation tail. Samples use 27 October 2026,
          09:00–10:00.
        </p>
        <ul>
          {Object.values(state.entries).map((e) => (
            <li key={e.id}>
              {e.title} <small>· {e.wallDate}</small>
            </li>
          ))}
        </ul>
        {!Object.keys(state.entries).length && <p>No sample records yet.</p>}
      </section>
    </main>
  );
}
const root = createRoot(document.getElementById('root')!);
function message(text: string) {
  root.render(
    <main>
      <h1>Sailor Logbook foundation</h1>
      <p role="status">{text}</p>
    </main>,
  );
}
async function start() {
  if (!navigator.locks) {
    message('This preview requires Web Locks. Open a supported secure browser context.');
    return;
  }
  await navigator.locks.request('slb-phase1-editor', { ifAvailable: true }, async (lock) => {
    if (!lock) {
      message('Another preview tab is active. Return to it, or close it and reload this tab.');
      return;
    }
    try {
      const db = await openProofStore(indexedDB);
      store.dispatch(slice.actions.loaded(await db.load()));
      gateway = new WriteGateway(db, crypto.randomUUID(), (commit) =>
        store.dispatch(slice.actions.loaded(commit.state)),
      );
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
      // Holding this request releases the browser-owned lock automatically on tab death.
      await new Promise<void>(() => {});
    } catch {
      message(
        'Storage could not be opened or replayed. Recovery is required; existing data has been retained.',
      );
    }
  });
}
if (new URLSearchParams(location.search).get('phase') === '3') {
  void import('./calendar.tsx').then(({ startCalendar }) => startCalendar(root));
} else if (new URLSearchParams(location.search).get('phase') === '2') {
  void import('./phase2.tsx').then(({ startPhase2 }) => startPhase2(root));
} else void start();
