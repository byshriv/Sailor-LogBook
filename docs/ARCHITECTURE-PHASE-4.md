# Phase 4 Notebook and Sea adventure architecture

28 October 2026. Phase 4 only, following owner acceptance of Phase 3 and the verified
merge of PR #12 at `327ad8dfac702377e7b77b9c63226cf34af29cff`.

## Composition and compatibility

`/?phase=4` lazily mounts the Notebook/Sea review surface. It uses the existing
`slb-phase2` canonical store, `slb-phase2-editor` Web Lock, verified startup/replay and
Redux projection. No database/schema change, new command vocabulary, migration activation,
legacy storage reader or transport is introduced. `/`, `/?phase=2`, `/?phase=3`, the
root v8 demo and frozen reference remain available. Close another editor before review.

`packages/domain/src/notebook.ts` interprets the existing page/line/stroke compatibility
fields, moments and history entities. Writes use existing reversible `putMany` commands
through `createLogbookProjection`. Existing IDs, opaque line/page fields, attachment
references and archived migration source survive targeted edits. Duplicate date pages
fail for review rather than choosing a page silently. No history is acknowledged or
compacted by a simulated cloud service.

Calendar changes are limited to accepting a validated `date` URL parameter for Notebook
best-thing links. Invalid dates fall back to its previous local-date behavior. Its editor,
gestures, calculations, media handling and CSS are unchanged. Phase 5 and later screens
and the complete application shell remain out of scope.

## Writing and best things

Committed inputs remain in place. Enter/blur saves through the durable gateway; one new
blank input remains at the end. Quick deck/duration syntax reuses Calendar parsing, including
recent-deck preference and atomic creation of an unknown deck. Empty plain lines are removed
reversibly; drawings and unrecognized fields are retained. Linked moment edits atomically
update the moment and page without changing the source activity. Calendar moments appear
without requiring duplicate page content; unfeaturing retains their Notebook text. A
materialized line reads the current moment text and featured flag rather than a stale copy.

Rows and free-drawing drafts live outside Redux until storage commits. In-app date/section
navigation and sending await outstanding writes. Failure leaves the draft and current date
visible, with retry. Pointer-down on a button protects its click from the blur/save/disable
race. Inputs become read-only during writes and keep focus. Enter returns focus to the new
row. Browser close/reload warns while a draft is unsaved; it cannot guarantee survival of
an OS kill before a commit.

## Drawing and media

Editable normalized `{c,w,p}` strokes remain canonical JSON in page `strokes` and line `sk`.
The rendering boundary validates coordinates without rewriting unknown source data.
The per-line editor uses the original square proportions and the free canvas uses v8's
900:360 proportions. Single-pointer capture includes the final release point; cancellation,
lost capture and Escape discard only the unfinished stroke. Other pointers are ignored.

The free canvas starts guarded so ordinary page scrolling does not draw. Completed strokes,
stroke Undo and clear save through the same durable pipeline. Failed saves remain available
for retry or explicit cancellation. Per-line doodles keep Done/Cancel, ink/width, stroke
Undo and clear; Done commits once. Global Undo and persistent 30-day recovery restore
committed clears, removed lines and previous drawings after restart.

Previews for new strokes are disposable SVG views, separate from canonical editable strokes;
no redundant raster or data-URL copy is added to the operation log. Migrated raster-only
drawings still display; existing digest blobs/attachment references remain in the Phase 2
media store and are validated at startup. Edits do not recompress or physically collect
original blobs. This choice keeps editable drawing independent of the known native Blob
storage limitation in Windows WebKit. The existing photo pipeline is unchanged; no claim
that unsupported Blob writes or real Safari photo storage now work is made.

## Send and Sea

Sending checks actual text/drawing content, saves drafts first and reversibly adds a unique
date to the existing `history:bt`. Sent pages dim and disable writing until Edit; editing
does not remove their sent history. Send exists below the desktop spread and in its toolbar,
and below the mobile paper. Original logo, sea-card, ship, bottle and water-texture geometry
and palette are retained from v8; CSS Modules isolate animations from other screens.

Sea selections are stable during a visit. Random selection requires five unique sent days,
chooses at most ten unique days without replacement and weights older dates by
`1 + ageDays/20`. Small bottles choose one message; big bottles show the day. Best-only,
size and explicit date filters apply. Date review bypasses the five-day/monthly-seen gate
and exposes individual messages and the whole day, capped at ten while keeping whole-day
review reachable for long pages. Size filters also apply to explicit date review.

Opening a random bottle durably records the date under the local current month in
`history:seen` before showing content. Failed history writes do not show a successful open.
That day stays out of random selection until a new month; explicit date review does not
change monthly history. Back returns to Notebook. Sea has no redundant section switch or
bottom navigation, and the desktop water fills the workspace. Reduced motion is supported.

## Review and later gates

Owner Phase 4 visual/interaction acceptance remains separate from automated verification.
Review keyboard spacing/focus, physical touch/pen cancellation, drawing feel, sent editing,
two-page proportions, sea selection and imported media on actual devices. Physical Safari,
storage pressure, OS-kill behavior, final media budgets and issues #2/#3 remain release
gates. Tests prove deterministic operation replay to another synthetic store; real Dropbox
synchronization remains Phase 9. No Phase 5 or later port is authorized by this handoff.
