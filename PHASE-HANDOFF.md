# Phase handoff — Phase 3 Calendar review

Updated 28 October 2026. Scope: Phase 3 only, explicitly requested after Phase 2 merged.
Calendar implementation is ready for owner review; acceptance and hosted exact-head checks
remain pending. Do not start Phase 4 or any later port from this handoff.

## Read first

LAUNCH-DECISIONS.md remains authoritative. Read docs/PHASE-3-STATUS.md and
ARCHITECTURE-PHASE-3.md, then LAUNCH-PLAN.md / ROADMAP.md. ADR 0005 and
VERIFICATION-PHASE-2.md describe the underlying domain/durable pipeline. Earlier ADRs,
PRODUCT-SPEC.md and migrations/V8-CUTOVER-CONTRACT.md still apply.

## Repository baseline and scope

Started clean on main. Fetched origin and verified main == origin/main, zero ahead/behind,
at `7107798b96137a87328204d0db5576a80ecdc5ad`. GitHub independently confirmed main and
PR #11's merge at that SHA. PR #11's final head `71cefbd1af670fb4b4ee0727da43324794b498aa`
passed check/android-proof/codeql in run 40631959812. Phase 2 evidence is not Phase 3 CI.

Local review branch: `codex/phase-3-calendar`, with separate local commits for the domain/storage work and Calendar UI/tests/documents. No main mutation, remote publication,
merge, force push, production deployment, live data migration or cloud mutation occurred.
The v8 root demo, frozen reference, artwork, fonts, dependencies and proof routes remain.
No Notebook, Home/Reflection, Planner board, Settings, PWA, sync or native feature port began.

## Implementation map

- packages/domain/src/calendar.ts: view/date ranges, quick syntax and deck recency,
  connected overlap groups across logs/plans, clock-derived statuses, midnight bounds,
  zone-aware rescheduling and explicit DST gap/fold review.
- packages/domain/src/logbook.ts: additive atomic `putMany`, one reversible relationship
  set and detached new-command Undo comparisons. Existing commands retain replay semantics.
- packages/persistence/src/logbook.ts and apps/web/src/logbook-store.ts: snapshot media
  before the serialized gateway, then use the existing atomic blob/head/tail/receipt commit.
- apps/web/src/calendar.tsx and calendar.module.css: isolated React Calendar, responsive
  Day/2/3/4/Week/Month, Menu B/A, presets, task controls, expanded metadata/photos, linked
  best things, hold/move/resize/edge scroll/zoom, keyboard alternatives and persistent Undo.
- tests/foundation/calendar.test.ts: six domain/storage regressions.
- tests/browser/calendar.spec.ts: eight composed-browser regressions, run in each engine.

Calendar shares `slb-phase2` and `slb-phase2-editor` with the Phase 2 preview. Redux loads
only verified state and publishes only committed writes. Failed saves retain drafts.
Pending operations are not acknowledged or compacted by a fake transport. No legacy
storage reader, service worker or production namespace was added.

Title-only edits keep exact historical segments/zone/offsets. Movement uses the record's
original zone; unknown context stays unknown. DST gaps/repeated times require explicit
start/end offsets in More Options. Midnight segments remain one identity; only the real
outer edges expose resize handles. A pointer ref captures the final position independent
of React batching. Draft resizing preserves text and commits only with Done. Outside taps
dismiss an editor without selecting another item. Alt+arrows move; Alt+Shift+arrows resize.

## Local evidence

Windows; Node 24.22.0/npm 11.19.1; pinned Playwright 1.64.1.

- `npm test`: all 85 demo tests pass.
- `npm run verify:foundation`: typecheck, boundaries, all 32 tests and preview build pass.
- Full Chromium/WebKit suite: all 30 checks pass, covering the earlier foundation/Phase 2
  checks plus 16 Calendar checks. The final Calendar-only rerun passed all 16 checks; the final mobile header/dismissal refinement passed both targeted engine checks.
- Firefox attempted with `--max-failures=1`: one launch failure (`spawn UNKNOWN`), 14 not
  run. No Firefox application pass is claimed. Hosted Linux execution remains required.
- `npm run check`, `npm run format:check`, `npm run scan:secrets` and 37 frozen hashes pass.
- Ignored build/calendar-desktop.png and build/calendar-mobile.png are review captures.
  Browser JSON/traces stay in ignored build/test-results paths. Only synthetic fixtures used.

The photo regression independently probes native IndexedDB Blob support. Chromium saves,
reopens, removes and restores exact original bytes. This Windows WebKit build rejects even
a standalone Blob put with `UnknownError: Error preparing Blob/File data to be stored in
object store`; its Calendar regression checks clear failure, retained draft and no partial
write. WebP encoding can also be unavailable in WebKit; neither case silently relabels or
changes canonical storage. This is a capability limitation, not claimed Safari acceptance.

## Review and continuation

Use `npm run dev:foundation`, then open `http://127.0.0.1:5173/?phase=3`.
Default `/` is still Phase 1; `/?phase=2` is the storage preview. Close another Phase 2/3
tab before editing; the shared Web Lock prevents competing editors. No personal backup,
credentials or live logbook is needed to review the synthetic Calendar.

Review mobile Menu A/B/keyboard spacing, stationary hold and visible-edge scrolling,
pinch/slider/Ctrl-wheel zoom, dense overlap lanes, second midnight segment movement,
expanded fields, preset quick-add, photo failure handling and desktop proportions against
v8. This isolated Calendar does not imply owner approval of a complete new app shell.
Do not mark the Phase 3 exit gate accepted without owner Calendar review. Before any merge,
publish through ordinary review and pass all required jobs on that exact head. No protection
or required check was changed or waived.

Review-only media budgets are 8 MiB input, 16M decoded pixels, 2048px / 1 MiB WebP output.
Keep original starts unchecked, retains bytes and explains storage/transfer cost. Physical
phone/Safari/storage-pressure/OS-kill and final empirical budgets remain release gates.
Synthetic held-pointer events are not physical touch or Safari evidence. Issues #2/#3,
production cutover/backup UI, optional encryption and transport/epoch safety remain open.
Keep recovery, pending operations, tombstones and referenced media conservatively. No
physical erasure or safe downgrade to older code after new commands is promised.
