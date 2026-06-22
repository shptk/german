# German A1 Challenge

A finite, beatable, time-boxed German **A1** course as an installable, offline-capable **PWA**.
Static (GitHub Pages), no backend, free forever. Full design in [`DESIGN.md`](./DESIGN.md).

## Status

**Milestone M1 — scaffold + PWA shell.** Svelte 5 + Vite + TypeScript, hash router, bottom-tab
navigation (Today / Map / You), design tokens, PWA manifest + service worker (offline + installable),
update-prompt toast, architecture boundary gate, and a GitHub Pages deploy workflow.
The engine, content, persistence, and exercises arrive in M2–M8.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + static build -> dist/
npm run preview      # serve the production build
npm run check        # svelte-check (types)
npm run check:boundaries   # enforce engine purity + storage confinement
```

## Architecture boundaries (enforced)

- `src/lib/engine/**` is **pure** — no framework, storage, DOM, or wall-clock.
- Storage concretes (IndexedDB, Drive) live **only** under `src/lib/persistence/**`.

`npm run check:boundaries` (also run in CI) fails the build if either rule is broken.

## Deploy (GitHub Pages → https://learn.pathak.uk/german/)

The app is served at **`learn.pathak.uk/german/`**: this repo owns the host
`learn.pathak.uk`, and the app lives under the `/german/` subpath (`base: '/german/'`).

1. Push to a **public** GitHub repo on the `main` branch.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Pages → Custom domain:** set `learn.pathak.uk`. At your DNS provider,
   add a `CNAME` record `learn` → `<user>.github.io`.
4. The workflow (`.github/workflows/deploy.yml`) builds, then stages the artifact so the
   app sits under `german/`, writes the `CNAME` (host-only — paths aren't allowed in it)
   and a root redirect (`learn.pathak.uk/` → `/german/`) at the site root, and deploys.

> A Pages custom domain maps a **hostname only**; the `/german` path comes from `base`
> + the staged folder, not the `CNAME`. Local `npm run dev`/`preview` serve at
> `http://localhost:<port>/german/` accordingly.
