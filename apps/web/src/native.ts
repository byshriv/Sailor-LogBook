import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { WidgetProjection } from '../../../packages/platform/src/index.ts';

interface NativeWidget {
  publish(input: { projection: WidgetProjection }): Promise<{ written: boolean }>;
  clear(): Promise<void>;
  getLaunchAction(): Promise<{ action: string }>;
  addListener(
    event: 'widgetLaunch',
    listener: (value: { action: string }) => void,
  ): Promise<PluginListenerHandle>;
}
const native = registerPlugin<NativeWidget>('WidgetProjection');
export const isNative = () => Capacitor.isNativePlatform();
export async function publishWidget(projection: WidgetProjection): Promise<void> {
  if (isNative()) await native.publish({ projection });
}
export async function launchAction(): Promise<string> {
  return isNative() ? (await native.getLaunchAction()).action : 'none';
}
export async function listenForWidgetLaunch(
  listener: (action: string) => void,
): Promise<() => void> {
  if (!isNative()) return () => {};
  const handle = await native.addListener('widgetLaunch', (value) => listener(value.action));
  return () => {
    void handle.remove();
  };
}
