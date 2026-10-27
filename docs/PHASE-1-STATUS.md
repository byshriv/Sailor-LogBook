# Phase 1 status and unresolved execution decisions

Updated 27 October 2026. **In progress; exit gate not met.** Work is isolated from the
demo. No production data conversion, cloud writes, deployment or Phase 2 port occurred.

| Deliverable                   | Status                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Demo reference                | 37 runtime/assets/license files frozen with SHA-256 manifest; current demo behavior unchanged                                             |
| Product specification         | Preservation map and seven-achievement audit recorded                                                                                     |
| React/TS/Vite/Redux workspace | Isolated proof preview, pinned versions and npm lockfile, tokens/font assets, build/type checks                                           |
| Domain/storage spike          | Atomic IndexedDB command/operation proof, replay/corruption guard, failed-write handling and tests                                        |
| Single editing tab            | Web Locks implementation; browser lifecycle/second-tab execution pending                                                                  |
| Sync reuse                    | Actual upstream package names queried: E404; no vendored code; decision/evidence in research/PHASE-1-SPIKES.md                            |
| Encryption/recovery           | Dual wrapping/tamper proof and rotation contract; production KDF, serialized format and native trust unproved                             |
| Android/widget                | Typed projection/link tests and bridge contract; native compile/device proof pending                                                      |
| CI                            | Read-only checks/artifact workflow and Dependabot files authored; no hosted run or required-check settings verified                       |
| Security/contribution         | MIT retained; contribution/conduct/security/templates/changelog; narrow local secret scan and lockfile license inventory                  |
| Public foundation             | Public repo, remote, protected branch/environment, Issues labels/board, private vulnerability reporting and public demo tag still pending |
| Hosting                       | Existing logbook.shriv.work plan retained; account access/staging origin not verified                                                     |
| Preview review                | Build passes; in-app browser timed out; user stopped native Computer Use; UI/save/reopen review incomplete                                |

## Open items and decisions

1. **Repository/access (owner + implementing agent):** no GitHub CLI/connector was available.
   Prepare/publish the reviewed source to byshriv/sailor-logbook using authenticated access;
   verify owner/visibility, notices, secret/personal-data review, private reporting, branch
   protection and a hosted CI run. No token should be pasted into chat. Current files alone
   do not establish any remote setting. Local Git was initialized on branch main; no commit,
   remote, push, public tag or hosted setting has been created.
2. **Upstream adoption (implementing agent):** choose a complete pinned vendoring build with
   license/dependency evidence or a verified published release. Do not treat the 404 as a
   mandate to replace mature cryptography with new primitives.
3. **KDF/device budget (device testers + implementing agent):** benchmark vetted Argon2id and
   image/drawing/storage cases on actual supported hardware. No final caps have been set.
   Crypto serialization, verified recovery UX and rotation still require implementation.
4. **Android bridge (implementing agent + tester):** arrange JDK/SDK/Android Studio; generate
   the candidate Capacitor host, compile a minimal Kotlin publish/clear projection plugin,
   and test Quick log, private metrics, stale display, lock/reboot/process death on Android.
   Confirm stable app ID before a signed install; never request signing secrets in chat.
5. **Migration compatibility (implementing agent, owner reviews):** finalize full fixture
   schema and old-client retirement/unsynced-edit plan before enabling conversion. Phase 1
   has a contract; Phase 2 owns the converter and full durable model.
6. **Preview/architecture review (owner + implementing agent):** inspect sample save/reopen,
   second-tab refusal/recovery, failure copy and the ADRs. Browser checks were interrupted;
   they are not automatically waived. Keep Calendar and all large ports out of this phase.
7. **Hosting/external coverage (owner/testers):** verify Cloudflare/staging access and collect
   exact devices/browser versions, Safari/macOS/Linux testers and independent-review resources.
   These are execution inputs; the 24 product questions are already answered.

## Acceptance boundary

Phase 1 may close only after a clean source install/build and hosted CI evidence, review of
the architecture/migration/encryption/widget contracts, public repository setup, and honest
resolution or owner-approved treatment of the unproved technical gates. No such approval
is inferred from this batch. Continue Phase 1 in the next chat; do not silently start Phase 2.
