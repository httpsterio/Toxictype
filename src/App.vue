<script setup lang="ts">
import { useTypingState } from './composables/useTypingState';
import HomeScreen from './components/HomeScreen.vue';
import TypingScreen from './components/TypingScreen.vue';
import StatsScreen from './components/StatsScreen.vue';

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

const handleEnd = () => {
  if (mode.value === 'infinite') {
    endRun();
  } else {
    state.value = 'home';
  }
};
</script>

<template>
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
</template>

<style>
/* Global resets or container styles if needed */
main {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
