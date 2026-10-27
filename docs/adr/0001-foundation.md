# ADR 0001: isolated production foundation

Accepted for Phase 1, 27 October 2026. Product decisions remain in LAUNCH-DECISIONS.md.

Use React, TypeScript, Vite and Redux Toolkit for the app. Redux is a projection;
IndexedDB will be canonical. One root npm lockfile avoids independent package resolution.
Relative public entry imports suffice during the spike; published/internal workspace
packages can follow when their APIs stabilize. No mutable upstream source imports.

Dependency direction: web composes domain, persistence, sync and platform ports;
persistence imports domain; providers import sync-core; domain, sync-core, crypto and
platform contracts have no UI/provider dependencies. The current checker enforces static
imports in the flat package src folders. Extend it before introducing nested modules,
re-exports, path aliases or dynamic imports. It is not a general security sandbox.

The sample command commits projection, operation and sequence in one IndexedDB transaction.
Only transaction completion can publish Saved and schedule sync. The gateway serializes
commands and snapshots input before queuing. Duplicate command IDs are idempotent;
different contents under the same ID fail. Startup validates by replaying the tail and
comparing its projection; corruption stops opening without clearing data. No localStorage
fallback is permitted for this proof. Production needs bounded checkpoints and recovery.

The proof sequence is a local transaction sequence, **not a causal vector clock**. Do not
connect it to real sync. Phase 2 must establish actor identity, per-actor sequence, causal
clock, remote replay without capture, checkpoints, durable pending acknowledgements and
safe compaction. A page becoming invisible does not imply a transaction or sync completed.

Use Web Locks for one editing tab. A second tab explains how to return to the active one;
browser death releases ownership. No localStorage lease or automatic lock stealing. Missing
Web Locks disables editing in the preview. Test suspension, BFCache and lock handoff on
actual supported browsers before production. The schema/database are proof-only and do
not read `slb1`, OAuth storage, demo IndexedDB or existing Dropbox files.

Build targets include Safari 17 explicitly. Build transpilation is not API/device
verification. Keep the demo at the existing root and freeze reference/demo-v8 with hashes.
The foundation has a separate origin/port, no service worker, no production deploy job.

Alternatives rejected now: full upstream fork, Angular adoption merely to match upstream,
two canonical databases, completing Calendar before persistence feasibility, and migrating
real data into an unfinished schema. Consequence: more integration work remains explicit.
