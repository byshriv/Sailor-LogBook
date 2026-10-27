# Phase 1 verification — 27 October 2026

Executed on Windows, Node 24.22.0/npm 11.19.1. No real logbook or live Dropbox account used.

| Check                                 | Result                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Root demo check/tests                 | Pass: syntax/manifests/offline files; 85 tests, 0 failures/skips                                 |
| Foundation type/import checks         | Pass for source and static flat-package dependency directions                                    |
| Foundation tests                      | 8 pass, 0 fail, 0 skip                                                                           |
| Production preview build              | Pass with Safari 17/Chrome 111/Firefox 114 target; not browser API verification                  |
| Formatting                            | Pass for files included in format:check                                                          |
| Narrow secret scan                    | Pass; not a complete publication/security review                                                 |
| Frozen reference                      | 37 SHA-256 hashes pass                                                                           |
| License inventory                     | 146 lockfile entries, 0 missing license metadata; includes optional platforms, not a legal audit |
| Fresh-source npm ci                   | Pass: 75 installed packages, audit summary 0 vulnerabilities at check time                       |
| Fresh-source demo tests               | 84 pass, expected ignored-v1-reference skip, 0 fail                                              |
| Fresh-source foundation/format/build  | Pass after refreshing final source changes                                                       |
| Hosted CI / actual Git clone          | Pending: no commit or remote                                                                     |
| Browser visual/save/reopen/second-tab | Incomplete: in-app timeout; native Computer Use stopped by user                                  |
| Native widgets/Keystore/device tests  | Not run; toolchain/device unavailable in this session                                            |

The first offline clean install failed ENOTCACHED; authorized network npm ci succeeded.
The source-copy check excludes ignored node_modules/.local/private Git state. An initial
format check caught a stale copy of a formatted crypto file; final refresh/check passed.

The eight foundation cases cover revision update/create-only races and no downgrade;
widget privacy/strict links; passphrase/recovery master-key equality with wrong-key/tamper
rejection; queued caller mutation; save/reopen/duplicate/ID collision; concurrent writes;
transaction abort with no durability notification and successful retry; invalid date and
corrupt head/tail rejection.

fake-indexeddb verifies in-process transaction behavior, not hardware durability, OS kill,
real quota or Safari behavior. Local sequence is not a sync clock. No full migration,
checkpoint compaction, native widget, production crypto/recovery serialization or rotation
is validated. See research/PHASE-1-SPIKES.md and docs/PHASE-1-STATUS.md for open gates.
