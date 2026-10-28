# Phase 1 status — 28 October 2026

**Phase 1 complete: technical evidence and repository policy verified on 28 October 2026.**
Only Phase 1 was implemented. No production migration, deployment or large product port occurred.

| Deliverable              | Evidence/status                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public source            | [byshriv/Sailor-LogBook](https://github.com/byshriv/Sailor-LogBook), [PR #1](https://github.com/byshriv/Sailor-LogBook/pull/1); source published through connected GitHub tools       |
| Frozen demo              | 37 byte-preserved runtime/assets/license files with SHA-256 manifest; verified after an actual Git clone                                                                              |
| Specification/ADRs       | Seven-achievement audit, feature preservation map, four ADRs and [review](REVIEW-2026-10-28.md)                                                                                       |
| Workspace/durability     | Pinned React/TS/Redux/Vite, deterministic command proof, atomic IndexedDB state/operation/sequence, abort/retry/replay, Web Locks                                                     |
| Sync reuse decision      | Independent narrow ports; no unavailable @sp package or incomplete vendoring. Reuse vetted public hash-wasm/WebCrypto primitives                                                      |
| Encryption/recovery      | Dual wrapping/tamper proof, Argon2id WASM candidate, reviewed recovery/rotation contract; no production encryption format enabled                                                     |
| Browser checks           | 12/12 hosted tests: Chromium, Firefox and WebKit; disposable profiles, no PC control. Windows Chromium/WebKit pass; local Firefox spawn failed                                        |
| Android proof            | Capacitor/Kotlin app and test APKs built; two Android 12 emulator instrumentation tests passed; private projection/clear/revision and strict immutable launch intents                 |
| CI/source scanning       | check, android-proof and codeql green in [run 40564791258](https://github.com/byshriv/Sailor-LogBook/actions/runs/40564791258); final revision must retain green checks               |
| Clean clone/tooling      | Actual local Git clone: npm ci, type check, build and 37 reference hashes pass. CI checks clean Linux source                                                                          |
| Security/contribution    | MIT, notices in build artifacts, lockfile license inventory, templates, conduct/contribution/security docs, Dependabot, narrow local scan and scoped CodeQL                           |
| Private reporting        | Enabled by owner; read-only status independently verified                                                                                                                             |
| Main protection          | Protect Main verified Active; requires pull requests and check/android-proof/codeql, blocks force pushes/deletions, no bypass actors                                                  |
| Hosting                  | Existing logbook.shriv.work responds HTTP 200 over HTTPS through Cloudflare. No account/admin/staging access or production deployment was performed                                   |
| Public later-phase gates | [Device/browser/media/KDF evidence #2](https://github.com/byshriv/Sailor-LogBook/issues/2), [encryption/recovery/native trust #3](https://github.com/byshriv/Sailor-LogBook/issues/3) |

## Closure verified

The owner enabled Protect Main ruleset 25984549. Read-only verification confirms Active
protection for main, all three required GitHub Actions statuses, zero outside approvals,
blocked force pushes/deletions and no bypass actors. Private reporting is enabled.
PR #1 delivers the foundation through those checks. No admin action remains for Phase 1.
See [REPOSITORY-SETTINGS.md](REPOSITORY-SETTINGS.md) for the retained setup instructions.

## Work deliberately belonging to later phases

Full domain/causal clocks/checkpoints/fixtures/converter are Phase 2. Production encryption/
rotation/device budgets are Phase 9; production native unlock/widgets/signing are Phase 10.
Physical Safari/macOS/Linux/Android acceptance and independent review remain release gates,
not claims established by headless engines or emulator instrumentation. See issues #2/#3.
Cloudflare staging credentials/protected deployment environments are needed before deployment;
they are not requested in chat and no incomplete rewrite is deployed.

All 24 product questions remain answered. Item 2's technical review was performed under the
owner's delegated instruction; no further architecture terminology needs interpreting by them.
