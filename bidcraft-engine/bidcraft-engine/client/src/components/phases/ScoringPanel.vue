<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { bestScoringMode } from '@engine/scoring'

const gameStore = useGameStore()

onMounted(() => {
  const deck = gameStore.humanPlayer?.deck ?? []
  gameStore.chooseScoring(bestScoringMode(deck).mode)
})
</script>

<template>
  <div class="phase-panel">
    <h3>Wertung wird berechnet…</h3>
  </div>
</template>
