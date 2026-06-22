<script lang="ts">
  import type { ContentDb, Grade } from '$engine/index';
  import type { SessionItem } from '$lib/session/session';
  import ExerciseHost from '$lib/components/exercises/ExerciseHost.svelte';
  import { completeLesson, submitReview } from '$lib/stores/store.svelte';

  let { items, db, onDone }: { items: SessionItem[]; db: ContentDb; onDone: () => void } = $props();

  let i = $state(0);
  const lessonStats = new Map<string, { correct: number; total: number }>();
  const current = $derived(items[i]);

  async function handle(result: { correct: boolean; grade: Grade }) {
    const item = items[i];
    if (item.kind === 'review') {
      await submitReview(item.cardId, result.grade);
    } else {
      const st = lessonStats.get(item.lessonId) ?? { correct: 0, total: 0 };
      st.total += 1;
      if (result.correct) st.correct += 1;
      lessonStats.set(item.lessonId, st);
      if (item.lastOfLesson) {
        await completeLesson(item.lessonId, st.total ? st.correct / st.total : 1);
      }
    }
    if (i + 1 >= items.length) onDone();
    else i += 1;
  }
</script>

<div class="runner">
  <div class="rail" aria-hidden="true">
    <div class="fill" style:width={`${(i / Math.max(1, items.length)) * 100}%`}></div>
  </div>
  {#if current}
    {#key i}
      <ExerciseHost exercise={current.exercise} {db} onComplete={handle} />
    {/key}
  {/if}
</div>

<style>
  .rail {
    height: 6px;
    border-radius: var(--r-pill);
    background: var(--surface-2);
    overflow: hidden;
    margin-bottom: var(--s-4);
  }
  .fill {
    height: 100%;
    background: var(--accent);
    transition: width var(--dur-base) var(--ease);
  }
</style>
