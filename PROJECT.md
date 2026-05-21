# Toxictype

A typing game. Three rows of words always visible, user types through them, rows scroll up as they finish each middle row. Three modes: 30s, 60s, infinite. Sickeningly cute mid-2000s myspace aesthetic with a toxic gamer word list.

## Stack

- Vue 3 + TypeScript
- Vite
- Plain CSS, no UI framework
- No runtime deps beyond Vue
- localStorage for persistence

## Visual direction

Overly cute, sickening, mid-2000s myspace energy. The visual cuteness contrasts with the toxic gamer word list. Don't tone either down.

- Primary font: Comic Sans MS, fallback to Comic Neue
- Light theme (default): hot pink, white, baby pink, lavender accents, tiled background welcome
- Dark theme: dark purple or black background, neon pink and cyan accents
- Decorations welcome: hearts, sparkles, stars, bows, glitter, stickers, garish drop shadows, thick borders, bevel/emboss
- It should look slightly crummy and homemade

## Modes

Mode is chosen on the home screen before each run.

- `30s`: timer counts down from 30s. Saved only when the timer hits 0 naturally.
- `60s`: timer counts down from 60s. Saved only when the timer hits 0 naturally.
- `infinite`: no time limit. Saved when the user presses End (or Esc).

The timer (or run clock for infinite mode) starts on the first keystroke of the first word. Words are shown ahead of time, greyed out, with the clock parked.

A 30s or 60s run that is ended early or restarted is not saved. Partial runs do not count.

## Home screen

- Title (Toxictype) styled big and cute
- Three mode buttons: 30s, 60s, infinite
- Best scores section, separated by mode:
  - 30s: best WPM
  - 60s: best WPM
  - infinite: best peak-30s WPM and best peak-60s WPM (two separate values)
- Theme toggle (cute sun/moon or equivalent)

If no runs exist for a mode, show a placeholder like "no runs yet".

## Typing screen

Layout:
- Top bar: mode indicator, live timer (or elapsed time for infinite), theme toggle
- For infinite mode only, the top bar also shows live peak-30s WPM and live peak-60s WPM, updating in real time
- Three word rows, centered
- Hidden keyboard input (capture on window)
- Bottom controls depending on mode:
  - 30s/60s: Restart button (Tab then Enter) and End button (Esc)
  - Infinite: End button (Esc)

The Restart button can also be clicked directly with the mouse, no chord needed.

Restart in 30s/60s: discards the current run (no save), generates fresh words, parks the clock, waits for the first keystroke. Stays on the typing screen.

End in 30s/60s: discards the current run (no save), returns to home.

End in infinite: saves the run, goes to the stats screen.

## Word source

Hardcoded list in `src/data/words.ts` exported as `string[]`. The dev maintains the list manually.

Entries can be single words ("rage") or short phrases of multiple space-separated words ("uninstall the game"). When a multi-word entry is picked, all of its words are pulled into the typing stream in order, as separate typed words. So "uninstall the game" yields three sequential words and counts as three words when typed.

Comparison is case-insensitive and ignores punctuation. The typed buffer is normalized before comparing against the target word.

No user-facing word list editor.

## Word generation

`nextEntry()` picks a random entry from the list, never the same as the previous one. If the list has only one unique entry, allow repeats. Each picked entry is split on whitespace and the resulting words are appended in order to the word stream.

The "no repeats" rule applies at the entry level, not the word level. After picking "uninstall the game", the next entry just can't be that same entry again.

Maintain a pool of pre-generated words large enough to keep three visible rows plus a buffer.

## Row composition

A row is one visual line. Compose by accumulating words until adding the next would overflow the container width. Use a hidden measurement span or render with flex-wrap and group by `offsetTop`.

Container max-width around 800px, responsive down to viewport.

## Typing rules

- Printable chars: append to active word's typed buffer
- Space: commit active word, advance to next
  - Untyped trailing chars count as missed
  - Word marked correct only if the normalized typed buffer matches the normalized target word (lowercase, punctuation stripped)
- Backspace: remove last char from buffer
  - If buffer empty and previous word had errors: jump back, restore its buffer
  - If buffer empty and previous word was correct: ignore
- Extra chars: typing past word length appends them to the buffer (visible, red)
- Escape: triggers the End button action for the current mode
- Tab (30s/60s only): arms a restart. The very next keystroke decides:
  - If Enter: restart triggers
  - If anything else: the armed state clears and that key is processed normally
  - Tab while already armed: stays armed
  - Show a subtle visual cue while armed (e.g. a hint near the Restart button)
- Enter: ignored unless a restart is armed
- All other non-printable keys: ignore (these also clear the armed state if armed, without triggering anything)
- Window blur does not pause anything

## Char coloring

Active word:
- Correctly typed: theme accent color
- Wrong: red
- Extra: dim red
- Untyped: muted

Completed words:
- All correct: muted foreground
- Any error: red underline

Upcoming words: muted.

Blinking cursor between last typed char and next untyped char of the active word.

## Row scrolling

Trigger: user commits the last word of the middle row.

1. Discard the top row
2. Middle → top slot
3. Bottom → middle slot
4. Generate new bottom row
5. Active word becomes the first word of the new middle row

Optional transition for visual polish.

## Stats tracked during a run

- Start timestamp (set on first keystroke)
- End timestamp
- Per-second sample of cumulative `correctChars` (for rolling window WPM)
- Cumulative counters: `correctChars`, `incorrectChars`, `extraChars`, `missedChars`
- Per-word: `{ word, typed, correct }`

A 1s tick records the current `correctChars` value into a samples array, and (for infinite mode) recomputes the live peak-30s and peak-60s WPMs from those samples.

## Derived stats

- `time`: end - start, seconds
- `wpm`: `(correctChars / 5) / (time / 60)`
- `rawWpm`: `((correct + incorrect + extra) / 5) / (time / 60)`
- `accuracy`: `correct / (correct + incorrect + extra + missed) * 100`
- `consistency`: `100 - (stddev(perSecondWpm) / mean(perSecondWpm) * 100)`, clamped 0-100
- `totalWords`: words committed
- `correctWords`: words committed with no errors

For infinite mode:
- `peakWpm30s`: max WPM across any 30-second rolling window of the run
- `peakWpm60s`: max WPM across any 60-second rolling window of the run

Rolling window calc: for each second T >= window size,
`wpm = (correctCharsAt(T) - correctCharsAt(T - window)) / 5 / (window / 60)`.
Take max across all valid T. If the run is shorter than the window, that peak is undefined.

## Run storage

Every completed run is persisted to localStorage. Key: `toxictype:runs`. Value: JSON array of records.

```ts
type RunRecord = {
  id: string             // crypto.randomUUID()
  timestamp: number      // Date.now()
  mode: '30s' | '60s' | 'infinite'
  duration: number       // actual seconds elapsed
  wpm: number
  rawWpm: number
  accuracy: number
  consistency: number
  correctChars: number
  incorrectChars: number
  extraChars: number
  missedChars: number
  totalWords: number
  correctWords: number
  peakWpm30s?: number    // infinite mode only
  peakWpm60s?: number    // infinite mode only
}
```

Best scores are derived from this array by filtering on mode and picking the max relevant metric. Don't store separate "best" entries.

A run history view will be added later. Design the storage so it can serve that view without recomputation.

## Stats screen (post-run)

Shows the current run's numbers and compares against the best run of the same mode and metric.

For 30s and 60s:
- Current WPM, large and highlighted
- Best WPM for this mode as a separate item
- % diff vs best, e.g. "5% slower than best" or "12% faster than best". If this run is the new best, show "new best" as plain text (richer celebration UI is TBD)
- Accuracy, raw WPM, consistency, characters formatted as `${correct}/${incorrect}/${extra}/${missed}`, total words

For infinite:
- Final WPM and time elapsed
- Peak 30s WPM and peak 60s WPM, each with its own best comparison and % diff
- Same supporting stats as above

Buttons:
- Play again (same mode)
- Back to home

## Theme

Two themes: `light` (default) and `dark`. Toggle visible on both home and typing screens.

Persist choice to localStorage key `toxictype:theme`. On load, read from storage. If unset, default to light. Do not follow system preference.

## State machine

- `home`: mode selection visible
- `idle`: mode chosen, words rendered, clock parked, waiting for first keystroke
- `running`: clock active, accepting input
- `ended`: stats screen shown, run saved

Transitions:
- home → idle: mode selected
- idle → running: first keystroke
- idle → home: End (Esc). No run to save.
- idle → idle: Restart (Tab then Enter, or button click) in 30s/60s. Regenerates words.
- running → ended: 30s/60s timer hits 0, or infinite End (Esc). Run saved.
- running → home: 30s/60s End (Esc). No save.
- running → idle: 30s/60s Restart (Tab then Enter, or button click). No save, fresh words, same mode.
- ended → idle: Play again
- ended → home: Back to home

## Suggested file structure

```
src/
  App.vue
  components/
    HomeScreen.vue
    TypingScreen.vue
    StatsScreen.vue
    WordRow.vue
    ThemeToggle.vue
    BestScores.vue
  composables/
    useTypingState.ts
    useWordPool.ts
    useStats.ts
    useRunStorage.ts
    useTheme.ts
  data/
    words.ts
  styles/
    main.css
    themes.css
  types.ts
main.ts
index.html
```

## Edge cases

- Word list with fewer than 2 unique entries: allow repeats
- Very long single entry: takes a full row, fine
- Pasted text: ignore, listen to keydown only
- 30s/60s ended early or restarted: not saved
- Infinite ended with zero keystrokes: not saved
- Infinite run shorter than 30s: `peakWpm30s` not set on the record, skip its comparison on stats
- Infinite run shorter than 60s: `peakWpm60s` not set on the record, skip its comparison on stats
- localStorage unavailable or corrupt: log, fall back to in-memory state for the session

## Out of scope (for now)

- Run history view (storage is ready, UI later)
- Clear best scores button (later)
- Rich celebration UI for new bests (plain text placeholder for now)
- Sound effects
- Mobile / touch input
- User-editable word lists
