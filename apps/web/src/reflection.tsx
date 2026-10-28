import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Root } from 'react-dom/client';
import type { Edit, Entity, Task } from '../../../packages/domain/src/logbook.ts';
import { loggedMinutes } from '../../../packages/domain/src/logbook.ts';
import { shiftDate, taskClockStatus } from '../../../packages/domain/src/calendar.ts';
import { messages, object } from '../../../packages/domain/src/notebook.ts';
import {
  achievements,
  addMustDo,
  achievementState,
  activityDates,
  bestStreak,
  captureAchievements,
  history,
  hoursStreak,
  layout,
  moodAt,
  moodEdit,
  moodLabels,
  moments,
  mustTasks,
  onThisDay,
  periodSummary,
  preferences,
  reflectionPut,
  reviewItems,
  saveLayout,
} from '../../../packages/domain/src/reflection.ts';
import { openLogbook } from '../../../packages/persistence/src/logbook.ts';
import { createLogbookProjection } from './logbook-store.ts';
import { achievementArt } from './reflection-art.ts';
import { shipArt } from './notebook-art.ts';
import logo from '../../../icons/brand-icon.svg';
import styles from './reflection.module.css';

type Projection = Awaited<ReturnType<typeof createLogbookProjection>>;
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dateLabel = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('en', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
const titles: Record<string, string> = {
  must: 'Must-do',
  best: 'Best thing you did',
  mood: 'Mood today',
  otd: 'On this day',
  stats: 'Days logged',
  streak: 'Streak',
  hs: 'Hours streak',
  bs: 'Best-thing streak',
  heat: 'At a glance',
  les: 'Lesson of the day',
  grat: 'Gratitude',
  per: 'Your weeks and months',
  ach: 'Achievements',
  rev: 'Review everything',
};
function Face({ value }: { value: number }) {
  const mouth = [
    'M8 17c1-2 2.2-3 4-3s3 1 4 3',
    'M9 16c1-1 2-1.5 3-1.5s2 .5 3 1.5',
    'M9 15h6',
    'M9 14c1 1 2 1.5 3 1.5s2-.5 3-1.5',
    'M8 13c1 2 2.2 3 4 3s3-1 4-3',
  ][value];
  return (
    <svg
      viewBox="0 0 24 24"
      width="30"
      height="30"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9h.01M15 9h.01" />
      <path d={mouth} />
    </svg>
  );
}
function Modal({
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
    return () => previous?.focus();
  }, []);
  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
          if (e.key === 'Tab') {
            const nodes = ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),a[href]',
            );
            if (!nodes?.length) return;
            const first = nodes[0]!,
              last = nodes[nodes.length - 1]!;
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <button onClick={close} aria-label="Close dialog">
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function Reflection({ projection }: { projection: Projection }) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState);
  const [clock, setClock] = useState(() => new Date()),
    today = localDate();
  const [date, setDate] = useState(today),
    [screen, setScreen] = useState<'home' | 'reflection' | 'review'>('home');
  const [undo, setUndo] = useState(''),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState('Ready · saved on this device');
  const [custom, setCustom] = useState(false),
    [draft, setDraft] = useState<{ type: 'best' | 'les' | 'grat' | 'must'; text: string } | null>(
      null,
    );
  const [category, setCategory] = useState('all'),
    [query, setQuery] = useState(''),
    [period, setPeriod] = useState('week');
  const [share, setShare] = useState<{ title: string; url: string; blob: Blob } | null>(null),
    [sharing, setSharing] = useState(false);
  const [recovery, setRecovery] = useState(false),
    [unlock, setUnlock] = useState<string | null>(null);
  const [feature, setFeature] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null),
    [target, setTarget] = useState<string | null>(null);
  const drag = useRef<{
    id: number;
    key: string;
    target: string | null;
    timer: ReturnType<typeof setTimeout> | null;
    active: boolean;
    x: number;
    y: number;
  } | null>(null);
  const saving = useRef(false),
    achAttempt = useRef('');
  const reflection = screen !== 'home',
    cards = layout(state, reflection),
    pref = preferences(state),
    h = hoursStreak(state, today),
    b = bestStreak(state, today),
    earned = achievementState(state, today);
  const dirty = !!draft?.text.trim() || feature !== null;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || busy) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  useEffect(
    () => () => {
      if (share) URL.revokeObjectURL(share.url);
    },
    [share],
  );
  async function save(edit: Edit, after?: () => void) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setStatus('Saving locally…');
    try {
      const id = crypto.randomUUID();
      await projection.save({ id, at: Date.now(), edit });
      if (!(edit.type === 'put' && edit.entity.kind === 'history' && edit.entity.id === 'ach'))
        setUndo(id);
      setStatus('Saved locally');
      after?.();
      return true;
    } catch (e) {
      setStatus(
        `Unsaved · ${e instanceof Error ? e.message : 'Storage failed'}. Your draft is retained; retry when ready.`,
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const entity = captureAchievements(state, today),
      key = JSON.stringify(entity?.value);
    if (entity && !busy && key !== achAttempt.current) {
      achAttempt.current = key;
      void save({ type: 'put', entity });
    }
  }, [state, today, busy]);
  const go = (next: typeof screen) => {
    if (dirty) {
      setStatus('Save or cancel your draft before leaving.');
      return;
    }
    setScreen(next);
    setCustom(false);
  };
  const link = (phase: string, day = date) => `/?phase=${phase}&date=${encodeURIComponent(day)}`;
  const navigate = (e: React.MouseEvent) => {
    if (dirty || busy) {
      e.preventDefault();
      setStatus('Save or cancel your draft before leaving.');
    }
  };
  async function submitDraft() {
    if (!draft?.text.trim()) return;
    const id = crypto.randomUUID();
    if (draft.type === 'must') {
      try {
        await save(addMustDo(state, date, draft.text, id, Date.now()), () => setDraft(null));
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Could not add must-do');
      }
      return;
    }
    const entity: Entity =
      draft.type === 'best'
        ? {
            kind: 'moment',
            id,
            date,
            text: draft.text.trim(),
            activity: null,
            featured: moments(state, date).filter((m) => m.featured).length < 4,
          }
        : reflectionPut(state, draft.type, date, draft.text, id);
    await save({ type: 'put', entity }, () => setDraft(null));
  }
  function move(key: string, to: string) {
    const order = [...cards.order],
      from = order.indexOf(key),
      index = order.indexOf(to);
    if (from < 0 || index < 0 || from === index) return;
    order.splice(from, 1);
    order.splice(index, 0, key);
    void save(saveLayout(state, reflection, order, cards.hidden));
  }
  const cancelDrag = () => {
    if (drag.current?.timer) clearTimeout(drag.current.timer);
    drag.current = null;
    setDragging(null);
    setTarget(null);
  };
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, []);
  async function prepareShare(title = 'Your streaks') {
    setSharing(true);
    try {
      await document.fonts.ready;
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw Error('Canvas unavailable');
      ctx.fillStyle = '#121010';
      ctx.fillRect(0, 0, 1080, 1350);
      const image = new Image();
      image.src =
        title === 'Your streaks'
          ? logo
          : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(achievementArt[title]!());
      await image.decode();
      ctx.drawImage(image, 432, 100, 216, 216);
      ctx.fillStyle = '#f7f5e4';
      ctx.textAlign = 'center';
      ctx.font = '800 64px Rethink';
      ctx.fillText('Sailor Logbook', 540, 420);
      ctx.font = '800 52px Rethink';
      ctx.fillText(title, 540, 560);
      ctx.font = '500 38px Rethink';
      const lines =
        title === 'Your streaks'
          ? [
              `${h} days of 2+ hours`,
              `${b.count} best-thing days`,
              `${b.remaining} freezes left this month`,
            ]
          : [achievements.find((a) => a[0] === title)![1]];
      lines.forEach((line, i) => ctx.fillText(line, 540, 730 + i * 90));
      ctx.fillStyle = '#9b978b';
      ctx.font = '500 28px Rethink';
      ctx.fillText(dateLabel(today), 540, 1170);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(Error('Image export failed'))), 'image/png'),
      );
      setShare({ title, blob, url: URL.createObjectURL(blob) });
    } catch {
      setStatus('Could not prepare the share image. Try again.');
    } finally {
      setSharing(false);
    }
  }
  const renderTextItems = (type: string) =>
    reviewItems(state, type)
      .slice(0, 4)
      .map((i) => (
        <div className={styles.row} key={i.key}>
          <span>
            {i.text}
            <small>{dateLabel(i.date)}</small>
          </span>
        </div>
      ));
  const taskRows = (tasks: Task[]) =>
    tasks.map((t) => (
      <div key={t.id} className={styles.row}>
        <button
          disabled={busy || dirty}
          aria-label={`Mark ${t.title} ${t.status === 'done' ? 'to do' : 'done'}`}
          aria-pressed={t.status === 'done'}
          onClick={() =>
            void save({
              type: 'put',
              entity: {
                ...t,
                status: t.status === 'done' ? 'todo' : 'done',
                legacy: { ...object(t.legacy), man: 1 },
                history: [
                  ...t.history,
                  {
                    from: t.status,
                    to: t.status === 'done' ? 'todo' : 'done',
                    at: clock.toISOString(),
                    source: 'home',
                  },
                ],
              },
            })
          }
        >
          {t.status === 'done' ? '✓' : '○'}
        </button>
        <span>
          {t.title}
          <small>
            {
              {
                todo: 'To do',
                doing: 'Working on it',
                stuck: 'Stuck',
                done: 'Done',
                skip: 'Skipped',
                nogo: 'Not going to do',
              }[taskClockStatus(t, today, clock.getHours() * 60 + clock.getMinutes())]
            }{' '}
            {typeof object(t.legacy).pct === 'number' ? `· ${object(t.legacy).pct}%` : ''}
            {typeof object(t.legacy).pct === 'number' && (
              <progress
                aria-label={`${t.title} progress`}
                max={100}
                value={Math.max(0, Math.min(100, Number(object(t.legacy).pct)))}
              />
            )}
          </small>
        </span>
        <a onClick={navigate} href={link('3', t.date)}>
          Calendar
        </a>
      </div>
    ));
  function card(key: string): React.ReactNode {
    switch (key) {
      case 'hs':
      case 'streak':
        return (
          <>
            <strong className={styles.number}>{h}</strong>
            <p>days of 2+ hours</p>
          </>
        );
      case 'bs':
        return (
          <>
            <strong className={styles.number}>{b.count}</strong>
            <p>{b.remaining} freezes left this month</p>
          </>
        );
      case 'best': {
        const all = moments(state, date),
          featured = all.filter((m) => m.featured);
        return (
          <>
            <small>{featured.length}/4 featured</small>
            {featured.map((m) => (
              <div className={styles.row} key={m.id}>
                <span>{m.text}</span>
                <button
                  aria-label={`Unfeature ${m.text}`}
                  disabled={busy || dirty}
                  onClick={() =>
                    void save({
                      type: 'feature',
                      date,
                      ids: featured.filter((x) => x.id !== m.id).map((x) => x.id),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button disabled={busy || dirty} onClick={() => setDraft({ type: 'best', text: '' })}>
              Add best thing
            </button>
            {all.some((m) => !m.featured) && (
              <button
                disabled={busy || dirty}
                onClick={() => setFeature(featured.map((m) => m.id))}
              >
                Choose four to feature
              </button>
            )}
            <a onClick={navigate} href={link('4')}>
              Open notebook
            </a>
          </>
        );
      }
      case 'mood':
        if (!reflection)
          return (
            <>
              <div className={styles.faces}>
                {moodLabels.map((label, i) => (
                  <button
                    key={label}
                    disabled={busy || dirty}
                    aria-label={`Mood: ${label}`}
                    aria-pressed={moodAt(state, date) === i}
                    onClick={() =>
                      void save(moodEdit(state, date, moodAt(state, date) === i ? null : i))
                    }
                  >
                    <Face value={i} />
                  </button>
                ))}
              </div>
            </>
          );
        else {
          const year = today.slice(0, 4),
            pt = (i: number, r: number) =>
              `${110 + Math.cos(-Math.PI / 2 + (i * Math.PI) / 6) * r},${110 + Math.sin(-Math.PI / 2 + (i * Math.PI) / 6) * r}`;
          return (
            <>
              <svg
                className={styles.radar}
                viewBox="0 0 220 220"
                role="img"
                aria-label="Mood through the year"
              >
                {[22.5, 45, 67.5, 90].map((r) => (
                  <polygon
                    key={r}
                    points={Array.from({ length: 12 }, (_, i) => pt(i, r)).join(' ')}
                    fill="none"
                    stroke="#ffffff20"
                  />
                ))}
                {Array.from({ length: 12 }, (_, i) => (
                  <text
                    key={i}
                    x={+pt(i, 102).split(',')[0]!}
                    y={+pt(i, 102).split(',')[1]! + 3}
                    fill="#9b978b"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {'JFMAMJJASOND'[i]}
                  </text>
                ))}
                <polygon
                  points={Array.from({ length: 12 }, (_, i) => {
                    const month = `${year}-${String(i + 1).padStart(2, '0')}`,
                      vals = Object.keys(history(state, 'mood'))
                        .filter((d) => d.startsWith(month))
                        .map((d) => moodAt(state, d))
                        .filter((v): v is number => v !== null);
                    return pt(
                      i,
                      10 +
                        (vals.length
                          ? (vals.reduce((a, b) => a + b, 0) / vals.length / 4) * 80
                          : 0),
                    );
                  }).join(' ')}
                  fill="#22619277"
                  stroke="#5b9bd5"
                  strokeWidth="2"
                />
              </svg>
              <p>Last 14 days</p>
              <div className={styles.moods}>
                {Array.from({ length: 14 }, (_, i) => {
                  const d = shiftDate(today, i - 13),
                    m = moodAt(state, d);
                  return (
                    <span
                      key={d}
                      title={`${dateLabel(d)}: ${m === null ? 'No mood' : moodLabels[m]}`}
                    >
                      {m === null ? '·' : <Face value={m} />}
                    </span>
                  );
                })}
              </div>
              <details>
                <summary>Monthly averages</summary>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = `${year}-${String(i + 1).padStart(2, '0')}`,
                    v = Object.keys(history(state, 'mood'))
                      .filter((d) => d.startsWith(month))
                      .map((d) => moodAt(state, d))
                      .filter((n): n is number => n !== null);
                  return (
                    <p key={month}>
                      {month}:{' '}
                      {v.length
                        ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) + ' / 4'
                        : 'No moods'}
                    </p>
                  );
                })}
              </details>
            </>
          );
        }
      case 'must':
        if (!reflection) {
          const tasks = mustTasks(state, date);
          return (
            <>
              <p>
                {tasks.filter((t) => t.status === 'done').length} of {tasks.length} completed
              </p>
              {taskRows(tasks)}
              {!tasks.length && <p>Nothing you have to do today.</p>}
              <button disabled={busy || dirty} onClick={() => setDraft({ type: 'must', text: '' })}>
                Add must-do
              </button>
              <a onClick={navigate} href={link('3')}>
                Open calendar
              </a>
            </>
          );
        }
        return (
          <>
            <div className={styles.bars}>
              {Array.from({ length: 14 }, (_, i) => {
                const d = shiftDate(today, i - 13),
                  tasks = mustTasks(state, d),
                  done = tasks.filter((t) => t.status === 'done').length;
                return (
                  <a
                    href={link('3', d)}
                    onClick={navigate}
                    key={d}
                    title={`${dateLabel(d)}: ${done} of ${tasks.length}`}
                    style={{
                      height: `${tasks.length ? Math.max(10, (done / tasks.length) * 100) : 6}%`,
                      background: tasks.length && tasks.length === done ? '#226192' : '#2b4f6e',
                    }}
                  />
                );
              })}
            </div>
            <p>
              {
                Array.from({ length: 14 }, (_, i) =>
                  mustTasks(state, shiftDate(today, i - 13)),
                ).filter((ts) => ts.length && ts.every((t) => t.status === 'done')).length
              }{' '}
              days with every must-do done
            </p>
          </>
        );
      case 'stats':
        return (
          <>
            <strong className={styles.number}>
              {
                new Set([
                  ...activityDates(state),
                  ...moments(state).map((m) => m.date),
                  ...Object.values(state.entities)
                    .filter((e) => e.kind === 'page' && messages(state, e.date).length)
                    .map((e) => (e.kind === 'page' ? e.date : '')),
                ]).size
              }
            </strong>
            <p>
              {(loggedMinutes(state, date) / 60).toFixed(1)} h {date === today ? 'today' : date}
            </p>
            <progress
              max={120}
              value={Math.min(120, loggedMinutes(state, date, true))}
              aria-label="Progress toward two eligible hours"
            />
            <small>{loggedMinutes(state, date, true)} / 120 eligible minutes</small>
          </>
        );
      case 'otd':
        return onThisDay(state, today)
          .map((i) => (
            <div className={styles.row} key={i.key}>
              <span>
                {i.text}
                <small>
                  {i.date} · {i.category}
                </small>
              </span>
            </div>
          ))
          .concat(
            onThisDay(state, today).length
              ? []
              : [<p key="empty">Nothing from this day yet. Come back next year.</p>],
          );
      case 'les':
      case 'grat':
        return (
          <>
            {renderTextItems(key)}
            <button disabled={busy || dirty} onClick={() => setDraft({ type: key, text: '' })}>
              {key === 'les' ? 'Add lesson' : 'Add gratitude'}
            </button>
          </>
        );
      case 'heat': {
        const start = today.slice(0, 4) + '-01-01',
          end = String(+today.slice(0, 4) + 1) + '-01-01',
          days = [];
        for (let d = start; d < end; d = shiftDate(d, 1)) days.push(d);
        return (
          <>
            <p>{today.slice(0, 4)} at a glance</p>
            <div className={styles.heat}>
              {days.map((d) => {
                const n = loggedMinutes(state, d, true);
                return (
                  <a
                    key={d}
                    onClick={navigate}
                    href={link('3', d)}
                    aria-label={`${d}: ${n} eligible minutes`}
                    title={`${d}: ${n} eligible minutes`}
                    style={{
                      background:
                        n >= 240 ? '#f7f5e4' : n >= 120 ? '#226192' : n > 0 ? '#2b4f6e' : '#2a2725',
                      gridColumn: d === start ? new Date(d + 'T12:00:00').getDay() + 1 : undefined,
                    }}
                  />
                );
              })}
            </div>
            <small>Eligible logged time · 0 / some / 2+ / 4+ hours</small>
          </>
        );
      }
      case 'per':
        return (
          <>
            <div className={styles.actions}>
              <button aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>
                By week
              </button>
              <button aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>
                By month
              </button>
            </div>
            {Array.from({ length: 6 }, (_, i) => {
              let start, end;
              if (period === 'week') {
                start = shiftDate(today, -new Date(today + 'T12:00:00').getDay() - 7 * i);
                end = shiftDate(start, 6);
              } else {
                const d = new Date(+today.slice(0, 4), +today.slice(5, 7) - 1 - i, 1);
                start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                end = shiftDate(
                  `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`,
                  -1,
                );
              }
              const sum = periodSummary(state, start, end);
              return (
                <div className={styles.row} key={start}>
                  <span>
                    {start} – {end}
                    <small>
                      {sum.days} days · {(sum.minutes / 60).toFixed(1)} h · {sum.best} best things
                    </small>
                  </span>
                </div>
              );
            })}
          </>
        );
      case 'ach':
        return (
          <>
            <p>{Object.values(earned).filter(Boolean).length} of seven · tap to share</p>
            <div className={styles.achievements}>
              {achievements.map(([name, description]) => (
                <button
                  key={name}
                  className={!earned[name] ? styles.locked : undefined}
                  disabled={sharing || busy}
                  aria-label={`${name}: ${earned[name] ? 'unlocked' : 'locked'}`}
                  onClick={() => (earned[name] ? void prepareShare(name) : setUnlock(description))}
                >
                  <span
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: achievementArt[name]!() }}
                  />
                  <b>{name}</b>
                  <small>{description}</small>
                </button>
              ))}
            </div>
            {captureAchievements(state, today) && (
              <button
                disabled={busy}
                onClick={() => {
                  const entity = captureAchievements(state, today);
                  if (entity) void save({ type: 'put', entity });
                }}
              >
                Save earned achievements
              </button>
            )}
            <button disabled={sharing || busy} onClick={() => void prepareShare()}>
              Share streak card
            </button>
          </>
        );
      case 'rev':
        return (
          <>
            <p>Lessons, gratitude and best things</p>
            <button disabled={busy || dirty} onClick={() => go('review')}>
              Open review
            </button>
          </>
        );
      default:
        return null;
    }
  }
  const tasks = Object.values(state.entities).filter(
    (e): e is Task =>
      e.kind === 'task' && e.date === today && !['done', 'skip', 'nogo'].includes(e.status),
  );
  const minute = clock.getHours() * 60 + clock.getMinutes(),
    currentTask =
      tasks.find((t) => t.must && t.status === 'doing') ??
      tasks.find(
        (t) => t.time !== null && t.time <= minute && minute < t.time + (t.duration ?? 60),
      );
  const currentActivity = Object.values(state.entities).find(
    (e) =>
      e.kind === 'activity' &&
      e.segments.some((p) => p.date === today && p.start <= minute && minute < p.end),
  );
  const current =
    currentTask?.title ??
    (currentActivity?.kind === 'activity' ? currentActivity.title : 'Log your day');
  const carried = Object.values(state.entities).filter(
    (e) => e.kind === 'task' && e.date < today && !['done', 'skip', 'nogo'].includes(e.status),
  );
  return (
    <main className={styles.app} data-screen={screen}>
      <aside className={styles.sidebar}>
        <img src={logo} alt="Sailor Logbook" />
        <b>Sailor Logbook</b>
        <button aria-pressed={screen === 'home'} disabled={busy} onClick={() => go('home')}>
          Home
        </button>
        <a href={link('3')} onClick={navigate}>
          Calendar
        </a>
        <a href={link('6')} onClick={navigate}>
          Planner
        </a>
        <a href={link('4')} onClick={navigate}>
          Notebook
        </a>
        <button
          aria-pressed={screen === 'reflection'}
          disabled={busy}
          onClick={() => go('reflection')}
        >
          Reflection
        </button>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.toolbar}>
          <span>{dateLabel(today)}</span>
          <button disabled={busy} onClick={() => setRecovery(true)}>
            Recent changes
          </button>
        </header>
        <p role="status" aria-live="polite">
          {status}
        </p>
        {undo && (
          <button
            disabled={busy || dirty}
            onClick={() => void save({ type: 'restore', deletion: undo }, () => setUndo(''))}
          >
            Undo last change
          </button>
        )}
        <header className={styles.heading}>
          <h1>
            {screen === 'home'
              ? `${clock.getHours() < 12 ? 'Good morning' : clock.getHours() < 18 ? 'Good afternoon' : 'Good evening'}${typeof pref.name === 'string' && pref.name ? ', ' + pref.name : ''}`
              : screen === 'review'
                ? 'Review'
                : 'Reflection'}
          </h1>
          <img
            src={
              typeof pref.av === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(pref.av)
                ? pref.av
                : logo
            }
            alt=""
          />
        </header>
        {screen !== 'review' && (
          <label className={styles.date}>
            Recording date
            <input
              aria-label="Recording date"
              type="date"
              value={date}
              disabled={busy || dirty}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
        )}
        {screen === 'home' && (
          <>
            <div className={styles.hero}>
              <div>
                <p>Current task</p>
                <h2>{current}</h2>
                <p>
                  {currentTask
                    ? 'Working on it · planned time is separate from logged time'
                    : 'A little reflection on the things that matter.'}
                </p>
                <a className={styles.primary} href={link('3')} onClick={navigate}>
                  Open calendar
                </a>
                <a href={link('6')} onClick={navigate}>
                  Plan your day
                </a>
              </div>
              <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: shipArt }} />
            </div>
            {carried.length > 0 && (
              <p>
                {carried.length} unresolved past tasks · kept on their original dates.{' '}
                <a href={link('6', (carried[0] as Task).date)} onClick={navigate}>
                  Review in Planner
                </a>
              </p>
            )}
          </>
        )}
        {screen === 'review' ? (
          <>
            <div className={styles.actions}>
              {[
                ['all', 'Everything'],
                ['les', 'Lessons'],
                ['grat', 'Gratitude'],
                ['best', 'Best things'],
              ].map(([k, label]) => (
                <button key={k} aria-pressed={category === k} onClick={() => setCategory(k!)}>
                  {label}
                </button>
              ))}
            </div>
            <input
              aria-label="Search review"
              autoComplete="off"
              placeholder="Search by name or date"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {reviewItems(state, category)
              .filter((i) =>
                (i.text + ' ' + i.date + ' ' + dateLabel(i.date))
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((i) => (
                <article className={styles.review} key={i.key}>
                  <p>
                    {i.category} · {dateLabel(i.date)}
                  </p>
                  <h2>{i.text}</h2>
                  <a href={link('3', i.date)} onClick={navigate}>
                    Review day
                  </a>
                  <a href={link('4', i.date)} onClick={navigate}>
                    Notebook
                  </a>
                  {i.entity?.kind === 'reflection' && (
                    <button
                      disabled={busy}
                      onClick={() => void save({ type: 'delete', keys: [i.key] })}
                      aria-label={`Delete ${i.text}`}
                    >
                      Delete
                    </button>
                  )}
                </article>
              ))}
            <button onClick={() => go('reflection')}>Back to Reflection</button>
          </>
        ) : (
          <>
            {custom && (
              <p>
                Drag a handle to reorder, or use Move up / Move down. Hidden cards stay available
                here.
              </p>
            )}
            <div className={styles.grid} data-custom={custom}>
              {cards.order
                .filter((k) => custom || !cards.hidden.includes(k))
                .map((key, index) => (
                  <article
                    key={key}
                    data-card={key}
                    className={`${styles.card} ${(reflection ? ['hs', 'bs'] : ['stats', 'streak']).includes(key) ? styles.half : ''} ${custom && cards.hidden.includes(key) ? styles.hidden : ''} ${target === key ? styles.target : ''} ${dragging === key ? styles.dragging : ''}`}
                  >
                    <h2>
                      {reflection && key === 'mood'
                        ? 'Mood through the year'
                        : reflection && key === 'must'
                          ? 'Must-dos completed, last 14 days'
                          : titles[key]}
                    </h2>
                    {custom ? (
                      <>
                        <button
                          className={styles.handle}
                          aria-label={`Drag ${titles[key]}`}
                          disabled={busy}
                          onPointerDown={(e) => {
                            if (e.button !== 0 || drag.current) return;
                            e.currentTarget.setPointerCapture(e.pointerId);
                            const active = e.pointerType === 'mouse';
                            drag.current = {
                              id: e.pointerId,
                              key,
                              target: null,
                              timer: null,
                              active,
                              x: e.clientX,
                              y: e.clientY,
                            };
                            if (active) setDragging(key);
                            else
                              drag.current.timer = setTimeout(() => {
                                if (drag.current) {
                                  drag.current.active = true;
                                  setDragging(key);
                                }
                              }, 350);
                          }}
                          onPointerMove={(e) => {
                            const d = drag.current;
                            if (!d || d.id !== e.pointerId) return;
                            if (!d.active) {
                              if (Math.hypot(d.x - e.clientX, d.y - e.clientY) > 8) cancelDrag();
                              return;
                            }
                            const el = document
                                .elementFromPoint(e.clientX, e.clientY)
                                ?.closest<HTMLElement>('[data-card]'),
                              to = el?.dataset.card ?? null;
                            d.target = to;
                            setTarget(to);
                            if (e.clientY > innerHeight - 60) window.scrollBy(0, 18);
                            else if (e.clientY < 60) window.scrollBy(0, -18);
                          }}
                          onPointerUp={(e) => {
                            const d = drag.current;
                            if (d?.id === e.pointerId && d.active && d.target)
                              move(d.key, d.target);
                            cancelDrag();
                          }}
                          onPointerCancel={cancelDrag}
                          onLostPointerCapture={cancelDrag}
                        >
                          Drag to reorder
                        </button>
                        <div className={styles.actions}>
                          <button
                            disabled={busy || index === 0}
                            aria-label={`Move ${titles[key]} up`}
                            onClick={() => move(key, cards.order[index - 1]!)}
                          >
                            Move up
                          </button>
                          <button
                            disabled={busy || index === cards.order.length - 1}
                            aria-label={`Move ${titles[key]} down`}
                            onClick={() => move(key, cards.order[index + 1]!)}
                          >
                            Move down
                          </button>
                          <button
                            disabled={busy}
                            aria-label={`${cards.hidden.includes(key) ? 'Show' : 'Hide'} ${titles[key]}`}
                            onClick={() =>
                              void save(
                                saveLayout(
                                  state,
                                  reflection,
                                  cards.order,
                                  cards.hidden.includes(key)
                                    ? cards.hidden.filter((k) => k !== key)
                                    : [...cards.hidden, key],
                                ),
                              )
                            }
                          >
                            {cards.hidden.includes(key) ? 'Show' : 'Hide'}
                          </button>
                        </div>
                      </>
                    ) : (
                      card(key)
                    )}
                  </article>
                ))}
            </div>
            {screen === 'home' && (
              <a className={styles.sea} href={link('4') + '&sea=1'} onClick={navigate}>
                <span>
                  Sea adventure<small>Open bottles from your past</small>
                </span>
                <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: shipArt }} />
              </a>
            )}
            <button
              className={styles.customize}
              disabled={busy || dirty}
              onClick={() => setCustom(!custom)}
            >
              {custom ? 'Done customizing' : 'Customize'}
            </button>
          </>
        )}
      </div>
      <nav className={styles.mobileNav} aria-label="Main navigation">
        <button disabled={busy} onClick={() => go('home')}>
          Home
        </button>
        <a href={link('3')} onClick={navigate}>
          Calendar
        </a>
        <a href={link('4')} onClick={navigate}>
          Notebook
        </a>
        <button disabled={busy} onClick={() => go('reflection')}>
          Reflection
        </button>
      </nav>
      {draft && (
        <Modal
          title={
            draft.type === 'best'
              ? 'Add best thing'
              : draft.type === 'les'
                ? 'Lesson of the day'
                : draft.type === 'must'
                  ? 'Add must-do'
                  : 'Gratitude'
          }
          close={() => {
            if (!busy) setDraft(null);
          }}
        >
          <p>{dateLabel(date)}</p>
          {draft.type === 'best' && moments(state, date).filter((m) => m.featured).length >= 4 && (
            <p>
              Four are featured already. Your text will be kept as a notebook moment; choose four to
              feature afterward.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitDraft();
            }}
          >
            <label>
              Your words
              <input
                autoFocus
                autoComplete="off"
                value={draft.text}
                readOnly={busy}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
            </label>
            <button disabled={busy || !draft.text.trim()}>Save</button>
            <button type="button" disabled={busy} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </form>
        </Modal>
      )}
      {feature && (
        <Modal
          title="Choose four to feature"
          close={() => {
            if (!busy) setFeature(null);
          }}
        >
          <p>All text stays in your notebook. Choose up to four best things.</p>
          {moments(state, date).map((m) => (
            <label className={styles.choice} key={m.id}>
              <input
                type="checkbox"
                disabled={busy || (!feature.includes(m.id) && feature.length === 4)}
                checked={feature.includes(m.id)}
                onChange={() =>
                  setFeature(
                    feature.includes(m.id)
                      ? feature.filter((id) => id !== m.id)
                      : [...feature, m.id],
                  )
                }
              />
              {m.text}
            </label>
          ))}
          <button
            disabled={busy}
            onClick={() =>
              void save({ type: 'feature', date, ids: feature }, () => setFeature(null))
            }
          >
            Save selection
          </button>
          <button disabled={busy} onClick={() => setFeature(null)}>
            Cancel
          </button>
        </Modal>
      )}
      {recovery && (
        <Modal
          title="Recent changes"
          close={() => {
            if (!busy) setRecovery(false);
          }}
        >
          <p>Restore a change within 30 days. Later edits can require review.</p>
          {Object.values(state.trash)
            .filter((t) => t.expiresAt > Date.now())
            .sort((a, b) => b.deletedAt - a.deletedAt)
            .map((t) => (
              <div className={styles.row} key={t.command}>
                <span>
                  {Object.keys(t.before).join(', ')}
                  <small>{new Date(t.deletedAt).toLocaleString('en')}</small>
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
      {unlock && (
        <Modal title="Keep sailing" close={() => setUnlock(null)}>
          <p>{unlock}</p>
          <button onClick={() => setUnlock(null)}>Continue</button>
        </Modal>
      )}
      {share && (
        <Modal title="Share preview" close={() => setShare(null)}>
          <img className={styles.shareImage} src={share.url} alt={`${share.title} share card`} />
          <a className={styles.primary} href={share.url} download="sailor-logbook.png">
            Download PNG
          </a>
          {typeof navigator.share === 'function' && (
            <button
              onClick={async () => {
                try {
                  const file = new File([share.blob], 'sailor-logbook.png', { type: 'image/png' });
                  if (!navigator.canShare?.({ files: [file] })) {
                    setStatus('File sharing is unavailable. Use Download PNG.');
                    return;
                  }
                  await navigator.share({ files: [file] });
                } catch (e) {
                  if (!(e instanceof DOMException && e.name === 'AbortError'))
                    setStatus('Sharing failed. The preview and download remain available.');
                }
              }}
            >
              Share image
            </button>
          )}
        </Modal>
      )}
    </main>
  );
}
export async function startReflection(root: Root) {
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
      root.render(<Reflection projection={projection} />);
      await new Promise<void>(() => {});
    } catch {
      message('Storage validation failed. Existing data is retained; export/recovery is required.');
    }
  });
}
