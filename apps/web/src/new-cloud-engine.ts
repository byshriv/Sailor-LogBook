import { blankLogbook, canonical } from '../../../packages/domain/src/logbook.ts';
import type { Logbook } from '../../../packages/domain/src/logbook.ts';
import { exportBackup, previewBackup } from '../../../packages/persistence/src/backup.ts';
import type { LogbookStore } from '../../../packages/persistence/src/logbook.ts';
import type { CloudFile, ErasurePort } from '../../../packages/sync-providers/src/dropbox.ts';
import { productionPath } from '../../../packages/sync-providers/src/dropbox.ts';
import { erasureMarker } from '../../../packages/sync-core/src/erasure.ts';
import { encryptContent, decryptContent } from '../../../packages/crypto/src/content.ts';
import type { ContentSetup } from '../../../packages/crypto/src/content.ts';
import { readManifest } from './sync-engine.ts';

interface Intent {
  transition: 'new-cloud';
  actor: string;
  raw: string;
  baseline: string;
  ids: [];
  generation: string;
  encrypted: boolean;
  base: Logbook;
  policy: ContentSetup | null;
  barrier: CloudFile;
}
export interface NewCloudPreview {
  actor: string;
  baseline: string;
  barrier: CloudFile;
  policy: ContentSetup | null;
  retry: boolean;
  records: number;
}
export class NewCloudEngine {
  private db: LogbookStore;
  private port: ErasurePort;
  constructor(db: LogbookStore, port: ErasurePort) {
    this.db = db;
    this.port = port;
  }
  private async cleanCloud(file: CloudFile, signal?: AbortSignal) {
    if (!this.port.legacyRevision || (await this.port.legacyRevision(signal)) !== null)
      throw Error('Retire and review legacy cloud data before creating a new cloud logbook');
    const files = await this.port.inventory(signal);
    if (
      files.length !== 1 ||
      files[0]?.path !== productionPath ||
      files[0].revision !== file.revision
    )
      throw Error('Cloud files changed or remain; review deletion before new-cloud setup');
  }
  async preview(signal?: AbortSignal): Promise<NewCloudPreview> {
    if (signal?.aborted) throw Error('New-cloud review paused');
    await this.db.syncAllowed();
    const actor = await this.db.actor(),
      state = await this.db.load(),
      baseline = canonical(state);
    const journal = await this.db.syncJournal(),
      intent = journal?.intent as Intent | undefined;
    const file = await this.port.read(signal);
    if (!file) throw Error('A verified deletion barrier is required for this explicit restart');
    await this.cleanCloud(file, signal);
    const policy = (await this.db.keyPolicy()) ?? null;
    if (intent?.transition === 'new-cloud') {
      if (
        intent.actor !== actor ||
        !erasureMarker(intent.barrier.raw) ||
        !(
          (file.raw === intent.barrier.raw && file.revision === intent.barrier.revision) ||
          file.raw === intent.raw
        ) ||
        canonical(policy) !== canonical(intent.policy)
      )
        throw Error('New-cloud request changed; keep local data and review');
      return {
        actor,
        baseline,
        barrier: intent.barrier,
        policy,
        retry: true,
        records: Object.keys(state.entities).length,
      };
    }
    if (!erasureMarker(file.raw)) throw Error('Cloud is already active; use ordinary sync preview');
    const retained = await this.db.exportRetained();
    const head = retained.meta!.values.find((v: any) => v?.actor && v?.state) as {
      revision: number;
      clock: object;
    };
    if (
      journal ||
      baseline !== canonical(blankLogbook()) ||
      head.revision ||
      Object.keys(head.clock).length ||
      ['blobs', 'tail', 'receipts', 'recovery', 'migration'].some(
        (name) => retained[name]!.values.length,
      )
    )
      throw Error(
        'A fresh empty local logbook with no retained history is required; preserve a backup and erase locally first',
      );
    return { actor, baseline, barrier: file, policy, retry: false, records: 0 };
  }
  async create(
    preview: NewCloudPreview,
    encryption?: { setup: ContentSetup; key: CryptoKey },
    signal?: AbortSignal,
  ) {
    const fresh = await this.preview(signal);
    if (canonical({ ...fresh, retry: preview.retry }) !== canonical(preview))
      throw Error('New-cloud preview changed; review again');
    if (
      (fresh.policy && (!encryption || canonical(encryption.setup) !== canonical(fresh.policy))) ||
      (!fresh.policy && encryption)
    )
      throw Error('Unlock the configured encryption policy before new-cloud setup');
    let intent = (await this.db.syncJournal())?.intent as Intent | undefined;
    if (!fresh.retry) {
      const raw = await exportBackup(this.db),
        backup = await previewBackup(raw);
      if (
        canonical(backup.state) !== fresh.baseline ||
        backup.media.length ||
        (await this.db.pending()).length
      )
        throw Error('Local copy changed; review new-cloud setup again');
      const generation = crypto.randomUUID();
      const wire = JSON.stringify({
        format: 'slb-sync',
        protocol: 2,
        reader: 2,
        generation,
        mode: encryption ? 'encrypted' : 'plain',
        ...(encryption ? { setup: encryption.setup } : {}),
        payload: encryption
          ? await encryptContent(raw, encryption.key, encryption.setup, generation)
          : raw,
      });
      intent = {
        transition: 'new-cloud',
        actor: fresh.actor,
        raw: wire,
        baseline: fresh.baseline,
        ids: [],
        generation,
        encrypted: !!encryption,
        base: backup.state,
        policy: fresh.policy,
        barrier: fresh.barrier,
      };
      await this.db.saveSyncJournal({ intent }, fresh.actor, fresh.policy);
    }
    if (
      !intent ||
      intent.transition !== 'new-cloud' ||
      intent.actor !== fresh.actor ||
      intent.ids.length ||
      canonical(intent.base) !== canonical(blankLogbook()) ||
      intent.baseline !== canonical(blankLogbook())
    )
      throw Error('Invalid new-cloud intent; no upload performed');
    const manifest = readManifest(intent.raw);
    if (
      manifest.generation !== intent.generation ||
      manifest.mode !== (intent.encrypted ? 'encrypted' : 'plain') ||
      canonical(manifest.setup ?? null) !== canonical(intent.policy) ||
      manifest.generation === erasureMarker(intent.barrier.raw)?.generation
    )
      throw Error('Invalid new-cloud manifest; no upload performed');
    const content = encryption
      ? await decryptContent(
          manifest.payload,
          encryption.key,
          encryption.setup,
          manifest.generation,
        )
      : manifest.payload;
    const backup = await previewBackup(content);
    if (
      backup.legacy ||
      backup.media.length ||
      canonical(backup.state) !== canonical(blankLogbook())
    )
      throw Error('Only an empty verified cloud baseline can replace a deletion barrier');
    if (signal?.aborted) throw Error('New-cloud setup interrupted; verify the pending request');
    const current = await this.port.read(signal);
    if (!current) throw Error('Cloud deletion barrier missing; review again');
    await this.cleanCloud(current, signal);
    if (current.raw !== intent.raw) {
      if (current.raw !== intent.barrier.raw || current.revision !== intent.barrier.revision)
        throw Error('Cloud changed; the reviewed deletion barrier was not replaced');
      const revision = await this.port.write(intent.raw, intent.barrier.revision, signal);
      const check = await this.port.read(signal);
      if (check?.raw !== intent.raw || check.revision !== revision)
        throw Error('New cloud not verified; review the pending request');
    }
    const verified = await this.port.read(signal);
    if (signal?.aborted || verified?.raw !== intent.raw)
      throw Error('New cloud not verified; local data retained');
    await this.cleanCloud(verified, signal);
    await previewBackup(
      encryption
        ? await decryptContent(
            readManifest(verified.raw).payload,
            encryption.key,
            encryption.setup,
            manifest.generation,
          )
        : readManifest(verified.raw).payload,
    );
    const baseline = canonical(await this.db.load());
    await this.db.finishSync(
      {
        anchor: {
          actor: intent.actor,
          generation: intent.generation,
          encrypted: intent.encrypted,
          base: intent.base,
          revision: verified.revision,
          legacyRevision: null,
        },
      },
      intent.actor,
      baseline,
      [],
      undefined,
      intent.policy,
    );
    return { revision: verified.revision, localPending: (await this.db.pending()).length };
  }
}
