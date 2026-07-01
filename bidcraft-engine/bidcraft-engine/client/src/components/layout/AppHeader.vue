<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

const remainingRounds = computed(() => gameStore.totalRounds - gameStore.currentRound)
</script>

<template>
  <header class="app-header">
    <span class="app-header__title">Bidcraft</span>
    <span v-if="gameStore.gameState" class="app-header__round">
      Runde {{ gameStore.currentRound }} / {{ gameStore.totalRounds }}
      <span class="app-header__remaining">(noch {{ remainingRounds }})</span>
    </span>
  </header>
</template>
