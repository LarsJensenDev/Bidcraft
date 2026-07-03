<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useLocaleStore } from '@/stores/locale'
import { bestScoringMode } from '@engine/scoring'

const gameStore = useGameStore()
const { t } = useLocaleStore()

onMounted(() => {
  const deck = gameStore.humanPlayer?.deck ?? []
  gameStore.chooseScoring(bestScoringMode(deck).mode)
})
</script>

<template>
  <div class="phase-panel">
    <h3>{{ t('scoring.calculating') }}</h3>
  </div>
</template>
