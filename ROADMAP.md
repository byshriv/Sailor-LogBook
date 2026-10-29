# Sailor Logbook roadmap

## Current acceptance — Phase 9 continuation

Phase 8 is accepted and complete by explicit owner instruction on 29 October 2026.
Fetched origin and fast-forwarded local `main == origin/main`, zero ahead/behind,
at `df2310d7d6cc9dd09830724fc1d37bcc3ad48007`, PR #17's merge, including final
head `9d01b6c09bb9d0275ff83f021e38ed0d10abad34`. Only Phase 9 is authorized.
Implementation/review status: [Phase 9](docs/PHASE-9-STATUS.md). Phase 10+, real-data
cutover and deployment remain gated. Earlier pending-acceptance text is historical.


| Phase | Goal | Status |
| ----- | ---- | ------ |
| 0 | Mobile v1 demo: calendar, notebook, reflection, onboarding and local PWA | done |
| 0.1 | Desktop demo, Dropbox, shortcuts/tours, responsive UI, update notice and final v8 Settings fix | done; demo v8, cache slb-v8-r3; 85 tests pass; physical-device limits documented |
| 1 | Public GitHub foundation: tooling, CI, MIT/docs, tokens, architecture decisions and storage/sync/encryption/widget feasibility spikes | complete; public foundation, clean CI/browser/emulator proofs, reviewed contracts and active main protection verified; see docs/PHASE-1-STATUS.md |
| 2 | Shared TypeScript domain, React/state architecture, canonical IndexedDB, durable operations, linked-day/overlap rules, Undo/30-day recovery, WebP media and safe demo migration | merged in PR #11 at 7107798; final required checks passed; see docs/VERIFICATION-PHASE-2.md |
| 3 | Calendar port: views, +deck quick-add, drag and resize | accepted and complete by owner instruction; PR #12 merged as 327ad8d; final required jobs and 45 hosted browser checks passed; see docs/PHASE-3-STATUS.md |
| 4 | Notebook port: text, drawing, bottles and Sea adventure | accepted and complete by owner instruction; PR #13 merged as 953205b; final workflow and CodeQL results pass with 63 Linux browser checks; see docs/PHASE-4-STATUS.md |
| 5 | Home and Reflection port: dashboards, streaks and achievements | accepted and complete by owner instruction; PR #14 merged as 5792285; final hosted run 40682341891 passes required jobs and separate CodeQL results; see docs/PHASE-5-STATUS.md |
| 6 | Tasks and Planner port: must-do, rollover, statuses and Voyage progress | accepted and complete by owner instruction; PR #15 merged as 9debb35; see docs/PHASE-6-STATUS.md |
| 7 | Settings/profile, decks/presets, onboarding/tours, reminders, search, accessibility and capability copy | accepted and complete; PR #16 merged as 887fcdd; Phase 8 only authorized |
| 8 | PWA hardening: offline updates, backup, export and import | accepted and complete by owner instruction; PR #17 merged as df2310d |
| 9 | Production Dropbox sync first; optional E2EE content, passphrase/recovery key, trusted Android unlock, conflict review and cross-version safety | implemented for review at /?phase=9; live-account and platform exit gates pending |
| 10 | Signed Android APK via GitHub Actions; native lifecycle/reminders; Quick log and Today / best thing widgets | required for 1.0 |
| 11 | Owner-led UI/usability refinement and bug fixing; browser/device tests, accessibility, performance, security and RC soak | required; owner feedback tracked throughout earlier phases too |
| 12 | Documentation, privacy/security/support, third-party notices, contributor/repository polish and release preparation | planned |
| 13 | Final owner-dictated review: errors, bugs, UI/UX changes, missing behavior and Demo v8 parity; implement, retest and repeat until accepted | required before deployment; see docs/PRE-RELEASE-OWNER-REVIEW.md |
| 14 | Approved 1.0.0 web/PWA + signed GitHub APK; migration/recovery verification and post-launch triage | planned; Phase 13 acceptance and quality gates required, no fixed date |
| After 1.0 | Google Play; possible F-Droid, native iOS/App Store and future native platform/UI work | separate later scope |

Agreed 27 October 2026: public **byshriv/sailor-logbook**, MIT. Web/PWA, Android APK and both widgets are required for 1.0. All demo features remain; further owner requests concern usability, UI polish and bug fixes. Google Play is later.

Added by owner request on 28 October 2026: Phase 13 is a dedicated final hands-on review after Phase 12 and before 1.0.0 deployment. The owner may dictate previously unmentioned errors, bugs, UI/UX changes, additions and differences from Demo v8. Record every item in the [review register](docs/PRE-RELEASE-OWNER-REVIEW.md), implement agreed changes and obtain owner acceptance after retesting. Earlier phase acceptance does not waive this review. Phase 11 hardening remains required; deployment is now Phase 14.

Architecture recommendation: React + TypeScript + Vite + Redux Toolkit, with framework-independent domain, persistence, sync-core and provider packages. Follow Super Productivity's local-first/operation-log boundaries without copying its entire product. Three deck levels, original local record dates/times, one active editing browser tab, optional encryption with passphrase/recovery key and trusted Android unlock, and private-by-default widget text are settled. Sync must work before encryption setup.

Support targets include Android 12+ (4 GB RAM recommended, not a hard gate), iOS/iPadOS 17+ Safari/PWA and popular Windows/macOS/Linux browsers, including Brave, Opera, Arc and Vivaldi. Native iOS is later. Owner devices currently cover Android/Windows; add actual tester/cloud coverage and label verification gaps honestly. No test suite proves the absence of unknown bugs; launch requires no known broken required flows, data-loss/security blockers or unapproved deferrals.

Full deliverables, exit gates, architecture, migration, encryption and GitHub-to-launch sequence: [LAUNCH-PLAN.md](LAUNCH-PLAN.md). All 24 answers: [LAUNCH-DECISIONS.md](LAUNCH-DECISIONS.md). Historical questionnaire: [LAUNCH-QUESTIONS.md](LAUNCH-QUESTIONS.md). Pinned source findings: [research/ARCHITECTURE-REVIEW.md](research/ARCHITECTURE-REVIEW.md).

Accepted production refinements: midnight-linked segments; elapsed minutes counted once; inherited streak-exclusion flags; reassignment on deck deletion; reviewed rollover; preview/recovery before cloud merge and import; preserve best-thing overflow text; Undo for normal deletions plus 30-day recovery; default WebP with an optional original-file checkbox/warning. Encrypted backups are the default when a key is configured, but encryption never blocks initial ordinary sync. Separate Lock, Disconnect, Erase local and confirmed Delete logbook everywhere, including this app’s Dropbox data. Free/no ads, no telemetry by default, English/translation-ready, Issues/private security reporting and a small beta remain settled.

Phase 6 Tasks/Planner is accepted and complete by explicit owner instruction on
28 October 2026. Fetched local `main == origin/main`, zero ahead/behind, at
`9debb35a6dc0ac8f3b0bbc72d8781e7e36f4b395`, the merge of PR #15 (final head `77ecb628`).
Phase 7 is accepted; Phase 8 only is authorized. Phase 9 and later ports remain gated.

Phase 8 implementation is reviewable at `/?phase=8` on the existing canonical store.
See [Phase 8 status](docs/PHASE-8-STATUS.md) for scope, review instructions and remaining
platform evidence. Production offline updates wait for all old tabs to close; data tools
provide versioned plaintext backups, Merge/Replace preview and verified recovery before
mutation. Phase 8 is accepted and complete. Phase 9 is implemented for review; see its status and verification for remaining gates.
