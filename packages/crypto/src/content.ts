import { deriveArgonCandidate } from './argon.ts';

// Versioned full-content codec. IndexedDB stays plaintext; keys are session-only.
export const encode64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
};
export function decode64(s: string, size?: number): Uint8Array<ArrayBuffer> {
  if (
    typeof s !== 'string' ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s)
  )
    throw Error('Invalid encoded key or ciphertext');
  const b = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  if (size !== undefined && b.length !== size) throw Error('Invalid key size');
  return b;
}
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const aes = (bytes: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
type Box = { iv: string; data: string };
export interface ContentSetup {
  version: 1;
  kdf: 'argon2id-19456-2-1';
  salt: string;
  id: string;
  passphrase: Box;
  recovery: Box;
}
async function seal(raw: Uint8Array<ArrayBuffer>, key: CryptoKey, context: string): Promise<Box> {
  const iv = random(12);
  return {
    iv: encode64(iv),
    data: encode64(
      new Uint8Array(
        await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) },
          key,
          raw,
        ),
      ),
    ),
  };
}
async function open(box: Box, key: CryptoKey, context: string) {
  return new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: decode64(box.iv, 12),
        additionalData: new TextEncoder().encode(context),
      },
      key,
      decode64(box.data),
    ),
  );
}
function validate(setup: ContentSetup) {
  if (
    setup?.version !== 1 ||
    setup.kdf !== 'argon2id-19456-2-1' ||
    !/^[a-f0-9-]{36}$/.test(setup.id)
  )
    throw Error('Unsupported encryption setup');
  decode64(setup.salt, 16);
}
async function passKey(pass: string, salt: string) {
  const bytes = new Uint8Array(await deriveArgonCandidate(pass, decode64(salt, 16)));
  try {
    return await aes(bytes);
  } finally {
    bytes.fill(0);
  }
}
export async function setupContent(pass: string) {
  if (pass.length < 12) throw Error('Use a passphrase of at least 12 characters');
  const master = random(32),
    secret = random(32),
    salt = encode64(random(16)),
    id = crypto.randomUUID();
  const setup: ContentSetup = {
    version: 1,
    kdf: 'argon2id-19456-2-1',
    salt,
    id,
    passphrase: await seal(master, await passKey(pass, salt), 'slb-wrap-pass:' + id),
    recovery: await seal(master, await aes(secret), 'slb-wrap-recovery:' + id),
  };
  const code = await recoveryCode(secret);
  try {
    return { setup, key: await aes(master), code };
  } finally {
    master.fill(0);
    secret.fill(0);
  }
}
export async function unlockContent(setup: ContentSetup, value: string, recovery = false) {
  validate(setup);
  const bytes = await open(
    recovery ? setup.recovery : setup.passphrase,
    recovery ? await aes(await parseRecovery(value)) : await passKey(value, setup.salt),
    (recovery ? 'slb-wrap-recovery:' : 'slb-wrap-pass:') + setup.id,
  );
  try {
    if (bytes.length !== 32) throw Error('Invalid content key');
    return await aes(bytes);
  } finally {
    bytes.fill(0);
  }
}
async function recoveryCode(secret: Uint8Array<ArrayBuffer>) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', secret));
  return (
    'SLB1-' +
    encode64(secret) +
    '-' +
    Array.from(hash.slice(0, 4), (b) => b.toString(16).padStart(2, '0')).join('')
  );
}
async function parseRecovery(raw: string) {
  const code = raw.trim().startsWith('{') ? JSON.parse(raw).code : raw.trim();
  if (typeof code !== 'string' || !code.startsWith('SLB1-')) throw Error('Invalid recovery code');
  const secret = decode64(code.slice(5, -9), 32);
  if ((await recoveryCode(secret)) !== code) throw Error('Recovery checksum mismatch');
  return secret;
}
export async function encryptContent(
  raw: string,
  key: CryptoKey,
  setup: ContentSetup,
  generation: string,
) {
  validate(setup);
  return JSON.stringify(
    await seal(
      new TextEncoder().encode(raw),
      key,
      'slb-content-v1:' + generation + ':' + JSON.stringify(setup),
    ),
  );
}
export async function decryptContent(
  payload: string,
  key: CryptoKey,
  setup: ContentSetup,
  generation: string,
) {
  validate(setup);
  return new TextDecoder('utf-8', { fatal: true }).decode(
    await open(
      JSON.parse(payload),
      key,
      'slb-content-v1:' + generation + ':' + JSON.stringify(setup),
    ),
  );
}
