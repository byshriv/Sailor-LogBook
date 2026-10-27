// Experimental wrapping proof. This is not the selected production KDF/envelope.
const context = new TextEncoder().encode('slb-phase1-wrap-v1');
export interface WrappedKey {
  version: 1;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
}
export interface KeySetup {
  salt: Uint8Array<ArrayBuffer>;
  iterations: 310000;
  passphrase: WrappedKey;
  recovery: WrappedKey;
}
const random = (length: number) => crypto.getRandomValues(new Uint8Array(length));
const aes = (bytes: Uint8Array<ArrayBuffer>, uses: KeyUsage[]) =>
  crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, uses);
async function passphraseKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
async function wrap(master: Uint8Array<ArrayBuffer>, key: CryptoKey): Promise<WrappedKey> {
  const iv = random(12);
  return {
    version: 1,
    iv,
    ciphertext: await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: context },
      key,
      master,
    ),
  };
}
async function unwrap(value: WrappedKey, key: CryptoKey): Promise<ArrayBuffer> {
  if (value.version !== 1 || value.iv.length !== 12) throw new Error('Unsupported wrapper');
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: value.iv, additionalData: context },
    key,
    value.ciphertext,
  );
}
export async function createKeySetup(passphrase: string): Promise<{
  setup: KeySetup;
  recoverySecret: Uint8Array<ArrayBuffer>;
  master: Uint8Array<ArrayBuffer>;
}> {
  if (passphrase.length < 12) throw new Error('Use at least 12 characters');
  const salt = random(16),
    master = random(32),
    recoverySecret = random(32);
  return {
    setup: {
      salt,
      iterations: 310000,
      passphrase: await wrap(master, await passphraseKey(passphrase, salt)),
      recovery: await wrap(master, await aes(recoverySecret, ['encrypt'])),
    },
    recoverySecret,
    master,
  };
}
export async function unlockPassphrase(setup: KeySetup, passphrase: string): Promise<ArrayBuffer> {
  if (setup.iterations !== 310000 || setup.salt.length !== 16)
    throw new Error('Unsupported KDF parameters');
  return unwrap(setup.passphrase, await passphraseKey(passphrase, setup.salt));
}
export async function unlockRecovery(
  setup: KeySetup,
  secret: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
  return unwrap(setup.recovery, await aes(secret, ['decrypt']));
}
