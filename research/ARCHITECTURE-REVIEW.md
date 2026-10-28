# Super Productivity architecture review for Sailor Logbook

Reviewed 27 October 2026. Source pinned to commit [`17c6227b39ad5a818a0aa2fc3803723dcf63213d`](https://github.com/super-productivity/super-productivity/tree/17c6227b39ad5a818a0aa2fc3803723dcf63213d), committed 26 October 2026. This is a focused source/design review, not a security audit or a claim that the upstream application has no bugs. The upstream application was not built or run in this review.

The earlier [Dropbox review](SYNC-REVIEW.md) remains useful, but it covered the provider rather than the complete local-persistence and operation-log pipeline. The observations below come from the current package contracts, executable source and maintained architecture notes. Some upstream documents explicitly mark older explanations as historical; those should not be treated as the current implementation.

## What the source establishes

| Area | Current upstream behavior | Sailor Logbook decision |
| --- | --- | --- |
| UI and state | Angular, TypeScript, NgRx actions/reducers/effects and RxJS. | Preserve deterministic actions, selectors and isolated effects, using React + TypeScript + Redux Toolkit for our UI. The architectural pattern does not require Angular. |
| Boundaries | App wiring composes framework-neutral sync-core and provider packages. Provider code imports public sync-core exports; the core does not import the app or providers. | Adopt the same dependency direction and enforce it with imports/lint rules. Keep branding and journal rules outside the generic sync engine. |
| Durable writes | The reducer changes live state first. Capture/effects serialize persistent actions, validate them and append operations with causal clocks. Sync is requested after durable persistence. | Represent optimistic, locally saved and cloud-synced states separately. Never show Saved or Synced for a failed write. Route all persistent commands through one durable write pipeline. |
| Local storage | The current live operation-log implementation uses IndexedDB. The native SQLite replacement was removed/parked. Native backups are a separate safeguard. | Use IndexedDB for the canonical logbook, operations and recovery. Introduce a storage port, but do not add a second canonical backend without evidence. Android widget projections are disposable views, not another source of truth. |
| Startup/replay | Load a valid checkpoint, then replay the retained operation tail. Compaction is bounded, not a permanent all-time audit history. | Add checkpoints, validated replay, crash recovery and safe compaction. Retain unsynced operations until acknowledgement. |
| Browser instances | The current architecture describes one active web instance rather than exchanging operation payloads between open editing tabs. | Owner confirmed one active editing tab per browser profile for 1.0. Add a clear return-to-active-tab screen and stale-lock recovery. |
| File providers | Current documentation describes a default baseline + bounded operation buffer in one file, and an opt-in split-file format. Both enter the same client operation pipeline. | Start with the smallest versioned Dropbox transport that passes the race/migration tests. Do not copy a directory listing or adopt a split protocol before its extra complexity is justified. |
| Dropbox | The provider preserves the caller's expected revision/create-only intent; it does not fetch a fresh revision just to overwrite a concurrent writer. | Preserve revision-checked writes, bounded retry/re-download/merge and separate credentials. Keep our redirect + PKCE flow, as requested. |
| Conflicts | Current code supports eligible disjoint-field merges and deterministic conflict resolution. Its previous device-local conflict journal/review UI was retired. | Merge safe independent fields automatically, but retain recoverable alternatives and conditional device/cloud review because the owner explicitly requested it. This is a deliberate product difference. |
| Recovery | Recovery snapshots are captured before full-state replacements. Recovery-point failure can abort a replacement. | Keep a bounded local recovery ring before migration, imports and destructive cloud replacements. A sync copy alone is not an independent backup. |
| Encryption | The generic core exports Argon2id/AES-GCM helpers, session key handling and integrity-related interfaces. | Evaluate reuse of audited/tested primitives and benchmark them on real phones. Latest owner decision: sync first; end-to-end encryption is optional. When enabled it uses a passphrase, recovery key and trusted Android unlock. Do not invent a cipher or silently replace the demo format. |
| Platforms/releases | Capacitor provides native platform integration; repository workflows build/test and distribute Android/web artifacts. | Share the web/domain/sync code with an Android Capacitor app. Add native Kotlin widgets, signing and release workflows. Electron and a native iOS app are outside the initial approved scope. |

## Implementation evidence

Each link below is pinned to the reviewed revision:

1. [Package boundary rules](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/docs/sync-and-op-log/package-boundaries.md).
2. [Current sync field guide](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/docs/sync-and-op-log/sync-architecture.html).
3. [Operation-log architecture and its historical-warning notice](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/docs/sync-and-op-log/operation-log-architecture.md).
4. [Persistent-action capture](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/src/app/op-log/capture/operation-capture.meta-reducer.ts) and [durable operation effects](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/src/app/op-log/capture/operation-log.effects.ts).
5. [IndexedDB adapter](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/src/app/op-log/persistence/indexed-db-op-log-adapter.ts), [operation store](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/src/app/op-log/persistence/operation-log-store.service.ts) and [parked SQLite migration](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/docs/sync-and-op-log/sqlite-migration.md).
6. [Dropbox provider](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/packages/sync-providers/src/file-based/dropbox/dropbox.ts) and [HTTP/revision implementation](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/packages/sync-providers/src/file-based/dropbox/dropbox-api.ts).
7. [Current conflict policy](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/docs/sync-and-op-log/conflict-journal-and-review.md) and [disjoint-field merge implementation](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/src/app/op-log/sync/conflict-disjoint-merge.util.ts).
8. [Local recovery points](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/docs/sync-and-op-log/local-recovery-points.md).
9. [Sync-core public exports, including encryption](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/packages/sync-core/src/index.ts) and [provider public subpaths](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/packages/sync-providers/package.json).
10. [Capacitor configuration](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/capacitor.config.ts), [CI](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/.github/workflows/ci.yml) and [Android release workflow](https://github.com/super-productivity/super-productivity/blob/17c6227b39ad5a818a0aa2fc3803723dcf63213d/.github/workflows/build-android.yml).

## Reuse policy

We should build Sailor Logbook as its own application, not fork Super Productivity's entire feature set. A short Phase 1 spike will determine whether its public sync-core/provider surfaces can be pinned and integrated cleanly. A package manifest existing in the repository does not prove that a suitable public npm release is available or that its compatibility policy meets our needs. Verify distribution, license, dependencies, API coverage, protocol assumptions and maintenance first.

If public-package reuse passes those checks, prefer it over duplicating mature primitives. If it does not, retain the same boundaries and document the independently implemented subset. Any copied/vendored source keeps its license and attribution; no runtime imports from a mutable GitHub branch. Either route must pass our own data-loss, migration, native lifecycle and encryption tests. Upstream tests do not automatically validate our integration.

We are not adding SuperSync hosting, Jira/GitHub task integrations, plugins, Pomodoro, Electron, or Super Productivity's entire archive/data model merely because they exist upstream. The owner wants a minimal logbook, with the demo's feature set and a better production experience.

## Later owner decisions

Phase 1 follow-through is recorded in [PHASE-1-SPIKES.md](PHASE-1-SPIKES.md). The cached
pinned package manifests name @sp/sync-core and @sp/sync-providers; registry queries for
both returned E404 in this session. No upstream code was vendored or integrated. The
independent durability/wrapping/transport/widget proofs do not validate an upstream build,
production cryptography or the full causal/migration pipeline. On 28 October the reviewed
choice became independent narrow ports plus vetted hash-wasm/WebCrypto primitives, with
no upstream vendoring. A Capacitor/Kotlin bridge and isolated browser/hosted checks now
exist. See [technical review](../docs/REVIEW-2026-10-28.md) and current verification for
actual results; production encryption and physical-device acceptance remain later gates.

The 24 follow-up answers are now accepted in [LAUNCH-DECISIONS.md](../LAUNCH-DECISIONS.md). Sync-first/optional encryption supersedes the earlier mandatory-encryption interpretation. iOS Safari/PWA and popular macOS/Linux browsers are launch targets, although device verification must still be obtained; native iOS is later. These product decisions do not change the pinned upstream findings.
