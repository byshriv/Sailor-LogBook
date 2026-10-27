import { argon2id } from 'hash-wasm';

// Selected feasibility candidate, not an enabled production encryption format.
export const ARGON_CANDIDATE = Object.freeze({ memoryKiB: 19456, iterations: 2, parallelism: 1 });
export async function deriveArgonCandidate(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  if (salt.byteLength !== 16) throw new Error('A 16-byte salt is required');
  return argon2id({
    password,
    salt,
    memorySize: ARGON_CANDIDATE.memoryKiB,
    iterations: ARGON_CANDIDATE.iterations,
    parallelism: ARGON_CANDIDATE.parallelism,
    hashLength: 32,
    outputType: 'binary',
  });
}
export async function benchmarkArgon(): Promise<number> {
  const start = performance.now();
  const key = await deriveArgonCandidate('Synthetic Phase 1 benchmark', new Uint8Array(16).fill(7));
  if (key.length !== 32) throw new Error('Argon2id proof failed');
  key.fill(0);
  return Math.round(performance.now() - start);
}
