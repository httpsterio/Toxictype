import { ref } from 'vue';
import type { RunRecord, Mode } from '../types';

export function useRunStorage() {
  const runs = ref<RunRecord[]>([]);

  const loadRuns = () => {
    try {
      const stored = localStorage.getItem('toxictype:runs');
      if (stored) {
        runs.value = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load runs from localStorage', e);
      runs.value = [];
    }
  };

  const saveRun = (record: RunRecord) => {
    runs.value.push(record);
    try {
      localStorage.setItem('toxictype:runs', JSON.stringify(runs.value));
    } catch (e) {
      console.error('Failed to save run to localStorage', e);
    }
  };

  const getBestForMode = (mode: Mode) => {
    const modeRuns = runs.value.filter(r => r.mode === mode);
    if (modeRuns.length === 0) return null;

    if (mode === 'infinite') {
      return {
        peak30s: Math.max(...modeRuns.map(r => r.peakWpm30s || 0)),
        peak60s: Math.max(...modeRuns.map(r => r.peakWpm60s || 0))
      };
    }

    return {
      wpm: Math.max(...modeRuns.map(r => r.wpm))
    };
  };

  loadRuns();

  return {
    runs,
    saveRun,
    getBestForMode
  };
}
