import type { Deck, Entity, Json, Logbook, Moment, Other, Page } from './logbook.ts';
import { wallDate } from './logbook.ts';
import { parseQuick } from './calendar.ts';

export const object = (value: Json | undefined): Record<string, Json> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};
export interface Stroke {
  c: string;
  w: number;
  p: [number, number][];
}
export function strokes(value: Json[]): Stroke[] {
  return value.flatMap((raw) => {
    const s = object(raw);
    if (
      typeof s.c !== 'string' ||
      !/^#[0-9a-f]{6}$/i.test(s.c) ||
      typeof s.w !== 'number' ||
      s.w <= 0 ||
      s.w > 32 ||
      !Array.isArray(s.p)
    )
      return [];
    const p = s.p.filter(
      (q): q is [number, number] =>
        Array.isArray(q) &&
        q.length === 2 &&
        q.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1),
    );
    return p.length ? [{ c: s.c, w: s.w, p }] : [];
  });
}
export function pageFor(s: Logbook, date: string): Page {
  wallDate(date);
  const found = Object.values(s.entities).filter(
    (e): e is Page => e.kind === 'page' && e.date === date,
  );
  if (found.length > 1) throw Error('Multiple pages for this date need review');
  return structuredClone(
    found[0] ?? { kind: 'page', id: date, date, lines: [], strokes: [], attachments: [] },
  );
}
export interface Line {
  id: string;
  text: string;
  raw: Record<string, Json>;
  moment?: Moment;
}
export function linesFor(s: Logbook, date: string): Line[] {
  const page = pageFor(s, date);
  const moments = Object.values(s.entities).filter(
    (e): e is Moment => e.kind === 'moment' && e.date === date,
  );
  const linked = new Set<string>();
  const lines = page.lines.map((raw, i) => {
    const r = object(raw),
      moment = moments.find((m) => m.id === r.bt);
    if (moment) linked.add(moment.id);
    return {
      id: typeof r.id === 'string' ? r.id : `legacy-row-${i}`,
      text: moment?.text ?? (typeof r.t === 'string' ? r.t : ''),
      raw: r,
      moment,
    };
  });
  for (const moment of moments)
    if (!linked.has(moment.id))
      lines.push({ id: 'moment:' + moment.id, text: moment.text, raw: {}, moment });
  return lines;
}
// Edit only the target fields; retain all unrecognized legacy data and attachment references.
export function writeLine(
  s: Logbook,
  date: string,
  id: string,
  text: string,
  newId: string,
  at: number,
): Entity[] {
  const page = pageFor(s, date),
    line = linesFor(s, date).find((l) => l.id === id);
  const decks = Object.values(s.entities).filter((e): e is Deck => e.kind === 'deck');
  const parsed = parseQuick(text.trim(), decks),
    entities: Entity[] = [];
  let deck = parsed.deck;
  if (parsed.query && !deck) {
    deck = {
      kind: 'deck',
      id: newId + '-deck',
      name: parsed.query,
      parent: null,
      excludeFromStreak: false,
    };
  }
  if (deck) entities.push({ ...deck, legacy: { ...object(deck.legacy), r: at } });
  const raw = {
    ...line?.raw,
    id: line?.raw.id ?? (id === 'new' ? newId : id),
    t: parsed.title || text.trim(),
  };
  if (deck) Object.assign(raw, { d: deck.id });
  if (parsed.duration !== null) Object.assign(raw, { dur: parsed.duration });
  if (line?.moment) {
    Object.assign(raw, { bt: line.moment.id });
    entities.push({ ...line.moment, text: raw.t, featured: raw.t ? line.moment.featured : false });
  }
  const index = page.lines.findIndex((r, i) => (object(r).id ?? `legacy-row-${i}`) === id);
  const keep =
    !!raw.t ||
    !!object(raw).dd ||
    (Array.isArray(object(raw).sk) && (object(raw).sk as Json[]).length > 0) ||
    !!line?.moment;
  if (index >= 0) {
    if (keep) page.lines[index] = raw;
    else page.lines.splice(index, 1);
  } else if (keep) page.lines.push(raw);
  entities.push(page);
  return entities;
}
export function history(s: Logbook, id: string): Other {
  const e = s.entities['history:' + id];
  return structuredClone(
    e?.kind === 'history' ? e : { kind: 'history', id, value: id === 'bt' ? [] : {} },
  );
}
export const sentDates = (s: Logbook): string[] => {
  const value = history(s, 'bt').value;
  return Array.isArray(value)
    ? [...new Set(value.filter((d): d is string => typeof d === 'string'))]
    : [];
};
export function messages(s: Logbook, date: string, best = false): Line[] {
  const lines = linesFor(s, date).filter(
    (l) =>
      (l.text || l.raw.dd || (Array.isArray(l.raw.sk) && l.raw.sk.length)) &&
      (!best || (l.moment ? l.moment.featured : !!l.raw.bt)),
  );
  const page = pageFor(s, date);
  if (!best && !lines.length && (page.strokes.length || object(page.legacy).draw))
    lines.push({
      id: 'free',
      text: '',
      raw: { sk: page.strokes, dd: object(page.legacy).draw ?? '' },
    });
  return lines;
}
export function sendPage(s: Logbook, date: string): Other {
  if (!messages(s, date).length) throw Error('Write or draw something first');
  const h = history(s, 'bt');
  h.value = [...sentDates(s), ...(!sentDates(s).includes(date) ? [date] : [])];
  return h;
}
export interface SeaFilter {
  best: boolean;
  size: 'both' | 'small' | 'big';
  date: string;
}
export interface Bottle {
  date: string;
  big: boolean;
  message: number;
}
export function pickBottles(
  s: Logbook,
  today: string,
  filter: SeaFilter,
  random: () => number = Math.random,
): Bottle[] {
  wallDate(today);
  const sent = sentDates(s),
    seen = object(history(s, 'seen').value)[today.slice(0, 7)];
  if (filter.date) {
    wallDate(filter.date);
    if (!sent.includes(filter.date)) return [];
    const m = messages(s, filter.date, filter.best),
      out: Bottle[] = [];
    if (filter.size !== 'big')
      m.forEach((_, message) => out.push({ date: filter.date, big: false, message }));
    if (m.length && filter.size !== 'small') out.push({ date: filter.date, big: true, message: 0 });
    // Keep whole-day review reachable even when a page has more than ten messages.
    return out.length > 10 && filter.size === 'both'
      ? [...out.slice(0, 9), out[out.length - 1]!]
      : out.slice(0, 10);
  }
  if (sent.length < 5) return [];
  const pool = sent.filter(
    (d) => !(Array.isArray(seen) && seen.includes(d)) && messages(s, d, filter.best).length,
  );
  const out: Bottle[] = [],
    weight = (d: string) => 1 + Math.max(0, (Date.parse(today) - Date.parse(d)) / 86400000) / 20;
  while (pool.length && out.length < 10) {
    let r = random() * pool.reduce((n, d) => n + weight(d), 0),
      index = 0;
    for (; index < pool.length - 1; index++) {
      r -= weight(pool[index]!);
      if (r <= 0) break;
    }
    const date = pool.splice(index, 1)[0]!;
    out.push({
      date,
      big: filter.size === 'big' || (filter.size === 'both' && random() < 0.3),
      message: Math.floor(random() * messages(s, date, filter.best).length),
    });
  }
  return out;
}
export function openBottleHistory(s: Logbook, date: string, today: string): Other {
  const h = history(s, 'seen'),
    value = object(h.value),
    month = today.slice(0, 7),
    seen = value[month];
  h.value = { ...value, [month]: [...new Set([...(Array.isArray(seen) ? seen : []), date])] };
  return h;
}
