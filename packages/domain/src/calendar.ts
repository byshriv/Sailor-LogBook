import type { Activity, Deck, Entity, Logbook, Segment, Task } from './logbook.ts';
import { wallDate } from './logbook.ts';

export type View = 1 | 2 | 3 | 4 | 7 | 'month';
export const shiftDate = (date: string, days: number): string => {
  wallDate(date);
  return new Date(Date.parse(date + 'T00:00Z') + days * 86400000).toISOString().slice(0, 10);
};
export function viewDates(date: string, view: View, weekStart = 1): string[] {
  wallDate(date);
  const start = view === 'month' ? date.slice(0, 8) + '01' : date;
  const aligned =
    view === 7 || view === 'month'
      ? shiftDate(start, -((new Date(start + 'T12:00Z').getUTCDay() - weekStart + 7) % 7))
      : start;
  return Array.from({ length: view === 'month' ? 42 : view }, (_, i) => shiftDate(aligned, i));
}
export function parseQuick(text: string, decks: Deck[]) {
  let duration: number | null = null,
    query: string | null = null;
  const title = text
    .replace(/(^|\s)t(\d{1,4})(?=\s|$)/i, (_, space, n) => {
      duration = Number(n);
      return space;
    })
    .replace(/(^|\s)\+(\S*)/, (_, space, q) => {
      query = q;
      return space;
    })
    .replace(/\s+/g, ' ')
    .trim();
  const recent = (d: Deck) =>
    typeof d.legacy === 'object' &&
    d.legacy !== null &&
    !Array.isArray(d.legacy) &&
    typeof d.legacy.r === 'number'
      ? d.legacy.r
      : 0;
  const deck =
    query === null
      ? null
      : [...decks]
          .sort((a, b) => recent(b) - recent(a))
          .find((d) =>
            d.name
              .toLowerCase()
              .split(/\s+/)
              .some((w) => w.startsWith(query!.toLowerCase())),
          );
  if (duration !== null && (duration <= 0 || duration > 1440))
    throw Error('Duration must be 1–1440 minutes');
  return { title, duration, query: query as string | null, deck: deck ?? null };
}
export interface CalendarBlock {
  entity: Activity | Task;
  segment: number;
  date: string;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}
// Connected overlap groups share a lane count, so chained overlaps never cover each other.
export function dayBlocks(state: Logbook, date: string): CalendarBlock[] {
  const blocks: CalendarBlock[] = [];
  for (const e of Object.values(state.entities)) {
    if (e.kind === 'activity')
      e.segments.forEach((s, segment) => {
        if (s.date === date) blocks.push({ entity: e, segment, ...s, lane: 0, lanes: 1 });
      });
    if (
      e.kind === 'task' &&
      e.date === date &&
      e.time !== null &&
      !['skip', 'nogo'].includes(e.status)
    )
      blocks.push({
        entity: e,
        segment: 0,
        date,
        start: e.time,
        end: Math.min(1440, e.time + (e.duration ?? 60)),
        lane: 0,
        lanes: 1,
      });
  }
  blocks.sort(
    (a, b) => a.start - b.start || a.end - b.end || a.entity.id.localeCompare(b.entity.id),
  );
  let group: CalendarBlock[] = [],
    ends: number[] = [],
    until = -Infinity;
  const finish = () => {
    group.forEach((b) => (b.lanes = ends.length));
    group = [];
    ends = [];
  };
  for (const block of blocks) {
    if (block.start >= until) {
      finish();
      until = -Infinity;
    }
    let lane = ends.findIndex((end) => end <= block.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = block.end;
    block.lane = lane;
    group.push(block);
    until = Math.max(until, block.end);
  }
  finish();
  return blocks;
}
export function taskClockStatus(task: Task, date: string, minute: number): Task['status'] {
  const legacy = task.legacy;
  const manual = legacy && typeof legacy === 'object' && !Array.isArray(legacy) && legacy.man;
  if (manual || task.status !== 'todo' || task.time === null) return task.status;
  if (task.date > date || (task.date === date && minute < task.time)) return 'todo';
  return task.date === date && minute < task.time + (task.duration ?? 60) ? 'doing' : 'done';
}
export function interval(activity: Activity) {
  const first = activity.segments[0]!,
    last = activity.segments.at(-1)!;
  return {
    date: first.date,
    start: first.start,
    duration: last.end + (activity.segments.length - 1) * 1440 - first.start,
  };
}
// Offset resolution is explicit. Unknown legacy context stays unknown, including after travel.
// Gaps and repeated wall times require the editor's explicit offset; no silent DST guess.
export function zoneOffset(date: string, minute: number, zone: string): number {
  const target = Date.parse(date + 'T00:00Z') + minute * 60000;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const offsetAt = (instant: number) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
    );
    return (
      (Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`) -
        instant) /
      60000
    );
  };
  const offsets = new Set([-2, -1, 0, 1, 2].map((d) => offsetAt(target + d * 86400000)));
  const matches = [...offsets].filter((o) => offsetAt(target - o * 60000) === o);
  if (matches.length !== 1)
    throw Error(
      'This local time is missing or repeated. Set explicit UTC offsets in More Options.',
    );
  return matches[0]!;
}
export function calendarSegments(
  date: string,
  start: number,
  duration: number,
  zone: string | null,
  offsets?: { start: number; end: number },
): Segment[] {
  wallDate(date);
  if (
    !Number.isInteger(start) ||
    start < 0 ||
    start >= 1440 ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 1440
  )
    throw Error('Invalid calendar interval');
  const end = start + duration,
    endDate = shiftDate(date, Math.floor(end / 1440)),
    endMinute = end % 1440;
  const first = offsets?.start ?? (zone ? zoneOffset(date, start, zone) : null);
  const last = offsets?.end ?? (zone ? zoneOffset(endDate, endMinute, zone) : null);
  if (end <= 1440) return [{ date, start, end, offset: first, endOffset: last }];
  const boundary = zone ? zoneOffset(shiftDate(date, 1), 0, zone) : first;
  return [
    { date, start, end: 1440, offset: first, endOffset: boundary },
    { date: shiftDate(date, 1), start: 0, end: end - 1440, offset: boundary, endOffset: last },
  ];
}
export function reschedule(
  entity: Activity | Task,
  date: string,
  start: number,
  duration: number,
): Entity {
  if (entity.kind === 'task') return { ...entity, date, time: start, duration };
  return { ...entity, segments: calendarSegments(date, start, duration, entity.zone) };
}
