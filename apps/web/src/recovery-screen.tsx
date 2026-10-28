import { useState } from 'react';
import type { LogbookStore } from '../../../packages/persistence/src/logbook.ts';
import { downloadText } from './data-tools.tsx';
export function RecoveryScreen({ db }: { db: LogbookStore }) {
  const [status, setStatus] = useState(
      'Storage validation failed. Existing data is retained. No automatic repair or clearing occurred.',
    ),
    [ids, setIds] = useState<string[]>([]),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setStatus('Recovery failed: ' + (e as Error).message + '. Retained data is unchanged.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main>
      <h1>Local recovery</h1>
      <p role="status">{status}</p>
      <p>
        Keep a retained-store export before restoring. This forensic file contains private data and
        media; it is not a normal import backup. Recovery creates a new local history and retains
        the damaged history for investigation. Cloud sync remains disconnected.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const raw = await db.exportRetained();
            async function encode(value: any): Promise<any> {
              if (value instanceof Blob) {
                const bytes = new Uint8Array(await value.arrayBuffer());
                let data = '';
                for (let i = 0; i < bytes.length; i += 8192)
                  data += String.fromCharCode(...bytes.subarray(i, i + 8192));
                return { blobEncoding: 'base64', type: value.type, data: btoa(data) };
              }
              if (Array.isArray(value)) return Promise.all(value.map(encode));
              if (value && typeof value === 'object')
                return Object.fromEntries(
                  await Promise.all(
                    Object.entries(value).map(async ([k, v]) => [k, await encode(v)]),
                  ),
                );
              return value;
            }
            downloadText(
              JSON.stringify({
                format: 'sailor-retained-stores',
                version: 1,
                stores: await encode(raw),
              }),
              'sailor-retained-stores.json',
            );
            setStatus(
              'Retained-store export requested. Check the downloaded file before restoring.',
            );
          })
        }
      >
        Export retained stores
      </button>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const points = (await db.recoveryPoints()).filter((p) => p.snapshot);
            const good = [];
            for (const p of points)
              try {
                await db.recoverySnapshot(p.id);
                good.push(p.id);
              } catch {
                /* invalid points remain retained */
              }
            setIds(good);
            setStatus(
              good.length
                ? 'Choose a validated recovery point; current history will be archived.'
                : 'No valid local recovery point. Keep the retained-store export for manual recovery; do not clear browser data.',
            );
          })
        }
      >
        Find verified recovery points
      </button>
      <label htmlFor="rescue-point">Recovery point</label>
      <select
        id="rescue-point"
        disabled={busy}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Choose a point</option>
        {ids.map((id) => (
          <option key={id}>{id}</option>
        ))}
      </select>
      <button
        disabled={busy || !selected}
        onClick={() =>
          void run(async () => {
            await db.rescueRecovery(selected);
            await db.load();
            location.reload();
          })
        }
      >
        Restore selected point and archive damaged history
      </button>
    </main>
  );
}
