<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useTypingState } from './composables/useTypingState';
import { useTheme } from './composables/useTheme';
import { useAudio } from './composables/useAudio';
import HomeScreen from './components/HomeScreen.vue';
import TypingScreen from './components/TypingScreen.vue';
import StatsScreen from './components/StatsScreen.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import SoundToggle from './components/SoundToggle.vue';

const {
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
} = useTypingState();

// Initialize theme at the root to ensure persistence and global attribute setting
useTheme();

const { playSound, initAudio } = useAudio();

// Global click and mouseover event handlers
const handleGlobalClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.closest('button')) {
    playSound('click');
  }
};

const handleGlobalMouseOver = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const button = target.closest('button');
  if (button) {
    const related = e.relatedTarget as HTMLElement | null;
    const oldButton = related ? related.closest('button') : null;
    if (button !== oldButton) {
      playSound('hover');
    }
  }
};

// Lazy initialization of AudioContext on first user interaction
const initOnGesture = () => {
  initAudio();
  window.removeEventListener('click', initOnGesture);
  window.removeEventListener('keydown', initOnGesture);
};

onMounted(() => {
  window.addEventListener('click', initOnGesture);
  window.addEventListener('keydown', initOnGesture);
  window.addEventListener('click', handleGlobalClick);
  window.addEventListener('mouseover', handleGlobalMouseOver);
});

onUnmounted(() => {
  window.removeEventListener('click', initOnGesture);
  window.removeEventListener('keydown', initOnGesture);
  window.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('mouseover', handleGlobalMouseOver);
});

const handleEnd = () => {
  if (mode.value === 'infinite') {
    endRun();
  } else {
    state.value = 'home';
  }
};
</script>

<template>
  <div class="app-container">
    <div class="global-controls">
      <SoundToggle />
      <ThemeToggle />
    </div>
    
    <main>
      <HomeScreen v-if="state === 'home'" :onStart="startRun" />
      
      <TypingScreen
        v-else-if="state === 'idle' || state === 'running'"
        :mode="mode"
        :words="words"
        :currentWordIndex="currentWordIndex"
        :typedBuffer="typedBuffer"
        :wordHistory="wordHistory"
        :currentTime="currentTime"
        :timeLeft="timeLeft"
        :isRestartArmed="isRestartArmed"
        :liveWpm="liveWpm"
        :livePeak30="livePeak30"
        :livePeak60="livePeak60"
        :onKeydown="handleKeydown"
        :onRestart="resetState"
        :onEnd="handleEnd"
      />

      <StatsScreen
        v-else-if="state === 'ended' && lastRun"
        :run="lastRun"
        :onPlayAgain="() => startRun(mode)"
        :onHome="() => state = 'home'"
      />
    </main>

    <footer class="footer">
      made by <a href="https://httpster.io" target="_blank" class="snazzy-link">httpster.io</a>
    </footer>
  </div>
</template>

<style>
/* Global resets or container styles if needed */
.app-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.global-controls {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  gap: 15px;
}

main {
  width: 100%;
  max-width: 800px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.footer {
  position: fixed;
  bottom: 20px;
  left: 0;
  width: 100%;
  text-align: center;
  font-family: var(--font-main);
  font-size: 1.2rem;
  color: var(--text-upcoming);
}

.snazzy-link {
  color: var(--text-main);
  text-decoration: none;
  font-weight: bold;
  display: inline-block;
  padding: 2px 5px;
  -webkit-text-stroke: 1px var(--text-typed-correct);
  text-shadow: 2px 2px 0px var(--shadow-color);
  transition: transform 0.2s;
  animation: snazzy-wiggle 2s infinite ease-in-out;
}

.snazzy-link:hover {
  transform: scale(1.2) rotate(5deg);
  color: var(--cursor-bg);
  -webkit-text-stroke: 1px var(--text-main);
}

@keyframes snazzy-wiggle {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}
</style>
