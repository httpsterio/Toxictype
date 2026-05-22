import { ref, computed } from 'vue';
import type { Mode, GameState, WordStats, RunRecord } from '../types';
import { useWordPool } from './useWordPool';
import { useRunStorage } from './useRunStorage';

export function useTypingState() {
  const { pullWords, resetHistory } = useWordPool();
  const { saveRun } = useRunStorage();

  const state = ref<GameState>('home');
  const mode = ref<Mode>('30s');
  
  const startTime = ref<number | null>(null);
  const endTime = ref<number | null>(null);
  const currentTime = ref(0);
  const timerInterval = ref<number | null>(null);

  const words = ref<string[]>([]);
  const currentWordIndex = ref(0);
  const typedBuffer = ref("");
  const wordHistory = ref<WordStats[]>([]);
  
  const samples = ref<number[]>([]); // correctChars at each second
  const correctChars = ref(0);
  const incorrectChars = ref(0);
  const extraChars = ref(0);
  const missedChars = ref(0);

  const isRestartArmed = ref(false);

  const timeLeft = computed(() => {
    if (mode.value === 'infinite') return currentTime.value;
    const duration = mode.value === '30s' ? 30 : 60;
    return Math.max(0, duration - currentTime.value);
  });

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const startRun = (selectedMode: Mode) => {
    mode.value = selectedMode;
    state.value = 'idle';
    resetHistory();
    resetState();
  };

  const resetState = () => {
    startTime.value = null;
    endTime.value = null;
    currentTime.value = 0;
    if (timerInterval.value) clearInterval(timerInterval.value);
    timerInterval.value = null;
    
    resetHistory();
    words.value = pullWords(100);
    currentWordIndex.value = 0;
    typedBuffer.value = "";
    wordHistory.value = [];
    
    samples.value = [];
    correctChars.value = 0;
    incorrectChars.value = 0;
    extraChars.value = 0;
    missedChars.value = 0;
    isRestartArmed.value = false;
    state.value = 'idle';
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (state.value === 'home' || state.value === 'ended') return;

    // Handle Escape (End)
    if (e.key === 'Escape') {
      if (mode.value === 'infinite') {
        endRun();
      } else {
        state.value = 'home';
      }
      return;
    }

    // Handle Tab (Restart arming for 30s/60s)
    if (e.key === 'Tab' && mode.value !== 'infinite') {
      e.preventDefault();
      isRestartArmed.value = true;
      return;
    }

    if (isRestartArmed.value) {
      if (e.key === 'Enter') {
        e.preventDefault();
        resetState();
        state.value = 'idle';
        return;
      } else {
        isRestartArmed.value = false;
        // Continue to process key if it's not Enter
      }
    }

    if (e.key === 'Enter') return; // Ignore Enter otherwise

    // Prevent default browser behavior for Backspace and Space keys on the typing screen
    if (e.key === 'Backspace' || e.key === ' ') {
      e.preventDefault();
    }

    // Start timer on first keystroke
    if (state.value === 'idle' && e.key.length === 1 && e.key !== ' ') {
      state.value = 'running';
      startTime.value = Date.now();
      timerInterval.value = window.setInterval(tick, 1000);
    }

    if (state.value !== 'running') return;

    if (e.key === 'Backspace') {
      if (typedBuffer.value.length > 0) {
        typedBuffer.value = typedBuffer.value.slice(0, -1);
      } else if (currentWordIndex.value > 0) {
        const prev = wordHistory.value[currentWordIndex.value - 1];
        if (!prev.correct) {
          currentWordIndex.value--;
          typedBuffer.value = prev.typed;
          wordHistory.value.pop();
          // Adjust stats back? Actually wordHistory stores results of committed words.
          // When we go back, we need to "un-commit" stats.
          recalculateStatsFromHistory();
        }
      }
    } else if (e.key === ' ') {
      commitWord();
    } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
      typedBuffer.value += e.key.toLowerCase();
    }
  };

  const commitWord = () => {
    const target = words.value[currentWordIndex.value]; // Already lowercased from pool
    const typed = typedBuffer.value; // Already lowercased from handleKeydown
    const isCorrect = normalize(typed) === normalize(target);

    wordHistory.value.push({
      word: target,
      typed: typed,
      correct: isCorrect
    });

    // Update counters
    if (isCorrect) {
      correctChars.value += target.length + 1; // +1 for space
    } else {
      const targetNorm = normalize(target);
      const typedNorm = normalize(typed);
      // Simplified: if wrong, we count what was correct? 
      // Project says: correctChars, incorrectChars, extraChars, missedChars
      // Let's do a more granular comparison later if needed.
      // For now:
      let correctCount = 0;
      for (let i = 0; i < Math.min(targetNorm.length, typedNorm.length); i++) {
        if (targetNorm[i] === typedNorm[i]) correctCount++;
        else incorrectChars.value++;
      }
      correctChars.value += correctCount;
      if (typedNorm.length > targetNorm.length) {
        extraChars.value += typedNorm.length - targetNorm.length;
      } else if (typedNorm.length < targetNorm.length) {
        missedChars.value += targetNorm.length - typedNorm.length;
      }
      incorrectChars.value += Math.max(0, Math.min(targetNorm.length, typedNorm.length) - correctCount);
    }

    currentWordIndex.value++;
    typedBuffer.value = "";

    if (currentWordIndex.value >= words.value.length - 10) {
      words.value.push(...pullWords(50));
    }
  };

  const recalculateStatsFromHistory = () => {
    correctChars.value = 0;
    incorrectChars.value = 0;
    extraChars.value = 0;
    missedChars.value = 0;
    
    wordHistory.value.forEach(h => {
      const targetNorm = normalize(h.word);
      const typedNorm = normalize(h.typed);
      if (h.correct) {
        correctChars.value += h.word.length + 1;
      } else {
        let correctCount = 0;
        for (let i = 0; i < Math.min(targetNorm.length, typedNorm.length); i++) {
          if (targetNorm[i] === typedNorm[i]) correctCount++;
          else incorrectChars.value++;
        }
        correctChars.value += correctCount;
        if (typedNorm.length > targetNorm.length) extraChars.value += typedNorm.length - targetNorm.length;
        else if (typedNorm.length < targetNorm.length) missedChars.value += targetNorm.length - typedNorm.length;
      }
    });
  };

  const tick = () => {
    currentTime.value++;
    samples.value.push(correctChars.value);

    if (mode.value !== 'infinite') {
      const limit = mode.value === '30s' ? 30 : 60;
      if (currentTime.value >= limit) {
        endRun();
      }
    }
  };

  const endRun = () => {
    if (timerInterval.value) clearInterval(timerInterval.value);
    timerInterval.value = null;
    endTime.value = Date.now();
    
    // Final commit if buffer not empty? 
    // Usually in these games, the current word isn't counted unless space is hit,
    // but some count it. Project says "Saved only when the timer hits 0 naturally."
    // Let's commit the current word if any input exists.
    if (typedBuffer.value.length > 0) {
      commitWord();
    }

    const duration = currentTime.value;
    if (duration === 0) {
      state.value = 'home';
      return;
    }

    const wpm = (correctChars.value / 5) / (duration / 60);
    const rawWpm = ((correctChars.value + incorrectChars.value + extraChars.value) / 5) / (duration / 60);
    const accuracy = (correctChars.value / (correctChars.value + incorrectChars.value + extraChars.value + missedChars.value)) * 100 || 0;
    
    // Consistency: 100 - (stddev(perSecondWpm) / mean(perSecondWpm) * 100)
    const perSecondWpm = samples.value.map((chars, i) => {
      const prev = i === 0 ? 0 : samples.value[i-1];
      return (chars - prev) * 12; // (chars/5) / (1/60) = chars * 12 / 5? No.
      // (chars/5) is words. (1sec/60) is minutes.
      // wpm = (diff/5) / (1/60) = diff * 12.
    });
    
    const mean = wpm;
    const variance = perSecondWpm.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / perSecondWpm.length;
    const stddev = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(100, 100 - (stddev / mean * 100))) || 0;

    const record: RunRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      mode: mode.value,
      duration,
      wpm,
      rawWpm,
      accuracy,
      consistency,
      correctChars: correctChars.value,
      incorrectChars: incorrectChars.value,
      extraChars: extraChars.value,
      missedChars: missedChars.value,
      totalWords: wordHistory.value.length,
      correctWords: wordHistory.value.filter(h => h.correct).length
    };

    if (mode.value === 'infinite') {
      record.peakWpm30s = calculatePeak(30);
      record.peakWpm60s = calculatePeak(60);
    }

    saveRun(record);
    state.value = 'ended';
    lastRun.value = record;
  };

  const calculatePeak = (window: number) => {
    if (samples.value.length < window) return undefined;
    let max = 0;
    for (let i = window - 1; i < samples.value.length; i++) {
      const current = samples.value[i];
      const prev = i < window ? 0 : samples.value[i - window];
      const wpm = (current - prev) / 5 / (window / 60);
      if (wpm > max) max = wpm;
    }
    return max;
  };

  const lastRun = ref<RunRecord | null>(null);

  // Expose for UI
  const liveWpm = computed(() => {
    if (currentTime.value === 0) return 0;
    return (correctChars.value / 5) / (currentTime.value / 60);
  });

  const livePeak30 = computed(() => calculatePeak(30));
  const livePeak60 = computed(() => calculatePeak(60));

  return {
    state,
    mode,
    words,
    currentWordIndex,
    typedBuffer,
    wordHistory,
    currentTime,
    timeLeft,
    isRestartArmed,
    lastRun,
    liveWpm,
    livePeak30,
    livePeak60,
    startRun,
    handleKeydown,
    resetState,
    endRun
  };
}
