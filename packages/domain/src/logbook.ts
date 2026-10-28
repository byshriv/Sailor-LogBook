// Versioned, framework-independent Phase 2 vocabulary. Phase 1 proof stays separate.
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Clock = Record<string, number>;
export type Kind =
  | 'deck'
  | 'activity'
  | 'task'
  | 'moment'
  | 'page'
  | 'preset'
  | 'reflection'
  | 'settings'
  | 'history';
export interface Base {
  id: string;
  kind: Kind;
  legacy?: Json;
}
export interface Deck extends Base {
  kind: 'deck';
  name: string;
  parent: string | null;
  excludeFromStreak: boolean;
}
export interface Segment {
  date: string;
  start: number;
  end: number;
  offset: number | null;
  endOffset?: number | null;
}
export interface Activity extends Base {
  kind: 'activity';
  title: string;
  deck: string | null;
  zone: string | null;
  segments: Segment[];
  attachments: string[];
}
export interface Task extends Base {
  kind: 'task';
  title: string;
  date: string;
  deck: string | null;
  status: 'todo' | 'doing' | 'stuck' | 'done' | 'skip' | 'nogo';
  time: number | null;
  duration: number | null;
  must: boolean;
  history: Json[];
}
export interface Moment extends Base {
  kind: 'moment';
  date: string;
  text: string;
  activity: string | null;
  featured: boolean;
}
export interface Page extends Base {
  kind: 'page';
  date: string;
  lines: Json[];
  strokes: Json[];
  attachments: string[];
}
export interface Preset extends Base {
  kind: 'preset';
  title: string;
  deck: string | null;
  duration: number;
}
export interface Other extends Base {
  kind: 'reflection' | 'settings' | 'history';
  value: Json;
}
export type Entity = Deck | Activity | Task | Moment | Page | Preset | Other;
export interface Trash {
  command: string;
  deletedAt: number;
  expiresAt: number;
  before: Record<string, Entity | null>;
  after: Record<string, Entity | null>;
  archiveBefore?: Json;
}
export interface Logbook {
  schema: 2;
  entities: Record<string, Entity>;
  trash: Record<string, Trash>;
  tombstones: Record<string, string>;
  archive: Json;
}
export type Edit =
  | { type: 'put'; entity: Entity }
  | { type: 'putMany'; entities: Entity[] }
  | { type: 'delete'; keys: string[] }
  | { type: 'restore'; deletion: string }
  | { type: 'deck.remove'; id: string; reassign: string | null }
  | { type: 'feature'; date: string; ids: string[] }
  | { type: 'recover'; snapshot: Logbook }
  | { type: 'rollover'; id: string; date: string; status: Task['status'] };
export interface EditCommand {
  id: string;
  at: number;
  edit: Edit;
}
export const blankLogbook = (): Logbook => ({
  schema: 2,
  entities: {},
  trash: {},
  tombstones: {},
  archive: null,
});
export function safeId(id: string): void {
  if (
    typeof id !== 'string' ||
    !id ||
    id.length > 200 ||
    ['__proto__', 'constructor', 'prototype'].includes(id)
  )
    throw Error('Invalid ID');
}
export const entityKey = (e: Pick<Entity, 'kind' | 'id'>): string => `${e.kind}:${e.id}`;
// New profile photos share the existing digest media store. Legacy data URLs stay intact.
export function attachmentIds(e: Entity): string[] {
  if (e.kind === 'activity' || e.kind === 'page') return e.attachments;
  if (
    e.kind === 'settings' &&
    e.id === 'legacy' &&
    e.value &&
    typeof e.value === 'object' &&
    !Array.isArray(e.value)
  ) {
    const digest = e.value.avatarDigest;
    if (digest == null) return [];
    if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))
      throw Error('Invalid profile photo digest');
    return [digest];
  }
  return [];
}
export function wallDate(date: string): void {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date
  )
    throw Error('Invalid wall date');
}
export function nextDate(date: string): string {
  wallDate(date);
  return new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
}
export function splitMidnight(
  date: string,
  start: number,
  end: number,
  offset: number | null = null,
): Segment[] {
  wallDate(date);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= 1440 ||
    end <= start ||
    end > start + 1440
  )
    throw Error('Invalid interval');
  return end <= 1440
    ? [{ date, start, end, offset }]
    : [
        { date, start, end: 1440, offset },
        { date: nextDate(date), start: 0, end: end - 1440, offset },
      ];
}
export function validateLogbook(s: Logbook): void {
  if (s.schema !== 2) throw Error('Unsupported schema');
  const decks = Object.values(s.entities).filter((e): e is Deck => e.kind === 'deck');
  const byId = new Map(decks.map((d) => [d.id, d]));
  const reference = (id: string | null) => {
    if (id !== null && !byId.has(id)) throw Error('Missing deck');
  };
  for (const [key, e] of Object.entries(s.entities)) {
    attachmentIds(e);
    safeId(e.id);
    if (key !== entityKey(e)) throw Error('Entity key mismatch');
    if (e.kind === 'deck') {
      if (typeof e.name !== 'string' || typeof e.excludeFromStreak !== 'boolean')
        throw Error('Invalid deck');
      let current: Deck | undefined = e;
      const seen = new Set<string>();
      while (current) {
        if (seen.has(current.id) || seen.size === 3) throw Error('Deck cycle/depth');
        seen.add(current.id);
        reference(current.parent);
        current = current.parent === null ? undefined : byId.get(current.parent);
      }
    } else if (e.kind === 'activity') {
      reference(e.deck);
      if (typeof e.title !== 'string' || e.segments.length < 1 || e.segments.length > 2)
        throw Error('Invalid activity');
      for (const p of e.segments) {
        wallDate(p.date);
        if (
          !Number.isFinite(p.start) ||
          !Number.isFinite(p.end) ||
          p.start < 0 ||
          p.end > 1440 ||
          p.end - (p.endOffset ?? p.offset ?? 0) <= p.start - (p.offset ?? 0) ||
          (p.offset !== null && (!Number.isInteger(p.offset) || Math.abs(p.offset) > 1440))
        )
          throw Error('Invalid segment');
        if (p.endOffset != null && (!Number.isInteger(p.endOffset) || Math.abs(p.endOffset) > 1440))
          throw Error('Invalid end offset');
      }
      if (e.segments.length === 2) {
        const [a, b] = e.segments as [Segment, Segment];
        if (a.end !== 1440 || b.start !== 0 || b.date !== nextDate(a.date))
          throw Error('Unlinked midnight segments');
      }
    } else if (e.kind === 'task') {
      wallDate(e.date);
      reference(e.deck);
      if (
        typeof e.title !== 'string' ||
        !['todo', 'doing', 'stuck', 'done', 'skip', 'nogo'].includes(e.status) ||
        (e.time !== null && (!Number.isFinite(e.time) || e.time < 0 || e.time >= 1440)) ||
        (e.duration !== null &&
          (!Number.isFinite(e.duration) || e.duration <= 0 || e.duration > 1440))
      )
        throw Error('Invalid task');
    } else if (e.kind === 'preset') {
      reference(e.deck);
      if (
        typeof e.title !== 'string' ||
        !Number.isFinite(e.duration) ||
        e.duration < 0 ||
        e.duration > 1440
      )
        throw Error('Invalid preset');
    } else if (e.kind === 'moment') {
      wallDate(e.date);
      if (
        typeof e.text !== 'string' ||
        (e.activity !== null && !s.entities['activity:' + e.activity])
      )
        throw Error('Invalid moment link');
    } else if (e.kind === 'page') {
      wallDate(e.date);
      if (!Array.isArray(e.lines) || !Array.isArray(e.strokes)) throw Error('Invalid page');
    } else if (!['reflection', 'settings', 'history'].includes(e.kind))
      throw Error('Invalid entity kind');
  }
  const featured = new Map<string, number>();
  for (const e of Object.values(s.entities))
    if (e.kind === 'moment' && e.featured) featured.set(e.date, (featured.get(e.date) ?? 0) + 1);
  if ([...featured.values()].some((n) => n > 4)) throw Error('Select at most four best things');
}
export function excluded(s: Logbook, deck: string | null): boolean {
  while (deck !== null) {
    const d = s.entities['deck:' + deck] as Deck | undefined;
    if (!d) throw Error('Missing deck');
    if (d.excludeFromStreak) return true;
    deck = d.parent;
  }
  return false;
}
export function loggedMinutes(s: Logbook, date: string, streak = false): number {
  const ranges = Object.values(s.entities)
    .filter((e): e is Activity => e.kind === 'activity' && (!streak || !excluded(s, e.deck)))
    .flatMap((e) => e.segments.filter((p) => p.date === date))
    .map((p) => ({ start: p.start - (p.offset ?? 0), end: p.end - (p.endOffset ?? p.offset ?? 0) }))
    .sort((a, b) => a.start - b.start);
  let end = -Infinity,
    total = 0;
  for (const r of ranges) {
    total += Math.max(0, r.end - Math.max(end, r.start));
    end = Math.max(end, r.end);
  }
  return total;
}
export function applyEdit(input: Logbook, c: EditCommand): Logbook {
  safeId(c.id);
  if (!Number.isSafeInteger(c.at) || c.at < 0) throw Error('Invalid command time');
  const s = structuredClone(input),
    before = structuredClone(s.entities),
    edit = c.edit;
  if (edit.type === 'putMany') {
    const keys = edit.entities.map(entityKey);
    if (!keys.length || new Set(keys).size !== keys.length) throw Error('Invalid compound put');
    for (const entity of edit.entities) {
      const key = entityKey(entity);
      if (s.tombstones[key]) throw Error('Restore deleted content explicitly');
      s.entities[key] = structuredClone(entity);
    }
  } else if (edit.type === 'put') {
    const key = entityKey(edit.entity);
    if (s.tombstones[key]) throw Error('Restore deleted content explicitly');
    s.entities[key] = structuredClone(edit.entity);
  } else if (edit.type === 'restore') {
    const t = s.trash[edit.deletion];
    if (!t || c.at >= t.expiresAt) throw Error('Recovery expired');
    for (const [key, value] of Object.entries(t.after))
      if (
        canonical(s.entities[key] ?? null) !== canonical(value) ||
        (value === null && s.tombstones[key] !== edit.deletion)
      )
        throw Error('Restore needs review: content changed');
    for (const [key, value] of Object.entries(t.before)) {
      if (value) {
        s.entities[key] = value;
        delete s.tombstones[key];
      } else {
        delete s.entities[key];
        // Undoing a snapshot addition is itself a new causal deletion. Retain the
        // barrier so a stale put cannot resurrect content removed by that Undo.
        s.tombstones[key] = c.id;
      }
    }
    if (Object.hasOwn(t, 'archiveBefore')) s.archive = structuredClone(t.archiveBefore!);
    delete s.trash[edit.deletion];
  } else if (edit.type === 'delete') {
    for (const key of edit.keys) {
      if (!s.entities[key]) throw Error('Missing deletion target');
      delete s.entities[key];
    }
    // A removed featured moment leaves its notebook text intact; a removed activity unlinks moments.
    for (const e of Object.values(s.entities))
      if (e.kind === 'moment' && e.activity && !s.entities['activity:' + e.activity])
        e.activity = null;
  } else if (edit.type === 'deck.remove') {
    if (!s.entities['deck:' + edit.id] || edit.reassign === edit.id)
      throw Error('Invalid reassignment');
    delete s.entities['deck:' + edit.id];
    for (const e of Object.values(s.entities)) {
      if (e.kind === 'deck' && e.parent === edit.id) e.parent = edit.reassign;
      if ((e.kind === 'activity' || e.kind === 'task' || e.kind === 'preset') && e.deck === edit.id)
        e.deck = edit.reassign;
    }
  } else if (edit.type === 'feature') {
    if (
      new Set(edit.ids).size !== edit.ids.length ||
      edit.ids.length > 4 ||
      edit.ids.some((id) => {
        const e = s.entities['moment:' + id];
        return e?.kind !== 'moment' || e.date !== edit.date;
      })
    )
      throw Error('Invalid feature selection');
    for (const e of Object.values(s.entities))
      if (e.kind === 'moment' && e.date === edit.date) e.featured = edit.ids.includes(e.id);
  } else if (edit.type === 'recover') {
    validateLogbook(edit.snapshot);
    s.entities = structuredClone(edit.snapshot.entities);
    s.archive = structuredClone(edit.snapshot.archive);
    for (const key of Object.keys(s.entities)) delete s.tombstones[key];
  } else if (edit.type === 'rollover') {
    const task = s.entities['task:' + edit.id];
    if (task?.kind !== 'task') throw Error('Missing task');
    task.history.push({ date: task.date, status: task.status });
    task.date = edit.date;
    task.status = edit.status;
  } else throw Error('Unknown edit');
  if (
    edit.type === 'delete' ||
    edit.type === 'deck.remove' ||
    edit.type === 'feature' ||
    edit.type === 'recover' ||
    edit.type === 'putMany' ||
    (edit.type === 'put' && before[entityKey(edit.entity)])
  ) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(s.entities)])].filter(
      (k) => canonical(before[k] ?? null) !== canonical(s.entities[k] ?? null),
    );
    if (
      keys.length ||
      (edit.type === 'recover' && canonical(s.archive) !== canonical(input.archive))
    ) {
      s.trash[c.id] = {
        command: c.id,
        deletedAt: c.at,
        expiresAt: c.at + 30 * 86400000,
        before: Object.fromEntries(keys.map((k) => [k, before[k] ?? null])),
        after:
          edit.type === 'putMany'
            ? structuredClone(Object.fromEntries(keys.map((k) => [k, s.entities[k] ?? null])))
            : Object.fromEntries(keys.map((k) => [k, s.entities[k] ?? null])),
        ...(edit.type === 'recover' ? { archiveBefore: structuredClone(input.archive) } : {}),
      };
      for (const key of keys) if (!s.entities[key]) s.tombstones[key] = c.id;
    }
  }
  validateLogbook(s);
  return s;
}
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k]))
      .join(',') +
    '}'
  );
}
