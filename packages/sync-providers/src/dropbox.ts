// HTTP is injected: no browser globals, credentials on disk, or journal-bearing errors.
export type Http = (input: string, init?: RequestInit) => Promise<Response>;
export class DropboxReadError extends Error {
  readonly retryAfter: number;
  readonly status: number;
  constructor(message: string, status: number, headers: Headers) {
    super(message);
    this.status = status;
    const value = headers.get('Retry-After') ?? '';
    // HTTP-date delays use the server's Date to avoid local wall-clock skew.
    const delay = /^\d+$/.test(value)
      ? Number(value) * 1000
      : Date.parse(value) - Date.parse(headers.get('Date') ?? '');
    this.retryAfter = Number.isFinite(delay) ? Math.max(0, delay) : 0;
  }
  get transient() {
    return this.status === 429 || this.status >= 500;
  }
}
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
export interface OwnedFile {
  path: string;
  revision: string;
}
export interface ErasurePort extends CloudPort {
  inventory(signal?: AbortSignal): Promise<OwnedFile[]>;
  remove(file: OwnedFile, signal?: AbortSignal): Promise<void>;
}
export function ownedDataPath(path: string) {
  return (
    path === '/sailors-logbook.json' ||
    /^\/sailor-logbook\/v2\/(?:media|attachments)\/[a-f0-9]{64}(?:\.bin)?$/.test(path) ||
    /^\/sailor-logbook\/v2\/backups\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.json$/.test(
      path,
    )
  );
}
export class DropboxPort implements CloudPort {
  private token: () => string;
  private http: Http;
  constructor(token: () => string, http: Http) {
    this.token = token;
    this.http = http;
  }
  async inventory(signal?: AbortSignal): Promise<OwnedFile[]> {
    const files: OwnedFile[] = [],
      seen = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < 100; page++) {
      const r = await this.http(
        'https://api.dropboxapi.com/2/files/' + (cursor ? 'list_folder/continue' : 'list_folder'),
        {
          method: 'POST',
          signal,
          headers: { Authorization: 'Bearer ' + this.token(), 'Content-Type': 'application/json' },
          body: JSON.stringify(
            cursor
              ? { cursor }
              : {
                  path: '',
                  recursive: true,
                  include_deleted: false,
                  include_mounted_folders: false,
                  limit: 1000,
                },
          ),
        },
      );
      if (!r.ok)
        throw Error('Dropbox deletion inventory failed (' + r.status + '); reconnect or retry');
      const value = await r.json();
      if (!Array.isArray(value.entries) || typeof value.has_more !== 'boolean')
        throw Error('Invalid Dropbox deletion inventory');
      for (const entry of value.entries) {
        if (entry?.['.tag'] !== 'file') continue;
        const path = entry.path_lower;
        if (typeof path !== 'string' || (path !== productionPath && !ownedDataPath(path))) continue;
        if (seen.has(path) || typeof entry.rev !== 'string')
          throw Error('Invalid Dropbox deletion inventory');
        seen.add(path);
        files.push({ path, revision: entry.rev });
        if (files.length > 10000)
          throw Error('Deletion inventory limit; review the remaining scope manually');
      }
      if (!value.has_more) return files.sort((a, b) => a.path.localeCompare(b.path));
      if (typeof value.cursor !== 'string' || value.cursor === cursor)
        throw Error('Invalid deletion inventory cursor');
      cursor = value.cursor;
    }
    throw Error('Deletion inventory pagination limit; review the remaining scope manually');
  }
  async remove(file: OwnedFile, signal?: AbortSignal) {
    if (!ownedDataPath(file.path) || !file.revision)
      throw Error('Unowned Dropbox deletion refused');
    const r = await this.http('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      signal,
      headers: { Authorization: 'Bearer ' + this.token(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path, parent_rev: file.revision }),
    });
    if (r.status === 409) {
      const e = await r.json();
      if (e?.error?.['.tag'] === 'path_lookup' && e.error.path_lookup?.['.tag'] === 'not_found')
        return;
    }
    if (!r.ok)
      throw Error('Dropbox deletion incomplete (' + r.status + '); review changed files and retry');
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
    if (!r.ok)
      throw new DropboxReadError(
        'Dropbox read failed (' + r.status + '); retry or reconnect',
        r.status,
        r.headers,
      );
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
    if (!r.ok)
      throw new DropboxReadError(
        'Legacy Dropbox revision check failed; reconnect with metadata access',
        r.status,
        r.headers,
      );
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
  if (
    !pending ||
    !Number.isFinite(pending.at) ||
    pending.at > Date.now() ||
    state !== pending.state ||
    Date.now() - pending.at > 10 * 60 * 1000 ||
    !code
  )
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
