# ADR 0006: Phase 9 revision-checked shared baselines

29 October 2026. Implementation decision under the owner's Phase 9 instruction;
Phase 9 acceptance/live exit gates remain pending. See ARCHITECTURE-PHASE-9.md
and VERIFICATION-PHASE-9.md for implementation and evidence.

The first production Dropbox wire uses complete versioned/media-verified baselines,
with conservative three-way merge against each device's last acknowledged baseline.
This keeps the existing local causal reducer/replay vocabulary unchanged. It does not
exchange foreign actor operation tails or infer foreign receipts as locally durable.
CAS races return to preview; no refreshed revision is used to force a stale upload.

A merge uses the existing recover command, expected-state guard and verified recovery.
Incoming snapshots/alternatives are retained by payload digest and can be reviewed in
Storage & data. Independent top-level fields merge; opaque nested values and arrays
require a choice when both changed. Relationship errors block apply.

Local recover intentionally does not adopt foreign tombstones. Therefore the shared
wire baseline and durable sync anchor carry the union of deletion barriers, excluding
explicitly reviewed live restores. Empty devices preserve barriers in their next
upload. Known barriers also require review on same-generation provider rollback.
No change to historical recover replay semantics is allowed to implement this feature.

Before upload, persist exact bytes, represented local state, shared baseline, included
pending IDs and actor/generation. After CAS upload, independently read back exact bytes
and revision, validate payload/media, then atomically verify the local actor/state and
record acknowledgement plus anchor. Interrupted success resumes only from exact read-back.
Rescue clears continuity; missing/changed known cloud generations cannot auto-recreate.
Explicit rejoin needs a matching external backup, verified point, typed JOIN and old
journal retention. Encryption policy is independent of an unlocked session key.

Plain sync precedes optional Argon2id/AES-GCM full-content protection. Foreign legacy
files remain separate and unchanged; metadata revision changes require cutover review.
Browser public-client tokens and content keys are memory-only. Trusted native keys,
native trust, real account/device rehearsal and independent review remain
unverified/unimplemented as detailed in Phase 9 status. Do not infer production readiness
from the protocol choice or synthetic tests. No Phase 10 or deployment is authorized.

Subsequent Phase 9 follow-ups implement credential/content-key rotation and separate
permanent local/cloud erasure. See ADR 0007 for the retained content-free deletion marker,
local write fence, revision-bound owned-file removal and offline/legacy-client limits.
