# Security reporting and current status

This is an unreleased foundation and preserved prototype, not an audited production app.
Optional demo encryption does not encrypt localStorage, ordinary JSON backups or OAuth
credentials. The Phase 1 wrapping experiment is not enabled in the app and must not be
used for real logbooks. There is no telemetry or automatic diagnostic upload.

Do not post vulnerabilities, access tokens, keys, personal records or backups in public
issues. Use [GitHub private vulnerability reporting](https://github.com/byshriv/Sailor-LogBook/security/advisories/new).
The owner enabled it and the public read-only status was verified on 28 October 2026.
If unavailable, wait for the maintainer; no security email is published.

Before public launch enable and test private reporting, dependency alerts, secret scanning
and appropriate code scanning; record actual settings in docs/PHASE-1-STATUS.md.
The local pattern scan catches a narrow set of common credentials and private keys. It
does not prove the absence of secrets, vulnerabilities or personal data. PR jobs receive
read-only repository access and no deployment/signing secrets. The dedicated CodeQL job
can upload foundation-source analysis results using security-events write permission;
it has no signing/deployment credentials. Full independent review remains a release gate.
