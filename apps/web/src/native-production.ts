import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNative, native } from './native.ts';
import { canonical, loggedMinutes } from '../../../packages/domain/src/logbook.ts';
import { settings, localDate } from '../../../packages/domain/src/management.ts';
import { encode64, decode64 } from '../../../packages/crypto/src/content.ts';
import type { ContentSetup } from '../../../packages/crypto/src/content.ts';
import type { Projection } from './management-ui.tsx';
import type { beginDropbox } from '../../../packages/sync-providers/src/dropbox.ts';

interface NativePort {
  minimize(): Promise<void>;
  takeLaunch(): Promise<{ action: string }>;
  beginOAuth(input: { pending: Awaited<ReturnType<typeof beginDropbox>> }): Promise<void>;
  takeOAuth(): Promise<{ url?: string; pending?: Awaited<ReturnType<typeof beginDropbox>> }>;
  enroll(input: { id: string; raw: string }): Promise<void>;
  restore(input: { id: string }): Promise<{ raw: string }>;
  lock(): Promise<void>;
  forget(): Promise<void>;
  saveBackup(input: { raw: string; name: string }): Promise<void>;
  reminders(input: {
    enabled: boolean;
    time: string;
    logged: boolean;
  }): Promise<{ granted: boolean }>;
  testReminder(): Promise<{ requested: boolean }>;
  requestNotifications(): Promise<{ granted: boolean }>;
  addListener(event: 'return', listener: () => void): Promise<PluginListenerHandle>;
}
export const device = registerPlugin<NativePort>('LogbookNative');
const identity = async (setup: ContentSetup) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(setup))),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
export async function trustContent(setup: ContentSetup, raw: Uint8Array) {
  await device.enroll({ id: await identity(setup), raw: encode64(raw) });
}
export async function restoreTrust(setup: ContentSetup) {
  const result = await device.restore({ id: await identity(setup) });
  const raw = decode64(result.raw, 32);
  try {
    return await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  } finally {
    raw.fill(0);
    result.raw = '';
  }
}
// Native projection is a disposable observer. Native failures never undo a durable save.
export function bindNativeProjection(projection: Projection) {
  if (!isNative()) return;
  let chain = Promise.resolve();
  const update = () => {
    chain = chain
      .catch(() => {})
      .then(async () => {
        const erasure = await projection.db.erasureStatus();
        if (erasure) {
          await device.forget();
          await device.reminders({ enabled: false, time: '21:00', logged: false });
          return;
        }
        const state = projection.store.getState(),
          date = localDate(),
          p = settings(state);
        const moments = Object.values(state.entities).filter(
          (e) => e.kind === 'moment' && e.date === date && e.featured,
        );
        // Native allocates the projection revision, serially, from this canonical observer.
        await native.publishCurrent({
          projection: {
            schema: 1,
            revision: Date.now(),
            wallDate: date,
            loggedMinutes: loggedMinutes(state, date),
            bestCount: Math.min(4, moments.length),
            updatedAt: new Date().toISOString(),
            personalText: moments.map((e) => (e.kind === 'moment' ? e.text : '')).join('\n'),
          },
        });
        const logged = Object.values(state.entities).some(
          (e) => e.kind === 'activity' && e.segments.some((s) => s.date === date),
        );
        await device.reminders({ enabled: !!p.rem, time: String(p.rt), logged });
      })
      .catch(() => {
        window.dispatchEvent(new Event('slb-native-error'));
      });
  };
  projection.store.subscribe(update);
  window.addEventListener('focus', update);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) update();
  });
  // Daily/timezone projection refresh while foregrounded; never writes canonical data.
  setInterval(() => {
    if (!document.hidden) update();
  }, 60000);
  update();
}
