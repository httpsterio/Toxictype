<script setup lang="ts">
import { useRunStorage } from '../composables/useRunStorage';
import type { Mode } from '../types';

defineProps<{
  onStart: (mode: Mode) => void;
}>();

const { getBestForMode } = useRunStorage();

const best30 = getBestForMode('30s');
const best60 = getBestForMode('60s');
const bestInf = getBestForMode('infinite');
</script>

<template>
  <div class="home-screen toxic-border">
    <h1 class="title">Toxictype</h1>
    
    <div class="modes">
      <button @click="onStart('30s')">30s</button>
      <button @click="onStart('60s')">60s</button>
      <button @click="onStart('infinite')">Infinite</button>
    </div>

    <div class="best-scores">
      <h2>Best Scores</h2>
      <div class="score-grid">
        <div class="score-item">
          <span class="label">30s:</span>
          <span class="value">{{ typeof best30?.wpm === 'number' ? Math.round(best30.wpm) + ' WPM' : 'no runs yet' }}</span>
        </div>
        <div class="score-item">
          <span class="label">60s:</span>
          <span class="value">{{ typeof best60?.wpm === 'number' ? Math.round(best60.wpm) + ' WPM' : 'no runs yet' }}</span>
        </div>
        <div class="score-item">
          <span class="label">Infinite (Peak 30s):</span>
          <span class="value">{{ typeof bestInf?.peak30s === 'number' ? Math.round(bestInf.peak30s) + ' WPM' : 'no runs yet' }}</span>
        </div>
        <div class="score-item">
          <span class="label">Infinite (Peak 60s):</span>
          <span class="value">{{ typeof bestInf?.peak60s === 'number' ? Math.round(bestInf.peak60s) + ' WPM' : 'no runs yet' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-screen {
  display: flex;
  flex-direction: column;
  gap: 30px;
  align-items: center;
}

.title {
  font-size: 5rem;
  margin: 0;
  color: var(--accent-color);
  animation: wiggle 1s infinite ease-in-out;
}

@keyframes wiggle {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}

.modes {
  display: flex;
  gap: 20px;
}

.best-scores {
  width: 100%;
}

.score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 2px dashed var(--text-muted);
}

.label {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.value {
  font-size: 1.2rem;
  font-weight: bold;
}
</style>
