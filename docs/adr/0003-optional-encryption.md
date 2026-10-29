# ADR 0003: optional encryption, recovery and rotation

Current implementation update, 29 October 2026: Phase 9 now provides full-content
encryption and a combined passphrase/recovery-kit rewrap flow. Current credential
authentication, verified replacement passphrase/recovery, local recovery, CAS manifest
replacement and independent read-back precede atomic local policy/anchor replacement.
Uncertain commits recover from the durable exact-byte intent. The master stays the
same; this does not revoke lost-device keys/tokens. Content-key rotation/native trust
remain open. See ../ARCHITECTURE-PHASE-9.md and ../VERIFICATION-PHASE-9.md. Earlier
feasibility-only wording below is historical where superseded.

Accepted contract; hash-wasm 4.12.0 Argon2id is the selected feasibility candidate as of
28 October 2026. See docs/REVIEW-2026-10-28.md. Production format/device budgets remain open
for the encryption phase; this is not an enabled encrypted-sync implementation.

Ordinary new sync works in plain mode without key setup. Existing encrypted logbooks
require their key. Persist encryption-required policy separately from the in-memory key;
missing/wrong keys fail closed, never select plain mode. Encrypt content and attachments
before upload when enabled. Local IndexedDB is not encrypted by this decision.

Use a random 256-bit master key with authenticated encryption, unique random nonces and
version/logbook/key-generation context authenticated as additional data. Wrap the master
independently using a passphrase-derived key and a random 256-bit recovery secret. Recovery
file and printable code encode the same secret; checksum/version and verify-before-enable
UX are required. Never upload those secrets unprotected. Browser unlock remains session-only.

The independent WebCrypto experiment uses AES-256-GCM wrappers and PBKDF2-SHA-256 at
310,000 iterations to test two unlock routes and tamper rejection. This matches the demo's
KDF family for a constrained experiment, **not a production choice or format compatibility
claim**. No content codec, recovery serializer, rotation implementation or UI invokes it.
Production must assess vetted Argon2id distribution, Safari/WASM/CSP compatibility,
memory and latency on real Android 12/lower-memory devices. No invented performance result.

Passphrase change: unlock and verify current key, produce a new wrapper with fresh salt/
nonce, revision-check the manifest update, verify a second unlock, retain a recovery point
until confirmed. Content key need not change for a passphrase-only change. Recovery-secret
rotation similarly replaces its wrapper after verification; warn the old recovery file
is invalid for the new manifest. Keep interrupted changes recoverable, never mixed epochs.

Lost/compromised device: revoke provider access as appropriate and rotate the content key,
rewrap under verified passphrase/new recovery secret, re-encrypt referenced objects and
commit the new generation atomically. Old cached keys/ciphertexts remain decryptable to
their holders; rewrapping alone does not revoke them. Offline local copies cannot be erased
remotely. A returning stale device must not upload old-generation data automatically.

Trusted Android unlock wraps keys under Android Keystore/device authentication. Explicit
Lock forgets session key and requires authentication again; no forced biometric prompt on
every ordinary opening or inactivity lock by default. Prove reboot/lock/trust-forgetting
behavior before accepting the adapter. Diagnostics exclude all key material. JS memory
clearing cannot guarantee removal of every runtime copy.

Backups default encrypted once configured; plaintext export stays explicit. Enabling
encryption cannot retroactively protect plaintext Dropbox revisions/backups. Document
metadata exposure. Independent review and full rotation/attachment tests remain required.
