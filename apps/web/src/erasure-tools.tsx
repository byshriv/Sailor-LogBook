import { useEffect, useRef, useState } from 'react';
import type { Projection } from './management-ui.tsx';
import { Modal } from './management-ui.tsx';
import type { ErasureJob } from '../../../packages/persistence/src/logbook.ts';
import type { ErasurePort } from '../../../packages/sync-providers/src/dropbox.ts';
import { ErasureEngine } from './erasure-engine.ts';
import type { ErasurePreview } from './erasure-engine.ts';

export function ErasureTools({
  projection,
  port,
  blocked,
  prepare,
  onActive,
  onBusy,
  onErased,
}: {
  projection: Projection;
  port?: ErasurePort;
  blocked: boolean;
  prepare: () => Promise<void>;
  onActive: (active: boolean) => void;
  onBusy: (busy: boolean) => void;
  onErased: () => void;
}) {
  const [job, setJob] = useState<ErasureJob | undefined>(projection.erasure),
    [preview, setPreview] = useState<ErasurePreview | null>(null),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [word, setWord] = useState(''),
    [understood, setUnderstood] = useState(false),
    [legacyStopped, setLegacyStopped] = useState(false);
  const running = useRef(false),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    onActive(!!job || !!preview || busy);
  }, [job, preview, busy, onActive]);
  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  const run = async (work: (signal: AbortSignal) => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    controller.current = new AbortController();
    try {
      await work(controller.current.signal);
    } catch {
      setStatus(
        'Deletion not complete · local data is retained unless already cleared. Cloud changes may be partial. Editing/sync stay paused once confirmed; reconnect, resume or review remaining files.',
      );
    } finally {
      const saved = await projection.db.erasureStatus().catch(() => undefined);
      setJob(saved);
      running.current = false;
      setBusy(false);
      if (saved?.phase === 'complete') {
        await projection.refresh();
        onErased();
      }
    }
  };
  const review = (scope: 'local' | 'everywhere') =>
    run(async (signal) => {
      setStatus('Stopping pending sync and preparing a read-only deletion preview…');
      await prepare();
      if (signal.aborted) throw Error('Review paused');
      const p = await new ErasureEngine(projection.db, port).preview(scope, signal);
      setPreview(p);
      setWord('');
      setUnderstood(false);
      setLegacyStopped(false);
      setStatus('Preview only · nothing erased. Permanent erasure has no Undo.');
    });
  if (job?.phase === 'complete')
    return (
      <section aria-label="Erasure result">
        <h3>{job.scope === 'local' ? 'Local content erased' : 'Reviewed deletion verified'}</h3>
        <p>
          {job.scope === 'local'
            ? 'Production logbook content, media, local recovery history and keys were cleared in this browser profile. Dropbox was not changed by this action.'
            : 'Reviewed app cloud files were absent at the final check and this profile’s production content, media, recovery history and keys were cleared. A content-free cloud deletion barrier remains.'}
        </p>
        <p>
          Other profiles, offline devices, the separate demo, downloaded backups and Dropbox-managed
          deleted-file/version retention remain. Logical clearing is not a forensic secure-wipe
          guarantee. Retired legacy or malicious authorized clients can still recreate provider
          files.
        </p>
        <button
          onClick={() =>
            void projection.db
              .startAfterErasure(job.id)
              .then(() => {
                projection.db.close();
                location.assign('/?phase=9&tool=help');
              })
              .catch(() => setStatus('New local session could not start; reopen this screen.'))
          }
        >
          Start a new local logbook
        </button>
        <p role="status">{status}</p>
      </section>
    );
  return (
    <section aria-label="Permanent data erasure">
      <h3>Permanent data erasure</h3>
      <p>
        Lock and Disconnect keep your data. These separate actions permanently clear content with no
        Undo. Download a backup first if you want to keep a copy.
      </p>
      {job ? (
        <>
          <p role="alert">
            Deletion pending · editing and sync are paused. Local data remains until the reviewed
            cloud deletion is verified.
          </p>
          <button
            disabled={blocked || busy || (job.scope === 'everywhere' && !port)}
            onClick={() =>
              void run(async (signal) => {
                await prepare();
                await new ErasureEngine(projection.db, port).resume(job.id, signal, setStatus);
              })
            }
          >
            Resume reviewed deletion
          </button>
          <button
            disabled={blocked || busy || (job.scope === 'everywhere' && !port)}
            onClick={() => void review(job.scope)}
          >
            Review remaining deletion
          </button>
          {!port && job.scope === 'everywhere' && (
            <p>Reconnect Dropbox above to resume. No credentials are stored in the deletion job.</p>
          )}
        </>
      ) : (
        <>
          <button disabled={blocked || busy} onClick={() => void review('local')}>
            Erase local data
          </button>
          <button disabled={blocked || busy || !port} onClick={() => void review('everywhere')}>
            Delete logbook everywhere
          </button>
        </>
      )}
      <p role="status">{status}</p>
      {busy && !preview && (
        <button onClick={() => controller.current?.abort()}>Pause deletion</button>
      )}
      {preview && (
        <Modal
          title={
            preview.job.scope === 'local'
              ? 'Erase local data preview'
              : 'Delete logbook everywhere preview'
          }
          close={() => {
            if (!busy) setPreview(null);
          }}
        >
          <p role="status">{status}</p>
          <p>
            Current records: {preview.records}. All production media, pending operations, trash,
            local recovery/migration archives and keys in this profile will be removed. The separate
            demo and downloaded files are outside this local scope.
          </p>
          {preview.job.scope === 'everywhere' && (
            <>
              <p>
                The current production cloud content will be replaced by a content-free deletion
                barrier. Reviewed legacy data, app media and app-owned backup files below will be
                deleted at their exact revisions. Unknown/unrelated files and the Dropbox account
                are preserved. Other offline devices and provider history remain.
              </p>
              <ul style={{ overflowWrap: 'anywhere' }}>
                {preview.job.targets.map((f) => (
                  <li key={f.path}>{f.path}</li>
                ))}
              </ul>
              <p>
                Legacy demo clients do not honor the new barrier and can recreate their old file.
                Stop them and revoke untrusted Dropbox access. This app cannot remotely erase their
                local copies or prevent a malicious authorized writer.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={legacyStopped}
                  disabled={busy}
                  onChange={(e) => setLegacyStopped(e.target.checked)}
                />
                I stopped legacy writers and understand other offline copies remain
              </label>
            </>
          )}
          <label>
            <input
              type="checkbox"
              checked={understood}
              disabled={busy}
              onChange={(e) => setUnderstood(e.target.checked)}
            />
            I understand this is permanent and has no Undo; I saved any backup I need
          </label>
          <label>
            Type {preview.job.scope === 'local' ? 'ERASE LOCAL' : 'DELETE EVERYWHERE'} to confirm
            <input value={word} disabled={busy} onChange={(e) => setWord(e.target.value)} />
          </label>
          <button
            disabled={
              busy ||
              !understood ||
              word !== (preview.job.scope === 'local' ? 'ERASE LOCAL' : 'DELETE EVERYWHERE') ||
              (preview.job.scope === 'everywhere' && !legacyStopped)
            }
            onClick={() =>
              void run(async (signal) => {
                await prepare();
                await new ErasureEngine(projection.db, port).confirm(preview, signal, setStatus);
                setPreview(null);
              })
            }
          >
            Confirm permanent erasure
          </button>
          <button disabled={busy} onClick={() => setPreview(null)}>
            Cancel deletion preview
          </button>
          {busy && <button onClick={() => controller.current?.abort()}>Pause deletion</button>}
        </Modal>
      )}
    </section>
  );
}
