<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import type { Mode, WordStats } from '../types';

const props = defineProps<{
  mode: Mode;
  words: string[];
  currentWordIndex: number;
  typedBuffer: string;
  wordHistory: WordStats[];
  currentTime: number;
  timeLeft: number;
  isRestartArmed: boolean;
  liveWpm: number;
  livePeak30?: number;
  livePeak60?: number;
  onKeydown: (e: KeyboardEvent) => void;
  onRestart: () => void;
  onEnd: () => void;
}>();

const measurementRef = ref<HTMLElement | null>(null);

const rows = ref<{ start: number, end: number }[]>([]);

const updateRows = () => {
  if (!measurementRef.value) return;
  const wordEls = measurementRef.value.querySelectorAll('.word');
  if (wordEls.length === 0) return;

  const newRows: { start: number, end: number }[] = [];
  let currentRowStart = 0;
  let lastOffsetTop = (wordEls[0] as HTMLElement).offsetTop;

  for (let i = 1; i < wordEls.length; i++) {
    const el = wordEls[i] as HTMLElement;
    if (el.offsetTop > lastOffsetTop) {
      newRows.push({ start: currentRowStart, end: i - 1 });
      currentRowStart = i;
      lastOffsetTop = el.offsetTop;
    }
  }
  newRows.push({ start: currentRowStart, end: wordEls.length - 1 });
  rows.value = newRows;
};

// Find which row the current word is in
const activeRowIndex = computed(() => {
  return rows.value.findIndex(row => props.currentWordIndex >= row.start && props.currentWordIndex <= row.end);
});

// We want to show the current row as the "middle" row if possible.
const displayRows = computed(() => {
  if (rows.value.length === 0) return [];
  const idx = activeRowIndex.value;
  
  // If we are on row 0, show rows 0, 1, 2
  // If we are on row N > 0, show rows N-1, N, N+1
  const start = Math.max(0, idx - 1);
  return rows.value.slice(start, start + 3);
});

onMounted(() => {
  window.addEventListener('keydown', props.onKeydown);
  // Need to wait for DOM to render the measurement div
  nextTick(updateRows);
  window.addEventListener('resize', updateRows);
});

onUnmounted(() => {
  window.removeEventListener('keydown', props.onKeydown);
  window.removeEventListener('resize', updateRows);
});

watch(() => props.currentWordIndex, () => {
  nextTick(updateRows);
});

watch(() => props.words.length, () => {
  nextTick(updateRows);
});

// Trigger update on buffer change in case extra chars wrap the line
watch(() => props.typedBuffer, () => {
  nextTick(updateRows);
});

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
</script>

<template>
  <div class="typing-screen toxic-border">
    <div class="top-bar">
      <div class="mode-info">
        <span class="mode-tag">{{ mode }}</span>
        <span class="timer">{{ mode === 'infinite' ? formatTime(currentTime) : timeLeft + 's' }}</span>
      </div>
      <div v-if="mode === 'infinite'" class="live-stats">
        <span>Peak30: {{ livePeak30 ? Math.round(livePeak30) : '-' }}</span>
        <span>Peak60: {{ livePeak60 ? Math.round(livePeak60) : '-' }}</span>
      </div>
    </div>

    <div class="word-container">
      <!-- Hidden measurement div -->
      <div class="measurement-area" ref="measurementRef" aria-hidden="true">
        <span 
          v-for="(word, wIdx) in words" 
          :key="wIdx" 
          class="word"
          :class="{ 'active': wIdx === currentWordIndex }"
        >
          <template v-if="wIdx === currentWordIndex">
            {{ typedBuffer.length > word.length ? typedBuffer : word }}
          </template>
          <template v-else>{{ word }}</template>
        </span>
      </div>

      <div 
        v-for="(row, rIdx) in displayRows" 
        :key="rIdx" 
        class="word-row"
        :class="{ 'active-row': rIdx === (activeRowIndex === 0 ? 0 : 1) }"
      >
        <span 
          v-for="wIdx in (row.end - row.start + 1)" 
          :key="row.start + wIdx - 1"
          class="word"
          :class="{
            'active': (row.start + wIdx - 1) === currentWordIndex,
            'completed': (row.start + wIdx - 1) < currentWordIndex,
            'upcoming': (row.start + wIdx - 1) > currentWordIndex,
            'correct': wordHistory[row.start + wIdx - 1]?.correct,
            'error': wordHistory[row.start + wIdx - 1] && !wordHistory[row.start + wIdx - 1].correct
          }"
        >
          <template v-if="(row.start + wIdx - 1) === currentWordIndex">
            <!-- Typed chars -->
            <span 
              v-for="(char, cIdx) in words[currentWordIndex].slice(0, typedBuffer.length)" 
              :key="'typed-'+cIdx"
              :class="typedBuffer[cIdx] === char ? 'char-typed-correct' : 'char-typed-wrong'"
            >{{ char }}</span>

            <!-- Cursor target -->
            <span 
              v-if="typedBuffer.length < words[currentWordIndex].length"
              class="char-cursor-target"
            >
              {{ words[currentWordIndex][typedBuffer.length] }}
              <span class="caret"></span>
            </span>

            <!-- Untyped remainder -->
            <span 
              v-for="(char, rIdx) in words[currentWordIndex].slice(typedBuffer.length + 1)" 
              :key="'rem-'+rIdx"
              class="char-remainder"
            >{{ char }}</span>

            <!-- Extra chars -->
            <span v-if="typedBuffer.length > words[currentWordIndex].length" class="char-extra">
              {{ typedBuffer.slice(words[currentWordIndex].length) }}
            </span>
          </template>
          <template v-else>
            {{ words[row.start + wIdx - 1] }}
          </template>
        </span>
      </div>
    </div>

    <div class="bottom-controls">
      <div class="restart-container">
        <button @click="onRestart" class="restart-btn">Restart (Tab+Enter)</button>
        <div v-if="isRestartArmed" class="restart-hint">Press Enter to restart!</div>
      </div>
      <button @click="onEnd" class="end-btn">End (Esc)</button>
    </div>
  </div>
</template>

<style scoped>
.typing-screen {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mode-info {
  display: flex;
  gap: 20px;
  align-items: center;
  font-size: 1.5rem;
}

.mode-tag {
  background: var(--text-main);
  color: var(--bg-color);
  padding: 5px 15px;
  font-weight: bold;
}

.timer {
  font-weight: bold;
}

.live-stats {
  font-size: 1rem;
  display: flex;
  gap: 15px;
  color: var(--text-upcoming);
}

.word-container {
  font-size: 2.2rem;
  line-height: 1.6;
  height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.measurement-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  visibility: hidden;
  pointer-events: none;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.word-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  min-height: 4rem;
  transition: all 0.2s ease;
  padding: 10px 0;
  align-items: center;
}

.active-row {
  background-color: var(--active-row-bg);
  border-radius: 10px;
  padding: 15px 0;
}

.word {
  padding: 0 4px;
  position: relative;
  white-space: nowrap;
}

/* Level 1: Upcoming words */
.word.upcoming {
  color: var(--text-upcoming);
}

/* Level 2 & 3: Completed words */
.word.completed {
  color: var(--text-completed);
}

.word.completed.error {
  text-decoration: underline wavy var(--error-wavy);
}

/* Level 4: Active correct typed */
.char-typed-correct {
  color: var(--text-typed-correct);
  font-weight: bold;
}

/* Level 5: Active wrong typed */
.char-typed-wrong {
  color: var(--text-typed-wrong);
  font-weight: bold;
  text-decoration: underline solid var(--text-typed-wrong) 2px;
}

/* Level 6: Active extra chars */
.char-extra {
  color: var(--text-typed-wrong);
  opacity: 0.6;
  font-weight: bold;
  text-decoration: underline solid var(--text-typed-wrong) 2px;
}

/* Level 7: Cursor target */
.char-cursor-target {
  background-color: var(--cursor-bg);
  color: var(--cursor-text);
  font-weight: bold;
  border-radius: 6px;
  padding: 0 4px;
  margin: 0 1px;
  display: inline-block;
  line-height: 1.1;
  position: relative;
}

.caret {
  position: absolute;
  left: -2px;
  top: 10%;
  height: 80%;
  width: 2px;
  background-color: var(--caret-color);
  animation: blink 1.2s infinite;
}

/* Active untyped remainder */
.char-remainder {
  color: var(--text-remainder);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.bottom-controls {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.restart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.restart-hint {
  font-size: 0.8rem;
  color: var(--text-main);
  font-weight: bold;
}

.end-btn {
  background: var(--text-completed);
  border-color: var(--text-completed);
  color: var(--bg-color);
}
</style>
