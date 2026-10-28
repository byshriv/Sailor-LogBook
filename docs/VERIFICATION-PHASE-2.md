# Phase 2 publication and hosted verification

Merge follow-up: PR #11 merged as `7107798b96137a87328204d0db5576a80ecdc5ad` on 28 October 2026. Final head `71cefbd1af670fb4b4ee0727da43324794b498aa` passed all three required jobs in [run 40631959812](https://github.com/byshriv/Sailor-LogBook/actions/runs/40631959812), including 26 foundation and 21 browser checks. Earlier publication notes below are historical. Phase 3 requires its own evidence.

28 October 2026. Review: [PR #11](https://github.com/byshriv/Sailor-LogBook/pull/11),
branch `codex/phase-2-domain-durability`, based on main `c0f3afa`.
No production deployment, real-data migration, cloud mutation or later feature port occurred.

## Publication baseline

[Run 40631431207](https://github.com/byshriv/Sailor-LogBook/actions/runs/40631431207)
passed all three required jobs: `check`, `android-proof` and `codeql`.
Head: `b00432776bd62617207806c1076a60f585b63432`.
Tested PR merge snapshot: `a8af501c57a49c1b77979ac3e30bb9ac188e46e7`.

- Clean Linux demo suite: 84 passes and one expected legacy-v1 reference skip because
  ignored `.local/v1.html` is absent from a clean checkout. Local Windows: all 85 pass.
- Foundation/domain/storage: 25 passes on this baseline.
- Browser suite: all 21 checks pass across Chromium, Firefox and WebKit, including
  Phase 2 composed Redux/Undo, real IndexedDB migration/restart/checkpoint and photo codec.
- Android: app/test APKs build; all three Android 12/API31 emulator instrumentation cases
  pass, including the packaged JavaScript-to-Kotlin bridge.
- Typecheck, dependency boundaries, formatting, narrow secret scan, legacy syntax/assets,
  all 37 frozen reference hashes, preview build and CodeQL pass. npm audit reports zero
  vulnerabilities for this run; that is a point-in-time registry result, not a security audit.

Hosted toolchain: Node 24.22.0/npm 11.19.1; Playwright 1.64.1. Installed test builds:
Chrome for Testing/headless shell 156.0.8078.4 (1248), Firefox 157.0 (1555),
WebKit 27.2 (2370), on Ubuntu 24.04. WebKit does not establish physical Safari acceptance.

Artifacts have seven-day retention and contain runtime/font notices:

| Artifact            | ID          | SHA-256 archive digest                                           |
| ------------------- | ----------- | ---------------------------------------------------------------- |
| Foundation preview  | 12791871719 | ed3a6fa9e4ac845cb1d90fc8d97d9be8af0348c0f8df8388ede7916b9fa76363 |
| Android debug proof | 12792016464 | 31a6c317b57e767c4fa4424c998e3aa4b5c95512707173554340069f03521739 |

The APK is still a disposable proof identity/debug artifact, not a release-signed product.

## Review follow-up and current revision

Review found that Undo of a full snapshot restore removed newly restored entities but
cleared their deletion markers. A later stale put could recreate that removed content.
Undo now retains a new causal deletion marker. The regression covers both previously
deleted content and snapshot-only additions, acknowledgement/compaction, restart and
rejection of stale recreation. Local foundation tests now total 26; all pass, as do
typecheck/build and the 14 Chromium/WebKit cases after the fix.

The baseline evidence above predates this fix. Every follow-up revision must pass the
same three required jobs; use the [PR checks](https://github.com/byshriv/Sailor-LogBook/pull/11/checks)
for the exact current head/run rather than treating the earlier run as proof of a new SHA.
The PR description records the final verified run. No required check is waived or removed.

## Repository and publication integrity

Fetched main before publication; it still matched origin/main at c0f3afa. Reviewed the
18 source/document paths and published through the connected GitHub tools, without
credentials in terminal output or desktop control. The initial published tree
`b77d501ae106bf350a3c933c6f3a4d60cc1d0a41` exactly matched the local staged tree before
switching the workspace to track the review branch. No reset, history rewrite, force push,
main mutation or bypass of branch protection occurred.

The Windows Firefox `spawn UNKNOWN` remains a local launcher limitation. Hosted Linux
Firefox passes; no physical-device, power-loss, actual Safari or independent security
acceptance is inferred. Issue #2/#3 and the later release gates remain unchanged.
