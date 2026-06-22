/*
 * Minimal Google Drive REST against a single app-owned file (drive.file scope).
 * The app only ever sees files it created, so we find ours by name. The file
 * holds the backup envelope; merge/LWW uses the updatedAt inside it.
 */

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FILE_NAME = 'german-a1.json'; // distinct per app → safe to share one client id

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function findFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const r = await fetch(`${DRIVE}/files?q=${q}&spaces=drive&fields=files(id)`, { headers: auth(token) });
  if (!r.ok) throw new Error(`Drive list failed (${r.status})`);
  const j = (await r.json()) as { files?: { id: string }[] };
  return j.files?.[0]?.id ?? null;
}

export async function readFile(token: string, id: string): Promise<unknown | null> {
  const r = await fetch(`${DRIVE}/files/${id}?alt=media`, { headers: auth(token) });
  if (!r.ok) return null;
  return r.json();
}

export async function createFile(token: string, content: unknown): Promise<string> {
  const boundary = 'germanA1boundary';
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify(content) +
    `\r\n--${boundary}--`;
  const r = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { ...auth(token), 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!r.ok) throw new Error(`Drive create failed (${r.status})`);
  return ((await r.json()) as { id: string }).id;
}

export async function writeFile(token: string, id: string, content: unknown): Promise<void> {
  const r = await fetch(`${UPLOAD}/files/${id}?uploadType=media`, {
    method: 'PATCH',
    headers: { ...auth(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  if (!r.ok) throw new Error(`Drive update failed (${r.status})`);
}

export async function deleteFile(token: string, id: string): Promise<void> {
  const r = await fetch(`${DRIVE}/files/${id}`, { method: 'DELETE', headers: auth(token) });
  if (!r.ok && r.status !== 404) throw new Error(`Drive delete failed (${r.status})`);
}
