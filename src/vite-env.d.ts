/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  /** 'on' enables the opt-in Google Drive sync layer (M8). Default: off (local-first only). */
  readonly VITE_DRIVE_SYNC?: string;
  /** Public Google OAuth client id for Drive appData sync. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
