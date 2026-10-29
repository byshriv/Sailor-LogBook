import { isNative } from './native.ts';
import { useEffect, useState } from 'react';
let registration: Promise<ServiceWorkerRegistration> | undefined;
export function prepareOffline() {
  return (registration ??= (async () => {
    if (isNative()) throw Error('Android uses packaged offline assets');
    if (!('serviceWorker' in navigator)) throw Error('Service workers unavailable');
    const previous = await navigator.serviceWorker.getRegistration('/');
    if (
      previous &&
      ![previous.active, previous.waiting, previous.installing]
        .filter(Boolean)
        .every((w) => w!.scriptURL.endsWith('/sw-production.js'))
    )
      throw Error('Use a dedicated production origin separate from the demo');
    return navigator.serviceWorker.register('/sw-production.js', { updateViaCache: 'none' });
  })());
}
export function PwaStatus() {
  const [status, setStatus] = useState(
      isNative()
        ? 'Offline assets are packaged in this Android app. Updates require an APK signed by the same maintainer.'
        : import.meta.env.PROD
          ? 'Checking offline availability…'
          : 'Offline installation is available in the production build.',
    ),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const network = () => setOnline(navigator.onLine);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    if (!isNative() && import.meta.env.PROD && 'serviceWorker' in navigator)
      void (async () => {
        const r = await prepareOffline();
        const check = () =>
          setStatus(
            r.waiting
              ? 'Update ready. Save your work, close all Logbook tabs, then reopen to update. Drafts are never reloaded automatically.'
              : r.active
                ? 'Offline shell ready. Install from your browser menu; on iPhone/iPad use Share → Add to Home Screen.'
                : 'Downloading offline shell. Keep this page open until ready.',
          );
        check();
        r.addEventListener('updatefound', () => {
          check();
          r.installing?.addEventListener('statechange', check);
        });
        r.installing?.addEventListener('statechange', check);
        if (!r.installing) {
          try {
            await r.update();
            check();
          } catch {
            setStatus(
              r.active
                ? 'Offline shell ready. Update check unavailable; reconnect and reopen Settings to retry.'
                : 'Offline shell unavailable. Reconnect to finish installation.',
            );
          }
        }
      })().catch((e) => setStatus('Offline setup unavailable: ' + (e as Error).message));
    else if (!isNative() && import.meta.env.PROD)
      setStatus('Offline installation is unavailable in this browser.');
    return () => {
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
    };
  }, []);
  return (
    <p role="status" aria-label="Offline and updates">
      {online ? 'Online' : 'Offline · local saves remain available'}. {status}
    </p>
  );
}
