/** Native public-client callback. It carries authorization results, never journal data. */
export function nativeOAuthReturn(raw: string): { code: string; state: string; canceled: boolean } {
  const u = new URL(raw);
  if (
    raw.length > 8192 ||
    u.protocol !== 'sailorlogbook:' ||
    u.hostname !== 'oauth' ||
    u.pathname !== '/dropbox' ||
    u.username ||
    u.password ||
    u.port ||
    u.hash
  )
    throw Error('Invalid OAuth callback');
  const seen = new Set<string>();
  for (const [key] of u.searchParams) {
    if (seen.has(key) || !['code', 'state', 'error', 'error_description'].includes(key))
      throw Error('Invalid OAuth callback parameters');
    seen.add(key);
  }
  const code = u.searchParams.get('code') ?? '',
    state = u.searchParams.get('state') ?? '';
  if (!state || (u.searchParams.has('error') && !!code) || (!code && !u.searchParams.has('error')))
    throw Error('Invalid OAuth callback result');
  return { code, state, canceled: u.searchParams.has('error') };
}
