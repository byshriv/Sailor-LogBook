# Phase 9 verification — 29 October 2026

Synthetic data/disposable browser profiles only. No live Dropbox consent, cloud
mutation, personal backup, production deployment or native Phase 10 change.

Base verified after `git fetch origin`: local main fast-forwarded to origin/main
`df2310d7d6cc9dd09830724fc1d37bcc3ad48007`, PR #17 merge, with final published head
`9d01b6c09bb9d0275ff83f021e38ed0d10abad34` an ancestor. Owner README/DEPLOY diffs
remain uncommitted/excluded. Earlier Phase 8 handoff is in PHASE-8-HANDOFF.md.

## Regression scope

`tests/foundation/sync.test.ts` adds 17 cases: plain-first joining/receipts,
independent-field merge, concurrent alternatives, uncertain upload/offline read-back,
revision/local races, future versions/mutated previews/missing generations, recovery
quota abort, rescued generations/deletion barriers, encryption/recovery/tamper/downgrade,
provider create/update/auth error handling, PKCE state/code exchange, legacy revision
review, encrypted exact media/strokes, returning stale deletion/rejoin and archive
convergence, empty-device deletion-barrier preservation, same-generation cloud rollback,
and cancellation/local edits after upload, plus featured overflow retaining every text
while unrelated sync completes. The existing domain/durability/media/backup
suite remains.

`tests/browser/sync.spec.ts` composes the actual Settings UI with intercepted Dropbox
HTTP: plain preview/cancel/apply/offline and draft exclusion; recovery verification,
encrypted upload/backup import preview/Lock/reload; nonempty join/conflict choice/mobile
width; and fresh-browser encrypted unlock/join. CORS fixtures expose the revision header,
as the real provider must. Initial fixtures omitted it and correctly failed verification;
that was corrected without bypassing the read-back guard.

Final command/results are recorded below after verification. Browser engines establish
automated behavior only. WebKit is not physical Safari. No headless result is a live
Dropbox integration, independent security audit, native key proof or resource benchmark.

## Final local evidence

Toolchain: Node 24.22.0, npm 11.19.1, Playwright 1.64.1 on Windows.

| Command                                       | Result                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run verify:foundation`                   | pass: typecheck, boundaries, 85 foundation cases, production build                                |
| `npm test`                                    | all 85 unchanged demo cases pass                                                                  |
| `node scripts/freeze-demo.cjs`                | all 37 frozen files match                                                                         |
| `npm run scan:secrets`                        | narrow scan passes; not an independent review                                                     |
| `npm run format:check` and `git diff --check` | pass                                                                                              |
| Final focused Chromium/WebKit browser suite   | 10 pass, including backup-verified rejoin and independent encrypted backup recovery               |
| Final production PWA, Chromium/WebKit         | 2 pass, zero skips                                                                                |
| PWA Firefox attempt                           | fails before app launch: Windows `browserType.launch: spawn UNKNOWN`; no Firefox application pass |

The initial full 110-case browser run had 105 passes: two assertions still expected
Phase 7's unavailable-encryption copy, two WebKit fixtures navigated before the initial
lazy module finished, and an encrypted file fixture set its input while the download
operation still held the busy guard. The assertion now verifies actual plaintext/local
security limits, initial setup waits for the real screen, and file selection waits for
an enabled control. No page errors are filtered out and no read-back check was bypassed.
A final complete run follows these corrections and the deletion-barrier regression.

A subsequent full run was deliberately interrupted for the same-generation rollback /
empty-device barrier fix; it is not reported as a full pass. Foundation tests now cover
both cases and late cancellation/edits. Final full-suite outcome is recorded below.

Reviewed source snapshots: core `8a4be8c`, UI/browser `7a872c5`; documentation follows.
No PR was created/pushed and no hosted checks are claimed. A future PR requires passing
check/android-proof/codeql and separate CodeQL results on its exact final head.

Final build: `slb-production-2bf69b6973e020b2`, 28 cached assets. Production PWA fixtures
restore their temporary test releases in finally; no artifact was promoted.

| Artifact                            | SHA-256                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `build/foundation/index.html`       | `48de126ec92fc508cdf5d657fca9e988bf6cdc73dd0043ab46765f3fc937d7ad` |
| `build/foundation/sw-production.js` | `2858294110b119c7df57caaf09cb9022738f8cf3b35ac0977529af35ded9eac1` |

Owner files remain unchanged from the initial dirty state: README has six added lines
(SHA-256 `cdf4694d0cbf3e53394ef3a4c7a4e6edfdd57d1af1b5feacf06f5a8d036265cb`),
DEPLOY seven (`e242138dd63b994c439e3a64814d780781cd49433b350155eb39476aa8d6d844`).
They are excluded from Phase 9 commits. No existing database or owner browser was opened.

## Final complete run and narrow overflow follow-up

`npx playwright test --project=chromium --project=webkit --workers=2`: **110 pass,
zero fail/skip** on core `8a4be8c` and UI `7a872c5`. Saved report:
`build/browser-phase9-final-full.json`. This is the completed full run, superseding
the initial fixture/copy failures and the deliberately interrupted attempt.

The final accepted-rule follow-up `7102eb7` retains all overflow moment text and
leaves a day unfeatured for the existing Home chooser without blocking unrelated sync.
After it: `npm run verify:foundation` passes **85 foundation cases**, typecheck,
boundaries and final build; focused sync Chromium/WebKit **8 pass/zero skip**; final
production PWA **2 pass/zero skip**. No other earlier-screen source changed after the
full run. Final reports: `build/browser-phase9-final-overflow.json` and
`build/pwa-results.json`. The 110-case result and final focused result are distinct
verification evidence, not an invented single full run at the later commit.

Fresh final fetch still shows `main == origin/main`, zero ahead/behind at `df2310d`.
Only the three source review commits and the final documentation commit are local.
Phase 9 owner acceptance/live exit gates remain pending; do not start Phase 10 or deploy.

## Credential-change follow-up — 29 October 2026

The next scoped Phase 9 step implements combined passphrase/recovery-kit replacement.
Settings → Dropbox synchronization → Change passphrase and recovery kit requires an
unlocked key and connection. Complete a reviewed encrypted sync first. Authenticate
with the current passphrase or recovery code, confirm the new passphrase, save the new
kit and re-enter its code. Keep the same passphrase if only replacing the recovery kit.

The master/key ID and logbook generation remain unchanged. Fresh salt/nonces/wrappers
and recovery secret replace the credentials, and full content is re-encrypted because
AAD binds the setup. The engine verifies that the replacement preserves the master.
Before CAS upload it verifies local recovery, retains the old cloud source and persists
an exact-byte intent. Independent provider read-back and content/media validation must
succeed before policy and anchor change atomically, with the old policy retained in an
unaged migration archive. Failed writes/transactions retain old policy; uncertain
successful writes recover from exact read-back without another upload. An interruption
is not a rollback. The newly saved kit/passphrase can unlock the updated cloud copy.
Old-wrapper clients cannot upload over the new manifest through ordinary sync. Old
backup files remain readable using their own old kit/passphrase. No key/token revocation,
remote erasure, live Dropbox pass or independent security audit is implied.

Validation for this follow-up:

- `npm run verify:foundation`: typecheck, boundaries, **91 foundation tests** and build pass.
- Six new foundation cases cover current/replacement secrets, unchanged master/old backups,
  CAS conflicts, pending local edits, uncertain writes/cancellation, atomic quota rollback
  and rejection of a different content master.
- Sync and backup browser suite: **18 pass** across Chromium/WebKit, including the new
  credential-change flow. Report: `build/browser-phase9-credentials-sync-backup.json`.
- After adding the explicit interruption control: final focused credential browser tests
  **2 pass**; production PWA **2 pass**. Reports: `build/browser-phase9-credentials-final.json`
  and `build/pwa-results.json`. This is targeted follow-up evidence, not a new full 110-case run.
- Formatting, whitespace, narrow secret scan and all 37 frozen hashes pass.
- No fresh Firefox pass is claimed; its earlier pre-launch Windows failure remains.
- Owner README/DEPLOY hashes match the preceding record exactly and remain excluded.

Final follow-up artifact cache: `slb-production-0bc79a32554be5f1` (28 assets).
`build/foundation/index.html` SHA-256:
`e80f2484475dc0811beba0a45cdc472f985b77df3a6f9232be5d0d166f9834bc`.
`build/foundation/sw-production.js` SHA-256:
`d5790e4540247599fa6a134ada4fdd84007e90919895a25fc082fdc6c0cbf19d`.
No deployment or Phase 10 work. Content-key rotation/lost-device and erasure workflows,
physical-resource/security review and live Dropbox rehearsal remain open.

## Content-key / lost-device follow-up — 29 October 2026

Source commit `81ec0c7` adds independent content-master replacement and a guided
lost-device flow. The old passphrase/recovery code authenticates the current wrapper;
a current external backup, explicit provider-access review, typed ROTATE and a saved,
verified new kit are required. New passphrase unlock is verified during preparation.
The replacement master, key ID and cloud generation are independent of the old key.
The complete verified shared backup/media is re-encrypted before CAS replacement.

The common change engine retains local recovery and the old incoming source, persists
an exact-byte transition intent, and verifies provider revision/bytes plus decrypted
content/media before atomically updating policy/anchor. Ordinary old-generation clients
cannot auto-upload. Only the originating actor's matching exact-byte intent can recover
an uncertain generation transition, and it must authenticate the new ciphertext first.
Edits saved after the upload stay pending locally; rotation recovery acknowledges none
of those edits. Missing/wrong new keys cannot advance the policy. Backup/source/media,
legacy revision and CAS protections remain. Old backups keep their old unlock routes.

The provider-security guide uses Dropbox's current official guidance:
[Secure devices, sessions and connected apps](https://help.dropbox.com/security/unknown-device-linked).
No provider account/device list was read or modified. The acknowledgement records the
user's review, not verified token revocation. A still-authorized malicious Dropbox
writer may replace/delete provider files outside this cooperative protocol. New keys
cannot retroactively protect old copies, local plaintext stores or historical revisions.
Erasure is still unimplemented. No Phase 10 work, deployment or independent audit.

Follow-up validation:

- `npm run verify:foundation`: typecheck, boundaries, **96 foundation tests** and build pass.
- Five new core cases cover exact media/full-state re-encryption, old-backup readability,
  old-generation blocking/fresh-device joining, uncertain transition with later local edits,
  wrong/stale recovery inputs, reused-master rejection, CAS and final-transaction quota failure.
- Sync/backup browser suite: **20 pass** across Chromium/WebKit. It exercises the new
  backup/provider-review/ROTATE/kit guards, generation change, and independent old-backup
  recovery followed by current-key unlock. Report:
  `build/browser-phase9-content-key-sync-backup.json`.
- After adding the strict new-key-ID guard and explicit new-passphrase verification:
  final credential/content-key browser checks **4 pass**; final production PWA **2 pass**.
  Reports: `build/browser-phase9-content-key-final.json`, `build/pwa-results.json`.
- Formatting, whitespace, narrow secret scan and all 37 frozen hashes pass.
- README/DEPLOY hashes still match the earlier owner-edit record exactly and remain excluded.
- Earlier full-suite/Firefox evidence is historical; this follow-up does not claim a fresh
  full 110-case run, Firefox pass, physical-device measurement or real Dropbox integration.

Final artifact cache: `slb-production-9a43185990e30c8a`, 28 assets.
Index SHA-256 `5bbf04a524de31ae7109dba145ad3ec446e2733b61337d2f4700f9515cfc4f37`;
worker SHA-256 `9a77fcfaa679c11399a39d96a7b4a2f40edfe4c233ac9839a022bd99ab3c60bf`.
All commits remain local. Phase 9 owner/live exit acceptance is pending.

## Permanent erasure follow-up — 29 October 2026

Source review commits: core `ab248d7`, screens/browser tests `dac7c53`; documentation follows.
Implemented separate Erase local data and Delete logbook everywhere. Selection/cancellation
is read-only; typed scope confirmation, no-Undo acknowledgement and the cloud legacy-writer
acknowledgement precede changes. Current sync is aborted/drained before review, minute checks
stop, and active drafts block entry. A confirmed persistent job fences all normal writes/sync.

Cloud flow CAS-installs and reads back a content-free `slb-erased` generation marker, deletes
only reviewed owned files with their exact `parent_rev`, re-lists the owned scope and verifies
the unchanged marker before local clearing. Current production content/media is in its complete
manifest; legacy data and reserved own media/backup paths are explicit targets. Unknown files,
folders and unrelated data are never recursively removed. Partial/uncertain/offline results keep
all local content/keys and a retryable job. Changed/recreated files require new explicit review.
A late cooperative upload loses its old-revision CAS race; stale/fresh clients refuse the barrier.

Local clearing atomically removes all production content, media, pending operations, receipts,
trash, recovery/migration source archives and keys. The result retains only a blank actor /
checkpoint, content-free receipt and handle epoch. Old handles cannot write after erasure or
a new local restart. Completed-result reads verify a blank state, the exact allowed metadata
keys and empty personal stores; inconsistent results fail for recovery instead of claiming
success. Malformed/future/content-bearing deletion jobs fail closed. The UI reloads after clear
to discard its old projection and session secrets, and suppresses first-run setup on the result.

This is logical erasure, not a physical secure-wipe guarantee. Other profiles/devices, separate
demo storage, downloaded backups and Dropbox-managed deleted files/history remain. Legacy demos
can recreate their old file; malicious authorized provider writers are outside the cooperative
protocol. Retire/revoke them manually. A deletion marker deliberately remains in Dropbox; new
cloud initialization after erasure is not implemented. The restart offered here is local.
See [ADR 0007](adr/0007-phase9-permanent-erasure.md) for scope/ownership/API details.
No real owner data, account, deployment or native Phase 10 work was touched.

Validation:

- `npm run verify:foundation`: typecheck, boundaries, **107 foundation cases** and build pass.
- Eleven new core cases cover preview/cancellation, current-copy races, complete local clearing,
  old-handle fencing, cloud marker/ownership, stale/fresh devices, an in-flight upload race,
  partial/offline/uncertain results, legacy recreation, atomic quota rollback, paginated provider
  inventory/conditional deletion and malformed/residual-data integrity guards.
- Full Chromium/WebKit suite: **120 pass**, zero fail/skip before the final malformed-job/result
  integrity checks and deletion-status copy hardening. Report: `build/browser-phase9-erasure-full.json`.
- After those narrow follow-ups: final erasure Chromium/WebKit **6 pass**, zero skip;
  final production PWA **2 pass**, zero skip. Reports: `build/browser-phase9-erasure-final.json`
  and `build/pwa-results.json`. The final source adds only clearer inventory-limit error wording
  after the focused run; its exact rebuilt artifact passes both final production PWA cases.
- `npm test`: all **85** unchanged demo cases pass (`build/demo-erasure.log`).
- Formatting, whitespace, narrow secret scan and all 37 frozen hashes pass. Owner README/DEPLOY
  hashes still match the preceding records exactly and remain uncommitted/excluded.
- The first erasure-only browser run had five passes and one fixture read racing the intentional
  post-erasure reload. Explicit navigation waits corrected the fixture; no page error or assertion
  was suppressed. The subsequent 120-case full run passes.
- No new Firefox, real Dropbox, physical-device, malicious-writer prevention or independent audit
  result is inferred. Existing platform/security/live exit gates remain open.

Final rebuilt artifact cache: `slb-production-ba4304af72641721`, 28 assets.
Index SHA-256 `070e806acf563f55c215f82c875b0348b00bdab063b90c25bd4540d1d1c68cdd`;
worker SHA-256 `adb4dff8ffbc798c7bf2f647fd65256f3984fcf3c6f322efd1dabed7dcc616ff`.
Commits are local only; no PR publication or hosted checks are claimed. Phase 9 acceptance is
still pending. Do not advance to Phase 10 or deploy.

## Explicit cloud restart follow-up — 29 October 2026

Source review commit: `5cf77d4`. After verified erasure, ordinary sync still refuses the
cloud deletion marker. A separate typed/acknowledged preview can create a fresh empty
cloud generation from an empty local session with no retained history or previous sync
journal. Changed markers, legacy revival, owned leftovers and competing requests fail
without overwriting the winning cloud copy. Configured encryption requires matching unlock.
Intent persistence atomically checks fresh state, retained stores and the expected policy.

The exact empty request is durable before upload. Uncertain results/reload block ordinary
sync and policy changes; explicit review verifies identical already-uploaded bytes or
retries only against the original marker revision. Read-back, inventory, backup/decryption
and an atomic local receipt precede success. No operation IDs are acknowledged: later local
edits stay pending for separate sync review. A changed old-device generation stays blocked.
No live account or personal erasure/restore was performed. See [ADR 0008](adr/0008-phase9-explicit-cloud-restart.md).
This supersedes the cloud-restart limitation recorded in the earlier erasure follow-up.

Validation:

- `npm run verify:foundation`: typecheck, dependency boundaries, **116 foundation cases**
  and final production build pass.
- Nine new core cases cover read-only review, empty/history checks, erased-handle fences,
  encryption enforcement, changed markers/legacy/leftovers/competitors, uncertain uploads,
  newer local edits, mismatched read-back, cancellation, atomic receipt quota failure,
  stale generations and cross-tab intent-persistence races.
- Final sync/erasure/backup Chromium/WebKit suite: **30 pass**, zero failure/skip. Report:
  `build/browser-phase9-new-cloud-final.json`.
- Initial and repeated runs each had 29 passes and an existing WebKit download/import
  fixture timeout. The downloaded-file event precedes completion of export UI work;
  `setInputFiles` does not wait for an enabled input. Explicitly waiting for import readiness
  fixes the fixture; assertions and page-error checks remain enabled. Reports retained as
  `build/browser-phase9-new-cloud-initial.json` and `build/browser-phase9-new-cloud-pre-readiness.json`.
- Final production offline/update Chromium/WebKit: **2 pass**, zero failure/skip; report
  `build/pwa-results.json`. Production artifact restored after update simulation.
- Formatting, whitespace, narrow secret scan and all 37 frozen demo hashes pass.
  The existing 85-case demo pass remains the preceding follow-up's evidence; no demo source changed.
- Owner README/DEPLOY hashes remain byte-identical to the preceding records and excluded
  from commits. No new Firefox, actual Safari/physical device, live Dropbox or independent
  security result is claimed. Phase 9 owner/live acceptance remains pending.

Final artifact cache: `slb-production-ccb88786f62c6cd6`, 28 assets.
Index SHA-256 `ab2b39f3d03765fdbb3733b579ee32f0e17d76b4a843003d21aed8dc2f447441`;
worker SHA-256 `59de7a03a435ac0219b06b3a4795ac636dfcaa885274f48b57f5a8ada3fbaf32`.
Local commits only. No PR publication, deployment or Phase 10 work.

## Scheduling and review publication validation — 29 October 2026

Source `0076922` adds guarded automatic review scheduling and accurate local pending status
on every production screen. Main was fetched/current, zero ahead/behind with origin/main
at PR #17 merge `df2310d`. Phase 8 remains accepted; Phase 9 owner/live acceptance is pending.

- `npm run verify:foundation`: typecheck, boundaries, **122 foundation cases** and build pass.
  Log: `build/phase9-review-foundation.log`.
- Six new core cases cover opt-in/debounce/eligibility, bounded retries/provider delays,
  burst resistance, long-delay/permanent-error pause, nonoverlap/disposal, server-date
  clock-skew handling and committed-only scheduling (failed saves/refresh do not trigger).
- Focused scheduling/status Chromium/WebKit: **6 pass**, zero failure/skip. Report:
  `build/browser-phase9-scheduling-focused.json`. Initial browser run caught incorrect
  native timer receiver binding; wrapper functions fixed the implementation. Cross-screen
  shortcut fixtures now wait for the screen to mount, and allow legitimately different
  pending counts after local achievement effects. Assertions/page-error checks remain.
- Final production offline/update Chromium/WebKit: **2 pass**, zero failure/skip. Report:
  `build/pwa-results.json`. Final artifact is restored after update simulation.
- Existing demo suite **85 pass**, zero failure/skip (`build/phase9-review-demo.log`).
  Syntax/manifests/offline assets, formatting, whitespace, narrow secret scan and all 37
  frozen hashes pass. Owner README/DEPLOY hashes remain unchanged and excluded.
- Registry audit (`build/phase9-review-audit.json`) reports **0 high/critical**, **3 moderate**
  dependency nodes: pinned development `@capacitor/cli` → `xcode` → `uuid`, with advisory
  GHSA-w5hq-g745-h8pq and an available CLI update. The existing upstream toolchain alert
  is retained for review; this is not a zero-vulnerability claim or an independent audit.
  No Phase 10 toolchain/native feature migration is included.

Final artifact cache: `slb-production-94c80a408981ebb4`, 28 assets.
Index SHA-256 `fa41c8c53fa0ee1a38eea2dd34983894f6f7854b69363ca259cafad648015d90`;
worker SHA-256 `e4f683c4b4afb08439fb4e4f7af13b72101062f4ece2b05eee67b0c43785c6c9`.

[Live rehearsal](PHASE-9-LIVE-REHEARSAL.md) is a required procedure, not executed evidence.
Tokens/keys remain memory-only. Navigation/reload requires reconnecting; cross-screen
continuous transfer and closed-app sync remain unavailable. No new actual Firefox,
physical Safari/Android, live account or independent security result is inferred. All
existing acceptance gates remain open. Publication is for review, not merge/deployment.

Final full Chromium/WebKit regression: **130 pass**, zero failure/skip/flaky, across all
production screens and Phase 9 workflows. Report: `build/browser-phase9-review-full.json`.
This final run follows the timer-binding/readiness fixes and uses source `0076922`.

Published for owner-authorized review as [draft PR #19](https://github.com/byshriv/Sailor-LogBook/pull/19),
`codex/phase-9-sync` → `main`. Original local commit history is pushed intact; no Git-data
snapshot rewrite, force push, merge or deployment occurred. Final documentation is pushed
with the handoff. Hosted jobs/CodeQL must be checked on that final head; local passes do
not establish hosted Firefox, Android-proof or CodeQL results. Phase 9 remains unaccepted.
