/*
 * Google sign-in via Google Identity Services (GIS), OAuth token flow — mirrors
 * the todo-tracker setup and REUSES the same public client id. drive.file is a
 * non-sensitive scope (per-file access to files this app creates; no "unverified
 * app" friction); openid/email/profile shows who is signed in. Local-first: the
 * app works fully signed-out; signing in only adds cross-device sync.
 *
 * SETUP: the client id below is PUBLIC (safe to commit). Its OAuth "Authorized
 * JavaScript origins" must include this app's origins — add https://learn.pathak.uk
 * and https://pathak.uk (and http://localhost:5173 for dev).
 */

const CLIENT_ID: string = '154320784701-fh1mvscaqdvttp1a0kk091uisa5m83eb.apps.googleusercontent.com';
const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';
const PROFILE_KEY = 'german-a1:auth-profile';

export interface Profile {
  email: string;
  name: string;
  picture: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const gsi = () => (window as unknown as { google?: any }).google;

let profile: Profile | null = loadProfile();
let accessToken: string | null = null;
let tokenExpiry = 0;
let tokenClient: any = null;
let gisReady: Promise<void> | null = null;
const listeners = new Set<(p: Profile | null) => void>();

function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const p = raw ? (JSON.parse(raw) as Profile) : null;
    return p?.email ? p : null;
  } catch {
    return null;
  }
}
function setProfile(p: Profile | null) {
  profile = p;
  if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  else localStorage.removeItem(PROFILE_KEY);
  for (const cb of listeners) cb(p);
}

export function isConfigured(): boolean {
  return CLIENT_ID !== '';
}
export function isConnected(): boolean {
  return profile !== null;
}
export function getProfile(): Profile | null {
  return profile;
}
export function subscribeAuth(cb: (p: Profile | null) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function loadGis(): Promise<void> {
  if (gisReady) return gisReady;
  gisReady = new Promise((resolve, reject) => {
    if (gsi()?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Google sign-in (are you offline?)."));
    document.head.append(s);
  });
  return gisReady;
}

async function ensureClient(): Promise<void> {
  await loadGis();
  if (!tokenClient) {
    tokenClient = gsi().accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: () => {} });
  }
}

function requestToken(prompt?: string): Promise<string> {
  return ensureClient().then(
    () =>
      new Promise<string>((resolve, reject) => {
        tokenClient.callback = (resp: any) => {
          if (resp?.access_token) {
            accessToken = resp.access_token;
            tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000 - 60_000;
            resolve(resp.access_token);
          } else reject(new Error(resp?.error ?? 'Authorization failed.'));
        };
        tokenClient.error_callback = (err: any) => reject(new Error(err?.message ?? 'Sign-in was cancelled.'));
        tokenClient.requestAccessToken(prompt === undefined ? {} : { prompt });
      }),
  );
}

async function fetchProfile(token: string): Promise<Profile> {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("Couldn't read your Google profile.");
  const j = (await r.json()) as { email: string; name?: string; picture?: string };
  return { email: j.email, name: j.name ?? j.email, picture: j.picture ?? '' };
}

/** Interactive sign-in. */
export async function connect(): Promise<void> {
  if (!isConfigured()) throw new Error("Google sign-in isn't configured.");
  const token = await requestToken();
  setProfile(await fetchProfile(token));
}

export function disconnect(): void {
  const g = gsi();
  if (accessToken && g?.accounts?.oauth2?.revoke) {
    try {
      g.accounts.oauth2.revoke(accessToken, () => {});
    } catch {
      /* ignore */
    }
  }
  accessToken = null;
  tokenExpiry = 0;
  setProfile(null);
}

/** Access token for Drive calls; silent refresh by default (no surprise popup). */
export async function getToken(interactive = false): Promise<string | null> {
  if (!isConfigured()) return null;
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  try {
    return await requestToken(interactive ? undefined : 'none');
  } catch {
    return null;
  }
}
