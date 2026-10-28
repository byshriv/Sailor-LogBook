# Using Phase 8 data tools

Use a disposable profile while reviewing this phase. Canonical data is local to this
browser profile and origin. Existing demo data is never read automatically.

1. Open Settings → Storage & data. Request persistence explicitly if desired. A denial
   leaves ordinary storage usable. Verify storage checks replay and live media hashes;
   estimates and persistence cannot guarantee protection from browser/OS clearing.
2. Choose **Download plaintext backup**. Keep the file privately outside browser storage.
   Reopen the downloaded file with **Preview import** to check the actual copy. The app
   verifies its structure, payload checksum and media bytes; it cannot verify disk writes.
3. Choose **Merge** to add records or **Replace** to replace current records/settings.
   Preview shows counts and colliding IDs. Merge requires a choice for each conflict,
   including a local deletion. Relationship/featured-limit errors block Apply. Legacy
   files may require explicit streak/deck review. Cancel does not change the logbook.
4. **Apply reviewed import** revalidates the file and current baseline and atomically
   saves a verified pre-import recovery point with the change. A storage failure retains
   the preview for retry. If another writer changed data, cancel and preview again.
5. **Verify storage and list recovery** lists the five retained ordinary local points.
   **Review restore** then **Restore this recovery point** restores records/settings,
   retains pre-restore recovery and leaves original media retained. Recent changes also
   offers normal 30-day Undo. Imported causal trash/history remains in the source archive;
   it does not impersonate operations made on this device.

Files are whole-file plaintext JSON with base64 media, limited to 64 MiB for this phase.
Legacy embedded images use the existing 8 MiB limit. Large file work is not streaming and
can need substantial memory. Rejection does not trim the logbook. Optional encrypted file
setup and Dropbox transport remain Phase 9. No remote connection is made by these tools.

If startup reports damaged storage, open `/?phase=8` for Local recovery. Export retained
stores first and keep the forensic file privately. Find verified recovery points, select
one and explicitly restore it. The app archives damaged stores before creating a new local
baseline. With no valid point, retain the forensic export for manual investigation; do not
clear browser data. Forensic files are not normal import backups. Local points share the
same eviction/device-failure boundary as the live database.

Production offline installation requires a dedicated secure origin, separate from Demo v8.
After the offline shell reports ready, reopen once. Install from the browser's menu; on
iPhone/iPad use Share → Add to Home Screen. Installation UI and OS behavior vary. Offline
local saves work, but this phase has no production cloud sync. An update waits until all
controlled old tabs close: finish/save drafts, close every Logbook tab/window and reopen.
The app never forces a reload. Failed shell installation leaves the active shell available.
Unsaved work is not guaranteed after an OS kill. Physical-device acceptance remains pending.
