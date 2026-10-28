import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Root } from 'react-dom/client';
import type {
  Activity,
  Deck,
  Edit,
  Entity,
  Json,
  Preset,
  Task,
} from '../../../packages/domain/src/logbook.ts';
import { loggedMinutes } from '../../../packages/domain/src/logbook.ts';
import {
  calendarSegments,
  dayBlocks,
  interval,
  parseQuick,
  reschedule,
  shiftDate,
  taskClockStatus,
  viewDates,
} from '../../../packages/domain/src/calendar.ts';
import type { View } from '../../../packages/domain/src/calendar.ts';
import { openLogbook } from '../../../packages/persistence/src/logbook.ts';
import type { LogbookStore } from '../../../packages/persistence/src/logbook.ts';
import { createLogbookProjection } from './logbook-store.ts';
import styles from './calendar.module.css';
import logo from '../../../icons/brand-icon.svg';
import { preparePhoto } from '../../../packages/persistence/src/media.ts';
import { browserPhotoCodec } from './photo-codec.ts';

type Projection = Awaited<ReturnType<typeof createLogbookProjection>>;
type Draft = {
  entity?: Activity | Task;
  date: string;
  start: number;
  duration: number;
  title: string;
  deck: string | null;
  more: boolean;
  advanced: boolean;
  best: boolean;
  preset: boolean;
  description: string;
  location: string;
  people: string;
  mood: string;
  must: boolean;
  low: boolean;
  waiting: string;
  voyage: boolean;
  progress: number;
  offsets: boolean;
  startOffset: number;
  endOffset: number;
  photo?: File;
  keepOriginal?: boolean;
  attachments: string[];
};
const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const time = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const minute = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const record = (value: Json | undefined): Record<string, Json> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const snap = (n: number) => Math.round(n / 5) * 5;
function Photos({
  db,
  ids,
  onRemove,
}: {
  db: LogbookStore;
  ids: string[];
  onRemove: (id: string) => void;
}) {
  const [photos, setPhotos] = useState<{ url: string; id: string }[]>([]);
  useEffect(() => {
    let active = true;
    const urls: { url: string; id: string }[] = [];
    void Promise.all(
      ids.map(async (id) => {
        const saved = await db.attachment(id);
        if (
          saved?.blob &&
          ['image/webp', 'image/png', 'image/jpeg', 'image/gif'].includes(saved.blob.type)
        )
          urls.push({ url: URL.createObjectURL(saved.blob), id });
      }),
    )
      .then(() => {
        if (active) setPhotos(urls);
        else urls.forEach((url) => URL.revokeObjectURL(url.url));
      })
      .catch(() => {});
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url.url));
    };
  }, [db, ids]);
  return (
    <div className={styles.photos}>
      {photos.map((url, index) => (
        <div key={url.id}>
          <img src={url.url} alt="Activity attachment" />
          <button
            type="button"
            aria-label={`Remove attachment ${index + 1}`}
            onClick={() => onRemove(url.id)}
          >
            Remove photo
          </button>
        </div>
      ))}
    </div>
  );
}
function Calendar({ projection, db }: { projection: Projection; db: LogbookStore }) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState);
  const [now, setNow] = useState(new Date());
  const migratedSettings = state.entities['settings:legacy'];
  const settings = record(
    migratedSettings?.kind === 'settings' ? record(migratedSettings.value).pf : null,
  );
  const prefs = {
    ...settings,
    ...record(
      state.entities['settings:preferences']?.kind === 'settings'
        ? state.entities['settings:preferences'].value
        : null,
    ),
  };
  const [date, setDate] = useState(localDate());
  const [view, setView] = useState<View>(() =>
    [1, 2, 3, 4, 7].includes(Number(prefs.dv))
      ? (Number(prefs.dv) as View)
      : matchMedia('(min-width: 900px)').matches
        ? 3
        : 1,
  );
  const [zoom, setZoom] = useState(56);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [trash, setTrash] = useState(false);
  const [lastUndo, setLastUndo] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    date: string;
    start: number;
    duration: number;
  } | null>(null);
  const editor = useRef<HTMLFormElement>(null),
    titleInput = useRef<HTMLInputElement>(null),
    scroller = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    pointer: number;
    x: number;
    y: number;
    mode: 'move' | 'start' | 'end';
    entity: Activity | Task;
    date: string;
    start: number;
    duration: number;
    ready: boolean;
    changed: boolean;
    timer: ReturnType<typeof setTimeout>;
    scroll: number;
    segmentDate: string;
    editing: boolean;
    latest?: { date: string; start: number; duration: number };
  } | null>(null);
  const dismissClick = useRef(false);
  const suppressClick = useRef(false),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const decks = Object.values(state.entities).filter((e): e is Deck => e.kind === 'deck');
  const presets = Object.values(state.entities).filter((e): e is Preset => e.kind === 'preset');
  const dates = viewDates(date, view, typeof prefs.ws === 'number' ? prefs.ws : 0);
  const defaultDuration = typeof prefs.dl === 'number' && prefs.dl > 0 ? prefs.dl : 30;
  const clockTime = (m: number) =>
    prefs.h24 === 0
      ? `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m % 1440 < 720 ? 'am' : 'pm'}`
      : time(m);
  const color = (id: string | null) => {
    const c = record(state.entities['deck:' + id]?.legacy).c;
    return typeof c === 'string' && /^#[\da-f]{6}$/i.test(c) ? c : '#226192';
  };
  const clock = now.getHours() * 60 + now.getMinutes();
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    titleInput.current?.focus();
  }, [draft?.entity?.id, !!draft]);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * zoom;
  }, [view]);
  useEffect(() => {
    const scroll = scroller.current;
    if (!scroll) return;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => clamp(z - e.deltaY * 0.1, 32, 140));
      }
    };
    scroll.addEventListener('wheel', wheel, { passive: false });
    return () => scroll.removeEventListener('wheel', wheel);
  }, [view]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (draft || busy) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [draft, busy]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        setDraft(null);
        setPreview(null);
        if (gesture.current) clearTimeout(gesture.current.timer);
        gesture.current = null;
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [busy]);
  const patch = (values: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...values } : null));
  const draftSegments = (() => {
    try {
      return draft ? calendarSegments(draft.date, draft.start, draft.duration, null) : [];
    } catch {
      return [];
    }
  })();
  const quickMatch = (() => {
    try {
      return draft ? parseQuick(draft.title, decks) : null;
    } catch {
      return null;
    }
  })();
  const open = (day: string, start: number, entity?: Activity | Task) => {
    if (busy) return;
    if (draft) {
      setDraft(null);
      return;
    }
    if (!entity && day > localDate()) {
      setStatus('Future dates are added as planned tasks');
    }
    const bounds =
      entity?.kind === 'activity'
        ? interval(entity)
        : {
            date: day,
            start: entity?.time ?? start,
            duration: entity?.duration ?? defaultDuration,
          };
    const legacy = record(entity?.legacy),
      tags = record(legacy.tg);
    setDraft({
      entity,
      date: bounds.date,
      start: bounds.start,
      duration: bounds.duration,
      title: entity?.title ?? '',
      deck: entity?.deck ?? null,
      more: !!entity,
      advanced: false,
      best: Object.values(state.entities).some(
        (e) => e.kind === 'moment' && e.activity === entity?.id && e.featured,
      ),
      preset: false,
      description: String(legacy.desc ?? ''),
      location: String(legacy.loc ?? ''),
      people: String(legacy.ppl ?? ''),
      mood: String(legacy.mood ?? ''),
      must: entity?.kind === 'task' ? entity.must : !!tags.must,
      low: !!(tags.low ?? legacy.low),
      waiting: String(tags.wait ?? legacy.wait ?? ''),
      voyage: !!(tags.voy ?? legacy.voy),
      progress: Number(legacy.pct ?? 0),
      offsets: false,
      startOffset: entity?.kind === 'activity' ? (entity.segments[0]!.offset ?? 0) : 0,
      endOffset:
        entity?.kind === 'activity'
          ? (entity.segments.at(-1)!.endOffset ?? entity.segments.at(-1)!.offset ?? 0)
          : 0,
      attachments: entity?.kind === 'activity' ? entity.attachments : [],
    });
  };
  const commit = async (
    edit: Edit,
    success = 'Saved locally',
    media: { id: string; digest: string; blob: Blob }[] = [],
  ) => {
    setBusy(true);
    setStatus('Saving locally…');
    const id = crypto.randomUUID();
    try {
      await projection.save(
        {
          id,
          at: Date.now(),
          edit: edit.type === 'put' ? { type: 'putMany', entities: [edit.entity] } : edit,
        },
        media,
      );
      setStatus(success);
      setLastUndo(id);
      return true;
    } catch (error) {
      setStatus(
        `Unsaved · ${media.length ? 'Photo storage failed in this browser. ' : ''}${error instanceof Error ? error.message : 'Storage failed'}. Your draft is retained.`,
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!draft || busy) return;
    try {
      const parsed = parseQuick(draft.title, decks);
      if (!parsed.title) throw Error('Add a title');
      const entities: Entity[] = [];
      if (draft.photo) setBusy(true);
      // Review-preview budgets only; physical-device acceptance remains a release gate.
      const photo = draft.photo
        ? await preparePhoto(
            draft.photo,
            !!draft.keepOriginal,
            {
              inputBytes: 8 * 1024 * 1024,
              outputBytes: 1024 * 1024,
              pixels: 16000000,
              longEdge: 2048,
            },
            browserPhotoCodec,
          )
        : null;
      let deck = parsed.deck?.id ?? draft.deck;
      let created = false;
      if (parsed.query && !parsed.deck) {
        deck = crypto.randomUUID();
        created = true;
        entities.push({
          id: deck,
          kind: 'deck',
          name: parsed.query,
          parent: null,
          excludeFromStreak: parsed.query.toLowerCase() === 'time wasted',
          legacy: { c: '#226192', r: Date.now() },
        });
      } else if (deck) {
        const existing = state.entities['deck:' + deck] as Deck;
        entities.push({ ...existing, legacy: { ...record(existing.legacy), r: Date.now() } });
      }
      const duration = parsed.duration ?? draft.duration;
      const future =
        draft.date > localDate() || (draft.date === localDate() && draft.start > clock);
      const kind = draft.entity?.kind ?? (future ? 'task' : 'activity');
      if (photo && kind === 'task')
        throw Error(
          'Photos belong to logged activities. Keep this draft or log it after it happened.',
        );
      const id = draft.entity?.id ?? crypto.randomUUID();
      const legacy = {
        ...record(draft.entity?.legacy),
        desc: draft.description,
        loc: draft.location,
        ppl: draft.people,
        mood: draft.mood,
        tg: { must: draft.must, low: draft.low, wait: draft.waiting || null, voy: draft.voyage },
        pct: draft.progress,
      };
      if (kind === 'activity') {
        const old = draft.entity?.kind === 'activity' ? draft.entity : null;
        const unchanged =
          old &&
          JSON.stringify(interval(old)) ===
            JSON.stringify({ date: draft.date, start: draft.start, duration }) &&
          !draft.offsets;
        const zone = old ? old.zone : Intl.DateTimeFormat().resolvedOptions().timeZone;
        entities.push({
          ...old,
          id,
          kind: 'activity',
          title: parsed.title,
          deck,
          zone,
          segments: unchanged
            ? old.segments
            : calendarSegments(
                draft.date,
                draft.start,
                duration,
                zone,
                draft.offsets ? { start: draft.startOffset, end: draft.endOffset } : undefined,
              ),
          attachments: photo ? [...new Set([...draft.attachments, photo.id])] : draft.attachments,
          legacy,
        });
        const moments = Object.values(state.entities).filter(
          (e) => e.kind === 'moment' && e.activity === id,
        );
        for (const m of moments)
          if (m.kind === 'moment') entities.push({ ...m, featured: draft.best, date: draft.date });
        if (draft.best && !moments.length)
          entities.push({
            kind: 'moment',
            id: crypto.randomUUID(),
            date: draft.date,
            text: parsed.title,
            activity: id,
            featured: true,
          });
      } else {
        const old = draft.entity?.kind === 'task' ? draft.entity : null;
        entities.push({
          ...old,
          id,
          kind: 'task',
          title: parsed.title,
          deck,
          date: draft.date,
          time: draft.start,
          duration,
          status: old?.status ?? 'todo',
          must: draft.must,
          history: old?.history ?? [],
          legacy,
        });
      }
      if (
        await commit(
          { type: 'putMany', entities },
          created
            ? 'Saved locally · New deck created. Organize it in Decks.'
            : kind === 'task'
              ? 'Saved locally · Planned task'
              : 'Saved locally',
          photo ? [photo] : [],
        )
      )
        setDraft(null);
    } catch (error) {
      setBusy(false);
      setStatus(
        `Unsaved · ${error instanceof Error ? error.message : 'Invalid entry'}. Your draft is retained.`,
      );
    }
  };
  const navigate = (next: string) => {
    if (draft) {
      setStatus('Finish or dismiss the active editor before navigating.');
      return;
    }
    setDate(next);
  };
  const step = (direction: number) => {
    if (view !== 'month') return navigate(shiftDate(date, direction * view));
    const next = new Date(date.slice(0, 8) + '01T12:00Z');
    next.setUTCMonth(next.getUTCMonth() + direction);
    navigate(next.toISOString().slice(0, 10));
  };
  const beginGesture = (
    e: React.PointerEvent,
    entity: Activity | Task,
    mode: 'move' | 'start' | 'end',
    editing = false,
  ) => {
    if (busy || (draft && !editing) || e.button !== 0) return;
    suppressClick.current = false;
    const bounds =
      entity.kind === 'activity'
        ? interval(entity)
        : { date: entity.date, start: entity.time!, duration: entity.duration ?? 60 };
    const g = {
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      mode,
      entity,
      ...bounds,
      ready: e.pointerType === 'mouse',
      changed: false,
      timer: setTimeout(() => {
        if (gesture.current === g) {
          g.ready = true;
          setStatus('Drag to move; use the edges to resize.');
        }
      }, 350),
      scroll: scroller.current?.scrollTop ?? 0,
      segmentDate: e.currentTarget.getAttribute('data-segment-date') ?? bounds.date,
      editing,
    };
    if (editing && draft) {
      g.date = draft.date;
      g.start = draft.start;
      g.duration = draft.duration;
    }
    gesture.current = g;
    if (e.nativeEvent.isTrusted) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setZoom(
        clamp(
          (pinch.current.zoom * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / pinch.current.distance,
          32,
          140,
        ),
      );
      return;
    }
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId) return;
    const distance = Math.hypot(e.clientX - g.x, e.clientY - g.y);
    if (!g.ready) {
      if (distance > 8) {
        clearTimeout(g.timer);
        gesture.current = null;
      }
      return;
    }
    if (distance < 5 && !g.changed) return;
    e.preventDefault();
    g.changed = true;
    suppressClick.current = true;
    const scroll = scroller.current;
    if (scroll) {
      const rect = scroll.getBoundingClientRect();
      if (e.clientY < rect.top + 45) scroll.scrollTop -= 12;
      else if (e.clientY > rect.bottom - 45) scroll.scrollTop += 12;
    }
    const delta = snap(((e.clientY - g.y + (scroll?.scrollTop ?? 0) - g.scroll) * 60) / zoom);
    let nextDate = g.date,
      start = g.start,
      duration = g.duration;
    if (g.mode === 'move') {
      const columns = [...document.querySelectorAll<HTMLElement>('[data-calendar-day]')];
      const target = columns.find((c) => {
        const r = c.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX < r.right;
      });
      if (target) {
        const selected = target.dataset.calendarDay!;
        const segmentDay = g.segmentDate;
        nextDate = shiftDate(
          g.date,
          Math.round((Date.parse(selected) - Date.parse(segmentDay)) / 86400000),
        );
      }
      start = clamp(g.start + delta, 0, 1435);
    } else if (g.mode === 'end') duration = clamp(g.duration + delta, 5, 1440);
    else {
      const end = g.start + g.duration;
      start = clamp(g.start + delta, Math.max(0, end - 1440), Math.min(1435, end - 5));
      duration = end - start;
    }
    g.latest = { date: nextDate, start, duration };
    if (g.editing) patch({ date: nextDate, start, duration });
    else setPreview({ id: g.entity.id, date: nextDate, start, duration });
  };
  const endGesture = async (cancel = false) => {
    const g = gesture.current;
    if (g) clearTimeout(g.timer);
    gesture.current = null;
    pointers.current.clear();
    pinch.current = null;
    if (!g || cancel) {
      if (g?.editing) patch({ date: g.date, start: g.start, duration: g.duration });
      setPreview(null);
      return;
    }
    if (g.changed && g.latest && !g.editing) {
      try {
        await commit({
          type: 'put',
          entity: reschedule(g.entity, g.latest.date, g.latest.start, g.latest.duration),
        });
      } catch (error) {
        setStatus(`Unsaved · ${error instanceof Error ? error.message : 'Invalid move'}`);
      }
    }
    setPreview(null);
  };
  const changeView = (value: View) => {
    if (draft) {
      setStatus('Finish or dismiss the active editor before changing views.');
      return;
    }
    setView(value);
  };
  const undo = (id: string) => commit({ type: 'restore', deletion: id }, 'Restored locally');
  const displayState = preview
    ? {
        ...state,
        entities: {
          ...state.entities,
          [`${state.entities['activity:' + preview.id] ? 'activity' : 'task'}:${preview.id}`]:
            (() => {
              const e =
                state.entities['activity:' + preview.id] ?? state.entities['task:' + preview.id];
              try {
                return reschedule(
                  e as Activity | Task,
                  preview.date,
                  preview.start,
                  preview.duration,
                );
              } catch {
                return e!;
              }
            })(),
        },
      }
    : state;
  return (
    <main
      className={styles.calendar}
      onPointerDownCapture={(e) => {
        if (
          draft &&
          !editor.current?.contains(e.target as Node) &&
          !(e.target as HTMLElement).closest('[data-draft-edge]')
        ) {
          dismissClick.current = true;
          e.preventDefault();
          e.stopPropagation();
          if (!busy) setDraft(null);
        }
      }}
      onClickCapture={(e) => {
        if (dismissClick.current) {
          dismissClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <aside className={styles.sidebar}>
        <img src={logo} width="44" height="44" alt="Sailor Logbook" />
        <h2>Logbook</h2>
        <p>Calendar</p>
        <details>
          <summary>Decks</summary>
          {decks.map((d) => (
            <p key={d.id} style={{ paddingLeft: d.parent ? 16 : 0 }}>
              {d.name}
            </p>
          ))}
        </details>
        <details>
          <summary>Presets</summary>
          {presets.map((p) => (
            <p key={p.id}>{p.title}</p>
          ))}
        </details>
        <small>Phase 3 review</small>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.toolbar}>
          <img className={styles.mobileLogo} src={logo} alt="Sailor Logbook" width="32" />
          <h1>
            {new Date(date + 'T12:00').toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </h1>
          <button onClick={() => navigate(localDate())}>Today</button>
          <input
            aria-label="Calendar date"
            type="date"
            value={date}
            onChange={(e) => navigate(e.target.value || date)}
          />
          <button aria-label="Previous" onClick={() => step(-1)}>
            ‹
          </button>
          <button aria-label="Next" onClick={() => step(1)}>
            ›
          </button>
        </header>
        <div className={styles.controls}>
          <div role="group" aria-label="Calendar view">
            {([1, 2, 3, 4, 7, 'month'] as View[]).map((v) => (
              <button
                className={v === 2 || v === 4 ? styles.mobileView : ''}
                aria-pressed={v === view}
                key={v}
                onClick={() => changeView(v)}
              >
                {v === 'month' ? 'Month' : v === 1 ? 'Day' : v === 7 ? 'Week' : `${v} days`}
              </button>
            ))}
          </div>
          <label>
            Zoom
            <input
              aria-label="Calendar zoom"
              type="range"
              min="32"
              max="140"
              value={zoom}
              onChange={(e) => setZoom(+e.target.value)}
            />
          </label>
          <button onClick={() => open(date, clamp(snap(clock - defaultDuration), 0, 1435))}>
            Quick log
          </button>
          <button onClick={() => setTrash(!trash)}>Recently deleted</button>
        </div>
        <p className={styles.status} role="status">
          {status}
        </p>
        {lastUndo && state.trash[lastUndo] && (
          <button disabled={busy} onClick={() => void undo(lastUndo)}>
            Undo last change
          </button>
        )}
        {trash && (
          <section className={styles.trash}>
            <h2>Recently deleted / changed · 30 days</h2>
            {Object.values(state.trash)
              .filter((t) => t.expiresAt > Date.now())
              .map((t) => (
                <div key={t.command}>
                  {Object.values(t.before)
                    .filter(Boolean)
                    .map((e) =>
                      e && 'title' in e ? e.title : e && 'name' in e ? e.name : 'Calendar change',
                    )
                    .join(', ') || 'Calendar change'}{' '}
                  <button disabled={busy} onClick={() => void undo(t.command)}>
                    Restore
                  </button>
                </div>
              ))}
          </section>
        )}
        {view === 'month' ? (
          <div className={styles.month}>
            {dates.map((day) => (
              <button
                key={day}
                aria-label={`Open ${day}`}
                onClick={() => {
                  navigate(day);
                  changeView(1);
                }}
              >
                <b>{Number(day.slice(-2))}</b>
                <small>{loggedMinutes(state, day)} min</small>
                {dayBlocks(state, day)
                  .slice(0, 4)
                  .map((b) => (
                    <span
                      key={b.entity.id}
                      style={{ borderLeft: `3px solid ${color(b.entity.deck)}` }}
                    >
                      {b.entity.title}
                    </span>
                  ))}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div
              className={styles.dayHeaders}
              style={{ gridTemplateColumns: `44px repeat(${dates.length},minmax(0,1fr))` }}
            >
              <span />
              {dates.map((day) => (
                <div key={day}>
                  <b>
                    {new Date(day + 'T12:00').toLocaleDateString('en', {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                  </b>
                  <small>{loggedMinutes(state, day)} min logged</small>
                </div>
              ))}
            </div>
            <div
              className={styles.scroll}
              ref={scroller}
              onPointerMove={pointerMove}
              onPointerUp={() => void endGesture()}
              onPointerCancel={() => void endGesture(true)}
              onPointerDown={(e) => {
                pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (pointers.current.size === 2) {
                  if (gesture.current) clearTimeout(gesture.current.timer);
                  gesture.current = null;
                  const [a, b] = [...pointers.current.values()];
                  pinch.current = { distance: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom };
                }
              }}
            >
              <div
                className={styles.grid}
                style={{
                  height: 24 * zoom,
                  gridTemplateColumns: `44px repeat(${dates.length},minmax(0,1fr))`,
                }}
              >
                <div className={styles.hours}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <small key={i} style={{ top: i * zoom }}>
                      {clockTime(i * 60)}
                    </small>
                  ))}
                </div>
                {dates.map((day) => (
                  <div
                    key={day}
                    data-calendar-day={day}
                    className={styles.day}
                    style={{ backgroundSize: `100% ${zoom}px` }}
                    onClick={(e) => {
                      if (suppressClick.current || busy) {
                        suppressClick.current = false;
                        return;
                      }
                      const r = e.currentTarget.getBoundingClientRect();
                      open(day, clamp(snap(((e.clientY - r.top) * 60) / zoom), 0, 1435));
                    }}
                  >
                    {dayBlocks(displayState, day).map((b) => {
                      const entity = b.entity;
                      const task = entity.kind === 'task';
                      return (
                        <div
                          key={entity.id + ':' + b.segment}
                          role="button"
                          tabIndex={0}
                          aria-label={`${entity.title} · ${day} ${clockTime(b.start)}–${clockTime(b.end)}${task ? ' · ' + taskClockStatus(entity, localDate(now), clock) : ''}`}
                          data-testid="calendar-block"
                          data-entity-id={entity.id}
                          data-segment-date={day}
                          className={`${styles.block} ${task ? styles.planned : ''}`}
                          style={{
                            top: (b.start * zoom) / 60,
                            height: Math.max(22, ((b.end - b.start) * zoom) / 60),
                            left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                            width: `calc(${100 / b.lanes}% - 4px)`,
                            backgroundColor: task ? '#1c2832' : color(entity.deck),
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!suppressClick.current) open(day, b.start, entity);
                            else suppressClick.current = false;
                          }}
                          onPointerDown={(e) =>
                            beginGesture(
                              e,
                              entity,
                              (e.target as HTMLElement).dataset.edge === 'start'
                                ? 'start'
                                : (e.target as HTMLElement).dataset.edge === 'end'
                                  ? 'end'
                                  : 'move',
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              open(day, b.start, entity);
                            } else if (
                              e.altKey &&
                              ['ArrowUp', 'ArrowDown'].includes(e.key) &&
                              !busy &&
                              !draft
                            ) {
                              e.preventDefault();
                              const bounds =
                                entity.kind === 'activity'
                                  ? interval(entity)
                                  : {
                                      date: entity.date,
                                      start: entity.time!,
                                      duration: entity.duration ?? 60,
                                    };
                              try {
                                void commit({
                                  type: 'put',
                                  entity: reschedule(
                                    entity,
                                    bounds.date,
                                    e.shiftKey
                                      ? bounds.start
                                      : clamp(
                                          bounds.start + (e.key === 'ArrowUp' ? -5 : 5),
                                          0,
                                          1435,
                                        ),
                                    e.shiftKey
                                      ? clamp(
                                          bounds.duration + (e.key === 'ArrowUp' ? -5 : 5),
                                          5,
                                          1440,
                                        )
                                      : bounds.duration,
                                  ),
                                });
                              } catch (error) {
                                setStatus(String(error));
                              }
                            }
                          }}
                        >
                          {(entity.kind !== 'activity' || b.segment === 0) && (
                            <span
                              className={styles.edgeStart}
                              data-edge="start"
                              aria-hidden="true"
                            />
                          )}
                          {Object.values(state.entities).some(
                            (e) => e.kind === 'moment' && e.activity === entity.id && e.featured,
                          )
                            ? '☆ '
                            : ''}
                          {entity.title}
                          <small>
                            {clockTime(b.start)}–{clockTime(b.end)}
                            {task ? ` · ${taskClockStatus(entity, localDate(now), clock)}` : ''}
                          </small>
                          {(entity.kind !== 'activity' ||
                            b.segment === entity.segments.length - 1) && (
                            <span className={styles.edgeEnd} data-edge="end" aria-hidden="true" />
                          )}
                        </div>
                      );
                    })}
                    {draft &&
                      draftSegments
                        .filter((segment) => segment.date === day)
                        .map((segment) => (
                          <div
                            key={segment.date}
                            className={styles.ghost}
                            style={{
                              top: (segment.start * zoom) / 60,
                              height: ((segment.end - segment.start) * zoom) / 60,
                            }}
                          >
                            {draft.title || 'New entry'}
                            {(['start', 'end'] as const)
                              .filter((edge) =>
                                edge === 'start'
                                  ? segment === draftSegments[0]
                                  : segment === draftSegments.at(-1),
                              )
                              .map((edge) => (
                                <span
                                  key={edge}
                                  data-draft-edge={edge}
                                  data-segment-date={segment.date}
                                  className={edge === 'start' ? styles.edgeStart : styles.edgeEnd}
                                  onPointerDown={(e) =>
                                    beginGesture(
                                      e,
                                      draft.entity ?? {
                                        kind: 'activity',
                                        id: 'draft',
                                        title: draft.title,
                                        deck: null,
                                        zone: null,
                                        segments: calendarSegments(
                                          draft.date,
                                          draft.start,
                                          draft.duration,
                                          null,
                                        ),
                                        attachments: [],
                                      },
                                      edge,
                                      true,
                                    )
                                  }
                                />
                              ))}
                          </div>
                        ))}
                    {day === localDate(now) && (
                      <div className={styles.now} style={{ top: (clock * zoom) / 60 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      {draft && (
        <form
          ref={editor}
          className={`${styles.editor} ${draft.more ? styles.expanded : ''}`}
          aria-label={draft.more ? 'Entry editor' : 'Quick add'}
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className={styles.editorTitle}>
              <input
                ref={titleInput}
                aria-label="Activity title"
                placeholder="Read Book +lea t45"
                value={draft.title}
                onChange={(e) => {
                  patch({ title: e.target.value });
                  try {
                    const p = parseQuick(e.target.value, decks);
                    if (p.duration) patch({ duration: p.duration });
                  } catch {
                    /* Report validation when saving. */
                  }
                }}
              />
              {draft.more && draft.entity?.kind !== 'task' && (
                <button
                  type="button"
                  aria-label="Best thing"
                  aria-pressed={draft.best}
                  onClick={() => patch({ best: !draft.best })}
                >
                  ☆
                </button>
              )}
              <button
                type="button"
                aria-label="Close editor"
                disabled={busy}
                onClick={() => setDraft(null)}
              >
                ×
              </button>
            </div>
            {quickMatch?.query !== null && quickMatch && (
              <small>{quickMatch.deck?.name ?? `New deck: ${quickMatch.query}`}</small>
            )}
            <div className={styles.chips}>
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() =>
                    patch({
                      title: p.title,
                      deck: p.deck,
                      duration: p.duration || draft.duration,
                      preset: true,
                    })
                  }
                >
                  {p.title}
                </button>
              ))}
            </div>
            {!draft.more ? (
              <div className={styles.editorActions}>
                <small>
                  {draft.date} · {time(draft.start)} · {draft.duration} min
                </small>
                <button type="button" onClick={() => patch({ more: true })}>
                  More Options
                </button>
                {draft.preset && <button disabled={busy}>Done</button>}
              </div>
            ) : (
              <>
                <label>
                  Deck
                  <select
                    value={draft.deck ?? ''}
                    onChange={(e) => patch({ deck: e.target.value || null })}
                  >
                    <option value="">No deck</option>
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={styles.fields}>
                  <label>
                    Date
                    <input
                      type="date"
                      required
                      value={draft.date}
                      onChange={(e) => patch({ date: e.target.value })}
                    />
                  </label>
                  <label>
                    Time
                    <input
                      type="time"
                      required
                      step="300"
                      value={time(draft.start)}
                      onChange={(e) => patch({ start: minute(e.target.value) })}
                    />
                  </label>
                  <label>
                    Minutes
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      required
                      value={draft.duration}
                      onChange={(e) => patch({ duration: +e.target.value })}
                    />
                  </label>
                </div>
                {draft.entity?.kind === 'task' && (
                  <label>
                    Task status
                    <select
                      value={draft.entity.status}
                      onChange={(e) =>
                        patch({
                          entity: {
                            ...(draft.entity as Task),
                            status: e.target.value as Task['status'],
                            legacy: { ...record(draft.entity?.legacy), man: true },
                          },
                        })
                      }
                    >
                      {['todo', 'doing', 'stuck', 'done', 'skip', 'nogo'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className={styles.chips}>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.must}
                      onChange={(e) => patch({ must: e.target.checked })}
                    />
                    Must-do
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.low}
                      onChange={(e) => patch({ low: e.target.checked })}
                    />
                    Low energy
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.voyage}
                      onChange={(e) => patch({ voyage: e.target.checked })}
                    />
                    Voyage
                  </label>
                </div>
                <button type="button" onClick={() => patch({ advanced: !draft.advanced })}>
                  More Options
                </button>
                {draft.advanced && (
                  <div>
                    <label>
                      Description
                      <textarea
                        value={draft.description}
                        onChange={(e) => patch({ description: e.target.value })}
                      />
                    </label>
                    {draft.entity?.kind !== 'task' && (
                      <label>
                        Photo
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(e) =>
                            patch({ photo: e.target.files?.[0], keepOriginal: false })
                          }
                        />
                      </label>
                    )}
                    {draft.photo && (
                      <>
                        <small>
                          Estimated original: {(draft.photo.size / 1024).toFixed(0)} KiB. WebP by
                          default, up to 2048px / 1 MiB in this review.
                        </small>
                        <label>
                          <input
                            type="checkbox"
                            checked={!!draft.keepOriginal}
                            onChange={(e) => patch({ keepOriginal: e.target.checked })}
                          />
                          Keep original — uses more device/Dropbox storage and transfer data.
                        </label>
                      </>
                    )}
                    {draft.entity?.kind === 'activity' && (
                      <small>
                        {draft.entity.attachments.length} existing attachment(s) retained
                        <Photos
                          db={db}
                          ids={draft.attachments}
                          onRemove={(id) =>
                            patch({
                              attachments: draft.attachments.filter((existing) => existing !== id),
                            })
                          }
                        />
                      </small>
                    )}
                    <label>
                      Location
                      <input
                        value={draft.location}
                        onChange={(e) => patch({ location: e.target.value })}
                      />
                    </label>
                    <label>
                      People
                      <input
                        value={draft.people}
                        onChange={(e) => patch({ people: e.target.value })}
                      />
                    </label>
                    <label>
                      Mood
                      <select value={draft.mood} onChange={(e) => patch({ mood: e.target.value })}>
                        <option value="">None</option>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {['Very low', 'Low', 'Okay', 'Good', 'Great'][n]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Waiting on
                      <input
                        value={draft.waiting}
                        onChange={(e) => patch({ waiting: e.target.value })}
                      />
                    </label>
                    {draft.voyage && (
                      <label>
                        Progress
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={draft.progress}
                          onChange={(e) => patch({ progress: +e.target.value })}
                        />
                      </label>
                    )}
                    <p>
                      Time zone:{' '}
                      {draft.entity?.kind === 'activity'
                        ? (draft.entity.zone ?? 'Unknown original context')
                        : Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.offsets}
                        onChange={(e) => patch({ offsets: e.target.checked })}
                      />
                      Set explicit UTC offsets (minutes east of UTC)
                    </label>
                    {draft.offsets && (
                      <div className={styles.fields}>
                        <label>
                          Start offset
                          <input
                            type="number"
                            min="-1440"
                            max="1440"
                            value={draft.startOffset}
                            onChange={(e) => patch({ startOffset: +e.target.value })}
                          />
                        </label>
                        <label>
                          End offset
                          <input
                            type="number"
                            min="-1440"
                            max="1440"
                            value={draft.endOffset}
                            onChange={(e) => patch({ endOffset: +e.target.value })}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.editorActions}>
                  <button
                    type="button"
                    disabled={busy || !draft.title.trim()}
                    onClick={async () => {
                      try {
                        const parsed = parseQuick(draft.title, decks);
                        if (!parsed.title) return;
                        await commit(
                          {
                            type: 'putMany',
                            entities: [
                              {
                                kind: 'preset',
                                id: crypto.randomUUID(),
                                title: parsed.title,
                                deck: parsed.deck?.id ?? draft.deck,
                                duration: parsed.duration ?? draft.duration,
                              },
                            ],
                          },
                          'Preset saved locally',
                        );
                      } catch (error) {
                        setStatus(String(error));
                      }
                    }}
                  >
                    Save as preset
                  </button>
                  {draft.entity && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await commit(
                            { type: 'delete', keys: [draft.entity!.kind + ':' + draft.entity!.id] },
                            'Deleted locally · Undo available for 30 days',
                          )
                        )
                          setDraft(null);
                      }}
                    >
                      Delete
                    </button>
                  )}
                  <button disabled={busy}>Done</button>
                </div>
              </>
            )}
          </fieldset>
        </form>
      )}
    </main>
  );
}
export async function startCalendar(root: Root) {
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
      const projection = await createLogbookProjection(db, () => {
        /* Phase 9 supplies verified transport. */
      });
      root.render(<Calendar projection={projection} db={db} />);
      await new Promise<void>(() => {});
    } catch {
      message('Storage validation failed. Existing data is retained; export/recovery is required.');
    }
  });
}
