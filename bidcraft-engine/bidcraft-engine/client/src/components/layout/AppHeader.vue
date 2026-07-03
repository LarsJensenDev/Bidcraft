<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useLocaleStore } from '@/stores/locale'
import LanguageToggle from './LanguageToggle.vue'

const gameStore = useGameStore()
const { t } = useLocaleStore()

const remainingRounds = computed(() => gameStore.totalRounds - gameStore.currentRound)
</script>

<template>
  <header class="app-header">
    <span class="app-header__title">{{ t('app.title') }}</span>
    <div class="app-header__right">
      <span v-if="gameStore.gameState" class="app-header__round">
        {{ t('header.round', { current: gameStore.currentRound, total: gameStore.totalRounds }) }}
        <span class="app-header__remaining">{{ t('header.remaining', { n: remainingRounds }) }}</span>
      </span>
      <LanguageToggle />
    </div>
  </header>
</template>

<style scoped>
.app-header__right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
