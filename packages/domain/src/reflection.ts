import type { Deck, Edit, Entity, Json, Logbook, Moment, Other, Task } from './logbook.ts';
import { loggedMinutes, wallDate } from './logbook.ts';
import { parseQuick, shiftDate } from './calendar.ts';
import { messages, object, sentDates } from './notebook.ts';

export const homeCards = ['must', 'best', 'mood', 'otd', 'stats', 'streak'];
export const reflectionCards = [
  'hs',
  'bs',
  'mood',
  'must',
  'heat',
  'les',
  'grat',
  'otd',
  'per',
  'ach',
  'rev',
];
export const moodLabels = ['Very low', 'Low', 'Okay', 'Good', 'Great'];
export const achievements = [
  ['Maiden Voyage', 'First day logged'],
  ['Bright Spot', 'First best thing'],
  ['Message Sent', 'First bottle sent to sea'],
  ['Fair Winds', '3 days of 2+ hours'],
  ['Open Sea', '7 days of 2+ hours'],
  ['Four Bells', '4 best things in one day'],
  ['Seasoned Sailor', '30 days of 2+ hours'],
] as const;
export function history(s: Logbook, id: string): Record<string, Json> {
  const e = s.entities['history:' + id];
  return object(e?.kind === 'history' ? e.value : null);
}
export function historyPut(s: Logbook, id: string, value: Json): Other {
  const e = s.entities['history:' + id];
  return { ...e, kind: 'history', id, value };
}
export function preferences(s: Logbook) {
  const e = s.entities['settings:legacy'];
  return object(e?.kind === 'settings' ? e.value : null);
}
export function layout(s: Logbook, reflection: boolean) {
  const p = preferences(s),
    defaults = reflection ? reflectionCards : homeCards;
  const order = p[reflection ? 'rorder' : 'order'];
  const hidden = p[reflection ? 'rhide' : 'hide'];
  const saved = Array.isArray(order)
    ? order.filter((k): k is string => typeof k === 'string' && defaults.includes(k))
    : [];
  return {
    order: [...new Set([...saved, ...defaults])],
    hidden: Array.isArray(hidden)
      ? hidden.filter((k): k is string => typeof k === 'string' && defaults.includes(k))
      : [],
  };
}
export function saveLayout(
  s: Logbook,
  reflection: boolean,
  order: string[],
  hidden: string[],
): Edit {
  const e = s.entities['settings:legacy'];
  return {
    type: 'put',
    entity: {
      ...e,
      kind: 'settings',
      id: 'legacy',
      value: {
        ...preferences(s),
        [reflection ? 'rorder' : 'order']: order,
        [reflection ? 'rhide' : 'hide']: hidden,
      },
    },
  };
}
export const moments = (s: Logbook, date?: string) =>
  Object.values(s.entities).filter(
    (e): e is Moment => e.kind === 'moment' && (!date || e.date === date),
  );
export function activityDates(s: Logbook): string[] {
  return [
    ...new Set(
      Object.values(s.entities).flatMap((e) =>
        e.kind === 'activity' ? e.segments.map((p) => p.date) : [],
      ),
    ),
  ].sort();
}
export function hoursStreak(s: Logbook, today: string): number {
  wallDate(today);
  let date = loggedMinutes(s, today, true) >= 120 ? today : shiftDate(today, -1),
    n = 0;
  while (loggedMinutes(s, date, true) >= 120) {
    n++;
    date = shiftDate(date, -1);
  }
  return n;
}
// Freezes bridge missing past days; they never add a day to the count. Today's
// unfinished day is free. Recompute after backfill, with a separate budget per month.
export function bestStreak(s: Logbook, today: string) {
  wallDate(today);
  const dates = new Set(
    moments(s)
      .filter((m) => m.featured && m.date <= today)
      .map((m) => m.date),
  );
  const first = [...dates].sort()[0];
  let count = 0;
  const used: Record<string, number> = {};
  if (first)
    for (let d = today; d >= first; d = shiftDate(d, -1)) {
      if (dates.has(d)) count++;
      else if (d !== today) {
        const month = d.slice(0, 7);
        if ((used[month] ?? 0) === 4) break;
        used[month] = (used[month] ?? 0) + 1;
      }
    }
  return { count, used, remaining: 4 - (used[today.slice(0, 7)] ?? 0) };
}
export function achievementState(s: Logbook, today: string) {
  const featured = moments(s).filter((m) => m.featured),
    h = hoursStreak(s, today);
  const conditions = [
    activityDates(s).some((d) => d <= today),
    featured.some((m) => m.date <= today),
    sentDates(s).some((d) => d <= today),
    h >= 3,
    h >= 7,
    featured.some((m) => m.date <= today && featured.filter((b) => b.date === m.date).length === 4),
    h >= 30,
  ];
  return Object.fromEntries(
    achievements.map(([name], i) => [name, !!history(s, 'ach')[name] || conditions[i]]),
  );
}
export function captureAchievements(s: Logbook, today: string): Other | null {
  const current = history(s, 'ach'),
    result = achievementState(s, today);
  return Object.keys(result).some((k) => result[k] && !current[k])
    ? historyPut(s, 'ach', {
        ...current,
        ...Object.fromEntries(
          Object.entries(result)
            .filter(([, v]) => v)
            .map(([k]) => [k, 1]),
        ),
      })
    : null;
}
export function moodEdit(s: Logbook, date: string, value: number | null): Edit {
  wallDate(date);
  if (value !== null && (!Number.isInteger(value) || value < 0 || value > 4))
    throw Error('Invalid mood');
  const moods = { ...history(s, 'mood') };
  if (value === null) delete moods[date];
  else moods[date] = value;
  return { type: 'put', entity: historyPut(s, 'mood', moods) };
}
export function moodAt(s: Logbook, date: string): number | null {
  const v = history(s, 'mood')[date];
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 4 ? v : null;
}
export interface ReviewItem {
  key: string;
  date: string;
  text: string;
  category: string;
  entity?: Entity;
}
export function reviewItems(s: Logbook, category = 'all'): ReviewItem[] {
  return Object.values(s.entities)
    .flatMap((e): ReviewItem[] => {
      if (e.kind === 'moment')
        return category === 'all' || category === 'best'
          ? [
              {
                key: 'moment:' + e.id,
                date: e.date,
                text: e.text,
                category: e.featured ? 'Best thing' : 'Notebook moment',
                entity: e,
              },
            ]
          : [];
      if (e.kind !== 'reflection') return [];
      const v = object(e.value),
        type = e.id.startsWith('les:') ? 'les' : e.id.startsWith('grat:') ? 'grat' : '';
      if (
        !type ||
        (category !== 'all' && category !== type) ||
        typeof v.t !== 'string' ||
        typeof v.date !== 'string'
      )
        return [];
      return [
        {
          key: 'reflection:' + e.id,
          date: v.date,
          text: v.t,
          category: type === 'les' ? 'Lesson' : 'Gratitude',
          entity: e,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
}
export function reflectionPut(
  s: Logbook,
  type: 'les' | 'grat',
  date: string,
  text: string,
  id: string,
): Other {
  wallDate(date);
  if (!text.trim()) throw Error('Write something first');
  const key = type + ':' + id,
    old = s.entities['reflection:' + key];
  return {
    ...old,
    kind: 'reflection',
    id: key,
    value: { ...object(old?.kind === 'reflection' ? old.value : null), id, date, t: text.trim() },
  };
}
export function periodSummary(s: Logbook, start: string, end: string) {
  const dates = activityDates(s).filter((d) => d >= start && d <= end);
  return {
    days: dates.length,
    minutes: dates.reduce((n, d) => n + loggedMinutes(s, d), 0),
    best: moments(s).filter((m) => m.featured && m.date >= start && m.date <= end).length,
  };
}
export function mustTasks(s: Logbook, date: string): Task[] {
  return Object.values(s.entities)
    .filter(
      (e): e is Task =>
        e.kind === 'task' && e.date === date && e.must && !['skip', 'nogo'].includes(e.status),
    )
    .sort((a, b) => (a.time ?? 1440) - (b.time ?? 1440));
}
// Home's small Add must-do action; board, rollover and Planner editors stay Phase 6.
export function addMustDo(s: Logbook, date: string, text: string, id: string, at: number): Edit {
  wallDate(date);
  const parsed = parseQuick(
    text,
    Object.values(s.entities).filter((e): e is Deck => e.kind === 'deck'),
  );
  if (!parsed.title) throw Error('Add a title');
  const deck =
    parsed.deck ??
    (parsed.query
      ? {
          kind: 'deck' as const,
          id: id + '-deck',
          name: parsed.query[0]!.toUpperCase() + parsed.query.slice(1),
          parent: null,
          excludeFromStreak: false,
        }
      : null);
  const entities: Entity[] = [];
  if (deck) entities.push({ ...deck, legacy: { ...object(deck.legacy), r: at } });
  entities.push({
    kind: 'task',
    id,
    title: parsed.title,
    date,
    deck: deck?.id ?? null,
    status: 'todo',
    time: null,
    duration: parsed.duration ?? 60,
    must: true,
    history: [],
  });
  return { type: 'putMany', entities };
}
export function onThisDay(s: Logbook, date: string): ReviewItem[] {
  const match = (d: string) => d.slice(5) === date.slice(5) && d < date;
  const items = reviewItems(s).filter((i) => match(i.date));
  for (const e of Object.values(s.entities)) {
    if (e.kind === 'activity')
      for (const p of e.segments)
        if (match(p.date))
          items.push({ key: e.id + p.date, date: p.date, text: e.title, category: 'Logged' });
    if (e.kind === 'task' && e.must && e.status === 'done' && match(e.date))
      items.push({ key: e.id, date: e.date, text: e.title, category: 'Must-do done' });
    if (e.kind === 'page' && match(e.date))
      for (const m of messages(s, e.date))
        if (m.text && !items.some((i) => i.date === e.date && i.text === m.text))
          items.push({ key: e.id + m.id, date: e.date, text: m.text, category: 'Bottle page' });
  }
  for (const d of Object.keys(history(s, 'mood'))) {
    const mood = moodAt(s, d);
    if (match(d) && mood !== null)
      items.push({
        key: 'mood:' + d,
        date: d,
        text: moodLabels[mood]! + ' mood',
        category: 'Mood',
      });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}
