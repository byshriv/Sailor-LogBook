# Security reporting and current status

This is an unreleased foundation and preserved prototype, not an audited production app.
Optional demo encryption does not encrypt localStorage, ordinary JSON backups or OAuth
credentials. The Phase 1 wrapping experiment is not enabled in the app and must not be
used for real logbooks. There is no telemetry or automatic diagnostic upload.

Do not post vulnerabilities, access tokens, keys, personal records or backups in public
issues. The intended route is GitHub private vulnerability reporting on the future public
repository. It is **not enabled or verified yet**. If unavailable, wait for a verified
private route from the maintainer; no security email address is currently published.

Before public launch enable and test private reporting, dependency alerts, secret scanning
and appropriate code scanning; record actual settings in docs/PHASE-1-STATUS.md.
The local pattern scan catches a narrow set of common credentials and private keys. It
does not prove the absence of secrets, vulnerabilities or personal data. PR jobs receive
read-only repository access and no deployment/signing secrets.
