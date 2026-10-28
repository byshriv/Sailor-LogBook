# Phase 3 Calendar status and verification

28 October 2026. Local review branch: `codex/phase-3-calendar`. No PR publication,
merge, deployment, real-data migration or later-phase port was requested/performed.

## Repository baseline

Read PHASE-HANDOFF, LAUNCH-DECISIONS, LAUNCH-PLAN, ROADMAP, the Phase 2 status,
verification, ADR 0005, architecture review, earlier ADRs and cutover contract.
Fetched origin successfully and verified clean `main == origin/main`, zero ahead/behind,
at `7107798b96137a87328204d0db5576a80ecdc5ad`. GitHub's main branch endpoint matched;
PR #11 reports merged at 28 October 2026 10:53 IST with that merge commit.
PR #11's final head was `71cefbd1af670fb4b4ee0727da43324794b498aa`; its final required
checks passed in run 40631959812. That evidence is Phase 2, not Phase 3 hosted evidence.

## Delivered for Calendar review

- Responsive Day, mobile 2/4-day, desktop 3-day, Week and Month; date navigation, daily
  union totals, shared overlap lanes for activities/tasks and now-line.
- Menu B syntax/ghost/presets/More Options/Enter/Done; Menu A and expanded metadata,
  best-thing links, original/checked-WebP photo handling and Calendar task status controls.
- Pointer move/edge resize, stationary touch hold, draft resize, edge scrolling, zoom,
  keyboard alternatives, Escape/cancel and active-editor outside-tap protection.
- Linked midnight identity, original wall/zone preservation, explicit DST review,
  durable compound writes, media, immediate Undo and persistent 30-day recovery.

See [architecture](ARCHITECTURE-PHASE-3.md) for decisions, boundaries and data compatibility.
The root demo and frozen reference remain unchanged. The Calendar preview composes Phase 2;
production activation and the rest of the app shell remain separate work.

## Verification

Local Windows, Node 24.22.0 / npm 11.19.1, pinned dependencies. Six new domain/storage
regressions cover overlap chains, view ranges, quick matching, DST/midnight/travel,
compound-save failure/restart/Undo and media queue snapshots/atomic failure.
Eight new browser cases cover composed Calendar behavior, with Chromium/WebKit runs.

Final results and remaining platform gaps are recorded in PHASE-HANDOFF.md. Browser
JSON/traces and screenshots live in ignored build/test-results directories. No personal
logbook data is used. Native Blob support is probed independently: supported engines
must save/reopen exact original bytes; unsupported engines must retain the draft, write
no partial attachment reference/operation, and report photo storage failure. This branch
is not a claim that unsupported photo storage works.

## Owner review and release gates

Review the Calendar before accepting major interaction changes. In particular check
mobile Menu A/B placement/keyboard space, held resize, edge-scroll/pinch feel, dense lanes,
second midnight segment movement and desktop workspace proportions against v8. The review
surface does not imply approval of a redesigned complete app shell. Existing media budgets,
physical Safari/Android/storage-pressure/OS-kill, independent review and issues #2/#3 stay
open. Hosted Linux Firefox/required jobs must pass on the exact published head before merge;
no Phase 2 run substitutes for that. Stop at Phase 3; do not start the next port.
