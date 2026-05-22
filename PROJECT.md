# Toxictype word randomizer fix

The current randomizer produces visible duplicates of entries near each other. Replace the picker logic with this.

## Rules

- Track a history queue of the last 10 picked entries (lowercased).
- When picking the next entry from the source list:
  - Lowercase the candidate and compare against every entry in the history queue.
  - If it matches any, re-pick. Try up to 50 times.
  - If all 50 tries fail, accept any random entry and move on. (Won't happen with 150 entries vs a 10-entry history, but it guarantees no infinite loop.)
- When an entry is accepted, push its lowercased form to the history queue. If the queue is now longer than 10, shift the oldest out.

## When to update history

Update history at pick time, NOT at type time. The word pool is pre-generated ahead of the user. Pushing to history only when the user finishes typing means queued-but-not-yet-typed entries are invisible to the dedup check, and you can queue the same entry twice within the buffer.

Every call to the entry picker pushes to history immediately, before the entry is returned to the pool.

## Dedup key

The entry string lowercased. So `"KYS"` and `"kys"` collide. Whitespace and punctuation are not stripped (that's a separate concern for typed-vs-target comparison, which already works).

Entry as a whole, not individual words. `"this is a sentence"` and `"a is a letter"` are different entries and both can appear near each other.

## Pseudocode

```ts
const HISTORY_SIZE = 10
const MAX_RETRIES = 50
const history: string[] = []

function pickEntry(): string {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const candidate = entries[Math.floor(Math.random() * entries.length)]
    if (!history.includes(candidate.toLowerCase())) {
      pushHistory(candidate)
      return candidate
    }
  }
  // fallback, should never hit
  const candidate = entries[Math.floor(Math.random() * entries.length)]
  pushHistory(candidate)
  return candidate
}

function pushHistory(entry: string) {
  history.push(entry.toLowerCase())
  if (history.length > HISTORY_SIZE) history.shift()
}
```

History persists across the run. Reset it when a new run starts.