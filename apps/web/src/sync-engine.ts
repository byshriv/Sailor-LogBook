import { canonical, validateLogbook } from '../../../packages/domain/src/logbook.ts';
import type { Json, Logbook } from '../../../packages/domain/src/logbook.ts';
import { exportBackup, previewBackup } from '../../../packages/persistence/src/backup.ts';
import type { ImportPreview } from '../../../packages/persistence/src/backup.ts';
import type { LogbookStore } from '../../../packages/persistence/src/logbook.ts';
import { reconcile } from '../../../packages/sync-core/src/reconcile.ts';
import type { CloudFile, CloudPort } from '../../../packages/sync-providers/src/dropbox.ts';
import { decryptContent, encryptContent } from '../../../packages/crypto/src/content.ts';
import type { ContentSetup } from '../../../packages/crypto/src/content.ts';
import { textDigest } from '../../../packages/persistence/src/media.ts';

export interface Manifest {
  format: 'slb-sync';
  protocol: 2;
  reader: 2;
  generation: string;
  mode: 'plain' | 'encrypted';
  setup?: ContentSetup;
  payload: string;
}
interface Anchor {
  legacyRevision?: string | null;
  actor: string;
  generation: string;
  encrypted: boolean;
  base: Logbook;
  revision: string;
}
interface Journal {
  anchor?: Anchor;
  intent?: {
    actor: string;
    raw: string;
    baseline: string;
    ids: string[];
    generation: string;
    encrypted: boolean;
    legacyRevision?: string | null;
    base: Logbook;
    policy?: ContentSetup;
    transition?: 'content-key';
  };
}
export interface SyncPreview {
  legacyRevision: string | null;
  actor: string;
  baseline: string;
  local: ImportPreview;
  cloud: ImportPreview | null;
  file: CloudFile | null;
  manifest: Manifest | null;
  anchor?: Anchor;
}
export function readManifest(raw: string): Manifest {
  if (new TextEncoder().encode(raw).length > 96 * 1024 * 1024) throw Error('Cloud transfer limit');
  const m = JSON.parse(raw);
  if (
    m?.format !== 'slb-sync' ||
    m.protocol !== 2 ||
    m.reader !== 2 ||
    !/^[a-f0-9-]{36}$/.test(m.generation) ||
    !['plain', 'encrypted'].includes(m.mode) ||
    typeof m.payload !== 'string' ||
    !m.payload.length ||
    (m.mode === 'encrypted' && !m.setup) ||
    (m.mode === 'plain' && m.setup)
  )
    throw Error('Unsupported cloud format; use a compatible app');
  return m;
}
export class SyncEngine {
  private db: LogbookStore;
  private port: CloudPort;
  constructor(db: LogbookStore, port: CloudPort) {
    this.db = db;
    this.port = port;
  }
  async preview(key?: CryptoKey, signal?: AbortSignal): Promise<SyncPreview> {
    const actor = await this.db.actor();
    const journal = (await this.db.syncJournal()) as Journal | undefined;
    const file = await this.port.read(signal);
    const legacyRevision = (await this.port.legacyRevision?.(signal)) ?? null;
    const manifest = file ? readManifest(file.raw) : null;
    const currentBaseline = canonical(await this.db.load());
    const resumable =
      journal?.intent &&
      file?.raw === journal.intent.raw &&
      actor === journal.intent.actor &&
      (currentBaseline === journal.intent.baseline ||
        (journal.intent.transition === 'content-key' && journal.intent.ids.length === 0));
    if (journal?.anchor && journal.anchor.actor !== actor)
      throw Error('Rescued local generation requires a new join');
    if (
      journal?.anchor &&
      (!manifest || manifest.generation !== journal.anchor.generation) &&
      !resumable
    )
      throw Error(
        'Cloud generation missing or changed; export local backup and explicitly join again',
      );
    if (journal?.anchor?.encrypted && manifest?.mode !== 'encrypted')
      throw Error('Encryption downgrade refused');
    if (manifest?.mode === 'encrypted' && !key)
      throw Error('Encrypted Dropbox copy is locked; unlock before joining');
    const raw = manifest
      ? manifest.mode === 'encrypted'
        ? await decryptContent(manifest.payload, key!, manifest.setup!, manifest.generation)
        : manifest.payload
      : null;
    const cloud = raw ? await previewBackup(raw) : null;
    if (cloud?.legacy) throw Error('Legacy data requires the backup migration preview');
    // Validate the exact incoming state/media before recovering an uncertain generation change.
    if (resumable && journal?.intent && file && manifest) {
      const i = journal.intent;
      if (
        i.generation !== manifest.generation ||
        canonical(i.base) !== canonical(cloud?.state) ||
        (i.policy && canonical(i.policy) !== canonical(manifest.setup))
      )
        throw Error('Upload intent verification failed');
      await this.db.finishSync(
        {
          anchor: {
            actor,
            generation: i.generation,
            encrypted: i.encrypted,
            base: i.base,
            revision: file.revision,
            legacyRevision: i.legacyRevision,
          },
        },
        actor,
        currentBaseline,
        i.ids,
        i.policy,
      );
    }
    const local = await previewBackup(await exportBackup(this.db));
    const current = await this.db.load();
    if (canonical(current) !== canonical(local.state))
      throw Error('Local copy changed; preview again');
    return {
      actor,
      legacyRevision,
      baseline: canonical(current),
      local,
      cloud,
      file,
      manifest,
      anchor: ((await this.db.syncJournal()) as Journal | undefined)?.anchor,
    };
  }
  plan(p: SyncPreview, choices: Record<string, 'local' | 'cloud'> = {}) {
    if (!p.cloud)
      return {
        state: p.local.state,
        conflicts: [] as string[],
        error: '',
        featureReview: [] as string[],
      };
    const base = p.anchor?.base ?? null;
    const merged = reconcile(
      p.local.state.entities,
      p.cloud.state.entities,
      base?.entities ?? null,
      choices,
    );
    // A baseline cannot distinguish a provider rollback from an intentional remote restore.
    // Never automatically reintroduce a live entity across either copy's deletion barrier.
    for (const id of new Set([
      ...Object.keys(p.local.state.tombstones),
      ...Object.keys(p.cloud.state.tombstones),
      ...Object.keys(p.anchor?.base.tombstones ?? {}),
    ])) {
      if (
        (!base ? p.local.state.entities[id] || p.cloud.state.entities[id] : merged.entities[id]) &&
        !choices[id]
      ) {
        if (!merged.conflicts.includes(id)) merged.conflicts.push(id);
      } else if (choices[id]) {
        const e = choices[id] === 'local' ? p.local.state.entities[id] : p.cloud.state.entities[id];
        if (e) merged.entities[id] = e;
        else delete merged.entities[id];
      }
    }
    const state = structuredClone(p.local.state);
    state.entities = merged.entities;
    const featured = new Map<string, number>();
    for (const entity of Object.values(state.entities))
      if (entity.kind === 'moment' && entity.featured)
        featured.set(entity.date, (featured.get(entity.date) ?? 0) + 1);
    const featureReview = [...featured].filter(([, count]) => count > 4).map(([date]) => date);
    // Preserve every text. The existing Home chooser can feature four after sync;
    // an overflow cannot block unrelated cloud changes or silently discard a moment.
    for (const entity of Object.values(state.entities))
      if (entity.kind === 'moment' && featureReview.includes(entity.date)) entity.featured = false;
    state.tombstones = {
      ...p.anchor?.base.tombstones,
      ...p.cloud.state.tombstones,
      ...state.tombstones,
    };
    for (const id of Object.keys(state.entities)) delete state.tombstones[id];
    // Preserve remote history/unknown fields without impersonating its local causal receipts.
    if (canonical(p.cloud.state.archive) !== canonical(state.archive)) {
      const parts = (a: Json): Json[] =>
        a &&
        !Array.isArray(a) &&
        typeof a === 'object' &&
        a.format === 'slb-sync-archives-v1' &&
        Array.isArray(a.copies)
          ? a.copies
          : a === null
            ? []
            : [a];
      const unique = new Map(
        [...parts(state.archive), ...parts(p.cloud.state.archive)].map((a) => [canonical(a), a]),
      );
      state.archive = {
        format: 'slb-sync-archives-v1',
        copies: [...unique.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, a]) => a),
      };
    }
    let error = '';
    try {
      validateLogbook(state);
    } catch (e) {
      error = (e as Error).message;
    }
    return { state, conflicts: merged.conflicts, error, featureReview };
  }
  async rotateCredentials(
    current: { setup: ContentSetup; key: CryptoKey },
    replacement: { setup: ContentSetup; key: CryptoKey },
    signal?: AbortSignal,
  ) {
    return this.changeEncryption(current, replacement, false, undefined, signal);
  }
  async rotateContentKey(
    current: { setup: ContentSetup; key: CryptoKey },
    replacement: { setup: ContentSetup; key: CryptoKey },
    externalBackup: string,
    signal?: AbortSignal,
  ) {
    return this.changeEncryption(current, replacement, true, externalBackup, signal);
  }
  private async changeEncryption(
    current: { setup: ContentSetup; key: CryptoKey },
    replacement: { setup: ContentSetup; key: CryptoKey },
    newMaster: boolean,
    externalBackup?: string,
    signal?: AbortSignal,
  ) {
    if (newMaster && replacement.setup.id === current.setup.id)
      throw Error('A new content key ID is required');
    const remote = newMaster ? await this.port.read(signal) : null;
    const useReplacement =
      remote && canonical(readManifest(remote.raw).setup) === canonical(replacement.setup);
    const p = await this.preview(useReplacement ? replacement.key : current.key, signal);
    if (!p.file || !p.manifest || !p.cloud || p.manifest.mode !== 'encrypted' || !p.anchor)
      throw Error('Complete a reviewed encrypted sync before changing credentials');
    // An uncertain earlier upload is recovered by preview's byte-exact intent read-back.
    if (
      canonical(p.manifest.setup) === canonical(replacement.setup) &&
      (!newMaster || p.manifest.generation === replacement.setup.id) &&
      canonical(await this.db.keyPolicy()) === canonical(replacement.setup)
    )
      return { revision: p.file.revision, state: p.local.state };
    if (
      canonical(p.manifest.setup) !== canonical(current.setup) ||
      (newMaster
        ? replacement.setup.id === current.setup.id
        : replacement.setup.id !== current.setup.id) ||
      canonical(await this.db.keyPolicy()) !== canonical(current.setup) ||
      p.anchor.revision !== p.file.revision ||
      canonical(p.anchor.base) !== canonical(p.cloud.state) ||
      canonical(p.local.state.entities) !== canonical(p.cloud.state.entities) ||
      canonical(p.local.state.archive) !== canonical(p.cloud.state.archive) ||
      (await this.db.pending()).length
    )
      throw Error('Sync and review current copies before changing credentials');
    if (newMaster) {
      if (!externalBackup || canonical((await previewBackup(externalBackup)).state) !== p.baseline)
        throw Error('Verify a current external backup before replacing the content key');
    }
    const probe = await encryptContent(
      'same content key',
      current.key,
      current.setup,
      p.manifest.generation,
    );
    let sameKey = false;
    try {
      sameKey =
        (await decryptContent(probe, replacement.key, current.setup, p.manifest.generation)) ===
        'same content key';
    } catch {
      /* An independent new master must fail authentication under the old master. */
    }
    if (newMaster ? sameKey : !sameKey)
      throw Error('Replacement content key does not match the requested change');
    const id = 'credentials:' + crypto.randomUUID();
    await this.db.recovery(
      id,
      newMaster ? 'before content-key rotation' : 'before passphrase/recovery change',
    );
    if (canonical(await this.db.recoverySnapshot(id)) !== p.baseline)
      throw Error('Recovery verification failed');
    await this.db.retainSyncSource(p.cloud.source);
    const generation = newMaster ? replacement.setup.id : p.manifest.generation;
    const next: Manifest = {
      ...p.manifest,
      setup: replacement.setup,
      generation,
      payload: await encryptContent(p.cloud.source, replacement.key, replacement.setup, generation),
    };
    await previewBackup(
      await decryptContent(next.payload, replacement.key, replacement.setup, next.generation),
    );
    const raw = JSON.stringify(next);
    await this.db.saveSyncJournal(
      {
        anchor: p.anchor,
        incoming: p.cloud.source,
        intent: {
          actor: p.actor,
          raw,
          baseline: p.baseline,
          ids: [],
          generation: next.generation,
          encrypted: true,
          base: p.cloud.state,
          legacyRevision: p.legacyRevision,
          policy: replacement.setup,
          ...(newMaster ? { transition: 'content-key' } : {}),
        },
      },
      p.actor,
    );
    if (
      signal?.aborted ||
      ((await this.port.legacyRevision?.(signal)) ?? null) !== p.legacyRevision
    )
      throw Error('Credential change interrupted; retry');
    const revision = await this.port.write(raw, p.file.revision, signal);
    const check = await this.port.read(signal);
    if (
      signal?.aborted ||
      check?.raw !== raw ||
      check.revision !== revision ||
      ((await this.port.legacyRevision?.(signal)) ?? null) !== p.legacyRevision
    )
      throw Error('Credential change not verified; retry');
    await previewBackup(
      await decryptContent(next.payload, replacement.key, replacement.setup, next.generation),
    );
    await this.db.finishSync(
      { anchor: { ...p.anchor, revision, generation: next.generation }, incoming: p.cloud.source },
      p.actor,
      p.baseline,
      [],
      replacement.setup,
    );
    return { revision, state: p.local.state };
  }
  async apply(
    p: SyncPreview,
    choices: Record<string, 'local' | 'cloud'> = {},
    encryption?: { setup: ContentSetup; key: CryptoKey },
    signal?: AbortSignal,
    legacyReviewed = false,
  ) {
    if (signal?.aborted) throw Error('Sync canceled');
    if ((await this.db.actor()) !== p.actor || canonical(await this.db.load()) !== p.baseline)
      throw Error('Local copy changed; preview again');
    const fresh = await this.preview(encryption?.key, signal);
    if (
      canonical({
        cloud: p.cloud?.state,
        local: p.local.state,
        anchor: p.anchor,
        manifest: p.manifest,
        file: p.file,
        legacyRevision: p.legacyRevision,
      }) !==
      canonical({
        cloud: fresh.cloud?.state,
        local: fresh.local.state,
        anchor: fresh.anchor,
        manifest: fresh.manifest,
        file: fresh.file,
        legacyRevision: fresh.legacyRevision,
      })
    )
      throw Error('Preview changed; preview again');
    p = fresh;
    if (p.legacyRevision && p.legacyRevision !== p.anchor?.legacyRevision && !legacyReviewed)
      throw Error(
        'Legacy cloud changed; retire old writers and review their latest backup before sync',
      );
    const latest = await this.port.read(signal);
    if (latest?.revision !== p.file?.revision || latest?.raw !== p.file?.raw)
      throw Error('Dropbox changed; preview again');
    if (
      p.manifest?.mode === 'encrypted' &&
      (!encryption || canonical(encryption.setup) !== canonical(p.manifest.setup))
    )
      throw Error('Unlock the current encryption generation');
    if (p.anchor?.encrypted && !encryption) throw Error('Encryption downgrade refused');
    if ((await this.db.keyPolicy()) && !encryption) throw Error('Configured encryption is locked');
    const plan = this.plan(p, choices);
    if (plan.conflicts.length || plan.error)
      throw Error('Resolve conflicts/relationships before sync: ' + plan.error);
    // Verify local media and a recovery point before changing even an empty local copy.
    const point = 'sync:' + crypto.randomUUID();
    await this.db.recovery(point, 'before Dropbox join/merge');
    if (canonical(await this.db.recoverySnapshot(point)) !== p.baseline)
      throw Error('Recovery verification failed');
    if (p.cloud) {
      await this.db.retainSyncSource(p.cloud.source);
      // Keep the complete incoming snapshot, including trash/alternatives, in the durable journal
      // before a local recover operation. It is retained across interrupted uploads.
      await this.db.saveSyncJournal({ anchor: p.anchor, incoming: p.cloud.source }, p.actor);
      if (
        canonical(plan.state.entities) !== canonical(p.local.state.entities) ||
        canonical(plan.state.archive) !== canonical(p.local.state.archive)
      )
        await this.db.commit(
          {
            id: crypto.randomUUID(),
            at: Date.now(),
            edit: { type: 'recover', snapshot: plan.state },
          },
          undefined,
          p.cloud.media,
          p.baseline,
        );
    }
    let raw = await exportBackup(this.db);
    const local = await previewBackup(raw);
    const baseline = canonical(local.state),
      ids = (await this.db.pending()).map((o) => o.id);
    if (canonical(await this.db.load()) !== baseline) throw Error('Local copy changed; sync again');
    // Foreign deletion barriers belong to the shared baseline, not this actor's local
    // causal reducer. Preserve them on the wire even when an empty device joins.
    const backup = JSON.parse(raw);
    backup.payload.state.tombstones = {
      ...p.anchor?.base.tombstones,
      ...p.cloud?.state.tombstones,
      ...local.state.tombstones,
    };
    for (const id of Object.keys(local.state.entities)) delete backup.payload.state.tombstones[id];
    backup.digest = await textDigest(canonical(backup.payload));
    raw = JSON.stringify(backup);
    const shared = await previewBackup(raw);
    const generation = p.manifest?.generation ?? crypto.randomUUID();
    const manifest: Manifest = {
      format: 'slb-sync',
      protocol: 2,
      reader: 2,
      generation,
      mode: encryption ? 'encrypted' : 'plain',
      ...(encryption ? { setup: encryption.setup } : {}),
      payload: encryption
        ? await encryptContent(raw, encryption.key, encryption.setup, generation)
        : raw,
    };
    const wire = JSON.stringify(manifest);
    if (((await this.port.legacyRevision?.(signal)) ?? null) !== p.legacyRevision)
      throw Error('Legacy cloud changed during review; preview again');
    await this.db.saveSyncJournal(
      {
        anchor: p.anchor,
        incoming: p.cloud?.source,
        intent: {
          actor: p.actor,
          raw: wire,
          baseline,
          ids,
          generation,
          encrypted: !!encryption,
          legacyRevision: p.legacyRevision,
          base: shared.state,
        },
      },
      p.actor,
    );
    const revision = await this.port.write(wire, p.file?.revision ?? null, signal);
    const verified = await this.port.read(signal);
    if (verified?.revision !== revision || verified.raw !== wire)
      throw Error('Upload not verified; retry sync');
    if (
      signal?.aborted ||
      ((await this.port.legacyRevision?.(signal)) ?? null) !== p.legacyRevision
    )
      throw Error('Sync interrupted or legacy changed; preview again');
    // Check every decoded attachment again before acknowledgement.
    await previewBackup(
      encryption
        ? await decryptContent(manifest.payload, encryption.key, encryption.setup, generation)
        : manifest.payload,
    );
    await this.db.finishSync(
      {
        anchor: {
          actor: p.actor,
          generation,
          encrypted: !!encryption,
          base: shared.state,
          revision,
          legacyRevision: p.legacyRevision,
        },
        incoming: p.cloud?.source,
      },
      p.actor,
      baseline,
      ids,
    );
    return { revision, state: local.state };
  }
}
