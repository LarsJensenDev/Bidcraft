<script setup lang="ts">
import type { Card } from '@shared/types'
import CardView from '../shared/CardView.vue'
import { useLocaleStore } from '@/stores/locale'

defineProps<{
  singles: Card[]
}>()

const { t } = useLocaleStore()
</script>

<template>
  <div class="singles-area">
    <h4>{{ t('singles.title') }}</h4>
    <div class="singles-cards">
      <CardView v-for="card in singles" :key="card.id" :card="card" />
      <span v-if="singles.length === 0" class="singles-area__empty">—</span>
    </div>
  </div>
</template>
