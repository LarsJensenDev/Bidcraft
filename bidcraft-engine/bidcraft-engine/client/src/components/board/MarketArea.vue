<script setup lang="ts">
import type { Card } from '@shared/types'
import CardView from '../shared/CardView.vue'
import { useLocaleStore } from '@/stores/locale'

defineProps<{
  cards: Card[]
}>()

const { t } = useLocaleStore()
</script>

<template>
  <div class="market-area">
    <h4>{{ t('market.title') }}</h4>
    <div class="market-cards">
      <CardView v-for="card in cards" :key="card.id" :card="card" />
      <span v-if="cards.length === 0" class="market-area__empty">—</span>
    </div>
  </div>
</template>
