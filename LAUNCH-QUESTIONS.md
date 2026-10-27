# Launch questionnaire — answered

All 24 questions below were answered on 27 October 2026. **Read [LAUNCH-DECISIONS.md](LAUNCH-DECISIONS.md) for accepted answers and delegated choices.** The text below is the historical questionnaire, not an open task list. In particular, optional encryption and expanded cross-platform support supersede older proposals. Do not ask these questions again without a concrete new conflict.

## Already settled

Phase 1 execution status and remaining technical/access inputs are tracked in
[docs/PHASE-1-STATUS.md](docs/PHASE-1-STATUS.md). The questionnaire remains historical;
no new product-scope question was opened by the foundation experiments.

On 28 October the owner delegated the remaining technical work and requested Phase 1
completion. The design review is in docs/REVIEW-2026-10-28.md. The owner chose to enable
admin settings using docs/REPOSITORY-SETTINGS.md; private reporting is verified enabled.
This does not reopen the questionnaire.

- Public MIT project: **byshriv/sailor-logbook**; product **Sailor Logbook**, installed name **Logbook**; preserve original artwork.
- Web/PWA, Android APK and native widgets are all required for 1.0. Google Play is later.
- All demo features stay. “More” means UI/usability improvements and bug fixes. Quality-based launch, no fixed date.
- Follow Super Productivity's local-first/modular/sync architecture; framework choice is delegated. Recommendation: React/TypeScript/Redux Toolkit and independent core packages.
- Sync starts first; encryption is optional. When enabled, encrypted content is unreadable to Dropbox without the key. Guided passphrase/recovery key, trusted Android unlock and session-only browser unlock apply to that feature.
- One active editing browser tab. Three total deck levels. Past records keep original local dates/times when travelling.
- Quick log widget opens the logging sheet. Today / best thing hides personal text by default, with an option to show it.
- Target Android, Windows, macOS, Linux and iOS web/PWA with popular-browser coverage. Android/Windows are available to the owner; record coverage gaps until additional real testing is arranged. Native iOS is later.

## Records, calculations and recovery

1. **What should happen to an activity crossing midnight?** Recommended: two linked day segments with correct daily totals; alternative: ask for two separate entries.
2. **Should overlapping logged blocks count elapsed minutes once for streaks, or add both durations?** Recommended: count overlaps once; the demo currently sums durations, so retain that until a change is approved.
3. **How should Time Wasted exclusion work after renaming a deck?** Recommended: a stable deck flag inherited by descendants rather than an English-name comparison. Should users be able to flag other decks similarly?
4. **What happens when deleting a parent deck?** Recommended: offer reassignment of sub-decks/records; never silently delete the activities with the category.
5. **How should unfinished Must-do items roll over?** Recommended: a gentle review/rollover choice rather than silently moving every past task; preserve skipped/done history.
6. **If both a device and Dropbox already have records, should connecting merge them after a preview or choose one copy?** Recommended: preview, recovery point, then merge; replacement is a separate explicit choice.
7. **Should importing a backup offer Merge and Replace?** Recommended: both, with preview and recovery first; selecting a file must not immediately erase current data.
8. **What if offline devices together select more than four best things for a day?** Recommended: retain all text as notebook moments and ask which four should be featured; never discard the extra text.
9. **Should deleted records have a Recently deleted recovery window?** Recommended: Undo plus a bounded recovery period; choose its length before tombstone cleanup. Permanent erase remains distinct.
10. **How much photo compression is acceptable?** Recommended: automatic compression and a clear limit, selected after image/device tests. Is preserving original resolution important?

## Encryption and privacy

11. **Should downloads/backups be encrypted by default, with an explicit plaintext export option?** Recommended: yes; still import old unencrypted demo backups.
12. **Do you also require encryption of the local database, or primarily Dropbox content and exported backups?** Recommended starting scope: cloud/backup encryption plus platform-protected Android keys. IndexedDB alone is not encryption.
13. **Recovery file, printable recovery code, or both?** Recommended: both representations of the same secret, with a verification step. Neither is uploaded unprotected.
14. **When should a trusted Android phone ask to unlock again?** Recommended: after reboot or explicit Lock, with an optional inactivity lock; a biometric-on-every-open mode is another choice. Prototype actual OS behavior first.
15. **What should the demo's “Log out” action become without a Sailor Logbook account?** Recommended: separate Lock logbook, Disconnect Dropbox and Erase local data, with clear descriptions.
16. **Manual bug reports only, or optional crash reporting?** Recommended: no telemetry by default and a sanitized diagnostic export. Never attach notebook text, titles, photos, tokens or keys automatically.

## Platforms and experience

17. **Which specific Android models/OS versions are available, including an older/lower-memory phone?** This defines the supported minimum and meaningful encryption/drawing/storage tests.
18. **Beyond Windows Chrome/Edge/Firefox and Android Chrome/Firefox/Samsung Internet, which browsers must be verified for 1.0?** Examples: Brave, Opera, Vivaldi. Shared engines do not prove identical installation/storage/keyboard behavior.
19. **Is English-only acceptable for 1.0, with translation-ready strings?** Recommended: yes unless another launch language is needed.
20. **What should the Today widget show when personal text is hidden?** Recommended: logged duration and best-thing count, tapping through to the day; text visibility stays per-device.

## Public launch and maintenance

21. **Which support destination and private security-reporting contact may we publish?** Recommended: GitHub Issues for ordinary bugs plus a private vulnerability-reporting route. Supply only information you want public; no invented links.
22. **GitHub Discussions or Issues only initially?** Recommended: Issues first for minimal maintenance; add Discussions when useful.
23. **Entirely free/no ads, with optional donations later?** Recommended: free, no ads; add donation links only after you provide one. The MIT/open-source commitment is already settled.
24. **Who can join the early beta, and what independent security-review/testing resources are available?** Recommended: small group first, public source throughout, wider beta after migration/recovery checks. Record the limits if independent encryption review is unavailable.

Accepted answers are recorded in [LAUNCH-DECISIONS.md](LAUNCH-DECISIONS.md) and applied to the launch plan/roadmap. Owner UI/bug feedback continues throughout the phases and in the dedicated prelaunch refinement pass.
