# Phase 1 feasibility results

27 October 2026. These are scoped experiments, not production readiness or a security audit.

## Sync package reuse

The local source cache `.local/sp-architecture` has metadata pinning it to
17c6227b39ad5a818a0aa2fc3803723dcf63213d (see the architecture review). Read the cached root
and both package manifests, core public exports and Dropbox dependency contract during
this phase. Direct raw-GitHub fetch attempts were unavailable through the web tool.

| Check | Finding and consequence |
| --- | --- |
| Distribution | Pinned manifests name @sp/sync-core and @sp/sync-providers, both 1.0.0. Registry queries for both actual names returned E404. An initial guessed @super-productivity/sync-core query also returned E404. This establishes no public package was available to this session under those names, not that no other distribution exists. |
| Licensing | Cached root declares MIT. Package manifests do not independently declare a license. Before vendoring, obtain the exact full license/notice and complete pinned source/dependency tree. No upstream implementation was copied into our runtime. |
| Dependencies | core: @noble/ciphers ^2.2.0 and hash-wasm ^4.12.0; provider: hash-wasm ^4.12.0 and wildcard @sp/sync-core peer. Need an exact lock/build/CSP/native/WASM compatibility check before adoption. |
| Boundary fit | Core public exports include vector clocks, replay/operation helpers, encryption and transport classifiers. Dropbox injects logger/platform/web fetch/credential/native HTTP ports. These boundaries fit; no whole-app dependency is justified. |
| Product fit | Our required preview/recovery/conflict review, optional key wrapping/recovery, migration and journal rules still need an app integration layer. Upstream tests alone cannot prove these. |
| Build evidence | Neither package was built or integrated here. The source cache is a focused review subset. Do not claim a working upstream integration. |

Decision: **do not add an unavailable registry dependency or vendor an unbuilt source
subset**. Keep framework-neutral ports and independent minimal proofs. Revisit a complete
pinned/licensed vendoring build or a verified published release before real transport and
production crypto are selected. Reuse assessment is complete for this batch; adoption
remains an explicit gate, not an implicit fallback to hand-written crypto algorithms.

## Durable writes

The IndexedDB proof atomically commits head/sequence and one operation. Tests cover restart
replay, duplicate retry, reused-ID collision, concurrent writers, invalid dates, corruption
and a deliberately aborted write after one store write was queued. The abort rolls back
both stores and never fires the durability notification. A later retry succeeds at sequence
1. fake-indexeddb verifies transaction semantics in process; it is not an OS-kill, disk,
quota-pressure or Safari proof. No checkpoint/causal merge/migration is implemented.

## Optional encryption/recovery

The independent WebCrypto wrapping test produces a random master/recovery secret, verifies
both unlock routes, and rejects wrong passphrase, wrong recovery key and modified
ciphertext. Production format/KDF/rotation/device budgets remain unselected. See ADR 0003.
It neither changes the demo encryption format nor handles user data.

## Android and widgets

The platform contract rejects unknown deep-link actions and strips private text/default
unknown fields from widget projections. Capacitor candidate 8.5.3 was verified in the
registry; official v8 setup and Android widget docs were reviewed. Android Studio at the
standard path, java and adb were not found. No SDK scan/install, native build, signing,
Keystore or physical-device test was performed. ADR 0004 defines the bridge and the next
proof. This gate remains open.

## Preview/browser evidence

Type checking and production build pass. The in-app browser timed out connecting to
127.0.0.1:5173. Native browser verification was then stopped by the user's Escape key before
navigation/save/reopen/second-tab checks completed. No successful browser behavior or
visual QA is claimed. Resume those checks only in a later authorized turn.

Primary references: [pinned architecture evidence](ARCHITECTURE-REVIEW.md),
[Capacitor environment](https://capacitorjs.com/docs/getting-started/environment-setup),
[Android widgets](https://developer.android.com/develop/ui/views/appwidgets/overview),
[Vite build targets](https://vite.dev/guide/build).
