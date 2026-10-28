import type { Deck, Edit, Entity, Json, Logbook, Other, Preset } from './logbook.ts';
import { applyEdit, validateLogbook } from './logbook.ts';
import { object, messages } from './notebook.ts';
import { preferences } from './reflection.ts';

export function settings(s: Logbook) {
  const e = s.entities['settings:preferences'];
  return {
    snd: 1,
    hap: 1,
    ws: 0,
    h24: 1,
    dv: 1,
    dl: 30,
    st: 'home',
    rt: '21:00',
    rem: 1,
    ...object(preferences(s).pf),
    ...object(e?.kind === 'settings' ? e.value : null),
  } as Record<string, Json>;
}
export function profileEdit(s: Logbook, patch: Record<string, Json>): Edit {
  const e = s.entities['settings:legacy'];
  return {
    type: 'putMany',
    entities: [{ ...e, kind: 'settings', id: 'legacy', value: { ...preferences(s), ...patch } }],
  };
}
export function settingsEdit(s: Logbook, patch: Record<string, Json>): Edit {
  const p = { ...settings(s), ...patch };
  if (
    ![15, 30, 45, 60].includes(Number(p.dl ?? 30)) ||
    ![1, 2, 3, 4, 7, 'm'].includes((p.dv ?? 1) as string | number) ||
    !['home', 'cal', 'plan', 'note'].includes(String(p.st ?? 'home')) ||
    ![0, 1].includes(Number(p.ws ?? 0)) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(p.rt ?? '20:00'))
  )
    throw Error('Invalid preferences');
  const e = s.entities['settings:preferences'];
  return { type: 'putMany', entities: [{ ...e, kind: 'settings', id: 'preferences', value: p }] };
}
export const decks = (s: Logbook) =>
  Object.values(s.entities).filter((e): e is Deck => e.kind === 'deck');
export function deckEdit(s: Logbook, draft: Deck): Edit {
  if (!draft.name.trim() || draft.name.length > 100)
    throw Error('Enter a deck name (up to 100 characters)');
  const old = s.entities['deck:' + draft.id];
  const entity: Deck = {
    ...old,
    ...draft,
    name: draft.name.trim(),
    legacy: { ...object(old?.legacy), ...object(draft.legacy) },
  };
  const next = structuredClone(s);
  next.entities['deck:' + entity.id] = entity;
  validateLogbook(next);
  return { type: 'putMany', entities: [entity] };
}
export function removeDeck(s: Logbook, id: string, reassign: string | null): Edit {
  const edit: Edit = { type: 'deck.remove', id, reassign };
  applyEdit(s, { id: 'validate-deck-removal', at: 0, edit });
  return edit;
}
export function presetEdit(s: Logbook, draft: Preset): Edit {
  if (!draft.title.trim() || draft.title.length > 500)
    throw Error('Enter a preset title (up to 500 characters)');
  const entity: Preset = {
    ...s.entities['preset:' + draft.id],
    ...draft,
    title: draft.title.trim(),
  };
  const next = structuredClone(s);
  next.entities['preset:' + entity.id] = entity;
  validateLogbook(next);
  return { type: 'putMany', entities: [entity] };
}
export function deckPath(s: Logbook, id: string): string {
  const d = s.entities['deck:' + id];
  return d?.kind === 'deck' ? (d.parent ? deckPath(s, d.parent) + ' / ' : '') + d.name : '';
}
export function deckRecords(s: Logbook, id: string): Entity[] {
  const within = (value: string | null): boolean => {
    if (!value) return false;
    if (value === id) return true;
    const d = s.entities['deck:' + value];
    return d?.kind === 'deck' ? within(d.parent) : false;
  };
  return Object.values(s.entities).filter((e) => 'deck' in e && within(e.deck));
}
export interface SearchResult {
  key: string;
  title: string;
  detail: string;
  href: string;
}
export function searchLogbook(s: Logbook, query: string): SearchResult[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];
  for (const e of Object.values(s.entities)) {
    if (e.kind === 'deck' || e.kind === 'preset') {
      const title = e.kind === 'deck' ? deckPath(s, e.id) : e.title;
      if (title.toLocaleLowerCase().includes(q))
        results.push({
          key: e.kind + ':' + e.id,
          title,
          detail: e.kind,
          href:
            '/?phase=7&' + (e.kind === 'deck' ? 'deck=' : 'editPreset=') + encodeURIComponent(e.id),
        });
    } else if (e.kind === 'activity' || e.kind === 'task') {
      const date = e.kind === 'activity' ? e.segments[0]!.date : e.date;
      const title = e.title,
        detail = `${e.kind} · ${date} · ${e.deck ? deckPath(s, e.deck) : 'No deck'}`;
      if ((title + ' ' + detail).toLocaleLowerCase().includes(q))
        results.push({
          key: e.kind + ':' + e.id,
          title,
          detail,
          href: `/?phase=${e.kind === 'task' ? 6 : 3}&date=${date}&item=${encodeURIComponent(e.id)}`,
        });
    } else if (e.kind === 'reflection') {
      const v = object(e.value),
        title = String(v.t ?? v.text ?? 'Reflection');
      if ((title + ' ' + String(v.date ?? '')).toLocaleLowerCase().includes(q))
        results.push({
          key: 'reflection:' + e.id,
          title,
          detail: 'Reflection',
          href:
            '/?phase=5&screen=reflection' +
            (typeof v.date === 'string' ? '&date=' + encodeURIComponent(v.date) : ''),
        });
    }
  }
  const dates = new Set(
    Object.values(s.entities).flatMap((e) =>
      e.kind === 'page' || e.kind === 'moment' ? [e.date] : [],
    ),
  );
  for (const date of dates)
    for (const [i, m] of messages(s, date).entries())
      if (m.text.toLocaleLowerCase().includes(q))
        results.push({
          key: `note:${date}:${i}`,
          title: m.text,
          detail: `Notebook · ${date}`,
          href: `/?phase=4&date=${date}`,
        });
  return results;
}
export function reminderDue(s: Logbook, now: Date): boolean {
  const p = settings(s),
    date = localDate(now),
    time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const marker = s.entities['history:reminder'];
  return (
    !!p.rem &&
    time === String(p.rt ?? '20:00') &&
    object(marker?.kind === 'history' ? marker.value : null).date !== date &&
    !Object.values(s.entities).some(
      (e) => e.kind === 'activity' && e.segments.some((segment) => segment.date === date),
    )
  );
}
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function reminderReceipt(date: string): Other {
  return { kind: 'history', id: 'reminder', value: { date } };
}
