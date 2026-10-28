# Phase 1 product preservation specification

Authority: LAUNCH-DECISIONS.md and LAUNCH-PLAN.md section 3. The accepted decisions override
historical questionnaire recommendations. All demo features remain required at 1.0.

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
