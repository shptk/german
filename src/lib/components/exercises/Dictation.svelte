<script lang="ts">
  import type { Dictation, Response, Verdict } from '$engine/index';
  import UmlautBar from '$lib/components/ui/UmlautBar.svelte';
  import { app } from '$lib/stores/store.svelte';
  import { hasGermanVoice, speak } from '$lib/audio/tts';

  let {
    exercise,
    locked,
    verdict,
    onResponse,
  }: { exercise: Dictation; locked: boolean; verdict: Verdict | null; onResponse: (r: Response) => void } = $props();

  const voice = hasGermanVoice();
  let value = $state('');
  function set(v: string) {
    value = v;
    onResponse({ text: v });
  }
  function play(rate: number) {
    speak(exercise.audioText, { rate, voiceURI: app.state?.settings.ttsVoiceURI });
  }
</script>

{#if voice}
  <div class="players">
    <button class="play" type="button" onclick={() => play(0.9)}>▶ Play</button>
    <button class="slow" type="button" onclick={() => play(0.6)}>🐢 Slower</button>
  </div>
{:else}
  <p class="fallback">No German voice here — read it, then type it:</p>
  <p class="lang-de read">{exercise.audioText}</p>
{/if}

<input
  class="field lang-de"
  class:ok={locked && verdict?.correct}
  class:bad={locked && verdict && !verdict.correct}
  value={value}
  disabled={locked}
  oninput={(e) => set(e.currentTarget.value)}
  autocomplete="off"
  autocapitalize="sentences"
  spellcheck="false"
  placeholder="Type what you hear…"
/>
{#if !locked}<UmlautBar onInsert={(c) => set(value + c)} />{/if}

<style>
  .players {
    display: flex;
    gap: var(--s-3);
    justify-content: center;
    margin: var(--s-5) 0;
  }
  .play,
  .slow {
    min-height: 48px;
    padding: 0 var(--s-5);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--accent-weak);
    color: var(--accent);
    font: var(--t-h2);
  }
  .fallback {
    color: var(--text-muted);
    font: var(--t-small);
    margin: var(--s-3) 0 var(--s-1);
  }
  .read {
    margin: 0 0 var(--s-4);
  }
  .field {
    width: 100%;
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
  }
  .field.ok {
    border-color: var(--success);
  }
  .field.bad {
    border-color: var(--warn);
  }
</style>
