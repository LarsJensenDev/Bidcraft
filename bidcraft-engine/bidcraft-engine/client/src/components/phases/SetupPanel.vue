<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import type { NewGameConfig, AIDifficulty } from '@shared/types'

const gameStore = useGameStore()
const router = useRouter()

const humanName = ref('Du')
const playerCount = ref<3 | 4>(3)
const aiDifficulty = ref<AIDifficulty>('medium')

function startGame() {
  const config: NewGameConfig = {
    playerCount: playerCount.value,
    humanName: humanName.value.trim() || 'Du',
    aiDifficulty: aiDifficulty.value,
  }
  gameStore.initGame(config)
  router.push({ name: 'game' })
}
</script>

<template>
  <div class="setup-panel">
    <h2>Neues Spiel</h2>
    <div class="form-group">
      <label for="humanName">Dein Name</label>
      <input id="humanName" v-model="humanName" type="text" class="input" maxlength="20" />
    </div>
    <div class="form-group">
      <label>Spieleranzahl</label>
      <div class="btn-group">
        <button
          class="btn"
          :class="{ 'btn--active': playerCount === 3 }"
          @click="playerCount = 3"
        >3 Spieler</button>
        <button
          class="btn"
          :class="{ 'btn--active': playerCount === 4 }"
          @click="playerCount = 4"
        >4 Spieler</button>
      </div>
    </div>
    <div class="form-group">
      <label>KI-Schwierigkeit</label>
      <div class="btn-group">
        <button class="btn" :class="{ 'btn--active': aiDifficulty === 'easy' }" @click="aiDifficulty = 'easy'">Leicht</button>
        <button class="btn" :class="{ 'btn--active': aiDifficulty === 'medium' }" @click="aiDifficulty = 'medium'">Mittel</button>
        <button class="btn" :class="{ 'btn--active': aiDifficulty === 'hard' }" @click="aiDifficulty = 'hard'">Schwer</button>
      </div>
    </div>
    <button class="btn btn--primary" @click="startGame">Spiel starten</button>
  </div>
</template>
