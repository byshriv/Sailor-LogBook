import { Capacitor, registerPlugin } from '@capacitor/core';
import type { WidgetProjection } from '../../../packages/platform/src/index.ts';

interface NativeWidget {
  publish(input: { projection: WidgetProjection }): Promise<{ written: boolean }>;
  clear(): Promise<void>;
  getLaunchAction(): Promise<{ action: string }>;
}
const native = registerPlugin<NativeWidget>('WidgetProjection');
export const isNative = () => Capacitor.isNativePlatform();
export async function publishWidget(projection: WidgetProjection): Promise<void> {
  if (isNative()) await native.publish({ projection });
}
export async function launchAction(): Promise<string> {
  return isNative() ? (await native.getLaunchAction()).action : 'none';
}
