import { nativeOAuthReturn } from '../../../packages/platform/src/native.ts';
import { device, trustContent, restoreTrust } from './native-production.ts';
import { isNative } from './native.ts';
import { useEffect, useRef, useState } from 'react';
import type { Projection } from './management-ui.tsx';
import { Modal } from './management-ui.tsx';
import { downloadText } from './data-tools.tsx';
import { exportBackup, previewBackup } from '../../../packages/persistence/src/backup.ts';
import { canonical } from '../../../packages/domain/src/logbook.ts';
import {
  beginDropbox,
  finishDropbox,
  DropboxPort,
  DropboxReadError,
} from '../../../packages/sync-providers/src/dropbox.ts';
import {
  setupContent,
  rewrapContent,
  replaceContentKey,
  unlockContent,
  encryptContent,
  decryptContent,
} from '../../../packages/crypto/src/content.ts';
import type { ContentSetup } from '../../../packages/crypto/src/content.ts';
import { readManifest, SyncEngine } from './sync-engine.ts';
import type { SyncPreview } from './sync-engine.ts';
import styles from './management.module.css';
import { ErasureTools } from './erasure-tools.tsx';
import { NewCloudEngine } from './new-cloud-engine.ts';
import type { NewCloudPreview } from './new-cloud-engine.ts';
import { erasureMarker } from '../../../packages/sync-core/src/erasure.ts';
import { ReviewScheduler } from './sync-scheduler.ts';
import type { ReviewResult } from './sync-scheduler.ts';

let access: { token: string; expires: number } | null = null;
export function SyncTools({
  projection,
  blocked,
  onActive,
  onBackup,
}: {
  projection: Projection;
  blocked: boolean;
  onActive: (active: boolean) => void;
  onBackup: (copy: { raw: string }) => void;
}) {
  const [trustDevice, setTrustDevice] = useState(false);
  const [connected, setConnected] = useState(!!access),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(
      access ? 'Connected for this tab · preview required' : 'Local only · Dropbox is disconnected',
    ),
    [client, setClient] = useState(String(import.meta.env.VITE_DROPBOX_APP_KEY ?? '')),
    [preview, setPreview] = useState<SyncPreview | null>(null),
    [cloudErased, setCloudErased] = useState(false),
    [newCloudPending, setNewCloudPending] = useState(false),
    [newCloudPreview, setNewCloudPreview] = useState<NewCloudPreview | null>(null),
    [newCloudWord, setNewCloudWord] = useState(''),
    [newCloudAcknowledged, setNewCloudAcknowledged] = useState(false),
    [choices, setChoices] = useState<Record<string, 'local' | 'cloud'>>({}),
    [legacyReviewed, setLegacyReviewed] = useState(false),
    [rejoin, setRejoin] = useState(false),
    [joinBackup, setJoinBackup] = useState(''),
    [joinWord, setJoinWord] = useState(''),
    [encryption, setEncryption] = useState<{ setup: ContentSetup; key: CryptoKey } | undefined>(),
    [wizard, setWizard] = useState(false),
    [changingCredentials, setChangingCredentials] = useState(false),
    [changingContentKey, setChangingContentKey] = useState(false),
    [rotationBackup, setRotationBackup] = useState(''),
    [providerReviewed, setProviderReviewed] = useState(false),
    [rotationWord, setRotationWord] = useState(''),
    [currentCredential, setCurrentCredential] = useState(''),
    [currentRecovery, setCurrentRecovery] = useState(false),
    [confirmPass, setConfirmPass] = useState(''),
    [pass, setPass] = useState(''),
    [pending, setPending] = useState<Awaited<ReturnType<typeof setupContent>> | null>(null),
    [recovery, setRecovery] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [savedRecovery, setSavedRecovery] = useState(false),
    [unlock, setUnlock] = useState<ContentSetup | null>(null),
    [policy, setPolicy] = useState<ContentSetup | null>(null),
    [policyReady, setPolicyReady] = useState(false),
    [backupToUnlock, setBackupToUnlock] = useState<{
      setup: ContentSetup;
      payload: string;
      generation: string;
    } | null>(null),
    [useRecovery, setUseRecovery] = useState(false),
    [schedule, setSchedule] = useState(false);
  const [erasureActive, setErasureActive] = useState(!!projection.erasure),
    [erasureBusy, setErasureBusy] = useState(false),
    [erasureComplete, setErasureComplete] = useState(projection.erasure?.phase === 'complete');
  const stoppedWaiters = useRef<(() => void)[]>([]);
  const intentionalNavigation = useRef(false);
  const scheduler = useRef<ReviewScheduler | null>(null),
    scheduledRunning = useRef(false),
    scheduledReview = useRef<() => Promise<ReviewResult>>(async () => ({ kind: 'stop' })),
    draftBlocked = useRef(blocked);
  draftBlocked.current = blocked;
  const pendingNativeOAuth = useRef(false);
  const running = useRef(false),
    controller = useRef<AbortController | null>(null),
    initialized = useRef(false);
  const active =
    busy || !!preview || !!newCloudPreview || wizard || !!unlock || rejoin || erasureActive;
  useEffect(() => {
    onActive(active);
    return () => onActive(false);
  }, [active, onActive]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (
        !intentionalNavigation.current &&
        !erasureComplete &&
        (busy || preview || newCloudPreview || wizard || unlock || rejoin || erasureBusy)
      )
        e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [busy, preview, newCloudPreview, wizard, unlock, rejoin, erasureBusy, erasureComplete]);
  useEffect(() => {
    let previous = canonical(projection.store.getState());
    return projection.store.subscribe(() => {
      const next = canonical(projection.store.getState());
      if (next !== previous) {
        previous = next;
        setStatus('Local changes · sync required');
      }
    });
  }, [projection]);
  useEffect(() => {
    void Promise.all([projection.db.keyPolicy(), projection.db.syncJournal()])
      .then(([p, journal]) => {
        setPolicy(p ?? null);
        setNewCloudPending(journal?.intent?.transition === 'new-cloud');
        setPolicyReady(true);
        if (isNative() && p && new URLSearchParams(location.search).has('nativeUnlock'))
          setUnlock(p);
      })
      .catch(() =>
        setStatus('Not synced · encryption policy could not be read; reopen recovery tools'),
      );
  }, [projection]);
  const port = () =>
    new DropboxPort(() => {
      if (!access || access.expires <= Date.now())
        throw Error('Dropbox session expired; reconnect');
      return access.token;
    }, globalThis.fetch.bind(globalThis));
  const run = async (fn: (signal: AbortSignal) => Promise<void>): Promise<ReviewResult> => {
    if (running.current) return { kind: 'stop' };
    running.current = true;
    setBusy(true);
    controller.current = new AbortController();
    try {
      await fn(controller.current.signal);
      return { kind: 'done' };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const action = /new.cloud|New.cloud|fresh empty|Retire and review/.test(message)
        ? 'New-cloud setup requires a fresh local session and the same clean deletion barrier. Verify the pending request, or preserve a backup and use Review device join if another client created a copy.'
        : /erased|Erasure/.test(message)
          ? 'A deletion barrier is active; automatic cloud recreation and erased-session uploads are blocked. Finish the deletion review or continue with a new local logbook.'
          : /generation/.test(message)
            ? 'Cloud/local generation changed; preserve a backup and use Review device join.'
            : /Legacy/.test(message)
              ? 'Legacy Dropbox changed or metadata access failed; review old-device backups and reconnect with metadata access.'
              : /session expired|authorization/.test(message)
                ? 'Dropbox authorization expired or failed; reconnect.'
                : /recovery|Recovery|decrypt|encoded|key size/.test(message)
                  ? 'Unlock/recovery verification failed; check the saved secret.'
                  : 'Operation failed, canceled, locked or Dropbox changed. Retry preview or reconnect.';
      setStatus('Not synced · ' + action + ' Existing data and review are retained.');
      if (controller.current.signal.aborted) return { kind: 'done' };
      return error instanceof DropboxReadError && error.transient
        ? { kind: 'retry', after: error.retryAfter }
        : error instanceof TypeError && /fetch|network|load failed/i.test(message)
          ? { kind: 'retry' }
          : { kind: 'stop' };
    } finally {
      await projection.refresh().catch(() => {});
      setNewCloudPending(
        (await projection.db.syncJournal().catch(() => undefined))?.intent?.transition ===
          'new-cloud',
      );
      running.current = false;
      setBusy(false);
      for (const resolve of stoppedWaiters.current.splice(0)) resolve();
      if (isNative() && pendingNativeOAuth.current && !draftBlocked.current) {
        pendingNativeOAuth.current = false;
        queueMicrotask(() => window.dispatchEvent(new Event('slb-oauth-return')));
      }
    }
  };
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(location.search),
      code = params.get('code');
    if (!code && !params.has('error')) return;
    const state = params.get('state') ?? '';
    history.replaceState(null, '', '/?phase=9&tool=help#sync');
    const raw = sessionStorage.getItem('slb-dropbox-pkce');
    sessionStorage.removeItem('slb-dropbox-pkce');
    void run(async () => {
      if (!raw || !code) throw Error('Authorization canceled');
      access = await finishDropbox(JSON.parse(raw), code, state, globalThis.fetch.bind(globalThis));
      setConnected(true);
      setStatus('Connected · preview required; no journal data transferred');
    });
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    const receive = () => {
      if (draftBlocked.current || running.current) {
        pendingNativeOAuth.current = true;
        return;
      }
      pendingNativeOAuth.current = false;
      void run(async () => {
        const value = await device.takeOAuth();
        if (!value.url) return;
        const callback = nativeOAuthReturn(value.url);
        if (!value.pending || callback.canceled) throw Error('Authorization canceled');
        access = await finishDropbox(
          value.pending,
          callback.code,
          callback.state,
          globalThis.fetch.bind(globalThis),
        );
        setConnected(true);
        setStatus('Connected · preview required; no journal data transferred');
      });
    };
    receive();
    window.addEventListener('slb-oauth-return', receive);
    return () => window.removeEventListener('slb-oauth-return', receive);
  }, [blocked]);
  const check = () =>
    run(async (signal) => {
      setStatus('Checking Dropbox · not synced');
      if ((await projection.db.syncJournal())?.intent?.transition === 'new-cloud') {
        setNewCloudPending(true);
        setStatus(
          'New cloud creation is awaiting explicit verification. Review the pending new-cloud request; ordinary sync is paused.',
        );
        return;
      }
      const cloud = await port().read(signal);
      if (signal.aborted || draftBlocked.current) return;
      if (cloud && erasureMarker(cloud.raw)) {
        setCloudErased(true);
        setStatus(
          'Cloud deletion barrier found · ordinary sync is blocked. Explicit new-cloud setup requires a fresh empty local logbook.',
        );
        return;
      }
      setCloudErased(false);
      const m = cloud ? readManifest(cloud.raw) : null;
      if (
        m?.mode === 'encrypted' &&
        (!encryption || canonical(encryption.setup) !== canonical(m.setup))
      ) {
        setUnlock(m.setup!);
        setStatus('Encrypted Dropbox copy · unlock required');
        return;
      }
      if (policy && !encryption) {
        setUnlock(policy);
        setStatus('Unlock configured key before uploading');
        return;
      }
      const p = await new SyncEngine(projection.db, port()).preview(encryption?.key, signal);
      if (signal.aborted || draftBlocked.current) return;
      setPreview(p);
      setChoices({});
      setLegacyReviewed(false);
      setStatus('Preview only · review before uploading or merging');
    });
  scheduledReview.current = async () => {
    scheduledRunning.current = true;
    try {
      return await check();
    } finally {
      scheduledRunning.current = false;
    }
  };
  useEffect(() => {
    const review = new ReviewScheduler(
      () => scheduledReview.current(),
      () => {
        setSchedule(false);
        setStatus((s) => s + ' Automatic checks paused; review manually or enable checks again.');
      },
    );
    scheduler.current = review;
    const remove = projection.onDurable(() => review.request());
    return () => {
      remove();
      review.dispose();
      controller.current?.abort();
    };
  }, [projection]);
  useEffect(() => {
    const update = () => {
      const eligible = !blocked && !active && !document.hidden && navigator.onLine;
      scheduler.current?.update(schedule && connected && !erasureComplete, eligible);
      if ((document.hidden || !navigator.onLine || blocked) && scheduledRunning.current)
        controller.current?.abort();
    };
    const returned = () => {
      update();
      if (!document.hidden && navigator.onLine) scheduler.current?.request();
    };
    update();
    window.addEventListener('online', returned);
    window.addEventListener('offline', update);
    window.addEventListener('focus', returned);
    document.addEventListener('visibilitychange', returned);
    return () => {
      window.removeEventListener('online', returned);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', returned);
      document.removeEventListener('visibilitychange', returned);
    };
  }, [schedule, connected, blocked, active, erasureComplete]);
  useEffect(() => {
    if (!blocked) scheduler.current?.request();
  }, [blocked]);
  const plan = preview ? new SyncEngine(projection.db, port()).plan(preview, choices) : null;
  const close = () => {
    if (!busy) {
      setPreview(null);
      setNewCloudPreview(null);
      setNewCloudWord('');
      setNewCloudAcknowledged(false);
      setWizard(false);
      setUnlock(null);
      setBackupToUnlock(null);
      setPass('');
      setRecovery('');
      setPending(null);
      setConfirmation('');
      setSavedRecovery(false);
      setRejoin(false);
      setJoinBackup('');
      setJoinWord('');
      setChangingCredentials(false);
      setChangingContentKey(false);
      setRotationBackup('');
      setProviderReviewed(false);
      setRotationWord('');
      setCurrentCredential('');
      setCurrentRecovery(false);
      setConfirmPass('');
    }
  };
  return (
    <section id="sync" aria-label="Dropbox synchronization">
      <h2>Dropbox synchronization</h2>
      <button disabled={blocked || active} onClick={() => setRejoin(true)}>
        Review device join
      </button>
      <p>
        Sync works without encryption. Unencrypted content is readable by Dropbox. This browser
        keeps access tokens and unlocked keys in memory; reconnect after reload. No background sync
        runs while the app is closed.
      </p>
      <p role="status">{status}</p>
      {isNative() && policy && (
        <>
          <button
            disabled={blocked || active}
            onClick={() =>
              void run(async () => {
                const key = await restoreTrust(policy);
                setEncryption({ setup: policy, key });
                setStatus('Trusted key restored on this unlocked device · preview required');
              })
            }
          >
            Unlock with trusted device
          </button>
          <button
            disabled={blocked || active}
            onClick={() =>
              void run(async () => {
                await device.forget();
                setEncryption(undefined);
                setStatus('Device trust forgotten · use your passphrase or recovery code');
              })
            }
          >
            Forget device trust
          </button>
        </>
      )}
      {!connected && (
        <>
          <label>
            Dropbox public app key
            <input value={client} onChange={(e) => setClient(e.target.value)} />
          </label>
          <button
            disabled={
              blocked ||
              busy ||
              erasureBusy ||
              erasureComplete ||
              !!preview ||
              wizard ||
              !!unlock ||
              rejoin
            }
            onClick={() =>
              void run(async () => {
                const auth = await beginDropbox(
                  client,
                  isNative()
                    ? 'sailorlogbook://oauth/dropbox'
                    : location.origin + '/?phase=9&tool=help',
                );
                if (isNative()) {
                  await device.beginOAuth({ pending: auth });
                  return;
                }
                sessionStorage.setItem('slb-dropbox-pkce', JSON.stringify(auth));
                intentionalNavigation.current = true;
                location.assign(auth.url);
              })
            }
          >
            Connect Dropbox
          </button>
        </>
      )}
      {connected && (
        <>
          <button disabled={blocked || active} onClick={() => void check()}>
            Preview Dropbox sync
          </button>
          <label>
            <input
              type="checkbox"
              checked={schedule}
              disabled={blocked || active}
              onChange={(e) => setSchedule(e.target.checked)}
            />
            Check on return, after saved edits and every minute here; changes require review
          </label>
          <p>
            Automatic checks wait for drafts and dialogs, pause offline or when hidden, and use up
            to three delayed retries for temporary read failures. They never apply a merge. Reload
            or screen navigation requires reconnecting and enabling checks again.
          </p>
          <button
            disabled={
              blocked ||
              busy ||
              erasureBusy ||
              erasureComplete ||
              !!preview ||
              wizard ||
              !!unlock ||
              rejoin
            }
            onClick={() => {
              access = null;
              setConnected(false);
              setSchedule(false);
              setStatus('Disconnected · local data and encryption policy retained');
            }}
          >
            Disconnect Dropbox
          </button>
        </>
      )}
      {connected && (cloudErased || newCloudPending) && (
        <>
          <p>
            {newCloudPending
              ? 'An unfinished request can only publish its originally reviewed empty baseline. Local edits stay on this device until a separate sync preview.'
              : 'The erased cloud will stay blocked until you explicitly create a new, empty cloud logbook.'}
          </p>
          <button
            disabled={blocked || active}
            onClick={() =>
              void run(async (signal) => {
                const p = await new NewCloudEngine(projection.db, port()).preview(signal);
                setNewCloudPreview(p);
                setNewCloudWord('');
                setNewCloudAcknowledged(false);
                setStatus('Preview only · this review made no cloud changes');
              })
            }
          >
            Review new cloud logbook
          </button>
        </>
      )}
      {!policy && (
        <button
          disabled={blocked || active || !!encryption || !policyReady || newCloudPending}
          onClick={() => setWizard(true)}
        >
          Set up optional encryption
        </button>
      )}
      {policy && !encryption && (
        <button disabled={blocked || active} onClick={() => setUnlock(policy)}>
          Unlock configured key
        </button>
      )}
      {encryption && (
        <>
          <button
            disabled={blocked || active || !connected}
            onClick={() => {
              setChangingCredentials(true);
              setWizard(true);
            }}
          >
            Change passphrase and recovery kit
          </button>
          <button
            disabled={blocked || active || !connected}
            onClick={() => {
              setChangingCredentials(true);
              setChangingContentKey(true);
              setWizard(true);
            }}
          >
            Replace content key / lost device
          </button>
          <p>
            Content key unlocked for this tab. Encryption takes effect on Dropbox only after Apply
            reviewed sync.
          </p>
          <button
            disabled={blocked || active}
            onClick={() =>
              void run(async () => {
                setEncryption(undefined);
                if (isNative()) await device.lock();
                setStatus('Locked · session key forgotten; local database remains plaintext');
              })
            }
          >
            Lock logbook
          </button>
          <button
            disabled={blocked || active}
            onClick={() =>
              void run(async () => {
                const generation = crypto.randomUUID();
                await downloadText(
                  JSON.stringify({
                    format: 'slb-encrypted-backup',
                    version: 1,
                    generation,
                    setup: encryption.setup,
                    payload: await encryptContent(
                      await exportBackup(projection.db),
                      encryption.key,
                      encryption.setup,
                      generation,
                    ),
                  }),
                  'sailor-logbook-encrypted.json',
                );
                setStatus(
                  'Encrypted backup download requested · verify the actual file before relying on it',
                );
              })
            }
          >
            Download encrypted backup
          </button>
        </>
      )}
      <label>
        Verify encrypted backup
        <input
          type="file"
          accept="application/json,.json"
          disabled={blocked || active}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file)
              void run(async () => {
                if (file.size > 96 * 1024 * 1024) throw Error('Transfer limit');
                const b = JSON.parse(await file.text());
                if (
                  b.format !== 'slb-encrypted-backup' ||
                  b.version !== 1 ||
                  !b.setup ||
                  typeof b.payload !== 'string' ||
                  typeof b.generation !== 'string'
                )
                  throw Error('Unsupported encrypted backup');
                if (!encryption || canonical(b.setup) !== canonical(encryption.setup)) {
                  setBackupToUnlock(b);
                  setUnlock(b.setup);
                  setStatus('Unlock this backup using its original passphrase or recovery code');
                  return;
                }
                const raw = await decryptContent(b.payload, encryption.key, b.setup, b.generation);
                const p = await previewBackup(raw);
                onBackup({ raw });
                setStatus(
                  'Encrypted backup verified · ' +
                    Object.keys(p.state.entities).length +
                    ' records. Review the import preview before applying.',
                );
              });
          }}
        />
      </label>
      <p>
        Legacy v8: stop editing on old devices, download and verify their latest backups, then use
        Storage & data to preview/merge each copy. The production file is separate; old clients
        cannot follow it. Never run both as live logbooks. Android trust is optional and requires a
        secure screen lock; browser unlock is session-only. Local points and Dropbox revision
        history do not replace an external backup.
      </p>
      {busy && (
        <button
          onClick={() => {
            controller.current?.abort();
            setStatus('Cancel requested · outcome must be checked before any acknowledgement');
          }}
        >
          Cancel sync/check
        </button>
      )}
      <ErasureTools
        projection={projection}
        port={connected ? port() : undefined}
        blocked={blocked || !!preview || !!newCloudPreview || wizard || !!unlock || rejoin}
        onActive={setErasureActive}
        onBusy={setErasureBusy}
        prepare={async () => {
          setSchedule(false);
          controller.current?.abort();
          if (running.current)
            await new Promise<void>((resolve) => stoppedWaiters.current.push(resolve));
          setPreview(null);
        }}
        onErased={() => {
          access = null;
          sessionStorage.removeItem('slb-dropbox-pkce');
          setConnected(false);
          setEncryption(undefined);
          setPolicy(null);
          setErasureComplete(true);
          intentionalNavigation.current = true;
          requestAnimationFrame(() => location.replace('/?phase=9&tool=help'));
        }}
      />
      {newCloudPreview && (
        <Modal title="New cloud logbook preview" close={close}>
          <p role="status">{status}</p>

          <p>
            This explicitly replaces the reviewed deletion barrier with a new empty logbook and a
            fresh cloud generation. It does not restore old data or merge old copies. Other devices
            must explicitly join the new generation.
          </p>
          <p>
            {newCloudPreview.retry
              ? `Retry/verification of the original empty request. Current local records: ${newCloudPreview.records}; those records will not be uploaded by this action.`
              : 'Local content and retained history are empty. The cloud baseline will be empty.'}
          </p>
          <p>
            {newCloudPreview.policy
              ? 'The new cloud will use configured content encryption. Unlock its key before confirming.'
              : 'The new empty cloud starts without encryption. Dropbox can read future plaintext content unless you enable optional encryption.'}
          </p>
          <p>
            Offline copies, downloaded backups and Dropbox history remain. Retire legacy writers and
            revoke untrusted provider access separately. No unrelated file will be removed by this
            action.
          </p>
          <label>
            <input
              type="checkbox"
              checked={newCloudAcknowledged}
              disabled={busy}
              onChange={(e) => setNewCloudAcknowledged(e.target.checked)}
            />
            I want a new empty cloud logbook; do not restore old data
          </label>
          <label>
            Type NEW CLOUD to confirm
            <input
              value={newCloudWord}
              disabled={busy}
              onChange={(e) => setNewCloudWord(e.target.value)}
            />
          </label>
          {newCloudPreview.policy && !encryption && (
            <p>Cancel this preview and use Unlock configured key, then review again.</p>
          )}
          <button
            disabled={
              busy ||
              !newCloudAcknowledged ||
              newCloudWord !== 'NEW CLOUD' ||
              (!!newCloudPreview.policy && !encryption)
            }
            onClick={() =>
              void run(async (signal) => {
                const result = await new NewCloudEngine(projection.db, port()).create(
                  newCloudPreview,
                  encryption,
                  signal,
                );
                setNewCloudPreview(null);
                setCloudErased(false);
                setNewCloudPending(false);
                setNewCloudWord('');
                setNewCloudAcknowledged(false);
                setStatus(
                  result.localPending
                    ? 'New empty cloud verified · local edits remain pending; use sync preview.'
                    : 'New empty cloud verified · new generation and local receipt committed.',
                );
              })
            }
          >
            Create or verify new cloud logbook
          </button>
          <button disabled={busy} onClick={close}>
            Cancel new-cloud preview
          </button>
          {busy && (
            <button onClick={() => controller.current?.abort()}>Interrupt new-cloud setup</button>
          )}
        </Modal>
      )}
      {preview && plan && (
        <Modal title="Dropbox sync preview" close={close}>
          <p role="status">{status}</p>

          {!!plan.featureReview.length && (
            <p>
              All moment text will be retained in Notebook. Choose up to four featured moments in
              Home after sync for: {plan.featureReview.join(', ')}. Other changes can sync now.
            </p>
          )}
          <p>
            Local: {Object.keys(preview.local.state.entities).length} · Dropbox:{' '}
            {Object.keys(preview.cloud?.state.entities ?? {}).length} · Result:{' '}
            {Object.keys(plan.state.entities).length}. A verified local recovery point and retained
            cloud source are required before merge.
          </p>
          <p>
            {preview.anchor ? 'Known device baseline' : 'First-device join · review both copies'} ·{' '}
            {preview.manifest?.mode ?? 'new plain copy'}
            {encryption ? ' → encrypted upload' : ''}
          </p>
          <details className={styles.comparison}>
            <summary>Review resulting records</summary>
            <pre>{JSON.stringify(plan.state.entities, null, 2)}</pre>
          </details>
          {preview.legacyRevision && preview.legacyRevision !== preview.anchor?.legacyRevision && (
            <label>
              Legacy Dropbox revision changed: {preview.legacyRevision}.{' '}
              <input
                type="checkbox"
                checked={legacyReviewed}
                onChange={(e) => setLegacyReviewed(e.target.checked)}
              />
              I stopped old writers and reviewed/imported their latest verified backups
            </label>
          )}
          {[...new Set([...plan.conflicts, ...Object.keys(choices)])].map((id) => (
            <fieldset key={id} className={styles.comparison}>
              <legend>{id}</legend>
              <p>Local</p>
              <pre>{JSON.stringify(preview.local.state.entities[id] ?? 'Deleted', null, 2)}</pre>
              <p>Dropbox</p>
              <pre>{JSON.stringify(preview.cloud?.state.entities[id] ?? 'Deleted', null, 2)}</pre>
              <label>
                Resolution for {id}
                <select
                  value={choices[id] ?? ''}
                  disabled={busy}
                  onChange={(e) =>
                    setChoices({ ...choices, [id]: e.target.value as 'local' | 'cloud' })
                  }
                >
                  <option value="">Choose</option>
                  <option value="local">Keep local</option>
                  <option value="cloud">Use Dropbox</option>
                </select>
              </label>
            </fieldset>
          ))}
          {plan.error && (
            <p role="alert">
              Relationships require review: {plan.error}. Cancel and correct the records before
              retrying.
            </p>
          )}
          <button
            disabled={
              busy ||
              !!plan.conflicts.length ||
              !!plan.error ||
              (!!preview.legacyRevision &&
                preview.legacyRevision !== preview.anchor?.legacyRevision &&
                !legacyReviewed)
            }
            onClick={() =>
              void run(async (signal) => {
                const result = await new SyncEngine(projection.db, port()).apply(
                  preview,
                  choices,
                  encryption,
                  signal,
                  legacyReviewed,
                );
                await projection.refresh();
                if (
                  canonical(projection.store.getState()) !== canonical(result.state) ||
                  (await projection.db.pending()).length
                )
                  throw Error('Local copy changed; sync again');
                setPreview(null);
                setStatus('Synced · Dropbox revision read back and local receipt committed');
              })
            }
          >
            Apply reviewed sync
          </button>
          <button disabled={busy} onClick={close}>
            Cancel preview
          </button>
          {busy && <button onClick={() => controller.current?.abort()}>Interrupt sync</button>}
        </Modal>
      )}
      {rejoin && (
        <Modal title="Review device join" close={close}>
          <p role="status">{status}</p>

          <p>
            Use this only after a cloud generation/account change. Verify a current external backup
            first. The previous sync journal stays archived, pending operations remain local, and
            the next connection requires a first-device preview. This does not clear or downgrade
            encryption policy.
          </p>
          <label>
            Verified backup for join reset
            <input
              type="file"
              accept=".json"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file)
                  void run(async () => {
                    if (file.size > 96 * 1024 * 1024) throw Error('Transfer limit');
                    let raw = await file.text();
                    const b = JSON.parse(raw);
                    if (b.format === 'slb-encrypted-backup') {
                      if (!encryption || canonical(b.setup) !== canonical(encryption.setup))
                        throw Error('Unlock matching key');
                      raw = await decryptContent(b.payload, encryption.key, b.setup, b.generation);
                    }
                    const p = await previewBackup(raw),
                      baseline = canonical(await projection.db.load());
                    if (p.legacy || canonical(p.state) !== baseline)
                      throw Error('Backup must match current local state');
                    setJoinBackup(baseline);
                    setStatus('Current external backup verified for device join');
                  });
              }}
            />
          </label>
          <label>
            Type JOIN to reset device continuity
            <input value={joinWord} onChange={(e) => setJoinWord(e.target.value)} />
          </label>
          <button
            disabled={busy || !joinBackup || joinWord !== 'JOIN'}
            onClick={() =>
              void run(async () => {
                const id = 'rejoin:' + crypto.randomUUID();
                await projection.db.recovery(id, 'before explicit device rejoin');
                if (canonical(await projection.db.recoverySnapshot(id)) !== joinBackup)
                  throw Error('Recovery mismatch');
                await projection.db.resetSyncJoin(joinBackup);
                setRejoin(false);
                setJoinBackup('');
                setJoinWord('');
                setStatus('Device continuity reset · preview both copies before syncing');
              })
            }
          >
            Reset device continuity
          </button>
          <button disabled={busy} onClick={close}>
            Cancel join reset
          </button>
        </Modal>
      )}
      {wizard && (
        <Modal title="Protect cloud content" close={close}>
          <p role="status">{status}</p>

          {changingCredentials && !changingContentKey && (
            <p>
              Change credentials after completing a reviewed encrypted sync. The old recovery code
              will not unlock the new cloud manifest. Keep old kits for old backups. This keeps the
              same content key: it does not revoke a lost device, its token, or its cached copies.
              Cancel does not undo a possible cloud commit after an interruption; preview again and
              use the newly saved kit.
            </p>
          )}
          {changingContentKey && (
            <>
              <h3>Replace the content key</h3>
              <p>
                First review Dropbox access:{' '}
                <a
                  href="https://help.dropbox.com/security/unknown-device-linked"
                  target="_blank"
                  rel="noreferrer"
                >
                  secure devices, web sessions and connected apps
                </a>
                . Revoke untrusted access and reconnect this tab if needed. This app cannot identify
                or revoke another device's token.
              </p>
              <p>
                A new key and cloud generation will protect the next complete upload. Other devices
                must unlock the new kit and explicitly rejoin. Local databases, old backups, cached
                keys and earlier Dropbox versions remain accessible to their holders. This does not
                erase a lost device or stop a still-authorized malicious Dropbox writer. Cancel
                after an interrupted upload is not a rollback.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={providerReviewed}
                  disabled={busy}
                  onChange={(e) => setProviderReviewed(e.target.checked)}
                />
                I reviewed untrusted Dropbox access and reconnected if needed
              </label>
              <label>
                Verify current external backup for key replacement
                <input
                  type="file"
                  accept="application/json,.json"
                  disabled={busy || !!pending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file)
                      void run(async () => {
                        if (file.size > 96 * 1024 * 1024) throw Error('Backup transfer limit');
                        let raw = await file.text();
                        const b = JSON.parse(raw);
                        if (b.format === 'slb-encrypted-backup') {
                          if (b.version !== 1 || !encryption)
                            throw Error('Unlock current backup first');
                          raw = await decryptContent(
                            b.payload,
                            encryption.key,
                            b.setup,
                            b.generation,
                          );
                        }
                        const verified = await previewBackup(raw);
                        if (
                          verified.legacy ||
                          canonical(verified.state) !== canonical(await projection.db.load())
                        )
                          throw Error('Backup must match current local copy');
                        setRotationBackup(raw);
                        setStatus('Current external backup verified for content-key replacement');
                      });
                  }}
                />
              </label>
              <label>
                Type ROTATE to replace the content key
                <input
                  value={rotationWord}
                  disabled={busy}
                  onChange={(e) => setRotationWord(e.target.value)}
                />
              </label>
            </>
          )}
          <p>
            AES-GCM protects journal content, drawings and media on future uploads. Local IndexedDB,
            earlier plaintext Dropbox revisions and downloaded plaintext files stay readable. Keep
            the recovery file/code privately. Losing both passphrase and recovery secret loses
            encrypted access.
          </p>
          {!pending ? (
            <>
              {changingCredentials && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={currentRecovery}
                      onChange={(e) => setCurrentRecovery(e.target.checked)}
                    />
                    Authenticate with current recovery code
                  </label>
                  <label>
                    Current passphrase or recovery code
                    <input
                      type="password"
                      autoComplete="off"
                      value={currentCredential}
                      onChange={(e) => setCurrentCredential(e.target.value)}
                    />
                  </label>
                </>
              )}
              <label>
                New encryption passphrase
                <input
                  type="password"
                  autoComplete="new-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </label>
              {changingCredentials && (
                <label>
                  Confirm new passphrase
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                  />
                </label>
              )}
              <button
                disabled={
                  busy ||
                  pass.length < 12 ||
                  (changingCredentials && (!currentCredential || confirmPass !== pass)) ||
                  (changingContentKey &&
                    (!rotationBackup || !providerReviewed || rotationWord !== 'ROTATE'))
                }
                onClick={() =>
                  void run(async () => {
                    setPending(
                      changingCredentials && encryption
                        ? await (changingContentKey ? replaceContentKey : rewrapContent)(
                            encryption.setup,
                            currentCredential,
                            currentRecovery,
                            pass,
                          )
                        : await setupContent(pass),
                    );
                    setPass('');
                    setCurrentCredential('');
                    setConfirmPass('');
                  })
                }
              >
                Create recovery kit
              </button>
            </>
          ) : (
            <>
              <label>
                Printable recovery code
                <textarea readOnly value={pending.code} />
              </label>
              <button
                onClick={() =>
                  void run(async () => {
                    await downloadText(
                      JSON.stringify({ format: 'slb-recovery', version: 1, code: pending.code }),
                      'sailor-logbook-recovery.json',
                    );
                    setSavedRecovery(true);
                  })
                }
              >
                Download recovery file
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={savedRecovery}
                  onChange={(e) => setSavedRecovery(e.target.checked)}
                />
                I saved the file or printed the code privately
              </label>
              <label>
                Re-enter saved recovery code
                <textarea value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
              </label>
              <button
                disabled={
                  busy ||
                  !savedRecovery ||
                  !confirmation ||
                  (changingContentKey && (!providerReviewed || rotationWord !== 'ROTATE'))
                }
                onClick={() =>
                  void run(async (signal) => {
                    const key = await unlockContent(pending.setup, confirmation, true);
                    const probe = await encryptContent(
                      'recovery verification',
                      pending.key,
                      pending.setup,
                      pending.setup.id,
                    );
                    if (
                      (await decryptContent(probe, key, pending.setup, pending.setup.id)) !==
                      'recovery verification'
                    )
                      throw Error('Recovery verification failed');
                    if (changingCredentials) {
                      if (!encryption) throw Error('Unlock current credentials first');
                      if (changingContentKey)
                        await new SyncEngine(projection.db, port()).rotateContentKey(
                          encryption,
                          { setup: pending.setup, key },
                          rotationBackup,
                          signal,
                        );
                      else
                        await new SyncEngine(projection.db, port()).rotateCredentials(
                          encryption,
                          { setup: pending.setup, key },
                          signal,
                        );
                    } else await projection.db.saveKeyPolicy(pending.setup);
                    setPolicy(pending.setup);
                    setEncryption({ setup: pending.setup, key });
                    setWizard(false);
                    setPending(null);
                    setConfirmation('');
                    setSavedRecovery(false);
                    setStatus(
                      changingContentKey
                        ? 'Content key replaced · cloud generation verified; other devices must rejoin. Old copies remain.'
                        : changingCredentials
                          ? 'Credential change verified on Dropbox · new passphrase and recovery kit active'
                          : 'Recovery verified · preview sync to enable encrypted uploads',
                    );
                    setChangingCredentials(false);
                    setChangingContentKey(false);
                    setRotationBackup('');
                    setProviderReviewed(false);
                    setRotationWord('');
                    setCurrentRecovery(false);
                  })
                }
              >
                Verify recovery and use key
              </button>
            </>
          )}
          <button disabled={busy} onClick={close}>
            Cancel encryption setup
          </button>
          {busy && changingCredentials && pending && (
            <button onClick={() => controller.current?.abort()}>Interrupt credential update</button>
          )}
        </Modal>
      )}
      {unlock && (
        <Modal title="Unlock encrypted Dropbox" close={close}>
          <p role="status">{status}</p>

          <label>
            <input
              type="checkbox"
              checked={useRecovery}
              onChange={(e) => setUseRecovery(e.target.checked)}
            />
            Use recovery code/file text
          </label>
          <label>
            {useRecovery ? 'Recovery code' : 'Encryption passphrase'}
            <input
              type="password"
              autoComplete="off"
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !recovery}
            onClick={() =>
              void run(async () => {
                const key = await unlockContent(
                  unlock,
                  recovery,
                  useRecovery,
                  isNative() && trustDevice && !backupToUnlock
                    ? (raw) => trustContent(unlock, raw)
                    : undefined,
                );
                if (backupToUnlock) {
                  const raw = await decryptContent(
                    backupToUnlock.payload,
                    key,
                    backupToUnlock.setup,
                    backupToUnlock.generation,
                  );
                  await previewBackup(raw);
                  setBackupToUnlock(null);
                  setUnlock(null);
                  setRecovery('');
                  onBackup({ raw });
                  setStatus('Encrypted backup verified · review import before applying');
                  return;
                }
                await projection.db.saveKeyPolicy(unlock);
                setPolicy(unlock);
                setEncryption({ setup: unlock, key });
                setUnlock(null);
                setRecovery('');
                setStatus('Unlocked for this tab · preview Dropbox sync again');
                if (isNative()) {
                  const action = sessionStorage.getItem('slb-native-after-unlock');
                  sessionStorage.removeItem('slb-native-after-unlock');
                  if (action === 'quick-log') location.assign('/?phase=3&new=log');
                  if (action === 'today') location.assign('/?phase=3');
                }
              })
            }
          >
            Unlock for this tab
          </button>
          {isNative() && !backupToUnlock && (
            <label>
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
              />
              Trust this Android device after confirming screen unlock
            </label>
          )}
          <button disabled={busy} onClick={close}>
            Cancel unlock
          </button>
        </Modal>
      )}
    </section>
  );
}
