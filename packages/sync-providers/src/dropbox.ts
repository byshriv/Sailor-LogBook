// HTTP is injected: no browser globals, credentials on disk, or journal-bearing errors.
export type Http = (input: string, init?: RequestInit) => Promise<Response>;
export interface CloudFile {
  revision: string;
  raw: string;
}
export interface CloudPort {
  legacyRevision?(signal?: AbortSignal): Promise<string | null>;
  read(signal?: AbortSignal): Promise<CloudFile | null>;
  write(raw: string, revision: string | null, signal?: AbortSignal): Promise<string>;
}
export const productionPath = '/sailor-logbook/v2/logbook.json';
export class DropboxPort implements CloudPort {
  private token: () => string;
  private http: Http;
  constructor(token: () => string, http: Http) {
    this.token = token;
    this.http = http;
  }
  async read(signal?: AbortSignal): Promise<CloudFile | null> {
    const r = await this.http('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      signal,
      headers: {
        Authorization: 'Bearer ' + this.token(),
        'Dropbox-API-Arg': JSON.stringify({ path: productionPath }),
      },
    });
    if (r.status === 409) {
      const e = await r.json();
      if (e?.error?.['.tag'] === 'path' && e.error.path?.['.tag'] === 'not_found') return null;
    }
    if (!r.ok) throw Error('Dropbox read failed (' + r.status + '); retry or reconnect');
    const metadata = JSON.parse(r.headers.get('Dropbox-API-Result') ?? '{}');
    if (typeof metadata.rev !== 'string') throw Error('Dropbox revision missing');
    if (Number(r.headers.get('Content-Length')) > 96 * 1024 * 1024)
      throw Error('Cloud transfer limit');
    const raw = await r.text();
    if (new TextEncoder().encode(raw).length > 96 * 1024 * 1024)
      throw Error('Cloud transfer limit');
    return { revision: metadata.rev, raw };
  }
  async legacyRevision(signal?: AbortSignal): Promise<string | null> {
    const r = await this.http('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      signal,
      headers: { Authorization: 'Bearer ' + this.token(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/sailors-logbook.json' }),
    });
    if (r.status === 409) {
      const e = await r.json();
      if (e?.error?.['.tag'] === 'path' && e.error.path?.['.tag'] === 'not_found') return null;
    }
    if (!r.ok) throw Error('Legacy Dropbox revision check failed; reconnect with metadata access');
    const m = await r.json();
    if (typeof m.rev !== 'string') throw Error('Legacy Dropbox revision missing');
    return m.rev;
  }
  async write(raw: string, revision: string | null, signal?: AbortSignal) {
    if (new TextEncoder().encode(raw).length > 96 * 1024 * 1024)
      throw Error('Cloud transfer limit');
    const r = await this.http('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      signal,
      headers: {
        Authorization: 'Bearer ' + this.token(),
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: productionPath,
          mode: revision === null ? { '.tag': 'add' } : { '.tag': 'update', update: revision },
          autorename: false,
          strict_conflict: true,
          mute: true,
        }),
      },
      body: raw,
    });
    if (!r.ok)
      throw Error(
        r.status === 409
          ? 'Dropbox changed; preview again'
          : 'Dropbox write failed (' + r.status + '); retry or reconnect',
      );
    const result = await r.json();
    if (typeof result.rev !== 'string') throw Error('Dropbox commit revision missing');
    return result.rev as string;
  }
}
const base64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
export async function beginDropbox(clientId: string, redirect: string) {
  if (!/^[a-zA-Z0-9]{5,80}$/.test(clientId)) throw Error('Configure the Dropbox public app key');
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
  );
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    token_access_type: 'online',
  });
  return {
    verifier,
    state,
    clientId,
    redirect,
    at: Date.now(),
    url: 'https://www.dropbox.com/oauth2/authorize?' + query,
  };
}
export async function finishDropbox(
  pending: Awaited<ReturnType<typeof beginDropbox>>,
  code: string,
  state: string,
  http: Http,
) {
  if (!pending || state !== pending.state || Date.now() - pending.at > 10 * 60 * 1000 || !code)
    throw Error('Dropbox authorization expired or state mismatch');
  const r = await http('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: pending.clientId,
      redirect_uri: pending.redirect,
      code_verifier: pending.verifier,
    }),
  });
  if (!r.ok) throw Error('Dropbox authorization failed; connect again');
  const value = await r.json();
  if (typeof value.access_token !== 'string' || !Number.isFinite(value.expires_in))
    throw Error('Invalid Dropbox authorization response');
  return { token: value.access_token as string, expires: Date.now() + value.expires_in * 1000 };
}
