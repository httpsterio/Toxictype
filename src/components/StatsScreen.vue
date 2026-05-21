<script setup lang="ts">
import { computed } from 'vue';
import type { RunRecord } from '../types';
import { useRunStorage } from '../composables/useRunStorage';

const props = defineProps<{
  run: RunRecord;
  onPlayAgain: () => void;
  onHome: () => void;
}>();

const { runs } = useRunStorage();

const bestForMode = computed(() => {
  const modeRuns = runs.value.filter(r => r.mode === props.run.mode && r.id !== props.run.id);
  if (modeRuns.length === 0) return null;
  
  if (props.run.mode === 'infinite') {
    return {
      peak30s: Math.max(...modeRuns.map(r => r.peakWpm30s || 0)),
      peak60s: Math.max(...modeRuns.map(r => r.peakWpm60s || 0))
    };
  }
  
  return {
    wpm: Math.max(...modeRuns.map(r => r.wpm))
  };
});

const isNewBest = computed(() => {
  if (!bestForMode.value) return true;
  if (props.run.mode === 'infinite') {
    // For infinite, "best" is tricky. Let's say if either peak is better.
    return (props.run.peakWpm30s || 0) > (bestForMode.value.peak30s || 0) || 
           (props.run.peakWpm60s || 0) > (bestForMode.value.peak60s || 0);
  }
  return props.run.wpm > (bestForMode.value.wpm || 0);
});

const diffVsBest = computed(() => {
  if (!bestForMode.value) return null;
  if (props.run.mode === 'infinite') return null; // Skip for infinite complex comparison
  
  const best = bestForMode.value.wpm || 0;
  const diff = ((props.run.wpm - best) / best) * 100;
  return diff;
});

const formatDiff = (diff: number) => {
  const abs = Math.abs(Math.round(diff));
  return diff > 0 ? `${abs}% faster than best` : `${abs}% slower than best`;
};
</script>

<template>
  <div class="stats-screen toxic-border">
    <h2>Run Summary</h2>
    
    <div class="main-stats">
      <div class="stat-item large">
        <div class="label">{{ run.mode === 'infinite' ? 'Average WPM' : 'WPM' }}</div>
        <div class="value highlighted">{{ Math.round(run.wpm) }}</div>
        <div v-if="isNewBest" class="new-best">new best!</div>
        <div v-else-if="diffVsBest !== null" class="diff">{{ formatDiff(diffVsBest) }}</div>
      </div>
    </div>

    <div v-if="run.mode === 'infinite'" class="peak-stats-container">
      <div class="peak-stat highlighted-box">
        <div class="label">Peak 30s</div>
        <div class="value">{{ run.peakWpm30s ? Math.round(run.peakWpm30s) : '-' }}</div>
      </div>
      <div class="peak-stat highlighted-box">
        <div class="label">Peak 60s</div>
        <div class="value">{{ run.peakWpm60s ? Math.round(run.peakWpm60s) : '-' }}</div>
      </div>
    </div>

    <div class="sub-stats">
      <div class="stat-item">
        <div class="label">Accuracy</div>
        <div class="value">{{ Math.round(run.accuracy) }}%</div>
      </div>
      <div class="stat-item">
        <div class="label">Raw WPM</div>
        <div class="value">{{ Math.round(run.rawWpm) }}</div>
      </div>
      <div class="stat-item">
        <div class="label">Consistency</div>
        <div class="value">{{ Math.round(run.consistency) }}%</div>
      </div>
      <div class="stat-item characters-stat">
        <div class="label">Characters</div>
        <div class="char-breakdown">
          <div class="char-unit">
            <div class="value">{{ run.correctChars }}</div>
            <div class="sub-label">correct</div>
          </div>
          <div class="char-unit">
            <div class="value">{{ run.incorrectChars }}</div>
            <div class="sub-label">wrong</div>
          </div>
          <div class="char-unit">
            <div class="value">{{ run.extraChars }}</div>
            <div class="sub-label">extra</div>
          </div>
          <div class="char-unit">
            <div class="value">{{ run.missedChars }}</div>
            <div class="sub-label">missed</div>
          </div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button @click="onPlayAgain">Play Again</button>
      <button @click="onHome" class="secondary">Home</button>
    </div>
  </div>
</template>

<style scoped>
.stats-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.main-stats {
  text-align: center;
}

.stat-item.large .value {
  font-size: 5rem;
  line-height: 1;
}

.highlighted {
  color: var(--text-main);
  text-shadow: 5px 5px 0px var(--shadow-color);
}

.new-best {
  font-size: 1.5rem;
  color: var(--text-main);
  font-weight: bold;
  text-transform: uppercase;
  margin-top: 10px;
}

.diff {
  font-size: 1rem;
  color: var(--text-completed);
}

.peak-stats-container {
  display: flex;
  gap: 20px;
  width: 100%;
  justify-content: center;
  margin-bottom: 10px;
}

.peak-stat.highlighted-box {
  background: var(--active-row-bg);
  border: 2px solid var(--text-completed);
  padding: 15px 30px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 4px 4px 0px var(--shadow-color);
}

.peak-stat.highlighted-box .label {
  font-weight: bold;
  color: var(--text-main);
  font-size: 1rem;
}

.peak-stat.highlighted-box .value {
  font-size: 2.5rem;
  color: var(--text-typed-correct);
}

.sub-stats {
  grid-template-columns: repeat(4, 1fr);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item .label {
  font-size: 0.8rem;
  color: var(--text-upcoming);
  text-transform: uppercase;
}

.char-breakdown {
  display: flex;
  gap: 15px;
  margin-top: 5px;
}

.char-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.char-unit .sub-label {
  font-size: 0.6rem;
  color: var(--text-completed);
  text-transform: uppercase;
  transform: rotate(90deg);
  transform-origin: left center;
  white-space: nowrap;
  position: absolute;
  top: 100%;
  left: 50%;
  margin-top: 10px;
}

.characters-stat {
  grid-column: span 1;
}

.actions {
  display: flex;
  gap: 20px;
}

.secondary {
  background: var(--text-completed);
  border-color: var(--text-completed);
  color: var(--bg-color);
}
</style>
