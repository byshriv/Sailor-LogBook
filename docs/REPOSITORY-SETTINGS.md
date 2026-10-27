# Repository administration — owner action

The connected GitHub tools publish code, PRs, issues and CI evidence, but have no repository
administration mutation tools. The owner chose to enable these settings themselves on
28 October 2026. Do not mark them enabled until confirmed/verified.

1. Open [Code security settings](https://github.com/byshriv/Sailor-LogBook/settings/security_analysis)
   and enable **Private vulnerability reporting**. Enable secret scanning/push protection
   and dependency alerts where available. Do not publish a private reporting link as
   operational until the route exists.
2. Open [Branches](https://github.com/byshriv/Sailor-LogBook/settings/branches), add a protection
   rule for **main**, and require a pull request before merging. Do not require another
   reviewer's approval for this solo repository; the owner cannot approve their own PR.
3. Require passing status checks **check** and **android-proof** once the first runs appear.
   The optional code scanning job is **codeql**; require it too after a successful setup.
   Keep force pushes and deletion disabled. Enforce checks for administrators as appropriate
   after the foundation PR is ready; do not create a rule that prevents the owner maintaining
   the repository without an available second reviewer.
4. Production deployment/signing environments and secrets are not configured in Phase 1.
   There are no production jobs to enable. Set protected release environments when those
   pipelines are implemented; never paste signing keys or provider tokens into chat.

Repository: [byshriv/Sailor-LogBook](https://github.com/byshriv/Sailor-LogBook).
Foundation review: [PR #1](https://github.com/byshriv/Sailor-LogBook/pull/1).
