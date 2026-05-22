import { ref } from 'vue';
import { wordList } from '../data/words';

export function useWordPool() {
  const history = ref<string[]>([]);
  const wordPool = ref<string[]>([]);
  
  const HISTORY_SIZE = 10;
  const MAX_RETRIES = 50;

  const pushHistory = (entry: string) => {
    history.value.push(entry.toLowerCase());
    if (history.value.length > HISTORY_SIZE) {
      history.value.shift();
    }
  };

  const resetHistory = () => {
    history.value = [];
  };

  const getNextEntry = () => {
    if (wordList.length === 0) return "";
    
    // Attempt to pick a unique entry based on history
    for (let i = 0; i < MAX_RETRIES; i++) {
      const candidate = wordList[Math.floor(Math.random() * wordList.length)];
      if (!history.value.includes(candidate.toLowerCase())) {
        pushHistory(candidate);
        return candidate;
      }
    }
    
    // Fallback if all retries fail
    const candidate = wordList[Math.floor(Math.random() * wordList.length)];
    pushHistory(candidate);
    return candidate;
  };

  const refillPool = (count: number = 50) => {
    while (wordPool.value.length < count) {
      const entry = getNextEntry();
      const words = entry.split(/\s+/).filter(w => w.length > 0).map(w => w.toLowerCase());
      wordPool.value.push(...words);
    }
  };

  const pullWords = (count: number) => {
    refillPool(count + 20);
    return wordPool.value.splice(0, count);
  };

  return {
    wordPool,
    refillPool,
    pullWords,
    resetHistory
  };
}
