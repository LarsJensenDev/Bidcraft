<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useLocaleStore } from '@/stores/locale'
import type { MessageKey } from '@/i18n/messages'

const gameStore = useGameStore()
const { t } = useLocaleStore()

const label = computed(() => t(`phase.${gameStore.phase}` as MessageKey))
</script>

<template>
  <div class="phase-bar" v-if="gameStore.gameState">
    <span class="phase-bar__label">{{ label }}</span>
  </div>
</template>
