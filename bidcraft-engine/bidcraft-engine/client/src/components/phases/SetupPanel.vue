<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useLocaleStore } from '@/stores/locale'
import type { NewGameConfig, AIDifficulty } from '@shared/types'

const gameStore = useGameStore()
const { t } = useLocaleStore()
const router = useRouter()

const humanName = ref('')
const playerCount = ref<3 | 4>(3)
const aiDifficulty = ref<AIDifficulty>('medium')

function startGame() {
  const config: NewGameConfig = {
    playerCount: playerCount.value,
    humanName: humanName.value.trim() || t('common.defaultName'),
    aiDifficulty: aiDifficulty.value,
  }
  gameStore.initGame(config)
  router.push({ name: 'game' })
}
</script>

<template>
  <div class="setup-panel">
    <h2>{{ t('setup.title') }}</h2>
    <div class="form-group">
      <label for="humanName">{{ t('setup.yourName') }}</label>
      <input
        id="humanName"
        v-model="humanName"
        type="text"
        class="input"
        maxlength="20"
        :placeholder="t('common.defaultName')"
      />
    </div>
    <div class="form-group">
      <label>{{ t('setup.playerCount') }}</label>
      <div class="btn-group">
        <button
          class="btn"
          :class="{ 'btn--active': playerCount === 3 }"
          @click="playerCount = 3"
        >{{ t('setup.players3') }}</button>
        <button
          class="btn"
          :class="{ 'btn--active': playerCount === 4 }"
          @click="playerCount = 4"
        >{{ t('setup.players4') }}</button>
      </div>
    </div>
    <div class="form-group">
      <label>{{ t('setup.aiDifficulty') }}</label>
      <div class="btn-group">
        <button class="btn" :class="{ 'btn--active': aiDifficulty === 'easy' }" @click="aiDifficulty = 'easy'">{{ t('setup.easy') }}</button>
        <button class="btn" :class="{ 'btn--active': aiDifficulty === 'medium' }" @click="aiDifficulty = 'medium'">{{ t('setup.medium') }}</button>
        <button class="btn" :class="{ 'btn--active': aiDifficulty === 'hard' }" @click="aiDifficulty = 'hard'">{{ t('setup.hard') }}</button>
      </div>
    </div>
    <button class="btn btn--primary" @click="startGame">{{ t('setup.start') }}</button>
  </div>
</template>
