<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import { useLocaleStore } from '@/stores/locale'

const gameStore = useGameStore()
const { t } = useLocaleStore()
</script>

<template>
  <div class="phase-panel">
    <h3>{{ t('betting.title') }}</h3>
    <p>{{ t('betting.question') }}</p>
    <p class="betting-note">{{ t('betting.note') }}</p>
    <div class="bet-buttons">
      <button
        class="btn"
        :class="{ 'btn--active': gameStore.humanPlayer?.hasBet === true }"
        @click="gameStore.placeBet(true)"
      >
        {{ t('betting.yes') }}
      </button>
      <button
        class="btn"
        :class="{ 'btn--active': gameStore.humanPlayer?.hasBet === false }"
        @click="gameStore.placeBet(false)"
      >
        {{ t('betting.no') }}
      </button>
    </div>
    <button class="btn btn--primary" @click="gameStore.confirmBettingDone()">
      {{ t('betting.continue') }}
    </button>
  </div>
</template>
