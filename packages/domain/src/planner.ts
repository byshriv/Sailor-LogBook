import type { Deck, Edit, Entity, Json, Logbook, Task } from './logbook.ts';
import { wallDate } from './logbook.ts';
import { parseQuick, shiftDate } from './calendar.ts';
import { object } from './notebook.ts';

export const statusLabels: Record<Task['status'], string> = {
  todo: 'To do',
  doing: 'Working on it',
  stuck: 'Stuck',
  done: 'Done',
  skip: 'Skipped',
  nogo: 'Not gonna do',
};
export const tasks = (s: Logbook): Task[] =>
  Object.values(s.entities)
    .filter((e): e is Task => e.kind === 'task')
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.time ?? 1440) - (b.time ?? 1440) ||
        a.id.localeCompare(b.id),
    );
export const unresolved = (s: Logbook, today: string): Task[] => {
  wallDate(today);
  return tasks(s).filter((t) => t.date < today && ['todo', 'doing', 'stuck'].includes(t.status));
};
export function plannerDates(anchor: string): string[] {
  wallDate(anchor);
  return Array.from({ length: 11 }, (_, i) => shiftDate(anchor, i - 3));
}
export function taskFlags(task: Task) {
  const l = object(task.legacy);
  return {
    wait: typeof l.wait === 'string' ? l.wait : null,
    low: !!l.low,
    voyage: !!l.voy,
    progress: typeof l.pct === 'number' ? Math.max(0, Math.min(100, l.pct)) : 0,
    manual: !!l.man,
  };
}
export interface TaskDraft {
  id: string;
  title: string;
  date: string;
  deck: string | null;
  time: number | null;
  duration: number | null;
  must: boolean;
  wait: string | null;
  low: boolean;
  voyage: boolean;
  progress: number;
  status: Task['status'];
  manual: boolean;
}
export function taskDraft(t: Task): TaskDraft {
  const f = taskFlags(t);
  return {
    id: t.id,
    title: t.title,
    date: t.date,
    deck: t.deck,
    time: t.time,
    duration: t.duration,
    must: t.must,
    wait: f.wait,
    low: f.low,
    voyage: f.voyage,
    progress: f.progress,
    status: t.status,
    manual: f.manual,
  };
}
const snapshot = (t: Task, action: string, at: number): Json => ({
  date: t.date,
  status: t.status,
  time: t.time,
  duration: t.duration,
  pct: taskFlags(t).progress,
  man: taskFlags(t).manual,
  action,
  at,
});
export function saveTask(s: Logbook, draft: TaskDraft, at: number): Edit {
  wallDate(draft.date);
  const old = s.entities['task:' + draft.id];
  if (old && old.kind !== 'task') throw Error('Invalid task');
  if (
    draft.time !== null &&
    (!Number.isInteger(draft.time) || draft.time < 0 || draft.time >= 1440)
  )
    throw Error('Invalid time');
  if (
    draft.duration !== null &&
    (!Number.isInteger(draft.duration) || draft.duration < 1 || draft.duration > 1440)
  )
    throw Error('Minutes must be 1–1440');
  if (!Number.isInteger(draft.progress) || draft.progress < 0 || draft.progress > 100)
    throw Error('Invalid progress');
  const parsed = parseQuick(
    draft.title,
    Object.values(s.entities).filter((e): e is Deck => e.kind === 'deck'),
  );
  if (!parsed.title) throw Error('Add a title');
  const deck =
    parsed.query !== null
      ? (parsed.deck ??
        (parsed.query
          ? {
              kind: 'deck' as const,
              id: draft.id + '-deck',
              name: parsed.query[0]!.toUpperCase() + parsed.query.slice(1),
              parent: null,
              excludeFromStreak: false,
            }
          : null))
      : null;
  const deckId = parsed.query !== null ? (deck?.id ?? null) : draft.deck;
  const selected = deck ?? (deckId ? s.entities['deck:' + deckId] : null);
  const entities: Entity[] = [];
  if (selected?.kind === 'deck')
    entities.push({ ...selected, legacy: { ...object(selected.legacy), r: at } });
  const changed =
    old?.kind === 'task' &&
    (old.date !== draft.date ||
      old.status !== draft.status ||
      taskFlags(old).manual !== draft.manual ||
      old.time !== draft.time ||
      old.duration !== (parsed.duration ?? draft.duration) ||
      taskFlags(old).progress !== draft.progress);
  entities.push({
    ...old,
    kind: 'task',
    id: draft.id,
    title: parsed.title,
    date: draft.date,
    deck: deckId,
    time: draft.time,
    duration: parsed.duration ?? draft.duration,
    must: draft.must,
    status: draft.status,
    history: [
      ...(old?.kind === 'task' ? old.history : []),
      ...(changed ? [snapshot(old, 'edit', at)] : []),
    ],
    legacy: {
      ...object(old?.legacy),
      wait: draft.wait,
      low: draft.low ? 1 : 0,
      voy: draft.voyage ? 1 : 0,
      pct: draft.progress,
      man: draft.manual ? 1 : 0,
    },
  });
  return { type: 'putMany', entities };
}
export function moveTask(t: Task, date: string, at: number, time = t.time): Edit {
  wallDate(date);
  if (time !== null && (!Number.isInteger(time) || time < 0 || time >= 1440))
    throw Error('Invalid time');
  if (date === t.date && time === t.time) throw Error('Choose a different date or time');
  return {
    type: 'putMany',
    entities: [{ ...t, date, time, history: [...t.history, snapshot(t, 'move', at)] }],
  };
}
// Review is a UI prerequisite. Never call this from startup or a clock effect.
export function reviewTask(
  t: Task,
  choice: 'rollover' | 'skip' | 'nogo',
  date: string,
  at: number,
  time: number | null = null,
): Edit {
  wallDate(date);
  if (!['todo', 'doing', 'stuck'].includes(t.status)) throw Error('This task is already resolved');
  if (choice === 'rollover' && date <= t.date) throw Error('Choose a date after the original day');
  const rolled = choice === 'rollover';
  if (rolled && time !== null && (!Number.isInteger(time) || time < 0 || time >= 1440))
    throw Error('Invalid time');
  return {
    type: 'putMany',
    entities: [
      {
        ...t,
        date: rolled ? date : t.date,
        time: rolled ? time : t.time,
        status: rolled ? 'todo' : choice,
        history: [
          ...t.history,
          {
            ...object(snapshot(t, choice, at)),
            ...(rolled ? { status: 'skip', previousStatus: t.status } : {}),
          },
        ],
        legacy: { ...object(t.legacy), man: rolled && time !== null ? 0 : 1 },
      },
    ],
  };
}
export function taskHistory(t: Task) {
  return t.history.flatMap((h, index) => {
    const v = object(h);
    if (typeof v.date !== 'string' || typeof v.status !== 'string') return [];
    try {
      wallDate(v.date);
    } catch {
      return [];
    }
    return [
      {
        index,
        date: v.date,
        status: v.status,
        action: typeof v.action === 'string' ? v.action : 'Earlier status',
      },
    ];
  });
}
