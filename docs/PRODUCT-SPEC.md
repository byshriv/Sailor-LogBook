# Phase 1 product preservation specification

Authority: LAUNCH-DECISIONS.md and LAUNCH-PLAN.md section 3. The accepted decisions override
historical questionnaire recommendations. All demo features remain required at 1.0.

Final preservation acceptance includes **Phase 13**, a dedicated owner-dictated review
after Phase 12 and before Phase 14 deployment. The owner may raise previously
unmentioned bugs, UI/UX changes, missing behavior/additions and Demo v8 discrepancies.
Record expected behavior, fixes, verification and owner acceptance in the
[review register](PRE-RELEASE-OWNER-REVIEW.md). Earlier phase acceptance does not waive
this review. Explicitly accepted production changes remain authoritative; final fixes
must update this specification where behavior changes. Deployment requires the owner's
acceptance of the final build and all launch gates.

The preserved implementation is reference/demo-v8, cache slb-v8-r3, verified using
`node scripts/freeze-demo.cjs`. The root legacy source remains the working demo. Fonts,
original artwork and notices are preserved. Do not replace the live demo with the proof.
The owner reviews difficult Calendar flow changes before large ports.

Source audit resolves the achievement-count discrepancy: index.html's ACH array defines
**seven** achievements: Maiden Voyage, Bright Spot, Message Sent, Fair Winds, Open Sea,
Four Bells and Seasoned Sailor. Preserve their identities/state; do not invent an eighth.

Feature inventory and phase allocation:

| Area            | Required preservation                                                                                                        | Implementation phase |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Calendar        | Mobile Menu A/B, quick syntax, presets, editors, gestures, lanes, Day/3-day/Week/Month, keyboard and active-draft protection | 3                    |
| Notebook/Sea    | In-place writing, strokes/undo, two-page spread, best links, send/edit, bottle eligibility/history/filters                   | 4                    |
| Home/Reflection | Layout customization, moods, progress, achievements, hours/best streaks, freezes, share                                      | 5                    |
| Planner         | Timed/untimed tasks, day moves, Must-do, Waiting/Low energy/Voyage, reviewed rollover, historical statuses                   | 6                    |
| Management      | Three-level decks, presets, settings/profile, onboarding, tours/search/shortcuts, accessibility                              | 7                    |
| Recovery        | Undo/30-day trash, versioned backups, preview/import/recovery, storage health, updates/offline                               | 2, 8                 |
| Sync            | Optional Dropbox, scheduling/status/conflict alternatives, plain-first then optional E2EE/recovery                           | 9                    |
| Android         | Packaged app, reminders/unlock and Quick log / private-by-default Today widgets                                              | 10                   |

Production rule changes already accepted: union elapsed minutes, stable inherited streak
exclusion, linked midnight segments retaining original wall dates, reassignment on deck
deletion and best-thing overflow retention. These must not silently alter the frozen demo.
Phase 2 supplies a lossless typed schema/fixture suite before ports begin.

Phase 3 Calendar is accepted and complete after PR #12 merged as `327ad8d`. Phase 4
Notebook/Sea now has an isolated review surface at `/?phase=4`; see
[Phase 4 architecture](ARCHITECTURE-PHASE-4.md) for preservation and review details.
Its local verification does not accept the owner's visuals or implement later transport.

Visual tokens start in apps/web/src/tokens.css: dark background, cream text/buttons,
blue accent, Rethink headings/body and restrained motion/reduced motion. Notebook paper,
Patrick Hand, original icons/animations and complete responsive interactions remain in
the reference until their port. No new feature family is introduced by this preview.

Phase 4 Notebook/Sea is accepted and complete by owner instruction after merged PR #13
at `953205b`. Phase 5 Home/Reflection now has an isolated review surface at `/?phase=5`;
see [Phase 5 architecture](ARCHITECTURE-PHASE-5.md). It preserves v8 desktop bento spans,
mobile navigation, greeting, original seven achievement/mood artwork, independent layouts,
progress, review and canvas sharing. Metrics apply accepted union/inherited-exclusion
rules. Automatic best-streak freezes bridge four missing past days per calendar month;
today does not consume one, frozen days do not count, and backfill recomputes usage.
All overflow text stays in Notebook while users choose up to four featured moments.
Phase 5 is now accepted and complete by explicit owner instruction on 28 October 2026
after PR #14 merged as `5792285`. This does not waive the final owner review.

Phase 6 Tasks/Planner is implemented for review at `/?phase=6`. Preserve responsive
day columns (three previous days and eight starting at the selected day), dimmed past
headers, timed/untimed task editing and moves, Must-do, Waiting on, Low energy, Voyage
progress and manual/clock statuses. Unresolved tasks stay on their original date, even
when a timed plan displays Done by clock; neither a plan nor its completion logs time.
The review dialog offers Leave planned, rollover to an explicit later date/time, Skip
and Not gonna do. Rollover defaults to untimed To do and records Skipped on the original
day with the prior status retained. Ordinary moves retain status/time. Dated history
markers link to the current task; edits, moves, review and deletion use Undo/30-day
recovery. The Calendar scheduling dock only schedules the same task; the full Calendar
remains the accepted Calendar port. Editor Date/Time provides a keyboard alternative to
dragging. These review details are in [Phase 6 architecture](ARCHITECTURE-PHASE-6.md).
Phase 6 is now accepted and complete following merged PR #15 at `9debb35`. Phase 7 management/experience is authorized; Phase 8+ remains out of scope.

Phase 6 Tasks/Planner is accepted and complete by explicit owner instruction on
28 October 2026. Fetched local `main == origin/main`, zero ahead/behind, at
`9debb35a6dc0ac8f3b0bbc72d8781e7e36f4b395`, the merge of PR #15 (final head `77ecb628`).
Phase 7 management/experience only is authorized. Phase 8 and later ports remain gated.

Phase 7 management/experience is implemented for review at `/?phase=7`; see
[architecture](ARCHITECTURE-PHASE-7.md) and [status](PHASE-7-STATUS.md). Preserve
profile name/photo, the six original starter decks and 16 deck icons, three total
deck levels, separate disclosure/open/edit controls, descendant records, atomic
reassignment with Undo, and duration-free presets. Settings overlay migrated
preferences without rewriting legacy payloads. New photos use digest blobs and the
existing WebP/original pipeline; original media and archives remain intact.

Cancellable setup saves once at completion. The normal guide uses actual screens;
optional desktop keyboard practice ends in the complete shortcut reference.
Search includes entries/tasks, original dates/deck paths, Notebook/Reflection, decks,
presets, Settings and commands. Typing, focus, Escape and Ctrl/Cmd variants remain
guarded. Open-tab reminders skip logged days, persist a daily receipt and report
permission/capability limits honestly. Closed-app reminders, production PWA/data
tools, Dropbox joining/transport, optional encryption and native widgets remain
their later phases. Earlier screens and the root/frozen demo remain available.
Phase 7 owner acceptance is pending; no Phase 8+ implementation is authorized.
