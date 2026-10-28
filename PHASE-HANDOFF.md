# Phase handoff — Phase 4 Notebook and Sea adventure

Updated 28 October 2026. Scope: Phase 4 only. Branch: `codex/phase-4-notebook`.
Implementation is published for owner review in [draft PR #13](https://github.com/byshriv/Sailor-LogBook/pull/13). Do not start Phase 5
or any later port. No production deployment, real-data cutover or cloud mutation occurred.

## Baseline and accepted phase

Read this handoff's Phase 3 predecessor, LAUNCH-DECISIONS.md, LAUNCH-PLAN.md, ROADMAP.md,
docs/PRODUCT-SPEC.md, Phase 2 status/verification and ADR 0005, and Phase 3 architecture,
status and verification before implementing. The current owner request explicitly accepts
Phase 3 as complete and authorizes Phase 4 only. That acceptance is now recorded in the
launch register/plan, roadmap and Phase 3 status/verification.

Fetched origin and fast-forwarded local main without rewriting history. Verified
`main == origin/main`, zero ahead/behind, at `327ad8dfac702377e7b77b9c63226cf34af29cff`;
PR #12's merge is an ancestor. The GitHub connector independently reports PR #12 merged
at that SHA on 28 October 2026 at 11:32 IST. Its final head
`86cd491a80f64f895996c3e0ba09f36f1c1088c4` passed check/android-proof/codeql in
[run 40640483228](https://github.com/byshriv/Sailor-LogBook/actions/runs/40640483228), with
45 hosted browser checks and 32 foundation tests. Those are Phase 3 results, not Phase 4 CI.

## Implementation map

- `packages/domain/src/notebook.ts`: lossless page/line views, shared moments, quick syntax,
  stroke rendering validation, sent history, eligibility, weighted selection and monthly history.
- `apps/web/src/notebook.tsx`: isolated responsive Notebook/Sea, in-place writing, doodle
  editor, guarded free canvas, send/Edit, filters, bottle contents, failure drafts and recovery.
- `apps/web/src/notebook.module.css` and `notebook-art.ts`: scoped cream spread/Patrick Hand,
  responsive paper, original logo/ship/bottle/sea-card/water geometry and reduced motion.
- `apps/web/src/main.tsx`: lazy `/?phase=4` entry. The earlier routes remain compatible.
- `apps/web/src/calendar.tsx`: only a validated date-link initializer for Notebook links.
- `tests/foundation/notebook.test.ts`: four added domain/durability/migration/replay cases.
- `tests/browser/notebook.spec.ts`: six added composed cases per browser engine.

See [architecture](docs/ARCHITECTURE-PHASE-4.md), [status](docs/PHASE-4-STATUS.md) and
[verification](docs/VERIFICATION-PHASE-4.md) for behavior and evidence boundaries.

The port shares `slb-phase2`, the verified Redux projection, existing commands, durable
gateway, media store and `slb-phase2-editor` Web Lock with Calendar/Phase 2. It introduces
no schema or command revision. No legacy storage reader, fake transport acknowledgement,
service worker, fallback database or content collection was added. Existing record IDs,
unknown fields, attachment references and raw migration archives are preserved.

New drawing previews are derived SVG views of canonical editable strokes. Imported
raster-only previews still render, and existing digest blobs remain retained/verified.
No duplicate raster/data-URL preview is added to each new drawing operation. Vector
drawing therefore works without claiming that native Blob writes work in engines that
reject them. Photo encoding/storage behavior and its Phase 3 capability checks are unchanged.

## Local evidence

Windows; Node 24.22.0/npm 11.19.1; pinned Playwright 1.64.1.

| Check | Result |
| --- | --- |
| `npm test` | All 85 existing demo tests pass |
| `npm run verify:foundation` | Typecheck, boundaries, all 36 tests and production preview build pass |
| Full Chromium/WebKit browser suite | All 42 checks pass, including 12 Notebook/Sea and 16 Calendar checks |
| Firefox, `--max-failures=1` | Launcher fails with `spawn UNKNOWN`; 20 checks not run; no application pass claimed |
| `npm run check` / `npm run scan:secrets` | Pass |
| `npm run format:check` / `git diff --check` | Pass |
| `node scripts/freeze-demo.cjs` | All 37 frozen files verified |

The browser suite covers writing/focus, navigation/restart, drawings/Undo/clear/cancel,
send/Edit, all filters, monthly seen-history/restart, date review, shared best moments,
quota failure with retained drafts and blocked navigation, single-write retry, the shared
editor lock and persistent recovery after reload. The foundation suite additionally
checks exact migrated bytes/media, unknown fields, older-date weighting, month rollover,
ten-bottle limits and text/drawing causal replay into another synthetic store.

Inspected ignored captures `build/notebook-desktop-chromium.png`,
`build/notebook-mobile-chromium.png` and `build/sea-desktop-chromium.png`; corresponding
WebKit captures also exist. Browser reports/traces live in ignored build/test-results paths.
The last report is the Firefox launcher attempt; full Chromium/WebKit success is in the
recorded command output. Only synthetic fixtures were used.

Review commits separate domain/storage regressions, UI/browser interactions and documentation.
Published trees exactly match the local tested trees; the original history is preserved on
`codex/phase-4-notebook-local`. The active branch tracks the published history. See
docs/VERIFICATION-PHASE-4.md for the commit/tree mapping. Publication used the connected
GitHub Git-data tools without terminal credentials, force push or a main mutation.
No merge, required-check change or deployment is included.

## Review and continuation

Run `npm run dev:foundation`, then open `http://127.0.0.1:5173/?phase=4`.
Close another Phase 2/3/4 tab before editing. Calendar remains at `/?phase=3`; Notebook
best links retain the original day. The root legacy demo and frozen reference are unchanged.

Review desktop spread/send placement, mobile keyboard/focus and scrolling, real touch/pen
cancel/lost capture, guard/ink/width/Undo, imported drawings, sent Edit, bottle sizes and
filters, older-day selection and monthly history. Enter and blur commit lines; page/section
navigation and Send wait for drafts to save. Free strokes/Undo/clear save on completion;
line doodles keep Done/Cancel. Failed saves retain drafts. Recent changes offers 30-day
recovery after restart; retained media/tombstones are not a physical-erasure promise.

This isolated feature review does not accept a complete new shell or Phase 4 visuals on
the owner's behalf. PR #13 must pass check/android-proof/codeql on its exact head before merge;
use its checks and description for final hosted evidence. Physical Safari/phone/storage-pressure/OS-kill tests, empirical
media budgets, production cutover and issues #2/#3 remain release gates. Synthetic replay
does not certify production synchronization; real transport remains Phase 9. Do not begin
Home/Reflection, Planner, Settings, PWA or later ports from this handoff.
