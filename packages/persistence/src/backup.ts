import { attachmentIds, canonical, validateLogbook } from '../../domain/src/logbook.ts';
import type { Json, Logbook } from '../../domain/src/logbook.ts';
import type { LogbookStore } from './logbook.ts';
import { sha256, textDigest } from './media.ts';
import { previewV8 } from './migration.ts';

export const backupLimit = 64 * 1024 * 1024;
type Media = { id: string; digest: string; blob: Blob };
interface WireMedia {
  id: string;
  type: string;
  data: string;
}
interface Payload {
  state: Logbook;
  media: WireMedia[];
}
export interface ImportPreview {
  state: Logbook;
  media: Media[];
  source: string;
  review: string[];
  legacy: boolean;
}
function encode(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
export async function exportBackup(db: LogbookStore) {
  // One consistent transaction includes media retained by trash/recovery, not only live references.
  const retained = await db.exportRetained();
  const state = await db.load();
  const head = retained.meta!.values.find((v: any) => v?.state && v?.actor) as { state: Logbook };
  if (canonical(head.state) !== canonical(state))
    throw Error('Logbook changed during export; retry');
  const media: WireMedia[] = [];
  for (const value of retained.blobs!.values) {
    const b = value as Media;
    const bytes = await b.blob.arrayBuffer();
    if (b.id !== b.digest || (await sha256(bytes)) !== b.id) throw Error('Corrupt retained media');
    media.push({ id: b.id, type: b.blob.type, data: encode(new Uint8Array(bytes)) });
  }
  const payload: Payload = { state, media };
  const raw = JSON.stringify({
    format: 'sailor-logbook',
    version: 1,
    schema: 2,
    createdAt: new Date().toISOString(),
    digest: await textDigest(canonical(payload)),
    payload,
  });
  if (new TextEncoder().encode(raw).length > backupLimit)
    throw Error('Backup exceeds 64 MiB transfer limit; retained data is unchanged');
  await previewBackup(raw);
  return raw;
}
export async function previewBackup(
  raw: string,
  exclusion: Record<string, boolean> = {},
  orphanDecks: Record<string, string | null> = {},
): Promise<ImportPreview> {
  if (new TextEncoder().encode(raw).length > backupLimit)
    throw Error('Backup exceeds 64 MiB transfer limit');
  const value = JSON.parse(raw);
  if (value?.format !== 'sailor-logbook') {
    const p = await previewV8(raw, {
      maxSourceBytes: backupLimit,
      maxAttachmentBytes: 8 * 1024 * 1024,
      exclusion,
      orphanDecks,
    });
    return {
      state: p.state,
      media: p.blobs,
      source: raw,
      review: [...p.review, ...p.unknown.map((k) => 'Retained unknown field: ' + k)],
      legacy: true,
    };
  }
  if (value.version !== 1 || value.schema !== 2)
    throw Error('Unsupported backup version; use a compatible app');
  const p = value.payload as Payload;
  if ((await textDigest(canonical(p))) !== value.digest) throw Error('Backup checksum mismatch');
  validateLogbook(p.state);
  if (!Array.isArray(p.media)) throw Error('Missing media list');
  const media: Media[] = [],
    ids = new Set<string>();
  for (const b of p.media) {
    if (
      !/^[a-f0-9]{64}$/.test(b.id) ||
      ids.has(b.id) ||
      typeof b.type !== 'string' ||
      typeof b.data !== 'string' ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.data)
    )
      throw Error('Invalid backup media');
    const bytes = Uint8Array.from(atob(b.data), (c) => c.charCodeAt(0));
    if ((await sha256(bytes.buffer)) !== b.id) throw Error('Media checksum mismatch');
    ids.add(b.id);
    media.push({ id: b.id, digest: b.id, blob: new Blob([bytes], { type: b.type }) });
  }
  for (const e of Object.values(p.state.entities))
    for (const id of attachmentIds(e)) if (!ids.has(id)) throw Error('Backup attachment missing');
  return { state: p.state, media, source: raw, review: [], legacy: false };
}
export function planImport(
  current: Logbook,
  incoming: ImportPreview,
  mode: 'merge' | 'replace',
  choices: Record<string, 'local' | 'incoming'> = {},
) {
  const next = structuredClone(current),
    conflicts: string[] = [];
  if (mode === 'replace') {
    next.entities = structuredClone(incoming.state.entities);
    next.archive = { version: 2, imported: incoming.state as unknown as Json };
  } else {
    for (const [key, entity] of Object.entries(incoming.state.entities)) {
      const collision =
        (next.entities[key] && canonical(next.entities[key]) !== canonical(entity)) ||
        next.tombstones[key];
      if (collision && !choices[key]) conflicts.push(key);
      if (!collision || choices[key] === 'incoming') next.entities[key] = structuredClone(entity);
    }
    // Entire incoming copy remains recoverable, including colliding records and opaque archives.
    next.archive = { version: 2, local: next.archive, imported: incoming.state as unknown as Json };
  }
  // Recover is an explicit restore; existing tombstones/trash stay in the causal local history.
  for (const key of Object.keys(next.entities)) delete next.tombstones[key];
  let error = '';
  if (!conflicts.length)
    try {
      validateLogbook(next);
    } catch (e) {
      error = (e as Error).message;
    }
  return {
    state: next,
    conflicts,
    error,
    before: Object.keys(current.entities).length,
    after: Object.keys(next.entities).length,
  };
}
export async function applyImport(
  db: LogbookStore,
  incoming: ImportPreview,
  mode: 'merge' | 'replace',
  baseline: string,
  choices: Record<string, 'local' | 'incoming'> = {},
) {
  // Re-parse the source so a mutated preview cannot bypass checksum/media/legacy review.
  const archive = incoming.state.archive as any;
  const fresh = await previewBackup(
    incoming.source,
    archive?.exclusionReview ?? {},
    archive?.orphanDecks ?? {},
  );
  if (canonical(fresh.state) !== canonical(incoming.state)) throw Error('Preview changed');
  if (fresh.review.some((r) => r.startsWith('exclusion:') || r.startsWith('deck-reference:')))
    throw Error('Legacy deck review required');
  const current = await db.load();
  if (canonical(current) !== baseline) throw Error('Logbook changed since preview; preview again');
  const plan = planImport(current, fresh, mode, choices);
  if (plan.conflicts.length) throw Error('Resolve every conflict before applying');
  if (plan.error) throw Error('Import relationships require review: ' + plan.error);
  const result = await db.commit(
    { id: crypto.randomUUID(), at: Date.now(), edit: { type: 'recover', snapshot: plan.state } },
    undefined,
    fresh.media,
    baseline,
  );
  await db.load();
  return result;
}
