import { RecoveryScreen } from './recovery-screen.tsx';
import { DataTools } from './data-tools.tsx';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Root } from 'react-dom/client';
import type { Deck, Edit, Json, Preset } from '../../../packages/domain/src/logbook.ts';
import {
  deckEdit,
  deckPath,
  deckRecords,
  decks,
  presetEdit,
  profileEdit,
  removeDeck,
  settings,
  settingsEdit,
} from '../../../packages/domain/src/management.ts';
import { preferences } from '../../../packages/domain/src/reflection.ts';
import { object } from '../../../packages/domain/src/notebook.ts';
import { openLogbook } from '../../../packages/persistence/src/logbook.ts';
import { preparePhoto } from '../../../packages/persistence/src/media.ts';
import { createLogbookProjection } from './logbook-store.ts';
import { browserPhotoCodec } from './photo-codec.ts';
import {
  Avatar,
  DeckIcon,
  GlobalTools,
  ManagementMenus,
  ManagementStatus,
  Modal,
  routes,
} from './management-ui.tsx';
import type { Projection } from './management-ui.tsx';
import logo from '../../../icons/brand-icon.svg';
import styles from './management.module.css';
import { deckArt } from './deck-art.ts';
const starterDecks = [
  ['Work', '#3d7fc2', 'briefcase'],
  ['Life and Leisure', '#a67c5b', 'coffee'],
  ['Relationships', '#c36fb0', 'users'],
  ['Learning', '#d8b94c', 'book'],
  ['Health', '#4fae7f', 'heart'],
  ['Time Wasted', '#5b5855', 'clock'],
] as const;
const photoLimits = {
  inputBytes: 8 * 1024 * 1024,
  outputBytes: 1024 * 1024,
  pixels: 16000000,
  longEdge: 2048,
};
function PhotoPreview({ file }: { file: File }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setError('');
    const preview = canvas.current;
    preview?.getContext('2d')?.clearRect(0, 0, preview.width, preview.height);
    void (async () => {
      // File input acceptance is only a chooser hint. Decode bounded raster formats;
      // never reinterpret a file-derived URL or markup in an HTML image source.
      if (
        !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) ||
        !file.size ||
        file.size > photoLimits.inputBytes
      )
        throw Error('Unsupported photo');
      const bitmap = await createImageBitmap(file);
      try {
        if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > photoLimits.pixels)
          throw Error('Photo memory limit');
        if (cancelled || !preview) return;
        const scale = Math.min(1, 128 / Math.max(bitmap.width, bitmap.height));
        preview.width = Math.max(1, Math.round(bitmap.width * scale));
        preview.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = preview.getContext('2d');
        if (!context) throw Error('Preview unavailable');
        context.drawImage(bitmap, 0, 0, preview.width, preview.height);
      } finally {
        bitmap.close();
      }
    })().catch(() => {
      if (!cancelled)
        setError(
          'Photo preview unavailable. Choose PNG, JPEG, WebP or GIF within the preview limits.',
        );
    });
    return () => {
      cancelled = true;
    };
  }, [file]);
  return (
    <>
      {error ? <p role="alert">{error}</p> : null}
      <canvas
        ref={canvas}
        className={styles.avatar}
        role="img"
        aria-label="Selected photo preview"
        hidden={!!error}
        width={1}
        height={1}
      />
    </>
  );
}

function Management({ projection }: { projection: Projection }) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState),
    p = settings(state),
    profile = preferences(state);
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('Ready · saved on this device'),
    [busy, setBusy] = useState(false),
    [undo, setUndo] = useState('');
  const [panel, setPanel] = useState(''),
    [deck, setDeck] = useState<Deck | null>(null),
    [preset, setPreset] = useState<Preset | null>(null),
    [remove, setRemove] = useState<Deck | null>(null),
    [reassign, setReassign] = useState(''),
    [inspect, setInspect] = useState<Deck | null>(null);
  const [name, setName] = useState(String(profile.name ?? '')),
    [file, setFile] = useState<File | null>(null),
    [original, setOriginal] = useState(false),
    [removePhoto, setRemovePhoto] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, Json>>(p),
    [storage, setStorage] = useState('Storage status not checked'),
    [notification, setNotification] = useState('Notification permission not checked');
  const [welcome, setWelcome] = useState(() => {
      const route = new URLSearchParams(location.search);
      return (
        !Object.keys(state.entities).length &&
        !['tour', 'tool', 'new', 'editDeck', 'editPreset', 'deck'].some((key) => route.has(key))
      );
    }),
    [step, setStep] = useState(0),
    [starter, setStarter] = useState([
      'Work',
      'Life and Leisure',
      'Relationships',
      'Learning',
      'Health',
      'Time Wasted',
    ]),
    [purpose, setPurpose] = useState(''),
    [priorities, setPriorities] = useState<string[]>(['home']);
  const saving = useRef(false),
    initial = useRef(false);
  const dirty =
    !!deck || !!preset || panel === 'profile' || panel === 'preferences' || welcome || !!remove;
  const blocked = busy || dirty || !!inspect || !!panel;
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty || saving.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty]);
  useEffect(() => {
    if (initial.current) return;
    initial.current = true;
    if (new URLSearchParams(location.search).get('new') === 'deck') setDeck(newDeck());
    const params = new URLSearchParams(location.search);
    const d = state.entities['deck:' + params.get('editDeck')],
      selected = state.entities['deck:' + params.get('deck')],
      preset = state.entities['preset:' + params.get('editPreset')];
    if (d?.kind === 'deck') setDeck(structuredClone(d));
    if (selected?.kind === 'deck') setInspect(selected);
    if (preset?.kind === 'preset') setPreset(structuredClone(preset));
    if (params.get('new') === 'preset')
      setPreset({ kind: 'preset', id: crypto.randomUUID(), title: '', deck: null, duration: 0 });
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, []);
  async function save(edit: Edit, media: Parameters<Projection['save']>[1] = []) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setStatus('Saving locally…');
    try {
      const id = crypto.randomUUID();
      await projection.save({ id, at: Date.now(), edit }, media);
      setUndo(edit.type === 'restore' ? '' : id);
      setStatus('Saved locally');
      return true;
    } catch (e) {
      setStatus(
        `Unsaved · ${media.length ? 'Photo storage failed in this browser. ' : ''}${(e as Error).message}. Your draft is retained; retry.`,
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const run = async (build: () => Edit, done: () => void) => {
    try {
      if (await save(build())) done();
    } catch (e) {
      setStatus('Unsaved · ' + (e as Error).message);
    }
  };
  const close = () => {
    if (!saving.current) {
      setPanel('');
      setDeck(null);
      setPreset(null);
      setRemove(null);
      setInspect(null);
      setStatus((value) =>
        value.startsWith('Unsaved') ? 'Draft canceled · saved data unchanged.' : value,
      );
    }
  };
  const newDeck = (parent: string | null = null): Deck => ({
    kind: 'deck',
    id: crypto.randomUUID(),
    name: '',
    parent,
    excludeFromStreak: false,
    legacy: { c: '#226192', ic: 'star' },
  });
  const allDecks = decks(state),
    presets = Object.values(state.entities).filter((e): e is Preset => e.kind === 'preset');
  const show = (text: string) => !query.trim() || text.toLowerCase().includes(query.toLowerCase());
  const openPrefs = () => {
    setPrefs(settings(state));
    setPanel('preferences');
  };
  const notify = (message: string) => {
    setStatus(message);
    if ('Notification' in window && Notification.permission === 'granted')
      try {
        new Notification('Sailor Logbook', { body: message });
      } catch {
        setStatus(message + ' · System notification unavailable; in-app reminder shown.');
      }
  };
  const storageStatus = async (request = false) => {
    try {
      if (!navigator.storage) {
        setStorage('Storage management API unavailable. IndexedDB remains browser-managed.');
        return;
      }
      const granted = request
        ? await navigator.storage.persist?.()
        : await navigator.storage.persisted?.();
      const estimate = await navigator.storage.estimate?.();
      setStorage(
        `${granted ? 'Persistent storage granted' : 'Standard browser storage; persistence not granted'}. ${estimate?.usage == null ? 'Usage unavailable' : (estimate.usage / 1048576).toFixed(1) + ' MiB estimated usage'}${estimate?.quota == null ? '' : ' / ' + (estimate.quota / 1048576).toFixed(0) + ' MiB estimated quota'}. Browser/OS clearing can still remove data.`,
      );
    } catch {
      setStorage('Storage status unavailable. Existing data is retained.');
    }
  };
  const renderDeck = (d: Deck): React.ReactNode => (
    <div
      key={d.id}
      className={styles.deck}
      style={
        {
          '--deck': /^#[a-fA-F0-9]{6}$/.test(String(object(d.legacy).c))
            ? String(object(d.legacy).c)
            : '#226192',
        } as React.CSSProperties
      }
    >
      <div className={styles.row}>
        <button aria-label={`Open deck ${d.name}`} onClick={() => setInspect(d)}>
          <DeckIcon name={String(object(d.legacy).ic ?? 'star')} /> {d.name}
        </button>
        <small>{deckRecords(state, d.id).length} records & presets</small>
        <button aria-label={`Edit deck ${d.name}`} onClick={() => setDeck(structuredClone(d))}>
          Edit
        </button>
        <button aria-label={`Add sub-deck to ${d.name}`} onClick={() => setDeck(newDeck(d.id))}>
          + Sub-deck
        </button>
      </div>
      {allDecks.some((c) => c.parent === d.id) && (
        <details>
          <summary aria-label={`Show sub-decks of ${d.name}`}>Sub-decks</summary>
          {allDecks.filter((c) => c.parent === d.id).map(renderDeck)}
        </details>
      )}
    </div>
  );
  const startTour = () => {
    location.href = '/?phase=5&tour=0';
  };
  async function finishWelcome() {
    const profileCommand = profileEdit(state, { name: name.trim(), ob: 1, out: 0 });
    const settingsCommand = settingsEdit(state, {
      ...prefs,
      st: priorities[0] ?? 'home',
      su: priorities,
      fn: purpose,
      onboarding: 1,
    });
    if (profileCommand.type !== 'putMany' || settingsCommand.type !== 'putMany') return;
    const entities = [...profileCommand.entities, ...settingsCommand.entities];
    if (!allDecks.length)
      for (const title of starter)
        entities.push({
          kind: 'deck',
          id: crypto.randomUUID(),
          name: title,
          parent: null,
          excludeFromStreak: title === 'Time Wasted',
          legacy: {
            c: starterDecks.find((d) => d[0] === title)?.[1] ?? '#226192',
            ic: starterDecks.find((d) => d[0] === title)?.[2] ?? 'star',
          },
        });
    if (await save({ type: 'putMany', entities })) {
      setWelcome(false);
      startTour();
    }
  }
  return (
    <ManagementStatus.Provider value={status}>
      <main className={styles.shell}>
        <GlobalTools projection={projection} blocked={blocked} />
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <img src={logo} alt="" />
            <b>Sailor Logbook</b>
          </div>
          {routes.map(([title, href]) => (
            <a
              key={title}
              href={href}
              aria-current={title === 'Settings' ? 'page' : undefined}
              onClick={(e) => {
                if (blocked) e.preventDefault();
              }}
            >
              {title}
            </a>
          ))}
          <ManagementMenus projection={projection} blocked={blocked} />
        </aside>
        <header>
          <h1>Make it yours</h1>
          <p>Your profile, workspace and a little help along the way.</p>
        </header>
        <p role="status" aria-live="polite">
          {status}
        </p>
        <div className={styles.row}>
          {undo && (
            <button disabled={busy} onClick={() => void save({ type: 'restore', deletion: undo })}>
              Undo last change
            </button>
          )}
          <button disabled={blocked} onClick={() => setPanel('recovery')}>
            Recent changes
          </button>
          <button
            disabled={blocked}
            onClick={() => {
              const route =
                { home: routes[0][1], cal: routes[1][1], plan: routes[2][1], note: routes[4][1] }[
                  String(p.st ?? 'home')
                ] ?? routes[0][1];
              location.href = route;
            }}
          >
            Open startup screen
          </button>
        </div>
        <label>
          Search settings
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Profile, decks, reminders, help…"
          />
        </label>
        <div className={styles.grid}>
          {show('profile name picture photo account') && (
            <section id="profile">
              <h2>Profile</h2>
              <div className={styles.row}>
                <Avatar projection={projection} />
                <span>{String(profile.name ?? 'Captain')}</span>
                <button
                  disabled={blocked}
                  onClick={() => {
                    setName(String(profile.name ?? ''));
                    setFile(null);
                    setOriginal(false);
                    setRemovePhoto(false);
                    setPanel('profile');
                  }}
                >
                  Edit profile
                </button>
              </div>
              <p>Local use needs no Sailor Logbook account.</p>
            </section>
          )}
          {show('preferences startup default duration time format week sounds haptics layout') && (
            <section id="preferences">
              <h2>Preferences</h2>
              <p>
                Startup: {String(p.st ?? 'home')} · Default block: {Number(p.dl ?? 30)} min ·{' '}
                {p.h24 ? '24-hour' : '12-hour'} time
              </p>
              <button disabled={blocked} onClick={openPrefs}>
                Edit preferences
              </button>
              <button
                disabled={blocked}
                onClick={() =>
                  void run(
                    () =>
                      profileEdit(state, {
                        order: ['must', 'cur', 'best', 'mood', 'otd', 'stats'],
                        hide: [],
                      }),
                    () => {},
                  )
                }
              >
                Reset Home layout
              </button>
            </section>
          )}
          {show(
            'decks categories hierarchy exclusion colour icon ' +
              allDecks.map((d) => d.name).join(' '),
          ) && (
            <section id="decks" className={styles.wide}>
              <h2>Decks</h2>
              <p>
                Deck → sub-deck → sub-deck. Ancestors include descendant records once. Red is
                reserved for Must-do and the now-line.
              </p>
              {allDecks.filter((d) => d.parent === null).map(renderDeck)}
              <button disabled={blocked} onClick={() => setDeck(newDeck())}>
                Add deck
              </button>
            </section>
          )}
          {show('presets routines quick add duration ' + presets.map((p) => p.title).join(' ')) && (
            <section id="presets">
              <h2>Presets</h2>
              {presets.map((p) => (
                <div className={styles.row} key={p.id}>
                  <span>
                    {p.title}
                    <small>
                      {p.duration ? p.duration + ' min' : 'Keep block length'} ·{' '}
                      {p.deck ? deckPath(state, p.deck) : 'No deck'}
                    </small>
                  </span>
                  <button
                    disabled={blocked}
                    aria-label={`Edit preset ${p.title}`}
                    onClick={() => setPreset(structuredClone(p))}
                  >
                    Edit
                  </button>
                </div>
              ))}
              <button
                disabled={blocked}
                onClick={() =>
                  setPreset({
                    kind: 'preset',
                    id: crypto.randomUUID(),
                    title: '',
                    deck: null,
                    duration: 0,
                  })
                }
              >
                Add preset
              </button>
            </section>
          )}
          {show('reminders daily notifications permission') && (
            <section id="reminders">
              <h2>Reminders</h2>
              <p>
                {p.rem
                  ? `One gentle nudge at ${String(p.rt ?? '20:00')}, only if no activity is logged today.`
                  : 'Daily reminder is off.'}
              </p>
              <p>
                Works while a logbook tab is open. Browsers may suspend background tabs. Closed-app
                scheduling is unavailable in this review; Android native reminders arrive in Phase
                10. Notification permission alone does not schedule reminders.
              </p>
              <div className={styles.row}>
                <button disabled={blocked} onClick={openPrefs}>
                  Change reminder
                </button>
                <button
                  disabled={blocked}
                  onClick={() => notify('How was your day? Log the little things.')}
                >
                  Test reminder
                </button>
                <button
                  disabled={blocked}
                  onClick={async () => {
                    if (!('Notification' in window)) {
                      setNotification(
                        'System notifications unavailable. In-app reminders remain available.',
                      );
                      return;
                    }
                    try {
                      setNotification(
                        'System notification permission: ' +
                          (await Notification.requestPermission()),
                      );
                    } catch {
                      setNotification('Notification permission unavailable in this context.');
                    }
                  }}
                >
                  Enable system notifications
                </button>
              </div>
              <p>{notification}</p>
            </section>
          )}
          {show('storage persistence quota data backup export import offline update') && (
            <section id="storage">
              <h2>Storage & data</h2>
              <p>
                Saved in IndexedDB on this browser profile. IndexedDB does not encrypt your local
                database.
              </p>
              <p>{storage}</p>
              <div className={styles.row}>
                <button disabled={blocked} onClick={() => void storageStatus()}>
                  Check storage
                </button>
                <button disabled={blocked} onClick={() => void storageStatus(true)}>
                  Request persistent storage
                </button>
              </div>
              <DataTools projection={projection} blocked={blocked} />
            </section>
          )}
          {show(
            'capabilities platform sync dropbox encryption widgets install ios android sound haptics',
          ) && (
            <section id="capabilities">
              <h2>Platform capabilities</h2>
              <p>
                Web/PWA and iOS/iPadOS 17+ Safari/PWA are launch targets. The production build
                provides offline installation and deferred updates in Storage & data. Native iOS
                packaging is later. Actual Safari and phone verification remains pending.
              </p>
              <p>
                Android 12+ is the product target; 4 GB RAM is recommended. Signed APK, native
                reminders, protected keys, Quick log and private-by-default Today widgets arrive in
                Phase 10. Browser previews are not native widgets.
              </p>
              <p>
                Haptic API:{' '}
                {typeof navigator.vibrate === 'function'
                  ? 'available; device support varies'
                  : 'unavailable; visual feedback remains'}
                . Sound API:{' '}
                {'AudioContext' in window
                  ? 'available after a user gesture; device settings may mute it'
                  : 'unavailable'}
                .
              </p>
              <p>
                Dropbox transport and existing-logbook joining arrive in Phase 9. Ordinary sync
                comes first, with no encryption setup required.
              </p>
              <details>
                <summary>Optional encryption (later)</summary>
                <p>
                  Secondary cloud/backup protection, implemented in Phase 9. This review does not
                  encrypt content. Unencrypted Dropbox content can be read by Dropbox. Browser
                  unlock will be session-only; trusted Android unlock requires platform protection.
                  Lock, Disconnect, Erase local and Delete logbook everywhere are distinct later
                  flows.
                </p>
              </details>
            </section>
          )}
          {show(
            'help onboarding walkthrough keyboard shortcuts about privacy terms license support',
          ) && (
            <section id="help">
              <h2>Help & about</h2>
              <div className={styles.row}>
                <button disabled={blocked} onClick={startTour}>
                  Replay walkthrough
                </button>
                <a href="/?phase=7&tool=shortcuts">Keyboard shortcuts</a>
                <button
                  disabled={blocked}
                  onClick={() => {
                    setName(String(profile.name ?? ''));
                    setPrefs(p);
                    setWelcome(true);
                    setStep(0);
                  }}
                >
                  Review onboarding
                </button>
                <button disabled={blocked} onClick={() => setPanel('join')}>
                  Connect an existing logbook
                </button>
              </div>
              <p>
                Use Search → commands or press ? for the complete keyboard reference and optional
                desktop practice.
              </p>
              <p>
                Phase 7 review · MIT · Free, no ads, no telemetry by default. Manual diagnostics
                must omit personal content and keys.
              </p>
              <a
                href="https://github.com/byshriv/Sailor-LogBook/issues"
                target="_blank"
                rel="noreferrer"
              >
                Report an issue
              </a>
            </section>
          )}
        </div>
        {panel === 'profile' && (
          <Modal title="Edit profile" close={close}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (saving.current) return;
                if (!name.trim()) {
                  setStatus('Enter your name');
                  return;
                }
                // Encoding is outside the transaction; hold the UI against double submission.
                saving.current = true;
                setBusy(true);
                try {
                  const photo = file
                    ? await preparePhoto(file, original, photoLimits, browserPhotoCodec)
                    : null;
                  const patch: Record<string, Json> = { name: name.trim() };
                  if (photo) {
                    patch.avatarDigest = photo.id;
                    patch.av = null;
                  } else if (removePhoto) {
                    patch.avatarDigest = null;
                    patch.av = null;
                  }
                  saving.current = false;
                  if (
                    await save(
                      profileEdit(projection.store.getState(), patch),
                      photo ? [photo] : [],
                    )
                  )
                    close();
                } catch (e) {
                  setStatus(
                    `Unsaved · ${(e as Error).message}. Photo and name retained; retry or choose Keep original.`,
                  );
                } finally {
                  saving.current = false;
                  setBusy(false);
                }
              }}
            >
              <label>
                Your name
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                Profile photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={busy}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setRemovePhoto(false);
                  }}
                />
              </label>
              {file && <PhotoPreview file={file} />}
              <label>
                <input
                  type="checkbox"
                  checked={original}
                  disabled={busy}
                  onChange={(e) => setOriginal(e.target.checked)}
                />
                Keep original (unchecked by default)
              </label>
              <p>
                {file ? `Original: ${(file.size / 1024).toFixed(0)} KiB. ` : ''}WebP is the default.
                Keeping original bytes uses more device/Dropbox storage and transfer data. Preview
                budgets: 8 MiB input, 16 million pixels, 2048px / 1 MiB WebP output; final
                phone-tested limits are pending.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={removePhoto}
                  disabled={busy || !!file}
                  onChange={(e) => setRemovePhoto(e.target.checked)}
                />
                Remove current picture
              </label>
              <div className={styles.actions}>
                <button type="button" disabled={busy} onClick={close}>
                  Cancel
                </button>
                <button disabled={busy}>Save profile</button>
              </div>
            </form>
          </Modal>
        )}
        {panel === 'preferences' && (
          <Modal title="Edit preferences" close={close}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  () => settingsEdit(state, prefs),
                  () => {
                    close();
                  },
                );
              }}
            >
              <fieldset disabled={busy}>
                <label>
                  Open on startup
                  <select
                    value={String(prefs.st ?? 'home')}
                    onChange={(e) => setPrefs({ ...prefs, st: e.target.value })}
                  >
                    {[
                      ['home', 'Home'],
                      ['cal', 'Calendar'],
                      ['plan', 'Planner'],
                      ['note', 'Notebook'],
                    ].map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Default block length
                  <select
                    value={Number(prefs.dl ?? 30)}
                    onChange={(e) => setPrefs({ ...prefs, dl: Number(e.target.value) })}
                  >
                    {[15, 30, 45, 60].map((n) => (
                      <option key={n} value={n}>
                        {n} minutes
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Week starts on
                  <select
                    value={Number(prefs.ws ?? 0)}
                    onChange={(e) => setPrefs({ ...prefs, ws: Number(e.target.value) })}
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                  </select>
                </label>
                <label>
                  Default Calendar view
                  <select
                    value={String(prefs.dv ?? 1)}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        dv: e.target.value === 'm' ? 'm' : Number(e.target.value),
                      })
                    }
                  >
                    {[
                      [1, 'Day'],
                      [2, '2 days'],
                      [3, '3 days'],
                      [4, '4 days'],
                      [7, 'Week'],
                      ['m', 'Month'],
                    ].map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  ['h24', '24-hour time'],
                  ['snd', 'Sounds'],
                  ['hap', 'Haptics'],
                  ['rem', 'Daily reminder'],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={!!prefs[key!]}
                      onChange={(e) => setPrefs({ ...prefs, [key!]: e.target.checked ? 1 : 0 })}
                    />
                    {label}
                  </label>
                ))}
                <label>
                  Remind at
                  <input
                    type="time"
                    required
                    value={String(prefs.rt ?? '20:00')}
                    onChange={(e) => setPrefs({ ...prefs, rt: e.target.value })}
                  />
                </label>
                <p>
                  Sound and haptic preferences persist. Playback requires a user gesture and
                  platform support. Reminder scheduling requires an open tab in this review.
                </p>
                <div className={styles.actions}>
                  <button type="button" onClick={close}>
                    Cancel
                  </button>
                  <button>Save preferences</button>
                </div>
              </fieldset>
            </form>
          </Modal>
        )}
        {deck && (
          <Modal title={state.entities['deck:' + deck.id] ? 'Edit deck' : 'Add deck'} close={close}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => deckEdit(state, deck), close);
              }}
            >
              <fieldset disabled={busy}>
                <label>
                  Deck name
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    value={deck.name}
                    onChange={(e) => setDeck({ ...deck, name: e.target.value })}
                  />
                </label>
                <label>
                  Parent deck
                  <select
                    value={deck.parent ?? ''}
                    onChange={(e) => setDeck({ ...deck, parent: e.target.value || null })}
                  >
                    <option value="">Top level</option>
                    {allDecks
                      .filter((d) => d.id !== deck.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {deckPath(state, d.id)}
                        </option>
                      ))}
                  </select>
                </label>
                <p>
                  Moves that create a cycle or exceed three levels are rejected without changing any
                  data.
                </p>
                <label>
                  Deck colour
                  <input
                    type="color"
                    value={String(object(deck.legacy).c ?? '#226192')}
                    onChange={(e) =>
                      setDeck({ ...deck, legacy: { ...object(deck.legacy), c: e.target.value } })
                    }
                  />
                </label>
                <label>
                  Deck icon
                  <select
                    value={String(object(deck.legacy).ic ?? 'star')}
                    onChange={(e) =>
                      setDeck({ ...deck, legacy: { ...object(deck.legacy), ic: e.target.value } })
                    }
                  >
                    {[
                      ...new Set([
                        String(object(deck.legacy).ic ?? 'star'),
                        ...Object.keys(deckArt),
                      ]),
                    ].map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={deck.excludeFromStreak}
                    onChange={(e) => setDeck({ ...deck, excludeFromStreak: e.target.checked })}
                  />
                  Exclude from hours streak (also descendants)
                </label>
                <div className={styles.actions}>
                  {state.entities['deck:' + deck.id] && (
                    <button
                      type="button"
                      onClick={() => {
                        setRemove(deck);
                        setReassign('');
                        setDeck(null);
                      }}
                    >
                      Delete deck…
                    </button>
                  )}
                  <button type="button" onClick={close}>
                    Cancel
                  </button>
                  <button>Save deck</button>
                </div>
              </fieldset>
            </form>
          </Modal>
        )}
        {remove && (
          <Modal title="Delete deck and reassign" close={close}>
            <p>
              Delete “{remove.name}” and reassign its direct child decks, activities, tasks and
              presets in one reversible change. No activity is deleted.
            </p>
            <label>
              Reassign to
              <select
                disabled={busy}
                value={reassign}
                onChange={(e) => setReassign(e.target.value)}
              >
                <option value="">No deck / children become top level</option>
                {allDecks
                  .filter((d) => d.id !== remove.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {deckPath(state, d.id)}
                    </option>
                  ))}
              </select>
            </label>
            <p>
              Includes {deckRecords(state, remove.id).length} records and presets under this
              hierarchy; descendant links remain intact. Invalid descendant/cycle/depth targets are
              rejected.
            </p>
            <button disabled={busy} onClick={close}>
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={() => void run(() => removeDeck(state, remove.id, reassign || null), close)}
            >
              Delete and reassign
            </button>
          </Modal>
        )}
        {preset && panel !== 'delete-preset' && (
          <Modal
            title={state.entities['preset:' + preset.id] ? 'Edit preset' : 'Add preset'}
            close={close}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => presetEdit(state, preset), close);
              }}
            >
              <fieldset disabled={busy}>
                <label>
                  Preset title
                  <input
                    autoFocus
                    required
                    maxLength={500}
                    value={preset.title}
                    onChange={(e) => setPreset({ ...preset, title: e.target.value })}
                  />
                </label>
                <label>
                  Preset deck
                  <select
                    value={preset.deck ?? ''}
                    onChange={(e) => setPreset({ ...preset, deck: e.target.value || null })}
                  >
                    <option value="">No deck</option>
                    {allDecks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {deckPath(state, d.id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Duration in minutes (0 keeps block length)
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    required
                    value={preset.duration}
                    onChange={(e) => setPreset({ ...preset, duration: Number(e.target.value) })}
                  />
                </label>
                <div className={styles.actions}>
                  {state.entities['preset:' + preset.id] && (
                    <button type="button" onClick={() => setPanel('delete-preset')}>
                      Delete preset…
                    </button>
                  )}
                  <button type="button" onClick={close}>
                    Cancel
                  </button>
                  <button>Save preset</button>
                </div>
              </fieldset>
            </form>
          </Modal>
        )}
        {panel === 'delete-preset' && preset && (
          <Modal title="Delete preset?" close={() => setPanel('')}>
            <p>Remove “{preset.title}”. Logged activities remain. Undo is available for 30 days.</p>
            <button disabled={busy} onClick={() => setPanel('')}>
              Keep preset
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(() => ({ type: 'delete', keys: ['preset:' + preset.id] }), close)
              }
            >
              Delete preset
            </button>
          </Modal>
        )}
        {inspect && (
          <Modal title={deckPath(state, inspect.id)} close={close}>
            <p>Includes descendants once.</p>
            {deckRecords(state, inspect.id).map((e) => (
              <p key={e.kind + e.id}>
                {'title' in e ? e.title : e.id} · {e.kind}
                {e.kind === 'activity' && (
                  <a
                    href={`/?phase=3&date=${e.segments[0]!.date}&item=${encodeURIComponent(e.id)}`}
                  >
                    {' '}
                    Open activity
                  </a>
                )}
                {e.kind === 'task' && (
                  <a href={`/?phase=6&date=${e.date}&item=${encodeURIComponent(e.id)}`}>
                    {' '}
                    Open task
                  </a>
                )}
              </p>
            ))}
          </Modal>
        )}
        {panel === 'recovery' && (
          <Modal title="Recent changes · 30 days" close={close}>
            {Object.values(state.trash)
              .filter((t) => t.expiresAt > Date.now())
              .reverse()
              .map((t) => (
                <div className={styles.row} key={t.command}>
                  <span>
                    {Object.keys(t.before).join(', ')}
                    <small>{new Date(t.deletedAt).toLocaleString()}</small>
                  </span>
                  <button
                    disabled={busy}
                    onClick={() => void save({ type: 'restore', deletion: t.command })}
                  >
                    Undo change
                  </button>
                </div>
              ))}
          </Modal>
        )}
        {panel === 'join' && (
          <Modal title="Bring your logbook aboard" close={close}>
            <p>
              Use the same Dropbox account as your other device, or restore a local backup. Use
              Backup and recovery in Storage & data to preview a local file. Dropbox joining arrives
              in Phase 9. No connection is made here. Your existing data stays on its current device
              and in the demo.
            </p>
            <button onClick={close}>Back to Settings</button>
          </Modal>
        )}
        {welcome && (
          <Modal
            title="Welcome to Sailor Logbook"
            close={() => {
              if (!busy) setWelcome(false);
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 6)
                  void finishWelcome().catch((e) => setStatus('Unsaved · ' + (e as Error).message));
                else setStep((v) => v + 1);
              }}
            >
              <fieldset disabled={busy}>
                <p>Set up your logbook · {step + 1} of 7</p>
                {step === 0 && (
                  <div className={styles.welcome}>
                    <div>
                      <h3>A personal book for the little things you do.</h3>
                      <p>
                        Use locally without an account. Keep a cheerful record, with joy over
                        busywork.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setWelcome(false);
                          setPanel('join');
                        }}
                      >
                        Connect an existing logbook
                      </button>
                    </div>
                    <img src={logo} alt="Sailor Logbook" />
                  </div>
                )}
                {step === 1 && (
                  <label>
                    Your name
                    <input
                      autoFocus
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                )}
                {step === 2 && (
                  <>
                    <h3>Ever feel you did nothing, even when you did a lot?</h3>
                    {['Often', 'Sometimes', 'Rarely'].map((v) => (
                      <button
                        type="button"
                        key={v}
                        aria-pressed={purpose === v}
                        onClick={() => setPurpose(v)}
                      >
                        {v}
                      </button>
                    ))}
                    <p>A logbook keeps the small details that add up to a voyage.</p>
                  </>
                )}
                {step === 3 && (
                  <>
                    <h3>What matters most to you?</h3>
                    <p>Your first choice opens at startup.</p>
                    {[
                      ['home', 'My day at a glance'],
                      ['cal', 'Remember what happened'],
                      ['plan', 'Plan ahead'],
                      ['note', 'Write and draw'],
                    ].map(([v, t]) => (
                      <label key={v}>
                        <input
                          type="checkbox"
                          checked={priorities.includes(v!)}
                          onChange={(e) =>
                            setPriorities(
                              e.target.checked
                                ? [...priorities, v!]
                                : priorities.filter((x) => x !== v),
                            )
                          }
                        />
                        {t}
                      </label>
                    ))}
                  </>
                )}
                {step === 4 && (
                  <>
                    <h3>Your first decks</h3>
                    {allDecks.length ? (
                      <p>Your existing decks will be kept.</p>
                    ) : (
                      [
                        'Work',
                        'Life and Leisure',
                        'Relationships',
                        'Learning',
                        'Health',
                        'Time Wasted',
                      ].map((t) => (
                        <label key={t}>
                          <input
                            type="checkbox"
                            checked={starter.includes(t)}
                            onChange={(e) =>
                              setStarter(
                                e.target.checked ? [...starter, t] : starter.filter((x) => x !== t),
                              )
                            }
                          />
                          {t}
                        </label>
                      ))
                    )}
                  </>
                )}
                {step === 5 && (
                  <>
                    <h3>One gentle reminder?</h3>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!prefs.rem}
                        onChange={(e) => setPrefs({ ...prefs, rem: e.target.checked ? 1 : 0 })}
                      />
                      Remind me if I have not logged today
                    </label>
                    <label>
                      Remind at
                      <input
                        type="time"
                        required
                        value={String(prefs.rt ?? '20:00')}
                        onChange={(e) => setPrefs({ ...prefs, rt: e.target.value })}
                      />
                    </label>
                    <p>
                      Open-tab reminders only in this review. Closed-app Android reminders arrive in
                      Phase 10.
                    </p>
                  </>
                )}
                {step === 6 && (
                  <>
                    <h3>Ready to set sail</h3>
                    <p>
                      Your choices save together when you finish. The walkthrough uses real screens.
                      Desktop keyboard practice is optional. You can change everything in Settings.
                    </p>
                  </>
                )}
                <div className={styles.actions}>
                  {step > 0 && (
                    <button type="button" onClick={() => setStep((v) => v - 1)}>
                      Back
                    </button>
                  )}
                  <button type="button" onClick={() => setWelcome(false)}>
                    Cancel setup
                  </button>
                  <button
                    disabled={
                      (step === 1 && !name.trim()) ||
                      (step === 2 && !purpose) ||
                      (step === 3 && !priorities.length) ||
                      (step === 4 && !allDecks.length && !starter.length)
                    }
                  >
                    {step === 6 ? 'Set sail' : 'Continue'}
                  </button>
                </div>
              </fieldset>
            </form>
          </Modal>
        )}
      </main>
    </ManagementStatus.Provider>
  );
}
export async function startManagement(root: Root) {
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
      message('Another logbook editor is active. Return to it, or close it and reload.');
      return;
    }
    try {
      const db = await openLogbook(indexedDB);
      let projection;
      try {
        projection = await createLogbookProjection(db, () => {});
      } catch {
        root.render(<RecoveryScreen db={db} />);
        await new Promise<void>(() => {});
        return;
      }
      root.render(<Management projection={projection} />);
      await new Promise<void>(() => {});
    } catch {
      message('Storage validation failed. Existing data is retained; export/recovery is required.');
    }
  });
}
