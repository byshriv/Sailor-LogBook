import type { Envelope, FileCopy, RevisionPort } from '../../sync-core/src/index.ts';
// In-memory compare-and-swap fake; never contacts Dropbox or stores credentials.
export class RevisionConflict extends Error {}
export class MemoryRevisionPort implements RevisionPort {
  private value: FileCopy | null = null;
  private sequence = 0;
  async read(): Promise<FileCopy | null> {
    return structuredClone(this.value);
  }
  async write(envelope: Envelope, expectedRevision: string | null): Promise<string> {
    if ((this.value?.revision ?? null) !== expectedRevision)
      throw new RevisionConflict('Revision changed; re-read and review');
    const revision = String(++this.sequence);
    this.value = { revision, envelope: structuredClone(envelope) };
    return revision;
  }
}
