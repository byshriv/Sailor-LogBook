# Phase 13 — final owner review before 1.0.0

Added by owner request on 28 October 2026. Status: planned, required before deployment.
This document establishes the review process; no review item or final acceptance has
been supplied yet. Phase 6 is accepted and complete; Phase 7 is the current implementation review.

## Purpose and timing

After Phases 1–12, review the complete integrated app before Phase 14 deployment.
The owner can dictate all errors, bugs, better UI/UX, missing behavior or additions,
and anything that should match Demo v8 but currently does not, including concerns
not raised during earlier phases. Earlier phase acceptance does not waive this pass.
Phase 11 engineering hardening and ongoing feedback remain required.

Use `reference/demo-v8` (cache `slb-v8-r3`) as the comparison baseline, together with
[accepted decisions](../LAUNCH-DECISIONS.md) and the
[product preservation specification](PRODUCT-SPEC.md). Keep accepted production
changes such as union elapsed minutes; do not restore a demo defect merely for parity.
If intent is unclear, record the discrepancy and clarify the expected result.

## Feedback and fix cycle

1. Provide reviewable web/PWA and signed Android builds. Record commit, artifact
   hashes, platform, device and browser/OS versions for the review.
2. Capture each dictated concern faithfully as a separate numbered item. Include
   screen/flow, actual versus expected behavior, reproduction steps and demo
   reference or screenshot when available. Mark missing details as pending.
   Do not include private logbook data, credentials or keys in public evidence.
3. Classify bugs, UI, UX, demo parity and requested additions. Agree acceptance
   criteria and priority with the owner; flag dependencies or scope decisions for
   additions. Do not silently discard or defer a request.
4. Implement agreed changes, update affected documents and record the fix reference.
   Retest the reported problem and affected flows on relevant platforms, including
   real-device checks where needed. Update candidate hashes after build changes.
5. Return fixes for owner review. Repeat as new feedback arrives. A test pass or
   implementation completion alone does not count as owner acceptance.

## Feedback register

No items recorded yet. Add rows as feedback arrives; the empty register is not a pass.

| ID  | Owner request / screen | Type / priority | Actual behavior / reproduction / demo reference | Expected behavior / acceptance criteria | Status | Fix / verification / build | Owner acceptance or explicit deferral |
| --- | ---------------------- | --------------- | ----------------------------------------------- | --------------------------------------- | ------ | -------------------------- | ------------------------------------- |

Statuses: captured → needs clarification / agreed → in progress → ready for owner
review → accepted. Reopened items return to the cycle. Use deferred only with the
owner's explicit decision, reason and follow-up destination. Linked repository
issues can hold detail, but keep the request, status and acceptance visible here.

## Exit gate

- Every dictated item has an outcome: fixed, verified and owner-accepted, or an
  explicit owner-approved nonblocking deferral with rationale and follow-up.
- All required demo features and accepted production behavior work. No known
  broken required flow, data-loss/security blocker or other release blocker remains.
- Relevant regression, migration/recovery and platform checks pass; verification
  gaps remain visible and are assessed against the launch gates.
- Specifications, instructions, screenshots and release notes reflect the final app.
- The owner explicitly accepts the final reviewed build, recorded below. Any later
  change requires relevant retesting and owner review of affected flows.

Final acceptance: **pending**. Record owner decision/date, commit, web artifact
hash, APK version/hash, verification links and any approved nonblocking deferrals.

Phase 14 deployment requires this acceptance plus owner deployment approval and all
[launch gates](../LAUNCH-PLAN.md). Planning this phase does not authorize deployment.
