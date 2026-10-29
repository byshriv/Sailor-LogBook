import { canonical } from '../../../packages/domain/src/logbook.ts';
import { textDigest } from '../../../packages/persistence/src/media.ts';
import type { ErasureJob, LogbookStore } from '../../../packages/persistence/src/logbook.ts';
import { erasureMarker } from '../../../packages/sync-core/src/erasure.ts';
import type { CloudFile, ErasurePort } from '../../../packages/sync-providers/src/dropbox.ts';
import { ownedDataPath, productionPath } from '../../../packages/sync-providers/src/dropbox.ts';
import { readManifest } from './sync-engine.ts';

export interface ErasurePreview {
  job: ErasureJob;
  baseline: string;
  file: CloudFile | null;
  records: number;
}
export class ErasureEngine {
  private db: LogbookStore;
  private port?: ErasurePort;
  constructor(db: LogbookStore, port?: ErasurePort) {
    this.db = db;
    this.port = port;
  }
  private cloud() {
    if (!this.port) throw Error('Connect Dropbox before cloud deletion');
    return this.port;
  }
  private async inventory(signal?: AbortSignal) {
    const files = await this.cloud().inventory(signal),
      seen = new Set<string>();
    for (const file of files) {
      if (
        (file.path !== productionPath && !ownedDataPath(file.path)) ||
        !file.revision ||
        seen.has(file.path)
      )
        throw Error('Unowned or duplicate deletion target refused');
      seen.add(file.path);
    }
    return files.sort((a, b) => a.path.localeCompare(b.path));
  }
  async preview(
    scope: 'local' | 'everywhere',
    signal?: AbortSignal,
    identity?: { id: string; marker: string },
  ): Promise<ErasurePreview> {
    const previous = await this.db.erasureStatus();
    if (previous && (previous.scope !== scope || previous.phase === 'complete'))
      throw Error('Finish the existing erasure session first');
    const state = await this.db.load(),
      baseline = canonical(state),
      actor = await this.db.actor();
    const file = scope === 'everywhere' ? await this.cloud().read(signal) : null;
    const marker = file && erasureMarker(file.raw);
    if (file && !marker) readManifest(file.raw); // Refuse unsupported future active formats.
    if (previous?.phase === 'barrier' && file?.raw !== previous.marker)
      throw Error('Cloud deletion barrier changed; local data retained');
    const files = scope === 'everywhere' ? await this.inventory(signal) : [];
    if (
      scope === 'everywhere' &&
      (files.find((f) => f.path === productionPath)?.revision ?? null) !== (file?.revision ?? null)
    )
      throw Error('Cloud changed during deletion preview; review again');
    const rawMarker =
      scope === 'local'
        ? ''
        : (previous?.marker ??
          (marker
            ? file!.raw
            : (identity?.marker ??
              JSON.stringify({
                format: 'slb-erased',
                protocol: 2,
                reader: 2,
                generation: crypto.randomUUID(),
                at: new Date().toISOString(),
              }))));
    if (scope === 'everywhere' && !erasureMarker(rawMarker))
      throw Error('Invalid deletion barrier');
    const id = previous?.id ?? identity?.id ?? crypto.randomUUID();
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('Invalid erasure session');
    return {
      baseline,
      file,
      records: Object.keys(state.entities).length,
      job: {
        id,
        scope,
        actor,
        localDigest: await textDigest(baseline),
        marker: rawMarker,
        phase: previous?.phase ?? 'pending',
        expectedRevision: file?.revision ?? null,
        targets: files.filter((f) => f.path !== productionPath),
      },
    };
  }
  async confirm(
    preview: ErasurePreview,
    signal?: AbortSignal,
    progress: (text: string) => void = () => {},
  ) {
    const fresh = await this.preview(preview.job.scope, signal, preview.job);
    if (canonical(fresh) !== canonical(preview))
      throw Error('Erasure preview changed; review again');
    await this.db.beginErasure(fresh.job, fresh.baseline);
    return this.resume(fresh.job.id, signal, progress);
  }
  async resume(id: string, signal?: AbortSignal, progress: (text: string) => void = () => {}) {
    const job = await this.db.erasureStatus();
    if (!job || job.id !== id) throw Error('Erasure session changed');
    if (
      !['local', 'everywhere'].includes(job.scope) ||
      !['pending', 'barrier', 'complete'].includes(job.phase) ||
      (job.scope === 'everywhere' && !erasureMarker(job.marker))
    )
      throw Error('Invalid erasure intent; local data retained');
    if (job.phase === 'complete') return;
    const stopped = () => {
      if (signal?.aborted) throw Error('Erasure paused; outcome requires review');
    };
    stopped();
    if (job.scope === 'everywhere') {
      const cloud = this.cloud();
      progress('Installing and verifying a content-free cloud deletion barrier…');
      const current = await cloud.read(signal);
      if (current?.raw !== job.marker) {
        if (job.phase === 'barrier' || (current?.revision ?? null) !== job.expectedRevision)
          throw Error('Cloud changed; review remaining deletion before retrying');
        const revision = await cloud.write(job.marker, job.expectedRevision, signal);
        const readBack = await cloud.read(signal);
        if (readBack?.raw !== job.marker || readBack.revision !== revision)
          throw Error('Cloud deletion barrier not verified; local data retained');
      }
      stopped();
      await this.db.erasureBarrierVerified(id);
      const files = await this.inventory(signal),
        selected = new Map(job.targets.map((f) => [f.path, f.revision]));
      for (const file of files.filter((f) => f.path !== productionPath))
        if (selected.get(file.path) !== file.revision)
          throw Error('Cloud files changed or reappeared; review remaining deletion');
      for (let i = 0; i < job.targets.length; i++) {
        stopped();
        const target = job.targets[i]!;
        if (!files.some((f) => f.path === target.path)) continue;
        progress(`Removing reviewed cloud file ${i + 1} of ${job.targets.length}…`);
        await cloud.remove(target, signal);
      }
      progress('Verifying cloud deletion before clearing local data…');
      stopped();
      if ((await this.inventory(signal)).some((f) => f.path !== productionPath))
        throw Error('Cloud files remain or reappeared; local data retained');
      const final = await cloud.read(signal);
      if (final?.raw !== job.marker)
        throw Error('Cloud deletion barrier changed; local data retained');
    }
    stopped();
    progress('Clearing local content, media, recovery history and keys…');
    await this.db.finishErasure(id);
  }
}
