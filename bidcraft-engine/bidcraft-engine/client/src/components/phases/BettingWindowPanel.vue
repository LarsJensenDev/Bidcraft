<script setup lang="ts">
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
</script>

<template>
  <div class="phase-panel">
    <h3>Wettfenster</h3>
    <p>Die erste Spielhälfte ist beendet. Möchtest du auf deinen eigenen Sieg wetten?</p>
    <p class="betting-note">Wenn du gewinnst, verdoppelst du deine Siegpunkte. Wenn du verlierst, verlierst du die Siegpunkte des Gewinners.</p>
    <div class="bet-buttons">
      <button
        class="btn"
        :class="{ 'btn--active': gameStore.humanPlayer?.hasBet === true }"
        @click="gameStore.placeBet(true)"
      >
        Ja, ich wette!
      </button>
      <button
        class="btn"
        :class="{ 'btn--active': gameStore.humanPlayer?.hasBet === false }"
        @click="gameStore.placeBet(false)"
      >
        Nein, danke
      </button>
    </div>
    <button class="btn btn--primary" @click="gameStore.confirmBettingDone()">
      Weiter
    </button>
  </div>
</template>
