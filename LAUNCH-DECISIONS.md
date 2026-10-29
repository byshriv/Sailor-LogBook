# Accepted launch decisions — 27 October 2026

## Current acceptance — Phase 10 Android

Phase 9 implementation is accepted by explicit owner instruction on 29 October 2026.
Fetched origin and fast-forwarded `main == origin/main`, zero ahead/behind, to
`0ec4f8c9e56e7f3c3fb20575d2a9fcb790a7bbbc`, merged PR #19, containing final head
`ade5f36`. Phase 10 only is authorized on `codex/phase-10-android`.
See [Phase 10](docs/PHASE-10-STATUS.md). Phase 9 live Dropbox, device/resource,
Firefox/Safari and independent-security release gates remain open; implementation
acceptance does not assert those results. Phase 11+, cutover, deployment and release
publication remain gated. Earlier pending-acceptance text is historical.


All 24 launch questions are answered. This register records the owner's answers and the choices delegated by “your call.” **It supersedes earlier proposals wherever they differ.** Phase 1 subsequently started at the owner's request; current execution status is in [docs/PHASE-1-STATUS.md](docs/PHASE-1-STATUS.md).

Phase 2 was explicitly requested on 28 October 2026. Its technical choices and remaining
test inputs are recorded in [ADR 0005](docs/adr/0005-phase2-domain-durability.md) and
[Phase 2 status](docs/PHASE-2-STATUS.md); no accepted product decision below was reopened.

Phase 3 Calendar is accepted and complete by explicit owner instruction on 28 October 2026; PR #12 merged as `327ad8d` with final required checks passing. Phase 4 Notebook and Sea adventure only was then requested. See [Phase 3 status](docs/PHASE-3-STATUS.md) and [Phase 4 status](docs/PHASE-4-STATUS.md); accepted product decisions remain unchanged.

Phase 4 Notebook and Sea is accepted and complete by explicit owner instruction on 28 October 2026; PR #13 merged as `953205b` after the final workflow and separate CodeQL results checks passed.

Phase 5 Home and Reflection is accepted and complete by explicit owner instruction on
28 October 2026. PR #14 merged as `5792285ded097bc16f5bf28b0f570e059d391831`;
local main was fetched and verified equal to origin/main with zero ahead/behind.
Phase 6 is now accepted and complete after merged PR #15. Phase 7 only is authorized; Phase 8+ remains gated. Prior planning edits are preserved.

The most important correction is **sync first, encryption optional**, as in the demo. Earlier wording implying mandatory encryption for all Dropbox sync is superseded. Protection against Dropbox reading content applies when encryption is enabled.

## Records, calculations and recovery

1. **Midnight:** two linked day segments with correct daily totals. Preserve an activity identity for editing/recovery and original local time/date context; test DST and migration without shifting past logs when travelling.
2. **Overlaps — delegated:** count the union of eligible logged intervals once for total logged time and the hours streak. Planned/clock-completed tasks do not become actually logged time. Category time can remain attributed to its category; the all-day total is not a sum of duplicate minutes. The frozen v8 demo's summed-duration behavior is unchanged; the production selector change needs regression tests.
3. **Time Wasted — delegated:** a stable `excludeFromStreak` flag, inherited by descendants, replacing visible-name comparisons. Time Wasted defaults to excluded; users may flag other decks. Renaming preserves the flag. Review ambiguous renamed legacy decks during migration instead of guessing from colour.
4. **Deck deletion:** offer reassignment of sub-decks/records; never silently delete activities along with their category. Make the reassignment/deletion one reversible command with relationships restored by Undo.
5. **Must-do:** a gentle review/rollover choice, preserving skipped/done history. Keep unresolved items visible as planned, following the demo's presentation; do not silently move every past task.
6. **Two nonempty device/cloud copies:** preview, recovery point, then merge. Never silently replace a copy.
7. **Import:** both Merge and Replace, with preview/recovery first. Selecting a file alone must not mutate data. Read old unencrypted demo backups.
8. **Best-thing overflow:** preserve all text as notebook moments and ask which four to feature. Never discard extra text or block unrelated sync while the selection waits.
9. **Deletion/Undo — retention delegated:** offer Undo for every normal content deletion, including blocks, tasks, notebook content, best-thing removals, attachments, presets and reversible deck changes. Preserve drawing stroke undo. Use a **30-day Recently deleted** window plus an immediate visible Undo action; a timed toast is not the only recovery path. Undo emits a new causal restore operation. Tombstone retention is separate: trash expiry must not let an old offline device resurrect deleted content. Permanent erasure is a distinct, confirmed, non-undoable exception.
10. **Photos:** WebP compression by default. An unchecked **Keep original** option preserves original source bytes and shows estimated size plus a warning about greater device/Dropbox storage and transfer-data use. Keep input-memory/quota limits even for originals. Choose final dimensions/byte caps after image/device tests; a benchmark candidate is a 2048px long edge and approximately 1 MiB compressed output, not a shipped guarantee. Check the encoder's actual MIME type; never label JPEG bytes as WebP. The original logo/SVG artwork is outside photo compression.

## Optional encryption and data controls

11. **Sync first:** new/unencrypted Dropbox connections sync without encryption setup. Encryption is a secondary optional Settings feature. Once a key is configured, default backups to encrypted with an explicit plaintext export option. Without a key, offer optional encrypted-backup setup and a clearly labelled plaintext alternative; neither blocks ordinary sync. Existing encrypted cloud copies still require unlocking and must never be silently downgraded.
12. **Scope:** optional cloud/backup encryption and platform-protected Android keys; full local-database encryption is not required for 1.0. IndexedDB is not encryption. Do not promise Dropbox cannot read an unencrypted cloud copy.
13. **Recovery:** downloadable file and printable code representing the same high-entropy secret, with verification. Neither is uploaded unprotected or included in diagnostics.
14. **Trusted unlock — delegated:** no forced biometric prompt on every opening and no inactivity timeout by default. Trusted Android access uses a wrapped key under platform protection and the OS unlock boundary. Explicit Lock requires authentication again; prototype how trusted unlock and forgetting trust behave. Browser/untrusted-device unlock is session-only. Lock does not claim to encrypt an otherwise unencrypted local database.
15. **Actions:** separate Lock logbook, Disconnect Dropbox and Erase local data. The legacy **Delete your account** action must additionally erase this app's Dropbox logbook, attachments and app-owned cloud backups. Prefer **Delete logbook everywhere**, since there is no required Sailor Logbook account. It must not delete the Dropbox account or unrelated Dropbox files. Use a separate in-app confirmation/progress/result flow; cancel in-flight sync and report offline/partial failures honestly. Prove stale-device behavior before claiming that erased cloud data cannot be recreated. Other offline devices keep their local copies until explicitly cleared/handled; Dropbox-managed deleted-file/version retention is separate. This is a future-flow requirement, not an instruction to delete anything now.
16. **Diagnostics:** no telemetry by default. Manual reports and sanitized exports only; never automatically include notebook text, titles, photos, tokens or keys.

## Platforms and experience

17. **Support baseline — delegated:** **Android 12+**, with **4 GB RAM recommended, not an installation hard gate**. Test resource limits/graceful degradation on lower-memory devices where possible. Include **iOS/iPadOS 17+ Safari and installable PWA at 1.0**. The owner explicitly confirmed native iOS/App Store packaging is later. Re-check pinned framework/plugin compatibility in Phase 1: these are our product targets, not claims about framework minimum versions.
18. **Browsers:** target popular browsers across Windows, macOS, Linux, Android and iOS: Chrome, Edge, Firefox, Brave, Opera, Arc, Vivaldi, Samsung Internet and Safari where each vendor supports that platform. Use supported releases and a documented practical previous-release window, not every historical release. CI Chromium/Firefox/WebKit needs actual browser testing too; Playwright WebKit is not proof of real Safari behavior. Android/Windows are currently available to the owner; recruit testers or arrange CI/cloud coverage for the other targets. Record exact versions/results and label untested combinations honestly. Installation/native features need capability-specific fallbacks.
19. **Language:** English for 1.0; translation-ready strings.
20. **Today widget:** logged duration and best-thing count when personal text is hidden, tapping through to the day. Visibility is per-device. Quick log opens the logging sheet directly.

## Release and maintenance

21. **Support:** GitHub Issues plus a private vulnerability-reporting route. Plan GitHub's built-in private reporting after creating/enabling the public repository. Do not invent email/social links or advertise a route before it exists.
22. **Community:** Issues first; Discussions later when useful.
23. **Funding:** free, no ads, public MIT source. Add donation links only after the owner provides a real destination.
24. **Beta/review:** small test group, public source throughout; wider beta after migration/recovery checks. Document limits when independent security review is unavailable; do not call ordinary testing an independent audit.

## Earlier decisions retained

- **byshriv/sailor-logbook**, product **Sailor Logbook**, installed name **Logbook**, MIT and original artwork.
- All demo features plus owner UI/usability refinements and bug fixes; quality-based launch, no fixed date.
- Web/PWA, signed GitHub Android APK, Quick log and Today / best thing widgets required for 1.0; Google Play later.
- React/TypeScript/Redux Toolkit under delegated framework choice, with Super Productivity's local-first/modular/operation-log boundaries.
- One active editing tab per browser profile; three total deck levels; original local record dates/times retained when travelling.
- Guided passphrase/recovery key and trusted Android unlock apply when the optional encryption feature is enabled.

## Additional owner decision — 28 October 2026

Add a separate **Phase 13 final owner-dictated review before 1.0.0 deployment**, after
Phase 12 documentation/preparation. The owner may raise previously unmentioned errors,
bugs, UI/UX changes, missing behavior or additions, and differences that should match
Demo v8. Record each item in the [review register](docs/PRE-RELEASE-OWNER-REVIEW.md),
implement agreed changes, retest and repeat until the owner accepts the final build.
Earlier phase acceptance does not waive this review; Phase 11 hardening remains.
Only the owner may approve nonblocking deferrals; required demo behavior and release
blockers remain launch gates. Deployment moves from Phase 13 to **Phase 14** and
requires final review acceptance and owner deployment approval. This planning update
does not start later implementation phases or accept the current Phase 5 visuals.

## Execution inputs still to collect

Concrete device models/OS/browser versions, external test access, empirically chosen media/encryption limits and independent-review availability remain inputs for their phases. They are not unanswered product-scope questions. Do not re-ask the 24 answered questions as though no decisions were made. Apply this register to ADRs, acceptance criteria and [LAUNCH-PLAN.md](LAUNCH-PLAN.md).

Phase 6 Tasks/Planner is accepted and complete by explicit owner instruction on
28 October 2026. Fetched local `main == origin/main`, zero ahead/behind, at
`9debb35a6dc0ac8f3b0bbc72d8781e7e36f4b395`, the merge of PR #15 (final head `77ecb628`).
Phase 7 is accepted; Phase 8 only is authorized. Phase 9 and later ports remain gated.
