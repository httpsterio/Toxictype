import { ref } from 'vue';
import { wordList } from '../data/words';

export function useWordPool() {
  const lastEntry = ref<string | null>(null);
  const wordPool = ref<string[]>([]);

  const getNextEntry = () => {
    let entry: string;
    if (wordList.length === 0) return "";
    
    if (wordList.length === 1) {
      entry = wordList[0];
    } else {
      do {
        entry = wordList[Math.floor(Math.random() * wordList.length)];
      } while (entry === lastEntry.value);
    }
    
    lastEntry.value = entry;
    return entry;
  };

  const refillPool = (count: number = 50) => {
    while (wordPool.value.length < count) {
      const entry = getNextEntry();
      const words = entry.split(/\s+/).filter(w => w.length > 0);
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
    pullWords
  };
}
