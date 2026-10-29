import { isNative } from './native.ts';
import { device } from './native-production.ts';
import styles from './management.module.css';
import { useEffect, useState } from 'react';
import type { Entity } from '../../../packages/domain/src/logbook.ts';
import { canonical } from '../../../packages/domain/src/logbook.ts';
import type { ImportPreview } from '../../../packages/persistence/src/backup.ts';
import {
  applyImport,
  backupLimit,
  exportBackup,
  planImport,
  previewBackup,
} from '../../../packages/persistence/src/backup.ts';
import type { Projection } from './management-ui.tsx';
import { Modal } from './management-ui.tsx';
import { PwaStatus } from './pwa.tsx';

function describe(entity: Entity | undefined): string {
  if (!entity) return 'Deleted or absent on this device';
  if (entity.kind === 'activity')
    return entity.title + ' · ' + entity.segments.map((s) => s.date).join(', ');
  if (entity.kind === 'task') return entity.title + ' · ' + entity.date + ' · ' + entity.status;
  if (entity.kind === 'deck') return entity.name;
  if (entity.kind === 'preset') return entity.title + ' · ' + entity.duration + ' min';
  if (entity.kind === 'moment') return entity.text + ' · ' + entity.date;
  if (entity.kind === 'page')
    return (
      entity.date +
      ' · ' +
      entity.lines.length +
      ' lines · ' +
      entity.strokes.length +
      ' drawing strokes'
    );
  return entity.kind === 'settings'
    ? 'Profile and preferences'
    : entity.kind === 'reflection'
      ? 'Reflection'
      : 'Saved history';
}
export async function downloadText(raw: string, name: string) {
  if (isNative()) {
    await device.saveBackup({ raw, name });
    return;
  }
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function DataTools({
  projection,
  blocked,
  onActive,
  decrypted,
}: {
  projection: Projection;
  blocked: boolean;
  onActive?: (active: boolean) => void;
  decrypted?: { raw: string } | null;
}) {
  const [incoming, setIncoming] = useState<ImportPreview | null>(null),
    [mode, setMode] = useState<'merge' | 'replace'>('merge'),
    [baseline, setBaseline] = useState(''),
    [choices, setChoices] = useState<Record<string, 'local' | 'incoming'>>({}),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [points, setPoints] = useState<{ id: string; reason: string }[]>([]),
    [restore, setRestore] = useState(''),
    [exclusions, setExclusions] = useState<Record<string, boolean>>({}),
    [orphans, setOrphans] = useState<Record<string, string | null>>({});
  const [cloudSources, setCloudSources] = useState<{ id: string; source: string }[]>([]);
  useEffect(() => {
    onActive?.(busy || !!incoming || !!restore);
    return () => onActive?.(false);
  }, [busy, incoming, restore, onActive]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (busy || incoming || restore) e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [busy, incoming, restore]);
  const db = projection.db;
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setStatus(
        'Not completed · ' + (e as Error).message + '. Existing data and preview retained.',
      );
    } finally {
      setBusy(false);
    }
  };
  const plan = incoming ? planImport(projection.store.getState(), incoming, mode, choices) : null;
  const preview = async (raw: string, ex = exclusions, or = orphans) => {
    const p = await previewBackup(raw, ex, or);
    setBaseline(canonical(await db.load()));
    setIncoming(p);
    setChoices({});
    setStatus('Preview only · no logbook data changed');
  };
  useEffect(() => {
    if (decrypted) void run(() => preview(decrypted.raw));
  }, [decrypted]);
  return (
    <section className={styles.dataTools} aria-label="Backup and recovery">
      <h3>Backup and recovery</h3>
      <PwaStatus />
      <p>
        Plaintext files include your journal, settings, original media and archived data. Store them
        privately. With a configured key, use Download encrypted backup in Dropbox synchronization
        by default; this plaintext export is explicit. Transfer limit: 64 MiB. A download request
        cannot prove the file was saved; reopen it with Preview import to verify your copy.
      </p>
      <button
        disabled={blocked || busy || !!incoming || !!restore}
        onClick={() =>
          void run(async () => {
            await downloadText(await exportBackup(db), 'sailor-logbook-v1.json');
            setStatus(
              isNative()
                ? 'Backup saved and read back · reopen it through Preview import to verify recovery.'
                : 'Verified backup prepared · check your Downloads',
            );
          })
        }
      >
        Download plaintext backup
      </button>
      <label>
        Preview import
        <input
          type="file"
          accept="application/json,.json"
          disabled={blocked || busy || !!restore}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f)
              void run(async () => {
                if (f.size > backupLimit) throw Error('Backup exceeds 64 MiB transfer limit');
                setExclusions({});
                setOrphans({});
                await preview(await f.text(), {}, {});
              });
          }}
        />
      </label>
      <button
        disabled={blocked || busy || !!incoming || !!restore}
        onClick={() =>
          void run(async () => {
            setCloudSources(await db.syncSources());
            setStatus(
              'Retained Dropbox copies listed · preview a copy to recover alternatives; nothing applied',
            );
          })
        }
      >
        Review retained Dropbox copies
      </button>
      {cloudSources.map((copy) => (
        <div key={copy.id}>
          Dropbox recovery copy {copy.id.slice(6, 18)}{' '}
          <button
            disabled={blocked || busy || !!incoming || !!restore}
            onClick={() => void run(() => preview(copy.source))}
          >
            Preview retained copy {copy.id.slice(6, 18)}
          </button>
        </div>
      ))}
      <button
        disabled={blocked || busy || !!incoming || !!restore}
        onClick={() =>
          void run(async () => {
            const p = await db.recovery(crypto.randomUUID(), 'Manual recovery');
            if (canonical(await db.recoverySnapshot(p.id)) !== canonical(p.snapshot.state))
              throw Error('Recovery verification failed');
            setStatus('Recovery point saved and verified');
            setPoints((await db.recoveryPoints()).filter((p) => p.snapshot));
          })
        }
      >
        Save recovery point
      </button>
      <button
        disabled={blocked || busy || !!incoming || !!restore}
        onClick={() =>
          void run(async () => {
            await db.load();
            const p = await db.pending();
            setPoints((await db.recoveryPoints()).filter((p) => p.snapshot));
            const estimate = await navigator.storage?.estimate?.();
            const persisted = await navigator.storage?.persisted?.();
            setStatus(
              `Replay and live media hashes verified. ${p.length} local operations retained; cloud sync is not connected. ${persisted ? 'Persistent storage granted' : 'Standard browser storage'}. ${estimate?.usage == null ? 'Usage unavailable' : (estimate.usage / 1048576).toFixed(1) + ' MiB estimated usage'}${estimate?.quota ? ' of ' + (estimate.quota / 1048576).toFixed(0) + ' MiB quota' + (estimate.usage && estimate.usage / estimate.quota > 0.8 ? ' · Low storage: download a backup and free device space' : '') : ''}. Browser/OS clearing can still remove local copies.`,
            );
          })
        }
      >
        Verify storage and list recovery
      </button>
      <p role="status">{status}</p>
      <p>
        Five ordinary local recovery points are retained. They share browser storage and cannot
        replace an external backup. Restore retains a pre-restore point and existing media; no
        physical media cleanup occurs.
      </p>
      {points.map((p) => (
        <p key={p.id}>
          {p.reason}{' '}
          <button
            disabled={blocked || busy || !!incoming || !!restore}
            onClick={() => {
              setRestore(p.id);
              setBaseline(canonical(projection.store.getState()));
            }}
          >
            Review restore
          </button>
        </p>
      ))}
      {restore && (
        <Modal
          title="Restore local recovery point"
          close={() => {
            if (!busy) setRestore('');
          }}
        >
          <p>
            This replaces current records and settings with the selected snapshot. A verified
            pre-restore recovery point is required. Download a backup first if you need an external
            copy.
          </p>
          <button disabled={busy} onClick={() => setRestore('')}>
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const snapshot = await db.recoverySnapshot(restore);
                await db.commit(
                  { id: crypto.randomUUID(), at: Date.now(), edit: { type: 'recover', snapshot } },
                  undefined,
                  [],
                  baseline,
                );
                await projection.refresh();
                setRestore('');
                setStatus('Restored locally · pre-restore recovery retained');
              })
            }
          >
            Restore this recovery point
          </button>
          <p role="status">{status}</p>
        </Modal>
      )}
      {incoming && plan && (
        <Modal
          title="Import preview"
          close={() => {
            if (!busy) setIncoming(null);
          }}
        >
          <p>
            {incoming.legacy ? 'Legacy unencrypted demo backup' : 'Version 1 backup · schema 2'}.{' '}
            {Object.keys(incoming.state.entities).length} incoming records, {incoming.media.length}{' '}
            media objects. Current: {plan.before}; result: {plan.after} records.
          </p>
          <label>
            Import mode
            <select
              disabled={busy}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as 'merge' | 'replace');
                setChoices({});
              }}
            >
              <option value="merge">Merge</option>
              <option value="replace">Replace</option>
            </select>
          </label>
          <p>
            {mode === 'merge'
              ? 'New IDs are added. Review colliding IDs and deletion barriers below. The full incoming copy is retained in the archive.'
              : 'Replace all current records and settings. Existing recovery/history/media remain retained; imported history is archived.'}{' '}
            A verified local recovery point is committed atomically before any replacement. Cancel
            changes nothing.
          </p>
          {incoming.review.map((r) => (
            <p key={r}>
              {r}
              {r.startsWith('exclusion:') && (
                <select
                  aria-label={r}
                  disabled={busy}
                  value={
                    exclusions[r.slice(10)] === undefined ? '' : String(exclusions[r.slice(10)])
                  }
                  onChange={(e) => {
                    const ex = { ...exclusions, [r.slice(10)]: e.target.value === 'true' };
                    setExclusions(ex);
                    void run(() => preview(incoming.source, ex, orphans));
                  }}
                >
                  <option value="" disabled>
                    Review streak rule
                  </option>
                  <option value="false">Counts toward hours streak</option>
                  <option value="true">Exclude from hours streak</option>
                </select>
              )}
              {r.startsWith('deck-reference:') && (
                <button
                  disabled={busy}
                  onClick={() => {
                    const or = { ...orphans, [r.slice(15)]: null };
                    setOrphans(or);
                    void run(() => preview(incoming.source, exclusions, or));
                  }}
                >
                  Leave orphan records uncategorized (source retained)
                </button>
              )}
            </p>
          ))}
          {mode === 'merge' &&
            Object.entries(incoming.state.entities)
              .filter(([k, e]) => {
                const s = projection.store.getState();
                return (
                  s.tombstones[k] || (s.entities[k] && canonical(s.entities[k]) !== canonical(e))
                );
              })
              .map(([k, entity]) => (
                <fieldset key={k} className={styles.comparison}>
                  <legend>{describe(entity)}</legend>
                  <p>
                    <strong>On this device:</strong>{' '}
                    {describe(projection.store.getState().entities[k])}
                  </p>
                  <p>
                    <strong>Imported:</strong> {describe(entity)}
                  </p>
                  <details>
                    <summary>Compare full record details</summary>
                    <p>On this device</p>
                    <pre>
                      {JSON.stringify(
                        projection.store.getState().entities[k] ?? { deleted: true },
                        null,
                        2,
                      )}
                    </pre>
                    <p>Imported</p>
                    <pre>{JSON.stringify(entity, null, 2)}</pre>
                    <small>Record reference: {k}</small>
                  </details>
                  <label>
                    Version to keep
                    <select
                      aria-label={'Conflict ' + k}
                      disabled={busy}
                      value={choices[k] ?? ''}
                      onChange={(e) =>
                        setChoices({ ...choices, [k]: e.target.value as 'local' | 'incoming' })
                      }
                    >
                      <option value="" disabled>
                        Choose version
                      </option>
                      <option value="local">Keep local (including deletion)</option>
                      <option value="incoming">Use imported version</option>
                    </select>
                  </label>
                </fieldset>
              ))}
          <p role="alert">
            {plan.error
              ? 'Review relationships: ' + plan.error + '. Change choices or use Replace.'
              : ''}
          </p>
          <button disabled={busy} onClick={() => setIncoming(null)}>
            Cancel import
          </button>
          <button
            disabled={
              busy ||
              !!plan.error ||
              !!plan.conflicts.length ||
              incoming.review.some(
                (r) => r.startsWith('exclusion:') || r.startsWith('deck-reference:'),
              )
            }
            onClick={() =>
              void run(async () => {
                await applyImport(db, incoming, mode, baseline, choices);
                await projection.refresh();
                setIncoming(null);
                setStatus('Import saved locally · pre-import recovery verified');
              })
            }
          >
            Apply reviewed import
          </button>
          <p role="status">{status}</p>
        </Modal>
      )}
    </section>
  );
}
