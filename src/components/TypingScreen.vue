<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import type { Mode, WordStats } from '../types';
import ThemeToggle from './ThemeToggle.vue';

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
      <ThemeToggle />
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
            <span 
              v-for="(char, cIdx) in words[currentWordIndex]" 
              :key="cIdx"
              :class="{
                'char-correct': typedBuffer[cIdx] === char,
                'char-error': typedBuffer[cIdx] && typedBuffer[cIdx] !== char,
                'char-untyped': !typedBuffer[cIdx]
              }"
            >{{ char }}</span><span v-if="typedBuffer.length > words[currentWordIndex].length" class="char-extra">{{ typedBuffer.slice(words[currentWordIndex].length) }}</span>
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
  color: var(--container-bg);
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
  color: var(--text-muted);
}

.word-container {
  font-size: 2rem;
  line-height: 1.5;
  height: 250px;
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
  gap: 10px;
  justify-content: center;
}

/* We hide the full word list and only show the displayRows */
.word-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  min-height: 3.5rem;
  transition: all 0.3s ease;
}

.word {
  padding: 0 5px;
  position: relative;
}

.word.upcoming {
  color: var(--text-muted);
  opacity: 0.5;
}

.word.completed.correct {
  color: var(--text-muted);
}

.word.completed.error {
  color: var(--error-color);
  text-decoration: underline wavy;
}

.word.active {
  color: var(--text-main);
}

.char-correct {
  color: var(--text-typed);
  opacity: 1;
}

.char-error {
  color: var(--error-color);
  opacity: 1;
  font-weight: bold;
}

.char-untyped {
  opacity: 0.5;
}

.char-extra {
  color: var(--error-color);
  opacity: 0.7;
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
  color: var(--accent-color);
  font-weight: bold;
}

.end-btn {
  background: var(--text-muted);
  border-color: var(--text-muted);
}
</style>
