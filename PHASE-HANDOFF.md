# Phase handoff — Phase 8 offline, backups and recovery

Updated 28 October 2026. Branch `codex/phase-8-recovery`. Phase 8 implemented for owner
review at `/?phase=8`; Phase 8 acceptance remains pending. Phase 9 and later ports remain
gated. No production deployment, real-data cutover, Dropbox connection or main push.

## Acceptance and baseline

The owner's continuation explicitly accepts Phase 7 as complete and authorizes Phase 8
only. Acceptance is recorded in launch decisions, plan, roadmap, product spec and Phase 7
status/verification. Earlier review-era pending-acceptance text is historical. The previous
handoff is retained in [Phase 7 handoff](docs/PHASE-7-HANDOFF.md).

Read this handoff, LAUNCH-DECISIONS.md, LAUNCH-PLAN.md, ROADMAP.md, docs/PRODUCT-SPEC.md,
earlier architecture/ADRs/verification, then the Phase 8 documents before continuing.
Fetched origin at start and finish. Local `main == origin/main`, zero ahead/behind, at
`887fcdda9855e6fad62f5c05589110f8b25412aa`, PR #16's merge, with final head
`e7b77bbfb11429ee48c48ed4a5b8dbebe89cc5af` an ancestor. Merge recorded 23:14:48 IST.
No hosted Phase 8 result is claimed; Phase 7 acceptance does not substitute for it.

README.md and DEPLOY.md retain the exact pre-existing owner changes and remain uncommitted.
They are excluded from Phase 8 commits. All 37 frozen reference files and the root demo
remain unchanged. Phase 13 final owner review and Phase 14 deployment gates remain.

## Implementation map

- `packages/persistence/src/backup.ts`: version 1/schema 2 plaintext backup, whole payload
  and media verification, existing v8 converter, read-only preview, Merge/Replace planning,
  collision/deletion choices, revalidation and stale-preview checks.
- `packages/persistence/src/logbook.ts`: expected-baseline commit guard, recovery read-back
  before mutation, media-verified recovery snapshots and explicit damaged-store rescue with
  retained forensic history. Existing causal commands remain unchanged.
- `apps/web/src/data-tools.tsx`, `recovery-screen.tsx`: Settings tools, previews, quota retry,
  recovery/health and startup forensic export/rescue. Projection adds db/refresh composition.
- `apps/web/src/pwa.tsx`, `scripts/production-pwa.cjs`: production browser bootstrap,
  original-icon manifest, complete artifact cache, waiting update/status and owned cleanup.
- `main.tsx`: Phase 8 route and production browser root. Existing Capacitor proof/default
  native entry stays Phase 1, with no web worker registration. No Phase 10 port.
- Foundation/browser/PWA tests, standalone PWA config/script, and CI PWA check after build.

See [architecture](docs/ARCHITECTURE-PHASE-8.md), [status](docs/PHASE-8-STATUS.md),
[user guide](docs/PHASE-8-DATA-GUIDE.md) and [verification](docs/VERIFICATION-PHASE-8.md).
All accepted screens retain the same schema 2 store, media pipeline and editing Web Lock.

## Reviewable interactions and limits

Settings → Storage & data provides explicitly labelled plaintext download, file preview,
Merge/Replace, per-ID collision choices, manual point, health/list and confirmed restore.
Selecting/cancelling writes nothing. Invalid combined references/featured limits block Apply.
Legacy exclusions/orphan references require explicit review; exact source/unknown fields stay
archived. Missing/future/corrupt files fail closed. Source and baseline are checked again at
Apply; recovery, blobs, head, receipt and tail commit atomically. Failure retains the preview.

Backups include full current state and all retained media without recompression. Whole-file
transfer is provisionally limited to 64 MiB and uses memory; larger files are rejected without
trimming content. Imported trash/tombstones/history stay in the complete source archive rather
than impersonating local causal operations. Existing local recovery/trash/media remain retained.
Downloads cannot prove disk writes; verify the actual file with Preview import. Encryption/key
setup and Dropbox remain Phase 9. No production key policy is configured or downgraded here.

Five ordinary local points share browser storage and do not replace an external copy. Healthy
restore is a causal recover command plus pre-restore point; referenced media hashes must verify.
A damaged Phase 8 startup offers forensic retained-store export and verified snapshots. Explicit
rescue archives every damaged store before creating a new actor/baseline; it never acknowledges
or uploads old operations. **Phase 9 must treat rescue as a new local generation requiring
join/review.** No valid point means retain/export data for manual recovery, never auto-clear.

Production uses a dedicated secure origin, separate from Demo v8. Dev registers no worker.
All screen chunks/fonts/icons are precached. No skipWaiting/claim/forced reload: save drafts,
close **all controlled old tabs/windows**, then reopen to activate a waiting update. A failed
required-asset install retains the active shell. Cache cleanup touches only owned production
caches; unknown/demo workers are refused. No database migration was introduced. Future schema
rollback still requires explicit compatibility checks; frontend rollback is not a DB downgrade.

Browser install UI/persistence/estimates/notifications vary. OS clearing, unsaved OS-kill loss,
physical Safari/phone/storage-pressure, keyboard/insets, empirical media budgets, independent
accessibility/security review and existing #2/#3 gates remain. No cloud/native/device pass or
audit is inferred from headless tests. Required hosted check/android-proof/codeql and separate
CodeQL results must pass on a published PR's exact final head before merge.

## Verification and continuation

Use synthetic fixtures/disposable profiles only. Exact commands/results and corrected fixture
findings are recorded in docs/VERIFICATION-PHASE-8.md. Local Firefox currently fails before
application launch with Windows `spawn UNKNOWN`; no Firefox application pass is claimed.
Chromium/WebKit native media capability tests retain their explicit failure paths.

Data-tool review: `npm run dev:foundation`, then `http://127.0.0.1:5173/?phase=8`.
Offline review: `npm run build:foundation`, then
`npx vite preview apps/web --outDir ../../build/foundation --host 127.0.0.1 --port 5175`.
Use `http://127.0.0.1:5175/?phase=8&tool=help` to bypass empty-store setup for review.
`npm run test:pwa` requires the build first and tests a disposable localhost origin. It
stages test releases in the ignored build and restores files in finally; no deployment.

Continue Phase 8 review/fixes only. Do not start Phase 9, connect Dropbox, activate production
migration, erase owner data, publish/merge/deploy or change native platform scope without
appropriate authorization. Owner visual/interaction acceptance is still needed for this phase.

## Final local review record

Review commits: `272fbf8` (backup/import/recovery persistence and 11 regressions),
`9625445` (PWA/data UI, browser/production tests and CI), followed by the documentation
commit containing this handoff. Commits are local; no PR was created or pushed.

Final local evidence: all 85 unchanged demo tests; all 68 foundation tests; typecheck,
boundaries and production build; full Chromium/WebKit suite 102 pass/zero skips; final
Phase 8 follow-up 8 pass; production PWA 2 pass. Formatting, whitespace, narrow secret
scan and all 37 frozen hashes pass. Firefox remains a pre-launch Windows failure.
Full and final focused browser reports are retained under ignored `build/`; see verification.

The tested final shell cache is `slb-production-ffe8e2dd6d2e0ae9`. No production artifact
was promoted. Only README.md and DEPLOY.md should remain modified after these commits.
