// Contract spike, not a production merge/transport implementation.
export interface Envelope {
  protocol: 1;
  generation: string;
  mode: 'plain' | 'encrypted';
  payload: string;
}
export interface FileCopy {
  revision: string;
  envelope: Envelope;
}
export interface RevisionPort {
  read(): Promise<FileCopy | null>;
  write(envelope: Envelope, expectedRevision: string | null): Promise<string>;
}
export function requireReadable(value: Envelope, encryptedRequired: boolean): void {
  if (
    value.protocol !== 1 ||
    !value.generation ||
    !['plain', 'encrypted'].includes(value.mode) ||
    typeof value.payload !== 'string'
  )
    throw new Error('Unsupported envelope');
  if (encryptedRequired && value.mode !== 'encrypted')
    throw new Error('Encryption downgrade refused');
}
