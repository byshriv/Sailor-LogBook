# Phase 8 status

Accepted and complete by owner instruction on 29 October 2026 after merged PR #17
at `df2310d`. The review surface remains `/?phase=8`. Phase 9 only is now authorized;
see [Phase 9 status](PHASE-9-STATUS.md). No deployment or real-data cutover occurred.

Production offline shell/update waiting, plaintext versioned backups, Merge/Replace preview,
legacy backup review, verified pre-import points, local restore, damaged-store rescue and
storage health use the existing domain, durable store and media pipeline. Review controls in
Settings → Storage & data. See [architecture](ARCHITECTURE-PHASE-8.md),
[verification](VERIFICATION-PHASE-8.md) and [handoff](../PHASE-HANDOFF.md).

Run `npm run dev:foundation` for data-tool interaction review (no dev service worker).
For offline review, run `npm run build:foundation`, then
`npx vite preview apps/web --outDir ../../build/foundation --host 127.0.0.1 --port 5175`.
Use a disposable localhost profile/origin; do not place this build on the demo origin.
Open `http://127.0.0.1:5175/?phase=8&tool=help` to bypass empty-store setup for review.
Production `/` and installed launch open Phase 8. Earlier screen links retain accepted ports.

Remaining release evidence: physical Android/iOS/Safari installation/upgrade, mobile keyboard,
pressure/eviction/OS-kill and interrupted-browser tests with owner data rehearsals; empirical
media/transfer budgets; independent accessibility/security reviews and existing #2/#3 gates.
WebKit Blob restrictions and Windows Firefox launch limits must remain explicit. Browser mocks,
headless engines and synthetic fixtures cannot satisfy these device/owner gates.

## Acceptance — 29 October 2026

Phase 8 is accepted and complete by explicit owner instruction. PR #17 merged as
`df2310d7d6cc9dd09830724fc1d37bcc3ad48007`, including its final published head
`9d01b6c09bb9d0275ff83f021e38ed0d10abad34`. Fetched local main equals origin/main,
zero ahead/behind. Phase 9 only is authorized. Historical pending-acceptance text
above is superseded; earlier physical-device limits remain documented.
