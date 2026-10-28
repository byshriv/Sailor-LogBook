# Frozen Demo v8

demo-v8 is a byte-preserved runtime reference of the final root demo, cache slb-v8-r3.
demo-v8.sha256.json records 37 files including fonts, icons and notices. Verify with
`node scripts/freeze-demo.cjs`. Never regenerate these hashes to hide a reference change.
The --create switch is one-shot and refuses to overwrite an existing reference.

The root demo remains available through `npm run dev`; serve it on its own origin/port.
Do not open this reference on the Phase 1 proof origin or use real personal data for tests.
The preserved service worker and Dropbox code retain prototype behavior and limitations.
The source ZIPs are ignored build artifacts; they are not a substitute for the frozen files.
