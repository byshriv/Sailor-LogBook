import {
  blankLogbook,
  canonical,
  entityKey,
  safeId,
  splitMidnight,
  validateLogbook,
  wallDate,
} from '../../domain/src/logbook.ts';
import type { Entity, Json, Logbook, Task } from '../../domain/src/logbook.ts';
import type { LogbookStore } from './logbook.ts';
import { sha256, textDigest } from './media.ts';

type ObjectJson = { [key: string]: Json };
function object(value: Json | undefined): ObjectJson {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Expected legacy object');
  return value;
}
function list(value: Json | undefined): Json[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw Error('Expected legacy list');
  return value;
}
function text(value: Json | undefined): string {
  if (typeof value !== 'string') throw Error('Expected legacy text');
  return value;
}
function number(value: Json | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('Expected legacy number');
  return value;
}
function ref(value: Json | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  const id = text(value);
  safeId(id);
  return id;
}
export interface MigrationOptions {
  maxSourceBytes: number;
  maxAttachmentBytes: number;
  exclusion: Record<string, boolean>;
  orphanDecks?: Record<string, string | null>;
  cloudRevision?: string;
}
export interface MigrationPlan {
  schema: 2;
  raw: string;
  digest: string;
  state: Logbook;
  stateDigest: string;
  counts: Record<string, number>;
  review: string[];
  unknown: string[];
  blobs: { id: string; digest: string; blob: Blob; paths: string[] }[];
}
const known = [
  'name',
  'full',
  'av',
  'ob',
  'out',
  'docks',
  'entries',
  'tasks',
  'best',
  'mood',
  'order',
  'hide',
  'rorder',
  'rhide',
  'nb',
  'bt',
  'pf',
  'pre',
  'les',
  'grat',
  'sync',
  'ach',
  'seen',
];
// Read-only preview; never opens storage, downloads a file or touches the legacy origin.
export async function previewV8(raw: string, options: MigrationOptions): Promise<MigrationPlan> {
  if (
    !Number.isSafeInteger(options.maxSourceBytes) ||
    options.maxSourceBytes <= 0 ||
    !Number.isSafeInteger(options.maxAttachmentBytes) ||
    options.maxAttachmentBytes <= 0 ||
    new TextEncoder().encode(raw).byteLength > options.maxSourceBytes
  )
    throw Error('Source size limit');
  const source = object(JSON.parse(raw) as Json),
    state = blankLogbook();
  // Reject wrong backup/envelope types instead of quietly treating them as empty data.
  if (!Array.isArray(source.entries) || !Array.isArray(source.docks))
    throw Error('Expected unencrypted v8 state backup');
  const review: string[] = [],
    counts: Record<string, number> = {},
    blobs: MigrationPlan['blobs'] = [];
  const deckIds = new Set(list(source.docks).map((d) => text(object(d).id)));
  const deckRef = (value: Json | undefined): string | null => {
    const id = ref(value);
    if (id === null || deckIds.has(id)) return id;
    if (options.orphanDecks && Object.hasOwn(options.orphanDecks, id)) {
      const target = options.orphanDecks[id]!;
      if (target !== null && !deckIds.has(target)) throw Error('Invalid orphan reassignment');
      return target;
    }
    if (!review.includes('deck-reference:' + id)) review.push('deck-reference:' + id);
    return null;
  };
  const add = (e: Entity) => {
    safeId(e.id);
    const k = entityKey(e);
    if (state.entities[k]) throw Error('Duplicate legacy ID');
    state.entities[k] = e;
    counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  };
  for (const value of list(source.docks)) {
    const d = object(value),
      id = text(d.id),
      name = text(d.n);
    const explicit = options.exclusion[id];
    // Names cannot establish the meaning of a renamed category. Review each non-default deck once.
    if (name !== 'Time Wasted' && typeof explicit !== 'boolean') review.push('exclusion:' + id);
    add({
      kind: 'deck',
      id,
      name,
      parent: deckRef(d.p),
      excludeFromStreak: explicit ?? name === 'Time Wasted',
      legacy: value,
    });
  }
  for (const value of list(source.entries)) {
    const e = object(value);
    add({
      kind: 'activity',
      id: text(e.id),
      title: text(e.t),
      deck: deckRef(e.d),
      zone: typeof e.zone === 'string' ? e.zone : null,
      segments: splitMidnight(
        text(e.date),
        number(e.s),
        number(e.e),
        typeof e.offset === 'number' ? e.offset : null,
      ),
      attachments: [],
      legacy: value,
    });
  }
  for (const value of list(source.tasks)) {
    const t = object(value);
    add({
      kind: 'task',
      id: text(t.id),
      title: text(t.t),
      date: text(t.date),
      deck: deckRef(t.d),
      status: text(t.st) as Task['status'],
      time: t.time == null ? null : number(t.time),
      duration: t.dur == null ? null : number(t.dur),
      must: !!t.must,
      history: [],
      legacy: value,
    });
  }
  const best = list(source.best).map(object),
    byDate = new Map<string, number>();
  for (const b of best) byDate.set(text(b.date), (byDate.get(text(b.date)) ?? 0) + 1);
  for (const [date, count] of byDate) if (count > 4) review.push('featured:' + date);
  for (const b of best) {
    const original = ref(b.ref),
      activity = original && state.entities['activity:' + original] ? original : null;
    // v8 leaves best-thing text after an activity is deleted. Retain its provenance in legacy.
    if (original && activity === null) review.push('unlinked-moment:' + text(b.id));
    add({
      kind: 'moment',
      id: text(b.id),
      date: text(b.date),
      text: text(b.t),
      activity,
      featured: (byDate.get(text(b.date)) ?? 0) <= 4,
      legacy: b,
    });
  }
  for (const [date, value] of Object.entries(source.nb === undefined ? {} : object(source.nb))) {
    wallDate(date);
    const p = object(value);
    const lines = structuredClone(list(p.lines)),
      ids = new Set<string>();
    for (const line of lines) {
      const l = object(line),
        id = text(l.id);
      safeId(id);
      text(l.t);
      if (ids.has(id)) throw Error('Duplicate notebook line');
      ids.add(id);
    }
    add({ kind: 'page', id: date, date, lines, strokes: list(p.fsk), attachments: [], legacy: p });
  }
  // Overflow stays as moments AND notebook text while selection remains pending.
  for (const b of best) {
    const date = text(b.date),
      key = 'page:' + date;
    let p = state.entities[key];
    if (!p) {
      add({ kind: 'page', id: date, date, lines: [], strokes: [], attachments: [] });
      p = state.entities[key];
    }
    if (p?.kind === 'page' && !p.lines.some((line) => object(line).bt === b.id))
      p.lines.push({ id: 'best:' + text(b.id), t: text(b.t), bt: text(b.id) });
  }
  list(source.pre).forEach((value, i) => {
    const p = typeof value === 'string' ? { t: value } : object(value);
    add({
      kind: 'preset',
      id: typeof p.id === 'string' ? p.id : 'legacy-' + i,
      title: text(p.t),
      deck: deckRef(p.d),
      duration: p.dur == null ? 0 : number(p.dur),
      legacy: value,
    });
  });
  for (const field of ['les', 'grat'])
    for (const value of list(source[field])) {
      const r = object(value);
      wallDate(text(r.date));
      text(r.t);
      add({ kind: 'reflection', id: field + ':' + text(r.id), value });
    }
  for (const field of ['mood', 'ach', 'bt', 'seen'])
    if (source[field] !== undefined) add({ kind: 'history', id: field, value: source[field]! });
  const settings = Object.fromEntries(
    Object.entries(source).filter(
      ([k]) =>
        ![
          'docks',
          'entries',
          'tasks',
          'best',
          'nb',
          'pre',
          'les',
          'grat',
          'mood',
          'ach',
          'bt',
          'seen',
        ].includes(k),
    ),
  ) as ObjectJson;
  add({ kind: 'settings', id: 'legacy', value: settings });
  // All fields, conflicts, deletes, device preferences and exact raw bytes remain in the archive.
  state.archive = {
    version: 1,
    source,
    raw,
    cloudRevision: options.cloudRevision ?? null,
    exclusionReview: options.exclusion,
    orphanDecks: options.orphanDecks ?? {},
  };
  async function images(value: Json, path: string): Promise<void> {
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]*={0,2})$/.exec(
        value,
      );
      if (!match || !match[2] || match[2].length % 4) throw Error('Malformed legacy image');
      const binary = atob(match[2]);
      if (binary.length > options.maxAttachmentBytes) throw Error('Attachment size limit');
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0)),
        digest = await sha256(bytes.buffer);
      const previous = blobs.find((b) => b.id === digest);
      if (previous) previous.paths.push(path);
      else
        blobs.push({
          id: digest,
          digest,
          blob: new Blob([bytes], { type: match[1] }),
          paths: [path],
        });
      return;
    }
    if (value && typeof value === 'object')
      for (const [key, child] of Object.entries(value)) await images(child, path + '/' + key);
  }
  await images(source, '');
  for (const b of blobs)
    for (const path of b.paths) {
      const parts = path.split('/');
      let entity: Entity | undefined;
      if (parts[1] === 'entries')
        entity =
          state.entities['activity:' + text(object(list(source.entries)[Number(parts[2])]).id)];
      if (parts[1] === 'nb') entity = state.entities['page:' + parts[2]];
      if (entity?.kind === 'activity' || entity?.kind === 'page')
        if (!entity.attachments.includes(b.id)) entity.attachments.push(b.id);
    }
  validateLogbook(state);
  return {
    schema: 2,
    raw,
    digest: await textDigest(raw),
    state,
    stateDigest: await textDigest(canonical(state)),
    counts,
    review,
    unknown: Object.keys(source).filter((k) => !known.includes(k)),
    blobs,
  };
}
export async function migrateV8(
  store: LogbookStore,
  plan: MigrationPlan,
  generation: string,
  saveBackup: (raw: string, digest: string) => Promise<string>,
): Promise<Logbook> {
  const p = structuredClone(plan);
  safeId(generation);
  if (
    p.schema !== 2 ||
    (await textDigest(p.raw)) !== p.digest ||
    (await textDigest(canonical(p.state))) !== p.stateDigest
  )
    throw Error('Migration source/destination digest mismatch');
  // Re-preview decisions are authoritative; mutating a plan cannot bypass exclusion review.
  const archive = object(p.state.archive),
    decisions = object(archive.exclusionReview);
  const fresh = await previewV8(p.raw, {
    maxSourceBytes: new TextEncoder().encode(p.raw).length + 1,
    maxAttachmentBytes: Math.max(1, ...p.blobs.map((b) => b.blob.size)),
    exclusion: decisions as Record<string, boolean>,
    orphanDecks: object(archive.orphanDecks) as Record<string, string | null>,
    cloudRevision: typeof archive.cloudRevision === 'string' ? archive.cloudRevision : undefined,
  });
  if (canonical(fresh.state) !== canonical(p.state)) throw Error('Migration destination changed');
  if (fresh.review.some((r) => r.startsWith('exclusion:') || r.startsWith('deck-reference:')))
    throw Error('Deck exclusion/reference review required');
  if ((await saveBackup(p.raw, p.digest)) !== p.digest)
    throw Error('Source backup was not verified');
  const id = generation + ':' + p.digest;
  await store.stageMigration(id, p.raw, p.digest, fresh.state, fresh.blobs);
  const staged = await store.migration(id);
  if (
    !staged ||
    (await textDigest(staged.source)) !== p.digest ||
    canonical(staged.state) !== canonical(fresh.state)
  )
    throw Error('Staged migration mismatch');
  for (const b of staged.blobs)
    if ((await sha256(await b.blob.arrayBuffer())) !== b.digest)
      throw Error('Attachment digest mismatch');
  await store.activateMigration(id, p.digest);
  const reopened = await store.load();
  // On a repeated completed migration there may already be new edits. Never replace them.
  if (!staged.complete && canonical(reopened) !== canonical(fresh.state))
    throw Error('Destination verification failed');
  for (const b of fresh.blobs) {
    const saved = await store.attachment(b.id);
    if (!saved || (await sha256(await saved.blob.arrayBuffer())) !== b.digest)
      throw Error('Saved attachment mismatch');
  }
  return reopened;
}
