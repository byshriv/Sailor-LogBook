import { device, restoreTrust } from './native-production.ts';
import { isNative } from './native.ts';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import type { Entity } from '../../../packages/domain/src/logbook.ts';
import {
  settings,
  searchLogbook,
  reminderDue,
  reminderReceipt,
  localDate,
} from '../../../packages/domain/src/management.ts';
import { preferences } from '../../../packages/domain/src/reflection.ts';
import { object } from '../../../packages/domain/src/notebook.ts';
import { createLogbookProjection } from './logbook-store.ts';
import logo from '../../../icons/brand-icon.svg';
import styles from './management.module.css';
import { deckArt } from './deck-art.ts';
export type Projection = Awaited<ReturnType<typeof createLogbookProjection>>;
export const ManagementStatus = createContext('');
let lastInteraction: HTMLElement | null = null;
export function DeckIcon({ name }: { name: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: deckArt[name] ?? deckArt.star! }}
    />
  );
}
export function ManagementMenus({
  projection,
  blocked = false,
}: {
  projection: Projection;
  blocked?: boolean;
}) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState);
  const items = Object.values(state.entities).filter((e) => e.kind === 'deck');
  const link = (href: string, label: string, text: React.ReactNode) => (
    <a
      href={href}
      aria-label={label}
      onClick={(e) => {
        if (blocked) e.preventDefault();
      }}
    >
      {text}
    </a>
  );
  const row = (id: string): React.ReactNode => {
    const d = items.find((d) => d.id === id)!;
    const children = items.filter((child) => child.parent === id);
    return (
      <div key={id} className={styles.menuDeck}>
        <div className={styles.row}>
          {link(
            '/?phase=7&deck=' + encodeURIComponent(id),
            'Open deck ' + d.name,
            <>
              <DeckIcon name={String(object(d.legacy).ic ?? 'star')} />
              {d.name}
            </>,
          )}
          {link('/?phase=7&editDeck=' + encodeURIComponent(id), 'Edit deck ' + d.name, 'Edit')}
        </div>
        {!!children.length && (
          <details>
            <summary aria-label={'Show sub-decks of ' + d.name}>Sub-decks</summary>
            {children.map((c) => row(c.id))}
          </details>
        )}
      </div>
    );
  };
  return (
    <div className={styles.menus}>
      <details>
        <summary>Decks</summary>
        {items.filter((d) => !d.parent).map((d) => row(d.id))}
        {link('/?phase=7&new=deck', 'Add deck', '+ Add deck')}
        {link('/?phase=7#decks', 'Manage decks', 'Manage decks')}
      </details>
      <details>
        <summary>Presets</summary>
        {Object.values(state.entities)
          .filter((e) => e.kind === 'preset')
          .map((p) => (
            <div className={styles.row} key={p.id}>
              {link(
                '/?phase=3&preset=' + encodeURIComponent(p.id),
                'Use preset ' + p.title,
                p.title,
              )}
              {link(
                '/?phase=7&editPreset=' + encodeURIComponent(p.id),
                'Edit preset ' + p.title,
                'Edit',
              )}
            </div>
          ))}
        {link('/?phase=7&new=preset', 'Add preset', '+ Add preset')}
      </details>
    </div>
  );
}

export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const status = useContext(ManagementStatus);
  useEffect(() => {
    const active = document.activeElement as HTMLElement;
    const previous = active === document.body ? lastInteraction : active;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      queueMicrotask(() => {
        if (previous?.isConnected) previous.focus();
      });
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          const nodes = [
            ...e.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
            ),
          ].filter((n) => n.getClientRects().length && !n.closest('fieldset:disabled'));
          const first = nodes[0],
            last = nodes.at(-1);
          if (
            first &&
            last &&
            ((!e.shiftKey && document.activeElement === last) ||
              (e.shiftKey && document.activeElement === first))
          ) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus();
          }
        }
        e.stopPropagation();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={close}>
          ×
        </button>
      </header>
      {status.startsWith('Unsaved') && <p role="alert">{status}</p>}
      {children}
    </dialog>,
    document.body,
  );
}
export function Avatar({ projection }: { projection: Projection }) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState),
    p = preferences(state);
  const [url, setUrl] = useState('');
  useEffect(() => {
    let cancelled = false,
      current = '';
    setUrl('');
    if (typeof p.avatarDigest === 'string')
      void projection
        .attachment(p.avatarDigest)
        .then((b) => {
          if (!cancelled && b) {
            current = URL.createObjectURL(b.blob);
            setUrl(current);
          }
        })
        .catch(() => {});
    return () => {
      cancelled = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [p.avatarDigest, projection]);
  const legacy =
    typeof p.av === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/.test(p.av) ? p.av : '';
  return <img className={styles.avatar} src={url || legacy || logo} alt="Profile picture" />;
}
export const routes = [
  ['Home', '/?phase=5'],
  ['Calendar', '/?phase=3'],
  ['Planner', '/?phase=6'],
  ['Reflection', '/?phase=5&screen=reflection'],
  ['Notebook', '/?phase=4'],
  ['Settings', '/?phase=7'],
] as const;
export const shortcutGroups = [
  [
    'Create & find',
    [
      ['N', 'Log something'],
      ['T / Shift A', 'New task'],
      ['Shift P', 'New deck'],
      ['Alt N', 'Open Notebook'],
      ['Ctrl/Cmd K / Shift F', 'Search and commands'],
      ['?', 'Keyboard shortcuts'],
    ],
  ],
  [
    'Move around',
    [
      ['1–6', 'Home, Calendar, Planner, Reflection, Notebook, Settings'],
      ['Shift S / Shift L', 'Calendar / Planner'],
      ['Shift T', 'Today'],
      ['Shift D', 'Focus sidebar'],
      [',', 'Settings'],
      ['Esc', 'Close current overlay or editor'],
    ],
  ],
  [
    'Work with items',
    [
      ['J / K', 'Focus next / previous item'],
      ['Enter / E', 'Edit focused item'],
      ['D', 'Toggle focused task done'],
      ['Ctrl/Cmd D', 'Duplicate focused item'],
      ['Delete / Backspace', 'Delete focused item with confirmation'],
      ['Ctrl/Cmd Enter', 'Save current editor'],
    ],
  ],
  [
    'Calendar & sync',
    [
      ['← / →', 'Previous / next calendar period'],
      ['+ / − / 0', 'Zoom in / out / reset'],
      ['Ctrl + scroll', 'Zoom around pointer'],
      ['Ctrl/Cmd S', 'Local pending status and Dropbox review'],
    ],
  ],
] as const;
export function ShortcutReference() {
  return (
    <div className={styles.reference}>
      {shortcutGroups.map(([name, rows]) => (
        <section key={name}>
          <h3>{name}</h3>
          {rows.map(([key, text]) => (
            <p key={key}>
              <span>{text}</span>
              <kbd>{key}</kbd>
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
export const walkthrough = [
  [
    'Welcome aboard',
    'Keep a cheerful record of what actually happened. A few meaningful blocks and a best thing are enough.',
    0,
    '',
  ],
  [
    'A moment, in one click',
    'Open Calendar to log something. On a keyboard, press N outside a text field.',
    1,
    'header',
  ],
  [
    'Your week, already lived',
    'Choose Day, 3 days, Week or Month. Open an empty time slot to write, or select an existing block to edit.',
    1,
    '[data-timeline]',
  ],
  [
    'Write it in one line',
    'Read book +lea t45 sets the title, a matching deck and 45 minutes. Enter saves. Handles adjust the time; Date and Time are keyboard alternatives.',
    1,
    '[data-timeline]',
  ],
  [
    'A little room for tomorrow',
    'Tasks live in day columns. Add a time to schedule one. Unfinished tasks stay planned until you review them; rollover preserves skipped history.',
    2,
    '[data-day]',
  ],
  [
    'Your decks, close at hand',
    'Open the Decks dropdown. Disclosure, opening records and editing are separate controls. Three total levels are supported.',
    5,
    '#decks',
  ],
  [
    'Make the familiar easy',
    'Open Presets to edit routines. A duration of zero keeps the current Calendar block length.',
    5,
    '#presets',
  ],
  [
    'Keep the best part',
    'Feature up to four best things and record your mood. All extra text remains in Notebook.',
    0,
    'h1',
  ],
  [
    'Look back with kindness',
    'Streaks, lessons, gratitude, mood and your year in colour. Backfilled days count too.',
    3,
    'h1',
  ],
  [
    'A message in a bottle',
    'Write and doodle, then Send to sea. After five sent days, older bottles can drift back. Back returns to Notebook.',
    4,
    'h1',
  ],
  [
    'The same logbook on your devices',
    'Existing-logbook joining and Dropbox transport arrive in Phase 9. This review saves locally. Ordinary sync will work before optional encryption setup.',
    5,
    '#capabilities',
  ],
  [
    'Find your way quickly',
    'Search entries, tasks, Notebook and Reflection, plus Settings and commands. Ctrl/Cmd K opens search.',
    5,
    '[data-global-search]',
  ],
  [
    'Joy over busywork',
    'Keep high-level blocks for what matters to you. Replay this guide from Settings → Help whenever you like.',
    0,
    'h1',
  ],
] as const;

export function GlobalTools({
  projection,
  blocked = false,
  action,
  desktopInline = false,
}: {
  projection: Projection;
  blocked?: boolean;
  action?: (name: string) => boolean | void;
  desktopInline?: boolean;
}) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState);
  const [panel, setPanel] = useState(
      new URLSearchParams(location.search).get('tool') === 'shortcuts' ? 'shortcuts' : '',
    ),
    [query, setQuery] = useState(''),
    [practice, setPractice] = useState(0),
    [notice, setNotice] = useState(''),
    [deleting, setDeleting] = useState<Entity | null>(null),
    [undo, setUndo] = useState('');
  const [syncNotice, setSyncNotice] = useState('Checking local pending operations…');
  useEffect(() => {
    if (panel !== 'sync') return;
    let canceled = false;
    void Promise.all([projection.db.pending(), projection.db.erasureStatus()])
      .then(([pending, erasure]) => {
        if (!canceled)
          setSyncNotice(
            erasure
              ? 'Erasure review is active. Ordinary synchronization is paused.'
              : `${pending.length} local operation(s) pending. Cloud freshness has not been checked here.`,
          );
      })
      .catch(() => {
        if (!canceled)
          setSyncNotice('Local pending status unavailable; open Settings recovery tools.');
      });
    return () => {
      canceled = true;
    };
  }, [panel, projection, state]);
  const audio = useRef<AudioContext | null>(null);
  const saving = useRef(false),
    tour = Number(new URLSearchParams(location.search).get('tour'));
  const hasTour =
    new URLSearchParams(location.search).has('tour') &&
    Number.isInteger(tour) &&
    tour >= 0 &&
    tour < walkthrough.length;
  const [tourOpen, setTourOpen] = useState(hasTour);
  const nativeBusy = useRef(false),
    nativePending = useRef('none');
  const nativeBlocked = useRef(blocked || !!panel || tourOpen);
  nativeBlocked.current = blocked || !!panel || tourOpen;
  useEffect(() => {
    if (!isNative()) return;
    let disposed = false;
    const receive = async () => {
      if (disposed || nativeBlocked.current || nativeBusy.current) return;
      nativeBusy.current = true;
      try {
        if (nativePending.current === 'none')
          nativePending.current = (await device.takeLaunch()).action;
        if (disposed || nativeBlocked.current) return;
        const incoming = nativePending.current;
        if (incoming === 'quick-log' || incoming === 'today') {
          const policy = await projection.db.keyPolicy();
          if (disposed || nativeBlocked.current) return;
          if (policy) {
            try {
              await restoreTrust(policy);
            } catch {
              if (disposed || nativeBlocked.current) return;
              sessionStorage.setItem('slb-native-after-unlock', incoming);
              nativePending.current = 'none';
              location.assign('/?phase=9&tool=help&nativeUnlock=1#sync');
              return;
            }
          }
          if (disposed || nativeBlocked.current) return;
        }
        nativePending.current = 'none';
        if (incoming === 'quick-log') {
          if (!action?.('new-log')) location.assign('/?phase=3&new=log');
        } else if (incoming === 'today') {
          if (!action?.('today')) location.assign('/?phase=3&date=' + localDate());
        } else if (incoming === 'oauth') {
          const params = new URLSearchParams(location.search);
          if (params.get('phase') !== '9' || params.get('tool') !== 'help')
            location.assign('/?phase=9&tool=help#sync');
          else window.dispatchEvent(new Event('slb-oauth-return'));
        } else if (incoming === 'back') {
          if (history.length > 1) history.back();
          else await device.minimize();
        }
      } catch {
        setNotice('Native action unavailable; reopen Logbook to retry.');
      } finally {
        nativeBusy.current = false;
        if (disposed && nativePending.current !== 'none')
          window.dispatchEvent(new Event('slb-native-return'));
      }
    };
    void receive();
    const retry = () => void receive();
    window.addEventListener('slb-native-return', retry);
    const handle = device.addListener('return', retry);
    return () => {
      disposed = true;
      window.removeEventListener('slb-native-return', retry);
      void handle.then((h) => h.remove());
    };
  }, [blocked, panel, tourOpen, action]);
  useEffect(() => {
    const error = () =>
      setNotice('Saved locally; native widget or reminder refresh failed. Reopen to retry.');
    window.addEventListener('slb-native-error', error);
    return () => window.removeEventListener('slb-native-error', error);
  }, []);

  const p = settings(state);
  useEffect(() => {
    const remember = (e: PointerEvent) => {
      lastInteraction = (e.target as HTMLElement).closest<HTMLElement>(
        'button,a,input,select,textarea',
      );
    };
    document.addEventListener('pointerdown', remember, true);
    return () => document.removeEventListener('pointerdown', remember, true);
  }, []);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('button') || !e.isTrusted) return;
      const pref = settings(projection.store.getState());
      if (pref.hap && navigator.vibrate) navigator.vibrate(5);
      if (pref.snd && 'AudioContext' in window)
        try {
          const context = (audio.current ??= new AudioContext());
          void context.resume().catch(() => {});
          const oscillator = context.createOscillator(),
            gain = context.createGain();
          oscillator.frequency.value = 880;
          gain.gain.setValueAtTime(0.025, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.06);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.07);
        } catch {
          /* Platform sound is optional. */
        }
    };
    document.addEventListener('click', click);
    return () => {
      document.removeEventListener('click', click);
      void audio.current?.close().catch(() => {});
      audio.current = null;
    };
  }, [projection]);
  const go = (href: string) => {
    if (!blocked && !saving.current) location.href = href;
  };
  async function write(edit: Parameters<Projection['save']>[0]['edit']) {
    if (saving.current || blocked) return false;
    saving.current = true;
    try {
      const id = crypto.randomUUID();
      await projection.save({ id, at: Date.now(), edit });
      setUndo(edit.type === 'restore' ? '' : id);
      setNotice('Saved locally');
      return true;
    } catch (e) {
      setNotice(`Unsaved · ${(e as Error).message}. Retry when storage is available.`);
      return false;
    } finally {
      saving.current = false;
    }
  }
  const finishTour = async () => {
    const entity = state.entities['settings:preferences'];
    if (
      await write({
        type: 'putMany',
        entities: [
          { ...entity, kind: 'settings', id: 'preferences', value: { ...p, walkthrough: 1 } },
        ],
      })
    ) {
      setTourOpen(false);
      history.replaceState(null, '', location.href.replace(/&tour=\d+/, ''));
      if (matchMedia('(min-width: 900px)').matches && !p.shortcutOfferSeen) setPanel('offer');
    }
  };
  const offerDone = async (practiceIt: boolean) => {
    const entity = state.entities['settings:preferences'];
    if (
      await write({
        type: 'putMany',
        entities: [
          { ...entity, kind: 'settings', id: 'preferences', value: { ...p, shortcutOfferSeen: 1 } },
        ],
      })
    ) {
      setPractice(0);
      setPanel(practiceIt ? 'practice' : '');
    }
  };
  const finishPractice = async () => {
    const entity = state.entities['settings:preferences'];
    if (
      await write({
        type: 'putMany',
        entities: [
          {
            ...entity,
            kind: 'settings',
            id: 'preferences',
            value: { ...p, shortcutTour: 1, shortcutOfferSeen: 1 },
          },
        ],
      })
    )
      setPanel('');
  };
  useEffect(() => {
    if (!tourOpen) return;
    const selector = walkthrough[tour]![3];
    const target = selector ? document.querySelector(selector) : null;
    target?.setAttribute('data-tour-highlight', 'true');
    return () => target?.removeAttribute('data-tour-highlight');
  }, [tour, tourOpen]);
  useEffect(() => {
    const tick = async () => {
      if (isNative()) return;
      const latest = projection.store.getState();
      if (blocked || panel || tourOpen || saving.current || !reminderDue(latest, new Date()))
        return;
      saving.current = true;
      try {
        await projection.save({
          id: crypto.randomUUID(),
          at: Date.now(),
          edit: { type: 'putMany', entities: [reminderReceipt(localDate())] },
        });
        setNotice('How was your day? Log the little things.');
        if ('Notification' in window && Notification.permission === 'granted')
          try {
            new Notification('Sailor Logbook', {
              body: 'How was your day? Log the little things.',
            });
          } catch {
            /* In-app reminder remains available. */
          }
      } catch {
        setNotice('Reminder could not be recorded; it will retry while this tab stays open.');
      } finally {
        saving.current = false;
      }
    };
    const timer = setInterval(() => void tick(), 30000);
    return () => clearInterval(timer);
  }, [projection, blocked, panel, tourOpen]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) return;
      const k = e.key.toLowerCase(),
        mod = e.ctrlKey || e.metaKey;
      const consume = (fn: () => void) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        fn();
      };
      if (tourOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const next = tour + (e.key === 'ArrowLeft' ? -1 : 1);
        if (next >= 0 && next < walkthrough.length)
          consume(() => go(routes[walkthrough[next]![2]]![1] + '&tour=' + next));
        return;
      }
      if (panel === 'practice') {
        const expected = [
          !mod && !e.altKey && !e.shiftKey && k === 'n',
          !mod && e.shiftKey && k === 'a',
          mod && k === 'k',
          e.key === 'Escape',
        ][practice];
        if (expected) consume(() => setPractice((v) => v + 1));
        return;
      }
      if (mod && e.key === 'Enter') {
        const form = (e.target as HTMLElement).closest('form');
        if (form) consume(() => form.requestSubmit());
        return;
      }
      if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]'))
        return;
      if (
        panel ||
        tourOpen ||
        document.querySelector('dialog[open],[role="dialog"],[aria-modal="true"]') ||
        blocked
      )
        return;
      if (mod && k === 'k') return consume(() => setPanel('search'));
      if (mod && k === 's') return consume(() => setPanel('sync'));
      const focused = (document.activeElement as HTMLElement)?.closest<HTMLElement>(
        '[data-logbook-kind][data-logbook-id]',
      );
      const entity = focused
        ? projection.store.getState().entities[
            `${focused.dataset.logbookKind}:${focused.dataset.logbookId}`
          ]
        : null;
      if (mod && k === 'd' && entity && (entity.kind === 'task' || entity.kind === 'activity'))
        return consume(() => {
          void write({
            type: 'putMany',
            entities: [{ ...entity, id: crypto.randomUUID(), title: entity.title + ' (copy)' }],
          });
        });
      if (mod) return;
      if (e.altKey) {
        if (k === 'n') consume(() => go(routes[4][1]));
        return;
      }
      if (k === '?') return consume(() => setPanel('shortcuts'));
      if (e.shiftKey) {
        const commands: Record<string, () => void> = {
          a: () => create('task'),
          p: () => go('/?phase=7&new=deck'),
          f: () => setPanel('search'),
          s: () => go(routes[1][1]),
          l: () => go(routes[2][1]),
          t: () => {
            if (!action?.('today')) go(routes[1][1] + '&date=' + localDate());
          },
          d: () => document.querySelector<HTMLElement>('aside a,aside button')?.focus(),
        };
        if (commands[k]) consume(commands[k]!);
        return;
      }
      if (/^[1-6]$/.test(k)) return consume(() => go(routes[Number(k) - 1]![1]));
      if (k === ',') return consume(() => go(routes[5][1]));
      if (k === 'n' || k === 't') return consume(() => create(k === 'n' ? 'log' : 'task'));
      if (k === 'j' || k === 'k')
        return consume(() => {
          const items = [
            ...document.querySelectorAll<HTMLElement>('[data-logbook-kind][data-logbook-id]'),
          ];
          const index = items.indexOf(focused!);
          const next =
            items[
              Math.max(0, Math.min(items.length - 1, index < 0 ? 0 : index + (k === 'j' ? 1 : -1)))
            ];
          if (next) {
            next.tabIndex = 0;
            next.focus();
            next.scrollIntoView({ block: 'nearest' });
          }
        });
      if (entity && k === 'd' && entity.kind === 'task')
        return consume(() => {
          void write({
            type: 'putMany',
            entities: [
              {
                ...entity,
                status: entity.status === 'done' ? 'todo' : 'done',
                legacy: { ...object(entity.legacy), man: 1 },
              },
            ],
          });
        });
      if (entity && ['Delete', 'Backspace'].includes(e.key))
        return consume(() => setDeleting(entity));
      if (entity && (k === 'e' || e.key === 'Enter'))
        return consume(() => {
          const button = focused?.querySelector<HTMLButtonElement>('[data-edit-item]');
          if (button) button.click();
          else focused?.click();
        });
      if (['ArrowLeft', 'ArrowRight', '+', '=', '-', '0'].includes(e.key)) {
        if (action?.(e.key)) consume(() => {});
      }
    };
    const create = (kind: string) => {
      if (!action?.('new-' + kind)) go(`/?phase=${kind === 'log' ? 3 : 6}&new=${kind}`);
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [panel, practice, blocked, tourOpen, action, state]);
  const commands = [
    ...routes.map(([title, href]) => ({ key: title, title, href, detail: 'Open screen' })),
    ...['Profile', 'Preferences', 'Decks', 'Presets', 'Reminders', 'Capabilities', 'Help'].map(
      (title) => ({
        key: title,
        title,
        href: '/?phase=7#' + title.toLowerCase(),
        detail: 'Settings',
      }),
    ),
    { key: 'log', title: 'Log something', href: '/?phase=3&new=log', detail: 'Command · N' },
    { key: 'task', title: 'New task', href: '/?phase=6&new=task', detail: 'Command · T' },
    { key: 'deck', title: 'New deck', href: '/?phase=7&new=deck', detail: 'Command · Shift P' },
  ];
  const results = [
    ...commands.filter((c) =>
      (c.title + ' ' + c.detail).toLowerCase().includes(query.toLowerCase()),
    ),
    ...searchLogbook(state, query),
  ];
  return (
    <>
      <div
        className={`${styles.global} ${desktopInline ? styles.inlineTools : ''}`}
        aria-label="Logbook tools"
      >
        <a
          className={styles.skip}
          href="#logbook-content"
          onClick={(e) => {
            e.preventDefault();
            const heading = document.querySelector<HTMLElement>('main h1');
            if (heading) {
              heading.tabIndex = -1;
              heading.focus();
            }
          }}
        >
          Skip to content
        </a>
        <button data-global-search disabled={blocked} onClick={() => setPanel('search')}>
          Search
        </button>
        <button
          disabled={blocked}
          onClick={() => go('/?phase=7')}
          aria-label="Open Settings and profile"
        >
          <Avatar projection={projection} />
          <span>Settings</span>
        </button>
      </div>
      {notice &&
        createPortal(
          <div className={styles.notice} aria-live="polite">
            <span>{notice}</span>
            {undo && (
              <button
                disabled={blocked}
                onClick={() => void write({ type: 'restore', deletion: undo })}
              >
                Undo
              </button>
            )}
            <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
              ×
            </button>
          </div>,
          document.body,
        )}
      {panel === 'search' && (
        <Modal title="Search and commands" close={() => setPanel('')}>
          <input
            autoFocus
            aria-label="Search logbook"
            placeholder="Entries, tasks, Notebook, Reflection, settings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className={styles.results}>
            {results.map((r) => (
              <li key={r.key}>
                <a href={r.href}>
                  {r.title}
                  <small>{r.detail}</small>
                </a>
              </li>
            ))}
          </ul>
          {!results.length && <p>No results.</p>}
        </Modal>
      )}
      {panel === 'sync' && (
        <Modal title="Sync status" close={() => setPanel('')}>
          <p role="status">{syncNotice}</p>
          <p>
            Open Settings to connect Dropbox and review synchronization. Sync works before optional
            encryption setup. Tokens and unlocked keys stay in memory; navigating to another screen
            or reloading requires reconnecting. No transfer runs while this app is closed.
          </p>
          <a href="/?phase=9&tool=help#sync">Open Dropbox synchronization</a>
        </Modal>
      )}
      {panel === 'shortcuts' && (
        <Modal title="Keyboard shortcuts" close={() => setPanel('')}>
          <p>
            Shortcuts work while the app has focus. Normal text entry and browser tab shortcuts stay
            available.
          </p>
          <ShortcutReference />
          {matchMedia('(min-width: 900px)').matches && (
            <button
              onClick={() => {
                setPractice(0);
                setPanel('practice');
              }}
            >
              Try keyboard practice
            </button>
          )}
        </Modal>
      )}
      {panel === 'offer' && (
        <Modal title="Optional keyboard tour" close={() => void offerDone(false)}>
          <p>
            Try four shortcuts in a safe practice area. This practice does not create or change
            journal content.
          </p>
          <button onClick={() => void offerDone(false)}>No thanks</button>
          <button onClick={() => void offerDone(true)}>Show me</button>
        </Modal>
      )}
      {panel === 'practice' && (
        <Modal title="Keyboard practice" close={() => void finishPractice()}>
          <p>Step {practice + 1} of 5 · Safe practice</p>
          <h3>
            {
              [
                'Log something: press N',
                'New task: press Shift A',
                'Search: press Ctrl K or Cmd K',
                'Close: press Esc',
                'Your full shortcut reference',
              ][practice]
            }
          </h3>
          {practice === 4 && <ShortcutReference />}
          <div className={styles.actions}>
            <button onClick={() => (practice ? setPractice((v) => v - 1) : void finishPractice())}>
              {practice ? 'Back' : 'Skip'}
            </button>
            <button
              onClick={() => (practice < 4 ? setPractice((v) => v + 1) : void finishPractice())}
            >
              {practice === 4 ? 'Done' : 'Next'}
            </button>
          </div>
        </Modal>
      )}
      {tourOpen && (
        <Modal title="Logbook walkthrough" close={() => void finishTour()}>
          <p>
            {tour + 1} of {walkthrough.length} ·{' '}
            {matchMedia('(min-width: 900px)').matches ? 'Desktop' : 'Touch'} guide
          </p>
          <h3>{walkthrough[tour]![0]}</h3>
          <p>{walkthrough[tour]![1]}</p>
          <div className={styles.actions}>
            <button
              onClick={() =>
                tour
                  ? go(routes[walkthrough[tour - 1]![2]]![1] + '&tour=' + (tour - 1))
                  : void finishTour()
              }
            >
              {tour ? 'Back' : 'Skip tour'}
            </button>
            <button
              onClick={() =>
                tour === walkthrough.length - 1
                  ? void finishTour()
                  : go(routes[walkthrough[tour + 1]![2]]![1] + '&tour=' + (tour + 1))
              }
            >
              {tour === walkthrough.length - 1 ? 'Start my logbook' : 'Next'}
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete this item?" close={() => setDeleting(null)}>
          <p>
            This removes the selected {deleting.kind}. Undo and 30-day Recent changes remain
            available.
          </p>
          <button onClick={() => setDeleting(null)}>Cancel</button>
          <button
            onClick={async () => {
              if (await write({ type: 'delete', keys: [deleting.kind + ':' + deleting.id] }))
                setDeleting(null);
            }}
          >
            Delete item
          </button>
        </Modal>
      )}
    </>
  );
}
