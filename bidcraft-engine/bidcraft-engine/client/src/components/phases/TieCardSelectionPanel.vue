<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import PlayerHand from '../board/PlayerHand.vue'
import type { Card } from '@shared/types'

const gameStore = useGameStore()

function onCardClick(card: Card) {
  gameStore.selectTieCard(card.id)
}
</script>

<template>
  <div class="phase-panel">
    <h3>Tie-Card wählen</h3>
    <p>Wähle eine Karte als Tie-Card. Sie bleibt verdeckt und entscheidet Gleichstände.</p>
    <PlayerHand
      :cards="gameStore.humanPlayer?.hand ?? []"
      :clickable="true"
      @card-click="onCardClick"
    />
  </div>
</template>
