import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Root } from 'react-dom/client';
import type { Edit, Task } from '../../../packages/domain/src/logbook.ts';
import { loggedMinutes, wallDate } from '../../../packages/domain/src/logbook.ts';
import { parseQuick, shiftDate, taskClockStatus } from '../../../packages/domain/src/calendar.ts';
import type { Deck } from '../../../packages/domain/src/logbook.ts';
import { object } from '../../../packages/domain/src/notebook.ts';
import {
  moveTask,
  plannerDates,
  reviewTask,
  saveTask,
  statusLabels,
  taskDraft,
  taskFlags,
  taskHistory,
  tasks,
  unresolved,
} from '../../../packages/domain/src/planner.ts';
import type { TaskDraft } from '../../../packages/domain/src/planner.ts';
import { openLogbook } from '../../../packages/persistence/src/logbook.ts';
import { createLogbookProjection } from './logbook-store.ts';
import logo from '../../../icons/brand-icon.svg';
import styles from './planner.module.css';
import { GlobalTools, ManagementMenus } from './management-ui.tsx';
import { settings } from '../../../packages/domain/src/management.ts';

type Projection = Awaited<ReturnType<typeof createLogbookProjection>>;
const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const timeText = (m: number | null) =>
  m === null
    ? ''
    : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const minute = (v: string) => (v ? Number(v.slice(0, 2)) * 60 + Number(v.slice(3)) : null);
const dateText = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div className={styles.overlay}>
      <div
        ref={ref}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            close();
          }
          if (e.key === 'Tab') {
            const nodes = ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]',
            );
            if (!nodes?.length) return;
            const first = nodes[0]!,
              last = nodes[nodes.length - 1]!;
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              last.focus();
            } else if (
              !e.shiftKey &&
              (document.activeElement === last || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Close dialog" onClick={close}>
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function Planner({ projection }: { projection: Projection }) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState);
  const clockLabel = (minutes: number) =>
    settings(state).h24 === 0
      ? `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${minutes < 720 ? 'AM' : 'PM'}`
      : timeText(minutes);
  const [clock, setClock] = useState(() => new Date());
  const today = localDate(clock),
    now = clock.getHours() * 60 + clock.getMinutes();
  const [anchor, setAnchor] = useState(() => {
    const d = new URLSearchParams(location.search).get('date');
    try {
      wallDate(d!);
      return d!;
    } catch {
      return localDate();
    }
  });
  const [draft, setDraft] = useState<TaskDraft | null>(null),
    [review, setReview] = useState<Task | null>(null),
    [target, setTarget] = useState(today),
    [rollTime, setRollTime] = useState(''),
    [choice, setChoice] = useState<'rollover' | 'skip' | 'nogo'>('rollover'),
    [recovery, setRecovery] = useState(false),
    [schedule, setSchedule] = useState(false),
    [filter, setFilter] = useState('all'),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState('Ready · saved on this device'),
    [undo, setUndo] = useState<string | null>(null),
    [dragId, setDragId] = useState<string | null>(null),
    [drop, setDrop] = useState<string | null>(null);
  const saving = useRef(false),
    board = useRef<HTMLDivElement>(null),
    initial = useRef(true);
  const drag = useRef<{
    id: string;
    pointer: number;
    x: number;
    y: number;
    active: boolean;
    timer: ReturnType<typeof setTimeout> | null;
    target: { date: string; time?: number } | null;
  } | null>(null);
  const all = tasks(state),
    dates = plannerDates(anchor),
    past = unresolved(state, today),
    decks = Object.values(state.entities).filter((e): e is Deck => e.kind === 'deck');
  const blocked = busy || !!draft || !!review || recovery || !!dragId;
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (initial.current) {
      const container = board.current;
      const column = container?.querySelector<HTMLElement>(`[data-day="${anchor}"]`);
      if (container && column) container.scrollLeft = column.offsetLeft - container.offsetLeft;
      initial.current = false;
    }
  }, [anchor]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (draft || review || saving.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft, review]);
  const cancelDrag = () => {
    if (drag.current?.timer) clearTimeout(drag.current.timer);
    drag.current = null;
    setDragId(null);
    setDrop(null);
  };
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };
    window.addEventListener('keydown', cancel);
    return () => {
      window.removeEventListener('keydown', cancel);
      if (drag.current?.timer) clearTimeout(drag.current.timer);
    };
  }, []);
  async function save(edit: Edit, message = 'Saved locally') {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setStatus('Saving locally…');
    try {
      const id = crypto.randomUUID();
      await projection.save({ id, at: Date.now(), edit });
      setUndo(edit.type === 'restore' ? null : id);
      setStatus(message);
      return true;
    } catch (e) {
      setStatus(
        `Unsaved · ${e instanceof Error ? e.message : 'Storage failed'}. Your draft is retained; retry.`,
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const openTask = (t?: Task, date = anchor) => {
    if (blocked) return;
    setDraft(
      t
        ? taskDraft(t)
        : {
            id: crypto.randomUUID(),
            title: '',
            date,
            deck: null,
            time: null,
            duration: 60,
            must: false,
            wait: null,
            low: false,
            voyage: false,
            progress: 0,
            status: 'todo',
            manual: false,
          },
    );
  };
  const launchHandled = useRef(false);
  useEffect(() => {
    if (launchHandled.current) return;
    launchHandled.current = true;
    const params = new URLSearchParams(location.search),
      id = params.get('item'),
      task = id ? state.entities['task:' + id] : null;
    if (task?.kind === 'task') openTask(task);
    else if (params.get('new') === 'task') openTask();
  }, []);
  const close = () => {
    if (!saving.current) {
      setDraft(null);
      setReview(null);
      setRecovery(false);
    }
  };
  const navigate = (phase: string) => {
    if (!blocked) location.href = `/?phase=${phase}&date=${encodeURIComponent(anchor)}`;
  };
  const changeDate = (date: string) => {
    if (blocked) return;
    try {
      wallDate(date);
      setAnchor(date);
      initial.current = true;
    } catch {
      setStatus('Choose a valid date');
    }
  };
  const beginReview = (t: Task) => {
    if (blocked) return;
    setReview(t);
    setChoice('rollover');
    setTarget(today > t.date ? today : shiftDate(t.date, 1));
    setRollTime('');
  };
  const performMove = async (t: Task, date: string, time = t.time) => {
    try {
      await save(moveTask(t, date, Date.now(), time), 'Saved locally · Task moved');
    } catch (e) {
      setStatus((e as Error).message);
    }
  };
  function pointerStart(e: React.PointerEvent<HTMLButtonElement>, t: Task) {
    if (blocked || drag.current || e.button !== 0) return;
    const d = {
      id: t.id,
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      active: e.pointerType === 'mouse',
      timer: null as ReturnType<typeof setTimeout> | null,
      target: null as { date: string; time?: number } | null,
    };
    drag.current = d;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (d.active) setDragId(t.id);
    else
      d.timer = setTimeout(() => {
        if (drag.current === d) {
          d.active = true;
          setDragId(t.id);
        }
      }, 350);
  }
  function point(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) cancelDrag();
      return;
    }
    const hit = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-drop-date]');
    d.target = hit
      ? {
          date: hit.dataset.dropDate!,
          ...(hit.dataset.dropMinute !== undefined ? { time: Number(hit.dataset.dropMinute) } : {}),
        }
      : null;
    setDrop(hit ? `${hit.dataset.dropDate}/${hit.dataset.dropMinute ?? ''}` : null);
    const b = board.current;
    if (b) {
      const r = b.getBoundingClientRect();
      if (e.clientX > r.right - 44) b.scrollLeft += 28;
      if (e.clientX < r.left + 44) b.scrollLeft -= 28;
    }
    const dock = hit?.closest<HTMLElement>('[data-schedule]');
    if (dock) {
      const r = dock.getBoundingClientRect();
      if (e.clientY > r.bottom - 45) dock.scrollTop += 28;
      if (e.clientY < r.top + 45) dock.scrollTop -= 28;
    }
  }
  function pointerEnd(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    point(e);
    const target = d.target,
      active = d.active,
      t = all.find((t) => t.id === d.id);
    cancelDrag();
    if (
      active &&
      target &&
      t &&
      (target.date !== t.date || (target.time !== undefined && target.time !== t.time))
    )
      void performMove(t, target.date, target.time === undefined ? t.time : target.time);
  }
  const matches = (t: Task) =>
    filter === 'all' ||
    (filter === 'must'
      ? t.must
      : filter === 'wait'
        ? taskFlags(t).wait !== null
        : filter === 'low'
          ? taskFlags(t).low
          : filter === 'voy'
            ? taskFlags(t).voyage
            : ['skip', 'nogo'].includes(t.status));
  const taskCard = (t: Task) => {
    const f = taskFlags(t),
      shown = taskClockStatus(t, today, now),
      deck = decks.find((d) => d.id === t.deck),
      c = object(deck?.legacy).c;
    return (
      <article
        key={t.id}
        data-task={t.id}
        data-logbook-kind="task"
        data-logbook-id={t.id}
        tabIndex={0}
        className={`${styles.task} ${t.must ? styles.must : ''} ${shown === 'done' ? styles.done : ''} ${dragId === t.id ? styles.dragging : ''}`}
        style={{ borderRightColor: typeof c === 'string' ? c : 'transparent' }}
      >
        <div className={styles.taskTop}>
          <button
            data-edit-item
            className={styles.taskTitle}
            disabled={blocked}
            onClick={() => openTask(t)}
          >
            {t.title}
          </button>
          <button
            className={styles.handle}
            disabled={busy || !!draft || !!review || recovery}
            aria-label={`Move ${t.title}`}
            title="Drag to another day or a Calendar time; Escape cancels"
            onPointerDown={(e) => pointerStart(e, t)}
            onPointerMove={point}
            onPointerUp={pointerEnd}
            onPointerCancel={cancelDrag}
            onLostPointerCapture={cancelDrag}
          >
            ⠿
          </button>
        </div>
        <small>
          {t.time === null ? 'Untimed' : clockLabel(t.time)}
          {t.duration !== null ? ` · ${t.duration} min` : ''}
          {deck ? ` · ${deck.name}` : ''}
        </small>
        <span className={styles.status}>
          {statusLabels[shown]}
          {!f.manual && t.time !== null && t.status === 'todo' ? ' · by clock' : ''}
        </span>
        <div className={styles.tags}>
          {t.must && <span>Must-do</span>}
          {f.low && <span>Low energy</span>}
          {f.wait !== null && <span>Waiting on{f.wait ? ` ${f.wait}` : ''}</span>}
        </div>
        {f.voyage && (
          <div className={styles.voyage}>
            <small>Voyage · {f.progress}%</small>
            <progress aria-label={`${t.title} Voyage progress`} max={100} value={f.progress} />
          </div>
        )}
        <div className={styles.taskActions}>
          <button disabled={blocked} onClick={() => openTask(t)}>
            Edit / move
          </button>
          {['todo', 'doing', 'stuck'].includes(t.status) && (
            <button disabled={blocked} onClick={() => beginReview(t)}>
              Review
            </button>
          )}
        </div>
      </article>
    );
  };
  let quick: ReturnType<typeof parseQuick> | null = null;
  try {
    if (draft) quick = parseQuick(draft.title, decks);
  } catch {
    /* Validation is shown on save. */
  }
  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <img src={logo} alt="Sailor Logbook" />
        <strong>Sailor Logbook</strong>
        <nav aria-label="Workspace">
          {[
            ['5', 'Home'],
            ['3', 'Calendar'],
            ['6', 'Planner'],
            ['4', 'Notebook'],
          ].map(([p, label]) => (
            <button
              key={p}
              aria-current={p === '6' ? 'page' : undefined}
              disabled={blocked || p === '6'}
              onClick={() => navigate(p!)}
            >
              {label}
            </button>
          ))}
        </nav>
        <small>A little direction for your day.</small>
        <ManagementMenus projection={projection} blocked={busy || blocked} />
      </aside>
      <div className={styles.workspace}>
        <GlobalTools
          projection={projection}
          blocked={blocked}
          action={(name) => {
            if (name === 'new-task') {
              openTask();
              return true;
            }
            if (name === 'today') {
              changeDate(today);
              return true;
            }
            return false;
          }}
        />
        <header className={styles.toolbar}>
          <div>
            <small>{dateText(today)}</small>
            <h1>Plan your day</h1>
          </div>
          <button disabled={blocked} onClick={() => setRecovery(true)}>
            Recent changes
          </button>
        </header>
        <div className={styles.controls}>
          <button
            aria-label="Previous week"
            disabled={blocked}
            onClick={() => changeDate(shiftDate(anchor, -7))}
          >
            ‹
          </button>
          <label>
            Planner date
            <input
              type="date"
              aria-label="Planner date"
              value={anchor}
              disabled={blocked}
              onChange={(e) => changeDate(e.target.value)}
            />
          </label>
          <button
            aria-label="Next week"
            disabled={blocked}
            onClick={() => changeDate(shiftDate(anchor, 7))}
          >
            ›
          </button>
          <button disabled={blocked} onClick={() => changeDate(today)}>
            Today
          </button>
          <button disabled={blocked} aria-pressed={schedule} onClick={() => setSchedule(!schedule)}>
            Schedule on Calendar
          </button>
          <label>
            Show
            <select
              aria-label="Task filter"
              value={filter}
              disabled={blocked}
              onChange={(e) => setFilter(e.target.value)}
            >
              {[
                ['all', 'All tasks'],
                ['must', 'Must-do'],
                ['wait', 'Waiting on'],
                ['low', 'Low energy'],
                ['voy', 'Voyage'],
                ['history', 'Skipped / not doing'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.feedback}>
          <span role="status">{status}</span>
          {undo && (
            <button
              disabled={blocked}
              onClick={() =>
                void save({ type: 'restore', deletion: undo }, 'Saved locally · Change undone')
              }
            >
              Undo
            </button>
          )}
          <small>
            {loggedMinutes(state, anchor)} min logged on {anchor}. Planned time is separate.
          </small>
        </div>
        {!!past.length && (
          <details className={styles.reviewPanel}>
            <summary>
              {past.length} unresolved past {past.length === 1 ? 'task' : 'tasks'} · review when
              ready
            </summary>
            <p>
              These plans remain on their original days. Choose a new day, skip, or leave them
              planned. Clock completion does not confirm work was logged.
            </p>
            {past.map((t) => (
              <div className={styles.reviewRow} key={t.id}>
                <span>
                  {t.title}
                  <small>
                    {t.date} · {statusLabels[t.status]}
                  </small>
                </span>
                <button disabled={blocked} onClick={() => beginReview(t)}>
                  Review {t.title}
                </button>
              </div>
            ))}
          </details>
        )}
        <div className={styles.planning}>
          <div ref={board} className={styles.board} aria-label="Planner day columns">
            {dates.map((date) => (
              <section
                key={date}
                data-day={date}
                data-drop-date={date}
                className={`${styles.column} ${date < today ? styles.past : ''} ${drop === date + '/' ? styles.drop : ''}`}
              >
                <header>
                  <small>
                    {date === today
                      ? 'Today'
                      : date === shiftDate(today, 1)
                        ? 'Tomorrow'
                        : new Date(date + 'T12:00:00').toLocaleDateString('en', {
                            weekday: 'long',
                          })}
                  </small>
                  <h2>
                    {new Date(date + 'T12:00:00').toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </h2>
                </header>
                {all.filter((t) => t.date === date && matches(t)).map(taskCard)}
                {all.filter(matches).flatMap((t) =>
                  taskHistory(t)
                    .filter((h) => h.date === date && h.date !== t.date)
                    .map((h) => (
                      <div
                        className={styles.history}
                        data-history={t.id}
                        key={t.id + ':' + h.index}
                      >
                        <button disabled={blocked} onClick={() => openTask(t)}>
                          {t.title}
                        </button>
                        <small>
                          {statusLabels[h.status as Task['status']] ?? h.status} · {h.action} · now{' '}
                          {t.date}
                        </small>
                      </div>
                    )),
                )}
                <button
                  className={styles.add}
                  aria-label={`Add task on ${date}`}
                  disabled={blocked}
                  onClick={() => openTask(undefined, date)}
                >
                  + Add task
                </button>
              </section>
            ))}
          </div>
          {schedule && (
            <section className={styles.calendarDock}>
              <header>
                <h2>Calendar · {anchor}</h2>
                <p>Drag a task to a time. It stays a plan.</p>
                <button disabled={blocked} onClick={() => navigate('3')}>
                  Open full Calendar
                </button>
              </header>
              <div className={styles.timeSlots} data-schedule>
                {Array.from({ length: 48 }, (_, i) => (
                  <div
                    key={i}
                    data-drop-date={anchor}
                    data-drop-minute={i * 30}
                    className={`${styles.slot} ${drop === `${anchor}/${i * 30}` ? styles.drop : ''}`}
                  >
                    {clockLabel(i * 30)}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          <button disabled={blocked} onClick={() => navigate('5')}>
            Home
          </button>
          <button disabled={blocked} onClick={() => navigate('3')}>
            Calendar
          </button>
          <button aria-current="page" disabled>
            Planner
          </button>
          <button disabled={blocked} onClick={() => navigate('4')}>
            Notebook
          </button>
        </nav>
      </div>
      {draft && (
        <Dialog title={state.entities['task:' + draft.id] ? 'Edit task' : 'Add task'} close={close}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (saving.current) return;
              try {
                const edit = saveTask(state, draft, Date.now());
                if (
                  await save(
                    edit,
                    quick?.query && !quick.deck
                      ? 'Saved locally · Deck created; organize it from deck management'
                      : 'Saved locally · Task saved',
                  )
                )
                  setDraft(null);
              } catch (e) {
                setStatus(`Unsaved · ${(e as Error).message}`);
              }
            }}
          >
            <fieldset disabled={busy}>
              <label>
                Task title
                <input
                  autoComplete="off"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Read a chapter +lea t45"
                  required
                />
              </label>
              {quick?.deck && <p className={styles.deckMatch}>{quick.deck.name} selected</p>}
              <div className={styles.fields}>
                <label>
                  Date
                  <input
                    type="date"
                    required
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  />
                </label>
                <label>
                  Time (optional)
                  <input
                    type="time"
                    value={timeText(draft.time)}
                    onInput={(e) => setDraft({ ...draft, time: minute(e.currentTarget.value) })}
                    onChange={(e) => setDraft({ ...draft, time: minute(e.target.value) })}
                  />
                </label>
                <label>
                  Minutes
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={draft.duration ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        duration: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Deck
                <select
                  value={draft.deck ?? ''}
                  onChange={(e) => setDraft({ ...draft, deck: e.target.value || null })}
                >
                  <option value="">No deck</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.checks}>
                {(['must', 'low', 'voyage'] as const).map((key, i) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                    />
                    {['Must-do', 'Low energy', 'Voyage'][i]}
                  </label>
                ))}
                <label>
                  <input
                    type="checkbox"
                    checked={draft.wait !== null}
                    onChange={(e) => setDraft({ ...draft, wait: e.target.checked ? '' : null })}
                  />
                  Waiting on
                </label>
              </div>
              {draft.wait !== null && (
                <label>
                  Waiting on whom or what?
                  <input
                    value={draft.wait}
                    onChange={(e) => setDraft({ ...draft, wait: e.target.value })}
                  />
                </label>
              )}
              {draft.voyage && (
                <label>
                  Voyage progress · {draft.progress}%
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={draft.progress}
                    onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}
                  />
                </label>
              )}
              <label>
                Status
                <select
                  aria-label="Status"
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value as Task['status'], manual: true })
                  }
                >
                  {Object.entries(statusLabels).map(([s, l]) => (
                    <option key={s} value={s}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={draft.manual}
                  onChange={(e) => setDraft({ ...draft, manual: e.target.checked })}
                />
                Keep status manual (ignore clock)
              </label>
              <p>
                Timed To do tasks show Working on it / Done by the clock. Neither status nor Voyage
                progress adds logged time. Clear Time to make this task untimed.
              </p>
              {state.entities['task:' + draft.id]?.kind === 'task' && (
                <details>
                  <summary>Task history</summary>
                  {taskHistory(state.entities['task:' + draft.id] as Task).map((h) => (
                    <p key={h.index}>
                      {h.date} · {statusLabels[h.status as Task['status']] ?? h.status} · {h.action}
                    </p>
                  ))}
                </details>
              )}
              <div className={styles.actions}>
                {state.entities['task:' + draft.id] && (
                  <button
                    type="button"
                    className={styles.delete}
                    onClick={async () => {
                      if (
                        await save(
                          { type: 'delete', keys: ['task:' + draft.id] },
                          'Saved locally · Task deleted; Undo is available',
                        )
                      )
                        setDraft(null);
                    }}
                  >
                    Delete task
                  </button>
                )}
                <button type="button" onClick={close}>
                  Cancel
                </button>
                <button className={styles.primary}>Save task</button>
              </div>
            </fieldset>
          </form>
          <p role="note">{status.startsWith('Unsaved') ? status : ''}</p>
        </Dialog>
      )}
      {review && (
        <Dialog title="Review task" close={close}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (
                  await save(
                    reviewTask(review, choice, target, Date.now(), minute(rollTime)),
                    'Saved locally · Review applied',
                  )
                )
                  setReview(null);
              } catch (e) {
                setStatus(`Unsaved · ${(e as Error).message}`);
              }
            }}
          >
            <fieldset disabled={busy}>
              <h3>{review.title}</h3>
              <p>
                Originally {review.date} · {statusLabels[review.status]}. Leave planned keeps it on
                that day.
              </p>
              <label>
                Decision
                <select value={choice} onChange={(e) => setChoice(e.target.value as typeof choice)}>
                  <option value="rollover">Roll over to another day</option>
                  <option value="skip">Skip on original day</option>
                  <option value="nogo">Not gonna do</option>
                </select>
              </label>
              {choice === 'rollover' && (
                <>
                  <label>
                    New day
                    <input
                      type="date"
                      min={shiftDate(review.date, 1)}
                      required
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    />
                  </label>
                  <label>
                    New time (optional)
                    <input
                      type="time"
                      value={rollTime}
                      onChange={(e) => setRollTime(e.target.value)}
                    />
                  </label>
                  <p>
                    The original day is recorded as Skipped in task history with its previous
                    status. The same task moves to {target} as To do, {rollTime || 'untimed'}. Its
                    title, deck, flags and Voyage progress stay intact.
                  </p>
                </>
              )}
              {choice !== 'rollover' && (
                <p>
                  The task stays on {review.date} as {statusLabels[choice]}. Its prior status stays
                  in history.
                </p>
              )}
              <div className={styles.actions}>
                <button type="button" onClick={close}>
                  Leave planned
                </button>
                <button className={styles.primary}>Apply review</button>
              </div>
            </fieldset>
          </form>
          <p role="note">{status.startsWith('Unsaved') ? status : ''}</p>
        </Dialog>
      )}
      {recovery && (
        <Dialog title="Recent changes" close={close}>
          <p>Undo a change within 30 days. Later edits can require review.</p>
          {Object.values(state.trash)
            .filter((t) => t.expiresAt > Date.now())
            .reverse()
            .sort((a, b) => b.deletedAt - a.deletedAt)
            .map((t) => (
              <div
                className={styles.reviewRow}
                key={t.command}
                data-change-keys={Object.keys(t.before).join(' ')}
              >
                <span>
                  {Object.keys(t.before).join(', ')}
                  <small>{new Date(t.deletedAt).toLocaleString('en')}</small>
                </span>
                <button
                  disabled={busy}
                  onClick={() =>
                    void save(
                      { type: 'restore', deletion: t.command },
                      'Saved locally · Change undone',
                    )
                  }
                >
                  Undo change
                </button>
              </div>
            ))}
        </Dialog>
      )}
    </main>
  );
}
export async function startPlanner(root: Root) {
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
      const projection = await createLogbookProjection(db, () => {});
      root.render(<Planner projection={projection} />);
      await new Promise<void>(() => {});
    } catch {
      message('Storage validation failed. Existing data is retained; export/recovery is required.');
    }
  });
}
