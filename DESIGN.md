# German A1 Challenge — Design Specification

> Status: **approved-pending** · Authoritative build spec. Confirm before each build phase.
> A static, installable PWA that takes an English speaker through **all of German A1** as a
> finite, beatable, time-boxed challenge benchmarked to Goethe *Start Deutsch 1*.

---

## 0. Locked decisions

| Area | Decision |
|---|---|
| **Stack** | Vite + **Svelte 5 (runes)** SPA + TypeScript `strict`. **Not** SvelteKit. |
| **Hosting** | GitHub Pages, public repo, **custom domain** (CNAME), free forever, **no backend, no paid API**. |
| **Install** | Installable **PWA** (manifest + service worker), offline-capable. |
| **Storage** | **Local-first** (IndexedDB) behind one swappable `PersistencePort` + one-tap **export/import** backup. Google login + **Drive-appData sync is a later, opt-in, drop-in** milestone (M8). Login’s only job is cross-device sync. |
| **Access model** | **Recommend, never gate.** Everything is always unlocked (free-roam module map = the “finish line”). An optional guided **“Today”** plan recommends the ideal next session. |
| **Missed days** | **Smart re-adjust, never punish.** Recap missed material first, then **Smart-auto** rebalance (keep the A1 date if it fits the daily time budget +15%, else recommend the minimum date push). Always overridable. Streak survives; no progress ever destroyed. |
| **Pace model** | Intensity **presets** (Relaxed 10 / Steady 20 / Intense 35 min/day) **and** custom finish date — one engine. A preset derives the date from the budget; a custom date derives the budget from the date. |
| **Skills** | Listening + reading + **structured output**. Seven deterministic exercise types. **No microphone, no free-text essay grading.** |
| **Audio** | Browser **SpeechSynthesis** (`de-DE`), free + on-device, tap-to-hear everywhere. Optional recorded `audioUrl` hook for later. |
| **SRS** | **SM-2** over a single canonical vocab pool. |
| **Vibe** | Clean & minimal, mobile-first, thumb-reachable, smooth transitions. |
| **Payoff** | A faithful *Start Deutsch 1*-style **mock exam** unlocks on schedule completion (previewable any time). |
| **Extensibility** | Engine is **level-agnostic**; adding A2/B1 later = shipping more JSON, zero engine changes. |

---

## 1. Content scope

### 1.1 A1 grammar checklist (strict prerequisite teaching order)
A clean DAG: **pronouns → present tense → sein/haben → articles → cases → modals/separable → word order → Perfekt.**

- **Phase 0 — Survival:** alphabet/sounds/ß/umlauts · numbers 0–1000, prices, phone · personal pronouns.
- **Phase 1 — Verb engine:** present (regular) · sein & haben · W-/yes-no questions (V2 vs verb-first) · stem-changing verbs.
- **Phase 2 — Nouns & nominative:** der/die/das + capitalization · ein/eine + **kein** · plurals (5 patterns) · nominative explicit.
- **Phase 3 — Accusative & possession:** accusative (den/einen) · possessives (nom+akk) · **nicht vs kein** · accusative-taking verbs.
- **Phase 4 — Modality/separable/commands:** modals (Satzklammer) · full modal set · separable verbs · imperative.
- **Phase 5 — Word order/prepositions/time:** V2 consolidated · clock time/days · basic prepositions (lexical) · und/aber/oder/denn.
- **Phase 6 — Past & polish:** intro **Perfekt** (high-freq verbs) · gern/lieber/am liebsten · review/integration nodes.

### 1.2 The 10 thematic modules (~70 lessons)
A “lesson” = one ~8–15 min sittable unit (teach + drills), kept whole and in prereq order by the pace engine. **Modules are a recommended order, not a gate — every node is always reachable.**

| # | Module | Scope | Lessons | Vocab |
|---|---|---|---|---|
| M0 | **Erste Schritte** | alphabet, greetings, “Wie heißt du?”, numbers, countries/languages | 6 | ~55 |
| M1 | **Ich & du** | self/others, sein/haben, jobs, age, questions | 7 | ~70 |
| M2 | **Familie & Freunde** | family, possessives, describing people | 6 | ~60 |
| M3 | **Essen & Trinken** | food, drinks, meals, “Ich hätte gern…”, restaurant, gern | 8 | ~85 |
| M4 | **Einkaufen** | shops, groceries, clothes, prices, kein, möchten | 7 | ~75 |
| M5 | **Wohnen** | rooms, furniture, prepositions of place, “Es gibt…” | 7 | ~70 |
| M6 | **Tagesablauf & Zeit** | clock time, days, daily activities, separable verbs | 8 | ~80 |
| M7 | **Freizeit & Hobbys** | hobbies, sports, weather, plans, full modals | 7 | ~70 |
| M8 | **Unterwegs** | transport, directions, tickets, the city, imperative | 7 | ~65 |
| M9 | **Arbeit, Gesundheit & Alltag** | workplace, body/health, appointments, **Perfekt** intro | 7 | ~70 |

**Totals: 10 modules · ~70 lessons · ~700 vocab slots → trimmed to ~648 net.**

### 1.3 Vocab sizing (~648) & sourcing — original, not copyrighted
We match the official A1 list’s **size and purpose, never its contents.** Pipeline: (1) frequency seed from open corpora (Leipzig CC-BY, SUBTLEX-DE/OpenSubtitles, Wiktionary freq lists) → top ~1,500 lemmas; (2) A1-appropriateness filter; (3) thematic top-up (situational nouns/verbs + all closed-class words); (4) dedupe & cap to ~648, ~50/50 active/passive; (5) German-accuracy review each milestone. **Legal posture (stated in repo):** frequency facts and individual words aren’t copyrightable; our compilation is original. Never copy any official list’s ordering/grouping/set verbatim; never present as official Goethe content. All glosses/examples/IPA project-authored.

### 1.4 Mock exam → deterministic exercise mapping
Verified against the official **Start Deutsch 1 Modellsatz (8. Auflage, Feb 2024)**. **100 pts = 25/skill; pass 60.**

- **Hören** (~20 min, 15 items): Teil 1 (6, 3-option MC, audio ×2) · Teil 2 (4, Richtig/Falsch, audio ×1) · Teil 3 (5, 3-option MC, audio ×2) → `mcq` + audio `match`, **`playCount` per Teil**.
- **Lesen** (~25 min, 15 items): R/F emails, a/b mini-ads, R/F signs → `mcq` (boolean & binary).
- **Schreiben** (~20 min): Teil 1 = fill a form, exactly 5 fields → `cloze` with accepted-variant keys (fully deterministic) · Teil 2 = ~30-word message → **graded** as `drag-tile` assembly of required sentences **+ ungraded free-type self-check pad** with a model answer + checklist.
- **Sprechen** (~15 min): **ungraded self-check** shadowing (7-cue intro, keyword Q&A, picture-card requests) — required-complete for the certificate, contributes **0** to score.
- **Scoring:** gradable = 75 pts → reported as **per-skill subscores + an overall**, with an explicit on-screen caveat that the mock **excludes the human-graded speaking score and is not a pass prediction.**

---

## 2. Data schema

### 2.1 The one rule: CONTENT and PROGRESS are two universes
| | **CONTENT** (shippable, immutable) | **PROGRESS/SRS** (per-user, mutable) |
|---|---|---|
| Where | `public/content/**` JSON, SW-cached | IndexedDB (later: synced JSON to user’s Drive) |
| Writes | authors, build-time | the app, runtime |
| Identity | stable string IDs | records keyed **by content ID only** |
| Versioning | `schemaVersion` + `contentVersion` (hash) | `updatedAt` (epoch ms) per record |

**Progress never embeds content** — a record is `{ contentId, state, srsFields, updatedAt }`, no German text. Re-shipping corrected content never migrates user data.

### 2.2 File / manifest layout (manifest-first + per-module lazy + single vocab pool + image assets)
```
public/content/
  manifest.json                 # small index: versions + per-level pointers + counts/time-estimates
  levels/ a1.json               # moduleOrder + module pointers + level-agnostic grammarTopics (g.*)
          a1.grammar.json       # gn.* grammar notes (authored once, attached to many lessons)
  modules/ a1.m00-erste-schritte.json ...   # lessons + exercises INLINE (~30–60KB each)
  vocab/   a1.vocab.json         # the canonical ~648-entry pool — the ONLY home of German words
  img/     a1/<slug>.svg         # ORIGINAL SVG/emoji-style pictographs (match type, Hören Teil 1, Sprechen)
  exam/    a1.mock.json          # SD1 mock item bank (sections + playCount + keys)
```
- **Manifest-first** = instant boot: render module map + Today plan from counts/IDs/time-estimates without downloading exercise bodies.
- **Per-module** = a typo fix invalidates one file, not all of A1.
- **Single vocab pool** referenced by `vocabId` → `der Tisch` authored once; SRS schedules the vocab item, not copies.
- **Levels file is the A2/B1 seam:** drop `levels/a2.json` + `modules/a2.*` + `vocab/a2.vocab.json` + one manifest line. Zero engine code.
- **Images** *(review fix #3)*: original SVG/emoji-style pictographs (zero licensing risk, tiny, on-brand). Asset manifest + SW **CacheFirst** route + a content-lint for any `img` referenced by `match`/exam items. Licensing posture stated alongside text/audio.

### 2.3 ID scheme (stable, namespaced, immutable)
`level.type+localslug`, lowercase ASCII, never reused. Level prefix on everything (`a1.…`) so A2 can’t collide and cross-level progress is a flat union. `NN` is for filenames/sorting only — real order lives in `order` fields + `moduleOrder` arrays, so you reorder/insert without renaming IDs (renaming would orphan progress). Retire content via `"status":"deprecated"`, never delete.

Examples: module `a1.m02-familie` · lesson `a1.m02-familie.l02-possessives` · exercise `…l02-possessives.e04` · vocab `a1.v.vater` · grammar topic `g.accusative` (level-agnostic) · grammar note `gn.possessives-nom`.

### 2.4 The unified Exercise type (discriminated union; `type` is the sole engine dispatch)
Seven types, closed for A1. Adding a type is the **only** thing that touches engine code (one renderer arm + one checker arm; the `switch` is exhaustive so TS errors on a missing arm).

```ts
type ExerciseType = "gender-tap" | "drag-tile" | "cloze" | "conjugate" | "match" | "dictation" | "mcq";

interface ExerciseBase {
  id: string;
  type: ExerciseType;
  skill: "listening" | "reading" | "output";
  estSeconds: number;
  prompt?: { de?: string; en?: string };
  vocabRefs: string[];          // REQUIRED SRS fan-out contract — every checkable-vocab type populates this (fix #7)
  explainRef?: string | null;   // grammar-note id to reveal on a wrong answer
  source?: "auto" | "template" | "hand";
  audioOnReveal?: boolean;
  playCount?: number;           // mock-exam replay limit (Hören Teil 1/3 = 2, Teil 2 = 1)
}
type Exercise = GenderTap | DragTile | Cloze | Conjugate | Match | Dictation | Mcq;
```

**Single source of truth for German = the vocab pool.** Types that test a vocab fact (gender, conjugation) carry **no inline answer** — the answer is derived from the referenced vocab entry, so a German fix propagates everywhere. Only cloze connective text, hand-built tiles, dictation text, and MCQ stems/passages carry inline German (inherently sentence-level). A CI lint flags any inline string equal to a vocab lemma.

**Deterministic check per type** (no fuzzy grader, ever):
1. **gender-tap** — `tapped === vocab.article` (answer derived; caps at `good` — 1-of-3 guess floor).
2. **drag-tile** — exact ordered token array vs any `accepted[]` ordering. *(fix #8)* the **sentence-initial tile is compared case-insensitively** (or per-tile `caseFlexible`) so legitimate reorderings that flip capitalization aren’t false negatives; lint asserts every `accepted[]` sequence is constructible from the tile pool and no distractor appears in an accepted sequence.
3. **cloze** — each blank normalized independently (trim/collapse; case-insensitive unless flagged; umlaut-lenient only on early typed cloze); all must pass. `reject[]` *(fix #15)* drives a **targeted near-miss hint** (e.g. matched `meinen` → “watch the case ending”), not just a wrong mark — schema and checker kept in lockstep.
4. **conjugate** — answer derived from `vocab.verbMeta`. *(fix #6)* `verbMeta` extended with `imperative {du,ihr,Sie}` and `auxiliary`+`partizip2`; the type’s mood enum = `praesens | imperativ`. **Perfekt production** is drilled via `drag-tile`/`cloze` with hand keys (lint ensures those grammar topics have coverage).
5. **match** — each id must map to itself; `wrongRefs` lets SRS down-grade only mis-paired cards. *(fix #16)* lint forbids duplicate gloss/image/audio targets within one set (no false negatives from synonyms).
6. **dictation** — normalized whole-string equality; punctuation stripped; **umlauts graded strict** (the point is hearing them); per-token diff for feedback.
7. **mcq** — `chosenId === correctChoiceId` (shuffled at render, graded by stable id). Covers reading, translation, R/F, and listening (`playCount`).

```ts
function checkExercise(ex, resp, db): Verdict {
  switch (ex.type) {
    case "gender-tap": return checkGenderTap(ex, resp.option, db);
    case "drag-tile":  return checkDragTile(ex, resp.placed);
    case "cloze":      return checkCloze(ex, resp.inputs);
    case "conjugate":  return checkConjugate(ex, resp.text, db);
    case "match":      return checkMatch(ex, resp.pairing);
    case "dictation":  return checkDictation(ex, resp.text);
    case "mcq":        return checkMcq(ex, resp.choiceId);
  } // TS error if a new type is unhandled
}
```
A single declared normalizer (`norm`) applies per-item options only — **no Levenshtein-as-grader.** Default: case-sensitive for nouns & dictation (German capitalizes nouns), case-insensitive for verbs/function words; umlauts graded (opt-in lenient per early typed cloze).

### 2.5 Vocab entry (the canonical German source)
```jsonc
{ "id":"a1.v.vater","lemma":"Vater","pos":"noun","gender":"m","article":"der","plural":"Väter",
  "gloss":["father","dad"], "example":{"de":"Mein Vater kommt aus Berlin.","en":"My father is from Berlin."},
  "ipa":"ˈfaːtɐ","audioUrl":null,"audioText":"der Vater, die Väter","frequencyRank":118,
  "tags":["family","people"],"introducedIn":"a1.m02-familie.l01-family-words","cefr":"a1","status":"active" }
```
Verb entry powers `conjugate` + Perfekt/imperative from data:
```jsonc
{ "id":"a1.v.kommen","lemma":"kommen","pos":"verb","gloss":["to come"],
  "verbMeta":{ "type":"regular","separable":false,"auxiliary":"sein",
    "present":{"ich":"komme","du":"kommst","er":"kommt","wir":"kommen","ihr":"kommt","sie":"kommen"},
    "imperative":{"du":"komm","ihr":"kommt","Sie":"kommen Sie"}, "partizip2":"gekommen" },
  "example":{"de":"Ich komme aus England.","en":"I come from England."},"frequencyRank":41,"cefr":"a1","status":"active" }
```
Schema is sparse, not padded (gender/plural/verbMeta only when applicable).

### 2.6 Progress / SRS persisted shapes (IDs + state + `updatedAt` only)
```jsonc
// srs card (one per vocab atom) — note dueDayKey starts at todayKey+1 (fix #5)
{ "id":"a1.v.vater","kind":"vocab","easiness":2.5,"intervalDays":6,"repetitions":4,"lapses":1,
  "dueDayKey":"2026-06-27","state":"review","lastGrade":4,"updatedAt":1718950000000 }
// lessonProgress
{ "id":"a1.m02-familie.l02-possessives","status":"done","bestScore":0.9,"completedAt":1718950000000,"attempts":2,"updatedAt":... }
// dayLog (fix #4: first-class, exported & synced)
{ "dayKey":"2026-06-21","recommendedNew":2,"doneNew":2,"recommendedReviews":14,"doneReviews":14,
  "estMinPlanned":18,"actualMinSpent":17,"updatedAt":... }
// plan (the single pace record — pace intent lives ONLY here, fix #10)
{ "mode":"preset","presetId":"steady","dailyTimeBudgetMin":20,"hardCapMin":60,
  "targetDayKey":"2026-09-15","startDayKey":"2026-06-01",
  "streakCount":12,"bestStreak":20,"lastActiveDayKey":"2026-06-21","frozenDays":[],"pausedAt":null,
  "totalNewLessonsAtStart":70,"contentVersionSeen":"2026.06.21-a1.1","updatedAt":... }
```

---

## 3. Architecture

### 3.1 Stack calls
| Decision | Choice | Why |
|---|---|---|
| Framework | **Vite + Svelte 5 SPA** (not SvelteKit) | no SSR/endpoints; smaller, simpler static shell |
| Router | **hash router** (`svelte-spa-router`), `base:'/'` | a custom-domain GH Pages is a dumb static host; hash routing resolves every deep link to `index.html` with zero server config and is exactly what an offline SW fallback wants |
| State | **Svelte 5 runes** in `.svelte.ts` modules | fine-grained reactivity; the only place engine ⇄ persistence ⇄ UI meet |
| Storage | swappable `PersistencePort` (IndexedDB now, Drive later) | engine/UI never import a storage concrete |
| Audio | `SpeechSynthesis` (`de-DE`) in one service | free, on-device; `audioUrl` escape hatch |
| Validation | **zod** parse at content load | catch a bad JSON ship before runtime |

### 3.2 Folder tree
```
index.html · vite.config.ts (base:'/') · tsconfig (strict; aliases) · CNAME · .github/workflows/deploy.yml
public/  CNAME · icons/ · manifest.webmanifest · content/ (see §2.2)
tools/   gen-exercises.ts (build-time auto/template generator) · lint-content.ts (CI content lint)
src/
  main.ts · App.svelte (Router + bottom Tabbar) · app.css
  lib/
    engine/        ◆ PURE: no DOM, no storage, no svelte, no Date.now ◆
      types · srs · planner · quota · forecast · pace · catchup · prereq · grading · time · index
    content/       manifest · loader (lazy, memoized) · schema (zod) · index
    persistence/   ◆ swappable storage boundary ◆  (see §4)
    stores/        settings · progress · srs · plan · session (runes) · persist (debounced)
    audio/tts.ts · design/(tokens.css, tokens.ts)
    components/ui/ + ModuleMap + PaceMeter + exercises/(7 components + ExerciseHost)
  routes/  Today · Browse · Module · Lesson · Review · Vocab · Stats · Settings · Onboarding · WelcomeBack · MockExam · NotFound
```
**Dependency rule (enforced by eslint-plugin-boundaries + a CI grep gate):** `routes/components → stores → { engine, content, persistence, audio }`; `engine/content/persistence → engine/types only`. The engine is `npm test`-able headless with an injected `today`.

### 3.3 GitHub Pages / custom domain
`base:'/'` (custom domain serves from root) · `CNAME` in `/public` → emitted to `dist/` · deploy via GitHub Actions (“Pages → Build from Actions”): `npm ci && npm run build` → `actions/deploy-pages`. **No `404.html`** (hash router). Switching to clean URLs later = add a `dist/404.html = index.html` step, localized behind the route table.

### 3.4 Free-roam + guided coexistence (recommend, never gate)
Both views are **read-only projections** of the same two sources (content + progress). **Browse** lists every module/lesson, each badged `done / started / recommended-today / not-yet`, but **every row is a live link — no locks.** **Today** = `recommendToday(...)` rendered as a session; its “Start” buttons route to the *same* `Lesson`/`Review` screens Browse uses. Completing a lesson from either entry writes the same record → **one write path, two read views.** The module map (serpentine, ending in the always-rendered 🏁 mock-exam node) is one tap away on the bottom bar as the persistent finish line.

### 3.5 Service worker + PWA (install + offline)
`vite-plugin-pwa` (Workbox `generateSW`): **precache app shell**; **navigation fallback → `index.html`** (hash router makes any nav resolve offline); **content JSON runtime cache** `content-v{contentVersion}` (StaleWhileRevalidate); **images** CacheFirst; `registerType:'prompt'` → “Update available” toast (never yank mid-lesson). *(fix #12)* an **activate-time cleanup deletes `content-v*` caches other than the current version** (no unbounded bloat), and the **`contentVersion` is pinned for the duration of a session** so content can’t swap between lazy module loads mid-lesson. Manifest: `name`, icons (192/512/maskable), `start_url:'/#/today'`, `display:'standalone'`. Installability met on HTTPS custom domain.

---

## 4. Persistence & sync

### 4.1 `PersistencePort` — the only storage type engine/UI know
```ts
interface PersistencePort {
  init(): Promise<void>;
  load(): Promise<AppState>;
  save(s: AppState): Promise<void>;
  patch(mutate: (draft: AppState) => void): Promise<AppState>;   // HOT PATH (every grade / completion)
  exportBackup(): Promise<BackupFile>;
  importBackup(file: unknown, opts?: { strategy:"replace"|"merge" }): Promise<ImportResult>;
  sync(): Promise<SyncResult>;                                   // no-op on local-only (returns {kind:"local-only"})
  getSyncStatus(): SyncStatus;
  onSyncStatusChange(cb:(s:SyncStatus)=>void): () => void;
  connectCloud?(): Promise<void>; disconnectCloud?(): Promise<void>;
  clearLocal(): Promise<void>;
}
```
`sync()` and a status indicator exist from day one (local-only reports “On this device”) so **no UI rewrite when Drive ships.** The composition root is the only file naming a concrete:
```ts
export function createPersistence(): PersistencePort {
  const local = new IndexedDbStore();
  if (import.meta.env.VITE_DRIVE_SYNC === "on") return new DriveSyncStore(local); // drop-in decorator
  return local;
}
```

### 4.2 `AppState` (one logical document; content-only)
`{ version, updatedAt, deviceId, progress{lessons,totals}, srs{algo,cards}, dayLog{}, settings{tts,theme}, plan(PacePlan), }`.
*(fix #4)* **`dayLog` is a first-class slice** — in `AppState`, the backup envelope, and an IndexedDB store. *(fix #10)* **pace intent lives only in `plan`**; `settings` holds TTS/theme only.

### 4.3 Local-first IndexedDB
Object stores (DB `german-a1`): `meta` (root+sync) · `lessons` · `srs` (+ index **`by_dueDayKey`** for the Today query) · `dayLog` (+ index by `dayKey`) · `kv` (settings, plan, totals). `patch()` writes only changed stores in one rw transaction. **Two version axes:** `APP_STATE_VERSION` (logical shape; pure forward-only `vN→vN+1` migrations that travel inside backups/sync) and the IDB DB version (physical layout). Why IndexedDB over localStorage: async/off-thread, large capacity, partial+transactional writes, indexes.

### 4.4 Versioned export/import backup (always available, no account)
A checksummed self-describing envelope (`format:"german-a1-backup"`, `backupVersion`, `state:AppState`, `checksum`). Import flow: parse → magic check → checksum (mismatch warns) → migrate → validate → **merge** → save. **Merge = “best-of, never downgrade”:** lesson status keeps the more-advanced (done>in_progress>unseen, tie→higher score); srs keeps the card with later **ms-granular `updatedAt`** *(fix #9)*; streak recomputed from the merged `dayLog`/activity rather than blindly field-maxing *(fix #9)*; settings/plan = whole-slice by larger `updatedAt`; unknown content IDs kept (counted as warnings). *(fix #17)* the explicit `replace` strategy **warns if the backup is older than current data** before overwriting.

### 4.5 LATER (M8): Google Drive sync as a drop-in decorator
`DriveSyncStore` **wraps** `IndexedDbStore` (IDB stays the offline source of truth + cache). Auth = Google Identity Services token flow, **no backend**: public OAuth client id, authorized JS origins whitelisted, scope **`drive.appdata` only** (per-app hidden folder). One fixed `state.json` in `appDataFolder` via plain `fetch` on `/drive/v3`; mirror `state.updatedAt` into `appProperties` to compare without downloading. `sync()`: fast-forward pull/push when one side changed; on a **true conflict**, field-level merge for the *accumulating* slices (srs/progress/streak/dayLog, tie-break on **ms `updatedAt`**) and whole-slice LWW for the single-coherent-intent `plan`; a genuinely ambiguous plan-date conflict raises a one-time “keep this device’s date / use the other” prompt. Push debounced; pull on foreground. **Honest caveat surfaced in-app:** `drive.appdata` is a sensitive scope → a one-time “unverified app” screen until free verification; testing mode allows 100 users. The app is **fully usable forever without ever connecting Drive.** CI grep gate proves deleting `DriveSyncStore.ts` leaves a working local-first app.

---

## 5. Engine (pure recommender — recommends, never locks)

No `Date.now`/`window`/IO inside the engine — the caller passes `todayKey` + state; same inputs → same outputs (deterministic, no randomness in v1). This is what makes A2/B1 “ship more JSON” and the engine headless-testable/time-travelable.

### 5.1 SM-2 SRS
A “day” = the learner’s **local** calendar day (`dayKey="YYYY-MM-DD"`); due = `dueDayKey <= todayKey`. One card = one vocab item. New-card defaults `easiness 2.5, interval 0, reps 0`. **Entering the deck:** completing a lesson sets its `introducesVocab` cards to `learning` with **`dueDayKey = todayKey+1`** *(fix #5 — drilled today inside the lesson, first review tomorrow; no same-day double-count, no redundant immediate re-review).* Grading is **inferred** (never a self-rating prompt) from correctness + first-try + latency + hint-use → `again|hard|good|easy` → SM-2 0–5, with per-type ceilings (gender-tap/mcq/dictation cap at `good`; match graded per-card via `wrongRefs`; recall-mode cloze/conjugate/drag-tile get the full range). Faithful SM-2 interval/EF update; **overdue bonus** on late successes; **leech** (`lapses≥8`) surfaced softly, never auto-suspended; **deprecated-content cards auto-suspended** so retired vocab can’t become zombie due cards *(fix #13)*.

### 5.2 Pace recommender (presets AND custom date, one path)
Presets fix the budget (Relaxed 10 / Steady 20 / Intense 35), `hardCapMin=60`. A preset derives the date; a custom date derives the budget. Both share one day-by-day simulation (do due reviews first, then fit whole lessons in prereq order within the remaining budget, advance the simulated deck, repeat). `deriveDateFromBudget(b)` → finish day; *(fix #14)* `deriveBudgetFromDate(d)` = **smallest budget whose simulated finish ≤ target** (monotonic, always well-defined).

```
recommendToday(plan, cards, content, todayKey):
  due       = nonSuspended, non-deprecated, state∈{learning,review}, dueDayKey<=todayKey, mostOverdue first
  reviewMin = min(due.length, maxReviewsToday) * reviewMinPerCard      # (fix #1) reviews CAN be capped
  budget    = effectiveDailyBudget(plan, todayKey)                     # 0 if paused
  newBudget = max(0, budget - reviewMin)
  remaining = content.lessonsNotDone(prereqOrder=true)
  idealPerDay = remaining.length / max(1, activeDaysBetween(todayKey, plan.targetDayKey))
  target = clamp(round(idealPerDay), 0, floor(newBudget / avgLessonMin))
  if target==0 && capacity>=1 && isBehind(plan): target = 1           # nudge when behind, never stall
  return { reviews: due.slice(0, maxReviewsToday), newLessons: remaining.take(target),
           overflowReviews: due.slice(maxReviewsToday), estMin: reviewMin + newLessonsMin }
```
*(fix #1 — the overdue-pileup reconciliation):* reviews are **capped per day to `maxReviewMin`** and overflow is **rescheduled forward** (its `dueDayKey` bumped a day), so a 30-day pause’s 200 overdue cards drain over several days **under the time budget** instead of dumping at once. This makes the Today queue and the recap’s gentle subset describe the **same bounded queue** (revised AC1: *all due reviews up to the daily review cap; overflow rescheduled forward, never dropped*).

**Pace status** (ahead/on-track/behind) is measured on **new lessons** (the finite beatable quantity) vs an ideal cumulative curve, ±0.5 lesson-day threshold to avoid flicker, paused days excluded. Display-only; never gates.

### 5.3 Smart-auto catch-up (missed days)
On open, if `lastActiveDayKey < yesterday` and not paused: compute `lessonsBehind`; project the worst upcoming day’s minutes if the deficit is re-spread; **if worst day ≤ `dailyTimeBudgetMin × 1.15` → RESPREAD (keep the A1 date)**, else **PUSH by the minimum days** whose worst day falls under the cap. The recommendation is **presented, never applied silently** — “Keep my date / cram” and “Push my date” are one tap, default = the recommendation, doing nothing destroys nothing. **Recap** resurfaces the last pre-gap atoms + most-overdue reviews first (capped to `budget × RECAP_FRACTION`; remainder drains via §5.2’s forward-rescheduling).

### 5.4 Goal-date-elapsed branch *(fix #2)*
On open, if `targetDayKey < todayKey` with lessons remaining, surface the **same reschedule/push prompt** as catch-up (never silently cram everything every day). Dedicated engine AC.

### 5.5 Streak / pause / reschedule
A missed day **never** zeroes the streak — it pauses (doesn’t grow) and resumes; “activity” = any completed review/lesson **or any free-roam exercise**. **Pause/sick-day** freezes streak + countdown (`effectiveDailyBudget`→0, paused days excluded from pace, gap bridged for streak); resume auto-shifts the target by paused active-days and announces it. **Reschedule** reuses the derive functions; never touches SRS cards or completed lessons. **Custom-date too-aggressive** check warns (“that date needs ~X min/day; earliest comfortable is Y”) but **never blocks**.

### 5.6 Tunables (one self-calibrating config)
`reviewMinPerCard≈0.25` (EMA-recalibrated from `dayLog.actualMinSpent`), `maxReviewMin` (the per-day review cap), `DEFAULT_LESSON_MIN=6`, `SPREAD_TOLERANCE=1.15`, `RECAP_FRACTION=0.5`, `LEECH_LAPSES=8`, `assumedPassRate≈0.85`, `hardCapMin=60`.

---

## 6. Exercise & UX

**Shared frame:** read-only content up top (~40%), interactive answer zone in the bottom ~60% (thumb arc), a sticky action bar that morphs **Check → Continue** (never auto-advance). **`<SpeakChip>`** (🔊, ≥40px) wherever German renders → `de-DE` TTS at rate 0.9, degrades gracefully if no de-DE voice (audio-required exercises substitute a reading variant). **Verdict feedback:** correct → calm **success green** + light haptic + auto-speak; incorrect → **amber, never red-shaming** + a reveal panel (correct answer + 🔊 + gloss + one-line grammar note) + optional “Try again”.

**Session loop (5–10 min):** intro → per-new-lesson teach (concept card → guided first-touch) → interleaved micro-practice (never 2 of a type back-to-back; never 3 cards on one atom in a row; alternate input-heavy with tap-light) → quick check → light celebration + streak + module-map dot fill. **Pause-safe:** checkpointed to IndexedDB after every card; reopening offers “Resume session”. Free-roam uses the same runner labeled “Practice” (grades still feed SRS; doesn’t tick the daily-quota dot).

**Dashboard:** greeting + streak · **countdown card** (A1 date + pace pill ahead/on-track/**behind→amber, taps to rebalance** + a you-vs-ideal sparkline) · **Today card = the carrot** (biggest CTA, time + new/review split) · **module map = free-roam + finish line** (serpentine, every node tappable, ▸ marks recommended-next, 🏁 always rendered).

**Welcome-back screen:** “you were away N days — streak safe, nothing lost” → **recap-first** offer → **smart-auto rebalance** (recommended option pre-selected, override one tap) → runs the recap queue. Pause/sick-day variant skips guilt entirely.

**Mock exam mode** *(fix #11)*: suppresses the global SpeakChip and routes all audio through a **play-counter enforcing `playCount`** (Teil 2 truly “once”); **hard-checks `hasGermanVoice` before the graded mock** and blocks/strongly-warns if absent (a listening exam can’t be validly administered without a voice).

**Navigation:** a 3-item **bottom bar** (Today · Map · You), each ≥48px in the thumb arc with safe-area padding; the bar hides inside a session; exit ✕ is top-right (out of the thumb arc) and always offers “save & resume”.

**Design tokens (no web-font fetch):** semantic light/dark color (one brand blue `--accent #2E5BFF`; **`--warn` is calm amber, not red** — the no-punish ethos in color; reveal-only der/die/das mnemonic, off by default), 4px spacing scale, system-font type with a dedicated larger `--t-german` for clear ä/ö/ü/ß, radii/elevation, reduced-motion-aware motion. WCAG AA throughout; color is never the only signal (icon + `aria-live` verdict); real `<button>`/`<input>`; rem type respects OS scaling; no visible timers.

---

## 7. Milestone plan (confirm before each)

| ID | Milestone | Goal (acceptance summary) |
|---|---|---|
| **M1** | **Scaffold + PWA shell** | Static installable offline shell on GH Pages + custom domain; hash router, bottom tabs, token system, PWA manifest/SW, CI deploy, engine/persistence boundary gates. *Accept:* deep-link cold-load works; Lighthouse “installable” passes; launches offline after first load; dark mode is a token swap. |
| **M2** | **Core pure engine + types** | Level-agnostic, side-effect-free engine (SRS, planner, recommender w/ review cap, pace, catch-up, goal-elapsed, grading) + Vitest with injected `today`. *Accept:* zero svelte/idb/DOM/Date.now imports; engine ACs pass (incl. revised AC1 review-cap, goal-elapsed, no-double-count, streak-never-zero); exhaustive checker switch. |
| **M3** | **Content schema + persistence + sample content** | zod schema, `PersistencePort` + IndexedDB (incl. `dayLog`) + MemoryStore + versioned backup/merge/migrations, one fully-authored sample module wired end-to-end. *Accept:* load→recommend→persist→reload; MemoryStore swap touches nothing outside `persistence/`; backup round-trips & never downgrades; `lint-content` fails on each violation class. |
| **M4** | **Exercise components + session runner** | All 7 deterministic exercise components + shared frame + SpeakChip + Verdict feedback + SessionRunner (guided + free-roam, checkpoint/resume). *Accept:* each grades via the engine; same lesson from Browse vs Today writes identically; mid-session close loses nothing; audio-required types degrade to reading without a voice. |
| **M5** | **Pace+SRS wired into UI** | Onboarding (preset OR custom date, too-aggressive warning), dashboard + module map + pace pill, Browse free-roam, smart welcome-back/catch-up, pause/reschedule. *Accept:* over-cap date warns w/ earliest-comfortable suggestion; missed-days → recap + smart-auto + override; pause shifts date; **every node always reachable**. |
| **M6** | **Full A1 content + SD1 mock exam** | All 10 modules (~70 lessons), ~648 original vocab, full grammar notes, deterministic mock exam — German-accuracy review each module. *Accept:* full path completable; manifest counts match; mock replicates official structure (item counts, R/F vs MC, play-counts) + per-skill subscores + honest caveat; no copyrighted list verbatim. |
| **M7** | **Polish, a11y, offline hardening** | View transitions, full a11y pass, content runtime caching + eviction + update prompt, perf budget, leech list, streak calendar. *Accept:* fully usable offline after first visit; keyboard-only + reduced-motion complete a session; no jank on mid-range mobile. |
| **M8** | **LATER: Google Drive sync (opt-in)** | `DriveSyncStore` decorator + GIS auth + Drive REST + conflict merge + in-app verification explainer + sync indicator. *Accept:* deleting it leaves a working local-first app; offline-with-cloud still works; two-device different-card edits merge losslessly; engine/UI keep zero storage-concrete refs. |

---

## 8. Risks (eyes-open)
1. **Content authoring is the long pole** — ~70 lessons + ~648 vocab + grammar + mock exam, and German accuracy gates quality. Generators zero-author ~4 of 7 exercise types; reading-MCQ, sentence-build, sentence-dictation are hand-written. Budget real reviewer time.
2. **TTS quality/availability varies** by browser/OS; dictation/audio-match depend on a `de-DE` voice. Mitigations built in (degrade to reading, optional recorded `audioUrl`), but voiceless browsers get a degraded listening experience.
3. **Deterministic Schreiben Teil 2 is an honest compromise** — we grade structured build + form fields, not free production; stated plainly on results.
4. **Drive verification / “unverified app” screen** — free but paperwork + a UX wart; hence M8, opt-in, drop-in. Confirm you’re fine shipping without sync for a long time.
5. **SRS time-flatness depends on tunables** that self-calibrate via EMA but are guesses early; first users get rougher pacing.
6. **Hash-URL trade-off** — bulletproof on static hosting + offline, at the cost of clean/shareable URLs (switchable later).

---

## 9. Design-review fixes folded in
All 5 high + 8 medium + 5 low findings from the adversarial review are resolved in this spec: review-cap + forward-reschedule for overdue pileup (1) · goal-date-elapsed branch (2) · original-SVG image pipeline + lint + licensing (3) · first-class `dayLog` (4) · new-card `dueDayKey=+1` no double-count (5) · `verbMeta` imperative/aux + Perfekt via tiles (6) · canonical required `vocabRefs` SRS contract (7) · case-flexible sentence-initial tile (8) · ms-granular merge tie-break + dayLog-derived streak (9) · pace intent in `plan` only (10) · exam-mode playCount enforcement + voice hard-check (11) · content-cache eviction + session version pin (12) · auto-suspend deprecated-content cards (13) · monotonic `deriveBudgetFromDate` (14) · `reject[]` targeted-hint (15) · match-set uniqueness lint (16) · per-skill subscores + older-backup-replace warning (17).
