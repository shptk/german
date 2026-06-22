/*
 * Minimal Google Drive REST calls against the hidden per-app appDataFolder
 * (M8). One fixed file `state.json` holding the backup envelope; updatedAt is
 * mirrored into appProperties so we can compare remote-vs-local without
 * downloading. No SDK — plain fetch with a bearer token.
 */

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FILE = 'state.json';
const BOUNDARY = 'germanA1boundary';

export interface RemoteMeta {
  id: string;
  updatedAt: number;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function findStateFile(token: string): Promise<RemoteMeta | null> {
  const url = `${API}/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${FILE}'`)}&fields=files(id,appProperties)`;
  const r = await fetch(url, { headers: auth(token) });
  if (!r.ok) throw new Error(`drive list failed (${r.status})`);
  const j = (await r.json()) as { files?: { id: string; appProperties?: { updatedAt?: string } }[] };
  const f = j.files?.[0];
  return f ? { id: f.id, updatedAt: Number(f.appProperties?.updatedAt ?? 0) } : null;
}

export async function readState(token: string, id: string): Promise<unknown> {
  const r = await fetch(`${API}/files/${id}?alt=media`, { headers: auth(token) });
  if (!r.ok) throw new Error(`drive read failed (${r.status})`);
  return r.json();
}

function multipart(metadata: unknown, content: unknown): string {
  return (
    `--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${BOUNDARY}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content)}\r\n` +
    `--${BOUNDARY}--`
  );
}

export async function createState(token: string, content: unknown, updatedAt: number): Promise<string> {
  const metadata = { name: FILE, parents: ['appDataFolder'], appProperties: { updatedAt: String(updatedAt) } };
  const r = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': `multipart/related; boundary=${BOUNDARY}` },
    body: multipart(metadata, content),
  });
  if (!r.ok) throw new Error(`drive create failed (${r.status})`);
  return ((await r.json()) as { id: string }).id;
}

export async function updateState(token: string, id: string, content: unknown, updatedAt: number): Promise<void> {
  const c = await fetch(`${UPLOAD}/files/${id}?uploadType=media`, {
    method: 'PATCH',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  if (!c.ok) throw new Error(`drive update failed (${c.status})`);
  await fetch(`${API}/files/${id}`, {
    method: 'PATCH',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ appProperties: { updatedAt: String(updatedAt) } }),
  });
}
