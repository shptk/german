/*
 * Minimal hash router (Svelte 5 runes). Hash routing is deliberate: a static
 * GitHub Pages host (even on a custom domain) has no server rewrites, so every
 * deep link must resolve to index.html. Hash URLs do that with zero server
 * config and are exactly what the offline SW navigation fallback expects.
 *
 * The route TABLE lives in App.svelte; this module only tracks the current path.
 * Swapping to history routing later is localized to these two files.
 */

const DEFAULT = '/today';

function read(): string {
  const raw = window.location.hash.replace(/^#/, '');
  return raw === '' ? DEFAULT : raw;
}

export const route = $state({ path: read() });

window.addEventListener('hashchange', () => {
  route.path = read();
});

/** Ensure the bar URL always carries an explicit hash (so reloads land on a route). */
export function ensureHash(): void {
  if (window.location.hash === '') window.location.replace('#' + DEFAULT);
}

/** Programmatic navigation; plain <a href="#/..."> works too. */
export function navigate(to: string): void {
  const next = to.startsWith('/') ? to : '/' + to;
  if (read() !== next) window.location.hash = next;
}

/** The leading segment of the current path, e.g. "/today/foo" -> "today". */
export function segment(path: string = route.path): string {
  return path.replace(/^\//, '').split('/')[0] ?? '';
}
