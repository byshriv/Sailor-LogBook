# Phase 5 Home and Reflection architecture

28 October 2026. Phase 5 only, following explicit owner acceptance of Phase 4 and
verified merged PR #13 at `953205bc71d428af14b679bec3c49e51c2b2f7ed`.

## Composition and preservation

`/?phase=5` lazily mounts `apps/web/src/reflection.tsx` on the existing `slb-phase2`
canonical IndexedDB, verified replay, Redux projection, durable command/media gateway and
`slb-phase2-editor` Web Lock. There is no schema/command change, fallback database,
legacy-storage reader, migration activation, transport, service worker or deployment.
The root demo, frozen reference, Calendar and earlier preview routes remain available.

Domain selectors in `packages/domain/src/reflection.ts` interpret existing reflection,
moment, settings and history entities. Migrated `les:<id>` / `grat:<id>`, `history:mood`,
`history:ach`, `settings:legacy` order/hide/rorder/rhide/name/avatar and all unrelated
payloads remain in place. Targeted edits spread unknown compatibility fields. Source
archives, canonical editable strokes, attachment references and digest blobs are retained;
nothing is recompressed, duplicated into an image operation or physically collected.

Home retains the time-of-day greeting, date in mobile header, current task/log, unresolved
past-task notice, Must-do completion, quick Add must-do with shared syntax, best moments,
mood faces, On this day, days/progress, streak and Sea shortcut. Quick Must-do is a Home
action, not a Planner port: board, rollover and later editors remain Phase 6. Unknown
quick decks and the task commit atomically. Manual task status retains `legacy.man`,
percentage and status history. Calendar links use its existing editors on the original day.

Reflection retains hours/best streaks, mood radar and 14-day history, Must-do bars, eligible
hours heatmap, lessons, gratitude, On this day, six week/month summaries, seven achievements,
searchable date/text review and canvas sharing. The seven ACH identities and original
SVG geometry, five distinct mood paths, original logo/ship, local fonts and dark/cream/blue
palette are retained. The unused Orders Given art is not an eighth achievement.

CSS Modules preserve v8's desktop 12-column Reflection bento spans and dense composition;
customization uses row order, mobile uses two columns with paired streaks and floating pill
navigation. Home keeps compact stats/streak cards. Independent layouts normalize unknown
and duplicate display keys without rewriting stored data on render. Hide/show and keyboard
Move up/down complement pointer handles. Mouse release commits once; touch handles use a
350ms hold, pre-hold movement cancels. Escape, pointer cancel and lost capture discard the
unfinished reorder. Failed writes retain the committed order. No DOM reordering is canonical.

## Calculations and accepted rules

- All-day and week/month hours sum daily interval unions through the existing selector.
  Timed plans and clock-completed tasks never become logs. Explicit historical offsets
  retain elapsed DST arithmetic; records never move dates when the device travels.
- Hours streak and heatmap use eligible union minutes with inherited stable exclusion;
  renaming an excluded ancestor does not change eligibility. The threshold is 120 minutes.
  An unfinished today may continue yesterday's streak, and backfills count immediately.
  There is no artificial 800-day history ceiling.
- Best streak uses featured moments. Missing past days bridge automatically, up to four
  per calendar month. Today's unfinished day is free; bridged days do not increment the
  count. A fifth missing day stops the chain. Backfill recomputes budgets; future moments
  cannot start today's streak. This is the demo freeze rule, not a new spendable entity.
- All overflow text remains an unfeatured Notebook moment. Adding a fifth retains it and
  explains selection. The chooser allows up to four featured IDs; the domain enforces the
  cap atomically. Unfeaturing retains text and links; unrelated mood/reflection edits work.
- Achievement flags are monotonic: retain saved/unknown history, capture newly earned
  flags durably, and never clear them when content changes. A failed capture exposes an
  explicit retry. Computed eligibility does not claim the flag was saved. Exactly seven
  identities are rendered and shared.

## Drafts, recovery and sharing

Text and selection drafts stay outside Redux. In-app navigation and date changes cannot
silently discard them; Cancel is explicit, save failure retains text/selection, and
beforeunload warns. An OS kill before commit is not guaranteed recoverable. Saved state
only publishes after the atomic transaction. Rapid reentry is guarded while saving.
Content edits, unfeaturing, mood changes and layout changes use existing reversible
commands, immediate Undo and persistent 30-day Recent changes. Restore refuses later
conflicting edits. Retention is not physical erasure. Dialogs trap keyboard focus and
return it when dismissed; mobile drafts use the available viewport.

Share creates a disposable 1080×1350 PNG after fonts and original SVG artwork decode.
The in-app preview precedes an explicit download or native share action. Unsupported file
sharing, cancellation and errors leave the download available. Object URLs are revoked
when replaced/closed. Personal journal text and photos are absent from streak cards;
sharing does not mutate the canonical logbook or duplicate media into operation history.

Notebook changes only add validated date-link initialization and an optional Sea shortcut
parameter. Invalid dates retain its previous today fallback. Existing Notebook editing,
drawings, selection and history behavior is unchanged; Calendar source is untouched.

## Review boundary

Owner review is still required for Phase 5 desktop/mobile proportions, custom ordering,
keyboard/insets/touch feel, progress, freeze copy and share preview. Physical Safari,
phone/storage-pressure/OS-kill evidence, final media budgets and issues #2/#3 remain release
gates. Synthetic causal replay is not production synchronization. No Phase 6 or later
port is authorized by this implementation or handoff.
