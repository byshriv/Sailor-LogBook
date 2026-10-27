export interface WidgetProjection {
  schema: 1;
  revision: number;
  wallDate: string;
  loggedMinutes: number;
  bestCount: number;
  updatedAt: string;
  personalText?: string;
}
export interface WidgetPort {
  publish(projection: WidgetProjection): Promise<void>;
  clear(): Promise<void>;
}
export function widgetProjection(
  value: WidgetProjection,
  showPersonalText = false,
): WidgetProjection {
  const { schema, revision, wallDate, loggedMinutes, bestCount, updatedAt } = value;
  if (
    schema !== 1 ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(wallDate) ||
    !Number.isFinite(Date.parse(updatedAt)) ||
    !Number.isInteger(loggedMinutes) ||
    loggedMinutes < 0 ||
    loggedMinutes > 1440 ||
    !Number.isInteger(bestCount) ||
    bestCount < 0 ||
    bestCount > 4
  )
    throw new Error('Invalid widget projection');
  return {
    schema,
    revision,
    wallDate,
    loggedMinutes,
    bestCount,
    updatedAt,
    ...(showPersonalText && value.personalText
      ? { personalText: value.personalText.slice(0, 500) }
      : {}),
  };
}
export function parseWidgetLink(raw: string): 'quick-log' | 'today' | null {
  try {
    const u = new URL(raw);
    if (
      u.protocol !== 'sailorlogbook:' ||
      u.hostname !== 'widget' ||
      u.search ||
      u.hash ||
      u.username ||
      u.password ||
      u.port
    )
      return null;
    return u.pathname === '/quick-log' ? 'quick-log' : u.pathname === '/today' ? 'today' : null;
  } catch {
    return null;
  }
}
