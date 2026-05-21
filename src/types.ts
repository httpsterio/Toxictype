export type Mode = '30s' | '60s' | 'infinite';

export type RunRecord = {
  id: string;
  timestamp: number;
  mode: Mode;
  duration: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  totalWords: number;
  correctWords: number;
  peakWpm30s?: number;
  peakWpm60s?: number;
};

export type WordStats = {
  word: string;
  typed: string;
  correct: boolean;
};

export type GameState = 'home' | 'idle' | 'running' | 'ended';

export type Theme = 'light' | 'dark';
