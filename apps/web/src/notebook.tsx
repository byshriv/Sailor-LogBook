import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Root } from 'react-dom/client';
import type { Edit, Json, Page } from '../../../packages/domain/src/logbook.ts';
import { canonical } from '../../../packages/domain/src/logbook.ts';
import { shiftDate } from '../../../packages/domain/src/calendar.ts';
import {
  linesFor,
  messages,
  object,
  openBottleHistory,
  pageFor,
  pickBottles,
  sendPage,
  sentDates,
  strokes,
  writeLine,
} from '../../../packages/domain/src/notebook.ts';
import type { Bottle, Line, SeaFilter, Stroke } from '../../../packages/domain/src/notebook.ts';
import { openLogbook } from '../../../packages/persistence/src/logbook.ts';
import type { LogbookStore } from '../../../packages/persistence/src/logbook.ts';
import { createLogbookProjection } from './logbook-store.ts';
import styles from './notebook.module.css';
import logo from '../../../icons/brand-icon.svg';
import { seaArt, shipArt, bottleArt, waterTexture } from './notebook-art.ts';

type Projection = Awaited<ReturnType<typeof createLogbookProjection>>;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dateLabel = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
const jsonStrokes = (value: Stroke[]): Json[] => value.map((s) => ({ c: s.c, w: s.w, p: s.p }));

function Sketch({
  value,
  label,
  onChange,
  active = false,
  square = false,
}: {
  value: Json[];
  label: string;
  onChange?: (s: Json[]) => void;
  active?: boolean;
  square?: boolean;
}) {
  const normalized = strokes(value),
    [pending, setPending] = useState<Stroke | null>(null);
  const current = useRef<{ id: number; stroke: Stroke } | null>(null);
  const [ink, setInk] = useState('#1a1816'),
    [width, setWidth] = useState(2);
  const cancel = () => {
    current.current = null;
    setPending(null);
  };
  const point = (event: React.PointerEvent<SVGSVGElement>): [number, number] => {
    const r = event.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)),
    ];
  };
  return (
    <div className={styles.sketch}>
      {active && onChange && (
        <div className={styles.pens}>
          {['#1a1816', '#4a4642', '#8a857d'].map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`Ink ${c}`}
              aria-pressed={ink === c}
              style={{ color: c }}
              onClick={() => setInk(c)}
            >
              ●
            </button>
          ))}
          {[2, 4, 7].map((w) => (
            <button
              type="button"
              key={w}
              aria-label={`Width ${w}`}
              aria-pressed={width === w}
              onClick={() => setWidth(w)}
            >
              {w}
            </button>
          ))}
          <button
            type="button"
            disabled={!value.length}
            onClick={() => onChange(value.slice(0, -1))}
          >
            Undo stroke
          </button>
          <button type="button" disabled={!value.length} onClick={() => onChange([])}>
            Clear drawing
          </button>
        </div>
      )}
      <svg
        viewBox={`0 0 640 ${square ? 640 : 256}`}
        style={{ aspectRatio: square ? '1' : '2.5' }}
        role="img"
        aria-label={label}
        className={active ? styles.drawingActive : styles.drawing}
        tabIndex={active ? 0 : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel();
        }}
        onPointerDown={(e) => {
          if (!active || !onChange || current.current || e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          const stroke: Stroke = { c: ink, w: width, p: [point(e)] };
          current.current = { id: e.pointerId, stroke };
          setPending(stroke);
        }}
        onPointerMove={(e) => {
          if (current.current?.id !== e.pointerId) return;
          current.current.stroke.p.push(point(e));
          setPending({ ...current.current.stroke });
        }}
        onPointerUp={(e) => {
          if (current.current?.id !== e.pointerId) return;
          const s = current.current.stroke;
          s.p.push(point(e));
          cancel();
          onChange?.([...value, ...jsonStrokes([s])]);
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      >
        {[...normalized, ...(pending ? [pending] : [])].map((s, i) => (
          <path
            key={i}
            d={
              s.p
                .map((p, j) => `${j ? 'L' : 'M'}${p[0] * 640},${p[1] * (square ? 640 : 256)}`)
                .join(' ') + (s.p.length === 1 ? `l.1,.1` : '')
            }
            fill="none"
            stroke={s.c}
            strokeWidth={s.w * 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}

function Media({ db, id }: { db: LogbookStore; id: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let disposed = false,
      url = '';
    void db.attachment(id).then((b) => {
      if (b && !disposed) {
        url = URL.createObjectURL(b.blob);
        setUrl(url);
      }
    });
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [db, id]);
  return url ? <img className={styles.preview} src={url} alt="Saved drawing" /> : null;
}
function Preview({ raw, page, db }: { raw: Record<string, Json>; page: Page; db: LogbookStore }) {
  if (Array.isArray(raw.sk) && raw.sk.length)
    return <Sketch value={raw.sk} label="Saved doodle" square />;
  if (typeof raw.dd === 'string' && raw.dd.startsWith('data:image/'))
    return <img className={styles.preview} src={raw.dd} alt="Saved doodle" />;
  if (typeof raw.preview === 'string' && page.attachments.includes(raw.preview))
    return <Media db={db} id={raw.preview} />;
  return null;
}

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}

export function Notebook({ projection, db }: { projection: Projection; db: LogbookStore }) {
  const state = useSyncExternalStore(projection.store.subscribe, projection.store.getState);
  const [date, setDate] = useState(today),
    [sea, setSea] = useState(false),
    [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('Saved locally'),
    [busy, setBusy] = useState(false),
    [undo, setUndo] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({}),
    draftsRef = useRef(drafts);
  const [drawing, setDrawing] = useState<{ id: string; value: Json[]; original: Json[] } | null>(
    null,
  );
  const [free, setFree] = useState<Json[] | null>(null),
    freeRef = useRef(free);
  const [guard, setGuard] = useState(false),
    [help, setHelp] = useState(false),
    [recovery, setRecovery] = useState(false);
  const [filter, setFilter] = useState<SeaFilter>({ best: false, size: 'both', date: '' });
  const [bottles, setBottles] = useState<Bottle[]>([]),
    [opened, setOpened] = useState<{ bottle: Bottle; lines: Line[] } | null>(null);
  const [sailing, setSailing] = useState(false);
  const saving = useRef<Promise<boolean> | null>(null),
    newInput = useRef<HTMLInputElement>(null);
  const page = pageFor(state, date),
    rows = linesFor(state, date),
    sent = sentDates(state).includes(date) && !editing;
  const dirty = Object.keys(drafts).length > 0 || free !== null || !!drawing;
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty]);
  useEffect(() => {
    if (!sea) return;
    setBottles(pickBottles(state, today(), filter));
    // Keep this visit's selection stable. Opening removes a bottle; it does not redraw the sea.
  }, [sea, filter]);
  useEffect(() => {
    if (!sailing) return;
    const id = setTimeout(() => setSailing(false), 1600);
    return () => clearTimeout(id);
  }, [sailing]);
  function draft(id: string, text: string) {
    const next = { ...draftsRef.current, [id]: text };
    draftsRef.current = next;
    setDrafts(next);
    setStatus('Unsaved changes');
  }
  function setFreeDraft(value: Json[] | null) {
    freeRef.current = value;
    setFree(value);
    if (value) setStatus('Unsaved drawing');
  }
  async function commit(edit: Edit, message = 'Saved locally') {
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      await projection.save({ id, at: Date.now(), edit });
      setUndo(id);
      setStatus(message);
      return true;
    } catch (error) {
      setStatus(
        `Unsaved · ${error instanceof Error ? error.message : 'Storage failed'}. Your draft is retained; retry saving.`,
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function flush(): Promise<boolean> {
    if (saving.current) {
      if (!(await saving.current)) return false;
      return flush();
    }
    const run = async () => {
      const changes = { ...draftsRef.current },
        sketch = freeRef.current;
      for (const [id, text] of Object.entries(changes)) {
        let entities;
        try {
          entities = writeLine(
            projection.store.getState(),
            date,
            id,
            text,
            crypto.randomUUID(),
            Date.now(),
          );
        } catch (error) {
          setStatus(`Unsaved · ${String(error)}. Your text is retained.`);
          return false;
        }
        if (!(await commit({ type: 'putMany', entities }))) return false;
        if (draftsRef.current[id] === text) {
          const next = { ...draftsRef.current };
          delete next[id];
          draftsRef.current = next;
          setDrafts(next);
        }
      }
      if (sketch !== null) {
        const p = pageFor(projection.store.getState(), date);
        p.strokes = sketch;
        // The SVG preview is derived from canonical strokes; original migrated blobs stay referenced.
        p.legacy = { ...object(p.legacy), draw: '' };
        if (!(await commit({ type: 'putMany', entities: [p] }))) return false;
        if (freeRef.current === sketch) setFreeDraft(null);
      }
      return true;
    };
    saving.current = run();
    const ok = await saving.current;
    saving.current = null;
    return ok;
  }
  async function navigate(action: () => void) {
    if (drawing) return;
    if (await flush()) {
      action();
      setGuard(false);
    }
  }
  async function send() {
    if (!(await flush())) return;
    try {
      if (
        await commit(
          { type: 'putMany', entities: [sendPage(projection.store.getState(), date)] },
          'Message sent to sea · Saved locally',
        )
      ) {
        setEditing(false);
        setGuard(false);
        setSailing(true);
      }
    } catch (error) {
      setStatus(String(error));
    }
  }
  async function saveDoodle() {
    if (!drawing) return;
    const p = pageFor(projection.store.getState(), date),
      row = linesFor(projection.store.getState(), date).find((l) => l.id === drawing.id);
    const raw = {
      ...row?.raw,
      id: row?.raw.id ?? (drawing.id === 'new' ? crypto.randomUUID() : drawing.id),
      t: row?.text ?? '',
      sk: drawing.value,
      dd: '',
    };
    if (row?.moment) Object.assign(raw, { bt: row.moment.id });
    const i = p.lines.findIndex((r, j) => (object(r).id ?? `legacy-row-${j}`) === drawing.id);
    if (i >= 0) p.lines[i] = raw;
    else if (drawing.value.length) p.lines.push(raw);
    if (await commit({ type: 'putMany', entities: [p] })) setDrawing(null);
  }
  const sendButton = (
    <button type="button" onClick={() => void send()} disabled={busy || sent}>
      Send to sea
    </button>
  );
  return (
    <main
      className={`${styles.app} ${sea ? styles.sea : styles.notebook}`}
      onPointerDownCapture={(event) => {
        // Keep blur's save from disabling a pressed navigation/send button before its click.
        if (
          Object.keys(draftsRef.current).length &&
          (event.target as HTMLElement).closest('button')
        )
          event.preventDefault();
      }}
    >
      <header className={styles.header}>
        <img src={logo} alt="Sailor Logbook" width="38" height="38" />
        {sea ? (
          <button onClick={() => setSea(false)}>Back to Notebook</button>
        ) : (
          <a
            href="/?phase=3"
            onClick={(e) => {
              if (dirty || busy) {
                e.preventDefault();
                void navigate(() => {
                  location.href = '/?phase=3';
                });
              }
            }}
          >
            Calendar
          </a>
        )}
        <span className={styles.local} role="status">
          {status}
        </span>
        {!sea && (
          <button
            className={styles.toolbarSend}
            disabled={sent || busy}
            onClick={() => void send()}
          >
            Send to sea
          </button>
        )}
      </header>
      <div className={styles.title}>
        <div>
          <h1>{sea ? 'Sea adventure' : 'A message in a bottle'}</h1>
          {!sea && <p>Keep the little things. Let them find you again.</p>}
        </div>
        {!sea && <button onClick={() => setHelp(true)}>How it works</button>}
      </div>
      {!sea && (
        <nav className={styles.switch} aria-label="Notebook sections">
          <button aria-current="page">Notebook</button>
          <button onClick={() => void navigate(() => setSea(true))}>Sea adventure</button>
        </nav>
      )}
      {sea ? (
        <>
          <div className={styles.filters} aria-label="Bottle filters">
            <button
              aria-pressed={filter.best}
              onClick={() => setFilter({ ...filter, best: !filter.best })}
            >
              Best things
            </button>
            {(['both', 'small', 'big'] as const).map((size) => (
              <button
                key={size}
                aria-pressed={filter.size === size}
                onClick={() => setFilter({ ...filter, size })}
              >
                {size === 'both' ? 'All bottles' : size === 'small' ? 'Small' : 'Big'}
              </button>
            ))}
            <label>
              Review date
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
              />
            </label>
            {filter.date && (
              <button onClick={() => setFilter({ ...filter, date: '' })}>Clear date</button>
            )}
          </div>
          <div className={styles.water}>
            <div
              className={styles.wave}
              style={{ backgroundImage: waterTexture(300, 200, '#2f7fb3', '#143f5e', 34, 5) }}
            />
            <div
              className={styles.waveTwo}
              style={{ backgroundImage: waterTexture(180, 120, '#3b8cc0', '#1a5278', 18, 3) }}
            />
            <div
              className={styles.waveThree}
              style={{ backgroundImage: waterTexture(120, 80, '#4a98cc', '#1d5c85', 14, 2.4) }}
            />
            <div className={styles.waterShade} />
            <div className={styles.wake} />
            <div className={styles.ship} dangerouslySetInnerHTML={{ __html: shipArt }} />
            {bottles.map((b, i) => (
              <button
                key={`${b.date}-${b.big}-${b.message}`}
                className={`${styles.bottle} ${b.big ? styles.big : ''}`}
                style={{
                  left: `${8 + ((i * 29) % 80)}%`,
                  top: `${8 + ((i * 19) % 65)}%`,
                  animationDelay: `${i * 0.35}s`,
                }}
                aria-label={`${b.big ? 'Whole day' : 'One message'} bottle ${b.date}`}
                disabled={busy}
                onClick={async () => {
                  const all = messages(projection.store.getState(), b.date, filter.best);
                  if (
                    !filter.date &&
                    !(await commit(
                      {
                        type: 'putMany',
                        entities: [openBottleHistory(projection.store.getState(), b.date, today())],
                      },
                      'Bottle opened · Saved locally',
                    ))
                  )
                    return;
                  setBottles((old) => old.filter((x) => x !== b));
                  setOpened({
                    bottle: b,
                    lines: b.big ? all : all.slice(b.message, b.message + 1),
                  });
                }}
              >
                <span dangerouslySetInnerHTML={{ __html: bottleArt }} />
                <span className={styles.bottleDate}>{b.date}</span>
              </button>
            ))}
            {!bottles.length && (
              <p className={styles.noBottles}>
                No bottles yet.
                <br />
                <span>
                  {filter.date
                    ? 'No sent messages match these filters.'
                    : 'Write for a few days and come back for bottles later, when you have enough to look back on.'}
                </span>
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className={styles.datebar}>
            <button
              aria-label="Previous day"
              disabled={busy}
              onClick={() =>
                void navigate(() => {
                  setDate(shiftDate(date, -1));
                  setEditing(false);
                })
              }
            >
              ‹
            </button>
            <label>
              <span className={styles.dateText}>{dateLabel(date)}</span>
              <input
                aria-label="Notebook date"
                type="date"
                value={date}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value)
                    void navigate(() => {
                      setDate(value);
                      setEditing(false);
                    });
                }}
              />
            </label>
            <button
              aria-label="Next day"
              disabled={busy}
              onClick={() =>
                void navigate(() => {
                  setDate(shiftDate(date, 1));
                  setEditing(false);
                })
              }
            >
              ›
            </button>
          </div>
          {sent && (
            <div className={styles.sentNotice}>
              You have sent this day’s message.
              <button onClick={() => setEditing(true)}>Edit</button>
            </div>
          )}
          <div className={`${styles.spread} ${sent ? styles.sent : ''}`}>
            <div className={styles.paper}>
              <div className={styles.paperHeading}>
                <span>THE LITTLE THINGS</span>
                <span>{rows.length} moments</span>
              </div>
              {[...rows, { id: 'new', text: '', raw: {} } as Line].map((line, i) => (
                <div key={line.id} className={styles.row}>
                  <div className={styles.writing}>
                    <input
                      ref={line.id === 'new' ? newInput : undefined}
                      aria-label={line.id === 'new' ? 'Write a new line' : `Notebook line ${i + 1}`}
                      placeholder={line.id === 'new' ? 'Write what you did today…' : ''}
                      value={drafts[line.id] ?? line.text}
                      disabled={sent}
                      readOnly={busy}
                      onChange={(e) => draft(line.id, e.target.value)}
                      onBlur={() => {
                        if (draftsRef.current[line.id] !== undefined) void flush();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void flush().then((ok) => {
                            if (ok) newInput.current?.focus();
                          });
                        }
                      }}
                    />
                    {typeof line.raw.d === 'string' && (
                      <small>
                        {(object(state.entities['deck:' + line.raw.d] as unknown as Json)
                          .name as string) ?? ''}
                        {typeof line.raw.dur === 'number' ? ` · ${line.raw.dur}m` : ''}
                      </small>
                    )}
                    {line.moment && (
                      <a
                        className={styles.bestLink}
                        href={`/?phase=3&date=${date}`}
                        onClick={(e) => {
                          e.preventDefault();
                          void navigate(() => {
                            location.href = `/?phase=3&date=${date}`;
                          });
                        }}
                      >
                        {line.moment.featured ? 'Best thing' : 'Notebook moment'}
                        {line.moment.activity ? ' · View activity' : ''}
                      </a>
                    )}
                  </div>
                  <button
                    className={styles.doodle}
                    aria-label={`Draw beside ${line.id === 'new' ? 'new line' : `line ${i + 1}`}`}
                    disabled={sent || busy}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={async () => {
                      const newText = line.id === 'new' ? draftsRef.current.new : undefined;
                      if (!(await flush())) return;
                      const currentRows = linesFor(projection.store.getState(), date);
                      const l = newText?.trim()
                        ? currentRows.at(-1)
                        : currentRows.find((r) => r.id === line.id);
                      const sk = Array.isArray(l?.raw.sk) ? l.raw.sk : [];
                      setDrawing({ id: l?.id ?? line.id, value: sk, original: sk });
                    }}
                  >
                    {(Array.isArray(line.raw.sk) && line.raw.sk.length) || line.raw.dd ? (
                      <Preview raw={line.raw} page={page} db={db} />
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="m4 20 1-4L16 5l3 3L8 19z" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.paper}>
              <div className={styles.paperHeading}>A LITTLE SPACE TO DRAW</div>
              <p className={styles.paperLabel}>Draw your day here</p>
              <div className={styles.free}>
                <Sketch
                  value={free ?? page.strokes}
                  label="Day drawing"
                  active={guard && !sent && !busy}
                  onChange={(value) => {
                    setFreeDraft(value);
                    void flush();
                  }}
                />
                {!guard && !sent && (
                  <button className={styles.drawGuard} onClick={() => setGuard(true)}>
                    Draw your day here
                  </button>
                )}
              </div>
              {!page.strokes.length &&
                free === null &&
                typeof object(page.legacy).draw === 'string' && (
                  <Preview raw={{ dd: object(page.legacy).draw! }} page={page} db={db} />
                )}
              {guard && !sent && (
                <div className={styles.actions}>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      if (await flush()) setGuard(false);
                    }}
                  >
                    Save drawing
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setFreeDraft(null);
                      setGuard(false);
                    }}
                  >
                    Cancel drawing
                  </button>
                </div>
              )}
            </div>
          </div>
          <footer className={styles.footer}>
            <span>Write in place. Press Enter to keep a line.</span>
            {sendButton}
          </footer>
          <button className={styles.seaCard} onClick={() => void navigate(() => setSea(true))}>
            <span dangerouslySetInnerHTML={{ __html: seaArt }} />
            <span>Go on a sea adventure</span>
          </button>
        </>
      )}
      {!sea && (
        <div className={styles.recovery}>
          {!!Object.keys(drafts).length && (
            <button disabled={busy} onClick={() => void flush()}>
              Save changes
            </button>
          )}
          <button
            disabled={!undo || busy || dirty}
            onClick={() => void commit({ type: 'restore', deletion: undo }, 'Restored locally')}
          >
            Undo last change
          </button>
          <button onClick={() => setRecovery(!recovery)}>Recent changes · 30 days</button>
          {recovery &&
            Object.values(state.trash)
              .filter((t) => t.expiresAt > Date.now())
              .reverse()
              .map((t) => (
                <button
                  disabled={busy || dirty}
                  key={t.command}
                  onClick={() =>
                    void commit({ type: 'restore', deletion: t.command }, 'Restored locally')
                  }
                >
                  Restore {new Date(t.deletedAt).toLocaleString('en')} ·{' '}
                  {Object.keys(t.after).join(', ')}
                </button>
              ))}
        </div>
      )}
      {drawing && (
        <Modal title="Your doodle" close={() => setDrawing(null)}>
          <p>{rows.find((l) => l.id === drawing.id)?.text}</p>
          <Sketch
            value={drawing.value}
            label="Doodle canvas"
            square
            active={!busy}
            onChange={(value) => setDrawing({ ...drawing, value })}
          />
          <div className={styles.actions}>
            <button disabled={busy} onClick={() => void saveDoodle()}>
              Done
            </button>
            <button disabled={busy} onClick={() => setDrawing(null)}>
              Cancel
            </button>
          </div>
          {canonical(drawing.value) !== canonical(drawing.original) && (
            <small>Unsaved drawing · Done keeps it, Cancel discards it.</small>
          )}
        </Modal>
      )}
      {help && (
        <Modal title="How it works" close={() => setHelp(false)}>
          <p>
            Write the little things from your day and doodle beside them. Send the page to sea when
            you are done. After five sent days, bottles from your past drift back. Small bottles
            hold one message; big bottles hold a day. An opened day rests until next month. Review a
            date any time.
          </p>
          <button onClick={() => setHelp(false)}>Got it</button>
        </Modal>
      )}
      {opened && (
        <Modal title={dateLabel(opened.bottle.date)} close={() => setOpened(null)}>
          <div className={styles.bottlePaper}>
            {opened.lines.map((line) => (
              <div key={line.id}>
                <p>{line.text}</p>
                <Preview raw={line.raw} page={pageFor(state, opened.bottle.date)} db={db} />
              </div>
            ))}
          </div>
          <button onClick={() => setOpened(null)}>Close</button>
        </Modal>
      )}
      {sailing && (
        <div className={styles.sailing} aria-hidden="true">
          <span dangerouslySetInnerHTML={{ __html: bottleArt }} />
        </div>
      )}
    </main>
  );
}

export async function startNotebook(root: Root) {
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
      root.render(<Notebook projection={projection} db={db} />);
      await new Promise<void>(() => {});
    } catch {
      message('Storage validation failed. Existing data is retained; export/recovery is required.');
    }
  });
}
