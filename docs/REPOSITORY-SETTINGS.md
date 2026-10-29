# Repository administration — verified setup

The connected GitHub tools publish code, PRs, issues and CI evidence, but have no repository
administration mutation tools. The owner chose to enable these settings themselves on
28 October 2026. Private reporting and Active main protection were subsequently verified.
Protect Main requires check/android-proof/codeql from GitHub Actions, pull requests, zero
outside approvals, and blocks deletion/force pushes with no bypass actors. No Phase 1
admin action remains. The steps below are retained as maintenance/reference instructions.

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

## Phase 10 signing environment — configuration pending

`android-signed.yml` now implements manual main-only signed review artifacts, with a
required `android-signing` environment and a fail-closed API check for reviewers and
protected-branch policy. Existing main protection is unchanged. No signing environment,
reviewer, secret, certificate or workflow run was configured by this task. Follow
[the Phase 10 setup and rehearsal](PHASE-10-DEVICE-REHEARSAL.md). Environment YAML does
not establish server-side protection, and review artifacts do not authorize publication.
