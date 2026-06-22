<script lang="ts">
  import { app } from '$lib/stores/store.svelte';
  import { hasGermanVoice, speak } from '$lib/audio/tts';

  let { text, label, size = 'md' }: { text: string; label?: string; size?: 'sm' | 'md' } = $props();

  let playing = $state(false);
  const available = hasGermanVoice();

  function go() {
    if (!available) return;
    playing = true;
    speak(text, {
      rate: app.state?.settings.ttsRate ?? 0.9,
      voiceURI: app.state?.settings.ttsVoiceURI,
      onend: () => (playing = false),
    });
    // fallback in case onend doesn't fire
    setTimeout(() => (playing = false), Math.min(6000, 800 + text.length * 70));
  }
</script>

<button
  type="button"
  class="speak {size}"
  class:playing
  class:muted={!available}
  onclick={go}
  aria-label={label ?? `Hör zu: ${text}`}
  title={available ? 'Hör zu' : 'No German voice on this device'}
>
  <span aria-hidden="true">🔊</span>
</button>

<style>
  .speak {
    display: inline-grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex: none;
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--surface-2);
    color: var(--text);
    font-size: 1rem;
    transition: transform var(--dur-fast) var(--ease);
  }
  .speak.sm {
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
  }
  .speak.muted {
    opacity: 0.4;
  }
  .speak.playing {
    animation: pulse 0.7s var(--ease) infinite;
    border-color: var(--accent);
    color: var(--accent);
  }
  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.12);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .speak.playing {
      animation: none;
    }
  }
</style>
