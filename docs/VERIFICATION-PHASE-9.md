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
