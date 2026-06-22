/*
 * Browser text-to-speech (SpeechSynthesis), de-DE. Free + on-device. Degrades
 * gracefully where no German voice exists (callers check hasGermanVoice). The
 * content schema keeps an optional recorded audioUrl hook for later.
 */

let cache: SpeechSynthesisVoice[] = [];

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function voices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  const v = s.getVoices();
  if (v.length) cache = v;
  return cache;
}

export function germanVoices(): SpeechSynthesisVoice[] {
  return voices().filter((v) => v.lang?.toLowerCase().startsWith('de'));
}

export function hasGermanVoice(): boolean {
  return germanVoices().length > 0;
}

function pick(voiceURI?: string | null): SpeechSynthesisVoice | undefined {
  const de = germanVoices();
  if (voiceURI) {
    const m = de.find((v) => v.voiceURI === voiceURI);
    if (m) return m;
  }
  return de[0];
}

export interface SpeakOpts {
  rate?: number;
  voiceURI?: string | null;
  onend?: () => void;
}

export function speak(text: string, opts: SpeakOpts = {}): void {
  const s = synth();
  if (!s || !text) {
    opts.onend?.();
    return;
  }
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = opts.rate ?? 0.9;
  const v = pick(opts.voiceURI);
  if (v) u.voice = v;
  if (opts.onend) u.onend = () => opts.onend?.();
  s.speak(u);
}

export function cancelSpeech(): void {
  synth()?.cancel();
}

/** Voices load asynchronously on some browsers; call once at boot to warm the list. */
export function warmVoices(onReady?: () => void): void {
  const s = synth();
  if (!s) return;
  voices();
  s.onvoiceschanged = () => {
    voices();
    onReady?.();
  };
}
