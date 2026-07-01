<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

const PHASE_LABELS: Record<string, string> = {
  setup: 'Spielaufbau',
  tieCardSelection: 'Tie-Card wählen',
  bidding: 'Bieten',
  resolution: 'Auflösung',
  cardPlacement: 'Karte platzieren',
  bettingWindow: 'Wettfenster',
  scoring: 'Wertung',
  finished: 'Spielende',
}

const label = computed(() => PHASE_LABELS[gameStore.phase] ?? gameStore.phase)
</script>

<template>
  <div class="phase-bar" v-if="gameStore.gameState">
    <span class="phase-bar__label">{{ label }}</span>
  </div>
</template>
