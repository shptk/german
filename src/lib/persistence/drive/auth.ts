/*
 * Google Identity Services token flow for Drive appData (M8). No backend, no
 * client secret: a PUBLIC client id (env) + the drive.appdata scope, with the
 * app's origin whitelisted in the OAuth client. Tokens are short-lived and kept
 * in memory only. Lives under persistence/ — the only place storage/cloud
 * concretes may be named (boundary gate).
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

/* eslint-disable @typescript-eslint/no-explicit-any */
type GisOAuth = {
  initTokenClient(cfg: { client_id: string; scope: string; callback: (r: any) => void }): { requestAccessToken(opts?: { prompt?: string }): void };
  revoke(token: string, done: () => void): void;
};
const gis = (): GisOAuth | undefined => (window as any).google?.accounts?.oauth2;

let token: string | null = null;
let expiresAt = 0;

export function clientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
}
export function isConfigured(): boolean {
  return clientId().length > 0;
}
export function isConnected(): boolean {
  return !!token && Date.now() < expiresAt;
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gis()) return resolve();
    let s = document.getElementById('gis-script') as HTMLScriptElement | null;
    if (s) {
      s.addEventListener('load', () => resolve());
      s.addEventListener('error', () => reject(new Error('Google Identity Services failed to load')));
      return;
    }
    s = document.createElement('script');
    s.id = 'gis-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Identity Services failed to load'));
    document.head.appendChild(s);
  });
}

/** Get a valid access token, prompting for consent when needed. */
export function getToken(interactive = false): Promise<string> {
  if (isConnected()) return Promise.resolve(token as string);
  if (!isConfigured()) return Promise.reject(new Error('Google sync is not configured (VITE_GOOGLE_CLIENT_ID unset)'));
  return loadGis().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const oauth = gis();
        if (!oauth) return reject(new Error('Google Identity Services unavailable'));
        const client = oauth.initTokenClient({
          client_id: clientId(),
          scope: SCOPE,
          callback: (resp: any) => {
            if (resp.error) return reject(new Error(resp.error));
            token = resp.access_token;
            expiresAt = Date.now() + (resp.expires_in ?? 3600) * 1000;
            resolve(token as string);
          },
        });
        client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
      }),
  );
}

export async function connect(): Promise<void> {
  await getToken(true);
}

export function disconnect(): void {
  const oauth = gis();
  if (token && oauth) oauth.revoke(token, () => {});
  token = null;
  expiresAt = 0;
}
