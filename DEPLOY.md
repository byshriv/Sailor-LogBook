# Deploy the desktop + Dropbox demo (Cloudflare Pages)

1. The supplied public Dropbox `dropboxAppKey` is configured in `config.js`. Never include an app secret. See DROPBOX-SETUP.md for permissions and exact redirect URLs.
2. Run `npm ci`, `npm run check`, `npm test`, then `npm run package`.
3. Upload the **contents of `dist/`** in Cloudflare Pages → your project → Deployments → Create deployment. Upload every asset, including the new JavaScript and CSS files.
4. This update uses service-worker cache `slb-v8-r3`. On later updates, bump the name in `sw.js` before packaging.
5. The owner’s current deployment is v7. After uploading v8, open the app online, allow it time to download, then close all Logbook tabs/app windows and reopen on **both devices**. A v7 page does not contain the new update notice, so this initial transition can require the extra close/reopen cycle. Do not clear site data or uninstall to update. Once v8 is loaded, later updates show an Update available notice with Reload and Remind me later. Settings → Help → Check for updates performs a real check. Active editors must be finished/closed before Reload. No Dropbox file rename or data reset is needed.

The `dist/` folder contains index.html, external application modules and styles, config.js, sw.js, manifest.webmanifest, _headers, icons/, fonts/, the application MIT license and deployment/setup instructions. Development packages, research downloads and local test data are excluded.

The home-screen icon comes from manifest.webmanifest and icons/. Install assets now render the owner’s original SVG at full size, with a square outer frame for the OS mask. The manifest and Apple icon URLs are updated; some launchers may require removing and re-adding an installed shortcut. Existing device logbooks stay under localStorage key `slb1`. Export a backup before deploying. This local development task has not uploaded the demo to Cloudflare.
