<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import { useLocaleStore } from '@/stores/locale'
import PlayerHand from '../board/PlayerHand.vue'
import type { Card } from '@shared/types'

const gameStore = useGameStore()
const { t } = useLocaleStore()

function onCardClick(card: Card) {
  gameStore.selectTieCard(card.id)
}
</script>

<template>
  <div class="phase-panel">
    <h3>{{ t('tie.title') }}</h3>
    <p>{{ t('tie.desc') }}</p>
    <PlayerHand
      :cards="gameStore.humanPlayer?.hand ?? []"
      :clickable="true"
      @card-click="onCardClick"
    />
  </div>
</template>
