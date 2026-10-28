# Phase 8 status

Implemented for review on `codex/phase-8-recovery` at `/?phase=8`, after owner acceptance
of Phase 7 and verified merge PR #16 at `887fcdd`. Phase 8 owner acceptance is pending.
Phase 9 and later ports remain unstarted. No deployment, cloud connection or real-data cutover.

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
